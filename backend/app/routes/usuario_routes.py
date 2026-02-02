from flask import Blueprint, request, jsonify
from ..models.usuario import Usuario
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
def get_usuarios():
    usuarios = Usuario.query.all()
    return jsonify([u.to_dict() for u in usuarios])

@usuario_bp.route('', methods=['POST'])
def create_usuario():
    data = request.get_json()
    
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
def update_usuario(id):
    usuario = Usuario.query.get_or_404(id)
    data = request.get_json()
    
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
def delete_usuario(id):
    usuario = Usuario.query.get_or_404(id)
    db.session.delete(usuario)
    db.session.commit()
    return '', 204

@usuario_bp.route('/<int:id>/token', methods=['POST'])
def generate_token(id):
    usuario = Usuario.query.get_or_404(id)
    token = usuario.generate_api_token()
    db.session.commit()
    return jsonify({'token': token})
