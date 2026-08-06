# -*- coding: utf-8 -*-
"""
Portal do Fornecedor — NF e Boleto na OC (BLOB no banco, com fallback p/ arquivos antigos em disco).
Segurança: portal exige SENHA do fornecedor (72h); download interno exige X-API-Token do Vimax.
"""
from flask import Blueprint, request, jsonify, current_app, Response, send_from_directory
from werkzeug.utils import secure_filename
from ..models.compra import OrdemCompra
from ..models.fornecedor_acesso import FornecedorAcesso
from ..models.usuario import Usuario
from .. import db
from datetime import datetime
import os, io

oc_portal_bp = Blueprint('oc_portal_bp', __name__)

UPLOAD_DIR = '/var/www/cmms_project/backend/static/uploads/oc_docs'
EXT_PERMITIDAS = {'pdf', 'jpg', 'jpeg', 'png'}
MIME_MAP = {'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}
MAX_BYTES = 15 * 1024 * 1024  # 15 MB


def _ext(filename):
    return filename.rsplit('.', 1)[1].lower() if '.' in filename else ''


def _auth_forn(oc, senha):
    if not oc:
        return False, {"error": "Ordem de compra não encontrada"}, 404
    acesso = FornecedorAcesso.query.filter_by(fornecedor_id=oc.fornecedor_id).first()
    if not acesso:
        return False, {"error": "Acesso do fornecedor não encontrado"}, 403
    if not senha or not acesso.check_senha(senha):
        return False, {"error": "Senha incorreta"}, 401
    if acesso.expirada():
        return False, {"error": "Senha expirada. Solicite uma nova ao comprador."}, 401
    return True, None, 200


def _usuario_autenticado():
    token = request.headers.get('X-API-Token') or request.args.get('token')
    return Usuario.query.filter_by(api_token=token).first() if token else None


# ───────── PORTAL (senha) ─────────
@oc_portal_bp.route('/portal/oc/<token>', methods=['GET', 'OPTIONS'])
def portal_oc_get(token):
    if request.method == 'OPTIONS':
        return ('', 204)
    oc = OrdemCompra.query.filter_by(token_portal=token, ativo=True).first()
    ok, err, code = _auth_forn(oc, request.args.get('senha', ''))
    if not ok:
        return jsonify(err), code
    return jsonify(oc.to_dict_portal())


@oc_portal_bp.route('/portal/oc/<token>/upload', methods=['POST', 'OPTIONS'])
def portal_oc_upload(token):
    if request.method == 'OPTIONS':
        return ('', 204)
    oc = OrdemCompra.query.filter_by(token_portal=token, ativo=True).first()
    ok, err, code = _auth_forn(oc, request.form.get('senha', ''))
    if not ok:
        return jsonify(err), code

    tipo = (request.form.get('tipo') or '').lower()
    if tipo not in ('nf', 'boleto'):
        return jsonify({"error": "Tipo inválido (use 'nf' ou 'boleto')"}), 400
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado"}), 400

    file = request.files['file']
    if not file or not file.filename:
        return jsonify({"error": "Nome de arquivo vazio"}), 400
    ext = _ext(file.filename)
    if ext not in EXT_PERMITIDAS:
        return jsonify({"error": "Formato inválido. Use PDF, JPG ou PNG."}), 400

    conteudo = file.read()
    if not conteudo:
        return jsonify({"error": "Arquivo vazio."}), 400
    if len(conteudo) > MAX_BYTES:
        return jsonify({"error": "Arquivo muito grande (máx. 15 MB)."}), 400

    try:
        filename = secure_filename(file.filename)
        mimetype = MIME_MAP.get(ext, 'application/octet-stream')
        if tipo == 'nf':
            oc.nf_blob = conteudo
            oc.nf_filename = filename
            oc.nf_mimetype = mimetype
            oc.nf_arquivo_url = None  # limpa referência antiga em disco
        else:
            oc.boleto_blob = conteudo
            oc.boleto_filename = filename
            oc.boleto_mimetype = mimetype
            oc.boleto_arquivo_url = None
        db.session.commit()
        return jsonify({"success": True, "tipo": tipo, "filename": filename})
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro no upload de documento da OC")
        return jsonify({"error": str(e)}), 500


@oc_portal_bp.route('/portal/oc/<token>/salvar', methods=['POST', 'OPTIONS'])
def portal_oc_salvar(token):
    if request.method == 'OPTIONS':
        return ('', 204)
    oc = OrdemCompra.query.filter_by(token_portal=token, ativo=True).first()
    data = request.get_json() or {}
    ok, err, code = _auth_forn(oc, data.get('senha', ''))
    if not ok:
        return jsonify(err), code

    try:
        oc.nf_numero = (data.get('nf_numero') or '').strip() or None
        venc = data.get('boleto_vencimento')
        if venc:
            oc.boleto_vencimento = datetime.strptime(venc, '%Y-%m-%d').date()

        if oc.tem_nf or oc.tem_boleto:
            oc.docs_status = 'ANEXADO'
            oc.docs_data = datetime.utcnow()
        db.session.commit()

        try:
            from ..utils.email_service import EmailService
            from ..models.config_email import ConfigEmail
            cfg = ConfigEmail.query.first()
            destino = (cfg.alert_recipients if cfg and cfg.alert_recipients else None)
            if destino:
                corpo = f"""
                <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto'>
                  <h2 style='color:#1a56db'>📎 Documentos anexados — {oc.numero_oc}</h2>
                  <p>O fornecedor <strong>{oc.fornecedor.nome if oc.fornecedor else ''}</strong> anexou documentos à OC <strong>{oc.numero_oc}</strong>.</p>
                  <ul>
                    <li>Nota Fiscal: {'✅' if oc.tem_nf else '—'} {('(nº ' + oc.nf_numero + ')') if oc.nf_numero else ''}</li>
                    <li>Boleto: {'✅' if oc.tem_boleto else '—'} {('(venc. ' + oc.boleto_vencimento.strftime('%d/%m/%Y') + ')') if oc.boleto_vencimento else ''}</li>
                  </ul>
                </div>"""
                EmailService.send_email(destinatarios=destino,
                                        assunto=f'📎 Documentos anexados — {oc.numero_oc}',
                                        corpo_html=corpo)
        except Exception as mail_err:
            current_app.logger.warning(f"Falha ao notificar docs OC: {mail_err}")

        return jsonify({"success": True, "oc": oc.to_dict_portal()})
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro ao salvar documentos da OC")
        return jsonify({"error": str(e)}), 500


# ───────── INTERNO (X-API-Token) — serve BLOB ou arquivo antigo do disco ─────────
@oc_portal_bp.route('/interno/oc-doc/<int:oc_id>/<tipo>', methods=['GET', 'OPTIONS'])
def baixar_doc_oc_interno(oc_id, tipo):
    if request.method == 'OPTIONS':
        return ('', 204)
    if not _usuario_autenticado():
        return jsonify({"error": "Não autorizado"}), 401

    tipo = (tipo or '').lower()
    if tipo not in ('nf', 'boleto'):
        return jsonify({"error": "Tipo inválido"}), 400

    oc = OrdemCompra.query.get_or_404(oc_id)
    if tipo == 'nf':
        blob, filename, mimetype, url_antiga = oc.nf_blob, oc.nf_filename, oc.nf_mimetype, oc.nf_arquivo_url
    else:
        blob, filename, mimetype, url_antiga = oc.boleto_blob, oc.boleto_filename, oc.boleto_mimetype, oc.boleto_arquivo_url

    # 1) BLOB no banco
    if blob:
        return Response(
            io.BytesIO(blob).read(),
            mimetype=mimetype or 'application/octet-stream',
            headers={'Content-Disposition': f'inline; filename="{filename or (tipo + ".bin")}"'}
        )

    # 2) Fallback: arquivo antigo em disco
    if url_antiga:
        nome = os.path.basename(url_antiga)
        caminho = os.path.join(UPLOAD_DIR, nome)
        if os.path.exists(caminho):
            return send_from_directory(UPLOAD_DIR, nome, as_attachment=False)

    return jsonify({"error": "Documento não encontrado"}), 404