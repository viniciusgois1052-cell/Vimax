from flask import Blueprint, request, jsonify
from ..utils.auth import get_current_user_from_request
from ..models.marketing_grupo import MarketingGrupo
from ..models.marketing_contato_grupo import MarketingContatoGrupo
from .. import db
from ..utils.logging import create_log

marketing_grupo_bp = Blueprint('marketing_grupo_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None


@marketing_grupo_bp.route('', methods=['GET'])
def list_grupos():
    try:
        empresa_id = request.args.get('empresa_id')
        query = MarketingGrupo.query
        if empresa_id:
            query = query.filter_by(empresa_id=int(empresa_id))
        grupos = query.order_by(MarketingGrupo.id.desc()).all()
        return jsonify([g.to_dict() for g in grupos]), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


@marketing_grupo_bp.route('', methods=['POST'])
def create_grupo():
    user = get_current_user_from_request(request)
    data = request.get_json() or {}
    try:
        novo = MarketingGrupo(
            nome=data.get('nome', ''),
            descricao=data.get('descricao'),
            empresa_id=safe_int(data.get('empresa_id'))
        )
        db.session.add(novo)
        db.session.commit()

        try:
            create_log(user=user, action='create_marketing_grupo', entity='marketing_grupo', entity_id=novo.id,
                       details={'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(novo.to_dict()), 201
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


@marketing_grupo_bp.route('/<int:id>', methods=['GET'])
def get_grupo(id):
    g = MarketingGrupo.query.get_or_404(id)
    return jsonify(g.to_dict()), 200


@marketing_grupo_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_grupo(id):
    user = get_current_user_from_request(request)
    g = MarketingGrupo.query.get_or_404(id)
    data = request.get_json() or {}

    before = None
    try:
        before = g.to_dict()
    except Exception:
        before = None
    try:
        for field in ['nome', 'descricao']:
            if field in data:
                setattr(g, field, data[field])
        if 'empresa_id' in data:
            g.empresa_id = safe_int(data['empresa_id'])
        db.session.commit()

        try:
            create_log(user=user, action='update_marketing_grupo', entity='marketing_grupo', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(g.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


@marketing_grupo_bp.route('/<int:id>', methods=['DELETE'])
def delete_grupo(id):
    user = get_current_user_from_request(request)
    g = MarketingGrupo.query.get_or_404(id)

    snapshot = None
    try:
        snapshot = g.to_dict()
    except Exception:
        snapshot = None

    try:
        db.session.delete(g)
        db.session.commit()

        try:
            create_log(user=user, action='delete_marketing_grupo', entity='marketing_grupo', entity_id=id,
                       details={'deleted': snapshot}, req=request)
        except Exception:
            pass

        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500


@marketing_grupo_bp.route('/<int:id>/contatos', methods=['GET'])
def get_contatos_do_grupo(id):
    g = MarketingGrupo.query.get_or_404(id)
    contatos = [
        {
            'id': cg.contato.id,
            'nome': cg.contato.nome,
            'email': cg.contato.email,
            'empresa': cg.contato.empresa,
            'telefone': cg.contato.telefone
        }
        for cg in g.contatos if cg.contato
    ]
    return jsonify(contatos), 200
