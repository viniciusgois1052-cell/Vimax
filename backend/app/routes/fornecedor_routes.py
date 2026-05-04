from flask import Blueprint, request, jsonify
from ..models.fornecedor import Fornecedor
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log
import json
from ..utils.auth import get_current_user_from_request

fornecedor_bp = Blueprint('fornecedor_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None

def model_columns(obj):
    """Retorna lista de nomes de colunas do modelo SQLAlchemy (seguro)."""
    try:
        return [c.name for c in obj.__table__.columns]
    except Exception:
        return []

@fornecedor_bp.route('', methods=['GET'])
def list_fornecedores():
    """
    GET /api/fornecedores
    Retorna todas os fornecedores.
    """
    try:
        fornecedores = Fornecedor.query.order_by(Fornecedor.id.desc()).all()
        return jsonify([f.to_dict() for f in fornecedores]), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@fornecedor_bp.route('', methods=['POST'])
def create_fornecedor():
    """
    POST /api/fornecedores
    Cria um novo fornecedor. Aceita JSON com campos correspondentes ao modelo.
    """
    data = request.get_json() or {}
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    try:
        cols = model_columns(Fornecedor)
        novo = Fornecedor()
        for k, v in data.items():
            if k in cols:
                if k.endswith('_id'):
                    setattr(novo, k, safe_int(v))
                else:
                    setattr(novo, k, v)
        db.session.add(novo)
        db.session.commit()

        try:
            create_log(user=user, action='create_fornecedor', entity='fornecedor', entity_id=novo.id,
                       details={'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(novo.to_dict()), 201
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@fornecedor_bp.route('/<int:id>', methods=['GET'])
def get_fornecedor(id):
    """
    GET /api/fornecedores/<id>
    """
    f = Fornecedor.query.get_or_404(id)
    return jsonify(f.to_dict()), 200

@fornecedor_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_fornecedor(id):
    """
    PUT/PATCH /api/fornecedores/<id>
    Atualiza campos presentes no payload.
    """
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    f = Fornecedor.query.get_or_404(id)
    data = request.get_json() or {}

    try:
        before = None
        try:
            before = f.to_dict()
        except Exception:
            before = None

        cols = model_columns(Fornecedor)
        for k, v in data.items():
            if k in cols and k != 'id':
                if k.endswith('_id'):
                    setattr(f, k, safe_int(v))
                else:
                    setattr(f, k, v)

        db.session.commit()

        try:
            create_log(user=user, action='update_fornecedor', entity='fornecedor', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(f.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@fornecedor_bp.route('/<int:id>', methods=['DELETE'])
def delete_fornecedor(id):
    """
    DELETE /api/fornecedores/<id>
    Remove fornecedor (commit) e registra log da exclusão.
    """
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    f = Fornecedor.query.get_or_404(id)

    # Checagem de permissão opcional:
    # if user is None or user.role not in ('super_admin', 'admin'):
    #     return jsonify({'error': 'forbidden'}), 403

    try:
        snapshot = None
        try:
            snapshot = f.to_dict()
        except Exception:
            snapshot = None

        db.session.delete(f)
        db.session.commit()

        try:
            create_log(user=user, action='delete_fornecedor', entity='fornecedor', entity_id=id,
                       details={'deleted': snapshot}, req=request)
        except Exception:
            pass

        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500
