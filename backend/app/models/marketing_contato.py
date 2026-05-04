from .. import db
from datetime import datetime

class MarketingContato(db.Model):
    __tablename__ = 'marketing_contatos'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=False)
    empresa = db.Column(db.String(200), nullable=True)
    telefone = db.Column(db.String(50), nullable=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    grupos = db.relationship('MarketingContatoGrupo', back_populates='contato', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'email': self.email,
            'empresa': self.empresa,
            'telefone': self.telefone,
            'empresa_id': self.empresa_id,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
            'grupos': [
                {'id': cg.grupo.id, 'nome': cg.grupo.nome}
                for cg in self.grupos if cg.grupo
            ]
        }
