from .. import db
import secrets
import json


class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    role = db.Column(db.String(20), default='admin')  # super_admin, admin, self_service, publico, marketing, relatorios
    api_token = db.Column(db.String(100), unique=True, nullable=True)

    # Lista de IDs de empresas que o usuario pode acessar (multi-empresa).
    # JSON serializado em texto.
    empresas_ids = db.Column(db.Text, nullable=True, default='[]')

    empresa = db.relationship('Empresa', backref=db.backref('usuarios', lazy=True))

    # ---------------- Helpers ----------------
    def generate_api_token(self):
        self.api_token = secrets.token_urlsafe(32)
        return self.api_token

    def get_empresas_ids(self):
        """Retorna lista de int com todas empresas as quais o usuario tem acesso."""
        try:
            ids = json.loads(self.empresas_ids) if self.empresas_ids else []
            ids = [int(x) for x in ids if x not in (None, '', 'none')]
        except Exception:
            ids = []
        # garante que empresa_id principal tambem esta no conjunto
        if self.empresa_id and self.empresa_id not in ids:
            ids.append(int(self.empresa_id))
        return list(sorted(set(ids)))

    def set_empresas_ids(self, lista):
        cleaned = []
        for v in (lista or []):
            try:
                if v in (None, '', 'none'):
                    continue
                cleaned.append(int(v))
            except Exception:
                continue
        cleaned = list(sorted(set(cleaned)))
        self.empresas_ids = json.dumps(cleaned)
        # se nao houver empresa principal definida, usa a primeira da lista
        if cleaned and not self.empresa_id:
            self.empresa_id = cleaned[0]
        return cleaned

    def is_super_admin(self):
        return (self.role or '').lower() == 'super_admin'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'empresas_ids': self.get_empresas_ids(),
            'has_api_token': self.api_token is not None,
        }
