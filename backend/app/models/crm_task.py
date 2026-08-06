from datetime import datetime
from .. import db

class CRMTask(db.Model):
    __tablename__ = 'crm_tasks'
    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    opportunity_id = db.Column(db.Integer, db.ForeignKey('crm_opportunities.id'), nullable=False)
    usuario_id     = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    group_id       = db.Column(db.Integer, nullable=True)
    preset_id      = db.Column(db.Integer, db.ForeignKey('crm_task_presets.id'), nullable=True)
    titulo         = db.Column(db.String(200), nullable=False)
    descricao      = db.Column(db.Text, nullable=True)
    concluida      = db.Column(db.Boolean, default=False)
    concluida_em   = db.Column(db.DateTime, nullable=True)
    criado_em      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':             self.id,
            'opportunity_id': self.opportunity_id,
            'usuario_id':     self.usuario_id,
            'group_id':       self.group_id,
            'preset_id':      self.preset_id,
            'titulo':         self.titulo,
            'descricao':      self.descricao,
            'concluida':      self.concluida,
            'concluida_em':   self.concluida_em.isoformat() if self.concluida_em else None,
            'criado_em':      self.criado_em.isoformat() if self.criado_em else None,
        }
