#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os, sys, time, logging, smtplib
from datetime import datetime, timedelta, date
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import create_app, db

os.makedirs('/var/www/cmms_project/backend/logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [CRMReminder] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('/var/www/cmms_project/backend/logs/crm_reminder.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)


def send_email(smtp, to_list, subject, html_body):
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    msg['From']    = f'{smtp.nome_remetente} <{smtp.email_remetente}>'
    msg['To']      = ', '.join(to_list)
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))
    if smtp.use_ssl:
        server = smtplib.SMTP_SSL(smtp.host, smtp.port, timeout=15)
    else:
        server = smtplib.SMTP(smtp.host, smtp.port, timeout=15)
        if smtp.use_tls:
            server.starttls()
    server.login(smtp.username, smtp.password)
    server.send_message(msg)
    server.quit()


def process_specific(app):
    from app.models.crm_reminder import CRMReminder
    from app.models.marketing_smtp import MarketingSmtp
    with app.app_context():
        now     = datetime.utcnow()
        pending = CRMReminder.query.filter(
            CRMReminder.enviado == False,
            CRMReminder.data_hora <= now
        ).all()
        for r in pending:
            try:
                smtp = MarketingSmtp.query.get(r.smtp_id) if r.smtp_id \
                       else MarketingSmtp.query.filter_by(ativo=True).first()
                if not smtp:
                    log.warning(f'Reminder {r.id}: sem SMTP')
                    continue
                html = f"""
                <html><body style="font-family:Arial,sans-serif;padding:24px">
                <h2 style="color:#7c3aed">{r.titulo}</h2>
                <p><b>Agendado para:</b> {r.data_hora.strftime('%d/%m/%Y %H:%M')}</p>
                {"<p><b>Obs:</b> "+r.descricao+"</p>" if r.descricao else ""}
                <hr><p style="color:#999;font-size:12px">Vimax CRM</p>
                </body></html>"""
                to = [e.strip() for e in r.email_destino.split(',') if e.strip()]
                send_email(smtp, to, f'[Lembrete] {r.titulo}', html)
                r.enviado    = True
                r.enviado_em = datetime.utcnow()
                db.session.commit()
                log.info(f'Reminder {r.id} enviado → {to}')
            except Exception as e:
                log.error(f'Erro reminder {r.id}: {e}')


def process_daily(app, last_sent):
    from app.models.crm_reminder import CRMReminderConfig
    from app.models.crm_opportunity import CRMOpportunity
    from app.models.marketing_smtp import MarketingSmtp
    with app.app_context():
        cfg = CRMReminderConfig.query.first()
        if not cfg or not cfg.ativo:
            return last_sent
        now = datetime.now()
        hh, mm = cfg.hora_envio.split(':')
        target = now.replace(hour=int(hh), minute=int(mm), second=0, microsecond=0)
        if last_sent and last_sent.date() == now.date():
            return last_sent
        if now < target:
            return last_sent
        limite = date.today() + timedelta(days=cfg.antecedencia)
        leads  = CRMOpportunity.query.filter(
            CRMOpportunity.data_proxima_acao != None,
            CRMOpportunity.data_proxima_acao <= limite,
            CRMOpportunity.status != 'Perdido'
        ).order_by(CRMOpportunity.data_proxima_acao).all()
        if not leads:
            log.info('Digest diário: nenhum lead')
            return now
        smtp = MarketingSmtp.query.get(cfg.smtp_id) if cfg.smtp_id \
               else MarketingSmtp.query.filter_by(ativo=True).first()
        if not smtp:
            log.warning('Digest diário: sem SMTP')
            return last_sent
        rows = ''.join([f"""
            <tr>
              <td style="padding:8px;border-bottom:1px solid #eee">{l.lead_nome}</td>
              <td style="padding:8px;border-bottom:1px solid #eee">{l.empresa or '—'}</td>
              <td style="padding:8px;border-bottom:1px solid #eee">{l.status or '—'}</td>
              <td style="padding:8px;border-bottom:1px solid #eee">{l.data_proxima_acao.strftime('%d/%m/%Y') if l.data_proxima_acao else '—'}</td>
              <td style="padding:8px;border-bottom:1px solid #eee">{l.proxima_acao or '—'}</td>
            </tr>""" for l in leads])
        html = f"""
        <html><body style="font-family:Arial,sans-serif;padding:24px">
        <h2 style="color:#7c3aed">📋 Próximas Ações — {date.today().strftime('%d/%m/%Y')}</h2>
        <p>{len(leads)} lead(s) com ação até {limite.strftime('%d/%m/%Y')}:</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">
          <thead style="background:#7c3aed;color:#fff">
            <tr>
              <th style="padding:10px;text-align:left">Lead</th>
              <th style="padding:10px;text-align:left">Empresa</th>
              <th style="padding:10px;text-align:left">Status</th>
              <th style="padding:10px;text-align:left">Data Ação</th>
              <th style="padding:10px;text-align:left">Próxima Ação</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        <hr><p style="color:#999;font-size:12px">Vimax CRM — Digest automático</p>
        </body></html>"""
        to = [e.strip() for e in (cfg.email_destino or '').split(',') if e.strip()]
        if not to:
            log.warning('Digest diário: email_destino vazio')
            return now
        try:
            send_email(smtp, to, f'📋 CRM: {len(leads)} ação(ões) — {date.today().strftime("%d/%m")}', html)
            log.info(f'Digest enviado → {to}')
        except Exception as e:
            log.error(f'Erro digest: {e}')
        return now


def main():
    log.info('CRM Reminder Worker iniciado')
    app       = create_app()
    last_sent = None
    while True:
        try:
            process_specific(app)
            last_sent = process_daily(app, last_sent)
        except Exception as e:
            log.error(f'Loop error: {e}')
        time.sleep(60)

if __name__ == '__main__':
    main()
