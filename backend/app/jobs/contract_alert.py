from datetime import datetime, timedelta
from ..models.contrato import Contrato
from ..models.config_email import ConfigEmail
from .. import mail
from flask_mail import Message

def check_contract_expirations(app):
    with app.app_context():
        hoje = datetime.now().date()
        contratos = Contrato.query.all()
        
        config = ConfigEmail.query.first()
        if not config:
            print("Configuração de email não encontrada para alertas.")
            return

        for contrato in contratos:
            # Calcula a data de alerta baseada na configuração individual do contrato
            data_alerta = contrato.data_fim - timedelta(days=contrato.dias_aviso_vencimento)
            
            # Se hoje atingiu ou passou a data de alerta, mas o contrato ainda não venceu
            if hoje >= data_alerta and hoje <= contrato.data_fim:
                msg = Message(
                    f"ALERTA DE VENCIMENTO: Contrato {contrato.numero}",
                    sender=config.usuario,
                    recipients=[config.usuario]
                )
                dias_restantes = (contrato.data_fim - hoje).days
                msg.body = (f"O contrato {contrato.numero} com o fornecedor {contrato.fornecedor.nome} "
                            f"vence em {contrato.data_fim}.\n\n"
                            f"Status: Faltam {dias_restantes} dias para o término.\n"
                            f"Observações: {contrato.observacao or 'Nenhuma'}")
                try:
                    mail.send(msg)
                    print(f"E-mail de alerta enviado para o contrato {contrato.numero}")
                except Exception as e:
                    print(f"Erro ao enviar e-mail de alerta para {contrato.numero}: {e}")
