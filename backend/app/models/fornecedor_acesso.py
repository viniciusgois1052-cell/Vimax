# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime, timedelta
import secrets

class FornecedorAcesso(db.Model):
    """
    Controla o acesso do fornecedor ao portal.
    Uma linha por fornecedor — senha renovada a cada nova cotação enviada.
    """
    __tablename__ = 'fornecedor_acessos'

    id            = db.Column(db.Integer, primary_key=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), unique=True, nullable=False)
    email         = db.Column(db.String(200), nullable=False)
    senha_hash    = db.Column(db.String(200), nullable=False)
    senha_expira  = db.Column(db.DateTime, nullable=False)   # now + 72h
    primeiro_acesso = db.Column(db.Boolean, default=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fornecedor = db.relationship('Fornecedor', backref=db.backref('acesso_portal', uselist=False))

    def set_senha(self, senha_plain):
        from werkzeug.security import generate_password_hash
        self.senha_hash   = generate_password_hash(senha_plain)
        self.senha_expira = datetime.utcnow() + timedelta(hours=72)
        self.primeiro_acesso = True

    def check_senha(self, senha_plain):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.senha_hash, senha_plain)

    def expirada(self):
        return datetime.utcnow() > self.senha_expira

    def to_dict(self):
        return {
            'id': self.id,
            'fornecedor_id': self.fornecedor_id,
            'email': self.email,
            'senha_expira': self.senha_expira.isoformat(),
            'primeiro_acesso': self.primeiro_acesso,
            'expirada': self.expirada(),
        }