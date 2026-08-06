from .. import db

class MarketingContatoGrupo(db.Model):
    __tablename__ = 'marketing_contato_grupos'
    __table_args__ = (
        db.UniqueConstraint('contato_id', 'grupo_id', name='uq_contato_grupo'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    contato_id = db.Column(db.Integer, db.ForeignKey('marketing_contatos.id'), nullable=False)
    grupo_id = db.Column(db.Integer, db.ForeignKey('marketing_grupos.id'), nullable=False)

    contato = db.relationship('MarketingContato', back_populates='grupos')
    grupo = db.relationship('MarketingGrupo', back_populates='contatos')
