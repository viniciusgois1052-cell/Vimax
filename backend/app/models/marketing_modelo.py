# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime

class MarketingModelo(db.Model):
    __tablename__ = 'marketing_modelos'

    id          = db.Column(db.Integer, primary_key=True)
    nome        = db.Column(db.String(200), nullable=False)
    assunto     = db.Column(db.String(300), nullable=False)
    corpo_html  = db.Column(db.Text, nullable=False)
    criado_em   = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    notas         = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id':           self.id,
            'nome':         self.nome,
            'assunto':      self.assunto,
            'corpo_html':   self.corpo_html,
            'criado_em':    self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em':self.atualizado_em.isoformat() if self.atualizado_em else None,
            'notas':         self.notas,
        }
