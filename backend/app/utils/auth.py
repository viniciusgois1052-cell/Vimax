from functools import wraps

from flask import request, jsonify, g

from ..models.usuario import Usuario
from .. import db


ACOES_PERMITIDAS = {
    'ver',
    'criar',
    'editar',
    'excluir',
}


def get_current_user_from_request(req=None):
    req = req or request
    api_token = req.headers.get('X-API-Token')

    if not api_token:
        return None

    user = Usuario.query.filter_by(api_token=api_token).first()

    if not user or not user.token_valido():
        return None

    user.renovar_token()
    db.session.flush()

    return user


def has_permission(user, modulo, acao):
    """
    Verifica uma permissão personalizada.

    Regras:
    - super_admin: acesso total.
    - admin sem perfil personalizado: acesso total, mantendo compatibilidade.
    - usuário com perfil personalizado: obedece rigorosamente ao perfil.
    - outras funções sem perfil personalizado: sem acesso por esta função.
    - permissões inexistentes são negadas.
    """
    if not user:
        return False

    role = (user.role or '').strip().lower()

    if role == 'super_admin':
        return True

    if acao not in ACOES_PERMITIDAS:
        return False

    if not isinstance(modulo, str) or not modulo.strip():
        return False

    modulo = modulo.strip().lower()
    chave_permissao = f'{modulo}_{acao}'

    perfil = user.perfil_acesso

    if perfil is not None:
        if not hasattr(perfil, chave_permissao):
            return False

        return bool(getattr(perfil, chave_permissao, False))

    # Compatibilidade com administradores antigos ainda sem perfil personalizado.
    if role == 'admin':
        return True

    return False


def require_permission(modulo, acao):
    """
    Uso dentro da função da rota:

        user, err = require_permission('ativos', 'editar')
        if err:
            return err
    """
    user = get_current_user_from_request()

    if not user:
        return None, (
            jsonify({'error': 'Não autenticado'}),
            401
        )

    if not has_permission(user, modulo, acao):
        return None, (
            jsonify({
                'error': 'Acesso negado',
                'permission': f'{modulo}_{acao}'
            }),
            403
        )

    return user, None


def permission_required(modulo, acao):
    """
    Decorador recomendado para proteger uma rota.

        @blueprint.route('', methods=['POST'])
        @permission_required('ativos', 'criar')
        def criar_ativo():
            user = g.current_user
    """
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
    Mantido temporariamente para compatibilidade com as rotas antigas.

    As rotas dos módulos devem ser migradas gradualmente para:
        require_permission()
        permission_required()
    """
    user = get_current_user_from_request()

    if not user:
        return None, (
            jsonify({'error': 'Não autenticado'}),
            401
        )

    if user.role == 'super_admin':
        return user, None

    if user.role not in roles:
        return None, (
            jsonify({'error': 'Acesso negado'}),
            403
        )

    return user, None


def require_any_auth():
    user = get_current_user_from_request()

    if not user:
        return None, (
            jsonify({'error': 'Não autenticado'}),
            401
        )

    return user, None