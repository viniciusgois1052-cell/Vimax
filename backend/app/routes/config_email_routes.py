from flask import Blueprint, request, jsonify
from ..utils.auth import get_current_user_from_request
from ..models.config_email import ConfigEmail
from .. import db
from ..utils.logging import create_log
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import traceback

config_email_bp = Blueprint('config_email_bp', __name__)

def _sanitize_email_config_payload(data):
    data = dict(data or {})
    if 'mail_password' in data and data.get('mail_password'):
        data['mail_password'] = '***'
    return data


@config_email_bp.route('', methods=['GET'])
def get_config_email():
    """Retorna as configurações de email atuais (sem a senha)"""
    try:
        config = ConfigEmail.query.first()
        before = None
        try:
            before = config.to_dict() if config else None
        except Exception:
            before = None
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
            'alert_recipients': ''
        }), 200
    except Exception as e:
        print(f"Erro ao buscar config: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@config_email_bp.route('', methods=['PUT', 'POST'])
def save_config_email():
    """Salva as configurações de email"""
    user = get_current_user_from_request(request)
    try:
        data = request.get_json() or {}
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Nenhum dado fornecido'
            }), 400
        
        config = ConfigEmail.query.first()
        before = None
        try:
            before = config.to_dict() if config else None
        except Exception:
            before = None
        
        if not config:
            config = ConfigEmail()
            db.session.add(config)
        
        # Atualiza os campos de configuração com validação
        config.mail_server = data.get('mail_server', config.mail_server or '')
        config.mail_port = int(data.get('mail_port', config.mail_port or 587))
        config.mail_use_tls = data.get('mail_use_tls', config.mail_use_tls if hasattr(config, 'mail_use_tls') else True)
        config.mail_username = data.get('mail_username', config.mail_username or '')
        
        # Apenas atualiza a senha se foi fornecida
        if data.get('mail_password'):
            config.mail_password = data.get('mail_password')
        
        config.mail_default_sender = data.get('mail_default_sender', config.mail_default_sender or '')
        config.alert_days_before = int(data.get('alert_days_before', config.alert_days_before or 30))
        config.alert_recipients = data.get('alert_recipients', config.alert_recipients or '')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Configurações de email salvas com sucesso!',
            'data': config.to_dict()
        }), 200
        
    except ValueError as e:
        db.session.rollback()
        print(f"Erro de validação: {e}")
        return jsonify({
            'success': False,
            'message': f'Erro de validação: {str(e)}'
        }), 400
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao salvar config: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Erro ao salvar configurações: {str(e)}'
        }), 500

@config_email_bp.route('/test-email', methods=['POST'])
def test_email():
    """Envia um email de teste para validar as configurações"""
    user = get_current_user_from_request(request)
    try:
        data = request.get_json() or {}
        recipient = data.get('recipient')
        
        if not recipient:
            return jsonify({
                'success': False,
                'message': 'Email de destino não fornecido'
            }), 400
        
        # Obtém as configurações de email
        config = ConfigEmail.query.first()
        before = None
        try:
            before = config.to_dict() if config else None
        except Exception:
            before = None
        if not config or not config.mail_server:
            return jsonify({
                'success': False,
                'message': 'Configurações de email não encontradas. Por favor, configure o servidor SMTP primeiro.'
            }), 400
        
        try:
            # Cria a conexão SMTP
            if config.mail_use_tls:
                server = smtplib.SMTP(config.mail_server, config.mail_port, timeout=10)
                server.starttls()
            else:
                server = smtplib.SMTP_SSL(config.mail_server, config.mail_port, timeout=10)
            
            # Faz login
            server.login(config.mail_username, config.mail_password)
            
            # Cria a mensagem de teste
            msg = MIMEMultipart('alternative')
            msg['Subject'] = 'Teste de Email - Vimax CMMS'
            msg['From'] = config.mail_default_sender or config.mail_username
            msg['To'] = recipient
            
            # Corpo do email em texto e HTML
            text = f"""
Olá,

Este é um email de teste do sistema Vimax CMMS.

Se você recebeu este email, significa que as configurações de SMTP estão funcionando corretamente!

Data/Hora do teste: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}

Atenciosamente,
Sistema Vimax CMMS
            """
            
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333;">
                    <h2 style="color: #0066cc;">Teste de Email - Vimax CMMS</h2>
                    <p>Olá,</p>
                    <p>Este é um email de teste do sistema <strong>Vimax CMMS</strong>.</p>
                    <p style="color: #28a745; font-weight: bold;">✓ Se você recebeu este email, as configurações de SMTP estão funcionando corretamente!</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="color: #666; font-size: 12px;">
                        <strong>Data/Hora do teste:</strong> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}<br>
                        <strong>Servidor:</strong> {config.mail_server}:{config.mail_port}
                    </p>
                    <p style="color: #999; font-size: 11px; margin-top: 30px;">
                        Atenciosamente,<br>
                        Sistema Vimax CMMS
                    </p>
                </body>
            </html>
            """
            
            part1 = MIMEText(text, 'plain')
            part2 = MIMEText(html, 'html')
            msg.attach(part1)
            msg.attach(part2)
            
            # Envia o email
            server.send_message(msg)
            server.quit()
            
            try:
                create_log(user=user, action='test_email', entity='config_email', entity_id=getattr(config, 'id', None),
                           details={'recipient': recipient, 'result': 'success'}, req=request)
            except Exception:
                pass

            return jsonify({
                'success': True,
                'message': f'Email de teste enviado com sucesso para {recipient}!'
            }), 200
            
        except smtplib.SMTPAuthenticationError:
            return jsonify({
                'success': False,
                'message': 'Erro de autenticação: Usuário ou senha incorretos. Verifique suas credenciais.'
            }), 401
        except smtplib.SMTPException as e:
            return jsonify({
                'success': False,
                'message': f'Erro SMTP: {str(e)}'
            }), 500
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Erro ao enviar email de teste: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"Erro no endpoint test-email: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Erro: {str(e)}'
        }), 500

@config_email_bp.route('/trigger-contract-alerts', methods=['POST'])
def trigger_contract_alerts():
    """Dispara manualmente os alertas de vencimento de contrato"""
    user = get_current_user_from_request(request)
    try:
        from ..jobs.contract_alerts import check_contract_expirations
        from flask import current_app
        
        check_contract_expirations(current_app)

        try:
            create_log(user=user, action='trigger_contract_alerts', entity='contrato', entity_id=None,
                       details={'triggered': True}, req=request)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'message': 'Verificação de vencimento de contratos disparada com sucesso!'
        }), 200
    except Exception as e:
        print(f"Erro ao disparar alertas: {e}")
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Erro ao disparar verificação de contratos: {str(e)}'
        }), 500
