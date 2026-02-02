from .. import db

class ConfigEmail(db.Model):
    __tablename__ = 'config_email'
    id = db.Column(db.Integer, primary_key=True)
    servidor = db.Column(db.String(100), nullable=False)
    porta = db.Column(db.Integer, nullable=False)
    usuario = db.Column(db.String(100), nullable=False)
    senha = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'servidor': self.servidor,
            'porta': self.porta,
            'usuario': self.usuario,
            'senha': self.senha
        }
