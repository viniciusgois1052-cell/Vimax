from .. import db
from datetime import datetime

class MobilemedConfig(db.Model):
    __tablename__ = 'mobilemed_config'

    id            = db.Column(db.Integer, primary_key=True)
    client_id     = db.Column(db.String(300), nullable=False)
    client_secret = db.Column(db.String(300), nullable=False)
    webhook_url   = db.Column(db.String(500), nullable=False)
    ambiente      = db.Column(db.String(20), default='homolog')  # homolog | prod
    ativo         = db.Column(db.Boolean, default=True)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id':           self.id,
            'client_id':    self.client_id,
            'client_secret': '***' + self.client_secret[-4:] if self.client_secret else '',
            'webhook_url':  self.webhook_url,
            'ambiente':     self.ambiente,
            'ativo':        self.ativo,
        }