from flask import Blueprint, request, jsonify
from ..models.empresa import Empresa
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log
import json

empresa_bp = Blueprint('empresa_bp', __name__)

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

@empresa_bp.route('', methods=['GET'])
def list_empresas():
    """
    GET /api/empresas
    Retorna todas empresas (simples).
    """
    try:
        empresas = Empresa.query.order_by(Empresa.id.desc()).all()
        return jsonify([e.to_dict() for e in empresas]), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@empresa_bp.route('', methods=['POST'])
def create_empresa():
    """
    POST /api/empresas
    Cria uma nova empresa. Aceita JSON com campos correspondentes ao modelo.
    """
    data = request.get_json() or {}
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    try:
        cols = model_columns(Empresa)
        novo = Empresa()
        for k, v in data.items():
            if k in cols:
                # tenta conversão básica para inteiros em chaves *_id
                if k.endswith('_id'):
                    setattr(novo, k, safe_int(v))
                else:
                    setattr(novo, k, v)
        db.session.add(novo)
        db.session.commit()

        try:
            create_log(user=user, action='create_empresa', entity='empresa', entity_id=novo.id,
                       details={'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(novo.to_dict()), 201
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@empresa_bp.route('/<int:id>', methods=['GET'])
def get_empresa(id):
    """
    GET /api/empresas/<id>
    """
    emp = Empresa.query.get_or_404(id)
    return jsonify(emp.to_dict()), 200

@empresa_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_empresa(id):
    """
    PUT/PATCH /api/empresas/<id>
    Atualiza campos presentes no payload.
    """
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    emp = Empresa.query.get_or_404(id)
    data = request.get_json() or {}

    try:
        before = None
        try:
            before = emp.to_dict()
        except Exception:
            before = None

        cols = model_columns(Empresa)
        for k, v in data.items():
            if k in cols and k != 'id':
                if k.endswith('_id'):
                    setattr(emp, k, safe_int(v))
                else:
                    setattr(emp, k, v)

        db.session.commit()

        try:
            create_log(user=user, action='update_empresa', entity='empresa', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(emp.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@empresa_bp.route('/<int:id>', methods=['DELETE'])
def delete_empresa(id):
    """
    DELETE /api/empresas/<id>
    Remove empresa (commit) e cria log da exclusão.
    """
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    emp = Empresa.query.get_or_404(id)

    # Exemplo de checagem de permissão (ajuste conforme sua política)
    # if user is None or user.role not in ('super_admin', 'admin'):
    #     return jsonify({'error': 'forbidden'}), 403

    try:
        snapshot = None
        try:
            snapshot = emp.to_dict()
        except Exception:
            snapshot = None

        db.session.delete(emp)
        db.session.commit()

        try:
            create_log(user=user, action='delete_empresa', entity='empresa', entity_id=id,
                       details={'deleted': snapshot}, req=request)
        except Exception:
            pass

        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500
