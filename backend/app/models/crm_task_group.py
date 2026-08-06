from datetime import datetime
from .. import db

class CRMTaskGroupItem(db.Model):
    __tablename__ = 'crm_task_group_items'
    id        = db.Column(db.Integer, primary_key=True, autoincrement=True)
    group_id  = db.Column(db.Integer, db.ForeignKey('crm_task_groups.id', ondelete='CASCADE'), nullable=False)
    titulo    = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    ordem     = db.Column(db.Integer, default=0)
    ativo     = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {'id':self.id,'group_id':self.group_id,'titulo':self.titulo,
                'descricao':self.descricao,'ordem':self.ordem,'ativo':self.ativo}

class CRMTaskGroup(db.Model):
    __tablename__ = 'crm_task_groups'
    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    usuario_id  = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=True)
    titulo      = db.Column(db.String(200), nullable=False)
    descricao   = db.Column(db.Text, nullable=True)
    ordem       = db.Column(db.Integer, default=0)
    ativo       = db.Column(db.Boolean, default=True)
    criado_em   = db.Column(db.DateTime, default=datetime.utcnow)
    items       = db.relationship('CRMTaskGroupItem', backref='group',
                                  lazy='dynamic', cascade='all, delete-orphan',
                                  primaryjoin='CRMTaskGroup.id==CRMTaskGroupItem.group_id')

    def to_dict(self, with_items=False):
        d = {'id':self.id,'usuario_id':self.usuario_id,'titulo':self.titulo,
             'descricao':self.descricao,'ordem':self.ordem,'ativo':self.ativo,
             'criado_em':self.criado_em.isoformat() if self.criado_em else None}
        if with_items:
            d['items'] = [i.to_dict() for i in
                          self.items.filter_by(ativo=True).order_by(CRMTaskGroupItem.ordem, CRMTaskGroupItem.id).all()]
        return d
