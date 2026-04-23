from .. import db
from datetime import datetime

class MarketingGrupo(db.Model):
    __tablename__ = 'marketing_grupos'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    empresa_rel = db.relationship('Empresa', backref=db.backref('marketing_grupos', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'descricao': self.descricao,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa_rel.nome if self.empresa_rel else None,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
        }
