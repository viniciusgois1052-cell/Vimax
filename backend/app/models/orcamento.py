from .. import db
from .empresa import Empresa
from .localizacao import Localizacao
from .fornecedor import Fornecedor

class Orcamento(db.Model):
    __tablename__ = 'orcamentos'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(100))
    descricao = db.Column(db.Text)
    valor = db.Column(db.Float)
    valor_material = db.Column(db.Float, default=0)
    valor_mao_de_obra = db.Column(db.Float, default=0)
    status = db.Column(db.String(50), default='Pendente')
    data_inicial = db.Column(db.DateTime)
    data_final = db.Column(db.DateTime)
    data_validade = db.Column(db.DateTime)
    data_criacao = db.Column(db.DateTime, default=db.func.current_timestamp())

    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=True)
    localizacao_id = db.Column(db.Integer, db.ForeignKey('localizacoes.id'), nullable=True)

    empresa = db.relationship('Empresa', backref=db.backref('orcamentos', lazy=True))
    fornecedor = db.relationship('Fornecedor', backref=db.backref('orcamentos', lazy=True))
    localizacao = db.relationship('Localizacao', backref=db.backref('orcamentos', lazy=True))
    anexos = db.relationship('Anexo', backref='orcamento_ref', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'numero': self.numero,  # Frontend espera 'numero'
            'titulo': self.numero,  # Compatibilidade com outras telas
            'descricao': self.descricao,
            'valor': self.valor,  # Frontend espera 'valor'
            'valor_total': self.valor,  # Compatibilidade com outras telas
            'status': self.status,
            'data_emissao': self.data_inicial.isoformat() if self.data_inicial else None,  # Frontend espera 'data_emissao'
            'data_inicial': self.data_inicial.isoformat() if self.data_inicial else None,
            'data_final': self.data_final.isoformat() if self.data_final else None,
            'data_validade': self.data_validade.isoformat() if self.data_validade else None,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'fornecedor_id': self.fornecedor_id,
            'fornecedor_nome': self.fornecedor.nome if self.fornecedor else None,
            'localizacao_id': self.localizacao_id,
            'localizacao_nome': self.localizacao.nome if self.localizacao else None,
            'valor_material': self.valor_material or 0,
            'valor_mao_de_obra': self.valor_mao_de_obra or 0,
            'anexos': [anexo.to_dict() for anexo in self.anexos]
        }

class Anexo(db.Model):
    __tablename__ = 'anexos'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    caminho = db.Column(db.String(255), nullable=False)
    orcamento_id = db.Column(db.Integer, db.ForeignKey('orcamentos.id', ondelete='CASCADE'), nullable=False)
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'name': self.nome,  # Frontend espera 'name'
            'filename': self.nome,  # Compatibilidade
            'caminho': self.caminho,
            'path': self.caminho,  # Frontend espera 'path'
            'url': self.caminho  # Compatibilidade
        }
