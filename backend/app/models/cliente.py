from .. import db

class Cliente(db.Model):
    __tablename__ = 'clientes'
    id            = db.Column(db.Integer, primary_key=True)
    nome          = db.Column(db.String(150), nullable=False)
    email         = db.Column(db.String(150))
    telefone      = db.Column(db.String(30))
    documento     = db.Column(db.String(30))
    exames        = db.Column(db.Text)
    empresa_id    = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    observacao    = db.Column(db.Text)

    empresa = db.relationship('Empresa', backref=db.backref('clientes', lazy=True))

    def to_dict(self):
        return {
            'id':           self.id,
            'nome':         self.nome,
            'email':        self.email,
            'telefone':     self.telefone,
            'documento':    self.documento,
            'exames':       self.exames,
            'empresa_id':   self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'observacao':   self.observacao,
        }
