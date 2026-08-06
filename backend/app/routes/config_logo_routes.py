# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify, current_app, send_file
import os
from ..models.usuario import Usuario
from ..utils.logging import create_log

config_logo_bp = Blueprint('config_logo_bp', __name__)

# Mesmo caminho usado por PDFService.LOGO_PATH
LOGO_DIR = "/var/www/cmms_project/backend/app/static"
LOGO_PATH = os.path.join(LOGO_DIR, "logo.png")
EXT_PERMITIDAS = {'png', 'jpg', 'jpeg'}


def _cors():
    from flask import Response
    resp = Response()
    resp.headers['Access-Control-Allow-Origin'] = '*'
    resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
    resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
    return resp, 200


def _user_from_request():
    token = request.headers.get('X-API-Token') or request.args.get('token')
    if not token:
        return None
    return Usuario.query.filter_by(api_token=token).first()


def _ext_ok(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in EXT_PERMITIDAS


@config_logo_bp.route('', methods=['GET', 'OPTIONS'])
def get_logo_status():
    """GET /api/config/logo - Informa se existe logo cadastrada."""
    if request.method == 'OPTIONS':
        return _cors()
    existe = os.path.exists(LOGO_PATH)
    return jsonify({
        'existe': existe,
        'url': '/api/config/logo/imagem' if existe else None
    })


@config_logo_bp.route('/imagem', methods=['GET', 'OPTIONS'])
def get_logo_imagem():
    """
    GET /api/config/logo/imagem - Serve a imagem da logo (para preview).
    Rota liberada no before_request global; validamos o token aqui (header ou ?token=).
    """
    if request.method == 'OPTIONS':
        return _cors()
    if not _user_from_request():
        return jsonify({'error': 'Não autenticado'}), 401
    if not os.path.exists(LOGO_PATH):
        return jsonify({'error': 'Logo não encontrada'}), 404
    return send_file(LOGO_PATH, mimetype='image/png')


@config_logo_bp.route('', methods=['POST', 'OPTIONS'])
def upload_logo():
    """POST /api/config/logo - Faz upload/substitui a logo usada nos PDFs de Compras."""
    if request.method == 'OPTIONS':
        return _cors()

    user = _user_from_request()

    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'Nome de arquivo vazio'}), 400
    if not _ext_ok(file.filename):
        return jsonify({'error': 'Formato inválido. Use PNG, JPG ou JPEG.'}), 400

    try:
        os.makedirs(LOGO_DIR, exist_ok=True)
        # Sempre salva como logo.png (o PDFService aponta para esse arquivo)
        file.save(LOGO_PATH)
        try:
            os.chmod(LOGO_PATH, 0o644)
        except Exception:
            pass

        try:
            create_log(user=user, action='upload_logo', entity='config', entity_id=0,
                       details={'filename': file.filename}, req=request)
        except Exception:
            pass

        return jsonify({'success': True, 'url': '/api/config/logo/imagem'}), 201
    except Exception as e:
        current_app.logger.exception("Erro ao salvar logo")
        return jsonify({'error': str(e)}), 500


@config_logo_bp.route('', methods=['DELETE', 'OPTIONS'])
def delete_logo():
    """DELETE /api/config/logo - Remove a logo (PDFs voltam a sair sem logo)."""
    if request.method == 'OPTIONS':
        return _cors()

    user = _user_from_request()
    try:
        if os.path.exists(LOGO_PATH):
            os.remove(LOGO_PATH)
        try:
            create_log(user=user, action='delete_logo', entity='config', entity_id=0, req=request)
        except Exception:
            pass
        return jsonify({'success': True}), 200
    except Exception as e:
        current_app.logger.exception("Erro ao remover logo")
        return jsonify({'error': str(e)}), 500