# -*- coding: utf-8 -*-
import os
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from ..utils.auth import get_current_user_from_request
from ..utils.marketing_acl import filter_owned, can_access, forbidden
from .. import db
from ..utils.logging import create_log
from ..models.marketing_nota import MarketingNota, MarketingNotaAnexo

marketing_nota_bp = Blueprint('marketing_nota', __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'uploads', 'marketing_notas')
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'zip'}


def _allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


os.makedirs(UPLOAD_DIR, exist_ok=True)


@marketing_nota_bp.route('/', methods=['GET'])
def listar():
    user = get_current_user_from_request(request)
    status = request.args.get('status')
    q = MarketingNota.query
    if status:
        q = q.filter_by(status=status)
    q = filter_owned(q, MarketingNota, user)
    itens = q.order_by(MarketingNota.atualizado_em.desc()).all()
    return jsonify([i.to_dict() for i in itens])


@marketing_nota_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    user = get_current_user_from_request(request)
    item = MarketingNota.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    return jsonify(item.to_dict())


@marketing_nota_bp.route('/', methods=['POST'])
def criar():
    user = get_current_user_from_request(request)
    data = request.get_json() or {}
    item = MarketingNota(
        titulo        = data.get('titulo'),
        destinatarios = data.get('destinatarios'),
        corpo         = data.get('corpo'),
        status        = data.get('status', 'rascunho'),
        criado_por    = user.id if user else None,
    )
    db.session.add(item)
    db.session.commit()
    try:
        create_log(user=user, action='create_marketing_nota', entity='marketing_nota',
                   entity_id=item.id, details={'payload': data}, req=request)
    except Exception: pass
    return jsonify(item.to_dict()), 201


@marketing_nota_bp.route('/<int:id>', methods=['PUT'])
def atualizar(id):
    user = get_current_user_from_request(request)
    item = MarketingNota.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    data = request.get_json() or {}
    before = item.to_dict()

    item.titulo        = data.get('titulo',        item.titulo)
    item.destinatarios = data.get('destinatarios', item.destinatarios)
    item.corpo         = data.get('corpo',         item.corpo)
    item.status        = data.get('status',        item.status)
    db.session.commit()
    try:
        create_log(user=user, action='update_marketing_nota', entity='marketing_nota',
                   entity_id=id, details={'before': before, 'after_payload': data}, req=request)
    except Exception: pass
    return jsonify(item.to_dict())


@marketing_nota_bp.route('/<int:id>', methods=['DELETE'])
def deletar(id):
    user = get_current_user_from_request(request)
    item = MarketingNota.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    snapshot = item.to_dict()

    for anexo in item.anexos:
        try:
            if os.path.exists(anexo.caminho):
                os.remove(anexo.caminho)
        except Exception: pass

    db.session.delete(item)
    db.session.commit()
    try:
        create_log(user=user, action='delete_marketing_nota', entity='marketing_nota',
                   entity_id=id, details={'deleted': snapshot}, req=request)
    except Exception: pass
    return jsonify({'success': True})


# ── Anexos ───────────────────────────────────────────────
@marketing_nota_bp.route('/<int:id>/anexos', methods=['POST'])
def upload_anexo(id):
    user = get_current_user_from_request(request)
    item = MarketingNota.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    if 'file' not in request.files:
        return jsonify({'error': 'Nenhum arquivo enviado'}), 400
    f = request.files['file']
    if not f.filename or not _allowed(f.filename):
        return jsonify({'error': 'Tipo de arquivo nao permitido'}), 400

    filename = secure_filename(f.filename)
    destino  = os.path.join(UPLOAD_DIR, f'{item.id}_{filename}')
    f.save(destino)

    anexo = MarketingNotaAnexo(
        nota_id   = item.id,
        nome      = f.filename,
        caminho   = destino,
        tamanho   = os.path.getsize(destino),
        mime_type = f.mimetype,
    )
    db.session.add(anexo)
    db.session.commit()
    return jsonify(anexo.to_dict()), 201


@marketing_nota_bp.route('/anexo/<int:anexo_id>/download', methods=['GET'])
def download_anexo(anexo_id):
    user = get_current_user_from_request(request)
    anexo = MarketingNotaAnexo.query.get_or_404(anexo_id)
    nota = anexo.nota
    if not can_access(user, nota):
        return forbidden()
    return send_file(anexo.caminho, as_attachment=True, download_name=anexo.nome)


@marketing_nota_bp.route('/anexo/<int:anexo_id>', methods=['DELETE'])
def deletar_anexo(anexo_id):
    user = get_current_user_from_request(request)
    anexo = MarketingNotaAnexo.query.get_or_404(anexo_id)
    nota = anexo.nota
    if not can_access(user, nota):
        return forbidden()
    try:
        if os.path.exists(anexo.caminho):
            os.remove(anexo.caminho)
    except Exception: pass
    db.session.delete(anexo)
    db.session.commit()
    return jsonify({'success': True})
