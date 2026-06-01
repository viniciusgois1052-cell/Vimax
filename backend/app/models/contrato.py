from .. import db
from datetime import datetime
import json

class Contrato(db.Model):
    __tablename__ = 'contratos'
    id            = db.Column(db.Integer, primary_key=True)
    numero        = db.Column(db.String(50), nullable=False)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)
    localizacao_id= db.Column(db.Integer, db.ForeignKey('localizacoes.id'), nullable=True)
    empresa_id    = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    data_inicio   = db.Column(db.Date, nullable=False)
    data_fim      = db.Column(db.Date, nullable=False)
    valor         = db.Column(db.Float, nullable=False)
    is_mensal     = db.Column(db.Boolean, default=False)
    observacao    = db.Column(db.Text)
    anexos        = db.Column(db.Text)
    dias_aviso_vencimento = db.Column(db.Integer, default=30)

    # ── Modo Vendedor ──────────────────────────────────────────────────────────
    is_prestacao_servico = db.Column(db.Boolean, default=False)
    cliente_id    = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    itens         = db.Column(db.Text)   # JSON: [{descricao, quantidade, valor_unitario}]

    fornecedor  = db.relationship('Fornecedor', backref=db.backref('contratos_list_final', lazy=True))
    localizacao = db.relationship('Localizacao', backref=db.backref('contratos_list_final', lazy=True))
    empresa     = db.relationship('Empresa',     backref=db.backref('contratos_list_final', lazy=True))
    cliente     = db.relationship('Cliente',     backref=db.backref('contratos', lazy=True))

    ativos_vinculados = db.relationship('Ativo', backref='contrato_vinculo_final', lazy=True)

    def to_dict(self):
        return {
            'id':            self.id,
            'numero':        self.numero,
            'fornecedor_id': self.fornecedor_id,
            'fornecedor_nome': self.fornecedor.nome if self.fornecedor else None,
            'localizacao_id': self.localizacao_id,
            'localizacao_nome': self.localizacao.nome if self.localizacao else None,
            'empresa_id':    self.empresa_id,
            'empresa_nome':  self.empresa.nome if self.empresa else None,
            'data_inicio':   self.data_inicio.isoformat() if self.data_inicio else None,
            'data_fim':      self.data_fim.isoformat() if self.data_fim else None,
            'valor':         self.valor,
            'is_mensal':     self.is_mensal,
            'observacao':    self.observacao,
            'anexos':        json.loads(self.anexos) if self.anexos else [],
            'dias_aviso_vencimento': self.dias_aviso_vencimento,
            'ativos':        [a.nome for a in self.ativos_vinculados],
            # Modo Vendedor
            'is_prestacao_servico': self.is_prestacao_servico or False,
            'cliente_id':    self.cliente_id,
            'cliente_nome':  self.cliente.nome if self.cliente else None,
            'itens':         json.loads(self.itens) if self.itens else [],
        }
