from flask import Blueprint, request, jsonify
from .. import db
from ..models.ativo import Ativo
from ..models.usuario import Usuario
from ..utils.filters import apply_entity_filter
from datetime import datetime

ativo_bp = Blueprint('ativo_bp', __name__)

@ativo_bp.route('/', methods=['GET'])
def get_ativos():
    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')
    
    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
        
    query = Ativo.query
    query = apply_entity_filter(query, Ativo, empresa_id, user)
    
    ativos = query.all()
    return jsonify([ativo.to_dict() for ativo in ativos])

@ativo_bp.route('/<int:id>', methods=['GET'])
def get_ativo(id):
    ativo = Ativo.query.get_or_404(id)
    return jsonify(ativo.to_dict())

@ativo_bp.route('/', methods=['POST'])
def create_ativo():
    data = request.get_json()
    data_aquisicao = datetime.strptime(data['data_aquisicao'], '%Y-%m-%d').date() if data.get('data_aquisicao') else None
    data_inativacao = datetime.strptime(data['data_inativacao'], '%Y-%m-%d').date() if data.get('data_inativacao') else None

    novo_ativo = Ativo(
        nome=data['nome'],
        numero_serie=data.get('numero_serie'),
        voltagem_entrada=data.get('voltagem_entrada'),
        data_aquisicao=data_aquisicao,
        data_inativacao=data_inativacao,
        empresa_id=data['empresa_id'],
        localizacao_id=data.get('localizacao_id'),
        fornecedor_id=data.get('fornecedor_id'),
        contrato_id=data.get('contrato_id'),
        orcamento_id=data.get('orcamento_id')
    )
    db.session.add(novo_ativo)
    db.session.commit()
    return jsonify(novo_ativo.to_dict()), 201
