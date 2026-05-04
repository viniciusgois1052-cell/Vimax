# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime
import json

class MarketingCampanha(db.Model):
    __tablename__ = 'marketing_campanhas'

    id               = db.Column(db.Integer, primary_key=True)
    nome             = db.Column(db.String(200), nullable=False)
    assunto          = db.Column(db.String(300), nullable=False)
    corpo_html       = db.Column(db.Text, nullable=False)
    smtp_id          = db.Column(db.Integer, db.ForeignKey('marketing_smtp.id'), nullable=False)
    grupos_ids       = db.Column(db.Text, default='[]')       # JSON list de ids
    contatos_ids     = db.Column(db.Text, default='[]')       # JSON list de ids
    contatos_extras  = db.Column(db.Text, default='[]')       # JSON list de {nome, email}
    status           = db.Column(db.String(20), default='rascunho')  # rascunho, agendada, enviando, enviada, erro
    data_agendamento = db.Column(db.DateTime, nullable=True)
    total_enviados   = db.Column(db.Integer, default=0)
    total_erros      = db.Column(db.Integer, default=0)
    log_erros        = db.Column(db.Text, default='')
    criado_em        = db.Column(db.DateTime, default=datetime.utcnow)
    enviado_em       = db.Column(db.DateTime, nullable=True)

    smtp             = db.relationship('MarketingSmtp', backref='campanhas')

    def to_dict(self):
        return {
            'id':               self.id,
            'nome':             self.nome,
            'assunto':          self.assunto,
            'corpo_html':       self.corpo_html,
            'smtp_id':          self.smtp_id,
            'smtp_nome':        self.smtp.nome if self.smtp else None,
            'grupos_ids':       json.loads(self.grupos_ids or '[]'),
            'contatos_ids':     json.loads(self.contatos_ids or '[]'),
            'contatos_extras':  json.loads(self.contatos_extras or '[]'),
            'status':           self.status,
            'data_agendamento': self.data_agendamento.isoformat() if self.data_agendamento else None,
            'total_enviados':   self.total_enviados,
            'total_erros':      self.total_erros,
            'log_erros':        self.log_erros,
            'criado_em':        self.criado_em.isoformat() if self.criado_em else None,
            'enviado_em':       self.enviado_em.isoformat() if self.enviado_em else None,
        }
