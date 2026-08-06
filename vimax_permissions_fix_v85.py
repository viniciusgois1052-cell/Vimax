#!/usr/bin/env python3
"""
Correção global de permissões personalizadas do Vimax v8.5.

Uso:
    python3 vimax_permissions_fix_v85.py --root /var/www/cmms_project --check
    sudo python3 vimax_permissions_fix_v85.py --root /var/www/cmms_project --apply

O modo --check não altera arquivos.
O modo --apply cria um backup antes de escrever qualquer alteração.

O módulo Tipo de Infraestrutura não é alterado, pois já foi corrigido
separadamente.
"""

from __future__ import annotations

import argparse
import datetime as dt
import py_compile
import re
import shutil
import sys
from pathlib import Path


AUTH_PY = r'''from functools import wraps

from flask import request, jsonify, g

from ..models.usuario import Usuario


ACOES_PERMITIDAS = frozenset({'ver', 'criar', 'editar', 'excluir'})

LEGACY_PERMISSIONS = {
    'marketing': {
        'marketing': ACOES_PERMITIDAS,
        'crm': ACOES_PERMITIDAS,
    },
    'relatorios': {
        'relatorios': frozenset({'ver'}),
        'lembretes': ACOES_PERMITIDAS,
    },
    'gestao_documentos': {
        'contratos': ACOES_PERMITIDAS,
        'clientes': ACOES_PERMITIDAS,
        'lembretes': ACOES_PERMITIDAS,
    },
    'self_service': {
        'chamados': frozenset({'ver', 'criar'}),
    },
}


def get_current_user_from_request(req=None):
    req = req or request
    api_token = req.headers.get('X-API-Token')

    if not api_token:
        return None

    user = Usuario.query.filter_by(api_token=api_token).first()
    if not user or not user.token_valido():
        return None

    return user


def has_permission(user, modulo, acao):
    """Valida uma permissão ver/criar/editar/excluir."""
    if not user:
        return False

    role = (user.role or '').strip().lower()
    if role == 'super_admin':
        return True

    if acao not in ACOES_PERMITIDAS:
        return False

    if not isinstance(modulo, str) or not modulo.strip():
        return False

    perfil = user.perfil_acesso
    if perfil is not None:
        chave = f'{modulo.strip().lower()}_{acao}'
        if not hasattr(perfil, chave):
            return False
        return bool(getattr(perfil, chave, False))

    # Compatibilidade com papéis antigos sem perfil personalizado.
    if role == 'admin':
        return True
    return acao in LEGACY_PERMISSIONS.get(role, {}).get(modulo, ())


def has_any_permission(user, permissions):
    return any(has_permission(user, modulo, acao) for modulo, acao in permissions)


def has_special_permission(user, chave):
    """
    Valida flags que não seguem ver/criar/editar/excluir, como as de Compras.
    """
    if not user:
        return False

    role = (user.role or '').strip().lower()
    if role == 'super_admin':
        return True

    perfil = user.perfil_acesso
    if perfil is not None:
        return bool(getattr(perfil, chave, False))

    return role == 'admin'


def require_permission(modulo, acao):
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)

    if not has_permission(user, modulo, acao):
        return None, (
            jsonify({
                'error': 'Acesso negado',
                'permission': f'{modulo}_{acao}',
            }),
            403,
        )

    return user, None


def permission_required(modulo, acao):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            user, err = require_permission(modulo, acao)
            if err:
                return err
            g.current_user = user
            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_roles(*roles):
    """
    Compatibilidade com rotas antigas.

    A política global já valida a permissão da rota antes desta função.
    Por isso, usuários com perfil personalizado não devem ser novamente
    bloqueados somente pelo campo role.
    """
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)

    if user.role == 'super_admin':
        return user, None

    if user.perfil_acesso is not None:
        return user, None

    if user.role not in roles:
        return None, (jsonify({'error': 'Acesso negado'}), 403)

    return user, None


def require_any_auth():
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)
    return user, None
'''


PERMISSION_POLICY_PY = r'''import re

from flask import g, has_request_context, jsonify, request
from sqlalchemy import event
from sqlalchemy.orm import Session, with_loader_criteria

from .auth import has_any_permission, has_permission, has_special_permission
from .filters import get_all_allowed_ids


_SCOPED_MODELS = None


def _get_scoped_models():
    global _SCOPED_MODELS
    if _SCOPED_MODELS is not None:
        return _SCOPED_MODELS

    from ..models.ativo import Ativo
    from ..models.chamado import Chamado
    from ..models.cliente import Cliente
    from ..models.compra import OrdemCompra, PedidoCompra, RequisicaoCompra
    from ..models.contador_impressora import ContadorImpressora
    from ..models.contrato import Contrato
    from ..models.crm_contact import CRMContact
    from ..models.crm_deal import CRMDeal
    from ..models.crm_opportunity import CRMOpportunity
    from ..models.crm_reminder import CRMReminder
    from ..models.crm_status import CRMStatus
    from ..models.empresa import Empresa
    from ..models.formulario_chamado import FormularioChamado
    from ..models.infraestrutura import Infraestrutura
    from ..models.localizacao import Localizacao
    from ..models.orcamento import Orcamento

    _SCOPED_MODELS = (
        (Empresa, 'id'),
        (Ativo, 'empresa_id'),
        (Chamado, 'empresa_id'),
        (Cliente, 'empresa_id'),
        (ContadorImpressora, 'empresa_id'),
        (Contrato, 'empresa_id'),
        (CRMContact, 'empresa_id'),
        (CRMDeal, 'empresa_id'),
        (CRMOpportunity, 'empresa_id'),
        (CRMReminder, 'empresa_id'),
        (CRMStatus, 'empresa_id'),
        (FormularioChamado, 'empresa_id'),
        (Infraestrutura, 'empresa_id'),
        (Localizacao, 'empresa_id'),
        # Marketing possui ACL própria por criado_por. Não aplicar aqui um
        # segundo filtro de empresa, pois cadastros legados podem não ter
        # empresa_id e ainda pertencem com segurança ao usuário criador.
        (Orcamento, 'empresa_id'),
        (RequisicaoCompra, 'empresa_id'),
        (PedidoCompra, 'empresa_id'),
        (OrdemCompra, 'empresa_id'),
    )
    return _SCOPED_MODELS


@event.listens_for(Session, 'do_orm_execute')
def _apply_request_company_scope(execute_state):
    """
    Aplica o escopo por empresa também em consultas por ID e agregações ORM.
    O escopo é calculado uma única vez na autorização da requisição.
    """
    if not execute_state.is_select or not has_request_context():
        return
    if not hasattr(g, 'permission_company_ids'):
        return

    company_ids = g.permission_company_ids
    if company_ids is None:
        return

    statement = execute_state.statement
    for model, field_name in _get_scoped_models():
        criterion = getattr(model, field_name).in_(company_ids)
        statement = statement.options(
            with_loader_criteria(
                model,
                criterion,
                include_aliases=True,
            )
        )
    execute_state.statement = statement


# A ordem importa: os prefixos mais específicos devem vir primeiro.
MODULE_PREFIXES = (
    ('/api/crm/reminders', 'crm'),
    ('/api/crm/tasks', 'crm'),
    ('/api/crm', 'crm'),
    ('/api/marketing/contatos', 'marketing'),
    ('/api/marketing/grupos', 'marketing'),
    ('/api/marketing/smtp', 'marketing'),
    ('/api/marketing/modelos', 'marketing'),
    ('/api/marketing/campanhas', 'marketing'),
    ('/api/marketing/notas', 'marketing'),
    ('/api/categorias-chamado', 'tipo_chamado'),
    ('/api/tipos-servico', 'tipo_servico'),
    ('/api/tipos-infraestrutura', 'tipo_infraestrutura'),
    ('/api/formularios-chamado', 'formularios_chamado'),
    ('/api/contadores-impressora', 'contadores_impressora'),
    ('/api/infraestruturas', 'infraestrutura'),
    ('/api/localizacoes', 'localizacoes'),
    ('/api/fornecedores', 'fornecedores'),
    ('/api/contratos', 'contratos'),
    ('/api/orcamentos', 'orcamentos'),
    ('/api/clientes', 'clientes'),
    ('/api/lembretes', 'lembretes'),
    ('/api/recorrencias', 'chamados'),
    ('/api/chamados', 'chamados'),
    ('/api/empresas', 'empresas'),
    ('/api/ativos', 'ativos'),
    ('/api/compras', 'compras'),
    ('/api/cotacoes', 'compras'),
    ('/api/config/logo', 'compras'),
    ('/api/oc/interno', 'compras'),
    ('/api/relatorios', 'relatorios'),
    ('/api/usuarios', 'usuarios'),
    ('/api/perfis-acesso', 'perfis_acesso'),
    ('/api/config/email', 'config_email'),
    ('/api/logs', 'logs'),
    ('/api/mobilemed', 'mobilemed'),
)


# APIs de consulta que são dependências de outras telas.
READ_DEPENDENCIES = {
    'empresas': (
        'chamados', 'contratos', 'orcamentos', 'compras', 'clientes',
        'lembretes', 'ativos', 'fornecedores', 'localizacoes',
        'infraestrutura', 'formularios_chamado', 'relatorios', 'crm',
        'marketing',
    ),
    'localizacoes': (
        'chamados', 'ativos', 'orcamentos', 'infraestrutura',
        'formularios_chamado',
    ),
    'fornecedores': (
        'chamados', 'contratos', 'orcamentos', 'compras', 'ativos',
    ),
    'tipo_chamado': ('chamados', 'formularios_chamado'),
    'tipo_servico': ('fornecedores', 'chamados'),
    'perfis_acesso': ('usuarios',),
}


POST_AS_EDIT_SUFFIXES = (
    '/aprovar',
    '/rejeitar',
    '/encerrar',
    '/selecionar-vencedor',
    '/enviar-email',
    '/enviar-para-fornecedor',
    '/enviar-fornecedores',
    '/converter-pedido',
    '/receber',
    '/executar',
    '/testar',
    '/enviar',
    '/agendar',
    '/verificar',
    '/consultar-snmp',
    '/atualizar-todas',
    '/financeiro',
    '/trigger-contract-alerts',
    '/token',
    '/reset',
)


def _module_for_path(path):
    for prefix, modulo in MODULE_PREFIXES:
        if path == prefix or path.startswith(prefix + '/'):
            return modulo
    return None


def _action_for_request(path, method):
    method = method.upper()
    if method in ('GET', 'HEAD'):
        return 'ver'
    if method in ('PUT', 'PATCH'):
        return 'editar'
    if method == 'DELETE':
        return 'excluir'
    if method == 'POST':
        if any(path.rstrip('/').endswith(suffix) for suffix in POST_AS_EDIT_SUFFIXES):
            return 'editar'
        return 'criar'
    return None


def _permission_denied(permission):
    return (
        jsonify({
            'error': 'Acesso negado',
            'permission': permission,
        }),
        403,
    )


def _can_read_module(user, modulo):
    checks = [(modulo, 'ver')]
    checks.extend((dependency, 'ver') for dependency in READ_DEPENDENCIES.get(modulo, ()))
    return has_any_permission(user, checks)


def _allowed_company_ids(user):
    if not user or user.role == 'super_admin':
        return None
    return set(get_all_allowed_ids(user.get_empresa_ids()))


def _activate_company_scope(user):
    if user.role == 'super_admin':
        g.permission_company_ids = None
    elif user.role == 'self_service':
        g.permission_company_ids = tuple(user.get_empresa_ids())
    else:
        g.permission_company_ids = tuple(
            get_all_allowed_ids(user.get_empresa_ids())
        )


def _validate_payload_company(user):
    if request.method not in ('POST', 'PUT', 'PATCH'):
        return None

    data = request.get_json(silent=True)
    if not isinstance(data, dict) or 'empresa_id' not in data:
        return None

    raw_id = data.get('empresa_id')
    if raw_id in (None, '', 'none', 'null'):
        return None

    try:
        empresa_id = int(raw_id)
    except (TypeError, ValueError):
        return _permission_denied('empresa_invalida')

    allowed = _allowed_company_ids(user)
    if allowed is not None and empresa_id not in allowed:
        return _permission_denied('empresa_fora_do_escopo')
    return None


def _validate_purchase_record(user, path):
    if not path.startswith('/api/compras/'):
        return None

    match = re.match(r'^/api/compras/(requisicoes|pedidos|ordens)/(\d+)', path)
    if not match or user.role == 'super_admin':
        return None

    resource, raw_id = match.groups()
    record_id = int(raw_id)

    from ..models.compra import OrdemCompra, PedidoCompra, RequisicaoCompra

    if resource == 'requisicoes':
        record = RequisicaoCompra.query.get(record_id)
        owner_id = record.usuario_solicitante_id if record else None
    elif resource == 'pedidos':
        record = PedidoCompra.query.get(record_id)
        owner_id = record.usuario_comprador_id if record else None
    else:
        record = OrdemCompra.query.get(record_id)
        owner_id = (
            record.pedido_ref.usuario_comprador_id
            if record and record.pedido_ref else None
        )

    if not record:
        return None

    allowed = _allowed_company_ids(user)
    if allowed is not None and record.empresa_id not in allowed:
        return _permission_denied('empresa_fora_do_escopo')

    if (
        has_special_permission(user, 'compras_ver_somente_proprias')
        and owner_id != user.id
    ):
        return _permission_denied('compras_ver_somente_proprias')

    return None


def authorize_api_request(user, path, method):
    """
    Executada pelo before_request após a autenticação.
    Retorna None quando autorizado ou uma resposta Flask 403.
    """
    if method.upper() == 'OPTIONS':
        return None

    # Criação de logs de auditoria deve continuar disponível para qualquer
    # usuário autenticado. A leitura dos logs continua protegida.
    if path.rstrip('/') == '/api/logs' and method.upper() == 'POST':
        return None

    # Usada como lookup em CRM, chamados e responsáveis.
    if path.rstrip('/') == '/api/usuarios/membros' and method.upper() == 'GET':
        return None

    # Atualização da própria sessão não depende da permissão de administrar
    # outros usuários.
    if path.rstrip('/') == '/api/usuarios/me' and method.upper() == 'GET':
        return None

    modulo = _module_for_path(path)
    if not modulo:
        return None

    acao = _action_for_request(path, method)
    if not acao:
        return _permission_denied(f'{modulo}_acao_desconhecida')

    if acao == 'ver':
        if not _can_read_module(user, modulo):
            return _permission_denied(f'{modulo}_ver')
    elif not has_permission(user, modulo, acao):
        return _permission_denied(f'{modulo}_{acao}')

    if (
        method.upper() == 'POST'
        and path.rstrip('/') == '/api/compras/requisicoes'
        and not has_special_permission(user, 'compras_pode_requisitar')
    ):
        return _permission_denied('compras_pode_requisitar')

    if (
        method.upper() == 'POST'
        and path.rstrip('/').endswith('/receber')
        and path.startswith('/api/compras/ordens/')
        and not has_special_permission(user, 'compras_pode_marcar_recebimento')
    ):
        return _permission_denied('compras_pode_marcar_recebimento')

    company_error = _validate_payload_company(user)
    if company_error:
        return company_error

    purchase_error = _validate_purchase_record(user, path)
    if purchase_error:
        return purchase_error

    _activate_company_scope(user)
    return None
'''


PROFILE_ROUTES_PY = r'''from flask import Blueprint, jsonify, request

from .. import db
from ..models.perfil_acesso import PerfilAcesso
from ..models.usuario import Usuario
from ..utils.auth import get_current_user_from_request


perfil_acesso_bp = Blueprint('perfil_acesso_bp', __name__)


def require_super_admin():
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)
    if user.role != 'super_admin':
        return None, (jsonify({'error': 'Apenas Super Admin'}), 403)
    return user, None


def parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value == 1
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ('true', '1', 'sim', 'yes'):
            return True
        if normalized in ('false', '0', 'não', 'nao', 'no', ''):
            return False
    return False


def apply_payload(perfil, data):
    for col in PerfilAcesso.__table__.columns:
        if col.name in ('id', 'criado_em', 'atualizado_em'):
            continue
        if col.name not in data:
            continue

        if col.name == 'nome':
            perfil.nome = str(data.get('nome') or '').strip()
        elif col.name == 'descricao':
            value = data.get('descricao')
            perfil.descricao = str(value).strip() if value else None
        elif col.type.python_type is bool:
            setattr(perfil, col.name, parse_bool(data.get(col.name)))
        else:
            setattr(perfil, col.name, data.get(col.name))


@perfil_acesso_bp.route('', methods=['GET'])
def listar():
    user, err = require_super_admin()
    if err:
        return err
    perfis = PerfilAcesso.query.order_by(PerfilAcesso.nome).all()
    return jsonify([perfil.to_dict() for perfil in perfis])


@perfil_acesso_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    user, err = require_super_admin()
    if err:
        return err
    perfil = PerfilAcesso.query.get_or_404(id)
    return jsonify(perfil.to_dict())


@perfil_acesso_bp.route('', methods=['POST'])
def criar():
    user, err = require_super_admin()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    nome = str(data.get('nome') or '').strip()
    if not nome:
        return jsonify({'error': 'Nome obrigatório'}), 400

    conflito = PerfilAcesso.query.filter(
        db.func.lower(PerfilAcesso.nome) == nome.lower()
    ).first()
    if conflito:
        return jsonify({'error': 'Perfil com esse nome já existe'}), 409

    perfil = PerfilAcesso()
    apply_payload(perfil, data)
    db.session.add(perfil)
    db.session.commit()
    return jsonify(perfil.to_dict()), 201


@perfil_acesso_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def atualizar(id):
    user, err = require_super_admin()
    if err:
        return err

    perfil = PerfilAcesso.query.get_or_404(id)
    data = request.get_json(silent=True) or {}
    nome = str(data.get('nome', perfil.nome) or '').strip()
    if not nome:
        return jsonify({'error': 'Nome obrigatório'}), 400

    conflito = PerfilAcesso.query.filter(
        db.func.lower(PerfilAcesso.nome) == nome.lower(),
        PerfilAcesso.id != id,
    ).first()
    if conflito:
        return jsonify({'error': 'Perfil com esse nome já existe'}), 409

    apply_payload(perfil, data)
    db.session.commit()
    return jsonify(perfil.to_dict())


@perfil_acesso_bp.route('/<int:id>', methods=['DELETE'])
def excluir(id):
    user, err = require_super_admin()
    if err:
        return err

    perfil = PerfilAcesso.query.get_or_404(id)
    vinculados = Usuario.query.filter_by(perfil_acesso_id=id).count()
    if vinculados:
        return jsonify({
            'error': (
                f'Este perfil está vinculado a {vinculados} usuário(s). '
                'Remova os vínculos antes de excluir.'
            )
        }), 409

    db.session.delete(perfil)
    db.session.commit()
    return jsonify({'ok': True})
'''


PROFILE_ROUTES_V2_PY = r'''from flask import Blueprint, jsonify, request

from .. import db
from ..models.perfil_acesso import PerfilAcesso
from ..models.usuario import Usuario
from ..utils.auth import (
    get_current_user_from_request,
    has_any_permission,
    has_permission,
)


perfil_acesso_bp = Blueprint('perfil_acesso_bp', __name__)

RESTRICTION_FIELDS = {
    'compras_ver_somente_proprias',
    'compras_ver_somente_empresa',
}


def parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, int):
        return value == 1
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ('true', '1', 'sim', 'yes'):
            return True
        if normalized in ('false', '0', 'não', 'nao', 'no', ''):
            return False
    return False


def boolean_fields():
    return [
        col.name
        for col in PerfilAcesso.__table__.columns
        if col.type.python_type is bool
    ]


def require_profile_action(action):
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)
    if user.role == 'super_admin':
        return user, None

    if action == 'ver':
        allowed = has_any_permission(
            user,
            (
                ('perfis_acesso', 'ver'),
                ('usuarios', 'ver'),
                ('usuarios', 'criar'),
                ('usuarios', 'editar'),
            ),
        )
    else:
        allowed = has_permission(user, 'perfis_acesso', action)

    if not allowed:
        return None, (
            jsonify({
                'error': 'Acesso negado',
                'permission': f'perfis_acesso_{action}',
            }),
            403,
        )
    return user, None


def profile_is_within_scope(user, values):
    """
    Um gestor delegado nunca pode criar/alterar um perfil mais poderoso
    que o próprio perfil.
    """
    if user.role == 'super_admin' or user.perfil_acesso is None:
        return True

    own = user.perfil_acesso
    for field in boolean_fields():
        target_value = parse_bool(values.get(field, False))
        own_value = bool(getattr(own, field, False))

        if field in RESTRICTION_FIELDS:
            if own_value and not target_value:
                return False
        elif target_value and not own_value:
            return False
    return True


def profile_values(perfil, data):
    values = {}
    for field in boolean_fields():
        values[field] = (
            parse_bool(data[field])
            if field in data
            else bool(getattr(perfil, field, False))
        )
    return values


def apply_payload(perfil, data):
    for col in PerfilAcesso.__table__.columns:
        if col.name in ('id', 'criado_em', 'atualizado_em'):
            continue
        if col.name not in data:
            continue

        if col.name == 'nome':
            perfil.nome = str(data.get('nome') or '').strip()
        elif col.name == 'descricao':
            value = data.get('descricao')
            perfil.descricao = str(value).strip() if value else None
        elif col.type.python_type is bool:
            setattr(perfil, col.name, parse_bool(data.get(col.name)))
        else:
            setattr(perfil, col.name, data.get(col.name))


@perfil_acesso_bp.route('', methods=['GET'])
def listar():
    user, err = require_profile_action('ver')
    if err:
        return err
    perfis = PerfilAcesso.query.order_by(PerfilAcesso.nome).all()
    return jsonify([perfil.to_dict() for perfil in perfis])


@perfil_acesso_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    user, err = require_profile_action('ver')
    if err:
        return err
    perfil = PerfilAcesso.query.get_or_404(id)
    return jsonify(perfil.to_dict())


@perfil_acesso_bp.route('', methods=['POST'])
def criar():
    user, err = require_profile_action('criar')
    if err:
        return err

    data = request.get_json(silent=True) or {}
    nome = str(data.get('nome') or '').strip()
    if not nome:
        return jsonify({'error': 'Nome obrigatório'}), 400

    conflito = PerfilAcesso.query.filter(
        db.func.lower(PerfilAcesso.nome) == nome.lower()
    ).first()
    if conflito:
        return jsonify({'error': 'Perfil com esse nome já existe'}), 409

    values = {
        field: parse_bool(data.get(field, False))
        for field in boolean_fields()
    }
    if not profile_is_within_scope(user, values):
        return jsonify({
            'error': 'O novo perfil não pode ter permissões maiores que as suas.'
        }), 403

    perfil = PerfilAcesso()
    apply_payload(perfil, data)
    db.session.add(perfil)
    db.session.commit()
    return jsonify(perfil.to_dict()), 201


@perfil_acesso_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def atualizar(id):
    user, err = require_profile_action('editar')
    if err:
        return err

    perfil = PerfilAcesso.query.get_or_404(id)
    data = request.get_json(silent=True) or {}
    nome = str(data.get('nome', perfil.nome) or '').strip()
    if not nome:
        return jsonify({'error': 'Nome obrigatório'}), 400

    conflito = PerfilAcesso.query.filter(
        db.func.lower(PerfilAcesso.nome) == nome.lower(),
        PerfilAcesso.id != id,
    ).first()
    if conflito:
        return jsonify({'error': 'Perfil com esse nome já existe'}), 409

    values = profile_values(perfil, data)
    if not profile_is_within_scope(user, values):
        return jsonify({
            'error': 'O perfil não pode receber permissões maiores que as suas.'
        }), 403

    apply_payload(perfil, data)
    db.session.commit()
    return jsonify(perfil.to_dict())


@perfil_acesso_bp.route('/<int:id>', methods=['DELETE'])
def excluir(id):
    user, err = require_profile_action('excluir')
    if err:
        return err

    perfil = PerfilAcesso.query.get_or_404(id)
    if (
        user.role != 'super_admin'
        and user.perfil_acesso_id == perfil.id
    ):
        return jsonify({'error': 'Você não pode excluir o próprio perfil.'}), 409

    vinculados = Usuario.query.filter_by(perfil_acesso_id=id).count()
    if vinculados:
        return jsonify({
            'error': (
                f'Este perfil está vinculado a {vinculados} usuário(s). '
                'Remova os vínculos antes de excluir.'
            )
        }), 409

    db.session.delete(perfil)
    db.session.commit()
    return jsonify({'ok': True})
'''


USER_ROUTES_PY = r'''from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from .. import bcrypt, db
from ..models.empresa import Empresa
from ..models.perfil_acesso import PerfilAcesso
from ..models.usuario import Usuario
from ..utils.auth import get_current_user_from_request
from ..utils.filters import get_all_allowed_ids
from ..utils.logging import create_log


usuario_bp = Blueprint('usuario_bp', __name__)
limiter = Limiter(key_func=get_remote_address, default_limits=[])

RESTRICTION_FIELDS = {
    'compras_ver_somente_proprias',
    'compras_ver_somente_empresa',
}


def require_auth():
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)
    return user, None


def _allowed_company_ids(user):
    if user.role == 'super_admin':
        return None
    return set(get_all_allowed_ids(user.get_empresa_ids()))


def _user_in_scope(current_user, target):
    allowed = _allowed_company_ids(current_user)
    if allowed is None:
        return True
    target_ids = set(target.get_empresa_ids())
    return bool(target_ids) and target_ids.issubset(allowed)


def _scoped_user_query(current_user):
    allowed = _allowed_company_ids(current_user)
    if allowed is None:
        return Usuario.query
    if not allowed:
        return Usuario.query.filter(Usuario.id == -1)
    return Usuario.query.filter(
        or_(
            Usuario.empresa_id.in_(allowed),
            Usuario.empresas.any(Empresa.id.in_(allowed)),
        )
    ).distinct()


def _parse_company_ids(data):
    raw_values = data.get('empresas_ids')
    if raw_values is None:
        raw_values = data.get('empresa_ids')
    if raw_values is None:
        single = data.get('empresa_id')
        raw_values = [] if single in (None, '', 'none', 'null', 0) else [single]

    ids = []
    for value in raw_values or []:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            continue
        if parsed not in ids:
            ids.append(parsed)
    return ids


def _validate_company_ids(current_user, company_ids):
    if current_user.role == 'super_admin':
        return True
    allowed = _allowed_company_ids(current_user) or set()
    return bool(company_ids) and set(company_ids).issubset(allowed)


def _sync_empresas(usuario, company_ids):
    empresas = (
        Empresa.query.filter(Empresa.id.in_(company_ids)).all()
        if company_ids else []
    )
    if len(empresas) != len(set(company_ids)):
        raise ValueError('Uma ou mais empresas não existem.')
    by_id = {empresa.id: empresa for empresa in empresas}
    usuario.empresas = [by_id[company_id] for company_id in company_ids]
    usuario.empresa_id = company_ids[0] if company_ids else None


def _boolean_fields():
    return [
        col.name
        for col in PerfilAcesso.__table__.columns
        if col.type.python_type is bool
    ]


def _profile_assignable(current_user, profile):
    if profile is None:
        return current_user.role == 'super_admin'
    if current_user.role == 'super_admin' or current_user.perfil_acesso is None:
        return True

    own = current_user.perfil_acesso
    for field in _boolean_fields():
        own_value = bool(getattr(own, field, False))
        target_value = bool(getattr(profile, field, False))
        if field in RESTRICTION_FIELDS:
            if own_value and not target_value:
                return False
        elif target_value and not own_value:
            return False
    return True


def _resolve_profile(current_user, raw_profile_id, role):
    if role == 'super_admin' and current_user.role != 'super_admin':
        return None, (jsonify({
            'error': 'Somente Super Admin pode atribuir esse papel.'
        }), 403)

    if raw_profile_id in (None, '', 'none', 'null', 0):
        if current_user.role != 'super_admin':
            return None, (jsonify({
                'error': 'Gestores delegados devem atribuir um perfil personalizado.'
            }), 403)
        return None, None

    try:
        profile_id = int(raw_profile_id)
    except (TypeError, ValueError):
        return None, (jsonify({'error': 'Perfil inválido.'}), 400)

    profile = PerfilAcesso.query.get(profile_id)
    if not profile:
        return None, (jsonify({'error': 'Perfil não encontrado.'}), 404)
    if not _profile_assignable(current_user, profile):
        return None, (jsonify({
            'error': 'Você não pode atribuir um perfil mais poderoso que o seu.'
        }), 403)
    return profile, None


def _safe_log(**kwargs):
    try:
        create_log(**kwargs)
    except Exception:
        pass


@usuario_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data = request.get_json(silent=True) or {}
    username = str(data.get('username') or '').strip()
    password = data.get('password')
    if not username or not password:
        return jsonify({'error': 'Usuário e senha são obrigatórios.'}), 400

    user = Usuario.query.filter_by(username=username).first()
    if user and bcrypt.check_password_hash(user.password_hash, password):
        if not user.api_token or not user.token_valido():
            user.generate_api_token()
            db.session.commit()
        payload = user.to_dict()
        payload['api_token'] = user.api_token
        _safe_log(
            user=user,
            action='login_success',
            entity='usuario',
            entity_id=user.id,
            details={'username': username},
            req=request,
        )
        return jsonify(payload)

    _safe_log(
        user=None,
        action='login_failed',
        entity='usuario',
        entity_id=None,
        details={'username': username},
        req=request,
    )
    return jsonify({'error': 'Usuário ou senha inválidos.'}), 401


@usuario_bp.route('/me', methods=['GET'])
def get_me():
    user, err = require_auth()
    if err:
        return err
    return jsonify(user.to_dict())


@usuario_bp.route('', methods=['GET'])
def get_usuarios():
    user, err = require_auth()
    if err:
        return err
    usuarios = _scoped_user_query(user).order_by(Usuario.username).all()
    return jsonify([item.to_dict() for item in usuarios])


@usuario_bp.route('', methods=['POST'])
def create_usuario():
    current_user, err = require_auth()
    if err:
        return err
    data = request.get_json(silent=True) or {}

    username = str(data.get('username') or '').strip()
    email = str(data.get('email') or '').strip()
    password = data.get('password')
    if not username or not email or not password:
        return jsonify({
            'error': 'Username, e-mail e senha são obrigatórios.'
        }), 400
    if Usuario.query.filter_by(username=username).first():
        return jsonify({'error': 'Nome de usuário já existe.'}), 409
    if Usuario.query.filter_by(email=email).first():
        return jsonify({'error': 'E-mail já existe.'}), 409

    role = str(data.get('role') or 'admin').strip()
    profile, profile_error = _resolve_profile(
        current_user,
        data.get('perfil_acesso_id'),
        role,
    )
    if profile_error:
        return profile_error

    company_ids = _parse_company_ids(data)
    if not _validate_company_ids(current_user, company_ids):
        return jsonify({
            'error': 'Uma ou mais empresas estão fora do seu escopo.'
        }), 403

    novo = Usuario(
        username=username,
        nome_completo=str(data.get('nome_completo') or '').strip(),
        email=email,
        password_hash=bcrypt.generate_password_hash(password).decode('utf-8'),
        role=role,
        perfil_acesso_id=profile.id if profile else None,
    )
    novo.generate_api_token()
    db.session.add(novo)
    db.session.flush()
    _sync_empresas(novo, company_ids)
    db.session.commit()

    _safe_log(
        user=current_user,
        action='create_usuario',
        entity='usuario',
        entity_id=novo.id,
        details={'username': username, 'empresas_ids': company_ids},
        req=request,
    )
    return jsonify(novo.to_dict()), 201


@usuario_bp.route('/<int:id>', methods=['GET'])
def get_usuario(id):
    current_user, err = require_auth()
    if err:
        return err
    usuario = Usuario.query.get_or_404(id)
    if not _user_in_scope(current_user, usuario):
        return jsonify({'error': 'Usuário fora do seu escopo.'}), 403
    return jsonify(usuario.to_dict())


@usuario_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_usuario(id):
    current_user, err = require_auth()
    if err:
        return err
    usuario = Usuario.query.get_or_404(id)
    if not _user_in_scope(current_user, usuario):
        return jsonify({'error': 'Usuário fora do seu escopo.'}), 403
    if usuario.role == 'super_admin' and current_user.role != 'super_admin':
        return jsonify({'error': 'Somente Super Admin pode alterar este usuário.'}), 403

    data = request.get_json(silent=True) or {}
    role = str(data.get('role', usuario.role) or usuario.role).strip()
    raw_profile_id = (
        data.get('perfil_acesso_id')
        if 'perfil_acesso_id' in data
        else usuario.perfil_acesso_id
    )
    profile, profile_error = _resolve_profile(current_user, raw_profile_id, role)
    if profile_error:
        return profile_error

    company_ids = (
        _parse_company_ids(data)
        if any(key in data for key in ('empresas_ids', 'empresa_ids', 'empresa_id'))
        else usuario.get_empresa_ids()
    )
    if not _validate_company_ids(current_user, company_ids):
        return jsonify({
            'error': 'Uma ou mais empresas estão fora do seu escopo.'
        }), 403

    username = str(data.get('username', usuario.username) or '').strip()
    email = str(data.get('email', usuario.email) or '').strip()
    duplicate_username = Usuario.query.filter(
        Usuario.username == username,
        Usuario.id != id,
    ).first()
    duplicate_email = Usuario.query.filter(
        Usuario.email == email,
        Usuario.id != id,
    ).first()
    if duplicate_username:
        return jsonify({'error': 'Nome de usuário já existe.'}), 409
    if duplicate_email:
        return jsonify({'error': 'E-mail já existe.'}), 409

    before = usuario.to_dict()
    usuario.username = username
    usuario.nome_completo = str(
        data.get('nome_completo', usuario.nome_completo) or ''
    ).strip()
    usuario.email = email
    usuario.role = role
    usuario.perfil_acesso_id = profile.id if profile else None
    if data.get('password'):
        usuario.password_hash = bcrypt.generate_password_hash(
            data['password']
        ).decode('utf-8')
    _sync_empresas(usuario, company_ids)
    db.session.commit()

    _safe_log(
        user=current_user,
        action='update_usuario',
        entity='usuario',
        entity_id=id,
        details={'before': before, 'empresas_ids': company_ids},
        req=request,
    )
    return jsonify(usuario.to_dict())


@usuario_bp.route('/<int:id>', methods=['DELETE'])
def delete_usuario(id):
    current_user, err = require_auth()
    if err:
        return err
    usuario = Usuario.query.get_or_404(id)
    if usuario.id == current_user.id:
        return jsonify({'error': 'Você não pode excluir o próprio usuário.'}), 409
    if not _user_in_scope(current_user, usuario):
        return jsonify({'error': 'Usuário fora do seu escopo.'}), 403
    if usuario.role == 'super_admin' and current_user.role != 'super_admin':
        return jsonify({'error': 'Somente Super Admin pode excluir este usuário.'}), 403

    snapshot = usuario.to_dict()
    db.session.delete(usuario)
    db.session.commit()
    _safe_log(
        user=current_user,
        action='delete_usuario',
        entity='usuario',
        entity_id=id,
        details={'deleted': snapshot},
        req=request,
    )
    return '', 204


@usuario_bp.route('/<int:id>/token', methods=['POST'])
def generate_token(id):
    current_user, err = require_auth()
    if err:
        return err
    if current_user.role != 'super_admin':
        return jsonify({
            'error': 'Somente Super Admin pode gerar token de outro usuário.'
        }), 403

    usuario = Usuario.query.get_or_404(id)
    token = usuario.generate_api_token()
    db.session.commit()
    _safe_log(
        user=current_user,
        action='generate_token',
        entity='usuario',
        entity_id=id,
        details={'target_user': usuario.username},
        req=request,
    )
    return jsonify({'token': token})


@usuario_bp.route('/membros', methods=['GET'])
def get_membros():
    user, err = require_auth()
    if err:
        return err
    membros = _scoped_user_query(user).order_by(Usuario.username).all()
    return jsonify([
        {'id': item.id, 'username': item.username}
        for item in membros
    ])


@usuario_bp.route('/logout', methods=['POST'])
def logout():
    token = request.headers.get('X-API-Token')
    if token:
        user = Usuario.query.filter_by(api_token=token).first()
        if user:
            user.revogar_token()
            db.session.commit()
    return jsonify({'success': True, 'message': 'Logout realizado'})
'''


COMPANY_ROUTES_PY = r'''from flask import Blueprint, jsonify, request

from .. import db
from ..models.empresa import Empresa
from ..utils.auth import get_current_user_from_request
from ..utils.filters import get_all_allowed_ids, get_all_sub_company_ids
from ..utils.logging import create_log


empresa_bp = Blueprint('empresa_bp', __name__)


def safe_int(value):
    if value in (None, '', 'none', 'undefined', 'null'):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def model_columns(obj):
    return [column.name for column in obj.__table__.columns]


def require_auth():
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)
    return user, None


def allowed_ids(user):
    if user.role == 'super_admin':
        return None
    return set(get_all_allowed_ids(user.get_empresa_ids()))


def can_access(user, company_id):
    allowed = allowed_ids(user)
    return allowed is None or company_id in allowed


def validate_parent(user, parent_id, current_id=None):
    if parent_id is None:
        if user.role != 'super_admin':
            return 'Somente Super Admin pode criar ou mover uma empresa para a raiz.'
        return None
    if not can_access(user, parent_id):
        return 'A empresa pai está fora do seu escopo.'
    if current_id is not None:
        if parent_id == current_id:
            return 'Uma empresa não pode ser pai dela mesma.'
        descendants = set(get_all_sub_company_ids(current_id))
        if parent_id in descendants:
            return 'A empresa não pode ser movida para dentro de uma subordinada.'
    return None


def apply_payload(company, data):
    columns = model_columns(Empresa)
    for key, value in data.items():
        if key == 'anexos':
            company.set_anexos(value if isinstance(value, list) else [])
        elif key in columns and key != 'id':
            if key.endswith('_id'):
                setattr(company, key, safe_int(value))
            else:
                setattr(company, key, value)


@empresa_bp.route('', methods=['GET'])
def list_empresas():
    user, err = require_auth()
    if err:
        return err
    query = Empresa.query
    scope = allowed_ids(user)
    if scope is not None:
        query = query.filter(Empresa.id.in_(scope)) if scope else query.filter(Empresa.id == -1)
    empresas = query.order_by(Empresa.id.desc()).all()
    return jsonify([company.to_dict() for company in empresas])


@empresa_bp.route('', methods=['POST'])
def create_empresa():
    user, err = require_auth()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    nome = str(data.get('nome') or '').strip()
    if not nome:
        return jsonify({'error': 'Nome obrigatório.'}), 400

    parent_id = safe_int(data.get('parent_id'))
    parent_error = validate_parent(user, parent_id)
    if parent_error:
        return jsonify({'error': parent_error}), 403

    novo = Empresa()
    apply_payload(novo, data)
    novo.nome = nome
    db.session.add(novo)
    db.session.commit()
    try:
        create_log(
            user=user,
            action='create_empresa',
            entity='empresa',
            entity_id=novo.id,
            details={'payload': data},
            req=request,
        )
    except Exception:
        pass
    return jsonify(novo.to_dict()), 201


@empresa_bp.route('/<int:id>', methods=['GET'])
def get_empresa(id):
    user, err = require_auth()
    if err:
        return err
    if not can_access(user, id):
        return jsonify({'error': 'Empresa fora do seu escopo.'}), 403
    company = Empresa.query.get_or_404(id)
    return jsonify(company.to_dict())


@empresa_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_empresa(id):
    user, err = require_auth()
    if err:
        return err
    company = Empresa.query.get_or_404(id)
    if not can_access(user, id):
        return jsonify({'error': 'Empresa fora do seu escopo.'}), 403

    data = request.get_json(silent=True) or {}
    parent_id = (
        safe_int(data.get('parent_id'))
        if 'parent_id' in data
        else company.parent_id
    )
    parent_error = validate_parent(user, parent_id, current_id=id)
    if parent_error:
        return jsonify({'error': parent_error}), 403

    before = company.to_dict()
    apply_payload(company, data)
    db.session.commit()
    try:
        create_log(
            user=user,
            action='update_empresa',
            entity='empresa',
            entity_id=id,
            details={'before': before, 'after_payload': data},
            req=request,
        )
    except Exception:
        pass
    return jsonify(company.to_dict())


@empresa_bp.route('/<int:id>', methods=['DELETE'])
def delete_empresa(id):
    user, err = require_auth()
    if err:
        return err
    company = Empresa.query.get_or_404(id)
    if not can_access(user, id):
        return jsonify({'error': 'Empresa fora do seu escopo.'}), 403

    snapshot = company.to_dict()
    db.session.delete(company)
    db.session.commit()
    try:
        create_log(
            user=user,
            action='delete_empresa',
            entity='empresa',
            entity_id=id,
            details={'deleted': snapshot},
            req=request,
        )
    except Exception:
        pass
    return jsonify({'ok': True})
'''


SUPPLIER_ROUTES_PY = r'''from flask import Blueprint, jsonify, request
from sqlalchemy import or_

from .. import db
from ..models.fornecedor import Fornecedor
from ..utils.auth import get_current_user_from_request
from ..utils.filters import get_all_allowed_ids
from ..utils.logging import create_log


fornecedor_bp = Blueprint('fornecedor_bp', __name__)
ENTITY_TYPES = {'fornecedor', 'prestador'}


def safe_int(value):
    if value in (None, '', 'none', 'undefined', 'null'):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def require_auth():
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)
    return user, None


def allowed_company_ids(user):
    if user.role == 'super_admin':
        return None
    return set(get_all_allowed_ids(user.get_empresa_ids()))


def can_view_type(user, entity_type):
    if user.role == 'super_admin' or user.perfil_acesso is None:
        return True
    if entity_type == 'prestador':
        return bool(user.perfil_acesso.visualizar_prestadores)
    return bool(user.perfil_acesso.visualizar_fornecedores)


def can_access_record(user, record):
    allowed = allowed_company_ids(user)
    company_ok = (
        allowed is None
        or record.empresa_id is None
        or record.empresa_id in allowed
    )
    return company_ok and can_view_type(
        user,
        record.tipo_entidade or 'fornecedor',
    )


def validate_mutation(user, company_id, entity_type):
    if entity_type not in ENTITY_TYPES:
        return 'Tipo de entidade inválido.'
    if not can_view_type(user, entity_type):
        return 'Seu perfil não permite operar este tipo de cadastro.'
    allowed = allowed_company_ids(user)
    if allowed is not None:
        if company_id is None:
            return 'Selecione uma empresa vinculada ao seu usuário.'
        if company_id not in allowed:
            return 'Empresa fora do seu escopo.'
    return None


def apply_payload(record, data):
    protected = {
        'id',
        'created_at',
        'updated_at',
        'criado_por_usuario_id',
        'criado_por_nome',
    }
    columns = {column.name for column in Fornecedor.__table__.columns}
    for key, value in data.items():
        if key not in columns or key in protected:
            continue
        if key.endswith('_id'):
            setattr(record, key, safe_int(value))
        elif key == 'tipo_entidade' and value in ENTITY_TYPES:
            record.tipo_entidade = value
        else:
            setattr(record, key, value)


@fornecedor_bp.route('', methods=['GET'])
def list_fornecedores():
    user, err = require_auth()
    if err:
        return err

    query = Fornecedor.query
    origem = request.args.get('origem')
    if origem:
        query = query.filter(Fornecedor.origem == origem)

    allowed = allowed_company_ids(user)
    if allowed is not None:
        query = query.filter(
            or_(
                Fornecedor.empresa_id.is_(None),
                Fornecedor.empresa_id.in_(allowed),
            )
        ) if allowed else query.filter(Fornecedor.empresa_id.is_(None))

    if not can_view_type(user, 'fornecedor'):
        query = query.filter(Fornecedor.tipo_entidade == 'prestador')
    if not can_view_type(user, 'prestador'):
        query = query.filter(
            or_(
                Fornecedor.tipo_entidade.is_(None),
                Fornecedor.tipo_entidade == 'fornecedor',
            )
        )

    items = query.order_by(Fornecedor.id.desc()).all()
    return jsonify([item.to_dict() for item in items])


@fornecedor_bp.route('', methods=['POST'])
def create_fornecedor():
    user, err = require_auth()
    if err:
        return err
    data = request.get_json(silent=True) or {}
    entity_type = data.get('tipo_entidade') or 'fornecedor'
    company_id = safe_int(data.get('empresa_id'))
    validation_error = validate_mutation(user, company_id, entity_type)
    if validation_error:
        return jsonify({'error': validation_error}), 403

    novo = Fornecedor()
    apply_payload(novo, data)
    novo.tipo_entidade = entity_type
    novo.empresa_id = company_id
    novo.criado_por_usuario_id = user.id
    novo.criado_por_nome = user.username
    db.session.add(novo)
    db.session.commit()
    try:
        create_log(
            user=user,
            action='create_fornecedor',
            entity='fornecedor',
            entity_id=novo.id,
            details={'payload': data},
            req=request,
        )
    except Exception:
        pass
    return jsonify(novo.to_dict()), 201


@fornecedor_bp.route('/<int:id>', methods=['GET'])
def get_fornecedor(id):
    user, err = require_auth()
    if err:
        return err
    record = Fornecedor.query.get_or_404(id)
    if not can_access_record(user, record):
        return jsonify({'error': 'Cadastro fora do seu escopo.'}), 403
    return jsonify(record.to_dict())


@fornecedor_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_fornecedor(id):
    user, err = require_auth()
    if err:
        return err
    record = Fornecedor.query.get_or_404(id)
    if not can_access_record(user, record):
        return jsonify({'error': 'Cadastro fora do seu escopo.'}), 403

    data = request.get_json(silent=True) or {}
    entity_type = data.get('tipo_entidade', record.tipo_entidade or 'fornecedor')
    company_id = (
        safe_int(data.get('empresa_id'))
        if 'empresa_id' in data
        else record.empresa_id
    )
    validation_error = validate_mutation(user, company_id, entity_type)
    if validation_error:
        return jsonify({'error': validation_error}), 403

    before = record.to_dict()
    apply_payload(record, data)
    record.tipo_entidade = entity_type
    record.empresa_id = company_id
    db.session.commit()
    try:
        create_log(
            user=user,
            action='update_fornecedor',
            entity='fornecedor',
            entity_id=id,
            details={'before': before, 'after_payload': data},
            req=request,
        )
    except Exception:
        pass
    return jsonify(record.to_dict())


@fornecedor_bp.route('/<int:id>', methods=['DELETE'])
def delete_fornecedor(id):
    user, err = require_auth()
    if err:
        return err
    record = Fornecedor.query.get_or_404(id)
    if not can_access_record(user, record):
        return jsonify({'error': 'Cadastro fora do seu escopo.'}), 403

    snapshot = record.to_dict()
    db.session.delete(record)
    db.session.commit()
    try:
        create_log(
            user=user,
            action='delete_fornecedor',
            entity='fornecedor',
            entity_id=id,
            details={'deleted': snapshot},
            req=request,
        )
    except Exception:
        pass
    return jsonify({'ok': True})
'''


def replace_once(text: str, old: str, new: str, label: str) -> tuple[str, str]:
    if new in text:
        return text, f'OK (já aplicado): {label}'
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f'{label}: esperado 1 trecho, encontrado {count}. '
            'O arquivo pode ter sido alterado.'
        )
    return text.replace(old, new, 1), f'ALTERAR: {label}'


def replace_all_required(text: str, old: str, new: str, label: str) -> tuple[str, str]:
    if old not in text:
        if new in text:
            return text, f'OK (já aplicado): {label}'
        raise RuntimeError(f'{label}: trecho não encontrado')
    count = text.count(old)
    return text.replace(old, new), f'ALTERAR ({count}x): {label}'


def wrap_first_card(text: str, condition: str, label: str) -> tuple[str, str]:
    marker = f'{{{condition} && ('
    if marker in text:
        return text, f'OK (já aplicado): {label}'

    start = text.find('            <Card>')
    if start < 0:
        raise RuntimeError(f'{label}: primeiro <Card> não encontrado')
    end = text.find('            </Card>', start)
    if end < 0:
        raise RuntimeError(f'{label}: fechamento do primeiro <Card> não encontrado')
    end += len('            </Card>')
    wrapped = (
        f'            {{{condition} && (\n'
        + text[start:end]
        + '\n            )}'
    )
    return text[:start] + wrapped + text[end:], f'ALTERAR: {label}'


def wrap_jsx_button(
    text: str,
    opening: str,
    condition: str,
    label: str,
) -> tuple[str, str]:
    """Envolve exatamente um botão JSX em uma condição, de forma idempotente."""
    start = text.find(opening)
    if start < 0:
        raise RuntimeError(f'{label}: abertura do botão não encontrada')

    line_start = text.rfind('\n', 0, start) + 1
    prefix = text[max(0, start - 180):start]
    marker = f'{{{condition} && ('
    if marker in prefix:
        return text, f'OK (já aplicado): {label}'

    end = text.find('</button>', start)
    if end < 0:
        raise RuntimeError(f'{label}: fechamento do botão não encontrado')
    end += len('</button>')

    indent = text[line_start:start]
    if indent.strip():
        # A abertura pode estar no meio da linha. Nesse caso, preservamos apenas
        # os espaços anteriores ao elemento.
        indent = re.match(r'[ \t]*', indent).group(0)

    block = text[start:end]
    replacement = (
        f'{{{condition} && (\n'
        f'{indent}{block}\n'
        f'{indent})}}'
    )
    return text[:start] + replacement + text[end:], f'ALTERAR: {label}'


def wrap_expression_button(
    text: str,
    opening: str,
    condition: str,
    label: str,
) -> tuple[str, str]:
    """Envolve botão que já está dentro de uma expressão/ramo ternário."""
    start = text.find(opening)
    if start < 0:
        raise RuntimeError(f'{label}: abertura do botão não encontrada')

    line_start = text.rfind('\n', 0, start) + 1
    prefix = text[max(0, start - 180):start]
    marker = f'{condition} && ('
    if marker in prefix:
        return text, f'OK (já aplicado): {label}'

    end = text.find('</button>', start)
    if end < 0:
        raise RuntimeError(f'{label}: fechamento do botão não encontrado')
    end += len('</button>')
    indent = re.match(r'[ \t]*', text[line_start:start]).group(0)
    block = text[start:end]
    replacement = (
        f'{condition} && (\n'
        f'{indent}{block}\n'
        f'{indent})'
    )
    return text[:start] + replacement + text[end:], f'ALTERAR: {label}'


def frontend_transform(path: Path, transform):
    original = path.read_text(encoding='utf-8')
    updated, messages = transform(original)
    if isinstance(messages, str):
        messages = [messages]
    return original, updated, messages


def transform_app(text):
    function_pattern = re.compile(
        r'^(?P<indent>[ \t]*)const\s+firstAllowedRoute\s*=\s*'
        r'\(\s*\)\s*=>\s*\{[\s\S]*?'
        r'^(?P=indent)\}[ \t]*(?=\n[ \t]*\n[ \t]*const\s+renderRoutes)',
        re.M,
    )
    matches = list(function_pattern.finditer(text))
    if len(matches) != 1:
        raise RuntimeError(
            'App.jsx: não foi possível localizar de forma única '
            'firstAllowedRoute(). Execute: grep -n -A50 -B8 '
            '"firstAllowedRoute" frontend/src/App.jsx'
        )

    match = matches[0]
    current = match.group(0)
    indent = match.group('indent')
    inner = indent + '  '
    entry_indent = inner + '  '

    # Ordem padrão das telas. Inclui os módulos presentes no servidor, como
    # Projetos e Perfis de Acesso, além dos módulos ausentes na implementação
    # antiga de firstAllowedRoute().
    routes = [
        ('chamados_ver', '/chamados'),
        ('tipo_chamado_ver', '/categorias-chamado'),
        ('tipo_servico_ver', '/tipos-servico'),
        ('formularios_chamado_ver', '/formularios-chamado'),
        ('contratos_ver', '/contratos'),
        ('orcamentos_ver', '/orcamentos'),
        ('compras_ver', '/compras'),
        ('projetos_ver', '/projetos'),
        ('clientes_ver', '/clientes'),
        ('lembretes_ver', '/lembretes'),
        ('empresas_ver', '/empresas'),
        ('localizacoes_ver', '/localizacoes'),
        ('ativos_ver', '/ativos'),
        ('fornecedores_ver', '/fornecedores'),
        ('tipo_infraestrutura_ver', '/tipos-infraestrutura'),
        ('infraestrutura_ver', '/infraestruturas'),
        ('contadores_impressora_ver', '/contadores-impressora'),
        ('relatorios_ver', '/relatorios'),
        ('crm_ver', '/crm'),
        ('marketing_ver', '/marketing/campanhas'),
        ('usuarios_ver', '/usuarios'),
        ('perfis_acesso_ver', '/perfis-acesso'),
        ('config_email_ver', '/config-email'),
        ('logs_ver', '/logs'),
        ('mobilemed_ver', '/mobilemed'),
    ]

    # Preserva extensões locais ainda não conhecidas pelo instalador, tanto no
    # formato antigo com vários ifs quanto no formato de lista.
    local_routes = re.findall(
        r'if\s*\(\s*p\.([A-Za-z0-9_]+)\s*\)\s*'
        r'return\s*[\'"]([^\'"]+)[\'"]',
        current,
    )
    local_routes.extend(
        re.findall(
            r'\[\s*[\'"]([A-Za-z0-9_]+)[\'"]\s*,\s*'
            r'[\'"]([^\'"]+)[\'"]\s*\]',
            current,
        )
    )
    known_permissions = {permission for permission, _ in routes}
    for permission, path in local_routes:
        if permission not in known_permissions:
            routes.append((permission, path))
            known_permissions.add(permission)

    route_lines = '\n'.join(
        f"{entry_indent}['{permission}', '{path}'],"
        for permission, path in routes
    )
    replacement = (
        f'{indent}const firstAllowedRoute = () => {{\n'
        f"{inner}if (!p) return '/chamados'\n\n"
        f'{inner}const routes = [\n'
        f'{route_lines}\n'
        f'{inner}]\n\n'
        f'{inner}return routes.find(([permission]) => '
        f"p[permission])?.[1] || '/sem-acesso'\n"
        f'{indent}}}'
    )
    if current == replacement:
        return text, ['OK (já aplicado): App.jsx: primeira rota permitida']

    updated = text[:match.start()] + replacement + text[match.end():]
    return updated, ['ALTERAR: App.jsx: primeira rota permitida']


def transform_auth_context(text):
    messages = []
    old = "const res = await fetch(`/api/usuarios/${user.id}`, {"
    new = "const res = await fetch('/api/usuarios/me', {"
    text, msg = replace_once(
        text,
        old,
        new,
        'AuthContext: atualizar sessão pela rota /me',
    )
    messages.append(msg)

    old_fallback = """    // Demais roles sem perfil → sem acesso via can()
    return false"""
    new_fallback = """    // Compatibilidade com os papéis legados sem perfil personalizado.
    const legacyPermissions = {
      marketing: {
        marketing: ['ver', 'criar', 'editar', 'excluir'],
        crm: ['ver', 'criar', 'editar', 'excluir'],
      },
      relatorios: {
        relatorios: ['ver'],
        lembretes: ['ver', 'criar', 'editar', 'excluir'],
      },
      gestao_documentos: {
        contratos: ['ver', 'criar', 'editar', 'excluir'],
        clientes: ['ver', 'criar', 'editar', 'excluir'],
        lembretes: ['ver', 'criar', 'editar', 'excluir'],
      },
      self_service: {
        chamados: ['ver', 'criar'],
      },
    }

    return !!legacyPermissions[user.role]?.[modulo]?.includes(acao)"""
    text, msg = replace_once(
        text,
        old_fallback,
        new_fallback,
        'AuthContext: preservar permissões dos papéis legados',
    )
    messages.append(msg)
    return text, messages


def transform_profile_access(text):
    messages = []
    text, msg = replace_once(
        text,
        'const { user } = useAuth()',
        'const { user, can } = useAuth()',
        'Perfis: carregar can()',
    )
    messages.append(msg)

    old_restriction = """  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <ShieldCheck size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-bold">Acesso restrito</p>
          <p className="text-sm">Apenas Super Admin pode acessar esta área.</p>
        </div>
      </div>
    )
  }"""
    new_restriction = """  if (!can('perfis_acesso', 'ver')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <ShieldCheck size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-bold">Acesso restrito</p>
          <p className="text-sm">Seu perfil não permite visualizar perfis de acesso.</p>
        </div>
      </div>
    )
  }"""
    text, msg = replace_once(
        text,
        old_restriction,
        new_restriction,
        'Perfis: acesso de leitura pelo perfil',
    )
    messages.append(msg)

    text, msg = replace_once(
        text,
        '<button onClick={() => onEdit(perfil)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit2 size={15}/></button>',
        "{onEdit && <button onClick={() => onEdit(perfil)} className=\"p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors\"><Edit2 size={15}/></button>}",
        'Perfis: esconder edição sem permissão',
    )
    messages.append(msg)
    text, msg = replace_once(
        text,
        '<button onClick={() => onDelete(perfil)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15}/></button>',
        "{onDelete && <button onClick={() => onDelete(perfil)} className=\"p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors\"><Trash2 size={15}/></button>}",
        'Perfis: esconder exclusão sem permissão',
    )
    messages.append(msg)

    text, msg = replace_once(
        text,
        '{modo === null && (',
        "{modo === null && can('perfis_acesso', 'criar') && (",
        'Perfis: esconder Novo Perfil sem permissão',
    )
    messages.append(msg)

    old_callbacks = """              onEdit={pf => { setPerfilEdit(pf); setModo('editar'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              onDelete={pf => setConfirm(pf)} />"""
    new_callbacks = """              onEdit={can('perfis_acesso', 'editar') ? (pf => { setPerfilEdit(pf); setModo('editar'); window.scrollTo({ top: 0, behavior: 'smooth' }) }) : null}
              onDelete={can('perfis_acesso', 'excluir') ? (pf => setConfirm(pf)) : null} />"""
    text, msg = replace_once(
        text,
        old_callbacks,
        new_callbacks,
        'Perfis: ações granulares nos cards',
    )
    messages.append(msg)
    return text, messages


def transform_wrong_key_page(text, old_module, new_module, wrap_form=True):
    messages = []
    text, msg = replace_all_required(
        text,
        f"can('{old_module}'",
        f"can('{new_module}'",
        f'corrigir chave {old_module} -> {new_module}',
    )
    messages.append(msg)
    if wrap_form:
        condition = (
            f"((!editando && can('{new_module}','criar')) || "
            f"(editando && can('{new_module}','editar')))"
        )
        text, msg = wrap_first_card(text, condition, f'{new_module}: proteger formulário')
        messages.append(msg)
    return text, messages


def transform_formularios(text):
    return transform_wrong_key_page(
        text, 'chamados', 'formularios_chamado', wrap_form=False
    )


def transform_config_email(text):
    messages = []
    text, msg = replace_once(
        text,
        "import { apiFetch } from '../apiFetch';",
        "import { apiFetch } from '../apiFetch';\nimport { useAuth } from '../context/AuthContext';",
        'ConfigEmail: importar useAuth',
    )
    messages.append(msg)
    text, msg = replace_once(
        text,
        "const ConfigEmail = () => {\n    const [formData",
        "const ConfigEmail = () => {\n    const { can } = useAuth();\n    const [formData",
        'ConfigEmail: carregar can()',
    )
    messages.append(msg)
    text, msg = replace_once(
        text,
        "    const handleSubmit = async (e) => {\n        e.preventDefault();",
        "    const handleSubmit = async (e) => {\n        e.preventDefault();\n        if (!can('config_email', 'editar')) {\n            setMessage({ type: 'error', text: 'Você não possui permissão para alterar as configurações.' });\n            return;\n        }",
        'ConfigEmail: bloquear salvamento',
    )
    messages.append(msg)
    text, msg = replace_once(
        text,
        "                        disabled={saving}",
        "                        disabled={saving || !can('config_email', 'editar')}",
        'ConfigEmail: desabilitar Salvar',
    )
    messages.append(msg)
    text = text.replace(
        "disabled={testing || !formData.mail_server}",
        "disabled={testing || !formData.mail_server || !can('config_email', 'editar')}",
    )
    text = text.replace(
        "disabled={triggeringAlerts || !formData.mail_server}",
        "disabled={triggeringAlerts || !formData.mail_server || !can('config_email', 'editar')}",
    )
    messages.append('ALTERAR: ConfigEmail: teste e alertas dependem de editar')
    return text, messages


def transform_marketing(text, kind):
    messages = []
    if re.search(r'const \{\s*user\s*,\s*can\s*\}\s*=\s*useAuth\(\)', text):
        messages.append(f'OK (já aplicado): {kind}: carregar can()')
    else:
        text, count = re.subn(
            r'const \{\s*user\s*\}\s*=\s*useAuth\(\)',
            'const { user, can } = useAuth()',
            text,
            count=1,
        )
        if count != 1:
            raise RuntimeError(f'{kind}: declaração useAuth não encontrada')
        messages.append(f'ALTERAR: {kind}: carregar can()')

    create_labels = {
        'smtp': 'Nova Config',
        'modelos': 'Novo Modelo',
        'campanhas': 'Nova Campanha',
        'notas': 'Nova Nota',
    }
    text, msg = wrap_jsx_button(
        text,
        '<button onClick={abrirNovo}',
        "can('marketing','criar')",
        f"{kind}: botão {create_labels[kind]}",
    )
    messages.append(msg)

    text, msg = wrap_jsx_button(
        text,
        '<button onClick={() => abrirEdit(item)}',
        "can('marketing','editar')",
        f'{kind}: editar',
    )
    messages.append(msg)
    text, msg = wrap_jsx_button(
        text,
        '<button onClick={() => deletar(item.id)}',
        "can('marketing','excluir')",
        f'{kind}: excluir',
    )
    messages.append(msg)

    if kind == 'smtp':
        text, msg = wrap_jsx_button(
            text,
            '<button onClick={() => abrirTeste(item.id)}',
            "can('marketing','editar')",
            'smtp: testar',
        )
        messages.append(msg)
    elif kind == 'campanhas':
        text = text.replace(
            "{(['rascunho', 'agendada', 'enviada', 'erro'].includes(item.status)) && (",
            "{can('marketing','editar') && (['rascunho', 'agendada', 'enviada', 'erro'].includes(item.status)) && (",
        ).replace(
            "{(['rascunho', 'agendada'].includes(item.status)) && (",
            "{can('marketing','editar') && (['rascunho', 'agendada'].includes(item.status)) && (",
        )
    return text, messages


def transform_mobilemed(text):
    messages = []
    text, msg = replace_once(
        text,
        "const { user } = useAuth()",
        "const { user, can } = useAuth()",
        'Mobilemed: carregar can()',
    )
    messages.append(msg)
    text, msg = wrap_jsx_button(
        text,
        '<button onClick={() => { setModal(true); carregarUnidades() }}',
        "can('mobilemed','criar')",
        'Mobilemed: novo relatório',
    )
    messages.append(msg)
    text = text.replace(
        "{rel.status === 'processando' && (",
        "{can('mobilemed','editar') && rel.status === 'processando' && (",
    )
    text, msg = wrap_jsx_button(
        text,
        '<button onClick={() => deletar(rel.id)}',
        "can('mobilemed','excluir')",
        'Mobilemed: excluir relatório',
    )
    messages.append(msg)
    return text, messages


def transform_contadores(text):
    messages = []
    text, msg = replace_once(
        text,
        "const { user } = useAuth()",
        "const { user, can } = useAuth()",
        'Contadores: carregar can()',
    )
    messages.append(msg)

    buttons = (
        (
            '<button\n            onClick={openCreate}',
            "can('contadores_impressora','criar')",
            'Contadores: nova impressora',
        ),
        (
            '<button\n            onClick={atualizarTodas}',
            "can('contadores_impressora','editar')",
            'Contadores: atualizar todas',
        ),
        (
            '<button\n                    onClick={() => consultarAgora(c.id)}',
            "can('contadores_impressora','editar')",
            'Contadores: consultar',
        ),
        (
            '<button\n                    onClick={() => openEdit(c)}',
            "can('contadores_impressora','editar')",
            'Contadores: editar',
        ),
        (
            '<button\n                    onClick={() => removeItem(c)}',
            "can('contadores_impressora','excluir')",
            'Contadores: excluir',
        ),
    )
    for opening, condition, label in buttons:
        text, msg = wrap_jsx_button(text, opening, condition, label)
        messages.append(msg)
    return text, messages


def transform_recebimento(text):
    messages = []
    text, msg = replace_once(
        text,
        "const { user } = useAuth()",
        "const { user, canCompras } = useAuth()\n  const podeReceber = canCompras('pode_marcar_recebimento')",
        'Recebimento: carregar permissão especial',
    )
    messages.append(msg)
    text, msg = replace_once(
        text,
        "  const handleConfirmarRecebimento = async (e) => {\n    e.preventDefault()",
        "  const handleConfirmarRecebimento = async (e) => {\n    e.preventDefault()\n    if (!podeReceber) {\n      setError('Você não possui permissão para registrar recebimentos.')\n      return\n    }",
        'Recebimento: bloquear função',
    )
    messages.append(msg)
    text = text.replace(
        "{['EMITIDA', 'ENVIADA', 'PARCIAL'].includes(ordem.status) ? (",
        "{podeReceber && ['EMITIDA', 'ENVIADA', 'PARCIAL'].includes(ordem.status) ? (",
    )
    messages.append('ALTERAR: Recebimento: esconder botão Receber')
    return text, messages


def transform_orcamentos_compras(text):
    messages = []
    text, msg = replace_once(
        text,
        "const { user } = useAuth()",
        "const { user, can } = useAuth()",
        'Orçamentos Compras: carregar can()',
    )
    messages.append(msg)
    text, msg = wrap_jsx_button(
        text,
        '<button onClick={() => selecionarVencedor(p.id)}',
        "can('compras','editar')",
        'Orçamentos Compras: confirmar vencedor',
    )
    messages.append(msg)
    text, msg = wrap_expression_button(
        text,
        '<button onClick={() => setConfirmando(p.id)}',
        "can('compras','editar')",
        'Orçamentos Compras: abrir confirmação',
    )
    messages.append(msg)
    return text, messages


def transform_config_logo(text):
    messages = []
    text, msg = replace_once(
        text,
        "const { user } = useAuth()",
        "const { user, can } = useAuth()",
        'Logo Compras: carregar can()',
    )
    messages.append(msg)
    text = text.replace(
        '{existe && (',
        "{existe && can('compras','excluir') && (",
        1,
    )
    text = text.replace(
        '<button onClick={handleUpload} disabled={enviando || !file}',
        "<button onClick={handleUpload} disabled={enviando || !file || !(existe ? can('compras','editar') : can('compras','criar'))}",
    )
    messages.append('ALTERAR: Logo Compras: upload/exclusão')
    return text, messages


def transform_pedido(text):
    text, msg = replace_once(
        text,
        "const podeEnviar = can('compras', 'criar') || can('compras', 'editar')",
        "const podeEnviar = can('compras', 'editar')",
        'Pedido Compra: envio exige editar',
    )
    return text, [msg]


def transform_init(text):
    messages = []
    secure_cron_pattern = re.compile(
        r'if\s+path\s+in\s+cron_paths\s*:'
        r'[\s\S]{0,1200}?os\.getenv\(\s*[\'"]'
        r'(?:VIMAX_)?CRON_TOKEN[\'"]'
        r'[\s\S]{0,1200}?request\.headers\.get\(\s*'
        r'[\'"]X-Cron-Token[\'"]'
        r'[\s\S]{0,1200}?compare_digest\s*\(',
        re.I,
    )
    generated_secure_cron = (
        re.search(
            r'os\.getenv\(\s*[\'"]VIMAX_CRON_TOKEN[\'"]\s*\)', text
        )
        and re.search(r'path\s+in\s+cron_paths', text)
        and 'compare_digest' in text
    )
    has_safe_cron = bool(
        secure_cron_pattern.search(text) or generated_secure_cron
    )

    if has_safe_cron:
        messages.append(
            'OK (já aplicado): __init__.py: token seguro de cron'
        )
    elif 'X-Cron-Token' not in text:
        messages.append(
            'OK (não necessário): __init__.py: não há bypass por token de cron'
        )
    else:
        # Aceita variações de comentário, aspas e valor do token legado, mas
        # somente o formato simples e reconhecido. Qualquer implementação de
        # cron diferente continua falhando de forma segura para revisão manual.
        legacy_cron_pattern = re.compile(
            r'(?P<prefix>^(?P<indent>[ \t]*)'
            r'(?:\#[^\n]*cron[^\n]*\n(?P=indent))?)'
            r'cron_token\s*=\s*request\.headers\.get\(\s*'
            r'(?P<header_quote>[\'"])X-Cron-Token(?P=header_quote)\s*\)'
            r'[ \t]*\n'
            r'(?P=indent)if\s+cron_token\s*==\s*'
            r'(?P<token_quote>[\'"])[^\'"\n]+(?P=token_quote)\s*:\s*\n'
            r'(?P=indent)[ \t]+return[ \t]*(?:\#[^\n]*)?$',
            re.I | re.M,
        )
        matches = list(legacy_cron_pattern.finditer(text))
        if len(matches) != 1:
            raise RuntimeError(
                '__init__.py: foi encontrado X-Cron-Token, mas o bloco não '
                'corresponde ao formato legado seguro para conversão automática. '
                'Execute: grep -n -A25 -B5 "X-Cron-Token" '
                'backend/app/__init__.py'
            )

        match = matches[0]
        indent = match.group('indent')
        inner = indent + '    '
        safe_cron = (
            f'{indent}# Token de cron somente para rotas internas '
            'explicitamente autorizadas.\n'
            f"{indent}cron_token = request.headers.get('X-Cron-Token')\n"
            f"{indent}expected_cron_token = os.getenv('VIMAX_CRON_TOKEN')\n"
            f'{indent}cron_paths = (\n'
            f"{inner}'/api/recorrencias/processar',\n"
            f"{inner}'/api/marketing/campanhas/processar-agendamentos',\n"
            f'{indent})\n'
            f'{indent}if (\n'
            f'{inner}expected_cron_token\n'
            f'{inner}and path in cron_paths\n'
            f'{inner}and cron_token\n'
            f"{inner}and __import__('secrets').compare_digest(\n"
            f'{inner}    cron_token, expected_cron_token\n'
            f'{inner})\n'
            f'{indent}):\n'
            f'{inner}return'
        )
        text = text[:match.start()] + safe_cron + text[match.end():]
        messages.append('ALTERAR: __init__.py: remover token fixo de cron')

    # Token na query string fica restrito a leitura. O padrão antigo aceitava
    # ?token= também em POST/PUT/PATCH/DELETE.
    safe_query_token_pattern = re.compile(
        r'^[ \t]*token\s*=\s*request\.headers\.get\(\s*[\'"]X-API-Token'
        r'[\'"]\s*\)[ \t]*\n'
        r'^[ \t]*if\s+request\.method\s+in\s*\([^)]*[\'"]GET[\'"]'
        r'[^)]*[\'"]HEAD[\'"][^)]*\)\s+and\s+not\s+token\s*:[ \t]*\n'
        r'^[ \t]+token\s*=\s*request\.args\.get\(\s*[\'"]token[\'"]\s*\)',
        re.M,
    )
    legacy_query_token_pattern = re.compile(
        r'^(?P<indent>[ \t]*)token[ \t]*=[ \t]*(?P<paren>\()?\s*'
        r'request\.headers\.get\(\s*'
        r'(?P<header_quote>[\'"])X-API-Token(?P=header_quote)\s*\)'
        r'\s+or\s+request\.args\.get\(\s*'
        r'(?P<query_quote>[\'"])token(?P=query_quote)\s*\)'
        r'(?(paren)\s*\))[ \t]*$',
        re.M,
    )
    validation_position = text.find('user.token_valido()')
    safe_query_matches = list(safe_query_token_pattern.finditer(text))
    middleware_safe_query = [
        item for item in safe_query_matches
        if validation_position != -1
        and item.end() <= validation_position
        and validation_position - item.end() < 1500
    ]
    all_query_matches = list(legacy_query_token_pattern.finditer(text))
    query_matches = [
        item for item in all_query_matches
        if validation_position != -1
        and item.end() <= validation_position
        and validation_position - item.end() < 1500
    ]

    if middleware_safe_query:
        messages.append(
            'OK (já aplicado): __init__.py: token da query somente em leitura'
        )
    else:
        if len(query_matches) == 1:
            match = query_matches[0]
            indent = match.group('indent')
            replacement = (
                f"{indent}token = request.headers.get('X-API-Token')\n"
                f"{indent}if request.method in ('GET', 'HEAD') and not token:\n"
                f"{indent}    token = request.args.get('token')"
            )
            text = (
                text[:match.start()] + replacement + text[match.end():]
            )
            messages.append(
                'ALTERAR: __init__.py: restringir token da query a leitura'
            )
        elif len(query_matches) > 1:
            raise RuntimeError(
                '__init__.py: há mais de um carregamento legado de X-API-Token '
                'no middleware principal; a conversão automática foi interrompida'
            )
        else:
            header_token_pattern = re.compile(
                r'^[ \t]*token\s*=\s*request\.headers\.get\(\s*'
                r'[\'"]X-API-Token[\'"]\s*\)',
                re.M,
            )
            header_matches = [
                item for item in header_token_pattern.finditer(text)
                if validation_position != -1
                and item.end() <= validation_position
                and validation_position - item.end() < 1500
            ]
            if len(header_matches) == 1:
                between = text[header_matches[0].end():validation_position]
                if not re.search(
                    r'request\.args\.get\(\s*[\'"]token[\'"]\s*\)', between
                ):
                    messages.append(
                        'OK (não necessário): __init__.py: middleware usa '
                        'somente X-API-Token no header'
                    )
                    header_matches = []
                else:
                    raise RuntimeError(
                        '__init__.py: o carregamento de X-API-Token no middleware '
                        'usa um formato não reconhecido. Execute: grep -n -A12 '
                        '-B5 "X-API-Token" backend/app/__init__.py'
                    )
            elif len(header_matches) > 1:
                raise RuntimeError(
                    '__init__.py: há mais de um X-API-Token antes de '
                    'user.token_valido(); a conversão foi interrompida'
                )
            elif validation_position != -1:
                raise RuntimeError(
                    '__init__.py: não foi possível localizar X-API-Token antes '
                    'de user.token_valido(). Execute: grep -n -A12 -B5 '
                    '"token_valido" backend/app/__init__.py'
                )
            else:
                messages.append(
                    'OK (não necessário): __init__.py: token inseguro na query '
                    'não encontrado'
                )

    policy_marker = re.compile(
        r'permission_error\s*=\s*authorize_api_request\s*\('
    )
    if policy_marker.search(text):
        messages.append(
            'OK (já aplicado): __init__.py: política global de permissões'
        )
        return text, messages

    token_validation_pattern = re.compile(
        r'^(?P<indent>[ \t]*)if\s+not\s+user\s+or\s+not\s+'
        r'user\.token_valido\(\)\s*:[ \t]*\n'
        r'(?P<body_indent>[ \t]+)return\s+jsonify\(\s*\{\s*'
        r'(?=[\s\S]{0,800}?[\'"]error[\'"]\s*:)'
        r'[\s\S]{0,800}?\}\s*\)\s*,\s*401'
        r'[ \t]*(?:\#[^\n]*)?$',
        re.M,
    )
    # A normalização do bloco de X-API-Token acima pode alterar os offsets.
    # Recalcula a primeira validação, que pertence ao middleware global.
    validation_position = text.find('user.token_valido()')
    all_validation_matches = list(token_validation_pattern.finditer(text))
    validation_matches = [
        item for item in all_validation_matches
        if validation_position != -1
        and item.start() <= validation_position < item.end()
    ]
    if len(validation_matches) != 1:
        raise RuntimeError(
            '__init__.py: não foi possível localizar de forma única a '
            'validação user.token_valido(). Execute: grep -n -A12 -B5 '
            '"token_valido" backend/app/__init__.py'
        )

    match = validation_matches[0]
    indent = match.group('indent')
    body_indent = match.group('body_indent')
    additions = []
    if 'user.renovar_token()' not in text:
        additions.extend(
            [
                f'{indent}# Renovação deslizante do token ocorre antes da rota,',
                f'{indent}# em uma transação isolada das alterações do endpoint.',
                f'{indent}user.renovar_token()',
                f'{indent}db.session.commit()',
                '',
            ]
        )
    if 'from .utils.permission_policy import authorize_api_request' not in text:
        additions.append(
            f'{indent}from .utils.permission_policy import authorize_api_request'
        )
    additions.extend(
        [
            f'{indent}permission_error = authorize_api_request('
            'user, path, request.method)',
            f'{indent}if permission_error:',
            f'{body_indent}return permission_error',
        ]
    )
    addition = match.group(0) + '\n\n' + '\n'.join(additions)
    text = text[:match.start()] + addition + text[match.end():]
    messages.append('ALTERAR: __init__.py: ativar política global')
    return text, messages


def transform_report_scope(text):
    if 'def _execute_report_sql(sql):' in text:
        return text, ['OK (já aplicado): Relatórios: escopo por empresa']

    execute_pattern = re.compile(
        r'db\.session\.execute\(\s*text\('
        r'(?P<sql>f?""".*?"""|f?\'\'\'.*?\'\'\'|"[^"\n]*"|\'[^\'\n]*\')'
        r'\)\s*\)',
        re.S,
    )

    def replace_execute(match):
        return f"_execute_report_sql({match.group('sql')})"

    text, count = execute_pattern.subn(replace_execute, text)
    if count < 20:
        raise RuntimeError(
            f'Relatórios: esperado converter ao menos 20 SQLs, encontrados {count}'
        )

    anchor = '''def _get_token(request):
    return request.headers.get("X-API-Token") or request.args.get("token")
'''
    helper = anchor + '''

def _report_company_ids():
    from ..utils.auth import get_current_user_from_request
    from ..utils.filters import get_all_allowed_ids

    user = get_current_user_from_request()
    if not user:
        return tuple()
    if user.role == 'super_admin':
        return None
    if user.role == 'self_service':
        return tuple(user.get_empresa_ids())
    return tuple(get_all_allowed_ids(user.get_empresa_ids()))


def _execute_report_sql(sql):
    """
    Aplica o escopo por empresa também aos relatórios escritos em SQL puro.
    Os IDs são inteiros obtidos do banco, nunca da entrada do cliente.
    """
    import re as _re

    company_ids = _report_company_ids()
    if company_ids is None:
        return db.session.execute(text(sql))

    lowered = sql.lower()
    alias = None
    if _re.search(r'\\bfrom\\s+chamados\\s+c\\b', lowered):
        alias = 'c'
    elif _re.search(r'\\bfrom\\s+chamados\\b', lowered):
        alias = 'chamados'
    elif _re.search(r'\\bfrom\\s+infraestrutura\\b', lowered):
        alias = 'infraestrutura'
    elif (
        _re.search(r'\\bfrom\\s+fornecedores\\s+f\\b', lowered)
        and _re.search(r'\\bjoin\\s+orcamentos\\s+o\\b', lowered)
    ):
        alias = 'o'

    if alias is None:
        return db.session.execute(text(sql))

    condition = '1=0'
    if company_ids:
        ids_sql = ','.join(str(int(company_id)) for company_id in company_ids)
        condition = f'{alias}.empresa_id IN ({ids_sql})'

    boundary = _re.search(
        r'\\b(group\\s+by|having|order\\s+by|limit)\\b',
        lowered,
    )
    insert_at = boundary.start() if boundary else len(sql)
    before = sql[:insert_at]
    after = sql[insert_at:]
    has_where = bool(_re.search(r'\\bwhere\\b', before, _re.I))
    connector = ' AND ' if has_where else ' WHERE '
    scoped_sql = before.rstrip() + connector + condition + ' ' + after.lstrip()
    return db.session.execute(text(scoped_sql))
'''
    text, message = replace_once(
        text,
        anchor,
        helper,
        'Relatórios: helper de SQL com escopo',
    )
    return text, [
        message,
        f'ALTERAR ({count}x): Relatórios: proteger SQL puro',
    ]


def transform_crm_routes(text):
    messages = []
    text, msg = replace_once(
        text,
        """    if role not in CRM_ALLOWED_ROLES:
        return None, (jsonify({'error': 'Acesso negado ao CRM'}), 403)""",
        """    if user.perfil_acesso is None and role not in CRM_ALLOWED_ROLES:
        return None, (jsonify({'error': 'Acesso negado ao CRM'}), 403)""",
        'CRM: aceitar usuário com perfil autorizado',
    )
    messages.append(msg)
    text, msg = replace_once(
        text,
        """def is_admin(user):
    return (user.role or '').lower() in ('super_admin', 'admin')""",
        """def is_admin(user):
    role = (user.role or '').lower()
    return role == 'super_admin' or (
        role == 'admin' and user.perfil_acesso is None
    )""",
        'CRM: admin personalizado continua limitado por empresa',
    )
    messages.append(msg)
    text, msg = replace_once(
        text,
        """    if old_nome != item.nome:
        CRMOpportunity.query.filter_by(status=old_nome).update({'status': item.nome})""",
        """    if old_nome != item.nome:
        opportunity_query = CRMOpportunity.query.filter_by(status=old_nome)
        if user.role != 'super_admin' and item.empresa_id is not None:
            opportunity_query = opportunity_query.filter_by(
                empresa_id=item.empresa_id
            )
        opportunity_query.update({'status': item.nome})""",
        'CRM: renomear status somente dentro da empresa',
    )
    messages.append(msg)
    return text, messages


def transform_crm_task_routes(text):
    messages = []
    text, msg = replace_once(
        text,
        """def _is_admin(u):
    return (u.role or '') in ('super_admin', 'admin')""",
        """def _is_admin(u):
    role = (u.role or '').lower()
    return role == 'super_admin' or (
        role == 'admin' and u.perfil_acesso is None
    )""",
        'Tarefas CRM: admin personalizado limitado',
    )
    messages.append(msg)
    text, msg = replace_once(
        text,
        """    if not u or getattr(u, 'role', None) not in CRM_ROLES:
        return None, (jsonify({'error': 'Nao autenticado'}), 401)""",
        """    if not u:
        return None, (jsonify({'error': 'Nao autenticado'}), 401)
    if u.perfil_acesso is None and getattr(u, 'role', None) not in CRM_ROLES:
        return None, (jsonify({'error': 'Acesso negado'}), 403)""",
        'Tarefas CRM: aceitar perfil autorizado',
    )
    messages.append(msg)
    return text, messages


def transform_crm_reminder_routes(text):
    old = """        criado_por    = getattr(user, 'id', None),
    )"""
    new = """        criado_por    = getattr(user, 'id', None),
        empresa_id    = getattr(user, 'empresa_id', None),
    )"""
    text, msg = replace_once(
        text,
        old,
        new,
        'Lembretes CRM: gravar empresa do usuário',
    )
    return text, [msg]


def transform_simple_role_helper(text, helper_name):
    """
    Mantém o nome do helper antigo, mas permite perfil personalizado.
    A política global já validou a ação específica antes da rota.
    """
    if f'def {helper_name}():' not in text:
        raise RuntimeError(f'{helper_name}: helper não encontrado')
    if 'and user.perfil_acesso is None' in text:
        return text, [f'OK (já aplicado): {helper_name}']

    updated = text.replace(
        "    if user.role != 'super_admin':",
        "    if user.role != 'super_admin' and user.perfil_acesso is None:",
        1,
    )
    updated = updated.replace(
        "    if not user or user.role != 'super_admin':",
        "    if not user:\n        return None, (jsonify({'error': 'Nao autenticado'}), 401)\n    if user.role != 'super_admin' and user.perfil_acesso is None:",
        1,
    )
    if updated == text:
        raise RuntimeError(f'{helper_name}: condição de role não encontrada')
    return updated, [f'ALTERAR: {helper_name}: aceitar perfil autorizado']


TRANSFORMS = {
    'backend/app/__init__.py': transform_init,
    'frontend/src/App.jsx': transform_app,
    'frontend/src/context/AuthContext.jsx': transform_auth_context,
    'frontend/src/pages/PerfilAcesso.jsx': transform_profile_access,
    'frontend/src/pages/CategoriasChamado.jsx': (
        lambda text: transform_wrong_key_page(text, 'chamados', 'tipo_chamado')
    ),
    'frontend/src/pages/TipoServico.jsx': (
        lambda text: transform_wrong_key_page(text, 'chamados', 'tipo_servico')
    ),
    'frontend/src/pages/FormularioChamadoAdmin.jsx': transform_formularios,
    'frontend/src/pages/ConfigEmail.jsx': transform_config_email,
    'frontend/src/pages/MarketingSmtp.jsx': lambda text: transform_marketing(text, 'smtp'),
    'frontend/src/pages/MarketingModelos.jsx': lambda text: transform_marketing(text, 'modelos'),
    'frontend/src/pages/MarketingCampanhas.jsx': lambda text: transform_marketing(text, 'campanhas'),
    'frontend/src/pages/MarketingNotas.jsx': lambda text: transform_marketing(text, 'notas'),
    'frontend/src/pages/Mobilemed.jsx': transform_mobilemed,
    'frontend/src/pages/ContadoresImpressora.jsx': transform_contadores,
    'frontend/src/pages/compras/Recebimento.jsx': transform_recebimento,
    'frontend/src/pages/compras/OrcamentosCompras.jsx': transform_orcamentos_compras,
    'frontend/src/pages/compras/ConfigLogo.jsx': transform_config_logo,
    'frontend/src/pages/compras/PedidoCompra.jsx': transform_pedido,
    'backend/app/routes/log_routes.py': (
        lambda text: transform_simple_role_helper(text, '_require_super_admin_for_logs')
    ),
    'backend/app/routes/mobilemed_routes.py': (
        lambda text: transform_simple_role_helper(text, '_require_super_admin')
    ),
}


REPLACEMENT_FILES = {
    'backend/app/utils/auth.py': AUTH_PY,
    'backend/app/utils/permission_policy.py': PERMISSION_POLICY_PY,
    'backend/app/routes/perfil_acesso_routes.py': PROFILE_ROUTES_V2_PY,
    'backend/app/routes/usuario_routes.py': USER_ROUTES_PY,
    'backend/app/routes/empresa_routes.py': COMPANY_ROUTES_PY,
    'backend/app/routes/fornecedor_routes.py': SUPPLIER_ROUTES_PY,
}


def patch_purchase_filters(text):
    messages = []
    if not any(
        'has_special_permission' in line
        for line in text.splitlines()[:30]
    ):
        old = 'from ..utils.auth import get_current_user_from_request'
        new = 'from ..utils.auth import get_current_user_from_request, has_special_permission'
        text, msg = replace_once(text, old, new, 'Compras: importar permissão especial')
        messages.append(msg)

    replacements = (
        (
            'query = apply_entity_filter(query, RequisicaoCompra, empresa_id, user)',
            """query = apply_entity_filter(query, RequisicaoCompra, empresa_id, user)
        if user and has_special_permission(user, 'compras_ver_somente_proprias'):
            query = query.filter(RequisicaoCompra.usuario_solicitante_id == user.id)""",
            'Compras: filtrar requisições próprias',
        ),
        (
            'query = apply_entity_filter(query, PedidoCompra, empresa_id, user)',
            """query = apply_entity_filter(query, PedidoCompra, empresa_id, user)
        if user and has_special_permission(user, 'compras_ver_somente_proprias'):
            query = query.filter(PedidoCompra.usuario_comprador_id == user.id)""",
            'Compras: filtrar pedidos próprios',
        ),
        (
            'query = apply_entity_filter(query, OrdemCompra, empresa_id, user)',
            """query = apply_entity_filter(query, OrdemCompra, empresa_id, user)
        if user and has_special_permission(user, 'compras_ver_somente_proprias'):
            query = query.join(
                PedidoCompra,
                OrdemCompra.pedido_id == PedidoCompra.id
            ).filter(PedidoCompra.usuario_comprador_id == user.id)""",
            'Compras: filtrar ordens próprias',
        ),
    )
    for old, new, label in replacements:
        if new in text:
            messages.append(f'OK (já aplicado): {label}')
        elif old in text:
            count = text.count(old)
            text = text.replace(old, new)
            messages.append(f'ALTERAR ({count}x): {label}')
        else:
            raise RuntimeError(f'{label}: trecho não encontrado')
    return text, messages


TRANSFORMS['backend/app/routes/compra_routes.py'] = patch_purchase_filters
TRANSFORMS['backend/app/routes/relatorio_routes.py'] = transform_report_scope
TRANSFORMS['backend/app/routes/crm_routes.py'] = transform_crm_routes
TRANSFORMS['backend/app/routes/crm_task_routes.py'] = transform_crm_task_routes
TRANSFORMS['backend/app/routes/crm_reminder_routes.py'] = (
    transform_crm_reminder_routes
)


def compile_python_sources(project_root: Path, pending: dict[Path, str]):
    temp_root = project_root / '.permission_fix_compile_tmp'
    if temp_root.exists():
        shutil.rmtree(temp_root)
    temp_root.mkdir(parents=True)
    try:
        for path, content in pending.items():
            if path.suffix != '.py':
                continue
            temp = temp_root / path.name
            temp.write_text(content, encoding='utf-8')
            py_compile.compile(str(temp), doraise=True)
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True, help='Raiz do projeto Vimax')
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--check', action='store_true')
    mode.add_argument('--apply', action='store_true')
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if not (root / 'backend/app').is_dir() or not (root / 'frontend/src').is_dir():
        print(f'ERRO: estrutura do Vimax não encontrada em {root}', file=sys.stderr)
        return 2

    pending: dict[Path, str] = {}
    messages = []

    try:
        for relative, content in REPLACEMENT_FILES.items():
            path = root / relative
            if not path.parent.is_dir():
                raise RuntimeError(f'Pasta não encontrada: {path.parent}')
            current = path.read_text(encoding='utf-8') if path.exists() else ''
            pending[path] = content
            status = 'OK (idêntico)' if current == content else 'SUBSTITUIR'
            messages.append(f'{status}: {relative}')

        for relative, transform in TRANSFORMS.items():
            path = root / relative
            if not path.is_file():
                raise RuntimeError(f'Arquivo não encontrado: {relative}')
            original = path.read_text(encoding='utf-8')
            updated, file_messages = transform(original)
            pending[path] = updated
            messages.extend(f'{relative}: {message}' for message in file_messages)

        compile_python_sources(root, pending)
    except Exception as exc:
        print(f'ERRO DE VALIDAÇÃO: {exc}', file=sys.stderr)
        print('Nenhum arquivo foi alterado.', file=sys.stderr)
        return 1

    for message in messages:
        print(message)

    changed = {
        path: content
        for path, content in pending.items()
        if not path.exists() or path.read_text(encoding='utf-8') != content
    }

    print(f'\nArquivos que serão alterados: {len(changed)}')
    if args.check:
        print('CHECK concluído. Nenhum arquivo foi alterado.')
        return 0

    timestamp = dt.datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_root = root.parent / f'vimax_permissions_backup_{timestamp}'
    backup_root.mkdir(parents=True)

    for path in changed:
        if path.exists():
            relative = path.relative_to(root)
            destination = backup_root / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, destination)

    for path, content in changed.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding='utf-8')

    print(f'Backup criado em: {backup_root}')
    print('Correção aplicada com sucesso.')
    print('Próximo passo: compile o backend e gere o build/reinicie o frontend.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
