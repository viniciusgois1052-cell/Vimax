from .. import db
from sqlalchemy import JSON


# Relações N:N. As chaves primárias compostas impedem vínculos duplicados.
ativo_fornecedores = db.Table(
    'ativo_fornecedores',
    db.Column(
        'ativo_id',
        db.Integer,
        db.ForeignKey('ativos.id', ondelete='CASCADE'),
        primary_key=True
    ),
    db.Column(
        'fornecedor_id',
        db.Integer,
        db.ForeignKey('fornecedores.id', ondelete='CASCADE'),
        primary_key=True
    )
)

ativo_contratos = db.Table(
    'ativo_contratos',
    db.Column(
        'ativo_id',
        db.Integer,
        db.ForeignKey('ativos.id', ondelete='CASCADE'),
        primary_key=True
    ),
    db.Column(
        'contrato_id',
        db.Integer,
        db.ForeignKey('contratos.id', ondelete='CASCADE'),
        primary_key=True
    )
)


class Ativo(db.Model):
    __tablename__ = 'ativos'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    numero_serie = db.Column(db.String(100))
    voltagem_entrada = db.Column(db.String(50))
    data_aquisicao = db.Column(db.Date)
    data_inativacao = db.Column(db.Date)

    empresa_id = db.Column(db.Integer, db.ForeignKey('empresas.id'), nullable=False)
    localizacao_id = db.Column(db.Integer, db.ForeignKey('localizacoes.id'))

    # Mantidos temporariamente para compatibilidade com telas/rotinas antigas.
    # Eles espelham o primeiro item das novas relações N:N.
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'))
    contrato_id = db.Column(db.Integer, db.ForeignKey('contratos.id'))

    orcamento_id = db.Column(db.Integer, db.ForeignKey('orcamentos.id'))
    anexos = db.Column(JSON, default=list)

    registro_anvisa = db.Column(db.String(100))
    registro_anvisa_ativo = db.Column(db.Boolean, default=True, nullable=False)
    registro_anvisa_validade = db.Column(db.Date)

    empresa = db.relationship(
        'Empresa',
        backref=db.backref('ativos_list_new', lazy=True)
    )
    localizacao = db.relationship(
        'Localizacao',
        backref=db.backref('ativos_list_new', lazy=True)
    )
    orcamento = db.relationship(
        'Orcamento',
        backref=db.backref('ativos_list_new', lazy=True)
    )

    fornecedores = db.relationship(
        'Fornecedor',
        secondary=ativo_fornecedores,
        lazy='selectin',
        backref=db.backref('ativos_vinculados', lazy='selectin')
    )
    contratos = db.relationship(
        'Contrato',
        secondary=ativo_contratos,
        lazy='selectin',
        back_populates='ativos_vinculados'
    )

    # Leitura dos campos antigos enquanto a compatibilidade estiver ativa.
    fornecedor_principal = db.relationship(
        'Fornecedor',
        foreign_keys=[fornecedor_id],
        viewonly=True
    )
    contrato_principal = db.relationship(
        'Contrato',
        foreign_keys=[contrato_id],
        viewonly=True
    )

    def _fornecedores_serializados(self):
        itens = list(self.fornecedores or [])
        if self.fornecedor_principal and all(
            item.id != self.fornecedor_principal.id for item in itens
        ):
            itens.append(self.fornecedor_principal)
        return sorted(itens, key=lambda item: ((item.nome or '').lower(), item.id))

    def _contratos_serializados(self):
        itens = list(self.contratos or [])
        if self.contrato_principal and all(
            item.id != self.contrato_principal.id for item in itens
        ):
            itens.append(self.contrato_principal)
        return sorted(itens, key=lambda item: ((item.numero or '').lower(), item.id))

    def to_dict(self):
        fornecedores = self._fornecedores_serializados()
        contratos = self._contratos_serializados()
        fornecedor_principal = fornecedores[0] if fornecedores else None
        contrato_principal = contratos[0] if contratos else None

        return {
            'id': self.id,
            'nome': self.nome,
            'numero_serie': self.numero_serie,
            'voltagem_entrada': self.voltagem_entrada,
            'data_aquisicao': self.data_aquisicao.isoformat() if self.data_aquisicao else None,
            'data_inativacao': self.data_inativacao.isoformat() if self.data_inativacao else None,
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'localizacao_id': self.localizacao_id,
            'localizacao_nome': self.localizacao.nome if self.localizacao else None,

            # Formato novo: vários fornecedores.
            'fornecedor_ids': [item.id for item in fornecedores],
            'fornecedores_nomes': [item.nome for item in fornecedores],
            'fornecedores': [
                {'id': item.id, 'nome': item.nome}
                for item in fornecedores
            ],

            # Compatibilidade com consumidores que ainda esperam um fornecedor.
            'fornecedor_id': fornecedor_principal.id if fornecedor_principal else None,
            'fornecedor_nome': fornecedor_principal.nome if fornecedor_principal else None,

            # Formato novo: vários contratos.
            'contrato_ids': [item.id for item in contratos],
            'contratos_numeros': [item.numero for item in contratos],
            'contratos': [
                {
                    'id': item.id,
                    'numero': item.numero,
                    'fornecedor_id': item.fornecedor_id,
                    'fornecedor_nome': item.fornecedor.nome if item.fornecedor else None,
                    'data_inicio': item.data_inicio.isoformat() if item.data_inicio else None,
                    'data_fim': item.data_fim.isoformat() if item.data_fim else None,
                }
                for item in contratos
            ],

            # Compatibilidade com consumidores que ainda esperam um contrato.
            'contrato_id': contrato_principal.id if contrato_principal else None,
            'contrato_nome': contrato_principal.numero if contrato_principal else None,

            'orcamento_id': self.orcamento_id,
            'orcamento_numero': self.orcamento.numero if self.orcamento else None,
            'anexos': self.anexos or [],
            'registro_anvisa': self.registro_anvisa,
            'registro_anvisa_ativo': (
                bool(self.registro_anvisa_ativo)
                if self.registro_anvisa_ativo is not None
                else True
            ),
            'registro_anvisa_validade': (
                self.registro_anvisa_validade.isoformat()
                if self.registro_anvisa_validade
                else None
            ),
        }