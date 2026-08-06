# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime
import secrets

class Cotacao(db.Model):
    __tablename__ = 'cotacoes'
    id              = db.Column(db.Integer, primary_key=True)
    numero_cotacao  = db.Column(db.String(20), unique=True, nullable=False)
    pedido_id       = db.Column(db.Integer, db.ForeignKey('pedidos_compra.id'), nullable=False)
    empresa_id      = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    data_limite     = db.Column(db.DateTime, nullable=True)
    observacoes     = db.Column(db.Text, nullable=True)
    status          = db.Column(db.String(20), default='ABERTA')
    ativo           = db.Column(db.Boolean, default=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    token_acesso    = db.Column(db.String(64), unique=True, nullable=True)

    pedido   = db.relationship('PedidoCompra', backref='cotacoes', lazy='joined')
    empresa  = db.relationship('Empresa', backref='cotacoes')
    propostas= db.relationship('PropostaFornecedor', backref='cotacao', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'numero_cotacao': self.numero_cotacao,
            'pedido_id': self.pedido_id,
            'pedido': {'id': self.pedido.id, 'numero_pc': self.pedido.numero_pc} if self.pedido else None,
            'empresa_id': self.empresa_id,
            'data_limite': self.data_limite.isoformat() if self.data_limite else None,
            'observacoes': self.observacoes,
            'status': self.status,
            'total_propostas': self.propostas.count(),
            'propostas_respondidas': self.propostas.filter_by(status='RESPONDIDA').count(),
            'propostas': [p.to_dict() for p in self.propostas],
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PropostaFornecedor(db.Model):
    __tablename__ = 'propostas_fornecedor'
    id                  = db.Column(db.Integer, primary_key=True)
    cotacao_id          = db.Column(db.Integer, db.ForeignKey('cotacoes.id'), nullable=False)
    fornecedor_id       = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    token_acesso        = db.Column(db.String(64), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(32))
    email_fornecedor    = db.Column(db.String(200), nullable=False)
    senha_hash          = db.Column(db.String(200), nullable=True)
    status              = db.Column(db.String(20), default='PENDENTE')
    valor_frete         = db.Column(db.Float, default=0)
    prazo_entrega       = db.Column(db.Integer, nullable=True)
    condicao_pagamento  = db.Column(db.String(100), nullable=True)
    observacoes         = db.Column(db.Text, nullable=True)
    anexos              = db.Column(db.JSON, default=list)
    valor_total         = db.Column(db.Float, default=0)
    data_resposta       = db.Column(db.DateTime, nullable=True)
    primeiro_acesso     = db.Column(db.Boolean, default=True)
    ativo               = db.Column(db.Boolean, default=True)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)

    fornecedor  = db.relationship('Fornecedor', backref='propostas')
    itens       = db.relationship('ItemProposta', backref='proposta', cascade='all, delete-orphan')

    def set_senha(self, senha):
        from werkzeug.security import generate_password_hash
        self.senha_hash = generate_password_hash(senha)

    def check_senha(self, senha):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.senha_hash, senha)

    def to_dict(self):
        return {
            'id': self.id,
            'cotacao_id': self.cotacao_id,
            'fornecedor_id': self.fornecedor_id,
            'fornecedor': self.fornecedor.to_dict() if self.fornecedor else None,
            'email_fornecedor': self.email_fornecedor,
            'status': self.status,
            'valor_frete': self.valor_frete or 0,
            'prazo_entrega': self.prazo_entrega,
            'condicao_pagamento': self.condicao_pagamento,
            'observacoes': self.observacoes,
            'anexos': self.anexos or [],
            'valor_total': self.valor_total or 0,
            'itens': [i.to_dict() for i in self.itens],
            'data_resposta': self.data_resposta.isoformat() if self.data_resposta else None,
            'primeiro_acesso': self.primeiro_acesso,
            'token_acesso': self.token_acesso,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class ItemProposta(db.Model):
    __tablename__ = 'itens_proposta'
    id              = db.Column(db.Integer, primary_key=True)
    proposta_id     = db.Column(db.Integer, db.ForeignKey('propostas_fornecedor.id'), nullable=False)
    item_pedido_id  = db.Column(db.Integer, nullable=True)
    codigo_item     = db.Column(db.String(50), nullable=True)
    nome_item       = db.Column(db.String(200), nullable=False)
    quantidade      = db.Column(db.Float, default=1)
    unidade_medida  = db.Column(db.String(20), default='UN')
    valor_unitario  = db.Column(db.Float, default=0)
    valor_total     = db.Column(db.Float, default=0)
    marca           = db.Column(db.String(100), nullable=True)
    observacao      = db.Column(db.Text, nullable=True)
    foto_url        = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'proposta_id': self.proposta_id,
            'item_pedido_id': self.item_pedido_id,
            'codigo_item': self.codigo_item,
            'nome_item': self.nome_item,
            'quantidade': self.quantidade,
            'unidade_medida': self.unidade_medida,
            'valor_unitario': self.valor_unitario or 0,
            'valor_total': self.valor_total or 0,
            'marca': self.marca,
            'observacao': self.observacao,
            'foto_url': self.foto_url,
        }
