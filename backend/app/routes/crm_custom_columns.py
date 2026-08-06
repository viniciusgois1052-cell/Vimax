from flask import Blueprint, request, jsonify
from .. import db
from ..models.crm_custom_column import CrmCustomColumn
import time

crm_custom_cols_bp = Blueprint('crm_custom_cols', __name__)

def _get_user():
    from ..models.usuario import Usuario
    api_token = request.headers.get('X-API-Token')
    if not api_token:
        return None
    return Usuario.query.filter_by(api_token=api_token).first()

@crm_custom_cols_bp.route('/api/crm/custom-columns/<entity_type>', methods=['GET'])
def listar_colunas(entity_type):
    user = _get_user()
    if not user:
        return jsonify({'error': 'Nao autenticado'}), 401
    cols = CrmCustomColumn.query.filter_by(
        empresa_id=user.empresa_id, entity_type=entity_type
    ).order_by(CrmCustomColumn.ordem, CrmCustomColumn.id).all()
    return jsonify([c.to_dict() for c in cols])

@crm_custom_cols_bp.route('/api/crm/custom-columns/<entity_type>', methods=['POST'])
def criar_coluna(entity_type):
    user = _get_user()
    if not user:
        return jsonify({'error': 'Nao autenticado'}), 401
    data  = request.get_json() or {}
    label = (data.get('label') or '').strip()
    if not label:
        return jsonify({'error': 'Informe um nome para a coluna'}), 400

    key = 'cx_' + str(int(time.time() * 1000))
    col = CrmCustomColumn(empresa_id=user.empresa_id, entity_type=entity_type, key=key, label=label)
    db.session.add(col)
    db.session.commit()
    return jsonify(col.to_dict()), 201

@crm_custom_cols_bp.route('/api/crm/custom-columns/<entity_type>/<key>', methods=['DELETE'])
def deletar_coluna(entity_type, key):
    user = _get_user()
    if not user:
        return jsonify({'error': 'Nao autenticado'}), 401
    col = CrmCustomColumn.query.filter_by(empresa_id=user.empresa_id, entity_type=entity_type, key=key).first()
    if col:
        db.session.delete(col)
        db.session.commit()
    return jsonify({'ok': True})