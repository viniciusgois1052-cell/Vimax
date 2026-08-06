from .. import db
from datetime import datetime

class PerfilAcesso(db.Model):
    __tablename__ = 'perfis_acesso'

    id            = db.Column(db.Integer, primary_key=True)
    nome          = db.Column(db.String(100), unique=True, nullable=False)
    descricao     = db.Column(db.String(255), nullable=True)
    criado_em     = db.Column(db.DateTime, default=datetime.utcnow)
    atualizado_em = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    chamados_ver     = db.Column(db.Boolean, default=False)
    chamados_criar   = db.Column(db.Boolean, default=False)
    chamados_editar  = db.Column(db.Boolean, default=False)
    chamados_excluir = db.Column(db.Boolean, default=False)

    tipo_chamado_ver     = db.Column(db.Boolean, default=False)
    tipo_chamado_criar   = db.Column(db.Boolean, default=False)
    tipo_chamado_editar  = db.Column(db.Boolean, default=False)
    tipo_chamado_excluir = db.Column(db.Boolean, default=False)

    tipo_servico_ver     = db.Column(db.Boolean, default=False)
    tipo_servico_criar   = db.Column(db.Boolean, default=False)
    tipo_servico_editar  = db.Column(db.Boolean, default=False)
    tipo_servico_excluir = db.Column(db.Boolean, default=False)

    formularios_chamado_ver     = db.Column(db.Boolean, default=False)
    formularios_chamado_criar   = db.Column(db.Boolean, default=False)
    formularios_chamado_editar  = db.Column(db.Boolean, default=False)
    formularios_chamado_excluir = db.Column(db.Boolean, default=False)

    contratos_ver     = db.Column(db.Boolean, default=False)
    contratos_criar   = db.Column(db.Boolean, default=False)
    contratos_editar  = db.Column(db.Boolean, default=False)
    contratos_excluir = db.Column(db.Boolean, default=False)

    orcamentos_ver     = db.Column(db.Boolean, default=False)
    orcamentos_criar   = db.Column(db.Boolean, default=False)
    orcamentos_editar  = db.Column(db.Boolean, default=False)
    orcamentos_excluir = db.Column(db.Boolean, default=False)

    compras_ver     = db.Column(db.Boolean, default=False)
    compras_criar   = db.Column(db.Boolean, default=False)
    compras_editar  = db.Column(db.Boolean, default=False)
    compras_excluir = db.Column(db.Boolean, default=False)

    clientes_ver     = db.Column(db.Boolean, default=False)
    clientes_criar   = db.Column(db.Boolean, default=False)
    clientes_editar  = db.Column(db.Boolean, default=False)
    clientes_excluir = db.Column(db.Boolean, default=False)

    lembretes_ver     = db.Column(db.Boolean, default=False)
    lembretes_criar   = db.Column(db.Boolean, default=False)
    lembretes_editar  = db.Column(db.Boolean, default=False)
    lembretes_excluir = db.Column(db.Boolean, default=False)

    empresas_ver     = db.Column(db.Boolean, default=False)
    empresas_criar   = db.Column(db.Boolean, default=False)
    empresas_editar  = db.Column(db.Boolean, default=False)
    empresas_excluir = db.Column(db.Boolean, default=False)

    localizacoes_ver     = db.Column(db.Boolean, default=False)
    localizacoes_criar   = db.Column(db.Boolean, default=False)
    localizacoes_editar  = db.Column(db.Boolean, default=False)
    localizacoes_excluir = db.Column(db.Boolean, default=False)

    ativos_ver     = db.Column(db.Boolean, default=False)
    ativos_criar   = db.Column(db.Boolean, default=False)
    ativos_editar  = db.Column(db.Boolean, default=False)
    ativos_excluir = db.Column(db.Boolean, default=False)

    fornecedores_ver     = db.Column(db.Boolean, default=False)
    fornecedores_criar   = db.Column(db.Boolean, default=False)
    fornecedores_editar  = db.Column(db.Boolean, default=False)
    fornecedores_excluir = db.Column(db.Boolean, default=False)

    tipo_infraestrutura_ver     = db.Column(db.Boolean, default=False)
    tipo_infraestrutura_criar   = db.Column(db.Boolean, default=False)
    tipo_infraestrutura_editar  = db.Column(db.Boolean, default=False)
    tipo_infraestrutura_excluir = db.Column(db.Boolean, default=False)

    infraestrutura_ver     = db.Column(db.Boolean, default=False)
    infraestrutura_criar   = db.Column(db.Boolean, default=False)
    infraestrutura_editar  = db.Column(db.Boolean, default=False)
    infraestrutura_excluir = db.Column(db.Boolean, default=False)

    contadores_impressora_ver     = db.Column(db.Boolean, default=False)
    contadores_impressora_criar   = db.Column(db.Boolean, default=False)
    contadores_impressora_editar  = db.Column(db.Boolean, default=False)
    contadores_impressora_excluir = db.Column(db.Boolean, default=False)

    relatorios_ver     = db.Column(db.Boolean, default=False)
    relatorios_criar   = db.Column(db.Boolean, default=False)
    relatorios_editar  = db.Column(db.Boolean, default=False)
    relatorios_excluir = db.Column(db.Boolean, default=False)

    crm_ver     = db.Column(db.Boolean, default=False)
    crm_criar   = db.Column(db.Boolean, default=False)
    crm_editar  = db.Column(db.Boolean, default=False)
    crm_excluir = db.Column(db.Boolean, default=False)

    marketing_ver     = db.Column(db.Boolean, default=False)
    marketing_criar   = db.Column(db.Boolean, default=False)
    marketing_editar  = db.Column(db.Boolean, default=False)
    marketing_excluir = db.Column(db.Boolean, default=False)

    usuarios_ver     = db.Column(db.Boolean, default=False)
    usuarios_criar   = db.Column(db.Boolean, default=False)
    usuarios_editar  = db.Column(db.Boolean, default=False)
    usuarios_excluir = db.Column(db.Boolean, default=False)

    perfis_acesso_ver     = db.Column(db.Boolean, default=False)
    perfis_acesso_criar   = db.Column(db.Boolean, default=False)
    perfis_acesso_editar  = db.Column(db.Boolean, default=False)
    perfis_acesso_excluir = db.Column(db.Boolean, default=False)

    config_email_ver     = db.Column(db.Boolean, default=False)
    config_email_criar   = db.Column(db.Boolean, default=False)
    config_email_editar  = db.Column(db.Boolean, default=False)
    config_email_excluir = db.Column(db.Boolean, default=False)

    logs_ver     = db.Column(db.Boolean, default=False)
    logs_criar   = db.Column(db.Boolean, default=False)
    logs_editar  = db.Column(db.Boolean, default=False)
    logs_excluir = db.Column(db.Boolean, default=False)

    mobilemed_ver     = db.Column(db.Boolean, default=False)
    mobilemed_criar   = db.Column(db.Boolean, default=False)
    mobilemed_editar  = db.Column(db.Boolean, default=False)
    mobilemed_excluir = db.Column(db.Boolean, default=False)

    visualizar_fornecedores = db.Column(db.Boolean, default=True)
    visualizar_prestadores  = db.Column(db.Boolean, default=True)
    
    compras_ver_somente_proprias = db.Column(db.Boolean, default=False)
    compras_pode_requisitar = db.Column(db.Boolean, default=False)
    compras_pode_marcar_recebimento = db.Column(db.Boolean, default=False)
    compras_ver_somente_empresa = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
