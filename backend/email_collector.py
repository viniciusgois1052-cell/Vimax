import imaplib
import email
from email.header import decode_header
import time
import logging
import os
import sys

# Adiciona o path do projeto
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.chamado import Chamado
from datetime import datetime

# Configurações IMAP
IMAP_HOST = 'imap.brdrive.net'
IMAP_PORT = 993
EMAIL_USER = 'manutencao.digimax@digimaxdiagnostico.com.br'
EMAIL_PASS = 'Mn2026@GX'
CHECK_INTERVAL = 60  # segundos entre cada verificação

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [EmailCollector] %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('/var/www/cmms_project/backend/logs/email_collector.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)


def decode_str(value):
    if not value:
        return ''
    parts = decode_header(value)
    result = ''
    for part, enc in parts:
        if isinstance(part, bytes):
            result += part.decode(enc or 'utf-8', errors='replace')
        else:
            result += part
    return result.strip()


def get_body(msg):
    body = ''
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get('Content-Disposition') or '')
            if content_type == 'text/plain' and 'attachment' not in disposition:
                try:
                    body = part.get_payload(decode=True).decode(
                        part.get_content_charset() or 'utf-8', errors='replace'
                    )
                    break
                except Exception:
                    pass
    else:
        try:
            body = msg.get_payload(decode=True).decode(
                msg.get_content_charset() or 'utf-8', errors='replace'
            )
        except Exception:
            pass
    return body.strip()


def process_emails(app):
    with app.app_context():
        try:
            mail = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT)
            mail.login(EMAIL_USER, EMAIL_PASS)
            mail.select('INBOX')

            # Busca e-mails não lidos
            status, messages = mail.search(None, 'UNSEEN')
            if status != 'OK' or not messages[0]:
                mail.logout()
                return

            email_ids = messages[0].split()
            log.info(f'{len(email_ids)} e-mail(s) novo(s) encontrado(s).')

            for eid in email_ids:
                try:
                    _, msg_data = mail.fetch(eid, '(RFC822)')
                    raw = msg_data[0][1]
                    msg = email.message_from_bytes(raw)

                    assunto = decode_str(msg.get('Subject')) or 'Sem assunto'
                    remetente = decode_str(msg.get('From')) or 'Desconhecido'
                    corpo = get_body(msg)

                    descricao = f"**E-mail recebido de:** {remetente}\n\n{corpo}"

                    novo_chamado = Chamado(
                        titulo=assunto[:255],
                        descricao=descricao,
                        status='aberto',
                        prioridade='media',
                        tipo='maquinario',
                        empresa_id=None,
                        data_abertura=datetime.utcnow(),
                        ativo=True
                    )

                    db.session.add(novo_chamado)
                    db.session.commit()
                    log.info(f'Chamado #{novo_chamado.id} criado: "{assunto}" de {remetente}')

                    # Marca e-mail como lido
                    mail.store(eid, '+FLAGS', '\\Seen')

                except Exception as e:
                    log.error(f'Erro ao processar e-mail {eid}: {e}')
                    try: db.session.rollback()
                    except: pass

            mail.logout()

        except Exception as e:
            log.error(f'Erro de conexão IMAP: {e}')


def main():
    log.info('Iniciando coletor de e-mails...')
    os.makedirs('/var/www/cmms_project/backend/logs', exist_ok=True)
    app = create_app()
    while True:
        process_emails(app)
        log.info(f'Aguardando {CHECK_INTERVAL}s para próxima verificação...')
        time.sleep(CHECK_INTERVAL)


if __name__ == '__main__':
    main()
