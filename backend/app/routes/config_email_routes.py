from flask import Blueprint, request, jsonify
from ..models.config_email import ConfigEmail
from .. import db
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import traceback

config_email_bp = Blueprint('config_email_bp', __name__)

@config_email_bp.route('', methods=['GET'])
def get_config_email():
    try:
        config = ConfigEmail.query.first()
        if config:
            return jsonify(config.to_dict()), 200

        return jsonify({
            'mail_server': '',
            'mail_port': 587,
            'mail_use_tls': True,
            'mail_username': '',
            'mail_password': '',
            'mail_default_sender': '',
            'alert_days_before': 30,
            'alert_recipients': '',

            # IMAP
            'imap_enabled': False,
            'imap_host': '',
            'imap_port': 993,
            'imap_use_ssl': True,
            'imap_username': '',
            'imap_password': '',
            'imap_folder': 'INBOX',

            'email_default_prioridade': 'media',
            'email_default_tipo': 'maquinario',
            'email_default_categoria_id': None,
        }), 200
    except Exception as e:
        print(f"Erro ao buscar config: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@config_email_bp.route('', methods=['PUT', 'POST'])
def save_config_email():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'Nenhum dado fornecido'}), 400

        config = ConfigEmail.query.first()
        if not config:
            config = ConfigEmail()
            db.session.add(config)

        # SMTP / Alertas
        config.mail_server = data.get('mail_server', config.mail_server or '')
        config.mail_port = int(data.get('mail_port', config.mail_port or 587))
        config.mail_use_tls = data.get('mail_use_tls', config.mail_use_tls if hasattr(config, 'mail_use_tls') else True)
        config.mail_username = data.get('mail_username', config.mail_username or '')
        if data.get('mail_password'):
            config.mail_password = data.get('mail_password')
        config.mail_default_sender = data.get('mail_default_sender', config.mail_default_sender or '')
        config.alert_days_before = int(data.get('alert_days_before', config.alert_days_before or 30))
        config.alert_recipients = data.get('alert_recipients', config.alert_recipients or '')

        # IMAP
        if 'imap_enabled' in data:
            config.imap_enabled = bool(data.get('imap_enabled'))
        config.imap_host = data.get('imap_host', config.imap_host or '')
        config.imap_port = int(data.get('imap_port', config.imap_port or 993))
        config.imap_use_ssl = data.get('imap_use_ssl', config.imap_use_ssl if hasattr(config, 'imap_use_ssl') else True)
        config.imap_username = data.get('imap_username', config.imap_username or '')
        if data.get('imap_password'):
            config.imap_password = data.get('imap_password')
        config.imap_folder = data.get('imap_folder', config.imap_folder or 'INBOX')

        config.email_default_prioridade = data.get('email_default_prioridade', getattr(config, 'email_default_prioridade', None) or 'media')
        config.email_default_tipo = data.get('email_default_tipo', getattr(config, 'email_default_tipo', None) or 'maquinario')
        if 'email_default_categoria_id' in data:
            try:
                v = data.get('email_default_categoria_id')
                config.email_default_categoria_id = int(v) if v not in (None, '', 'none', 'undefined') else None
            except Exception:
                config.email_default_categoria_id = None

        db.session.commit()
        return jsonify({'success': True, 'message': 'Configurações de email salvas com sucesso!', 'data': config.to_dict()}), 200

    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f'Erro de validação: {str(e)}'}), 400
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao salvar config: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Erro ao salvar configurações: {str(e)}'}), 500


@config_email_bp.route('/test-email', methods=['POST'])
def test_email():
    try:
        data = request.get_json()
        recipient = data.get('recipient') if data else None
        if not recipient:
            return jsonify({'success': False, 'message': 'Email de destino não fornecido'}), 400

        config = ConfigEmail.query.first()
        if not config or not config.mail_server:
            return jsonify({'success': False, 'message': 'Configurações de email não encontradas. Configure o SMTP primeiro.'}), 400

        try:
            if config.mail_use_tls:
                server = smtplib.SMTP(config.mail_server, config.mail_port, timeout=10)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(config.mail_server, config.mail_port, timeout=10)

            server.login(config.mail_username, config.mail_password)

            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Teste de Email - Vimax CMMS'
            msg['From'] = config.mail_default_sender or config.mail_username
            msg['To'] = recipient

            text = f"""Olá,

Este é um email de teste do sistema Vimax CMMS.

Data/Hora do teste: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
"""
            html = f"""
            <html><body>
            <h3>Teste de Email - Vimax CMMS</h3>
            <p>Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
            </body></html>
            """

            msg.attach(MIMEText(text, 'plain'))
            msg.attach(MIMEText(html, 'html'))

            server.send_message(msg)
            server.quit()

            return jsonify({'success': True, 'message': f'Email de teste enviado com sucesso para {recipient}!'}), 200

        except smtplib.SMTPAuthenticationError:
            return jsonify({'success': False, 'message': 'Erro de autenticação SMTP: usuário ou senha incorretos.'}), 401
        except smtplib.SMTPException as e:
            return jsonify({'success': False, 'message': f'Erro SMTP: {str(e)}'}), 500

    except Exception as e:
        print(f"Erro no endpoint test-email: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Erro: {str(e)}'}), 500


@config_email_bp.route('/trigger-contract-alerts', methods=['POST'])
def trigger_contract_alerts():
    try:
        # ✅ arquivo real no seu servidor é contract_alerts.py
        from ..jobs.contract_alerts import check_contract_expirations
        from flask import current_app

        check_contract_expirations(current_app)
        return jsonify({'success': True, 'message': 'Verificação de vencimento de contratos disparada com sucesso!'}), 200
    except Exception as e:
        print(f"Erro ao disparar alertas: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Erro ao disparar verificação de contratos: {str(e)}'}), 500
