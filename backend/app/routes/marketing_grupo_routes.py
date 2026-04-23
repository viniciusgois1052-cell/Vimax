from flask import Blueprint, request, jsonify
from ..models.marketing_grupo import MarketingGrupo
from ..models.marketing_contato import MarketingContato
from ..models.marketing_contato_grupo import MarketingContatoGrupo
from .. import db

marketing_grupo_bp = Blueprint('marketing_grupo_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None

@marketing_grupo_bp.route('', methods=['GET'])
def list_grupos():
    try:
        empresa_id = safe_int(request.args.get('empresa_id'))
        query = MarketingGrupo.query
        if empresa_id:
            query = query.filter_by(empresa_id=empresa_id)
        grupos = query.order_by(MarketingGrupo.id.desc()).all()
        result = []
        for g in grupos:
            d = g.to_dict()
            d['qtd_contatos'] = MarketingContatoGrupo.query.filter_by(grupo_id=g.id).count()
            result.append(d)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@marketing_grupo_bp.route('', methods=['POST'])
def create_grupo():
    data = request.get_json() or {}
    try:
        novo = MarketingGrupo(
            nome=data.get('nome', ''),
            descricao=data.get('descricao'),
            empresa_id=safe_int(data.get('empresa_id')),
        )
        db.session.add(novo)
        db.session.commit()
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
    g = MarketingGrupo.query.get_or_404(id)
    data = request.get_json() or {}
    try:
        if 'nome' in data: g.nome = data['nome']
        if 'descricao' in data: g.descricao = data['descricao']
        if 'empresa_id' in data: g.empresa_id = safe_int(data['empresa_id'])
        db.session.commit()
        return jsonify(g.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@marketing_grupo_bp.route('/<int:id>', methods=['DELETE'])
def delete_grupo(id):
    g = MarketingGrupo.query.get_or_404(id)
    try:
        MarketingContatoGrupo.query.filter_by(grupo_id=id).delete()
        db.session.delete(g)
        db.session.commit()
        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500

@marketing_grupo_bp.route('/<int:id>/contatos', methods=['GET'])
def get_grupo_contatos(id):
    MarketingGrupo.query.get_or_404(id)
    try:
        contatos = (
            db.session.query(MarketingContato)
            .join(MarketingContatoGrupo, MarketingContatoGrupo.contato_id == MarketingContato.id)
            .filter(MarketingContatoGrupo.grupo_id == id)
            .all()
        )
        return jsonify([c.to_dict() for c in contatos]), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500
