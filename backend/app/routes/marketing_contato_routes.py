from flask import Blueprint, request, jsonify
from ..models.marketing_contato import MarketingContato
from ..models.marketing_grupo import MarketingGrupo
from ..models.marketing_contato_grupo import MarketingContatoGrupo
from ..models.usuario import Usuario
from .. import db

marketing_contato_bp = Blueprint('marketing_contato_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None

@marketing_contato_bp.route('', methods=['GET'])
def list_contatos():
    try:
        empresa_id = safe_int(request.args.get('empresa_id'))
        query = MarketingContato.query
        if empresa_id:
            query = query.filter_by(empresa_id=empresa_id)
        contatos = query.order_by(MarketingContato.id.desc()).all()
        result = []
        for c in contatos:
            d = c.to_dict()
            grupos = (
                db.session.query(MarketingGrupo)
                .join(MarketingContatoGrupo, MarketingContatoGrupo.grupo_id == MarketingGrupo.id)
                .filter(MarketingContatoGrupo.contato_id == c.id)
                .all()
            )
            d['grupos'] = [{'id': g.id, 'nome': g.nome} for g in grupos]
            result.append(d)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@marketing_contato_bp.route('', methods=['POST'])
def create_contato():
    data = request.get_json() or {}
    try:
        novo = MarketingContato(
            nome=data.get('nome', ''),
            email=data.get('email', ''),
            empresa=data.get('empresa'),
            telefone=data.get('telefone'),
            empresa_id=safe_int(data.get('empresa_id')),
        )
        db.session.add(novo)
        db.session.commit()
        return jsonify(novo.to_dict()), 201
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@marketing_contato_bp.route('/<int:id>', methods=['GET'])
def get_contato(id):
    c = MarketingContato.query.get_or_404(id)
    return jsonify(c.to_dict()), 200

@marketing_contato_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_contato(id):
    c = MarketingContato.query.get_or_404(id)
    data = request.get_json() or {}
    try:
        if 'nome' in data: c.nome = data['nome']
        if 'email' in data: c.email = data['email']
        if 'empresa' in data: c.empresa = data['empresa']
        if 'telefone' in data: c.telefone = data['telefone']
        if 'empresa_id' in data: c.empresa_id = safe_int(data['empresa_id'])
        db.session.commit()
        return jsonify(c.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@marketing_contato_bp.route('/<int:id>', methods=['DELETE'])
def delete_contato(id):
    c = MarketingContato.query.get_or_404(id)
    try:
        MarketingContatoGrupo.query.filter_by(contato_id=id).delete()
        db.session.delete(c)
        db.session.commit()
        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500

@marketing_contato_bp.route('/<int:id>/grupos', methods=['GET'])
def get_contato_grupos(id):
    MarketingContato.query.get_or_404(id)
    try:
        grupos = (
            db.session.query(MarketingGrupo)
            .join(MarketingContatoGrupo, MarketingContatoGrupo.grupo_id == MarketingGrupo.id)
            .filter(MarketingContatoGrupo.contato_id == id)
            .all()
        )
        return jsonify([g.to_dict() for g in grupos]), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@marketing_contato_bp.route('/<int:id>/grupos', methods=['POST'])
def set_contato_grupos(id):
    MarketingContato.query.get_or_404(id)
    data = request.get_json() or {}
    grupo_ids = data.get('grupo_ids', [])
    try:
        MarketingContatoGrupo.query.filter_by(contato_id=id).delete()
        for gid in grupo_ids:
            gid_int = safe_int(gid)
            if gid_int:
                db.session.add(MarketingContatoGrupo(contato_id=id, grupo_id=gid_int))
        db.session.commit()
        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500
