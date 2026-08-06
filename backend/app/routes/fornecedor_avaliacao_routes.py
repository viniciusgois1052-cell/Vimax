from flask import Blueprint, jsonify, request
from sqlalchemy import case, func

from .. import db
from ..models.fornecedor import Fornecedor
from ..models.fornecedor_avaliacao import FornecedorAvaliacao
from ..models.usuario import Usuario
from ..utils.filters import get_all_allowed_ids
from ..utils.logging import create_log


fornecedor_avaliacao_bp = Blueprint(
    'fornecedor_avaliacao_bp',
    __name__
)


def _usuario_atual():
    token = request.headers.get('X-API-Token')
    if not token:
        return None
    user = Usuario.query.filter_by(api_token=token).first()
    if not user or not user.token_valido():
        return None
    return user


def _tem_permissao(user, acao):
    if user.role == 'super_admin':
        return True

    perfil = getattr(user, 'perfil_acesso', None)
    if perfil:
        if acao == 'ver':
            return (
                getattr(perfil, 'compras_ver', False) is True
                or getattr(perfil, 'compras_editar', False) is True
            )
        if acao == 'avaliar':
            return getattr(perfil, 'compras_editar', False) is True
        if acao == 'excluir':
            return getattr(perfil, 'compras_excluir', False) is True
        return False

    # Compatibilidade para administradores antigos sem perfil associado.
    return user.role == 'admin'


def _autorizado(acao):
    user = _usuario_atual()
    if not user:
        return None, (
            jsonify({'error': 'Não autenticado'}),
            401
        )
    if not _tem_permissao(user, acao):
        return None, (
            jsonify({
                'error': 'Acesso negado',
                'message': (
                    'Somente usuários autorizados no módulo de '
                    'Compras podem avaliar fornecedores'
                ),
            }),
            403
        )
    return user, None


def _empresas_permitidas(user):
    if user.role == 'super_admin':
        return None
    ids = user.get_empresa_ids()
    if not ids:
        return []
    return get_all_allowed_ids(ids)


def _empresa_permitida(user, empresa_id):
    ids = _empresas_permitidas(user)
    return ids is None or empresa_id in ids


def _query_permitida(user):
    query = FornecedorAvaliacao.query
    ids = _empresas_permitidas(user)
    if ids is None:
        return query
    if not ids:
        return query.filter(FornecedorAvaliacao.id == -1)
    return query.filter(FornecedorAvaliacao.empresa_id.in_(ids))


def _nota(valor):
    try:
        valor = int(valor)
    except (TypeError, ValueError):
        raise ValueError('A nota deve ser um número inteiro de 1 a 5')
    if valor < 1 or valor > 5:
        raise ValueError('A nota deve estar entre 1 e 5')
    return valor


def _resumo(query):
    row = query.with_entities(
        func.count(FornecedorAvaliacao.id),
        func.avg(FornecedorAvaliacao.qualidade),
    ).first()
    total = int(row[0] or 0)
    media = round(float(row[1] or 0), 2)
    return {
        'total_avaliacoes': total,
        'nota_media': media,
    }


def _fornecedor_permitido(fornecedor_id, user, empresa_id=None):
    fornecedor = Fornecedor.query.get(fornecedor_id)
    if not fornecedor:
        return None

    if fornecedor.tipo_entidade != 'fornecedor':
        return None

    ids = _empresas_permitidas(user)
    if (
        ids is not None
        and fornecedor.empresa_id is not None
        and fornecedor.empresa_id not in ids
    ):
        return None

    if (
        empresa_id is not None
        and fornecedor.empresa_id is not None
        and fornecedor.empresa_id != empresa_id
    ):
        return None

    return fornecedor


@fornecedor_avaliacao_bp.route('/ranking', methods=['GET'])
def ranking():
    user, erro = _autorizado('ver')
    if erro:
        return erro

    query = _query_permitida(user).filter(
        FornecedorAvaliacao.ordem_compra_id.is_(None)
    )
    empresa_id = request.args.get('empresa_id', type=int)
    if empresa_id is not None:
        if not _empresa_permitida(user, empresa_id):
            return jsonify({'error': 'Empresa não permitida'}), 403
        query = query.filter(
            FornecedorAvaliacao.empresa_id == empresa_id
        )

    rows = (
        query.join(
            Fornecedor,
            Fornecedor.id == FornecedorAvaliacao.fornecedor_id
        )
        .filter(Fornecedor.tipo_entidade == 'fornecedor')
        .with_entities(
            Fornecedor.id,
            Fornecedor.nome,
            Fornecedor.tipo_entidade,
            func.count(FornecedorAvaliacao.id),
            func.avg(FornecedorAvaliacao.qualidade),
            func.avg(
                case(
                    (
                        FornecedorAvaliacao.recomendaria.is_(True),
                        1
                    ),
                    else_=0
                )
            ),
        )
        .group_by(
            Fornecedor.id,
            Fornecedor.nome,
            Fornecedor.tipo_entidade
        )
        .order_by(
            func.avg(FornecedorAvaliacao.qualidade).desc(),
            func.count(FornecedorAvaliacao.id).desc()
        )
        .all()
    )

    resultado = []
    for posicao, row in enumerate(rows, start=1):
        resultado.append({
            'posicao': posicao,
            'fornecedor_id': row[0],
            'fornecedor_nome': row[1],
            'tipo_entidade': row[2] or 'fornecedor',
            'total_avaliacoes': int(row[3] or 0),
            'nota_media': round(float(row[4] or 0), 2),
            'percentual_recomendacao': round(
                float(row[5] or 0) * 100,
                1
            ),
        })

    return jsonify(resultado), 200


@fornecedor_avaliacao_bp.route(
    '/fornecedor/<int:fornecedor_id>',
    methods=['GET']
)
def historico_fornecedor(fornecedor_id):
    user, erro = _autorizado('ver')
    if erro:
        return erro

    empresa_id = request.args.get('empresa_id', type=int)
    if (
        empresa_id is not None
        and not _empresa_permitida(user, empresa_id)
    ):
        return jsonify({'error': 'Empresa não permitida'}), 403

    fornecedor = _fornecedor_permitido(
        fornecedor_id,
        user,
        empresa_id
    )
    if not fornecedor:
        return jsonify({'error': 'Fornecedor não encontrado'}), 404

    query = _query_permitida(user).filter(
        FornecedorAvaliacao.fornecedor_id == fornecedor_id,
        FornecedorAvaliacao.ordem_compra_id.is_(None)
    )
    if empresa_id is not None:
        query = query.filter(
            FornecedorAvaliacao.empresa_id == empresa_id
        )

    avaliacoes = query.order_by(
        FornecedorAvaliacao.updated_at.desc()
    ).all()
    return jsonify({
        'fornecedor': fornecedor.to_dict(),
        'resumo': _resumo(query),
        'minha_avaliacao': next(
            (
                avaliacao.to_dict()
                for avaliacao in avaliacoes
                if avaliacao.avaliador_id == user.id
            ),
            None
        ),
        'avaliacoes': [
            avaliacao.to_dict()
            for avaliacao in avaliacoes
        ],
    }), 200


@fornecedor_avaliacao_bp.route('', methods=['POST'])
def salvar_avaliacao():
    user, erro = _autorizado('avaliar')
    if erro:
        return erro

    data = request.get_json(silent=True) or {}
    try:
        fornecedor_id = int(data.get('fornecedor_id'))
        empresa_id = int(data.get('empresa_id'))
        nota = _nota(data.get('nota'))
    except (TypeError, ValueError) as exc:
        return jsonify({'error': str(exc)}), 400

    if not _empresa_permitida(user, empresa_id):
        return jsonify({'error': 'Empresa não permitida'}), 403

    fornecedor = _fornecedor_permitido(
        fornecedor_id,
        user,
        empresa_id
    )
    if not fornecedor:
        return jsonify({'error': 'Fornecedor não encontrado'}), 404

    comentario = (
        (data.get('comentario') or '').strip()[:2000]
        or None
    )
    recomendaria = nota >= 3

    avaliacao = FornecedorAvaliacao.query.filter_by(
        fornecedor_id=fornecedor.id,
        empresa_id=empresa_id,
        avaliador_id=user.id,
        ordem_compra_id=None
    ).first()
    criada = avaliacao is None

    if criada:
        avaliacao = FornecedorAvaliacao(
            fornecedor_id=fornecedor.id,
            empresa_id=empresa_id,
            avaliador_id=user.id,
            ordem_compra_id=None
        )
        db.session.add(avaliacao)

    # Mantém compatibilidade com a estrutura detalhada já instalada.
    # No modo simples, os cinco critérios recebem a mesma nota geral.
    avaliacao.qualidade = nota
    avaliacao.prazo = nota
    avaliacao.preco = nota
    avaliacao.atendimento = nota
    avaliacao.conformidade = nota
    avaliacao.comentario = comentario
    avaliacao.recomendaria = recomendaria

    try:
        db.session.commit()
        try:
            create_log(
                user=user,
                action=(
                    'create_fornecedor_avaliacao'
                    if criada
                    else 'update_fornecedor_avaliacao'
                ),
                entity='fornecedor_avaliacao',
                entity_id=avaliacao.id,
                details={
                    'fornecedor_id': fornecedor.id,
                    'empresa_id': empresa_id,
                    'nota': nota,
                },
                req=request
            )
        except Exception:
            pass
        resposta = avaliacao.to_dict()
        resposta['nota'] = nota
        return jsonify(resposta), 201 if criada else 200
    except Exception:
        db.session.rollback()
        return jsonify({
            'error': 'Não foi possível salvar a avaliação'
        }), 500


@fornecedor_avaliacao_bp.route(
    '/<int:avaliacao_id>',
    methods=['DELETE']
)
def excluir_avaliacao(avaliacao_id):
    user, erro = _autorizado('excluir')
    if erro:
        return erro

    avaliacao = _query_permitida(user).filter_by(
        id=avaliacao_id
    ).first()
    if not avaliacao:
        return jsonify({'error': 'Avaliação não encontrada'}), 404

    snapshot = avaliacao.to_dict()
    try:
        db.session.delete(avaliacao)
        db.session.commit()
        try:
            create_log(
                user=user,
                action='delete_fornecedor_avaliacao',
                entity='fornecedor_avaliacao',
                entity_id=avaliacao_id,
                details={'deleted': snapshot},
                req=request
            )
        except Exception:
            pass
        return jsonify({'ok': True}), 200
    except Exception:
        db.session.rollback()
        return jsonify({
            'error': 'Não foi possível excluir a avaliação'
        }), 500
