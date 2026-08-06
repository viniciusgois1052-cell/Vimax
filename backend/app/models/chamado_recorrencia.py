from datetime import datetime
from .. import db

class ChamadoRecorrencia(db.Model):
    __tablename__ = 'chamado_recorrencias'

    id = db.Column(db.Integer, primary_key=True)

    # Chamado "template" base
    titulo = db.Column(db.String(255), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    tipo = db.Column(db.String(50), default='maquinario')
    criticidade_real = db.Column(db.String(32), nullable=True)

    # Vínculos (mesmos do chamado)
    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=True)
    localizacao_id = db.Column(db.Integer, db.ForeignKey('localizacoes.id'), nullable=True)
    ativo_id = db.Column(db.Integer, db.ForeignKey('ativos.id'), nullable=True)
    infraestrutura_id = db.Column(db.Integer, db.ForeignKey('infraestrutura.id'), nullable=True)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=True)
    contrato_id = db.Column(db.Integer, db.ForeignKey('contratos.id'), nullable=True)
    orcamento_id = db.Column(db.Integer, db.ForeignKey('orcamentos.id'), nullable=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias_chamado.id'), nullable=True)

    # Configuração de recorrência
    frequencia = db.Column(db.String(32), nullable=False)  # diario|semanal|quinzenal|mensal|bimestral|trimestral|semestral|anual
    dia_semana = db.Column(db.Integer, nullable=True)       # 0=seg..6=dom (para semanal/quinzenal)
    dia_mes = db.Column(db.Integer, nullable=True)          # 1-31 (para mensal+)
    hora = db.Column(db.Integer, default=8)                 # hora de geração
    minuto = db.Column(db.Integer, default=0)

    # Controle
    ativo = db.Column(db.Boolean, default=True)
    data_inicio = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    data_fim = db.Column(db.DateTime, nullable=True)        # None = sem fim
    proxima_execucao = db.Column(db.DateTime, nullable=True)
    ultima_execucao = db.Column(db.DateTime, nullable=True)
    total_gerado = db.Column(db.Integer, default=0)
    criado_por_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relacionamentos
    empresa_rel = db.relationship('Empresa', foreign_keys=[empresa_id], lazy=True)
    ativo_rel = db.relationship('Ativo', foreign_keys=[ativo_id], lazy=True)
    infraestrutura_rel = db.relationship('Infraestrutura', foreign_keys=[infraestrutura_id], lazy=True)
    fornecedor_rel = db.relationship('Fornecedor', foreign_keys=[fornecedor_id], lazy=True)
    criado_por_rel = db.relationship('Usuario', foreign_keys=[criado_por_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'titulo': self.titulo,
            'descricao': self.descricao,
            'tipo': self.tipo,
            'criticidade_real': self.criticidade_real,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa_rel.nome if self.empresa_rel else None,
            'localizacao_id': self.localizacao_id,
            'ativo_id': self.ativo_id,
            'ativo_nome': self.ativo_rel.nome if self.ativo_rel else None,
            'infraestrutura_id': self.infraestrutura_id,
            'infraestrutura_nome': self.infraestrutura_rel.nome if self.infraestrutura_rel else None,
            'fornecedor_id': self.fornecedor_id,
            'fornecedor_nome': self.fornecedor_rel.nome if self.fornecedor_rel else None,
            'contrato_id': self.contrato_id,
            'orcamento_id': self.orcamento_id,
            'categoria_id': self.categoria_id,
            'frequencia': self.frequencia,
            'dia_semana': self.dia_semana,
            'dia_mes': self.dia_mes,
            'hora': self.hora,
            'minuto': self.minuto,
            'ativo': self.ativo,
            'data_inicio': self.data_inicio.isoformat() + 'Z' if self.data_inicio else None,
            'data_fim': self.data_fim.isoformat() + 'Z' if self.data_fim else None,
            'proxima_execucao': self.proxima_execucao.isoformat() + 'Z' if self.proxima_execucao else None,
            'ultima_execucao': self.ultima_execucao.isoformat() + 'Z' if self.ultima_execucao else None,
            'total_gerado': self.total_gerado or 0,
            'criado_por': self.criado_por_rel.username if self.criado_por_rel else None,
            'created_at': self.created_at.isoformat() + 'Z' if self.created_at else None,
        }
