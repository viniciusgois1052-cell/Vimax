# -*- coding: utf-8 -*-
from datetime import datetime
from ..utils.logging import create_log
from flask import Blueprint, request, jsonify
from sqlalchemy import asc, desc, or_

from .. import db
from ..models.usuario import Usuario
from ..models.crm_status import CRMStatus
from ..models.crm_opportunity import CRMOpportunity
from ..models.crm_activity import CRMActivity
from ..models.crm_task import CRMTask
from ..models.crm_contact import CRMContact
from ..models.crm_deal import CRMDeal

crm_bp = Blueprint('crm_bp', __name__)

# ─── Auth ─────────────────────────────────────────────────────────────────────
def get_current_user():
    token = request.headers.get('X-API-Token')
    if not token:
        return None
    return Usuario.query.filter_by(api_token=token).first()

CRM_ALLOWED_ROLES = {'super_admin', 'admin', 'marketing'}

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
    if role not in CRM_ALLOWED_ROLES:
        return None, (jsonify({'error': 'Acesso negado ao CRM'}), 403)

    if role != 'super_admin':
        perfil = getattr(user, 'perfil_acesso', None)
        if perfil is not None:
            required_action = action or CRM_ACTION_BY_METHOD.get(request.method, 'ver')
            if not bool(getattr(perfil, f'crm_{required_action}', False)):
                return None, (
                    jsonify({'error': 'Sem permissão para esta ação no CRM'}),
                    403
                )
    return user, None

def is_admin(user):
    return (user.role or '').lower() in ('super_admin', 'admin')

def get_user_empresas(user):
    """
    Retorna as empresas permitidas ao usuário.

    O cabeçalho X-Empresa-Id restringe a consulta à empresa selecionada no
    menu. Uma empresa fora das permissões resulta em uma lista vazia.
    """
    role = (user.role or '').lower()
    perfil = getattr(user, 'perfil_acesso', None)

    # Super admin e admin legado sem perfil continuam podendo ver todas.
    unrestricted = role == 'super_admin' or (role == 'admin' and perfil is None)

    if unrestricted:
        allowed_ids = None
    else:
        ids = set()

        # Relação N:N oficial entre usuários e empresas.
        try:
            for empresa_id in user.get_empresa_ids():
                if empresa_id:
                    ids.add(int(empresa_id))
        except Exception:
            pass

        # Compatibilidade com instalações que ainda usam os campos antigos.
        if getattr(user, 'empresa_id', None):
            ids.add(int(user.empresa_id))

        empresas_ids_raw = getattr(user, 'empresas_ids', None)
        if empresas_ids_raw:
            try:
                extra = (
                    empresas_ids_raw
                    if isinstance(empresas_ids_raw, list)
                    else __import__('json').loads(empresas_ids_raw)
                )
                for empresa_id in extra:
                    if empresa_id:
                        ids.add(int(empresa_id))
            except Exception:
                pass

        allowed_ids = sorted(ids)

    selected_raw = (request.headers.get('X-Empresa-Id') or '').strip()
    if selected_raw and selected_raw.lower() != 'all':
        try:
            selected_id = int(selected_raw)
        except (TypeError, ValueError):
            return []

        if allowed_ids is None:
            return [selected_id]
        return [selected_id] if selected_id in allowed_ids else []

    return allowed_ids

def apply_empresa_filter(query, model, user):
    """Aplica filtro de empresa na query conforme o usuário."""
    empresas = get_user_empresas(user)
    if empresas is None:
        return query  # super_admin/admin vê tudo
    if not empresas:
        return query.filter(False)  # sem empresa = sem dados
    return query.filter(model.empresa_id.in_(empresas))

def parse_date(value):
    if value in (None, '', 'null'):
        return None
    if isinstance(value, str):
        try:
            return datetime.strptime(value, '%Y-%m-%d').date()
        except Exception:
            return None
    return value

# ══════════════════════════════════════════════════════════════════════════════
# STATUSES
# ══════════════════════════════════════════════════════════════════════════════
@crm_bp.route('/statuses', methods=['GET'])
def list_statuses():
    user, err = require_user()
    if err: return err
    query = apply_empresa_filter(CRMStatus.query, CRMStatus, user)
    items = query.order_by(asc(CRMStatus.ordem), asc(CRMStatus.id)).all()
    return jsonify([s.to_dict() for s in items]), 200

@crm_bp.route('/statuses', methods=['POST'])
def create_status():
    user, err = require_user()
    if err: return err
    data = request.get_json() or {}
    nome = (data.get('nome') or '').strip()
    if not nome:
        return jsonify({'error': 'Informe o nome'}), 400
    max_ordem = db.session.query(db.func.max(CRMStatus.ordem)).scalar() or 0
    item = CRMStatus(
        nome=nome,
        cor=data.get('cor', 'bg-slate-200 text-slate-800'),
        ordem=int(data.get('ordem', max_ordem + 1)),
        ativo=bool(data.get('ativo', True)),
        empresa_id=getattr(user, 'empresa_id', None),
        
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@crm_bp.route('/statuses/<int:sid>', methods=['PUT', 'PATCH'])
def update_status(sid):
    user, err = require_user()
    if err: return err
    item = CRMStatus.query.get_or_404(sid)
    data = request.get_json() or {}
    old_nome = item.nome
    if 'nome'  in data: item.nome  = (data['nome'] or '').strip() or item.nome
    if 'cor'   in data: item.cor   = data['cor']
    if 'ativo' in data: item.ativo = bool(data['ativo'])
    if 'ordem' in data and data['ordem'] not in (None, ''):
        item.ordem = int(data['ordem'])
    if old_nome != item.nome:
        CRMOpportunity.query.filter_by(status=old_nome).update({'status': item.nome})
    db.session.commit()
    return jsonify(item.to_dict()), 200

@crm_bp.route('/statuses/<int:sid>', methods=['DELETE'])
def delete_status(sid):
    user, err = require_user()
    if err: return err
    item = CRMStatus.query.get_or_404(sid)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'ok': True}), 200

# ══════════════════════════════════════════════════════════════════════════════
# CONTACTS
# ══════════════════════════════════════════════════════════════════════════════
CONTACT_FIELDS = ['nome','email','telefone','empresa','cargo','fonte','estagio',
                  'notas','linkedin','github','twitter','website','avatar_url',
                  'cidade','estado','tags']

def contact_to_dict(c):
    return {
        'id': c.id,
        'nome': c.nome,
        'email': c.email,
        'telefone': c.telefone,
        'empresa': c.empresa,
        'empresa_id': c.empresa_id,
        'cargo': c.cargo,
        'fonte': c.fonte,
        'responsavel_id': c.responsavel_id,
        'estagio': c.estagio,
        'notas': c.notas,
        'linkedin': getattr(c, 'linkedin', None),
        'github': getattr(c, 'github', None),
        'twitter': getattr(c, 'twitter', None),
        'website': getattr(c, 'website', None),
        'avatar_url': getattr(c, 'avatar_url', None),
        'cidade': getattr(c, 'cidade', None),
        'estado': getattr(c, 'estado', None),
        'tags': getattr(c, 'tags', None),
        'ativo': getattr(c, 'ativo', 1),
        'criado_em': c.criado_em.isoformat() if c.criado_em else None,
        'atualizado_em': c.atualizado_em.isoformat() if c.atualizado_em else None,
        'campos_extras': getattr(c, 'campos_extras', None),
    }

@crm_bp.route('/contacts', methods=['GET'])
def list_contacts():
    user, err = require_user()
    if err: return err
    q       = request.args.get('q', '').strip()
    estagio = request.args.get('estagio', '').strip()
    query   = CRMContact.query
    if q:
        like = f'%{q}%'
        query = query.filter(or_(
            CRMContact.nome.like(like),
            CRMContact.email.like(like),
            CRMContact.empresa.like(like),
            CRMContact.telefone.like(like),
            CRMContact.cargo.like(like),
        ))
    if estagio:
        query = query.filter(CRMContact.estagio == estagio)
    if not is_admin(user):
        query = query.filter(CRMContact.responsavel_id == user.id)
    query = apply_empresa_filter(query, CRMContact, user)
    items = query.order_by(desc(CRMContact.id)).all()
    return jsonify([contact_to_dict(c) for c in items]), 200

@crm_bp.route('/contacts', methods=['POST'])
def create_contact():
    user, err = require_user()
    if err: return err
    data = request.get_json() or {}
    nome = (data.get('nome') or '').strip()
    if not nome:
        return jsonify({'error': 'Informe o nome'}), 400
    item = CRMContact(nome=nome, responsavel_id=getattr(user, 'id', None), empresa_id=getattr(user, 'empresa_id', None))
    for f in CONTACT_FIELDS[1:]:
        if f in data:
            setattr(item, f, data[f] or None)
    if 'empresa_id'      in data: item.empresa_id      = data['empresa_id'] or None
    if 'responsavel_id'  in data: item.responsavel_id  = data['responsavel_id'] or None
    if 'valor_potencial' in data: item.valor_potencial  = data['valor_potencial']
    if 'campos_extras'   in data: item.campos_extras   = data['campos_extras']
    if 'campos_extras'   in data: item.campos_extras   = data['campos_extras']
    db.session.add(item)
    db.session.commit()
    try:
        create_log(user=user, action='create_crm_contact', entity='crm_contact', entity_id=item.id,
                   details={'payload': data}, req=request)
    except Exception:
        pass
    return jsonify(contact_to_dict(item)), 201

@crm_bp.route('/contacts/<int:cid>', methods=['GET'])
def get_contact(cid):
    user, err = require_user()
    if err: return err
    item = CRMContact.query.get_or_404(cid)
    return jsonify(contact_to_dict(item)), 200

@crm_bp.route('/contacts/<int:cid>', methods=['PUT', 'PATCH'])
def update_contact(cid):
    user, err = require_user()
    if err: return err
    item = CRMContact.query.get_or_404(cid)
    data = request.get_json() or {}
    for f in CONTACT_FIELDS:
        if f in data:
            setattr(item, f, data[f] or None)
    if 'empresa_id'      in data: item.empresa_id      = data['empresa_id'] or None
    if 'responsavel_id'  in data: item.responsavel_id  = data['responsavel_id'] or None
    if 'valor_potencial' in data: item.valor_potencial  = data['valor_potencial']
    if 'campos_extras'   in data: item.campos_extras   = data['campos_extras']
    if 'campos_extras'   in data: item.campos_extras   = data['campos_extras']
    item.atualizado_em = datetime.utcnow()
    db.session.commit()
    try:
        create_log(user=user, action='update_crm_contact', entity='crm_contact', entity_id=item.id,
                   details={'payload': data}, req=request)
    except Exception:
        pass
    return jsonify(contact_to_dict(item)), 200

@crm_bp.route('/contacts/<int:cid>', methods=['DELETE'])
def delete_contact(cid):
    user, err = require_user()
    if err: return err
    item = CRMContact.query.get_or_404(cid)
    snapshot = {'id': item.id, 'nome': item.nome}
    db.session.delete(item)
    db.session.commit()
    try:
        create_log(user=user, action='delete_crm_contact', entity='crm_contact', entity_id=cid,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass
    return jsonify({'ok': True}), 200

# ══════════════════════════════════════════════════════════════════════════════
# DEALS (Negócios)
# ══════════════════════════════════════════════════════════════════════════════
def deal_to_dict(d):
    contact_nome = None
    if d.contato_id:
        c = CRMContact.query.get(d.contato_id)
        contact_nome = c.nome if c else None
    return {
        'id': d.id,
        'titulo': d.titulo,
        'contato_id': d.contato_id,
        'contact_nome': contact_nome,
        'empresa_id': d.empresa_id,
        'valor': float(d.valor) if d.valor is not None else None,
        'estagio': d.estagio,
        'responsavel_id': d.responsavel_id,
        'data_prevista': d.data_prevista.isoformat() if d.data_prevista else None,
        'notas': d.notas,
        'campos_extras': d.campos_extras,
        'criado_em': d.criado_em.isoformat() if d.criado_em else None,
        'atualizado_em': d.atualizado_em.isoformat() if d.atualizado_em else None,
    }

@crm_bp.route('/deals', methods=['GET'])
def list_deals():
    user, err = require_user()
    if err: return err
    q       = request.args.get('q', '').strip()
    estagio = request.args.get('estagio', '').strip()
    query   = CRMDeal.query
    if q:
        query = query.filter(CRMDeal.titulo.like(f'%{q}%'))
    if estagio:
        query = query.filter(CRMDeal.estagio == estagio)
    items = query.order_by(desc(CRMDeal.id)).all()
    return jsonify([deal_to_dict(d) for d in items]), 200

@crm_bp.route('/deals', methods=['POST'])
def create_deal():
    user, err = require_user()
    if err: return err
    data   = request.get_json() or {}
    titulo = (data.get('titulo') or '').strip()
    if not titulo:
        return jsonify({'error': 'Informe o título'}), 400
    item = CRMDeal(
        titulo=titulo,
        contato_id=data.get('contato_id') or None,

        valor=data.get('valor') or None,
        estagio=data.get('estagio', 'Novo'),
        responsavel_id=data.get('responsavel_id') or getattr(user, 'id', None),
        empresa_id=data.get('empresa_id') or getattr(user, 'empresa_id', None),
        data_prevista=parse_date(data.get('data_prevista')),
        notas=data.get('notas'),
        campos_extras=data.get('campos_extras') or None,
    )
    db.session.add(item)
    db.session.commit()
    try:
        create_log(user=user, action='create_crm_deal', entity='crm_deal', entity_id=item.id,
                   details={'payload': data}, req=request)
    except Exception:
        pass
    return jsonify(deal_to_dict(item)), 201

@crm_bp.route('/deals/<int:did>', methods=['GET'])
def get_deal(did):
    user, err = require_user()
    if err: return err
    item = CRMDeal.query.get_or_404(did)
    return jsonify(deal_to_dict(item)), 200

@crm_bp.route('/deals/<int:did>', methods=['PUT', 'PATCH'])
def update_deal(did):
    user, err = require_user()
    if err: return err
    item = CRMDeal.query.get_or_404(did)
    data = request.get_json() or {}
    if 'titulo'         in data: item.titulo         = data['titulo']
    if 'contato_id'     in data: item.contato_id     = data['contato_id'] or None
    if 'empresa_id'     in data: item.empresa_id     = data['empresa_id'] or None
    if 'valor'          in data: item.valor          = data['valor']
    if 'estagio'        in data: item.estagio        = data['estagio']
    if 'responsavel_id' in data: item.responsavel_id = data['responsavel_id'] or None
    if 'notas'          in data: item.notas          = data['notas']
    if 'campos_extras'  in data: item.campos_extras  = data['campos_extras']
    if 'campos_extras'  in data: item.campos_extras  = data['campos_extras']
    if 'data_prevista'  in data: item.data_prevista  = parse_date(data['data_prevista'])
    item.atualizado_em = datetime.utcnow()
    db.session.commit()
    try:
        create_log(user=user, action='update_crm_deal', entity='crm_deal', entity_id=item.id,
                   details={'payload': data}, req=request)
    except Exception:
        pass
    return jsonify(deal_to_dict(item)), 200

@crm_bp.route('/deals/<int:did>', methods=['DELETE'])
def delete_deal(did):
    user, err = require_user()
    if err: return err
    item = CRMDeal.query.get_or_404(did)
    snapshot = {'id': item.id, 'titulo': item.titulo}
    db.session.delete(item)
    db.session.commit()
    try:
        create_log(user=user, action='delete_crm_deal', entity='crm_deal', entity_id=did,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass
    return jsonify({'ok': True}), 200

# ══════════════════════════════════════════════════════════════════════════════
# OPPORTUNITIES
# ══════════════════════════════════════════════════════════════════════════════
@crm_bp.route('/opportunities', methods=['GET'])
def list_opportunities():
    user, err = require_user()
    if err: return err
    q      = request.args.get('q', '').strip()
    status = request.args.get('status', '').strip()
    query  = CRMOpportunity.query
    if q:
        like  = f'%{q}%'
        query = query.filter(or_(
            CRMOpportunity.lead_nome.like(like),
            CRMOpportunity.empresa.like(like),
            CRMOpportunity.email.like(like),
        ))
    if status:
        query = query.filter(CRMOpportunity.status == status)
    query = apply_empresa_filter(query, CRMOpportunity, user)
    items = query.order_by(desc(CRMOpportunity.id)).all()
    return jsonify([o.to_dict() for o in items]), 200

@crm_bp.route('/opportunities', methods=['POST'])
def create_opportunity():
    user, err = require_user()
    if err: return err
    data      = request.get_json() or {}
    lead_nome = (data.get('lead_nome') or '').strip()
    if not lead_nome:
        return jsonify({'error': 'Informe o nome do lead'}), 400
    status = (data.get('status') or '').strip()
    if not status:
        first  = CRMStatus.query.order_by(asc(CRMStatus.ordem)).first()
        status = first.nome if first else 'Novo'
    item = CRMOpportunity(
        lead_nome=lead_nome,
        empresa=data.get('empresa') or None,
        email=data.get('email') or None,
        telefone=data.get('telefone') or None,
        status=status,
        responsavel=data.get('responsavel') or None,
        valor=data.get('valor') or None,
        probabilidade=data.get('probabilidade') or None,
        origem=data.get('origem') or None,
        proxima_acao=data.get('proxima_acao') or None,
        data_proxima_acao=parse_date(data.get('data_proxima_acao')),
        etapa_venda=data.get('etapa_venda') or None,
        observacao=data.get('observacao'),
        campos_extras=data.get('campos_extras') or None,
        criado_por=getattr(user, 'id', None),
        empresa_id=getattr(user, 'empresa_id', None),
    )
    db.session.add(item)
    db.session.commit()
    db.session.add(CRMActivity(
        opportunity_id=item.id, tipo='criacao',
        descricao='Lead criado', novo_status=item.status,
        novo_valor=item.valor, responsavel=item.responsavel,
        criado_por=getattr(user, 'id', None),
    ))
    db.session.commit()
    try:
        create_log(user=user, action='create_crm_opportunity', entity='crm_opportunity', entity_id=item.id,
                   details={'payload': data}, req=request)
    except Exception:
        pass
    return jsonify(item.to_dict()), 201

@crm_bp.route('/opportunities/<int:oid>', methods=['GET'])
def get_opportunity(oid):
    user, err = require_user()
    if err: return err
    item = CRMOpportunity.query.get_or_404(oid)
    return jsonify(item.to_dict()), 200

@crm_bp.route('/opportunities/<int:oid>', methods=['PUT', 'PATCH'])
def update_opportunity(oid):
    user, err = require_user()
    if err: return err
    item          = CRMOpportunity.query.get_or_404(oid)
    before_status = item.status
    before_valor  = item.valor
    data          = request.get_json() or {}
    for f in ['lead_nome','empresa','email','telefone','status','responsavel',
              'origem','proxima_acao','etapa_venda','observacao','campos_extras']:
        if f in data: setattr(item, f, data[f] or None)
    if 'valor'             in data: item.valor             = data['valor'] or None
    if 'probabilidade'     in data: item.probabilidade     = data['probabilidade'] or None
    if 'data_proxima_acao' in data: item.data_proxima_acao = parse_date(data['data_proxima_acao'])
    item.ultima_atualizacao = datetime.utcnow()
    db.session.commit()
    if before_status != item.status or before_valor != item.valor:
        db.session.add(CRMActivity(
            opportunity_id=item.id, tipo='atualizacao',
            descricao='Atualização',
            novo_status=item.status if before_status != item.status else None,
            novo_valor=item.valor if before_valor != item.valor else None,
            responsavel=item.responsavel,
            criado_por=getattr(user, 'id', None)
        ))
        db.session.commit()
    try:
        create_log(user=user, action='update_crm_opportunity', entity='crm_opportunity', entity_id=item.id,
                   details={'payload': data}, req=request)
    except Exception:
        pass
    return jsonify(item.to_dict()), 200

@crm_bp.route('/opportunities/<int:oid>', methods=['DELETE'])
def delete_opportunity(oid):
    user, err = require_user()
    if err: return err
    item = CRMOpportunity.query.get_or_404(oid)
    snapshot = item.to_dict()
    CRMTask.query.filter_by(opportunity_id=oid).delete()
    CRMActivity.query.filter_by(opportunity_id=oid).delete()
    db.session.delete(item)
    db.session.commit()
    try:
        create_log(user=user, action='delete_crm_opportunity', entity='crm_opportunity', entity_id=oid,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass
    return jsonify({'ok': True}), 200

# ══════════════════════════════════════════════════════════════════════════════
# ACTIVITIES
# ══════════════════════════════════════════════════════════════════════════════
@crm_bp.route('/opportunities/<int:oid>/activities', methods=['GET'])
def list_activities(oid):
    user, err = require_user()
    if err: return err
    items = CRMActivity.query.filter_by(opportunity_id=oid).order_by(desc(CRMActivity.id)).all()
    return jsonify([a.to_dict() for a in items]), 200

@crm_bp.route('/opportunities/<int:oid>/activities', methods=['POST'])
def create_activity(oid):
    user, err = require_user('editar')
    if err: return err
    data = request.get_json() or {}
    _valor_raw = data.get('novo_valor')
    _novo_valor = None
    if _valor_raw not in (None, '', 0, '0'):
        try: _novo_valor = float(_valor_raw)
        except (ValueError, TypeError): _novo_valor = None

    item = CRMActivity(
        opportunity_id=oid,
        tipo=data.get('tipo', 'nota'),
        descricao=data.get('descricao') or None,
        novo_status=data.get('novo_status') or None,
        novo_valor=_novo_valor,
        responsavel=data.get('responsavel') or None,
        criado_por=getattr(user, 'id', None),
    )
    db.session.add(item)
    db.session.commit()
    opp = CRMOpportunity.query.get(oid)
    if opp:
        if data.get('novo_status'):              opp.status     = data['novo_status']
        if data.get('novo_valor') is not None:   opp.valor      = data['novo_valor']
        if data.get('responsavel'):              opp.responsavel= data['responsavel']
        opp.ultima_atualizacao = datetime.utcnow()
        db.session.commit()
    return jsonify(item.to_dict()), 201

@crm_bp.route('/opportunities/<int:oid>/activities/<int:aid>', methods=['PUT'])
def update_activity(oid, aid):
    user, err = require_user('editar')
    if err: return err
    item = CRMActivity.query.filter_by(id=aid, opportunity_id=oid).first()
    if not item: return jsonify({'error': 'Nao encontrado'}), 404
    data = request.get_json() or {}
    if 'descricao' in data: item.descricao = data['descricao']
    if 'tipo' in data:      item.tipo      = data['tipo']
    db.session.commit()
    return jsonify(item.to_dict()), 200

# ══════════════════════════════════════════════════════════════════════════════
# STATS / DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════
@crm_bp.route('/stats', methods=['GET'])
def get_stats():
    user, err = require_user()
    if err: return err

    empresa_ids = get_user_empresas(user)  # None = admin vê tudo, lista = filtrado

    def _filt_c(q):
        if empresa_ids is None: return q
        if not empresa_ids: return q.filter(False)
        return q.filter(CRMContact.empresa_id.in_(empresa_ids))

    def _filt_d(q):
        if empresa_ids is None: return q
        if not empresa_ids: return q.filter(False)
        return q.filter(CRMDeal.empresa_id.in_(empresa_ids))

    def _filt_o(q):
        if empresa_ids is None: return q
        if not empresa_ids: return q.filter(False)
        return q.filter(CRMOpportunity.empresa_id.in_(empresa_ids))

    total_contacts = _filt_c(CRMContact.query).count()
    total_deals    = _filt_d(CRMDeal.query).count()
    total_opps     = _filt_o(CRMOpportunity.query).count()

    valor_pipeline = _filt_o(
        db.session.query(db.func.sum(CRMOpportunity.valor))
    ).scalar() or 0

    valor_deals = _filt_d(
        db.session.query(db.func.sum(CRMDeal.valor))
    ).scalar() or 0

    por_status = _filt_o(
        db.session.query(CRMOpportunity.status, db.func.count(CRMOpportunity.id))
    ).group_by(CRMOpportunity.status).all()

    por_estagio = _filt_c(
        db.session.query(CRMContact.estagio, db.func.count(CRMContact.id))
    ).group_by(CRMContact.estagio).all()

    return jsonify({
        'total_contacts':       total_contacts,
        'total_deals':          total_deals,
        'total_opportunities':  total_opps,
        'valor_pipeline':       float(valor_pipeline),
        'valor_deals':          float(valor_deals),
        'por_status':           [{'status': s, 'total': t} for s, t in por_status],
        'por_estagio_contato':  [{'estagio': e, 'total': t} for e, t in por_estagio],
    }), 200


# ══════════════════════════════════════════════════════════════════════════════
# REMINDERS (Lembretes)
# ══════════════════════════════════════════════════════════════════════════════
from ..models.crm_reminder import CRMReminder, CRMReminderConfig

@crm_bp.route('/reminders', methods=['GET'])
def list_reminders():
    user, err = require_user()
    if err: return err
    entity_type = request.args.get('entity_type', '').strip()
    entity_id   = request.args.get('entity_id', '').strip()
    query = CRMReminder.query

    # Filtrar por empresa do usuário
    empresa_ids = get_user_empresas(user)
    if empresa_ids is not None:
        if not empresa_ids:
            return jsonify([]), 200
        query = query.filter(CRMReminder.empresa_id.in_(empresa_ids))

    if entity_type: query = query.filter_by(entity_type=entity_type)
    if entity_id:   query = query.filter_by(entity_id=int(entity_id))
    items = query.order_by(asc(CRMReminder.data_hora)).all()
    return jsonify([r.to_dict() for r in items]), 200

@crm_bp.route('/reminders', methods=['POST'])
def create_reminder():
    user, err = require_user()
    if err: return err
    data = request.get_json() or {}
    from datetime import datetime as dt
    try:
        data_hora = dt.fromisoformat(data['data_hora'])
    except Exception:
        return jsonify({'error': 'data_hora inválida'}), 400
    item = CRMReminder(
        entity_type   = data.get('entity_type', 'opportunity'),
        entity_id     = data.get('entity_id'),
        titulo        = data.get('titulo', 'Lembrete'),
        descricao     = data.get('descricao') or None,
        data_hora     = data_hora,
        email_destino = data.get('email_destino', ''),
        smtp_id       = data.get('smtp_id') or None,
        criado_por    = getattr(user, 'id', None),
        empresa_id    = getattr(user, 'empresa_id', None),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@crm_bp.route('/reminders/<int:rid>', methods=['DELETE'])
def delete_reminder(rid):
    user, err = require_user()
    if err: return err
    item = CRMReminder.query.get_or_404(rid)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'ok': True}), 200

@crm_bp.route('/reminders/config', methods=['GET'])
def get_reminder_config():
    user, err = require_user()
    if err: return err
    cfg = CRMReminderConfig.query.first()
    if not cfg:
        cfg = CRMReminderConfig()
        db.session.add(cfg)
        db.session.commit()
    return jsonify(cfg.to_dict()), 200

@crm_bp.route('/reminders/config', methods=['PUT', 'PATCH'])
def update_reminder_config():
    user, err = require_user()
    if err: return err
    cfg = CRMReminderConfig.query.first()
    if not cfg:
        cfg = CRMReminderConfig()
        db.session.add(cfg)
    data = request.get_json() or {}
    if 'ativo'          in data: cfg.ativo          = data['ativo']
    if 'hora_envio'     in data: cfg.hora_envio      = data['hora_envio']
    if 'antecedencia'   in data: cfg.antecedencia    = int(data['antecedencia'])
    if 'email_destino'  in data: cfg.email_destino   = data['email_destino']
    if 'smtp_id'        in data: cfg.smtp_id         = data['smtp_id'] or None
    db.session.commit()
    return jsonify(cfg.to_dict()), 200
