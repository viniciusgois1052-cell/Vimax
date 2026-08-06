# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime


class MarketingSmtp(db.Model):
    __tablename__ = 'marketing_smtp'

    id              = db.Column(db.Integer, primary_key=True)
    nome            = db.Column(db.String(100), nullable=False)
    host            = db.Column(db.String(200), nullable=False)
    port            = db.Column(db.Integer, default=587)
    username        = db.Column(db.String(200), nullable=False)
    password        = db.Column(db.String(200), nullable=False)
    email_remetente = db.Column(db.String(200), nullable=False)
    nome_remetente  = db.Column(db.String(200), nullable=False)
    use_tls         = db.Column(db.Boolean, default=True)
    use_ssl         = db.Column(db.Boolean, default=False)
    ativo           = db.Column(db.Boolean, default=True)
    criado_por      = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_em       = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em   = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id':               self.id,
            'nome':             self.nome,
            'host':             self.host,
            'port':             self.port,
            'username':         self.username,
            'password':         self.password,
            'email_remetente':  self.email_remetente,
            'nome_remetente':   self.nome_remetente,
            'use_tls':          self.use_tls,
            'use_ssl':          self.use_ssl,
            'ativo':            self.ativo,
            'criado_por':       self.criado_por,
            'criado_em':        self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em':    self.atualizado_em.isoformat() if self.atualizado_em else None,
        }
