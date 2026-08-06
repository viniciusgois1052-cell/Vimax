# backend/app/models/fornecedor.py
from .. import db
from datetime import datetime

class Fornecedor(db.Model):
    __tablename__ = 'fornecedores'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cnpj = db.Column(db.String(20), nullable=True)
    servico = db.Column(db.String(100), nullable=True)
    tipo_servico_id = db.Column(db.Integer, db.ForeignKey('tipos_servico.id'), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    telefone = db.Column(db.String(20), nullable=True)
    endereco = db.Column(db.Text, nullable=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    tipos_pagamento = db.Column(db.Text, nullable=True)
    tipo_entidade = db.Column(db.String(20), default='fornecedor')
    # 🆕 Marca a origem do cadastro: 'compras' quando cadastrado pela tela de Compras.
    # Fornecedores antigos ficam NULL (sem quebrar nada).
    origem = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Rastreamento
    criado_por_usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_por_nome = db.Column(db.String(100), nullable=True)
    
    empresa = db.relationship('Empresa', backref=db.backref('fornecedores', lazy=True))
    tipo_servico = db.relationship('TipoServico', backref=db.backref('fornecedores', lazy=True))
    criador = db.relationship('Usuario', foreign_keys=[criado_por_usuario_id], backref='fornecedores_criados')
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'cnpj': self.cnpj,
            'servico': self.servico,
            'tipo_servico_id': self.tipo_servico_id,
            'tipo_servico_nome': self.tipo_servico.nome if self.tipo_servico else None,
            'email': self.email,
            'telefone': self.telefone,
            'endereco': self.endereco,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'tipos_pagamento': self.tipos_pagamento,
            'tipo_entidade': self.tipo_entidade or 'fornecedor',
            'origem': self.origem,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'criado_por_usuario_id': self.criado_por_usuario_id,
            'criado_por_nome': self.criado_por_nome,
        }