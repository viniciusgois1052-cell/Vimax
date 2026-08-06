from .. import db

class CRMStatus(db.Model):
    __tablename__ = 'crm_statuses'

    id    = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome  = db.Column(db.String(100), nullable=False)
    cor   = db.Column(db.String(20), nullable=True, default='#6366f1')
    ordem = db.Column(db.Integer, nullable=True, default=0)
    ativo      = db.Column(db.Boolean, nullable=False, default=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)

    def to_dict(self):
        return {
            'id':       self.id,
            'nome':     self.nome,
            'cor':      self.cor,
            'ordem':    self.ordem,
            'ativo':    self.ativo,
            'empresa_id': self.empresa_id,
        }
