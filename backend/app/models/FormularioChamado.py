# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime
import json

class FormularioChamado(db.Model):
    __tablename__ = 'formulario_chamado'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    tipo = db.Column(db.String(50), nullable=False)  # 'maquinario' ou 'infraestrutura'
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    localizacao_id = db.Column(db.Integer, db.ForeignKey('localizacoes.id'), nullable=True)
    opcoes = db.Column(db.LongText)  # JSON com as opções
    ativo = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    empresa = db.relationship('Empresa', backref='formularios_chamado')
    
    def to_dict(self):
        return {
        'localizacao_id': self.localizacao_id,
            'id': self.id,
            'nome': self.nome,
            'tipo': self.tipo,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'opcoes': json.loads(self.opcoes) if self.opcoes else [],
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
