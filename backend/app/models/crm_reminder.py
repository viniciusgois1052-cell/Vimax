# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime

class CRMReminder(db.Model):
    __tablename__ = 'crm_reminders'
    id             = db.Column(db.Integer, primary_key=True)
    entity_type    = db.Column(db.String(20), nullable=False, default='opportunity')
    entity_id      = db.Column(db.Integer, nullable=False)
    titulo         = db.Column(db.String(200), nullable=False)
    descricao      = db.Column(db.Text, nullable=True)
    data_hora      = db.Column(db.DateTime, nullable=False)
    email_destino  = db.Column(db.String(500), nullable=False)
    smtp_id        = db.Column(db.Integer, db.ForeignKey('marketing_smtp.id'), nullable=True)
    enviado        = db.Column(db.Boolean, default=False)
    enviado_em     = db.Column(db.DateTime, nullable=True)
    empresa_id     = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    criado_por     = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_em      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id,
            'entity_type':   self.entity_type,
            'entity_id':     self.entity_id,
            'titulo':        self.titulo,
            'descricao':     self.descricao,
            'data_hora':     self.data_hora.isoformat() if self.data_hora else None,
            'email_destino': self.email_destino,
            'smtp_id':       self.smtp_id,
            'enviado':       self.enviado,
            'enviado_em':    self.enviado_em.isoformat() if self.enviado_em else None,
            'empresa_id':    self.empresa_id,
            'criado_por':    self.criado_por,
            'criado_em':     self.criado_em.isoformat() if self.criado_em else None,
        }

class CRMReminderConfig(db.Model):
    __tablename__ = 'crm_reminder_config'
    id             = db.Column(db.Integer, primary_key=True)
    ativo          = db.Column(db.Boolean, default=True)
    hora_envio     = db.Column(db.String(5), default='08:00')
    antecedencia   = db.Column(db.Integer, default=1)
    email_destino  = db.Column(db.String(500), nullable=True)
    smtp_id        = db.Column(db.Integer, db.ForeignKey('marketing_smtp.id'), nullable=True)
    atualizado_em  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id,
            'ativo':         self.ativo,
            'hora_envio':    self.hora_envio,
            'antecedencia':  self.antecedencia,
            'email_destino': self.email_destino,
            'smtp_id':       self.smtp_id,
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None,
        }
