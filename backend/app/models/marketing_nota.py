# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime


class MarketingNota(db.Model):
    __tablename__ = 'marketing_notas'

    id             = db.Column(db.Integer, primary_key=True)
    titulo         = db.Column(db.String(300), nullable=False)
    destinatarios  = db.Column(db.Text, nullable=True)
    corpo          = db.Column(db.Text, nullable=True)
    status         = db.Column(db.String(50), default='rascunho')  # rascunho | arquivado
    criado_por     = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_em      = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    anexos = db.relationship('MarketingNotaAnexo', backref='nota', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':            self.id,
            'titulo':        self.titulo,
            'destinatarios': self.destinatarios,
            'corpo':         self.corpo,
            'status':        self.status,
            'criado_por':    self.criado_por,
            'criado_em':     self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None,
            'anexos':        [a.to_dict() for a in self.anexos],
        }


class MarketingNotaAnexo(db.Model):
    __tablename__ = 'marketing_nota_anexos'

    id         = db.Column(db.Integer, primary_key=True)
    nota_id    = db.Column(db.Integer, db.ForeignKey('marketing_notas.id'), nullable=False)
    nome       = db.Column(db.String(300), nullable=False)
    caminho    = db.Column(db.String(500), nullable=False)
    tamanho    = db.Column(db.Integer, nullable=True)
    mime_type  = db.Column(db.String(100), nullable=True)
    criado_em  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':        self.id,
            'nota_id':   self.nota_id,
            'nome':      self.nome,
            'tamanho':   self.tamanho,
            'mime_type': self.mime_type,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
            'url':       f'/api/marketing/notas/anexo/{self.id}/download',
        }
