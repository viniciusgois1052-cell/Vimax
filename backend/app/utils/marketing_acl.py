# -*- coding: utf-8 -*-
"""
Helpers de controle de acesso para registros de Marketing.

Regra:
 - super_admin ve/edita/exclui TUDO (de qualquer usuario).
 - Demais usuarios (admin/marketing/etc) so veem o que ELES criaram.
"""
from flask import jsonify


def is_super(user):
    return bool(user) and (user.role or '').lower() == 'super_admin'


def filter_owned(query, model, user):
    """
    Aplica filter_by(criado_por=user.id) ao Query, exceto para super_admin.
    Para registros antigos sem criado_por (NULL) tambem ficam ocultos para
    nao-super_admin.
    """
    if not user:
        # sem usuario logado: nada
        return query.filter(model.id == -1)
    if is_super(user):
        return query
    return query.filter(model.criado_por == user.id)


def can_access(user, obj):
    """True se o usuario pode ver/editar/excluir esse objeto de marketing."""
    if not user:
        return False
    if is_super(user):
        return True
    return getattr(obj, 'criado_por', None) == user.id


def forbidden():
    return jsonify({'error': 'Acesso negado: registro pertence a outro usuario.'}), 403
