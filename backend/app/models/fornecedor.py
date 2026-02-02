from .. import db
from .empresa import Empresa

class Fornecedor(db.Model):
    __tablename__ = 'fornecedores'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cnpj = db.Column(db.String(18))
    servico = db.Column(db.String(255))
    email = db.Column(db.String(100))
    telefone = db.Column(db.String(20))
    endereco = db.Column(db.String(255))
    
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    empresa = db.relationship('Empresa', backref=db.backref('fornecedores', lazy=True))

    def to_dict(self):
        return {
            'id': self.id, 
            'nome': self.nome, 
            'cnpj': self.cnpj,
            'servico': self.servico,
            'email': self.email, 
            'telefone': self.telefone,
            'endereco': self.endereco,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None
        }
