from datetime import datetime
from .. import db

class CRMActivity(db.Model):
    __tablename__ = 'crm_activities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('crm_opportunities.id'), nullable=False)
    tipo = db.Column(db.String(50), nullable=False, default='atualizacao')
    descricao = db.Column(db.Text, nullable=True)
    novo_status = db.Column(db.String(100), nullable=True)
    novo_valor = db.Column(db.Float, nullable=True)
    responsavel = db.Column(db.String(200), nullable=True)
    criado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'opportunity_id': self.opportunity_id,
            'tipo': self.tipo,
            'descricao': self.descricao,
            'novo_status': self.novo_status,
            'novo_valor': float(self.novo_valor) if self.novo_valor is not None else None,
            'responsavel': self.responsavel,
            'criado_por': self.criado_por,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
        }
