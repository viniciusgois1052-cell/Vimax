from flask import Blueprint, request, jsonify
from datetime import datetime
import json
from .. import db
from ..models.contrato import Contrato
from ..models.usuario import Usuario
from ..utils.filters import apply_entity_filter

contrato_bp = Blueprint('contratos', __name__)

@contrato_bp.route('', methods=['GET'])
def get_contratos():
    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')
    
    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
        
    query = Contrato.query
    query = apply_entity_filter(query, Contrato, empresa_id, user)
    contratos = query.all()
    return jsonify([c.to_dict() for c in contratos]), 200

@contrato_bp.route('', methods=['POST'])
def create_contrato():
    data = request.get_json()
    
    def safe_int(val):
        if val in [None, '', 'none', 'undefined']:
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    novo_contrato = Contrato(
        numero=data.get('numero'),
        fornecedor_id=safe_int(data.get('fornecedor_id')),
        localizacao_id=safe_int(data.get('localizacao_id')),
        empresa_id=safe_int(data.get('empresa_id')),
        data_inicio=datetime.strptime(data.get('data_inicio'), '%Y-%m-%d').date() if data.get('data_inicio') else None,
        data_fim=datetime.strptime(data.get('data_fim'), '%Y-%m-%d').date() if data.get('data_fim') else None,
        valor=float(data.get('valor', 0)),
        is_mensal=bool(data.get('is_mensal', False)),
        observacao=data.get('observacao'),
        anexos=json.dumps(data.get('anexos', [])),
        dias_aviso_vencimento=safe_int(data.get('dias_aviso_vencimento')) or 30
    )
    
    db.session.add(novo_contrato)
    db.session.commit()
    return jsonify(novo_contrato.to_dict()), 201

@contrato_bp.route('/<int:contrato_id>', methods=['PUT'])
def update_contrato(contrato_id):
    contrato = Contrato.query.get_or_404(contrato_id)
    data = request.get_json()
    
    def safe_int(val):
        if val in [None, '', 'none', 'undefined']:
            return None
        try:
            return int(val)
        except (ValueError, TypeError):
            return None

    contrato.numero = data.get('numero', contrato.numero)
    contrato.fornecedor_id = safe_int(data.get('fornecedor_id')) or contrato.fornecedor_id
    contrato.localizacao_id = safe_int(data.get('localizacao_id'))
    contrato.empresa_id = safe_int(data.get('empresa_id'))
    
    if data.get('data_inicio'):
        contrato.data_inicio = datetime.strptime(data.get('data_inicio'), '%Y-%m-%d').date()
    if data.get('data_fim'):
        contrato.data_fim = datetime.strptime(data.get('data_fim'), '%Y-%m-%d').date()
        
    contrato.valor = float(data.get('valor', contrato.valor))
    contrato.is_mensal = bool(data.get('is_mensal', False))
    contrato.observacao = data.get('observacao', contrato.observacao)
    contrato.anexos = json.dumps(data.get('anexos', []))
    contrato.dias_aviso_vencimento = safe_int(data.get('dias_aviso_vencimento')) or contrato.dias_aviso_vencimento
    
    db.session.commit()
    return jsonify(contrato.to_dict()), 200

@contrato_bp.route('/<int:contrato_id>', methods=['DELETE'])
def delete_contrato(contrato_id):
    contrato = Contrato.query.get_or_404(contrato_id)
    db.session.delete(contrato)
    db.session.commit()
    return jsonify({'message': 'Contrato excluído com sucesso'}), 200

@contrato_bp.route('/alertas', methods=['GET'])
def get_alertas_vencimento():
    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')
    
    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
        
    query = Contrato.query
    query = apply_entity_filter(query, Contrato, empresa_id, user)
    contratos = query.all()
    
    hoje = datetime.now().date()
    alertas = []
    
    for c in contratos:
        if c.data_fim:
            dias_para_vencer = (c.data_fim - hoje).days
            if 0 <= dias_para_vencer <= (c.dias_aviso_vencimento or 30):
                alertas.append({
                    'id': c.id,
                    'numero': c.numero,
                    'empresa_nome': c.empresa.nome if c.empresa else 'N/A',
                    'fornecedor_nome': c.fornecedor.nome if c.fornecedor else 'N/A',
                    'data_fim': c.data_fim.isoformat(),
                    'dias_restantes': dias_para_vencer
                })
                
    return jsonify(alertas), 200
