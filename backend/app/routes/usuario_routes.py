from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from flask import Blueprint, request, jsonify
from ..models.usuario import Usuario
from ..models.empresa import Empresa
from .. import db, bcrypt
from ..utils.logging import create_log

usuario_bp = Blueprint('usuario_bp', __name__)
limiter = Limiter(key_func=get_remote_address, default_limits=[])

def get_current_user():
    from .. import db
    api_token = request.headers.get('X-API-Token')
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
        if user and user.token_valido():
            user.renovar_token()   # renova 8h a cada requisição ativa
            db.session.commit()
            return user
        return None
    return None

def require_roles(*roles):
    user = get_current_user()
    if not user:
        return None, (jsonify({'error': 'Nao autenticado'}), 401)
    if user.role not in roles:
        return None, (jsonify({'error': 'Acesso negado'}), 403)
    return user, None

def _sync_empresas(usuario, empresa_ids_raw):
    """Sincroniza a lista de empresas vinculadas ao usuário (many-to-many)."""
    ids = []
    for v in (empresa_ids_raw or []):
        try:
            ids.append(int(v))
        except (ValueError, TypeError):
            pass

    if ids:
        empresas = Empresa.query.filter(Empresa.id.in_(ids)).all()
        usuario.empresas = empresas
        # empresa_id principal = primeiro da lista (compatibilidade)
        usuario.empresa_id = ids[0]
    else:
        usuario.empresas = []
        usuario.empresa_id = None

@usuario_bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute')
def login():
    data     = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Usuario e senha sao obrigatorios'}), 400

    user = Usuario.query.filter_by(username=username).first()

    if user and bcrypt.check_password_hash(user.password_hash, password):
        if not user.api_token or not user.token_valido():
            user.generate_api_token()
            db.session.commit()
        user_data = user.to_dict()
        try:
            create_log(user=user, action='login_success', entity='usuario', entity_id=user.id,
                       details={'username': username}, req=request)
        except Exception:
            pass
        user_data['api_token'] = user.api_token
        return jsonify(user_data), 200

    try:
        create_log(user=None, action='login_failed', entity='usuario', entity_id=None,
                   details={'username': username}, req=request)
    except Exception:
        pass
    return jsonify({'error': 'Usuario ou senha invalidos'}), 401

@usuario_bp.route('', methods=['GET'])
def get_usuarios():
    user, err = require_roles('super_admin', 'admin')
    if err: return err

    if user.role == 'admin':
        empresa_ids = user.get_empresa_ids()
        if not empresa_ids:
            usuarios = []
        else:
            usuarios = Usuario.query.filter(Usuario.empresa_id.in_(empresa_ids)).all()
    else:
        usuarios = Usuario.query.all()

    return jsonify([u.to_dict() for u in usuarios])

@usuario_bp.route('', methods=['POST'])
def create_usuario():
    user, err = require_roles('super_admin', 'admin')
    if err: return err

    data = request.get_json()

    if Usuario.query.filter_by(username=data.get('username')).first():
        return jsonify({'error': 'Nome de usuario ja existe'}), 400

    role_solicitado = data.get('role', 'admin')

    if user.role == 'admin' and role_solicitado == 'super_admin':
        return jsonify({'error': 'Acesso negado: admin nao pode criar super_admin'}), 403

    hashed_password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')

    novo_usuario = Usuario(
        username      = data.get('username'),
        nome_completo = data.get('nome_completo', ''),
        email         = data.get('email'),
        password_hash = hashed_password,
        role          = role_solicitado,
        perfil_acesso_id = data.get('perfil_acesso_id') or None
    )

    novo_usuario.generate_api_token()
    db.session.add(novo_usuario)
    db.session.flush()  # gera o ID antes de sincronizar empresas

    # Salva lista de empresas (nova estrutura) ou fallback para empresa_id único
    empresa_ids = data.get('empresas_ids') or data.get('empresa_ids') or (
        [data['empresa_id']] if data.get('empresa_id') not in (None, 'none', '', 0) else []
    )
    _sync_empresas(novo_usuario, empresa_ids)

    db.session.commit()

    try:
        create_log(user=user, action='create_usuario', entity='usuario', entity_id=novo_usuario.id,
                   details={'payload': {k: v for k, v in (data or {}).items() if k != 'password'}}, req=request)
    except Exception:
        pass

    return jsonify(novo_usuario.to_dict()), 201

@usuario_bp.route('/<int:id>', methods=['GET'])
def get_usuario(id):
    current_user, err = require_roles('super_admin', 'admin')
    if err: return err
    usuario = Usuario.query.get_or_404(id)
    return jsonify(usuario.to_dict())

@usuario_bp.route('/<int:id>', methods=['PUT'])
def update_usuario(id):
    current_user, err = require_roles('super_admin', 'admin')
    if err: return err

    usuario = Usuario.query.get_or_404(id)
    data    = request.get_json()

    before = None
    try:
        before = usuario.to_dict()
    except Exception:
        before = None

    if current_user.role == 'admin':
        if usuario.role == 'super_admin':
            return jsonify({'error': 'Acesso negado'}), 403
        if data.get('role') == 'super_admin':
            return jsonify({'error': 'Acesso negado: admin nao pode promover para super_admin'}), 403

    usuario.username      = data.get('username', usuario.username)
    usuario.nome_completo = data.get('nome_completo', usuario.nome_completo)
    usuario.email         = data.get('email', usuario.email)
    usuario.role          = data.get('role', usuario.role)
    if 'perfil_acesso_id' in data:
        usuario.perfil_acesso_id = data.get('perfil_acesso_id') or None

    if data.get('password'):
        usuario.password_hash = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')

    # Salva lista de empresas (nova estrutura) ou fallback para empresa_id único
    empresa_ids = data.get('empresas_ids') or data.get('empresa_ids') or (
        [data['empresa_id']] if data.get('empresa_id') not in (None, 'none', '', 0) else []
    )
    _sync_empresas(usuario, empresa_ids)

    db.session.commit()

    try:
        payload = dict(data or {})
        if 'password' in payload:
            payload['password'] = '***'
        create_log(user=current_user, action='update_usuario', entity='usuario', entity_id=id,
                   details={'before': before, 'after_payload': payload}, req=request)
    except Exception:
        pass

    return jsonify(usuario.to_dict()), 200

@usuario_bp.route('/<int:id>', methods=['DELETE'])
def delete_usuario(id):
    current_user, err = require_roles('super_admin', 'admin')
    if err: return err

    usuario = Usuario.query.get_or_404(id)

    if current_user.role == 'admin' and usuario.role == 'super_admin':
        return jsonify({'error': 'Acesso negado'}), 403

    snapshot = None
    try:
        snapshot = usuario.to_dict()
    except Exception:
        snapshot = None

    db.session.delete(usuario)
    db.session.commit()

    try:
        create_log(user=current_user, action='delete_usuario', entity='usuario', entity_id=id,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass

    return '', 204

@usuario_bp.route('/<int:id>/token', methods=['POST'])
def generate_token(id):
    current_user, err = require_roles('super_admin', 'admin')
    if err: return err

    usuario = Usuario.query.get_or_404(id)
    token   = usuario.generate_api_token()
    db.session.commit()

    try:
        create_log(user=current_user, action='generate_token', entity='usuario', entity_id=id,
                   details={'target_user': usuario.username}, req=request)
    except Exception:
        pass

    return jsonify({'token': token})

@usuario_bp.route('/membros', methods=['GET'])
def get_membros():
    """Retorna usuários da mesma empresa — acessível a qualquer usuário autenticado."""
    from ..utils.auth import get_current_user_from_request
    user = get_current_user_from_request()
    if not user:
        return jsonify({'error': 'Não autenticado'}), 401
    if (user.role or '').lower() == 'super_admin':
        membros = Usuario.query.order_by(Usuario.username).all()
    else:
        membros = Usuario.query.filter_by(empresa_id=user.empresa_id).order_by(Usuario.username).all()
    return jsonify([{'id': u.id, 'username': u.username} for u in membros])


@usuario_bp.route('/logout', methods=['POST'])
def logout():
    """Logout real — revoga o token no banco"""
    from .. import db
    token = request.headers.get('X-API-Token')
    if token:
        user = Usuario.query.filter_by(api_token=token).first()
        if user:
            user.revogar_token()
            db.session.commit()
    return jsonify({'success': True, 'message': 'Logout realizado'}), 200

