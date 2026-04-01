from flask import Blueprint, request, jsonify
from ..models.usuario import Usuario
from ..utils.auth import token_required
from .. import db, bcrypt

usuario_bp = Blueprint('usuario_bp', __name__)

@usuario_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Usuário e senha são obrigatórios'}), 400
        
    user = Usuario.query.filter_by(username=username).first()
    
    if user and bcrypt.check_password_hash(user.password_hash, password):
        if not user.api_token:
            user.generate_api_token()
            db.session.commit()
            
        user_data = user.to_dict()
        user_data['api_token'] = user.api_token
        return jsonify(user_data), 200
        
    return jsonify({'error': 'Usuário ou senha inválidos'}), 401

@usuario_bp.route('', methods=['GET'])
@token_required
def get_usuarios(current_user):
    # Super admin vê todos, outros veem apenas da sua empresa
    if current_user.role == 'super_admin':
        usuarios = Usuario.query.all()
    elif current_user.role in ['admin', 'relatorios']:
        usuarios = Usuario.query.filter_by(empresa_id=current_user.empresa_id).all() if current_user.empresa_id else []
    else:
        usuarios = []
    
    return jsonify([u.to_dict() for u in usuarios])

@usuario_bp.route('', methods=['POST'])
@token_required
def create_usuario(current_user):
    # Só super_admin pode criar usuários
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Sem permissão para criar usuários'}), 403
        
    data = request.get_json()
    
    # Validar se role empresa_restrita tem empresa obrigatória
    if data.get('role') == 'empresa_restrita' and not data.get('empresa_id'):
        return jsonify({'error': 'Perfil "Empresa Restrita" deve ter uma empresa vinculada obrigatoriamente'}), 400
    
    if Usuario.query.filter_by(username=data.get('username')).first():
        return jsonify({'error': 'Nome de usuário já existe'}), 400
        
    hashed_password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')
    
    novo_usuario = Usuario(
        username=data.get('username'),
        email=data.get('email'),
        password_hash=hashed_password,
        empresa_id=data.get('empresa_id') if data.get('empresa_id') != 'none' else None,
        role=data.get('role', 'admin')
    )
    
    novo_usuario.generate_api_token()
    db.session.add(novo_usuario)
    db.session.commit()
    
    return jsonify(novo_usuario.to_dict()), 201

@usuario_bp.route('/<int:id>', methods=['PUT'])
@token_required
def update_usuario(id, current_user):
    # Só super_admin pode atualizar usuários
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Sem permissão para atualizar usuários'}), 403
        
    usuario = Usuario.query.get_or_404(id)
    data = request.get_json()
    
    # Validar se role empresa_restrita tem empresa obrigatória
    if data.get('role') == 'empresa_restrita' and not data.get('empresa_id'):
        return jsonify({'error': 'Perfil "Empresa Restrita" deve ter uma empresa vinculada obrigatoriamente'}), 400
    
    usuario.username = data.get('username', usuario.username)
    usuario.email = data.get('email', usuario.email)
    usuario.role = data.get('role', usuario.role)
    
    empresa_id = data.get('empresa_id')
    usuario.empresa_id = empresa_id if empresa_id != 'none' else None
    
    if data.get('password'):
        usuario.password_hash = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')
        
    db.session.commit()
    return jsonify(usuario.to_dict()), 200

@usuario_bp.route('/<int:id>', methods=['DELETE'])
@token_required
def delete_usuario(id, current_user):
    # Só super_admin pode deletar usuários
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Sem permissão para deletar usuários'}), 403
        
    usuario = Usuario.query.get_or_404(id)
    db.session.delete(usuario)
    db.session.commit()
    return '', 204

@usuario_bp.route('/<int:id>/token', methods=['POST'])
@token_required
def generate_token(id, current_user):
    # Só super_admin pode gerar tokens
    if current_user.role != 'super_admin':
        return jsonify({'error': 'Sem permissão'}), 403
        
    usuario = Usuario.query.get_or_404(id)
    usuario.generate_api_token()
    db.session.commit()
    return jsonify({'api_token': usuario.api_token}), 200
