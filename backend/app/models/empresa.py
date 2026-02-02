from .. import db
import json

class Empresa(db.Model):
    __tablename__ = 'empresas'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    cnpj = db.Column(db.String(18), unique=True, nullable=True)
    endereco = db.Column(db.String(255), nullable=True)
    email = db.Column(db.String(100), nullable=True)
    telefone = db.Column(db.String(20), nullable=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    # Armazenar caminhos dos anexos como uma string JSON
    anexos_json = db.Column(db.Text, nullable=True, default='[]')
    
    # Relacionamento para estrutura hierárquica
    sub_empresas = db.relationship('Empresa', backref=db.backref('parent', remote_side=[id]))
    
    def get_anexos(self):
        try:
            return json.loads(self.anexos_json) if self.anexos_json else []
        except:
            return []

    def set_anexos(self, anexos_list):
        self.anexos_json = json.dumps(anexos_list)

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'cnpj': self.cnpj,
            'endereco': self.endereco,
            'email': self.email,
            'telefone': self.telefone,
            'parent_id': self.parent_id,
            'anexos': self.get_anexos()
        }
