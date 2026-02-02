from .. import db
import secrets

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    role = db.Column(db.String(20), default='admin') # super_admin, admin, relatorios
    api_token = db.Column(db.String(100), unique=True, nullable=True)
    
    empresa = db.relationship('Empresa', backref=db.backref('usuarios', lazy=True))
    
    def generate_api_token(self):
        self.api_token = secrets.token_urlsafe(32)
        return self.api_token

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'has_api_token': self.api_token is not None
        }
