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

@contrato_bp.route('/alertas-expiracao', methods=['GET'])
def get_alertas_expiracao():
    """Retorna contratos vencidos e próximos do vencimento"""
    try:
        hoje = datetime.now().date()
        contratos = Contrato.query.all()
        
        alertas = []
        
        for contrato in contratos:
            if not contrato.data_fim:
                continue
            
            dias_restantes = (contrato.data_fim - hoje).days
            
            # Contrato VENCIDO (passou da data de fim)
            if dias_restantes < 0:
                alertas.append({
                    'id': contrato.id,
                    'numero': contrato.numero,
                    'fornecedor_nome': contrato.fornecedor.nome if contrato.fornecedor else 'Não informado',
                    'data_fim': contrato.data_fim.isoformat(),
                    'dias_restantes': dias_restantes,
                    'status': 'VENCIDO',
                    'observacao': contrato.observacao
                })
            # Contrato PRÓXIMO DO VENCIMENTO (entre hoje e dias_aviso_vencimento)
            elif 0 <= dias_restantes <= contrato.dias_aviso_vencimento:
                alertas.append({
                    'id': contrato.id,
                    'numero': contrato.numero,
                    'fornecedor_nome': contrato.fornecedor.nome if contrato.fornecedor else 'Não informado',
                    'data_fim': contrato.data_fim.isoformat(),
                    'dias_restantes': dias_restantes,
                    'status': 'PROXIMO',
                    'observacao': contrato.observacao
                })
        
        # Ordenar: vencidos primeiro (por data), depois próximos
        alertas_vencidos = [a for a in alertas if a['status'] == 'VENCIDO']
        alertas_proximos = [a for a in alertas if a['status'] == 'PROXIMO']
        
        alertas_vencidos.sort(key=lambda x: x['dias_restantes'])
        alertas_proximos.sort(key=lambda x: x['dias_restantes'])
        
        return jsonify(alertas_vencidos + alertas_proximos), 200
        
    except Exception as e:
        print(f"Erro ao buscar alertas: {e}")
        return jsonify([]), 200

@contrato_bp.route('/alertas', methods=['GET'])
def get_alertas():
    """Rota alternativa para compatibilidade - retorna contratos com alertas de vencimento"""
    return get_alertas_expiracao()
