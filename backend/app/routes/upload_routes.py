from flask import Blueprint, request, jsonify, current_app
from ..utils.logging import create_log
from ..utils.auth import get_current_user_from_request
import os
from werkzeug.utils import secure_filename
from datetime import datetime

upload_bp = Blueprint('upload_bp', __name__)

@upload_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    if file and file.filename != '':
        filename = secure_filename(file.filename)
        
        # Pega o nome da empresa do formulário (enviado pelo frontend)
        empresa_nome = request.form.get('empresa_nome', 'Geral')
        empresa_folder = secure_filename(empresa_nome)
        
        # Pega a data e hora atual para a pasta
        now = datetime.now()
        date_hour_folder = now.strftime("%Y-%m-%d_%H-%M-%S")
        
        # CAMINHO ORGANIZADO: static/uploads/empresas/NOME_EMPRESA/DATA_HORA/
        relative_dir = os.path.join('static', 'uploads', 'empresas', empresa_folder, date_hour_folder)
        target_dir = os.path.join("/var/www/cmms_project/backend/app", relative_dir)
        
        if not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)
            
        file_path = os.path.join(target_dir, filename)
        file.save(file_path)
        os.chmod(file_path, 0o644)
        
        # Retorna o caminho relativo completo para salvar no banco de dados
        db_path = f"/{relative_dir}/{filename}".replace('\\', '/')
        

        try:
            user = get_current_user_from_request(request)
            size = None
            try:
                size = request.content_length
            except Exception:
                size = None

            create_log(
                user=user,
                action='upload_file',
                entity='upload',
                entity_id=None,
                details={
                    'empresa_nome': empresa_nome,
                    'filename': filename,
                    'path': db_path,
                    'size': size
                },
                req=request
            )
        except Exception:
            pass

        return jsonify({
            'filename': filename, 
            'path': db_path
        })
        
    return jsonify({'error': 'Falha no upload'}), 400


@upload_bp.route('/upload/marketing-imagem', methods=['POST'])
def upload_marketing_imagem():
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify({'error': 'Arquivo inválido'}), 400

    import requests as req_lib
    from flask import current_app

    WP_URL = os.environ.get('WP_URL', '').rstrip('/')
    WP_USER = os.environ.get('WP_USER', '')
    WP_PASSWORD = os.environ.get('WP_APP_PASSWORD', '')

    if not WP_URL or not WP_USER or not WP_PASSWORD:
        return jsonify({'error': 'Credenciais WordPress não configuradas'}), 500

    filename = secure_filename(file.filename)
    file_bytes = file.read()
    content_type = file.content_type or 'image/jpeg'

    resp = req_lib.post(
        f"{WP_URL}/wp-json/wp/v2/media",
        auth=(WP_USER, WP_PASSWORD),
        headers={
            'Content-Type': content_type,
            'Content-Disposition': f'attachment; filename="{filename}"',
        },
        data=file_bytes
    )

    if not resp.ok:
        return jsonify({'error': resp.text}), resp.status_code

    wp_json = resp.json()
    return jsonify({'url': wp_json.get('source_url', '')})
