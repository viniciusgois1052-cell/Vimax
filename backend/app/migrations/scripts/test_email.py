import os
from dotenv import load_dotenv
from flask import Flask
from flask_mail import Mail, Message

load_dotenv('/var/www/cmms_project/backend/.env')

app = Flask(__name__)
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

mail = Mail(app)

print("📧 Testando conexão SMTP...")
print(f"Servidor: {app.config['MAIL_SERVER']}:{app.config['MAIL_PORT']}")
print(f"Usuário: {app.config['MAIL_USERNAME']}")

try:
    with app.app_context():
        msg = Message(
            subject="✅ TESTE - Email CMMS",
            recipients=['ti01@digimaxdiagnostico.com.br'],
            html="<h2>Email de teste funcionando!</h2><p>Se você recebeu este email, a configuração está correta!</p>"
        )
        mail.send(msg)
        print("✅ EMAIL ENVIADO COM SUCESSO!")
except Exception as e:
    print(f"❌ ERRO: {str(e)}")
    import traceback
    traceback.print_exc()
