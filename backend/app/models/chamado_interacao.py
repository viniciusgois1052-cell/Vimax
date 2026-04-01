from datetime import datetime
from .. import db

class ChamadoInteracao(db.Model):
    __tablename__ = 'chamado_interacoes'

    id = db.Column(db.Integer, primary_key=True)

    chamado_id = db.Column(db.Integer, db.ForeignKey('chamados.id'), nullable=False, index=True)
    autor = db.Column(db.String(255), nullable=True)  # "anonimo <email>" ou usuário interno no futuro
    mensagem = db.Column(db.Text, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    chamado = db.relationship('Chamado', backref=db.backref('interacoes', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'chamado_id': self.chamado_id,
            'autor': self.autor,
            'mensagem': self.mensagem,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
        }
