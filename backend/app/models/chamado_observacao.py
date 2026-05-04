from datetime import datetime
from .. import db

class ChamadoObservacao(db.Model):
    __tablename__ = 'chamado_observacoes'

    id = db.Column(db.Integer, primary_key=True)
    chamado_id = db.Column(db.Integer, db.ForeignKey('chamados.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    usuario_nome = db.Column(db.String(128), nullable=True)  # fallback se não tiver usuário
    texto = db.Column(db.Text, nullable=False)
    tipo = db.Column(db.String(32), default='observacao')  # 'observacao' | 'solucao' | 'sistema'
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    chamado_rel = db.relationship('Chamado', backref='observacoes', lazy=True)
    usuario_rel = db.relationship('Usuario', foreign_keys=[usuario_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'chamado_id': self.chamado_id,
            'usuario_id': self.usuario_id,
            'usuario_nome': self.usuario_rel.username if self.usuario_rel else (self.usuario_nome or 'Sistema'),
            'usuario_role': self.usuario_rel.role if self.usuario_rel else None,
            'texto': self.texto,
            'tipo': self.tipo,
            'created_at': self.created_at.isoformat() + 'Z'
        }
