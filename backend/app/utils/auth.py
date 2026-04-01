from functools import wraps
from flask import request, jsonify
from ..models.usuario import Usuario

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('X-API-Token')
        
        if not token:
            return jsonify({'error': 'Token de acesso obrigatório'}), 401
        
        current_user = Usuario.query.filter_by(api_token=token).first()
        
        if not current_user:
            return jsonify({'error': 'Token inválido'}), 401
            
        return f(current_user, *args, **kwargs)
    
    return decorated
