from flask import Blueprint, request, jsonify
from ..models.categoria_chamado import CategoriaChamado
from .. import db

categoria_chamado_bp = Blueprint('categoria_chamado_bp', __name__)

# GET - Listar todas as categorias
@categoria_chamado_bp.route('', methods=['GET'])
def get_categorias():
    ativas_apenas = request.args.get('ativas', 'false').lower() == 'true'
    
    query = CategoriaChamado.query
    if ativas_apenas:
        query = query.filter_by(ativo=True)
    
    categorias = query.order_by(CategoriaChamado.nome).all()
    return jsonify([c.to_dict() for c in categorias])

# GET - Obter categoria por ID
@categoria_chamado_bp.route('/<int:id>', methods=['GET'])
def get_categoria(id):
    categoria = CategoriaChamado.query.get(id)
    if not categoria:
        return jsonify({'erro': 'Categoria não encontrada'}), 404
    return jsonify(categoria.to_dict())

# POST - Criar nova categoria
@categoria_chamado_bp.route('', methods=['POST'])
def create_categoria():
    data = request.get_json()
    
    if not data.get('nome'):
        return jsonify({'erro': 'Nome é obrigatório'}), 400
    
    # Verificar se já existe
    existente = CategoriaChamado.query.filter_by(nome=data.get('nome')).first()
    if existente:
        return jsonify({'erro': 'Categoria com este nome já existe'}), 409
    
    nova_categoria = CategoriaChamado(
        nome=data.get('nome'),
        descricao=data.get('descricao'),
        ativo=data.get('ativo', True)
    )
    
    db.session.add(nova_categoria)
    db.session.commit()
    return jsonify(nova_categoria.to_dict()), 201

# PUT - Atualizar categoria
@categoria_chamado_bp.route('/<int:id>', methods=['PUT'])
def update_categoria(id):
    categoria = CategoriaChamado.query.get(id)
    if not categoria:
        return jsonify({'erro': 'Categoria não encontrada'}), 404
    
    data = request.get_json()
    
    if data.get('nome'):
        # Verificar se outro já tem este nome
        existente = CategoriaChamado.query.filter_by(nome=data.get('nome')).filter(CategoriaChamado.id != id).first()
        if existente:
            return jsonify({'erro': 'Categoria com este nome já existe'}), 409
        categoria.nome = data.get('nome')
    
    if 'descricao' in data:
        categoria.descricao = data.get('descricao')
    
    if 'ativo' in data:
        categoria.ativo = data.get('ativo')
    
    db.session.commit()
    return jsonify(categoria.to_dict())

# DELETE - Deletar categoria
@categoria_chamado_bp.route('/<int:id>', methods=['DELETE'])
def delete_categoria(id):
    categoria = CategoriaChamado.query.get(id)
    if not categoria:
        return jsonify({'erro': 'Categoria não encontrada'}), 404
    
    db.session.delete(categoria)
    db.session.commit()
    return jsonify({'mensagem': 'Categoria deletada com sucesso'})
