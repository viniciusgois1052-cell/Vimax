import imaplib
import email
from email.header import decode_header
from datetime import datetime

from .. import db
from ..models.config_email import ConfigEmail
from ..models.chamado import Chamado
from ..models.chamado_interacao import ChamadoInteracao
from ..models.email_message_link import EmailMessageLink


def _decode_mime_words(value: str) -> str:
    if not value:
        return ''
    try:
        parts = decode_header(value)
        out = []
        for text, enc in parts:
            if isinstance(text, bytes):
                out.append(text.decode(enc or 'utf-8', errors='replace'))
            else:
                out.append(text)
        return ''.join(out).strip()
    except Exception:
        return value


def _extract_text_body(msg: email.message.Message) -> str:
    """
    Retorna melhor esforço:
    - prefere text/plain
    - senão pega text/html (limpo básico)
    """
    if msg.is_multipart():
        text_plain = None
        text_html = None
        for part in msg.walk():
            ctype = (part.get_content_type() or '').lower()
            disp = (part.get('Content-Disposition') or '').lower()
            if 'attachment' in disp:
                continue
            payload = part.get_payload(decode=True)
            if not payload:
                continue
            charset = part.get_content_charset() or 'utf-8'
            try:
                content = payload.decode(charset, errors='replace')
            except Exception:
                content = payload.decode('utf-8', errors='replace')

            if ctype == 'text/plain' and text_plain is None:
                text_plain = content
            elif ctype == 'text/html' and text_html is None:
                text_html = content

        if text_plain:
            return text_plain.strip()
        if text_html:
            # limpeza bem simples (sem deps)
            return (
                text_html
                .replace('<br>', '\n')
                .replace('<br/>', '\n')
                .replace('<br />', '\n')
                .replace('</p>', '\n')
                .replace('&nbsp;', ' ')
                .strip()
            )
        return ''
    else:
        payload = msg.get_payload(decode=True)
        if not payload:
            return ''
        charset = msg.get_content_charset() or 'utf-8'
        try:
            return payload.decode(charset, errors='replace').strip()
        except Exception:
            return payload.decode('utf-8', errors='replace').strip()


def _parse_addresses(from_header: str) -> str:
    # melhor esforço: retorna string inteira (não vamos depender de parseaddr sofisticado)
    return _decode_mime_words(from_header or '').strip()


def collect_emails(app):
    """
    - Cria Chamado quando email novo
    - Cria Interação quando reply (In-Reply-To / References) apontar para message_id já processado
    - Deduplica por Message-ID
    """
    with app.app_context():
        cfg = ConfigEmail.query.first()
        if not cfg or not cfg.imap_enabled:
            print("[email_collector] IMAP desabilitado ou sem configuração.")
            return

        if not cfg.imap_host or not cfg.imap_username or not cfg.imap_password:
            print("[email_collector] Config IMAP incompleta (host/user/pass).")
            return

        folder = cfg.imap_folder or 'INBOX'

        imap = None
        try:
            if cfg.imap_use_ssl:
                imap = imaplib.IMAP4_SSL(cfg.imap_host, int(cfg.imap_port or 993))
            else:
                imap = imaplib.IMAP4(cfg.imap_host, int(cfg.imap_port or 143))

            imap.login(cfg.imap_username, cfg.imap_password)
            imap.select(folder)

            # pegar apenas não lidos
            status, data = imap.search(None, 'UNSEEN')
            if status != 'OK':
                print("[email_collector] search UNSEEN falhou:", status, data)
                return

            ids = data[0].split()
            if not ids:
                print("[email_collector] Nenhum email novo.")
                return

            print(f"[email_collector] {len(ids)} email(s) novo(s) para processar.")

            for msg_id in ids:
                try:
                    status, msg_data = imap.fetch(msg_id, '(RFC822)')
                    if status != 'OK':
                        print("[email_collector] fetch falhou:", msg_id, status)
                        continue

                    raw = msg_data[0][1]
                    msg = email.message_from_bytes(raw)

                    message_id = (msg.get('Message-ID') or '').strip()
                    in_reply_to = (msg.get('In-Reply-To') or '').strip()
                    references = (msg.get('References') or '').strip()

                    subject = _decode_mime_words(msg.get('Subject') or '')
                    from_email = _parse_addresses(msg.get('From') or '')
                    body = _extract_text_body(msg)

                    if not body:
                        body = "(sem corpo de mensagem)"

                    # Deduplicação: se já processou esse Message-ID, só marca como lido e segue
                    if message_id:
                        exists = EmailMessageLink.query.filter_by(message_id=message_id).first()
                        if exists:
                            imap.store(msg_id, '+FLAGS', '\\Seen')
                            continue

                    # 1) Tentar achar chamado por thread headers
                    target_chamado_id = None

                    # Prioridade: In-Reply-To
                    if in_reply_to:
                        link = EmailMessageLink.query.filter_by(message_id=in_reply_to).first()
                        if link:
                            target_chamado_id = link.chamado_id

                    # Fallback: procurar o primeiro message-id em References que exista
                    if not target_chamado_id and references:
                        # normalmente vem como "<id1> <id2> <id3>"
                        refs = [r.strip() for r in references.split() if r.strip()]
                        for r in refs:
                            link = EmailMessageLink.query.filter_by(message_id=r).first()
                            if link:
                                target_chamado_id = link.chamado_id
                                break

                    # 2) Se achou chamado => cria interação
                    if target_chamado_id:
                        inter = ChamadoInteracao(
                            chamado_id=target_chamado_id,
                            autor=f"anonimo <{from_email}>" if from_email else "anonimo",
                            mensagem=body,
                            created_at=datetime.utcnow()
                        )
                        db.session.add(inter)
                        db.session.commit()

                        # grava link do email atual também (pra continuar thread)
                        if message_id:
                            db.session.add(EmailMessageLink(
                                message_id=message_id,
                                in_reply_to=in_reply_to or None,
                                chamado_id=target_chamado_id,
                                from_email=from_email,
                                subject=subject
                            ))
                            db.session.commit()

                        imap.store(msg_id, '+FLAGS', '\\Seen')
                        print(f"[email_collector] Interação adicionada no chamado #{target_chamado_id} (subject={subject}).")
                        continue

                    # 3) Senão => cria chamado novo
                    titulo = subject or "(Sem assunto)"
                    descricao = f"Aberto via e-mail por: {from_email or 'Anônimo'}\n\n{body}"

                    novo = Chamado(
                        titulo=titulo,
                        descricao=descricao,
                        status='aberto',
                        prioridade=cfg.email_default_prioridade or 'media',
                        tipo=cfg.email_default_tipo or 'maquinario',
                        categoria_id=cfg.email_default_categoria_id,
                        data_abertura=datetime.utcnow(),
                        ativo=True,
                        deleted_at=None
                    )

                    db.session.add(novo)
                    db.session.commit()

                    # grava link do email inicial
                    if message_id:
                        db.session.add(EmailMessageLink(
                            message_id=message_id,
                            in_reply_to=in_reply_to or None,
                            chamado_id=novo.id,
                            from_email=from_email,
                            subject=subject
                        ))
                        db.session.commit()

                    imap.store(msg_id, '+FLAGS', '\\Seen')
                    print(f"[email_collector] Chamado criado #{novo.id} (subject={subject}).")

                except Exception as e:
                    try:
                        db.session.rollback()
                    except Exception:
                        pass
                    print("[email_collector] erro processando email:", e)

        except Exception as e:
            print("[email_collector] erro geral:", e)
        finally:
            try:
                if imap:
                    imap.logout()
            except Exception:
                pass
