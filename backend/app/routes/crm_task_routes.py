# -*- coding: utf-8 -*-
from datetime import datetime
from flask import Blueprint, request, jsonify
from .. import db
from ..models.usuario import Usuario
from ..models.crm_task_preset import CRMTaskPreset
from ..models.crm_task import CRMTask
from ..models.crm_task_group import CRMTaskGroup, CRMTaskGroupItem
from ..models.crm_opportunity import CRMOpportunity

crm_task_bp = Blueprint('crm_task_bp', __name__)

# ── helpers ───────────────────────────────────────────────────────────────────
def _g():
    t = request.headers.get('X-API-Token')
    return Usuario.query.filter_by(api_token=t).first() if t else None

CRM_ROLES = {'super_admin', 'admin', 'marketing'}

def _is_admin(u):
    return (u.role or '') in ('super_admin', 'admin')

def _get_empresas(u):
    if _is_admin(u): return None
    ids = set()
    if u.empresa_id: ids.add(u.empresa_id)
    raw = getattr(u, 'empresas_ids', None)
    if raw:
        try:
            extra = raw if isinstance(raw, list) else __import__('json').loads(raw)
            for eid in extra:
                if eid: ids.add(int(eid))
        except: pass
    return list(ids) if ids else []

def _can_access_opp(u, oid):
    if _is_admin(u): return True
    opp = CRMOpportunity.query.get(oid)
    if not opp: return False
    empresas = _get_empresas(u)
    if empresas is None: return True
    if not empresas: return False
    return opp.empresa_id in empresas

CRM_ACTION_BY_METHOD = {
    'GET': 'ver',
    'POST': 'criar',
    'PUT': 'editar',
    'PATCH': 'editar',
    'DELETE': 'excluir',
}

def _has_crm_permission(u, action):
    role = (u.role or '').lower()
    if role == 'super_admin':
        return True
    perfil = getattr(u, 'perfil_acesso', None)
    if perfil is None:
        return True
    return bool(getattr(perfil, f'crm_{action}', False))

def _a(action=None):
    u = _g()
    if not u or getattr(u, 'role', None) not in CRM_ROLES:
        return None, (jsonify({'error': 'Nao autenticado'}), 401)
    required_action = action or CRM_ACTION_BY_METHOD.get(request.method, 'ver')
    if not _has_crm_permission(u, required_action):
        return None, (jsonify({'error': 'Sem permissao para esta acao no CRM'}), 403)
    return u, None

# ── Presets simples (legado) ──────────────────────────────────────────────────
@crm_task_bp.route('/presets', methods=['GET'])
def list_presets():
    u, e = _a()
    if e: return e
    return jsonify([i.to_dict() for i in
        CRMTaskPreset.query.filter_by(ativo=True)
        .order_by(CRMTaskPreset.ordem, CRMTaskPreset.id).all()]), 200

@crm_task_bp.route('/presets', methods=['POST'])
def create_preset():
    u, e = _a()
    if e: return e
    d = request.get_json() or {}
    if not d.get('titulo', '').strip(): return jsonify({'error': 'Titulo obrigatorio'}), 400
    mx = db.session.query(db.func.max(CRMTaskPreset.ordem)).scalar() or 0
    item = CRMTaskPreset(titulo=d['titulo'].strip(), descricao=d.get('descricao') or None, ordem=mx+1)
    db.session.add(item); db.session.commit()
    return jsonify(item.to_dict()), 201

@crm_task_bp.route('/presets/<int:pid>', methods=['PUT'])
def update_preset(pid):
    u, e = _a()
    if e: return e
    item = CRMTaskPreset.query.get(pid)
    if not item: return jsonify({'error': 'Nao encontrado'}), 404
    d = request.get_json() or {}
    if 'titulo'    in d: item.titulo    = d['titulo'].strip()
    if 'descricao' in d: item.descricao = d['descricao'] or None
    if 'ordem'     in d: item.ordem     = d['ordem']
    if 'ativo'     in d: item.ativo     = bool(d['ativo'])
    db.session.commit()
    return jsonify(item.to_dict()), 200

@crm_task_bp.route('/presets/<int:pid>', methods=['DELETE'])
def delete_preset(pid):
    u, e = _a()
    if e: return e
    item = CRMTaskPreset.query.get(pid)
    if not item: return jsonify({'error': 'Nao encontrado'}), 404
    item.ativo = False; db.session.commit()
    return jsonify({'ok': True}), 200

# ── Grupos (pastas) — filtrados por usuario_id ────────────────────────────────
@crm_task_bp.route('/groups', methods=['GET'])
def list_groups():
    u, e = _a()
    if e: return e
    groups = CRMTaskGroup.query.filter_by(ativo=True, usuario_id=u.id)\
        .order_by(CRMTaskGroup.ordem, CRMTaskGroup.id).all()
    return jsonify([g.to_dict(with_items=True) for g in groups]), 200

@crm_task_bp.route('/groups', methods=['POST'])
def create_group():
    u, e = _a()
    if e: return e
    d = request.get_json() or {}
    if not d.get('titulo', '').strip(): return jsonify({'error': 'Titulo obrigatorio'}), 400
    mx = db.session.query(db.func.max(CRMTaskGroup.ordem))\
        .filter_by(usuario_id=u.id).scalar() or 0
    g = CRMTaskGroup(usuario_id=u.id, titulo=d['titulo'].strip(),
                     descricao=d.get('descricao') or None, ordem=mx+1)
    db.session.add(g); db.session.commit()
    return jsonify(g.to_dict(with_items=True)), 201

@crm_task_bp.route('/groups/<int:gid>', methods=['PUT'])
def update_group(gid):
    u, e = _a()
    if e: return e
    g = CRMTaskGroup.query.filter_by(id=gid, usuario_id=u.id).first()
    if not g: return jsonify({'error': 'Nao encontrado'}), 404
    d = request.get_json() or {}
    if 'titulo'    in d: g.titulo    = d['titulo'].strip()
    if 'descricao' in d: g.descricao = d['descricao'] or None
    if 'ordem'     in d: g.ordem     = d['ordem']
    if 'ativo'     in d: g.ativo     = bool(d['ativo'])
    db.session.commit()
    return jsonify(g.to_dict(with_items=True)), 200

@crm_task_bp.route('/groups/<int:gid>', methods=['DELETE'])
def delete_group(gid):
    u, e = _a()
    if e: return e
    g = CRMTaskGroup.query.filter_by(id=gid, usuario_id=u.id).first()
    if not g: return jsonify({'error': 'Nao encontrado'}), 404
    g.ativo = False; db.session.commit()
    return jsonify({'ok': True}), 200

# ── Itens dentro de um grupo ──────────────────────────────────────────────────
@crm_task_bp.route('/groups/<int:gid>/items', methods=['POST'])
def create_group_item(gid):
    u, e = _a()
    if e: return e
    g = CRMTaskGroup.query.filter_by(id=gid, usuario_id=u.id).first()
    if not g: return jsonify({'error': 'Grupo nao encontrado'}), 404
    d = request.get_json() or {}
    if not d.get('titulo', '').strip(): return jsonify({'error': 'Titulo obrigatorio'}), 400
    mx = db.session.query(db.func.max(CRMTaskGroupItem.ordem))\
        .filter_by(group_id=gid).scalar() or 0
    item = CRMTaskGroupItem(group_id=gid, titulo=d['titulo'].strip(),
                            descricao=d.get('descricao') or None, ordem=mx+1)
    db.session.add(item); db.session.commit()
    return jsonify(item.to_dict()), 201

@crm_task_bp.route('/groups/<int:gid>/items/<int:iid>', methods=['PUT'])
def update_group_item(gid, iid):
    u, e = _a()
    if e: return e
    g = CRMTaskGroup.query.filter_by(id=gid, usuario_id=u.id).first()
    if not g: return jsonify({'error': 'Grupo nao encontrado'}), 404
    item = CRMTaskGroupItem.query.filter_by(id=iid, group_id=gid).first()
    if not item: return jsonify({'error': 'Nao encontrado'}), 404
    d = request.get_json() or {}
    if 'titulo'    in d: item.titulo    = d['titulo'].strip()
    if 'descricao' in d: item.descricao = d['descricao'] or None
    if 'ordem'     in d: item.ordem     = d['ordem']
    if 'ativo'     in d: item.ativo     = bool(d['ativo'])
    db.session.commit()
    return jsonify(item.to_dict()), 200

@crm_task_bp.route('/groups/<int:gid>/items/<int:iid>', methods=['DELETE'])
def delete_group_item(gid, iid):
    u, e = _a()
    if e: return e
    g = CRMTaskGroup.query.filter_by(id=gid, usuario_id=u.id).first()
    if not g: return jsonify({'error': 'Grupo nao encontrado'}), 404
    item = CRMTaskGroupItem.query.filter_by(id=iid, group_id=gid).first()
    if not item: return jsonify({'error': 'Nao encontrado'}), 404
    item.ativo = False; db.session.commit()
    return jsonify({'ok': True}), 200

# ── Tasks por oportunidade ────────────────────────────────────────────────────
def _build_tasks_from_groups(oid, uid):
    """Cria tarefas agrupadas para o usuário nesta oportunidade"""
    groups = CRMTaskGroup.query.filter_by(ativo=True, usuario_id=uid)\
        .order_by(CRMTaskGroup.ordem, CRMTaskGroup.id).all()
    for g in groups:
        items = CRMTaskGroupItem.query.filter_by(group_id=g.id, ativo=True)\
            .order_by(CRMTaskGroupItem.ordem, CRMTaskGroupItem.id).all()
        for it in items:
            db.session.add(CRMTask(
                opportunity_id=oid, usuario_id=uid, group_id=g.id,
                titulo=it.titulo, descricao=it.descricao
            ))
    db.session.commit()

@crm_task_bp.route('/opportunities/<int:oid>/tasks', methods=['GET'])
def list_tasks(oid):
    u, e = _a()
    if e: return e
    if not _can_access_opp(u, oid): return jsonify({'error': 'Acesso negado'}), 403

    tasks = CRMTask.query.filter_by(opportunity_id=oid, usuario_id=u.id)\
        .order_by(CRMTask.group_id, CRMTask.id).all()

    # Uma consulta somente-leitura não pode gerar registros no banco.
    if not tasks and _has_crm_permission(u, 'editar'):
        _build_tasks_from_groups(oid, u.id)
        tasks = CRMTask.query.filter_by(opportunity_id=oid, usuario_id=u.id)\
            .order_by(CRMTask.group_id, CRMTask.id).all()

    groups_map = {}
    solo = []
    for t in tasks:
        if t.group_id:
            groups_map.setdefault(t.group_id, []).append(t.to_dict())
        else:
            solo.append(t.to_dict())

    result = []
    if groups_map:
        gids = list(groups_map.keys())
        gs = CRMTaskGroup.query.filter(CRMTaskGroup.id.in_(gids)).all()
        gmap = {g.id: g for g in gs}
        ordered = sorted(gids, key=lambda gid: (gmap[gid].ordem if gid in gmap else 999, gid))
        for gid in ordered:
            g = gmap.get(gid)
            result.append({
                'type':   'group',
                'id':     gid,
                'titulo': g.titulo if g else f'Grupo {gid}',
                'tasks':  groups_map[gid]
            })
    for t in solo:
        result.append({'type': 'task', **t})

    return jsonify(result), 200

@crm_task_bp.route('/opportunities/<int:oid>/tasks/reset', methods=['POST'])
def reset_tasks(oid):
    u, e = _a('editar')
    if e: return e
    if not _can_access_opp(u, oid): return jsonify({'error': 'Acesso negado'}), 403
    CRMTask.query.filter_by(opportunity_id=oid, usuario_id=u.id).delete()
    _build_tasks_from_groups(oid, u.id)
    tasks = CRMTask.query.filter_by(opportunity_id=oid, usuario_id=u.id)\
        .order_by(CRMTask.group_id, CRMTask.id).all()
    return jsonify([t.to_dict() for t in tasks]), 200

@crm_task_bp.route('/opportunities/<int:oid>/tasks/<int:tid>', methods=['PUT'])
def toggle_task(oid, tid):
    u, e = _a('editar')
    if e: return e
    if not _can_access_opp(u, oid): return jsonify({'error': 'Acesso negado'}), 403
    task = CRMTask.query.filter_by(id=tid, opportunity_id=oid, usuario_id=u.id).first()
    if not task: return jsonify({'error': 'Nao encontrado'}), 404
    d = request.get_json() or {}
    task.concluida    = bool(d.get('concluida', not task.concluida))
    task.concluida_em = datetime.utcnow() if task.concluida else None
    db.session.commit()
    return jsonify(task.to_dict()), 200
