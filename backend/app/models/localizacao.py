from .. import db

class Localizacao(db.Model):
    __tablename__ = 'localizacoes'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(255))
    # Campo necessário para o vínculo com a empresa
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    
    # Relacionamento para permitir o acesso aos dados da empresa vinculada
    empresa = db.relationship('Empresa', backref=db.backref('localizacoes', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None
        }
