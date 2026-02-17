from datetime import datetime, timedelta
from ..models.contrato import Contrato
from ..models.config_email import ConfigEmail
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(subject, body, recipients, config):
    """Função auxiliar para enviar emails"""
    try:
        # Cria a conexão SMTP
        if config.mail_use_tls:
            server = smtplib.SMTP(config.mail_server, config.mail_port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(config.mail_server, config.mail_port)
        
        # Faz login
        server.login(config.mail_username, config.mail_password)
        
        # Cria a mensagem
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = config.mail_default_sender or config.mail_username
        msg['To'] = ', '.join(recipients)
        
        # Corpo do email em texto e HTML
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <h2 style="color: #ff6b6b;">⚠️ {subject}</h2>
                <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                    {body.replace(chr(10), '<br>')}
                </div>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="color: #999; font-size: 11px;">
                    Este é um alerta automático do sistema Vimax CMMS.<br>
                    Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
                </p>
            </body>
        </html>
        """
        
        part1 = MIMEText(body, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)
        
        # Envia o email
        server.send_message(msg)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Erro ao enviar email: {e}")
        return False

def check_contract_expirations(app):
    """Verifica contratos próximos do vencimento e envia alertas"""
    with app.app_context():
        hoje = datetime.now().date()
        contratos = Contrato.query.all()
        
        config = ConfigEmail.query.first()
        if not config or not config.mail_server:
            print("Configuração de email não encontrada ou não configurada para alertas.")
            return
        
        # Parse dos destinatários
        recipients = [email.strip() for email in config.alert_recipients.split(',') if email.strip()]
        if not recipients:
            print("Nenhum destinatário configurado para alertas de contrato.")
            return
        
        alertas_enviados = 0
        
        for contrato in contratos:
            try:
                # Verifica se o contrato tem data de fim
                if not contrato.data_fim:
                    continue
                
                # Calcula a data de alerta baseada na configuração
                data_alerta = contrato.data_fim - timedelta(days=config.alert_days_before)
                
                # Se hoje atingiu ou passou a data de alerta, mas o contrato ainda não venceu
                if hoje >= data_alerta and hoje <= contrato.data_fim:
                    dias_restantes = (contrato.data_fim - hoje).days
                    
                    subject = f"ALERTA DE VENCIMENTO: Contrato {contrato.numero}"
                    body = f"""Contrato: {contrato.numero}
Fornecedor: {contrato.fornecedor.nome if contrato.fornecedor else 'Não informado'}
Data de Vencimento: {contrato.data_fim.strftime('%d/%m/%Y')}
Dias Restantes: {dias_restantes}
Observações: {contrato.observacao or 'Nenhuma'}"""
                    
                    if send_email(subject, body, recipients, config):
                        print(f"Alerta de vencimento enviado para o contrato {contrato.numero}")
                        alertas_enviados += 1
                    else:
                        print(f"Erro ao enviar alerta para o contrato {contrato.numero}")
                        
            except Exception as e:
                print(f"Erro ao processar contrato {contrato.numero}: {e}")
        
        if alertas_enviados > 0:
            print(f"Total de alertas de vencimento enviados: {alertas_enviados}")

def check_expired_contracts(app):
    """Verifica contratos que já venceram e envia alertas"""
    with app.app_context():
        hoje = datetime.now().date()
        contratos = Contrato.query.all()
        
        config = ConfigEmail.query.first()
        if not config or not config.mail_server:
            print("Configuração de email não encontrada ou não configurada para alertas.")
            return
        
        # Parse dos destinatários
        recipients = [email.strip() for email in config.alert_recipients.split(',') if email.strip()]
        if not recipients:
            print("Nenhum destinatário configurado para alertas de contrato.")
            return
        
        contratos_vencidos = []
        
        for contrato in contratos:
            try:
                if contrato.data_fim and hoje > contrato.data_fim:
                    contratos_vencidos.append(contrato)
            except Exception as e:
                print(f"Erro ao processar contrato {contrato.numero}: {e}")
        
        if contratos_vencidos:
            # Envia um alerta consolidado de contratos vencidos
            subject = f"ALERTA CRÍTICO: {len(contratos_vencidos)} Contrato(s) Vencido(s)"
            body = f"""Existem {len(contratos_vencidos)} contrato(s) que já venceram:

"""
            for contrato in contratos_vencidos:
                dias_vencido = (hoje - contrato.data_fim).days
                body += f"""- {contrato.numero} ({contrato.fornecedor.nome if contrato.fornecedor else 'Fornecedor desconhecido'})
  Venceu há {dias_vencido} dias ({contrato.data_fim.strftime('%d/%m/%Y')})

"""
            
            if send_email(subject, body, recipients, config):
                print(f"Alerta de contratos vencidos enviado")
            else:
                print(f"Erro ao enviar alerta de contratos vencidos")
