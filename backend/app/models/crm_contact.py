from .. import db
from datetime import datetime

class CRMContact(db.Model):
    __tablename__ = 'crm_contacts'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=True)
    empresa = db.Column(db.String(200), nullable=True)
    telefone = db.Column(db.String(50), nullable=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    cargo = db.Column(db.String(200), nullable=True)
    fonte = db.Column(db.String(100), nullable=True)
    responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    estagio = db.Column(db.String(100), nullable=True)
    notas = db.Column(db.Text, nullable=True)
    linkedin = db.Column(db.String(300), nullable=True)
    github = db.Column(db.String(300), nullable=True)
    twitter = db.Column(db.String(300), nullable=True)
    website = db.Column(db.String(300), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    cidade = db.Column(db.String(100), nullable=True)
    estado = db.Column(db.String(2), nullable=True)
    tags = db.Column(db.String(500), nullable=True)
    valor_potencial = db.Column(db.Numeric(15, 2), nullable=True)
    ativo = db.Column(db.Integer, default=1)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, onupdate=datetime.utcnow)
    campos_extras = db.Column(db.Text, nullable=True)
