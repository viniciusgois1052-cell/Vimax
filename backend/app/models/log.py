from datetime import datetime
from .. import db

class Log(db.Model):
    __tablename__ = 'logs'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    user_id = db.Column(db.Integer, nullable=True)
    username = db.Column(db.String(128), nullable=True)
    entity = db.Column(db.String(128), nullable=True)    # ex: 'ativo', 'chamado', 'usuario'
    entity_id = db.Column(db.String(64), nullable=True)  # id do recurso (pode ser string)
    action = db.Column(db.String(64), nullable=False)    # ex: 'create', 'update', 'delete', 'login'
    details = db.Column(db.Text, nullable=True)          # JSON/string com contexto
    ip = db.Column(db.String(64), nullable=True)

    def __repr__(self):
        return f"<Log {self.id} {self.timestamp} {self.username} {self.action}>"
