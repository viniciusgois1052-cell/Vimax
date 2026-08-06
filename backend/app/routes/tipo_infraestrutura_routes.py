from flask import Blueprint, request, jsonify, g

from ..models.tipo_infraestrutura import TipoInfraestrutura
from .. import db
from ..utils.logging import create_log
from ..utils.auth import permission_required


tipo_infraestrutura_bp = Blueprint(
    'tipo_infraestrutura_bp',
    __name__
)


def parse_bool(value, default=True):
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, int):
        return value == 1

    if isinstance(value, str):
        normalized = value.strip().lower()

        if normalized in ('true', '1', 'sim', 'yes'):
            return True

        if normalized in ('false', '0', 'nao', 'não', 'no'):
            return False

    return default


@tipo_infraestrutura_bp.route('', methods=['GET'])
@permission_required('tipo_infraestrutura', 'ver')
def get_tipos_infraestrutura():
    ativos_apenas = (
        request.args.get('ativos', 'false').lower() == 'true'
    )

    query = TipoInfraestrutura.query

    if ativos_apenas:
        query = query.filter_by(ativo=True)

    tipos = query.order_by(TipoInfraestrutura.nome).all()

    return jsonify([tipo.to_dict() for tipo in tipos]), 200


@tipo_infraestrutura_bp.route('/<int:id>', methods=['GET'])
@permission_required('tipo_infraestrutura', 'ver')
def get_tipo_infraestrutura(id):
    tipo = TipoInfraestrutura.query.get(id)

    if not tipo:
        return jsonify({
            'error': 'Tipo de infraestrutura não encontrado'
        }), 404

    return jsonify(tipo.to_dict()), 200


@tipo_infraestrutura_bp.route('', methods=['POST'])
@permission_required('tipo_infraestrutura', 'criar')
def create_tipo_infraestrutura():
    user = g.current_user
    data = request.get_json(silent=True) or {}

    nome = str(data.get('nome') or '').strip()

    if not nome:
        return jsonify({
            'error': 'Nome é obrigatório'
        }), 400

    existente = TipoInfraestrutura.query.filter(
        db.func.lower(TipoInfraestrutura.nome) == nome.lower()
    ).first()

    if existente:
        return jsonify({
            'error': 'Tipo de infraestrutura com este nome já existe'
        }), 409

    try:
        novo_tipo = TipoInfraestrutura(
            nome=nome,
            descricao=data.get('descricao'),
            ativo=parse_bool(data.get('ativo'), True)
        )

        db.session.add(novo_tipo)
        db.session.commit()

        try:
            create_log(
                user=user,
                action='create_tipo_infraestrutura',
                entity='tipo_infraestrutura',
                entity_id=novo_tipo.id,
                details={'payload': data},
                req=request
            )
        except Exception:
            pass

        return jsonify(novo_tipo.to_dict()), 201

    except Exception:
        db.session.rollback()

        return jsonify({
            'error': 'Erro ao criar tipo de infraestrutura'
        }), 500


@tipo_infraestrutura_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
@permission_required('tipo_infraestrutura', 'editar')
def update_tipo_infraestrutura(id):
    user = g.current_user
    tipo = TipoInfraestrutura.query.get(id)

    if not tipo:
        return jsonify({
            'error': 'Tipo de infraestrutura não encontrado'
        }), 404

    data = request.get_json(silent=True) or {}
    before = tipo.to_dict()

    if 'nome' in data:
        nome = str(data.get('nome') or '').strip()

        if not nome:
            return jsonify({
                'error': 'Nome é obrigatório'
            }), 400

        existente = TipoInfraestrutura.query.filter(
            db.func.lower(TipoInfraestrutura.nome) == nome.lower(),
            TipoInfraestrutura.id != id
        ).first()

        if existente:
            return jsonify({
                'error': 'Tipo de infraestrutura com este nome já existe'
            }), 409

        tipo.nome = nome

    if 'descricao' in data:
        tipo.descricao = data.get('descricao')

    if 'ativo' in data:
        tipo.ativo = parse_bool(data.get('ativo'), tipo.ativo)

    try:
        db.session.commit()

        try:
            create_log(
                user=user,
                action='update_tipo_infraestrutura',
                entity='tipo_infraestrutura',
                entity_id=id,
                details={
                    'before': before,
                    'after_payload': data
                },
                req=request
            )
        except Exception:
            pass

        return jsonify(tipo.to_dict()), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            'error': 'Erro ao atualizar tipo de infraestrutura'
        }), 500


@tipo_infraestrutura_bp.route('/<int:id>', methods=['DELETE'])
@permission_required('tipo_infraestrutura', 'excluir')
def delete_tipo_infraestrutura(id):
    user = g.current_user
    tipo = TipoInfraestrutura.query.get(id)

    if not tipo:
        return jsonify({
            'error': 'Tipo de infraestrutura não encontrado'
        }), 404

    snapshot = tipo.to_dict()

    try:
        db.session.delete(tipo)
        db.session.commit()

        try:
            create_log(
                user=user,
                action='delete_tipo_infraestrutura',
                entity='tipo_infraestrutura',
                entity_id=id,
                details={'deleted': snapshot},
                req=request
            )
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': 'Tipo de infraestrutura excluído'
        }), 200

    except Exception:
        db.session.rollback()

        return jsonify({
            'error': (
                'Não foi possível excluir. '
                'O tipo pode estar vinculado a uma infraestrutura.'
            )
        }), 409