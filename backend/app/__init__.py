from flask import Flask, send_from_directory, abort, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_mail import Mail
import os

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

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Importar Blueprints
    from .routes.upload_routes import upload_bp
    from .routes.empresa_routes import empresa_bp
    from .routes.fornecedor_routes import fornecedor_bp
    from .routes.localizacao_routes import localizacao_bp
    from .routes.contrato_routes import contrato_bp
    from .routes.orcamento_routes import orcamento_bp
    from .routes.usuario_routes import usuario_bp
    from .routes.ativo_routes import ativo_bp
    from .routes.chamado_routes import chamado_bp
    from .routes.relatorio_routes import relatorio_bp
    from .routes.categoria_chamado_routes import categoria_chamado_bp
    from .routes.tipo_servico_routes import tipo_servico_bp
    from .routes.public_routes import public_bp

    # Registrar Blueprints
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(empresa_bp, url_prefix='/api/empresas')
    app.register_blueprint(fornecedor_bp, url_prefix='/api/fornecedores')
    app.register_blueprint(localizacao_bp, url_prefix='/api/localizacoes')
    app.register_blueprint(contrato_bp, url_prefix='/api/contratos')
    app.register_blueprint(orcamento_bp, url_prefix='/api/orcamentos')
    app.register_blueprint(usuario_bp, url_prefix='/api/usuarios')
    app.register_blueprint(ativo_bp, url_prefix='/api/ativos')
    app.register_blueprint(chamado_bp, url_prefix='/api/chamados')
    app.register_blueprint(relatorio_bp, url_prefix='/api/relatorios')
    app.register_blueprint(categoria_chamado_bp, url_prefix='/api/categorias-chamado')
    app.register_blueprint(tipo_servico_bp, url_prefix='/api/tipos-servico')
     app.register_blueprint(public_bp, url_prefix='/api/public')

    with app.app_context():
        db.create_all()

    return app