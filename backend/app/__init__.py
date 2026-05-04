# -*- coding: utf-8 -*-
from flask import Flask, send_from_directory, jsonify, request
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

    CORS(app,
         origins="*",
         allow_headers=["Content-Type", "Authorization", "X-API-Token"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         supports_credentials=True,
         max_age=3600)

    @app.after_request
    def after_request(response):
        response.headers['Access-Control-Allow-Origin']  = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        response.headers['Access-Control-Max-Age']       = '3600'
        return response

    BASE_DIR = "/var/www/cmms_project/backend/app"

    @app.route('/static/uploads/<path:filename>')
    def uploaded_files(filename):
        uploads_dir = os.path.join(BASE_DIR, 'static', 'uploads')
        return send_from_directory(uploads_dir, filename)

    @app.errorhandler(Exception)
    def handle_error(error):
        print("ERRO: {}".format(error))
        traceback.print_exc()
        response = jsonify({'success': False, 'error': str(error), 'type': type(error).__name__})
        response.status_code = 500
        response.headers['Access-Control-Allow-Origin']  = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        return response

    @app.errorhandler(404)
    def not_found(error):
        response = jsonify({'success': False, 'error': 'Rota nao encontrada', 'path': request.path})
        response.status_code = 404
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    try:
        from .routes.upload_routes                  import upload_bp
        from .routes.empresa_routes                 import empresa_bp
        from .routes.fornecedor_routes              import fornecedor_bp
        from .routes.localizacao_routes             import localizacao_bp
        from .routes.contrato_routes                import contrato_bp
        from .routes.orcamento_routes               import orcamento_bp
        from .routes.usuario_routes                 import usuario_bp
        from .routes.ativo_routes                   import ativo_bp
        from .routes.chamado_routes                 import chamado_bp
        from .routes.relatorio_routes               import relatorio_bp
        from .routes.categoria_chamado_routes       import categoria_chamado_bp
        from .routes.tipo_servico_routes            import tipo_servico_bp
        from .routes.tipo_infraestrutura_routes     import tipo_infraestrutura_bp
        from .routes.infraestrutura_routes          import infraestrutura_bp
        from .routes.formulario_chamado_routes      import formulario_chamado_bp
        from .routes.public_routes                  import public_bp
        from .routes.config_email_routes            import config_email_bp
        from .routes.lembrete_routes                import lembrete_bp
        from .routes.recorrencia_routes             import recorrencia_bp
        from .routes.marketing_contato_routes       import marketing_contato_bp
        from .routes.marketing_grupo_routes         import marketing_grupo_bp
        from .routes.marketing_smtp_routes          import marketing_smtp_bp
        from .routes.marketing_modelo_routes        import marketing_modelo_bp
        from .routes.marketing_campanha_routes      import marketing_campanha_bp
        from .routes.marketing_nota_routes          import marketing_nota_bp
        from .routes.mobilemed_routes               import mobilemed_bp
        from .routes.log_routes                     import log_bp
        from .routes.contador_impressora_routes     import contador_impressora_bp  # ← NOVO

        app.register_blueprint(upload_bp,                url_prefix='/api')
        app.register_blueprint(empresa_bp,               url_prefix='/api/empresas')
        app.register_blueprint(fornecedor_bp,            url_prefix='/api/fornecedores')
        app.register_blueprint(localizacao_bp,           url_prefix='/api/localizacoes')
        app.register_blueprint(contrato_bp,              url_prefix='/api/contratos')
        app.register_blueprint(orcamento_bp,             url_prefix='/api/orcamentos')
        app.register_blueprint(usuario_bp,               url_prefix='/api/usuarios')
        app.register_blueprint(ativo_bp,                 url_prefix='/api/ativos')
        app.register_blueprint(chamado_bp,               url_prefix='/api/chamados')
        app.register_blueprint(relatorio_bp,             url_prefix='/api/relatorios')
        app.register_blueprint(categoria_chamado_bp,     url_prefix='/api/categorias-chamado')
        app.register_blueprint(tipo_servico_bp,          url_prefix='/api/tipos-servico')
        app.register_blueprint(tipo_infraestrutura_bp,   url_prefix='/api/tipos-infraestrutura')
        app.register_blueprint(infraestrutura_bp,        url_prefix='/api/infraestruturas')
        app.register_blueprint(formulario_chamado_bp,    url_prefix='/api/formularios-chamado')
        app.register_blueprint(public_bp,                url_prefix='/api/public')
        app.register_blueprint(config_email_bp,          url_prefix='/api/config/email')
        app.register_blueprint(lembrete_bp,              url_prefix='/api/lembretes')
        app.register_blueprint(recorrencia_bp,           url_prefix='/api/recorrencias')
        app.register_blueprint(marketing_contato_bp,     url_prefix='/api/marketing/contatos')
        app.register_blueprint(marketing_grupo_bp,       url_prefix='/api/marketing/grupos')
        app.register_blueprint(marketing_smtp_bp,        url_prefix='/api/marketing/smtp')
        app.register_blueprint(marketing_modelo_bp,      url_prefix='/api/marketing/modelos')
        app.register_blueprint(marketing_nota_bp,        url_prefix='/api/marketing/notas')
        app.register_blueprint(marketing_campanha_bp,    url_prefix='/api/marketing/campanhas')
        app.register_blueprint(mobilemed_bp,             url_prefix='/api/mobilemed')
        app.register_blueprint(log_bp,                   url_prefix='/api/logs')
        app.register_blueprint(contador_impressora_bp,   url_prefix='/api/contadores-impressora')  # ← NOVO

        print("Todos os blueprints registrados com sucesso")
    except Exception as e:
        print("Erro ao registrar blueprints: {}".format(e))
        traceback.print_exc()

    try:
        with app.app_context():
            db.create_all()
            print("Tabelas do banco de dados criadas/verificadas")
    except Exception as e:
        print("Erro ao criar tabelas: {}".format(e))
        traceback.print_exc()

    return app
