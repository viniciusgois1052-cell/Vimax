from flask import Blueprint, request, jsonify
from ..models.tipo_servico import TipoServico
from .. import db

tipo_servico_bp = Blueprint('tipo_servico_bp', __name__)

# GET - Listar todos os tipos de serviço
@tipo_servico_bp.route('', methods=['GET'])
def get_tipos_servico():
    ativas_apenas = request.args.get('ativas', 'false').lower() == 'true'
    
    query = TipoServico.query
    if ativas_apenas:
        query = query.filter_by(ativo=True)
    
    tipos = query.order_by(TipoServico.nome).all()
    return jsonify([t.to_dict() for t in tipos])

# GET - Obter tipo de serviço por ID
@tipo_servico_bp.route('/<int:id>', methods=['GET'])
def get_tipo_servico(id):
    tipo = TipoServico.query.get(id)
    if not tipo:
        return jsonify({'erro': 'Tipo de serviço não encontrado'}), 404
    return jsonify(tipo.to_dict())

# POST - Criar novo tipo de serviço
@tipo_servico_bp.route('', methods=['POST'])
def create_tipo_servico():
    data = request.get_json()
    
    if not data.get('nome'):
        return jsonify({'erro': 'Nome é obrigatório'}), 400
    
    # Verificar se já existe
    existente = TipoServico.query.filter_by(nome=data.get('nome')).first()
    if existente:
        return jsonify({'erro': 'Tipo de serviço com este nome já existe'}), 409
    
    novo_tipo = TipoServico(
        nome=data.get('nome'),
        descricao=data.get('descricao'),
        ativo=data.get('ativo', True)
    )
    
    db.session.add(novo_tipo)
    db.session.commit()
    return jsonify(novo_tipo.to_dict()), 201

# PUT - Atualizar tipo de serviço
@tipo_servico_bp.route('/<int:id>', methods=['PUT'])
def update_tipo_servico(id):
    tipo = TipoServico.query.get(id)
    if not tipo:
        return jsonify({'erro': 'Tipo de serviço não encontrado'}), 404
    
    data = request.get_json()
    
    if data.get('nome'):
        # Verificar se outro já tem este nome
        existente = TipoServico.query.filter_by(nome=data.get('nome')).filter(TipoServico.id != id).first()
        if existente:
            return jsonify({'erro': 'Tipo de serviço com este nome já existe'}), 409
        tipo.nome = data.get('nome')
    
    if 'descricao' in data:
        tipo.descricao = data.get('descricao')
    
    if 'ativo' in data:
        tipo.ativo = data.get('ativo')
    
    db.session.commit()
    return jsonify(tipo.to_dict())

# DELETE - Deletar tipo de serviço
@tipo_servico_bp.route('/<int:id>', methods=['DELETE'])
def delete_tipo_servico(id):
    tipo = TipoServico.query.get(id)
    if not tipo:
        return jsonify({'erro': 'Tipo de serviço não encontrado'}), 404
    
    db.session.delete(tipo)
    db.session.commit()
    return jsonify({'mensagem': 'Tipo de serviço deletado com sucesso'})
