# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from ..utils.auth import get_current_user_from_request
from ..utils.marketing_acl import filter_owned, can_access, forbidden
from .. import db
from ..utils.logging import create_log
from ..models.marketing_modelo import MarketingModelo

marketing_modelo_bp = Blueprint('marketing_modelo', __name__)


@marketing_modelo_bp.route('/', methods=['GET'])
def listar():
    user = get_current_user_from_request(request)
    q = MarketingModelo.query
    q = filter_owned(q, MarketingModelo, user)
    itens = q.order_by(MarketingModelo.nome).all()
    return jsonify([i.to_dict() for i in itens])


@marketing_modelo_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    user = get_current_user_from_request(request)
    item = MarketingModelo.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    return jsonify(item.to_dict())


@marketing_modelo_bp.route('/', methods=['POST'])
def criar():
    user = get_current_user_from_request(request)
    data = request.get_json() or {}
    item = MarketingModelo(
        nome       = data.get('nome'),
        assunto    = data.get('assunto'),
        corpo_html = data.get('corpo_html'),
        notas      = data.get('notas'),
        criado_por = user.id if user else None,
    )
    db.session.add(item)
    db.session.commit()
    try:
        create_log(user=user, action='create_marketing_modelo', entity='marketing_modelo',
                   entity_id=item.id, details={'payload': data}, req=request)
    except Exception: pass
    return jsonify(item.to_dict()), 201


@marketing_modelo_bp.route('/<int:id>', methods=['PUT'])
def atualizar(id):
    user = get_current_user_from_request(request)
    item = MarketingModelo.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    data = request.get_json() or {}

    before = None
    try: before = item.to_dict()
    except Exception: before = None
    item.nome       = data.get('nome', item.nome)
    item.assunto    = data.get('assunto', item.assunto)
    item.corpo_html = data.get('corpo_html', item.corpo_html)
    item.notas      = data.get('notas',      item.notas)
    db.session.commit()
    try:
        create_log(user=user, action='update_marketing_modelo', entity='marketing_modelo',
                   entity_id=id, details={'before': before, 'after_payload': data}, req=request)
    except Exception: pass
    return jsonify(item.to_dict())


@marketing_modelo_bp.route('/<int:id>', methods=['DELETE'])
def deletar(id):
    user = get_current_user_from_request(request)
    item = MarketingModelo.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()

    snapshot = None
    try: snapshot = item.to_dict()
    except Exception: snapshot = None

    db.session.delete(item)
    db.session.commit()
    try:
        create_log(user=user, action='delete_marketing_modelo', entity='marketing_modelo',
                   entity_id=id, details={'deleted': snapshot}, req=request)
    except Exception: pass
    return jsonify({'success': True})
