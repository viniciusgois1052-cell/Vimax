from datetime import datetime
from .. import db
import json

class Chamado(db.Model):
    __tablename__ = 'chamados'

    id = db.Column(db.Integer, primary_key=True)
    titulo = db.Column(db.String(255), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(64), nullable=True, default='aberto')
    prioridade = db.Column(db.String(32), nullable=True)
    
    # Tipo de chamado: 'maquinario' ou 'infraestrutura'
    tipo = db.Column(db.String(50), nullable=True, default='maquinario')
    
    # Opções selecionadas no formulário externo (JSON array)
    opcoes_selecionadas = db.Column(db.Text, nullable=True)
    
    # IDs de vínculos
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    localizacao_id = db.Column(db.Integer, db.ForeignKey('localizacoes.id'), nullable=True)
    usuario_responsavel_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias_chamado.id'), nullable=True)
    ativo_id = db.Column(db.Integer, db.ForeignKey('ativos.id'), nullable=True)
    infraestrutura_id = db.Column(db.Integer, db.ForeignKey('infraestrutura.id'), nullable=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=True)
    contrato_id = db.Column(db.Integer, db.ForeignKey('contratos.id'), nullable=True)
    orcamento_id = db.Column(db.Integer, db.ForeignKey('orcamentos.id'), nullable=True)
    
    # Relacionamentos para facilitar o acesso aos nomes
    empresa_rel = db.relationship('Empresa', foreign_keys=[empresa_id], backref='chamados', lazy=True)
    localizacao_rel = db.relationship('Localizacao', foreign_keys=[localizacao_id], backref='chamados', lazy=True)
    ativo_rel = db.relationship('Ativo', foreign_keys=[ativo_id], backref='chamados', lazy=True)
    infraestrutura_rel = db.relationship('Infraestrutura', foreign_keys=[infraestrutura_id], backref='chamados', lazy=True)
    fornecedor_rel = db.relationship('Fornecedor', foreign_keys=[fornecedor_id], backref='chamados', lazy=True)
    contrato_rel = db.relationship('Contrato', foreign_keys=[contrato_id], backref='chamados', lazy=True)
    categoria_rel = db.relationship('CategoriaChamado', foreign_keys=[categoria_id], backref='chamados', lazy=True)
    
    # Campo para valor total do serviço
    valor_total = db.Column(db.Float, nullable=True, default=0.0)

    # Novos campos de criticidade
    criticidade_informada = db.Column(db.String(32), nullable=True)
    criticidade_real = db.Column(db.String(32), nullable=True)

    # Timestamps (Armazenados em UTC)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    data_abertura = db.Column(db.DateTime, nullable=True)
    data_solucao = db.Column(db.DateTime, nullable=True)

    # Soft-delete fields
    ativo = db.Column(db.Boolean, default=True, nullable=False, index=True)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # campos extras que seu app possa usar (ex.: anexos JSON)
    anexos = db.Column(db.Text, nullable=True)

    def to_dict(self):
        def format_utc(dt):
            if not dt: return None
            return dt.isoformat() + 'Z'

        return {
            'id': self.id,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'status': self.status,
            'prioridade': self.prioridade,
            'tipo': self.tipo or 'maquinario',
            'valor_total': float(self.valor_total or 0),
            'criticidade_informada': self.criticidade_informada,
            'criticidade_real': self.criticidade_real,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa_rel.nome if self.empresa_rel else None,
            'localizacao_id': self.localizacao_id,
            'localizacao_nome': self.localizacao_rel.nome if self.localizacao_rel else None,
            'usuario_responsavel_id': self.usuario_responsavel_id,
            'categoria_id': self.categoria_id,
            'categoria_nome': self.categoria_rel.nome if self.categoria_rel else None,
            'ativo_id': self.ativo_id,
            'ativo_nome': self.ativo_rel.nome if self.ativo_rel else None,
            'infraestrutura_id': self.infraestrutura_id,
            'infraestrutura_nome': self.infraestrutura_rel.nome if self.infraestrutura_rel else None,
            'fornecedor_id': self.fornecedor_id,
            'fornecedor_nome': self.fornecedor_rel.nome if self.fornecedor_rel else None,
            'contrato_id': self.contrato_id,
            'contrato_nome': self.contrato_rel.numero if hasattr(self, 'contrato_rel') and self.contrato_rel else None,
            'orcamento_id': self.orcamento_id,
            'opcoes_selecionadas': self._safe_parse_json(self.opcoes_selecionadas),
            'created_at': format_utc(self.created_at),
            'updated_at': format_utc(self.updated_at),
            'data_abertura': format_utc(self.data_abertura),
            'data_solucao': format_utc(self.data_solucao),
            'ativo': self.ativo,
            'deleted_at': format_utc(self.deleted_at),
            'anexos': None if not self.anexos else self._safe_parse_anexos()
        }

    def _safe_parse_json(self, value):
        if not value:
            return []
        try:
            return json.loads(value) if isinstance(value, str) else value
        except Exception:
            return []

    def _safe_parse_anexos(self):
        try:
            import json
            return json.loads(self.anexos) if isinstance(self.anexos, str) else self.anexos
        except Exception:
            return self.anexos

    def __repr__(self):
        return f"<Chamado {self.id} {self.titulo} tipo={self.tipo} ativo={self.ativo}>"
