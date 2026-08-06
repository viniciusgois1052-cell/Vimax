import json
import math
import urllib.request
from datetime import date, datetime

from flask import Blueprint, current_app, jsonify, request

from .. import db
from ..models.ativo import Ativo
from ..models.cliente import Cliente
from ..models.contrato import Contrato
from ..models.empresa import Empresa
from ..models.fornecedor import Fornecedor
from ..models.localizacao import Localizacao
from ..utils.auth import get_current_user_from_request
from ..utils.filters import apply_entity_filter, get_all_allowed_ids
from ..utils.logging import create_log


contrato_bp = Blueprint('contratos', __name__)


def _resposta_erro(mensagem, status):
    return jsonify({'error': mensagem}), status


def _erro_interno(mensagem):
    current_app.logger.exception(mensagem)
    return _resposta_erro(mensagem, 500)


def _perfil_usuario(user):
    for atributo in ('perfil_acesso', 'perfil'):
        perfil = getattr(user, atributo, None)
        if perfil is not None and hasattr(perfil, 'contratos_ver'):
            return perfil

    perfil_id = (
        getattr(user, 'perfil_acesso_id', None)
        or getattr(user, 'perfil_id', None)
    )
    if not perfil_id:
        return None

    try:
        from ..models.perfil_acesso import PerfilAcesso
        return PerfilAcesso.query.get(perfil_id)
    except Exception:
        return None


def _tem_permissao(user, acao):
    if not user:
        return False
    if user.role == 'super_admin':
        return True

    perfil = _perfil_usuario(user)
    if perfil is not None:
        return bool(getattr(perfil, f'contratos_{acao}', False))

    # Compatibilidade temporária com administradores sem perfil associado.
    return user.role == 'admin'


def _exigir_permissao(acao):
    user = get_current_user_from_request(request)
    if not user:
        return None, _resposta_erro('Não autenticado', 401)
    if not _tem_permissao(user, acao):
        return None, _resposta_erro(
            'Você não possui permissão para esta ação em contratos',
            403
        )
    return user, None


def _empresas_permitidas(user):
    if user.role == 'super_admin':
        return None
    if user.role == 'self_service':
        return {int(user.empresa_id)} if user.empresa_id else set()
    return set(get_all_allowed_ids(user.get_empresa_ids() or []))


def _id_obrigatorio(valor, campo):
    try:
        identificador = int(valor)
    except (TypeError, ValueError):
        raise ValueError(f'Informe um {campo} válido')
    if identificador <= 0:
        raise ValueError(f'Informe um {campo} válido')
    return identificador


def _id_opcional(valor, campo):
    if valor in (None, '', 'none', 'null', 'undefined'):
        return None
    return _id_obrigatorio(valor, campo)


def _data_obrigatoria(valor, campo):
    if not valor:
        raise ValueError(f'Informe {campo}')
    try:
        return datetime.strptime(str(valor), '%Y-%m-%d').date()
    except (TypeError, ValueError):
        raise ValueError(f'{campo} deve estar no formato AAAA-MM-DD')


def _numero_nao_negativo(valor, campo):
    try:
        numero = float(valor)
    except (TypeError, ValueError):
        raise ValueError(f'{campo} deve ser numérico')
    if not math.isfinite(numero) or numero < 0:
        raise ValueError(f'{campo} deve ser maior ou igual a zero')
    return numero


def _inteiro_intervalo(valor, campo, minimo, maximo):
    try:
        numero = int(valor)
    except (TypeError, ValueError):
        raise ValueError(f'{campo} deve ser um número inteiro')
    if numero < minimo or numero > maximo:
        raise ValueError(
            f'{campo} deve estar entre {minimo} e {maximo}'
        )
    return numero


def _booleano(valor):
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, (int, float)):
        return valor != 0
    if isinstance(valor, str):
        normalizado = valor.strip().lower()
        if normalizado in ('true', '1', 'sim', 'yes', 'on'):
            return True
        if normalizado in ('false', '0', 'nao', 'não', 'no', 'off', ''):
            return False
    return bool(valor)


def _lista_json(valor, campo):
    if valor is None:
        return []
    if not isinstance(valor, list):
        raise ValueError(f'{campo} deve ser uma lista')
    return valor


def _validar_empresa(empresa_id, user):
    empresa_id = _id_obrigatorio(empresa_id, 'empresa')
    empresa = Empresa.query.get(empresa_id)
    if not empresa:
        raise ValueError('Empresa não encontrada')

    permitidas = _empresas_permitidas(user)
    if permitidas is not None and empresa_id not in permitidas:
        raise PermissionError('Empresa não permitida para este usuário')
    return empresa


def _validar_fornecedor(fornecedor_id, empresa_id):
    fornecedor_id = _id_obrigatorio(fornecedor_id, 'fornecedor')
    fornecedor = Fornecedor.query.get(fornecedor_id)
    if not fornecedor:
        raise ValueError('Fornecedor não encontrado')

    fornecedor_empresa = getattr(fornecedor, 'empresa_id', None)
    if fornecedor_empresa not in (None, empresa_id):
        raise PermissionError(
            'O fornecedor não pertence à empresa do contrato'
        )
    return fornecedor


def _validar_localizacao(localizacao_id, empresa_id):
    localizacao_id = _id_opcional(localizacao_id, 'localização')
    if localizacao_id is None:
        return None

    localizacao = Localizacao.query.get(localizacao_id)
    if not localizacao:
        raise ValueError('Localização não encontrada')
    if getattr(localizacao, 'empresa_id', None) != empresa_id:
        raise PermissionError(
            'A localização não pertence à empresa do contrato'
        )
    return localizacao


def _validar_cliente(cliente_id, empresa_id):
    cliente_id = _id_opcional(cliente_id, 'cliente')
    if cliente_id is None:
        return None

    cliente = Cliente.query.get(cliente_id)
    if not cliente:
        raise ValueError('Cliente não encontrado')

    cliente_empresa = getattr(cliente, 'empresa_id', None)
    if cliente_empresa not in (None, empresa_id):
        raise PermissionError(
            'O cliente não pertence à empresa do contrato'
        )
    return cliente


def _buscar_contrato_permitido(contrato_id, user):
    return apply_entity_filter(
        Contrato.query,
        Contrato,
        None,
        user
    ).filter(Contrato.id == contrato_id).first()


def _validar_ativos_do_contrato(contrato, empresa_id):
    incompatíveis = [
        ativo.id
        for ativo in (contrato.ativos_vinculados or [])
        if ativo.empresa_id != empresa_id
    ]
    if incompatíveis:
        raise ValueError(
            'Não é possível trocar a empresa: existem ativos vinculados '
            'de outra empresa'
        )


def _dados_contrato(data, user, contrato=None):
    criando = contrato is None

    numero = (
        (data.get('numero') if 'numero' in data else contrato.numero)
        if not criando
        else data.get('numero')
    )
    numero = (numero or '').strip()
    if not numero:
        raise ValueError('Informe o número do contrato')
    if len(numero) > 50:
        raise ValueError('O número do contrato deve ter no máximo 50 caracteres')

    empresa_id = (
        data.get('empresa_id', contrato.empresa_id)
        if not criando
        else data.get('empresa_id')
    )
    empresa = _validar_empresa(empresa_id, user)

    fornecedor_id = (
        data.get('fornecedor_id', contrato.fornecedor_id)
        if not criando
        else data.get('fornecedor_id')
    )
    fornecedor = _validar_fornecedor(fornecedor_id, empresa.id)

    localizacao_id = (
        data.get('localizacao_id', contrato.localizacao_id)
        if not criando
        else data.get('localizacao_id')
    )
    localizacao = _validar_localizacao(localizacao_id, empresa.id)

    cliente_id = (
        data.get('cliente_id', contrato.cliente_id)
        if not criando
        else data.get('cliente_id')
    )
    cliente = _validar_cliente(cliente_id, empresa.id)

    data_inicio = _data_obrigatoria(
        data.get('data_inicio', contrato.data_inicio.isoformat())
        if not criando
        else data.get('data_inicio'),
        'data_inicio'
    )
    data_fim = _data_obrigatoria(
        data.get('data_fim', contrato.data_fim.isoformat())
        if not criando
        else data.get('data_fim'),
        'data_fim'
    )
    if data_fim < data_inicio:
        raise ValueError('data_fim não pode ser anterior a data_inicio')

    valor = _numero_nao_negativo(
        data.get('valor', contrato.valor) if not criando else data.get('valor', 0),
        'valor'
    )

    moeda = (
        data.get('moeda', contrato.moeda or 'BRL')
        if not criando
        else data.get('moeda', 'BRL')
    )
    moeda = str(moeda or 'BRL').strip().upper()
    if moeda not in ('BRL', 'USD'):
        raise ValueError('moeda deve ser BRL ou USD')

    dias_aviso = _inteiro_intervalo(
        data.get(
            'dias_aviso_vencimento',
            contrato.dias_aviso_vencimento
            if not criando and contrato.dias_aviso_vencimento is not None
            else 30
        ),
        'dias_aviso_vencimento',
        0,
        3650
    )

    anexos_atuais = []
    itens_atuais = []
    if not criando:
        try:
            anexos_atuais = json.loads(contrato.anexos or '[]')
        except (TypeError, ValueError, json.JSONDecodeError):
            anexos_atuais = []
        try:
            itens_atuais = json.loads(contrato.itens or '[]')
        except (TypeError, ValueError, json.JSONDecodeError):
            itens_atuais = []

    anexos = _lista_json(
        data.get('anexos', anexos_atuais),
        'anexos'
    )
    itens = _lista_json(
        data.get('itens', itens_atuais),
        'itens'
    )

    if contrato is not None:
        _validar_ativos_do_contrato(contrato, empresa.id)

    return {
        'numero': numero,
        'empresa_id': empresa.id,
        'fornecedor_id': fornecedor.id,
        'localizacao_id': localizacao.id if localizacao else None,
        'cliente_id': cliente.id if cliente else None,
        'data_inicio': data_inicio,
        'data_fim': data_fim,
        'valor': valor,
        'moeda': moeda,
        'is_mensal': _booleano(
            data.get(
                'is_mensal',
                contrato.is_mensal if not criando else False
            )
        ),
        'observacao': (
            data.get('observacao', contrato.observacao)
            if not criando
            else data.get('observacao')
        ),
        'anexos': json.dumps(anexos, ensure_ascii=False),
        'dias_aviso_vencimento': dias_aviso,
        'is_prestacao_servico': _booleano(
            data.get(
                'is_prestacao_servico',
                contrato.is_prestacao_servico if not criando else False
            )
        ),
        'itens': json.dumps(itens, ensure_ascii=False),
    }


def _aplicar_dados(contrato, dados):
    for campo, valor in dados.items():
        setattr(contrato, campo, valor)


@contrato_bp.route('', methods=['GET'])
def get_contratos():
    user, erro = _exigir_permissao('ver')
    if erro:
        return erro

    empresa_id = request.args.get('empresa_id')
    query = apply_entity_filter(
        Contrato.query,
        Contrato,
        empresa_id,
        user
    )
    contratos = query.order_by(Contrato.numero, Contrato.id).all()
    return jsonify([contrato.to_dict() for contrato in contratos]), 200


@contrato_bp.route('', methods=['POST'])
def create_contrato():
    user, erro = _exigir_permissao('criar')
    if erro:
        return erro

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _resposta_erro('Envie um JSON válido', 400)

    try:
        dados = _dados_contrato(data, user)
        contrato = Contrato()
        _aplicar_dados(contrato, dados)
        db.session.add(contrato)
        db.session.commit()
    except PermissionError as exc:
        db.session.rollback()
        return _resposta_erro(str(exc), 403)
    except ValueError as exc:
        db.session.rollback()
        return _resposta_erro(str(exc), 400)
    except Exception:
        db.session.rollback()
        return _erro_interno('Erro ao criar contrato')

    try:
        create_log(
            user=user,
            action='create_contrato',
            entity='contrato',
            entity_id=contrato.id,
            details={'created': contrato.to_dict()},
            req=request
        )
    except Exception:
        current_app.logger.exception('Erro ao registrar criação de contrato')

    return jsonify(contrato.to_dict()), 201


@contrato_bp.route('/alertas', methods=['GET'])
def get_alertas_vencimento():
    user, erro = _exigir_permissao('ver')
    if erro:
        return erro

    query = apply_entity_filter(
        Contrato.query,
        Contrato,
        request.args.get('empresa_id'),
        user
    )
    hoje = datetime.now().date()
    alertas = []

    for contrato in query.all():
        if not contrato.data_fim:
            continue

        dias_para_vencer = (contrato.data_fim - hoje).days
        dias_aviso = (
            contrato.dias_aviso_vencimento
            if contrato.dias_aviso_vencimento is not None
            else 30
        )
        if dias_para_vencer > dias_aviso:
            continue

        alertas.append({
            'id': contrato.id,
            'numero': contrato.numero,
            'empresa_nome': (
                contrato.empresa.nome if contrato.empresa else 'N/A'
            ),
            'fornecedor_nome': (
                contrato.fornecedor.nome if contrato.fornecedor else 'N/A'
            ),
            'data_fim': contrato.data_fim.isoformat(),
            'dias_restantes': dias_para_vencer,
            'observacao': contrato.observacao,
            'status': 'VENCIDO' if dias_para_vencer < 0 else 'AVISO',
        })

    alertas.sort(key=lambda item: item['dias_restantes'])
    return jsonify(alertas), 200


@contrato_bp.route('/<int:contrato_id>', methods=['PUT'])
def update_contrato(contrato_id):
    user, erro = _exigir_permissao('editar')
    if erro:
        return erro

    contrato = _buscar_contrato_permitido(contrato_id, user)
    if not contrato:
        return _resposta_erro('Contrato não encontrado', 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return _resposta_erro('Envie um JSON válido', 400)

    try:
        before = contrato.to_dict()
    except Exception:
        before = None

    try:
        dados = _dados_contrato(data, user, contrato)
        _aplicar_dados(contrato, dados)
        db.session.commit()
    except PermissionError as exc:
        db.session.rollback()
        return _resposta_erro(str(exc), 403)
    except ValueError as exc:
        db.session.rollback()
        return _resposta_erro(str(exc), 400)
    except Exception:
        db.session.rollback()
        return _erro_interno('Erro ao atualizar contrato')

    try:
        create_log(
            user=user,
            action='update_contrato',
            entity='contrato',
            entity_id=contrato.id,
            details={'before': before, 'after_payload': data},
            req=request
        )
    except Exception:
        current_app.logger.exception('Erro ao registrar atualização de contrato')

    return jsonify(contrato.to_dict()), 200


@contrato_bp.route('/<int:contrato_id>', methods=['DELETE'])
def delete_contrato(contrato_id):
    user, erro = _exigir_permissao('excluir')
    if erro:
        return erro

    contrato = _buscar_contrato_permitido(contrato_id, user)
    if not contrato:
        return _resposta_erro('Contrato não encontrado', 404)

    try:
        snapshot = contrato.to_dict()
    except Exception:
        snapshot = None

    try:
        ativos_legados = Ativo.query.filter(
            Ativo.contrato_id == contrato.id
        ).all()

        for ativo in ativos_legados:
            outros = sorted(
                [
                    item for item in (ativo.contratos or [])
                    if item.id != contrato.id
                ],
                key=lambda item: ((item.numero or '').lower(), item.id)
            )
            ativo.contrato_id = outros[0].id if outros else None

        contrato.ativos_vinculados = []
        db.session.delete(contrato)
        db.session.commit()
    except Exception:
        db.session.rollback()
        return _erro_interno('Erro ao excluir contrato')

    try:
        create_log(
            user=user,
            action='delete_contrato',
            entity='contrato',
            entity_id=contrato_id,
            details={'deleted': snapshot},
            req=request
        )
    except Exception:
        current_app.logger.exception('Erro ao registrar exclusão de contrato')

    return jsonify({'message': 'Contrato excluído com sucesso'}), 200


@contrato_bp.route('/custos', methods=['GET'])
def get_custos_contratos():
    from ..models.usuario import Usuario
    from ..utils.custos_modelos import montar_custos_contratos

    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')

    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()

    query = Contrato.query
    query = apply_entity_filter(query, Contrato, empresa_id, user)
    dados = montar_custos_contratos(query.all())
    return jsonify(dados), 200

