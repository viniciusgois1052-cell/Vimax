# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime

class Infraestrutura(db.Model):
    __tablename__ = 'infraestrutura'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    descricao = db.Column(db.Text)
    tipo_infraestrutura_id = db.Column(db.Integer, db.ForeignKey('tipos_infraestrutura.id'))
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'))
    localizacao_id = db.Column(db.Integer, db.ForeignKey('localizacoes.id'))
    data_instalacao = db.Column(db.Date)
    data_manutencao = db.Column(db.Date)
    ativo = db.Column(db.Boolean, default=True)
    anexos = db.Column(db.Text)  # JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relacionamentos
    tipo_infra = db.relationship('TipoInfraestrutura', backref='infraestruturas')
    empresa = db.relationship('Empresa', backref='infraestruturas')
    localizacao = db.relationship('Localizacao', backref='infraestruturas')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'tipo_infraestrutura_id': self.tipo_infraestrutura_id,
            'tipo_nome': self.tipo_infra.nome if self.tipo_infra else None,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'localizacao_id': self.localizacao_id,
            'localizacao_nome': self.localizacao.nome if self.localizacao else None,
            'data_instalacao': self.data_instalacao.strftime('%Y-%m-%d') if self.data_instalacao else None,
            'data_manutencao': self.data_manutencao.strftime('%Y-%m-%d') if self.data_manutencao else None,
            'ativo': self.ativo,
            'anexos': json.loads(self.anexos) if self.anexos else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
