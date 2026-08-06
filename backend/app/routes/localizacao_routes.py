from flask import Blueprint, request, jsonify
from ..models.localizacao import Localizacao
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log
from ..utils.filters import apply_entity_filter
from ..utils.auth import get_current_user_from_request, require_roles

localizacao_bp = Blueprint('localizacao_bp', __name__)

def _get_empresa_id(data):
    """Extrai e converte empresa_id para int ou None."""
    empresa_id_data = data.get('empresa_id')
    if empresa_id_data is None or empresa_id_data == '' or empresa_id_data == 'none':
        return None
    try:
        return int(empresa_id_data)
    except (ValueError, TypeError):
        return empresa_id_data if isinstance(empresa_id_data, int) else None

@localizacao_bp.route('', methods=['GET'])
def get_localizacoes():
    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')
    
    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
        
    query = Localizacao.query
    query = apply_entity_filter(query, Localizacao, empresa_id, user)
    localizacoes = query.all()
    return jsonify([l.to_dict() for l in localizacoes])

@localizacao_bp.route('', methods=['POST'])
def create_localizacao():
    user, err = require_roles('super_admin', 'admin')
    if err: return err

    data = request.get_json() or {}
    nova_localizacao = Localizacao(
        nome=data.get('nome'),
        descricao=data.get('descricao'),
        empresa_id=_get_empresa_id(data)
    )
    db.session.add(nova_localizacao)
    db.session.commit()

    try:
        create_log(user=user, action='create_localizacao', entity='localizacao', entity_id=nova_localizacao.id,
                   details={'payload': data}, req=request)
    except Exception:
        pass

    return jsonify(nova_localizacao.to_dict()), 201

@localizacao_bp.route('/<int:id>', methods=['PUT'])
def update_localizacao(id):
    user, err = require_roles('super_admin', 'admin')
    if err: return err

    localizacao = Localizacao.query.get_or_404(id)
    data = request.get_json() or {}

    before = None
    try:
        before = localizacao.to_dict()
    except Exception:
        before = None
    localizacao.nome = data.get('nome', localizacao.nome)
    localizacao.descricao = data.get('descricao', localizacao.descricao)
    localizacao.empresa_id = _get_empresa_id(data)
    db.session.commit()

    try:
        create_log(user=user, action='update_localizacao', entity='localizacao', entity_id=id,
                   details={'before': before, 'after_payload': data}, req=request)
    except Exception:
        pass

    return jsonify(localizacao.to_dict())

@localizacao_bp.route('/<int:id>', methods=['DELETE'])
def delete_localizacao(id):
    user, err = require_roles('super_admin', 'admin')
    if err: return err

    localizacao = Localizacao.query.get_or_404(id)

    snapshot = None
    try:
        snapshot = localizacao.to_dict()
    except Exception:
        snapshot = None
    db.session.delete(localizacao)
    db.session.commit()

    try:
        create_log(user=user, action='delete_localizacao', entity='localizacao', entity_id=id,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass

    return '', 204