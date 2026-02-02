from flask import Blueprint, request, jsonify, current_app
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
        
        return jsonify({
            'filename': filename, 
            'path': db_path
        })
        
    return jsonify({'error': 'Falha no upload'}), 400
