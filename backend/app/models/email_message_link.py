from datetime import datetime
from .. import db

class EmailMessageLink(db.Model):
    __tablename__ = 'email_message_links'

    id = db.Column(db.Integer, primary_key=True)

    # Message-ID do email (único)
    message_id = db.Column(db.String(255), nullable=False, unique=True, index=True)

    # In-Reply-To/References (pra achar thread)
    in_reply_to = db.Column(db.String(255), nullable=True, index=True)

    # Chamado vinculado
    chamado_id = db.Column(db.Integer, db.ForeignKey('chamados.id'), nullable=False, index=True)

    from_email = db.Column(db.String(255), nullable=True)
    subject = db.Column(db.String(255), nullable=True)

    processed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    chamado = db.relationship('Chamado', backref=db.backref('email_links', lazy=True))
