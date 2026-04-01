# -*- coding: utf-8 -*-
from flask import Flask, send_from_directory, abort, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_mail import Mail
import os
import traceback

db = SQLAlchemy()
bcrypt = Bcrypt()
mail = Mail()

def create_app(config_class=None):
    app = Flask(__name__)
    app.url_map.strict_slashes = False

    from .config.config import Config
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    mail.init_app(app)

    # ============================================
    # 🚀 CORS - CONFIGURAÇÃO ABSOLUTA
    # ============================================
    CORS(app, 
         origins="*",
         allow_headers=["Content-Type", "Authorization", "X-API-Token"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         supports_credentials=True,
         max_age=3600)

    @app.after_request
    def after_request(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response

    # ============================================
    # 🚀 SERVIR ARQUIVOS UPLOADS
    # ============================================
    BASE_DIR = "/var/www/cmms_project/backend/app"

    @app.route('/static/uploads/<path:filename>')
    def uploaded_files(filename):
        uploads_dir = os.path.join(BASE_DIR, 'static', 'uploads')
        return send_from_directory(uploads_dir, filename)

    # ============================================
    # 🚀 TRATAMENTO DE ERRO GLOBAL
    # ============================================
    @app.errorhandler(Exception)
    def handle_error(error):
        print(f"❌ ERRO: {error}")
        traceback.print_exc()
        
        response = jsonify({
            'success': False,
            'error': str(error),
            'type': type(error).__name__
        })
        response.status_code = 500
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        
        return response

    @app.errorhandler(404)
    def not_found(error):
        response = jsonify({
            'success': False,
            'error': 'Rota não encontrada',
            'path': request.path
        })
        response.status_code = 404
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    # ============================================
    # 🚀 REGISTRAR BLUEPRINTS - UM POR VEZ COM TRY/EXCEPT
    # ============================================
    
    # Upload routes
    try:
        from .routes.upload_routes import upload_bp
        app.register_blueprint(upload_bp, url_prefix='/api')
        print("✓ upload_bp registrado")
    except Exception as e:
        print(f"❌ Erro no upload_bp: {e}")

    # Empresa routes - TESTE AMBOS OS FORMATOS
    try:
        # Primeiro tenta empresa_routes.py
        from .routes.empresa_routes import empresa_bp
        app.register_blueprint(empresa_bp, url_prefix='/api/empresas')
        print("✓ empresa_bp registrado (empresa_routes.py)")
    except ImportError:
        try:
            # Depois tenta empresa.routes.py
            import importlib.util
            spec = importlib.util.spec_from_file_location(
                "empresa_routes", 
                "/var/www/cmms_project/backend/app/routes/empresa.routes.py"
            )
            empresa_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(empresa_module)
            empresa_bp = empresa_module.empresa_bp
            app.register_blueprint(empresa_bp, url_prefix='/api/empresas')
            print("✓ empresa_bp registrado (empresa.routes.py)")
        except Exception as e:
            print(f"❌ Erro no empresa_bp: {e}")

    # Usuario routes
    try:
        from .routes.usuario_routes import usuario_bp
        app.register_blueprint(usuario_bp, url_prefix='/api/usuarios')
        print("✓ usuario_bp registrado")
    except Exception as e:
        print(f"❌ Erro no usuario_bp: {e}")

    # Chamado routes
    try:
        from .routes.chamado_routes import chamado_bp
        app.register_blueprint(chamado_bp, url_prefix='/api/chamados')
        print("✓ chamado_bp registrado")
    except Exception as e:
        print(f"❌ Erro no chamado_bp: {e}")

    # Fornecedor routes
    try:
        from .routes.fornecedor_routes import fornecedor_bp
        app.register_blueprint(fornecedor_bp, url_prefix='/api/fornecedores')
        print("✓ fornecedor_bp registrado")
    except Exception as e:
        print(f"❌ Erro no fornecedor_bp: {e}")

    # Localizacao routes
    try:
        from .routes.localizacao_routes import localizacao_bp
        app.register_blueprint(localizacao_bp, url_prefix='/api/localizacoes')
        print("✓ localizacao_bp registrado")
    except Exception as e:
        print(f"❌ Erro no localizacao_bp: {e}")

    # Contrato routes
    try:
        from .routes.contrato_routes import contrato_bp
        app.register_blueprint(contrato_bp, url_prefix='/api/contratos')
        print("✓ contrato_bp registrado")
    except Exception as e:
        print(f"❌ Erro no contrato_bp: {e}")

    # Orcamento routes
    try:
        from .routes.orcamento_routes import orcamento_bp
        app.register_blueprint(orcamento_bp, url_prefix='/api/orcamentos')
        print("✓ orcamento_bp registrado")
    except Exception as e:
        print(f"❌ Erro no orcamento_bp: {e}")

    # Ativo routes
    try:
        from .routes.ativo_routes import ativo_bp
        app.register_blueprint(ativo_bp, url_prefix='/api/ativos')
        print("✓ ativo_bp registrado")
    except Exception as e:
        print(f"❌ Erro no ativo_bp: {e}")

    # Relatorio routes
    try:
        from .routes.relatorio_routes import relatorio_bp
        app.register_blueprint(relatorio_bp, url_prefix='/api/relatorios')
        print("✓ relatorio_bp registrado")
    except Exception as e:
        print(f"❌ Erro no relatorio_bp: {e}")

    # Categoria chamado routes
    try:
        from .routes.categoria_chamado_routes import categoria_chamado_bp
        app.register_blueprint(categoria_chamado_bp, url_prefix='/api/categorias-chamado')
        print("✓ categoria_chamado_bp registrado")
    except Exception as e:
        print(f"❌ Erro no categoria_chamado_bp: {e}")

    # Tipo servico routes
    try:
        from .routes.tipo_servico_routes import tipo_servico_bp
        app.register_blueprint(tipo_servico_bp, url_prefix='/api/tipos-servico')
        print("✓ tipo_servico_bp registrado")
    except Exception as e:
        print(f"❌ Erro no tipo_servico_bp: {e}")

    # Public routes
    try:
        from .routes.public_routes import public_bp
        app.register_blueprint(public_bp, url_prefix='/api/public')
        print("✓ public_bp registrado")
    except Exception as e:
        print(f"❌ Erro no public_bp: {e}")

    # Config email routes
    try:
        from .routes.config_email_routes import config_email_bp
        app.register_blueprint(config_email_bp, url_prefix='/api/config/email')
        print("✓ config_email_bp registrado")
    except Exception as e:
        print(f"❌ Erro no config_email_bp: {e}")

    # Rotas extras (que podem não existir)
    try:
        from .routes.tipo_infraestrutura_routes import tipo_infraestrutura_bp
        app.register_blueprint(tipo_infraestrutura_bp, url_prefix='/api/tipos-infraestrutura')
        print("✓ tipo_infraestrutura_bp registrado")
    except ImportError:
        print("⚠️ tipo_infraestrutura_routes não encontrado - pulando")

    try:
        from .routes.infraestrutura_routes import infraestrutura_bp
        app.register_blueprint(infraestrutura_bp, url_prefix='/api/infraestruturas')
        print("✓ infraestrutura_bp registrado")
    except ImportError:
        print("⚠️ infraestrutura_routes não encontrado - pulando")

    try:
        from .routes.formulario_chamado_routes import formulario_chamado_bp
        app.register_blueprint(formulario_chamado_bp, url_prefix='/api/formularios-chamado')
        print("✓ formulario_chamado_bp registrado")
    except ImportError:
        print("⚠️ formulario_chamado_routes não encontrado - pulando")

    # ============================================
    # 🚀 CRIAR TABELAS
    # ============================================
    try:
        with app.app_context():
            db.create_all()
            print("✓ Tabelas do banco de dados criadas/verificadas")
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        traceback.print_exc()

    # Rota de teste
    @app.route('/api/health')
    def health():
        return jsonify({
            'status': 'ok',
            'message': 'Backend Vimax funcionando!',
            'registered_blueprints': [rule.rule for rule in app.url_map.iter_rules()]
        })

    return app
