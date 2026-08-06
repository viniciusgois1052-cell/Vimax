from .. import db
from datetime import datetime

class CRMDeal(db.Model):
    __tablename__ = 'crm_deals'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    titulo = db.Column(db.String(300), nullable=False)
    contato_id = db.Column(db.Integer, db.ForeignKey('crm_contacts.id'), nullable=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    valor = db.Column(db.Float, nullable=True)
    estagio = db.Column(db.String(100), nullable=True)
    responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    data_prevista = db.Column(db.Date, nullable=True)
    notas = db.Column(db.Text, nullable=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, onupdate=datetime.utcnow)
    campos_extras = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'contato_id': self.contato_id,
            'empresa_id': self.empresa_id,
            'valor': float(self.valor) if self.valor is not None else None,
            'estagio': self.estagio,
            'responsavel_id': self.responsavel_id,
            'data_prevista': self.data_prevista.isoformat() if self.data_prevista else None,
            'notas': self.notas,
            'campos_extras': self.campos_extras,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None,
        }
