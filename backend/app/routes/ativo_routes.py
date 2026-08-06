from datetime import datetime

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy import or_

from .. import db
from ..models.ativo import Ativo
from ..models.contrato import Contrato
from ..models.empresa import Empresa
from ..models.fornecedor import Fornecedor
from ..models.localizacao import Localizacao
from ..models.orcamento import Orcamento
from ..utils.auth import get_current_user_from_request
from ..utils.filters import apply_entity_filter, get_all_allowed_ids
from ..utils.logging import create_log


ativo_bp = Blueprint('ativo_bp', __name__)


def _data_iso(valor, campo):
    if not valor:
        return None
    try:
        return datetime.strptime(valor, '%Y-%m-%d').date()
    except (TypeError, ValueError):
        raise ValueError(
            f'O campo {campo} deve estar no formato AAAA-MM-DD'
        )


def _id_opcional(valor, campo):
    if valor in (None, '', 'none', 'null'):
        return None

    try:
        identificador = int(valor)
    except (TypeError, ValueError):
        raise ValueError(f'{campo} inválido')

    if identificador <= 0:
        raise ValueError(f'{campo} inválido')

    return identificador


def _normalizar_ids(data, campo_plural, campo_legado):
    """Aceita payload novo e também o singular legado."""
    if campo_plural in data:
        valores = data.get(campo_plural) or []
        if not isinstance(valores, list):
            raise ValueError(f'{campo_plural} deve ser uma lista')
    elif campo_legado in data:
        valor = data.get(campo_legado)
        valores = (
            []
            if valor in (None, '', 'none', 'null')
            else [valor]
        )
    else:
        return None

    resultado = []
    vistos = set()

    for valor in valores:
        try:
            identificador = int(valor)
        except (TypeError, ValueError):
            raise ValueError(
                f'ID inválido em {campo_plural}: {valor}'
            )

        if identificador <= 0:
            raise ValueError(
                f'ID inválido em {campo_plural}: {valor}'
            )

        if identificador not in vistos:
            vistos.add(identificador)
            resultado.append(identificador)

    return resultado


def _tem_permissao(user, acao):
    if not user:
        return False

    role = (user.role or '').lower()

    if role == 'super_admin':
        return True

    perfil = getattr(user, 'perfil_acesso', None)

    # Compatibilidade: admin sem perfil customizado mantém acesso.
    if role == 'admin' and not perfil:
        return True

    if not perfil:
        return False

    return bool(
        getattr(perfil, f'ativos_{acao}', False)
    )


def _exigir_permissao(acao):
    user = get_current_user_from_request(request)

    if not user:
        return None, (
            jsonify({'error': 'Não autenticado'}),
            401
        )

    if not _tem_permissao(user, acao):
        return None, (
            jsonify({'error': 'Acesso negado'}),
            403
        )

    return user, None


def _empresas_permitidas(user):
    role = (user.role or '').lower()

    if role == 'super_admin':
        return None

    if role == 'self_service':
        return (
            [int(user.empresa_id)]
            if user.empresa_id
            else []
        )

    empresa_ids = user.get_empresa_ids()
    if not empresa_ids:
        return []

    return get_all_allowed_ids(empresa_ids)


def _validar_empresa(user, valor):
    empresa_id = _id_opcional(valor, 'empresa_id')

    if empresa_id is None:
        raise ValueError('Informe a empresa do ativo')

    empresa = Empresa.query.get(empresa_id)
    if not empresa:
        raise ValueError('Empresa não encontrada')

    permitidas = _empresas_permitidas(user)

    if (
        permitidas is not None
        and empresa_id not in permitidas
    ):
        raise PermissionError(
            'Você não possui acesso a esta empresa'
        )

    return empresa_id


def _buscar_ativo_permitido(ativo_id, user):
    query = Ativo.query.filter(Ativo.id == ativo_id)
    query = apply_entity_filter(
        query,
        Ativo,
        None,
        user
    )

    # Retorna 404 também quando existe, mas pertence a outra empresa.
    return query.first_or_404()


def _buscar_referencia_empresa(
    model,
    valor,
    descricao,
    empresa_id
):
    identificador = _id_opcional(
        valor,
        f'{descricao.lower()}_id'
    )

    if identificador is None:
        return None

    item = model.query.filter(
        model.id == identificador,
        model.empresa_id == empresa_id
    ).first()

    if not item:
        raise ValueError(
            f'{descricao} não encontrado ou não pertence '
            'à empresa do ativo'
        )

    return item


def _buscar_em_ordem(
    model,
    ids,
    descricao,
    empresa_id,
    permitir_global=False
):
    if ids is None:
        return None

    if not ids:
        return []

    query = model.query.filter(model.id.in_(ids))

    if permitir_global:
        query = query.filter(
            or_(
                model.empresa_id == empresa_id,
                model.empresa_id.is_(None)
            )
        )
    else:
        query = query.filter(
            model.empresa_id == empresa_id
        )

    encontrados = query.all()
    por_id = {
        item.id: item
        for item in encontrados
    }

    ausentes = [
        identificador
        for identificador in ids
        if identificador not in por_id
    ]

    if ausentes:
        raise ValueError(
            f'{descricao} não encontrado(s) ou pertencente(s) '
            'a outra empresa: '
            + ', '.join(map(str, ausentes))
        )

    return [
        por_id[identificador]
        for identificador in ids
    ]


def _validar_objetos_existentes(
    objetos,
    descricao,
    empresa_id,
    permitir_global=False
):
    invalidos = []

    for item in objetos:
        item_empresa_id = getattr(
            item,
            'empresa_id',
            None
        )

        valido = item_empresa_id == empresa_id

        if permitir_global and item_empresa_id is None:
            valido = True

        if not valido:
            invalidos.append(item.id)

    if invalidos:
        raise ValueError(
            f'{descricao} vinculado(s) não pertence(m) '
            'à nova empresa do ativo: '
            + ', '.join(map(str, invalidos))
        )


def _fornecedores_atuais(ativo):
    if hasattr(ativo, '_fornecedores_serializados'):
        return ativo._fornecedores_serializados()
    return list(ativo.fornecedores or [])


def _contratos_atuais(ativo):
    if hasattr(ativo, '_contratos_serializados'):
        return ativo._contratos_serializados()
    return list(ativo.contratos or [])


def _aplicar_vinculos(
    ativo,
    data,
    empresa_id,
    validar_existentes=False
):
    fornecedor_ids = _normalizar_ids(
        data,
        'fornecedor_ids',
        'fornecedor_id'
    )
    contrato_ids = _normalizar_ids(
        data,
        'contrato_ids',
        'contrato_id'
    )

    fornecedores = _buscar_em_ordem(
        Fornecedor,
        fornecedor_ids,
        'Fornecedor',
        empresa_id,
        permitir_global=True
    )

    contratos = _buscar_em_ordem(
        Contrato,
        contrato_ids,
        'Contrato',
        empresa_id
    )

    if fornecedores is not None:
        ativo.fornecedores = fornecedores
        ativo.fornecedor_id = (
            fornecedores[0].id
            if fornecedores
            else None
        )
    elif validar_existentes:
        _validar_objetos_existentes(
            _fornecedores_atuais(ativo),
            'Fornecedor',
            empresa_id,
            permitir_global=True
        )

    if contratos is not None:
        ativo.contratos = contratos
        ativo.contrato_id = (
            contratos[0].id
            if contratos
            else None
        )
    elif validar_existentes:
        _validar_objetos_existentes(
            _contratos_atuais(ativo),
            'Contrato',
            empresa_id
        )


def _validar_anexos(valor):
    if valor is None:
        return []

    if not isinstance(valor, list):
        raise ValueError('anexos deve ser uma lista')

    return valor


def _erro_validacao(mensagem):
    return jsonify({'error': str(mensagem)}), 400


def _erro_permissao(mensagem):
    return jsonify({'error': str(mensagem)}), 403


def _erro_interno(contexto):
    current_app.logger.exception(contexto)
    return jsonify({
        'error': 'Erro interno do servidor'
    }), 500


@ativo_bp.route('/', methods=['GET'])
def get_ativos():
    user, erro = _exigir_permissao('ver')
    if erro:
        return erro

    empresa_id = request.args.get('empresa_id')

    query = apply_entity_filter(
        Ativo.query,
        Ativo,
        empresa_id,
        user
    )

    ativos = query.order_by(
        Ativo.nome,
        Ativo.id
    ).all()

    return jsonify([
        ativo.to_dict()
        for ativo in ativos
    ])


@ativo_bp.route('/<int:id>', methods=['GET'])
def get_ativo(id):
    user, erro = _exigir_permissao('ver')
    if erro:
        return erro

    ativo = _buscar_ativo_permitido(id, user)
    return jsonify(ativo.to_dict())


@ativo_bp.route('/', methods=['POST'])
def create_ativo():
    user, erro = _exigir_permissao('criar')
    if erro:
        return erro

    data = request.get_json() or {}
    nome = (data.get('nome') or '').strip()

    if not nome:
        return _erro_validacao('Informe o nome do ativo')

    try:
        empresa_id = _validar_empresa(
            user,
            data.get('empresa_id')
        )

        localizacao = _buscar_referencia_empresa(
            Localizacao,
            data.get('localizacao_id'),
            'Localização',
            empresa_id
        )

        orcamento = _buscar_referencia_empresa(
            Orcamento,
            data.get('orcamento_id'),
            'Orçamento',
            empresa_id
        )

        novo_ativo = Ativo(
            nome=nome,
            numero_serie=data.get('numero_serie'),
            voltagem_entrada=data.get(
                'voltagem_entrada'
            ),
            data_aquisicao=_data_iso(
                data.get('data_aquisicao'),
                'data_aquisicao'
            ),
            data_inativacao=_data_iso(
                data.get('data_inativacao'),
                'data_inativacao'
            ),
            empresa_id=empresa_id,
            localizacao_id=(
                localizacao.id
                if localizacao
                else None
            ),
            orcamento_id=(
                orcamento.id
                if orcamento
                else None
            ),
            anexos=_validar_anexos(
                data.get('anexos', [])
            ),
            registro_anvisa=data.get(
                'registro_anvisa'
            ),
            registro_anvisa_ativo=data.get(
                'registro_anvisa_ativo',
                True
            ),
            registro_anvisa_validade=_data_iso(
                data.get('registro_anvisa_validade'),
                'registro_anvisa_validade'
            )
        )

        _aplicar_vinculos(
            novo_ativo,
            data,
            empresa_id
        )

        db.session.add(novo_ativo)
        db.session.commit()

        try:
            create_log(
                user=user,
                action='create_ativo',
                entity='ativo',
                entity_id=novo_ativo.id,
                details={'payload': data},
                req=request
            )
        except Exception:
            pass

        return jsonify(
            novo_ativo.to_dict()
        ), 201

    except PermissionError as exc:
        db.session.rollback()
        return _erro_permissao(exc)
    except ValueError as exc:
        db.session.rollback()
        return _erro_validacao(exc)
    except Exception:
        db.session.rollback()
        return _erro_interno(
            'Erro ao criar ativo'
        )


@ativo_bp.route('/<int:id>', methods=['PUT'])
def update_ativo(id):
    user, erro = _exigir_permissao('editar')
    if erro:
        return erro

    ativo = _buscar_ativo_permitido(id, user)
    data = request.get_json() or {}

    try:
        before = ativo.to_dict()
    except Exception:
        before = None

    try:
        empresa_id = ativo.empresa_id

        if 'empresa_id' in data:
            empresa_id = _validar_empresa(
                user,
                data.get('empresa_id')
            )

        empresa_alterada = (
            empresa_id != ativo.empresa_id
        )

        if 'nome' in data:
            nome = (data.get('nome') or '').strip()
            if not nome:
                raise ValueError(
                    'Informe o nome do ativo'
                )
            ativo.nome = nome

        if 'numero_serie' in data:
            ativo.numero_serie = data.get(
                'numero_serie'
            )

        if 'voltagem_entrada' in data:
            ativo.voltagem_entrada = data.get(
                'voltagem_entrada'
            )

        if 'data_aquisicao' in data:
            ativo.data_aquisicao = _data_iso(
                data.get('data_aquisicao'),
                'data_aquisicao'
            )

        if 'data_inativacao' in data:
            ativo.data_inativacao = _data_iso(
                data.get('data_inativacao'),
                'data_inativacao'
            )

        if empresa_alterada or 'localizacao_id' in data:
            localizacao_id = (
                data.get('localizacao_id')
                if 'localizacao_id' in data
                else ativo.localizacao_id
            )

            localizacao = _buscar_referencia_empresa(
                Localizacao,
                localizacao_id,
                'Localização',
                empresa_id
            )

            ativo.localizacao_id = (
                localizacao.id
                if localizacao
                else None
            )

        if empresa_alterada or 'orcamento_id' in data:
            orcamento_id = (
                data.get('orcamento_id')
                if 'orcamento_id' in data
                else ativo.orcamento_id
            )

            orcamento = _buscar_referencia_empresa(
                Orcamento,
                orcamento_id,
                'Orçamento',
                empresa_id
            )

            ativo.orcamento_id = (
                orcamento.id
                if orcamento
                else None
            )

        ativo.empresa_id = empresa_id

        if 'anexos' in data:
            ativo.anexos = _validar_anexos(
                data.get('anexos')
            )

        if 'registro_anvisa' in data:
            ativo.registro_anvisa = data.get(
                'registro_anvisa'
            )

        if 'registro_anvisa_ativo' in data:
            ativo.registro_anvisa_ativo = data.get(
                'registro_anvisa_ativo',
                True
            )

        if 'registro_anvisa_validade' in data:
            ativo.registro_anvisa_validade = _data_iso(
                data.get('registro_anvisa_validade'),
                'registro_anvisa_validade'
            )

        _aplicar_vinculos(
            ativo,
            data,
            empresa_id,
            validar_existentes=empresa_alterada
        )

        db.session.commit()

    except PermissionError as exc:
        db.session.rollback()
        return _erro_permissao(exc)
    except ValueError as exc:
        db.session.rollback()
        return _erro_validacao(exc)
    except Exception:
        db.session.rollback()
        return _erro_interno(
            'Erro ao atualizar ativo'
        )

    try:
        create_log(
            user=user,
            action='update_ativo',
            entity='ativo',
            entity_id=id,
            details={
                'before': before,
                'after_payload': data
            },
            req=request
        )
    except Exception:
        pass

    return jsonify(ativo.to_dict())


@ativo_bp.route('/<int:id>', methods=['DELETE'])
def delete_ativo(id):
    user, erro = _exigir_permissao('excluir')
    if erro:
        return erro

    ativo = _buscar_ativo_permitido(id, user)

    try:
        snapshot = ativo.to_dict()
    except Exception:
        snapshot = None

    try:
        from ..models.chamado import Chamado

        Chamado.query.filter_by(
            ativo_id=id
        ).update({
            'ativo_id': None
        })

        db.session.delete(ativo)
        db.session.commit()

        try:
            create_log(
                user=user,
                action='delete_ativo',
                entity='ativo',
                entity_id=id,
                details={'deleted': snapshot},
                req=request
            )
        except Exception:
            pass

        return jsonify({'ok': True}), 200

    except Exception:
        db.session.rollback()
        return _erro_interno(
            'Erro ao excluir ativo'
        )
