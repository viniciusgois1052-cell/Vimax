from flask import Blueprint, request, jsonify
from ..models.log import Log
from ..models.usuario import Usuario
from .. import db
from sqlalchemy import desc
from datetime import datetime
from ..utils.logging import create_log

log_bp = Blueprint('log_bp', __name__)

def _require_super_admin_for_logs():
    api_token = request.headers.get('X-API-Token')
    if not api_token:
        return None, (jsonify({'error': 'Nao autenticado'}), 401)
    user = Usuario.query.filter_by(api_token=api_token).first()
    if not user:
        return None, (jsonify({'error': 'Nao autenticado'}), 401)
    if user.role != 'super_admin':
        return None, (jsonify({'error': 'Apenas Super Admin'}), 403)
    return user, None


@log_bp.route('', methods=['GET'])
def list_logs():
    user, err = _require_super_admin_for_logs()
    if err:
        return err

    """
    GET /api/logs
    Query params:
      - page (default 1)
      - per_page (default 50)
      - q (busca livre em username, action, details, entity)
      - user_id
      - entity
      - action
      - date_from (ISO)
      - date_to (ISO)
    """
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))
    q = (request.args.get('q') or '').strip()
    user_id = request.args.get('user_id')
    entity = request.args.get('entity')
    action = request.args.get('action')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = Log.query

    if q:
        like = f"%{q}%"
        query = query.filter(
            (Log.username.ilike(like)) |
            (Log.action.ilike(like)) |
            (Log.details.ilike(like)) |
            (Log.entity.ilike(like))
        )
    if user_id:
        try:
            query = query.filter(Log.user_id == int(user_id))
        except Exception:
            pass
    if entity:
        query = query.filter(Log.entity == entity)
    if action:
        query = query.filter(Log.action == action)
    if date_from:
        try:
            df = datetime.fromisoformat(date_from)
            query = query.filter(Log.timestamp >= df)
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            query = query.filter(Log.timestamp <= dt)
        except Exception:
            pass

    total = query.count()
    logs = query.order_by(desc(Log.timestamp)).offset((page - 1) * per_page).limit(per_page).all()

    data = []
    for l in logs:
        data.append({
            'id': l.id,
            'timestamp': l.timestamp.isoformat(),
            'user_id': l.user_id,
            'username': l.username,
            'entity': l.entity,
            'entity_id': l.entity_id,
            'action': l.action,
            'details': l.details,
            'ip': l.ip
        })

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'logs': data
    })


@log_bp.route('', methods=['POST'])
def receive_log():
    """
    POST /api/logs
    Body JSON:
      { action, entity, entity_id, details }
    Optional: X-API-Token header to associate user automatically.
    """
    data = request.get_json() or {}
    api_token = request.headers.get('X-API-Token')
    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()

    action = data.get('action', '') or ''
    entity = data.get('entity')
    entity_id = data.get('entity_id')
    details = data.get('details')

    log = create_log(user=user, action=action, entity=entity, entity_id=entity_id, details=details, req=request)
    if not log:
        return jsonify({'ok': False, 'error': 'failed_to_create_log'}), 500

    return jsonify({'ok': True, 'id': log.id}), 201
