from datetime import datetime
from .. import db

class CRMOpportunity(db.Model):
    __tablename__ = 'crm_opportunities'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    lead_nome = db.Column(db.String(200), nullable=False)
    empresa = db.Column(db.String(200), nullable=True)
    email = db.Column(db.String(200), nullable=True)
    telefone = db.Column(db.String(50), nullable=True)

    # mantém o campo que já existe no banco
    status = db.Column(db.String(100), nullable=False)

    responsavel = db.Column(db.String(200), nullable=True)
    valor = db.Column(db.Float, nullable=True)
    probabilidade = db.Column(db.Integer, nullable=True)
    origem = db.Column(db.String(100), nullable=True)
    proxima_acao = db.Column(db.String(255), nullable=True)
    data_proxima_acao = db.Column(db.Date, nullable=True)
    etapa_venda = db.Column(db.String(100), nullable=True)
    observacao = db.Column(db.Text, nullable=True)

    ultima_atualizacao = db.Column(db.DateTime, default=datetime.utcnow)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, onupdate=datetime.utcnow)
    campos_extras = db.Column(db.Text, nullable=True)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    criado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'lead_nome': self.lead_nome,
            'empresa': self.empresa,
            'email': self.email,
            'telefone': self.telefone,
            'status': self.status,
            'status_cor': None,
            'responsavel': self.responsavel,
            'valor': float(self.valor) if self.valor is not None else None,
            'probabilidade': self.probabilidade,
            'origem': self.origem,
            'proxima_acao': self.proxima_acao,
            'data_proxima_acao': self.data_proxima_acao.isoformat() if self.data_proxima_acao else None,
            'etapa_venda': self.etapa_venda,
            'observacao': self.observacao,
            'campos_extras': self.campos_extras,
            'empresa_id': self.empresa_id,
            'criado_por': self.criado_por,
            'ultima_atualizacao': self.ultima_atualizacao.isoformat() if self.ultima_atualizacao else None,
            'criado_em': self.criado_em.isoformat() if self.criado_em else None,
            'atualizado_em': self.atualizado_em.isoformat() if self.atualizado_em else None,
        }
