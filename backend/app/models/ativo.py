from .. import db
from datetime import datetime

class Ativo(db.Model):
    __tablename__ = 'ativos'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    numero_serie = db.Column(db.String(100))
    voltagem_entrada = db.Column(db.String(50))
    data_aquisicao = db.Column(db.Date)
    data_inativacao = db.Column(db.Date)
    
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    localizacao_id = db.Column(db.Integer, db.ForeignKey('localizacoes.id'))
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'))
    contrato_id = db.Column(db.Integer, db.ForeignKey('contratos.id'))
    orcamento_id = db.Column(db.Integer, db.ForeignKey('orcamentos.id'))
    
    empresa = db.relationship('Empresa', backref=db.backref('ativos_list_new', lazy=True))
    localizacao = db.relationship('Localizacao', backref=db.backref('ativos_list_new', lazy=True))
    fornecedor = db.relationship('Fornecedor', backref=db.backref('ativos_list_new', lazy=True))
    
    # Usando o backref definido no Contrato
    # contrato_vinculo será criado automaticamente pelo backref em Contrato

    orcamento = db.relationship('Orcamento', backref=db.backref('ativos_list_new', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'numero_serie': self.numero_serie,
            'voltagem_entrada': self.voltagem_entrada,
            'data_aquisicao': self.data_aquisicao.isoformat() if self.data_aquisicao else None,
            'data_inativacao': self.data_inativacao.isoformat() if self.data_inativacao else None,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'localizacao_id': self.localizacao_id,
            'localizacao_nome': self.localizacao.nome if self.localizacao else None,
            'fornecedor_id': self.fornecedor_id,
            'fornecedor_nome': self.fornecedor.nome if self.fornecedor else None,
            'contrato_id': self.contrato_id,
            'contrato_numero': self.contrato_vinculo.numero if hasattr(self, 'contrato_vinculo') and self.contrato_vinculo else None,
            'orcamento_id': self.orcamento_id,
            'orcamento_numero': self.orcamento.numero if self.orcamento else None
        }
