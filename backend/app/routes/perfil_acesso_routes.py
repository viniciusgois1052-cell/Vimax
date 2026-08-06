from flask import Blueprint, request, jsonify
from ..models.perfil_acesso import PerfilAcesso
from ..models.usuario import Usuario
from .. import db

perfil_acesso_bp = Blueprint('perfil_acesso_bp', __name__)

def get_current_user():
    api_token = request.headers.get('X-API-Token')
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
        if user and user.token_valido():
            user.renovar_token()
            db.session.commit()
            return user
    return None

def require_super_admin():
    user = get_current_user()
    if not user:
        return None, (jsonify({'error': 'Nao autenticado'}), 401)
    if user.role != 'super_admin':
        return None, (jsonify({'error': 'Acesso negado'}), 403)
    return user, None

# ── LIST ──────────────────────────────────────────────────────────
@perfil_acesso_bp.route('', methods=['GET'])
def listar():
    user, err = require_super_admin()
    if err: return err
    perfis = PerfilAcesso.query.order_by(PerfilAcesso.nome).all()
    return jsonify([p.to_dict() for p in perfis])

# ── GET ONE ───────────────────────────────────────────────────────
@perfil_acesso_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    user, err = require_super_admin()
    if err: return err
    p = PerfilAcesso.query.get_or_404(id)
    return jsonify(p.to_dict())

# ── CREATE ────────────────────────────────────────────────────────
@perfil_acesso_bp.route('', methods=['POST'])
def criar():
    user, err = require_super_admin()
    if err: return err
    data = request.get_json()
    if not data.get('nome'):
        return jsonify({'error': 'Nome obrigatorio'}), 400
    if PerfilAcesso.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Perfil com esse nome ja existe'}), 409
    p = PerfilAcesso()
    for col in PerfilAcesso.__table__.columns:
        if col.name in ('id', 'criado_em', 'atualizado_em'):
            continue
        if col.name in data:
            # CORREÇÃO: Aceitar explicitamente False para campos booleanos
            valor = data[col.name]
            if col.type.python_type == bool:
                # Garantir que False seja aceito, não apenas True
                setattr(p, col.name, bool(valor) if valor is not None else False)
            else:
                setattr(p, col.name, valor)
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_dict()), 201

# ── UPDATE ────────────────────────────────────────────────────────
@perfil_acesso_bp.route('/<int:id>', methods=['PUT'])
def atualizar(id):
    user, err = require_super_admin()
    if err: return err
    p = PerfilAcesso.query.get_or_404(id)
    data = request.get_json()
    conflito = PerfilAcesso.query.filter(
        PerfilAcesso.nome == data.get('nome', p.nome),
        PerfilAcesso.id != id
    ).first()
    if conflito:
        return jsonify({'error': 'Perfil com esse nome ja existe'}), 409
    for col in PerfilAcesso.__table__.columns:
        if col.name in ('id', 'criado_em', 'atualizado_em'):
            continue
        if col.name in data:
            # CORREÇÃO: Aceitar explicitamente False para campos booleanos
            valor = data[col.name]
            if col.type.python_type == bool:
                # Garantir que False seja aceito, não apenas True
                setattr(p, col.name, bool(valor) if valor is not None else False)
            else:
                setattr(p, col.name, valor)
    db.session.commit()
    return jsonify(p.to_dict())

# ── DELETE ────────────────────────────────────────────────────────
@perfil_acesso_bp.route('/<int:id>', methods=['DELETE'])
def excluir(id):
    user, err = require_super_admin()
    if err: return err
    p = PerfilAcesso.query.get_or_404(id)
    db.session.delete(p)
    db.session.commit()
    return jsonify({'ok': True})