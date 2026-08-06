from .. import db

class ConfigEmail(db.Model):
    __tablename__ = 'config_email'
    
    id = db.Column(db.Integer, primary_key=True)
    mail_server = db.Column(db.String(255), nullable=False, default='')
    mail_port = db.Column(db.Integer, nullable=False, default=587)
    mail_use_tls = db.Column(db.Boolean, nullable=False, default=True)
    mail_username = db.Column(db.String(255), nullable=False, default='')
    mail_password = db.Column(db.String(255), nullable=False, default='')
    mail_default_sender = db.Column(db.String(255), nullable=False, default='')
    alert_days_before = db.Column(db.Integer, nullable=False, default=30)
    alert_recipients = db.Column(db.Text, nullable=False, default='')

    def to_dict(self):
        return {
            'id': self.id,
            'mail_server': self.mail_server,
            'mail_port': self.mail_port,
            'mail_use_tls': self.mail_use_tls,
            'mail_username': self.mail_username,
            'mail_default_sender': self.mail_default_sender,
            'alert_days_before': self.alert_days_before,
            'alert_recipients': self.alert_recipients
        }
