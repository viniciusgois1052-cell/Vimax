# -*- coding: utf-8 -*-
from .. import db
from datetime import datetime

class CrmCustomColumn(db.Model):
    __tablename__ = 'crm_custom_columns'

    id          = db.Column(db.Integer, primary_key=True)
    empresa_id  = db.Column(db.Integer, nullable=False, index=True)
    entity_type = db.Column(db.String(50), nullable=False)  # 'contatos' | 'deals' | 'oportunidades'
    key         = db.Column(db.String(100), nullable=False)  # ex: cx_1780489344756
    label       = db.Column(db.String(200), nullable=False)
    ordem       = db.Column(db.Integer, default=0)
    criado_em   = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('empresa_id', 'entity_type', 'key', name='uq_crm_custom_col'),
    )

    def to_dict(self):
        return {'key': self.key, 'label': self.label, 'custom': True}
