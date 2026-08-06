from .. import db
import secrets
from datetime import datetime, timedelta

# Tabela de vínculo N:N entre usuários e empresas
usuario_empresas = db.Table(
    'usuario_empresas',
    db.Column('usuario_id', db.Integer, db.ForeignKey('usuarios.id'), primary_key=True),
    db.Column('empresa_id', db.Integer, db.ForeignKey('empresas.id'), primary_key=True)
)

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username      = db.Column(db.String(50), unique=True, nullable=False)
    nome_completo  = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)  # compatibilidade
    role = db.Column(db.String(20), default='admin')
    api_token        = db.Column(db.String(100), unique=True, nullable=True)
    token_expira_em  = db.Column(db.DateTime, nullable=True)
    perfil_acesso_id = db.Column(db.Integer, db.ForeignKey('perfis_acesso.id'), nullable=True)

    empresa = db.relationship('Empresa', foreign_keys=[empresa_id], backref=db.backref('usuarios', lazy=True))

    perfil_acesso = db.relationship('PerfilAcesso', foreign_keys=[perfil_acesso_id], lazy='select')

    empresas = db.relationship('Empresa', secondary=usuario_empresas, lazy='subquery',
                                backref=db.backref('admins', lazy=True))

    def generate_api_token(self):
        self.api_token       = secrets.token_urlsafe(32)
        self.token_expira_em = datetime.utcnow() + timedelta(hours=8)
        return self.api_token

    def token_valido(self):
        """Verifica se o token existe e não expirou"""
        if not self.api_token:
            return False
        if not self.token_expira_em:
            return False
        return datetime.utcnow() < self.token_expira_em

    def renovar_token(self):
        """Renova a expiração por mais 8h sem trocar o token"""
        self.token_expira_em = datetime.utcnow() + timedelta(hours=8)

    def revogar_token(self):
        """Logout real — invalida o token imediatamente"""
        self.api_token       = None
        self.token_expira_em = None

    def get_empresa_ids(self):
        """Retorna todos os IDs de empresas vinculadas (many-to-many ou fallback para empresa_id)."""
        if self.empresas:
            return [e.id for e in self.empresas]
        if self.empresa_id:
            return [self.empresa_id]
        return []

    def to_dict(self):
        empresas_list = [{'id': e.id, 'nome': e.nome} for e in self.empresas] if self.empresas else []
        empresas_ids  = [e.id for e in self.empresas] if self.empresas else (
            [self.empresa_id] if self.empresa_id else []
        )
        return {
            'id': self.id,
            'username': self.username,
            'nome_completo': self.nome_completo if hasattr(self, 'nome_completo') else None,
            'email': self.email,
            'role': self.role,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'empresas': empresas_list,
            'empresas_ids': empresas_ids,
            'has_api_token': self.api_token is not None,
            'perfil_acesso_id': self.perfil_acesso_id,
            'perfil_acesso': self.perfil_acesso.to_dict() if self.perfil_acesso else None
        }
