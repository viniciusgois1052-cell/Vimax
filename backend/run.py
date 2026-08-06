# -*- coding: utf-8 -*-
from app import create_app, db
from app.services.notification_service import mail
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = create_app()

# === EMAIL CONFIGURATION ===
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME', 'seu_email@gmail.com')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD', 'sua_senha_app')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@cmms.com')

# Inicializar Mail
mail.init_app(app)

# Emails de notificação
COMPRADOR_EMAIL = os.getenv('COMPRADOR_EMAIL', 'comprador@empresa.com')
ADMIN_EMAIL = os.getenv('ADMIN_EMAIL', 'admin@empresa.com')

def job_atualizar_todas():
    """Executa coleta de todas as impressoras - agendado às 10h diariamente."""
    from app.models.contador_impressora import ContadorImpressora
    from app.routes.contador_impressora_routes import (
        _get_modelo_tipo, coletar_por_modelo, _map_contadores_e_insumos_para_model
    )
    from datetime import datetime

    logging.info("[SCHEDULER] Iniciando coleta automática das impressoras...")
    with app.app_context():
        impressoras = ContadorImpressora.query.all()
        sucesso = falha = 0
        for c in impressoras:
            try:
                mt = _get_modelo_tipo(c)
                payload = coletar_por_modelo(
                    mt, c.ip,
                    http_usuario=getattr(c, 'http_usuario', None),
                    http_senha=getattr(c, 'http_senha', None),
                    http_porta=getattr(c, 'http_porta', None)
                )
                _map_contadores_e_insumos_para_model(c, payload)
                sucesso += 1
            except Exception as e:
                c.status = 'offline'
                c.ultima_leitura = datetime.utcnow()
                falha += 1
                logging.warning(f"[SCHEDULER] {c.nome}: {e}")
        db.session.commit()
        logging.info(f"[SCHEDULER] Coleta concluída: {sucesso} online, {falha} offline")

# Configurar scheduler
logging.basicConfig(level=logging.INFO)
scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")
scheduler.add_job(
    job_atualizar_todas,
    trigger=CronTrigger(hour=10, minute=0),
    id='coleta_impressoras',
    name='Coleta diária impressoras 10h',
    replace_existing=True
)
scheduler.start()
logging.info("[SCHEDULER] Agendado: coleta diária às 10:00 (America/Sao_Paulo)")

if __name__ == '__main__':
    try:
        app.run(debug=False, host='0.0.0.0', port=5002, use_reloader=False)
    finally:
        scheduler.shutdown()
