# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify, current_app
from ..utils.auth import get_current_user_from_request
from ..utils.marketing_acl import filter_owned, can_access, forbidden
from .. import db
from ..utils.logging import create_log
from ..models.marketing_campanha import MarketingCampanha
from ..models.marketing_smtp import MarketingSmtp
from ..models.marketing_contato import MarketingContato
from ..models.marketing_grupo import MarketingGrupo
import json, smtplib, threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

marketing_campanha_bp = Blueprint('marketing_campanha', __name__)


def _coletar_destinatarios(campanha):
    destinatarios = {}
    for gid in json.loads(campanha.grupos_ids or '[]'):
        grupo = MarketingGrupo.query.get(gid)
        if grupo:
            for cg in grupo.contatos:
                contato = cg.contato
                if contato and contato.email:
                    destinatarios[contato.email] = contato.nome
    for cid in json.loads(campanha.contatos_ids or '[]'):
        contato = MarketingContato.query.get(cid)
        if contato and contato.email:
            destinatarios[contato.email] = contato.nome
    for extra in json.loads(campanha.contatos_extras or '[]'):
        if extra.get('email'):
            destinatarios[extra['email']] = extra.get('nome', extra['email'])
    return destinatarios


def _disparar(campanha_id, app):
    with app.app_context():
        campanha = MarketingCampanha.query.get(campanha_id)
        if not campanha:
            return
        smtp = MarketingSmtp.query.get(campanha.smtp_id)
        if not smtp:
            campanha.status = 'erro'
            campanha.log_erros = 'SMTP nao encontrado.'
            db.session.commit()
            return
        campanha.status = 'enviando'
        db.session.commit()
        destinatarios = _coletar_destinatarios(campanha)
        enviados = 0; erros = 0; log = []
        total_dest = len(destinatarios)
        print('[CAMPANHA {}] Iniciando disparo para {} destinatarios'.format(campanha_id, total_dest), flush=True)
        try:
            if smtp.use_ssl:
                server = smtplib.SMTP_SSL(smtp.host, smtp.port, timeout=5)
            else:
                server = smtplib.SMTP(smtp.host, smtp.port, timeout=5)
                if smtp.use_tls:
                    server.starttls()
            server.login(smtp.username, smtp.password)
            print('[CAMPANHA {}] SMTP conectado OK'.format(campanha_id), flush=True)
            for email, nome in destinatarios.items():
                try:
                    msg = MIMEMultipart('alternative')
                    msg['Subject'] = campanha.assunto
                    msg['From']    = '{} <{}>'.format(smtp.nome_remetente, smtp.email_remetente)
                    msg['To']      = email
                    corpo = campanha.corpo_html.replace('{{nome}}', nome).replace('{{email}}', email)
                    msg.attach(MIMEText(corpo, 'html', 'utf-8'))
                    server.sendmail(smtp.email_remetente, [email], msg.as_bytes())
                    enviados += 1
                    campanha.total_enviados = enviados
                    db.session.commit()
                    print('[CAMPANHA {}] Enviado {}/{}: {}'.format(campanha_id, enviados, total_dest, email), flush=True)
                except Exception as e:
                    erros += 1
                    log.append('{}: {}'.format(email, str(e)))
                    print('[CAMPANHA {}] ERRO em {}: {}'.format(campanha_id, email, str(e)), flush=True)
                    campanha.total_erros = erros
                    db.session.commit()
            server.quit()
        except Exception as e:
            campanha.status = 'erro'
            campanha.log_erros = str(e)
            db.session.commit()
            return
        campanha.status         = 'enviada'
        campanha.total_enviados = enviados
        campanha.total_erros    = erros
        campanha.log_erros      = '\n'.join(log)
        campanha.enviado_em     = datetime.utcnow()
        db.session.commit()


@marketing_campanha_bp.route('/', methods=['GET'])
def listar():
    user = get_current_user_from_request(request)
    q = MarketingCampanha.query
    q = filter_owned(q, MarketingCampanha, user)
    itens = q.order_by(MarketingCampanha.criado_em.desc()).all()
    return jsonify([i.to_dict() for i in itens])


@marketing_campanha_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    user = get_current_user_from_request(request)
    item = MarketingCampanha.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    return jsonify(item.to_dict())


@marketing_campanha_bp.route('/', methods=['POST'])
def criar():
    user = get_current_user_from_request(request)
    data = request.get_json() or {}
    item = MarketingCampanha(
        nome             = data.get('nome'),
        assunto          = data.get('assunto'),
        corpo_html       = data.get('corpo_html'),
        smtp_id          = data.get('smtp_id'),
        grupos_ids       = json.dumps(data.get('grupos_ids', [])),
        contatos_ids     = json.dumps(data.get('contatos_ids', [])),
        contatos_extras  = json.dumps(data.get('contatos_extras', [])),
        status           = 'rascunho',
        data_agendamento = datetime.fromisoformat(data['data_agendamento']) if data.get('data_agendamento') else None,
        criado_por       = user.id if user else None,
    )
    db.session.add(item)
    db.session.commit()
    try:
        create_log(user=user, action='create_marketing_campanha', entity='marketing_campanha',
                   entity_id=item.id, details={'payload': data}, req=request)
    except Exception: pass
    return jsonify(item.to_dict()), 201


@marketing_campanha_bp.route('/<int:id>', methods=['PUT'])
def atualizar(id):
    user = get_current_user_from_request(request)
    item = MarketingCampanha.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    data = request.get_json() or {}
    before = None
    try: before = item.to_dict()
    except Exception: before = None
    item.nome             = data.get('nome', item.nome)
    item.assunto          = data.get('assunto', item.assunto)
    item.corpo_html       = data.get('corpo_html', item.corpo_html)
    item.smtp_id          = data.get('smtp_id', item.smtp_id)
    item.grupos_ids       = json.dumps(data.get('grupos_ids', json.loads(item.grupos_ids)))
    item.contatos_ids     = json.dumps(data.get('contatos_ids', json.loads(item.contatos_ids)))
    item.contatos_extras  = json.dumps(data.get('contatos_extras', json.loads(item.contatos_extras)))
    item.data_agendamento = datetime.fromisoformat(data['data_agendamento']) if data.get('data_agendamento') else None
    db.session.commit()
    try:
        create_log(user=user, action='update_marketing_campanha', entity='marketing_campanha',
                   entity_id=id, details={'before': before, 'after_payload': data}, req=request)
    except Exception: pass
    return jsonify(item.to_dict())


@marketing_campanha_bp.route('/<int:id>', methods=['DELETE'])
def deletar(id):
    user = get_current_user_from_request(request)
    item = MarketingCampanha.query.get_or_404(id)
    if not can_access(user, item):
        return forbidden()
    snapshot = None
    try: snapshot = item.to_dict()
    except Exception: snapshot = None
    db.session.delete(item)
    db.session.commit()
    try:
        create_log(user=user, action='delete_marketing_campanha', entity='marketing_campanha',
                   entity_id=id, details={'deleted': snapshot}, req=request)
    except Exception: pass
    return jsonify({'success': True})


@marketing_campanha_bp.route('/<int:id>/enviar', methods=['POST'])
def enviar(id):
    user = get_current_user_from_request(request)
    campanha = MarketingCampanha.query.get_or_404(id)
    if not can_access(user, campanha):
        return forbidden()
    if campanha.status == 'enviando':
        return jsonify({'success': False, 'error': 'Campanha ja esta sendo enviada.'}), 400
    campanha.status           = 'enviando'
    campanha.data_agendamento = None
    db.session.commit()
    app = current_app._get_current_object()
    t = threading.Thread(target=_disparar, args=(id, app))
    t.daemon = True
    t.start()
    try:
        create_log(user=user, action='send_marketing_campanha', entity='marketing_campanha',
                   entity_id=id, details={'status': campanha.status}, req=request)
    except Exception: pass
    return jsonify({'success': True, 'message': 'Disparo iniciado!'})


@marketing_campanha_bp.route('/<int:id>/agendar', methods=['POST'])
def agendar(id):
    user = get_current_user_from_request(request)
    campanha = MarketingCampanha.query.get_or_404(id)
    if not can_access(user, campanha):
        return forbidden()
    data   = request.get_json()
    dt_str = data.get('data_agendamento')
    if not dt_str:
        return jsonify({'success': False, 'error': 'Informe a data/hora do agendamento.'}), 400
    campanha.data_agendamento = datetime.fromisoformat(dt_str)
    campanha.status           = 'agendada'
    db.session.commit()
    try:
        create_log(user=user, action='schedule_marketing_campanha', entity='marketing_campanha',
                   entity_id=id, details={'data_agendamento': dt_str}, req=request)
    except Exception: pass
    return jsonify({'success': True, 'message': 'Campanha agendada com sucesso!'})


@marketing_campanha_bp.route('/processar-agendamentos', methods=['POST'])
def processar_agendamentos():
    user = get_current_user_from_request(request)
    agora     = datetime.utcnow()
    pendentes = MarketingCampanha.query.filter(
        MarketingCampanha.status == 'agendada',
        MarketingCampanha.data_agendamento <= agora
    ).all()
    ids = [c.id for c in pendentes]
    for c in pendentes:
        _app = current_app._get_current_object()
        t = threading.Thread(target=_disparar, args=(c.id, _app))
        t.daemon = True
        t.start()
    try:
        create_log(user=user, action='process_scheduled_marketing_campanhas',
                   entity='marketing_campanha', entity_id=None,
                   details={'processadas': len(pendentes), 'ids': ids}, req=request)
    except Exception: pass
    return jsonify({'success': True, 'processadas': len(pendentes)})
