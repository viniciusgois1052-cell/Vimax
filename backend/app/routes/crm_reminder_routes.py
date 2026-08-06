# -*- coding: utf-8 -*-
from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import asc
from .. import db
from ..models.usuario import Usuario
from ..models.crm_reminder import CRMReminder, CRMReminderConfig

crm_reminder_bp = Blueprint('crm_reminder_bp', __name__)

def get_current_user():
    token = request.headers.get('X-API-Token')
    if not token:
        return None
    return Usuario.query.filter_by(api_token=token).first()

CRM_ACTION_BY_METHOD = {
    'GET': 'ver',
    'POST': 'criar',
    'PUT': 'editar',
    'PATCH': 'editar',
    'DELETE': 'excluir',
}

def require_user(action=None):
    user = get_current_user()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)

    role = (user.role or '').lower()
    if role == 'super_admin':
        return user, None

    perfil = getattr(user, 'perfil_acesso', None)
    if perfil is not None:
        required_action = action or CRM_ACTION_BY_METHOD.get(request.method, 'ver')
        if not bool(getattr(perfil, f'crm_{required_action}', False)):
            return None, (
                jsonify({'error': 'Sem permissão para esta ação no CRM'}),
                403
            )
    return user, None

# ── Lembretes específicos ──────────────────────────────────────────────────────

@crm_reminder_bp.route('', methods=['GET'])
def list_reminders():
    user, err = require_user()
    if err: return err
    entity_type = request.args.get('entity_type', '').strip()
    entity_id   = request.args.get('entity_id', '').strip()
    query = CRMReminder.query
    if entity_type: query = query.filter_by(entity_type=entity_type)
    if entity_id:   query = query.filter_by(entity_id=int(entity_id))
    items = query.order_by(asc(CRMReminder.data_hora)).all()
    return jsonify([r.to_dict() for r in items]), 200

@crm_reminder_bp.route('', methods=['POST'])
def create_reminder():
    user, err = require_user()
    if err: return err
    data = request.get_json() or {}
    try:
        data_hora = datetime.fromisoformat(data['data_hora'])
    except Exception:
        return jsonify({'error': 'data_hora inválida (use ISO 8601)'}), 400
    item = CRMReminder(
        entity_type   = data.get('entity_type', 'opportunity'),
        entity_id     = data.get('entity_id'),
        titulo        = data.get('titulo', 'Lembrete'),
        descricao     = data.get('descricao') or None,
        data_hora     = data_hora,
        email_destino = data.get('email_destino', ''),
        smtp_id       = data.get('smtp_id') or None,
        criado_por    = getattr(user, 'id', None),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@crm_reminder_bp.route('/<int:rid>', methods=['DELETE'])
def delete_reminder(rid):
    user, err = require_user()
    if err: return err
    item = CRMReminder.query.get_or_404(rid)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'ok': True}), 200

# ── Config global ──────────────────────────────────────────────────────────────

@crm_reminder_bp.route('/config', methods=['GET'])
def get_config():
    user, err = require_user()
    if err: return err
    cfg = CRMReminderConfig.query.first()
    if not cfg:
        cfg = CRMReminderConfig()
        db.session.add(cfg)
        db.session.commit()
    return jsonify(cfg.to_dict()), 200

@crm_reminder_bp.route('/config', methods=['PUT'])
def update_config():
    user, err = require_user()
    if err: return err
    cfg = CRMReminderConfig.query.first()
    if not cfg:
        cfg = CRMReminderConfig()
        db.session.add(cfg)
    data = request.get_json() or {}
    if 'ativo'         in data: cfg.ativo         = data['ativo']
    if 'hora_envio'    in data: cfg.hora_envio     = data['hora_envio']
    if 'antecedencia'  in data: cfg.antecedencia   = int(data['antecedencia'])
    if 'email_destino' in data: cfg.email_destino  = data['email_destino']
    if 'smtp_id'       in data: cfg.smtp_id        = data['smtp_id'] or None
    db.session.commit()
    return jsonify(cfg.to_dict()), 200
