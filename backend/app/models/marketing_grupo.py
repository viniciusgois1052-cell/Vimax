from .. import db
from datetime import datetime


class MarketingGrupo(db.Model):
    __tablename__ = 'marketing_grupos'

    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome       = db.Column(db.String(200), nullable=False)
    descricao  = db.Column(db.Text, nullable=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    criado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    criado_em  = db.Column(db.DateTime, default=datetime.utcnow)

    contatos = db.relationship('MarketingContatoGrupo', back_populates='grupo', cascade='all, delete-orphan')

    def to_dict(self):
        lista_contatos = []
        for cg in self.contatos:
            if cg.contato:
                lista_contatos.append({
                    'id':    cg.contato.id,
                    'nome':  cg.contato.nome,
                    'email': cg.contato.email,
                })
        return {
            'id':             self.id,
            'nome':           self.nome,
            'descricao':      self.descricao,
            'empresa_id':     self.empresa_id,
            'criado_por':     self.criado_por,
            'criado_em':      self.criado_em.isoformat() if self.criado_em else None,
            'total_contatos': len(lista_contatos),
            'contatos':       lista_contatos,
        }
