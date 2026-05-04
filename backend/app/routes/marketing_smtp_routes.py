# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from ..utils.auth import get_current_user_from_request
from .. import db
from ..utils.logging import create_log
from ..models.marketing_smtp import MarketingSmtp
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

marketing_smtp_bp = Blueprint('marketing_smtp', __name__)

def _sanitize_smtp_payload(data):
    data = dict(data or {})
    if 'password' in data and data.get('password'):
        data['password'] = '***'
    return data



@marketing_smtp_bp.route('/', methods=['GET'])
def listar():
    itens = MarketingSmtp.query.order_by(MarketingSmtp.nome).all()
    return jsonify([i.to_dict() for i in itens])


@marketing_smtp_bp.route('/<int:id>', methods=['GET'])
def obter(id):
    item = MarketingSmtp.query.get_or_404(id)
    return jsonify(item.to_dict())


@marketing_smtp_bp.route('/', methods=['POST'])
def criar():
    user = get_current_user_from_request(request)
    data = request.get_json() or {}
    item = MarketingSmtp(
        nome            = data.get('nome'),
        host            = data.get('host'),
        port            = int(data.get('port', 587)),
        username        = data.get('username'),
        password        = data.get('password'),
        email_remetente = data.get('email_remetente'),
        nome_remetente  = data.get('nome_remetente'),
        use_tls         = data.get('use_tls', True),
        use_ssl         = data.get('use_ssl', False),
        ativo           = data.get('ativo', True),
    )
    db.session.add(item)
    db.session.commit()

    try:
        create_log(user=user, action='create_marketing_smtp', entity='marketing_smtp', entity_id=item.id,
                   details={'payload': _sanitize_smtp_payload(data)}, req=request)
    except Exception:
        pass

    return jsonify(item.to_dict()), 201


@marketing_smtp_bp.route('/<int:id>', methods=['PUT'])
def atualizar(id):
    user = get_current_user_from_request(request)
    item = MarketingSmtp.query.get_or_404(id)
    data = request.get_json() or {}

    before = None
    try:
        before = item.to_dict()
    except Exception:
        before = None
    item.nome            = data.get('nome', item.nome)
    item.host            = data.get('host', item.host)
    item.port            = int(data.get('port', item.port))
    item.username        = data.get('username', item.username)
    item.password        = data.get('password', item.password)
    item.email_remetente = data.get('email_remetente', item.email_remetente)
    item.nome_remetente  = data.get('nome_remetente', item.nome_remetente)
    item.use_tls         = data.get('use_tls', item.use_tls)
    item.use_ssl         = data.get('use_ssl', item.use_ssl)
    item.ativo           = data.get('ativo', item.ativo)
    db.session.commit()

    try:
        create_log(user=user, action='update_marketing_smtp', entity='marketing_smtp', entity_id=id,
                   details={'before': before, 'after_payload': _sanitize_smtp_payload(data)}, req=request)
    except Exception:
        pass

    return jsonify(item.to_dict())


@marketing_smtp_bp.route('/<int:id>', methods=['DELETE'])
def deletar(id):
    user = get_current_user_from_request(request)
    item = MarketingSmtp.query.get_or_404(id)

    snapshot = None
    try:
        snapshot = item.to_dict()
    except Exception:
        snapshot = None

    db.session.delete(item)
    db.session.commit()

    try:
        create_log(user=user, action='delete_marketing_smtp', entity='marketing_smtp', entity_id=id,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass

    return jsonify({'success': True})


@marketing_smtp_bp.route('/<int:id>/testar', methods=['POST'])
def testar(id):
    user = get_current_user_from_request(request)
    item = MarketingSmtp.query.get_or_404(id)
    data = request.get_json() or {}
    email_destino = data.get('email_destino')

    if not email_destino:
        return jsonify({'success': False, 'error': 'Informe o e-mail de destino para o teste.'}), 400

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Teste SMTP - Vimax Marketing'
        msg['From']    = '{} <{}>'.format(item.nome_remetente, item.email_remetente)
        msg['To']      = email_destino

        corpo_html = """
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: #4CAF50;">Configuracao SMTP OK!</h2>
            <p>Este e-mail confirma que a configuracao SMTP do sistema Vimax esta funcionando corretamente.</p>
            <p><strong>Configuracao:</strong> {}</p>
            <p><strong>Host:</strong> {}:{}</p>
            <hr>
            <p style="color: #999; font-size: 12px;">Vimax - Sistema de Gestao</p>
        </body>
        </html>
        """.format(item.nome, item.host, item.port)

        parte_html = MIMEText(corpo_html, 'html')
        msg.attach(parte_html)

        if item.use_ssl:
            server = smtplib.SMTP_SSL(item.host, item.port, timeout=10)
        else:
            server = smtplib.SMTP(item.host, item.port, timeout=10)
            if item.use_tls:
                server.starttls()

        server.login(item.username, item.password)
        server.sendmail(item.email_remetente, [email_destino], msg.as_string())
        server.quit()

        try:
            create_log(user=user, action='test_marketing_smtp', entity='marketing_smtp', entity_id=id,
                       details={'email_destino': email_destino, 'result': 'success'}, req=request)
        except Exception:
            pass

        return jsonify({'success': True, 'message': 'E-mail de teste enviado para {}!'.format(email_destino)})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
