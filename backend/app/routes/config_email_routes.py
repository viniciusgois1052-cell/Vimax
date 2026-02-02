from flask import Blueprint, request, jsonify
from ..models.config_email import ConfigEmail
from .. import db

config_email_bp = Blueprint('config_email_bp', __name__)

@config_email_bp.route('', methods=['GET'])
def get_config_email():
    config = ConfigEmail.query.first()
    if config:
        return jsonify(config.to_dict())
    return jsonify({}), 200

@config_email_bp.route('', methods=['POST'])
def save_config_email():
    data = request.get_json()
    config = ConfigEmail.query.first()
    if not config:
        config = ConfigEmail()
        db.session.add(config)
    
    config.servidor = data.get('servidor')
    config.porta = data.get('porta')
    config.usuario = data.get('usuario')
    config.senha = data.get('senha')
    
    db.session.commit()
    return jsonify(config.to_dict())
