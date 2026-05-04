from flask import request
from ..models.usuario import Usuario

def get_current_user_from_request(req=None):
    req = req or request
    api_token = req.headers.get('X-API-Token')
    if api_token:
        return Usuario.query.filter_by(api_token=api_token).first()
    return None
