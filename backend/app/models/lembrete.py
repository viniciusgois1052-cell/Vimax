from .. import db
from datetime import datetime

class Lembrete(db.Model):
    __tablename__ = 'lembretes'

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(200), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    data_lembrete = db.Column(db.Date, nullable=False)
    concluido = db.Column(db.Boolean, default=False)

    # Dono do lembrete — isolamento por usuário
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)

    # Vínculo opcional com contrato
    contrato_id = db.Column(db.Integer, db.ForeignKey('contratos.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    usuario = db.relationship('Usuario', backref=db.backref('lembretes', lazy=True))
    contrato = db.relationship('Contrato', backref=db.backref('lembretes', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'data_lembrete': self.data_lembrete.isoformat() if self.data_lembrete else None,
            'concluido': self.concluido,
            'usuario_id': self.usuario_id,
            'contrato_id': self.contrato_id,
            'contrato_numero': self.contrato.numero if self.contrato else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
