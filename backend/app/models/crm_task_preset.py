from datetime import datetime
from .. import db

class CRMTaskPreset(db.Model):
    __tablename__ = 'crm_task_presets'
    id        = db.Column(db.Integer, primary_key=True, autoincrement=True)
    titulo    = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    ordem     = db.Column(db.Integer, default=0)
    ativo     = db.Column(db.Boolean, default=True)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {'id':self.id,'titulo':self.titulo,'descricao':self.descricao,
                'ordem':self.ordem,'ativo':self.ativo,
                'criado_em':self.criado_em.isoformat() if self.criado_em else None}
