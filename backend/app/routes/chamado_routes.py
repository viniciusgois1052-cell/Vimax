from flask import Blueprint, request, jsonify
from ..models.chamado import Chamado, CustoChamado
from ..models.usuario import Usuario
from .. import db
from ..utils.filters import apply_entity_filter
from datetime import datetime
import json

chamado_bp = Blueprint('chamado_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None

@chamado_bp.route('', methods=['GET'])
def get_chamados():
    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')
    
    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
    
    query = Chamado.query
    query = apply_entity_filter(query, Chamado, empresa_id, user)
    
    chamados = query.order_by(Chamado.data_abertura.desc()).all()
    return jsonify([c.to_dict() for c in chamados])

@chamado_bp.route('', methods=['POST'])
def create_chamado():
    data = request.get_json()
    novo_chamado = Chamado(
        titulo=data.get('titulo'),
        descricao=data.get('descricao'),
        status=data.get('status', 'Aberto'),
        localizacao_id=safe_int(data.get('localizacao_id')),
        orcamento_id=safe_int(data.get('orcamento_id')),
        ativo_id=safe_int(data.get('ativo_id')),
        contrato_id=safe_int(data.get('contrato_id')),
        fornecedor_id=safe_int(data.get('fornecedor_id')),
        empresa_id=safe_int(data.get('empresa_id')),
        valor_total=float(data.get('valor_total', 0.0)),
        anexos=json.dumps(data.get('anexos', []))
    )
    db.session.add(novo_chamado)
    db.session.commit()
    return jsonify(novo_chamado.to_dict()), 201

@chamado_bp.route('/<int:id>', methods=['PUT'])
def update_chamado(id):
    chamado = Chamado.query.get_or_404(id)
    data = request.get_json()
    chamado.titulo = data.get('titulo', chamado.titulo)
    chamado.descricao = data.get('descricao', chamado.descricao)
    chamado.status = data.get('status', chamado.status)
    chamado.localizacao_id = safe_int(data.get('localizacao_id'))
    chamado.orcamento_id = safe_int(data.get('orcamento_id'))
    chamado.ativo_id = safe_int(data.get('ativo_id'))
    chamado.contrato_id = safe_int(data.get('contrato_id'))
    chamado.fornecedor_id = safe_int(data.get('fornecedor_id'))
    chamado.empresa_id = safe_int(data.get('empresa_id'))
    chamado.valor_total = float(data.get('valor_total', chamado.valor_total))
    chamado.anexos = json.dumps(data.get('anexos', []))
    db.session.commit()
    return jsonify(chamado.to_dict())

@chamado_bp.route('/<int:id>', methods=['DELETE'])
def delete_chamado(id):
    chamado = Chamado.query.get_or_404(id)
    db.session.delete(chamado)
    db.session.commit()
    return '', 204
