from flask_mail import Mail, Message
from flask import current_app
import os

mail = Mail()

def enviar_email_rq_para_pc(requisicao, pedido):
    """Envia email quando RQ é convertida para PC"""
    try:
        solicitante_email = requisicao.solicitante.email if requisicao.solicitante else None
        if not solicitante_email:
            current_app.logger.warning(f"Solicitante sem email para RQ {requisicao.numero_rq}")
            return False

        assunto = f"✓ Sua Requisição {requisicao.numero_rq} foi convertida para Pedido de Compra"
        
        corpo = f"""
        <h2>Requisição Convertida para Pedido de Compra</h2>
        <p>Olá {requisicao.solicitante.nome},</p>
        <p>Sua requisição <strong>{requisicao.numero_rq}</strong> foi aprovada e convertida para <strong>Pedido de Compra nº {pedido.numero_pc}</strong></p>
        
        <h3>Detalhes:</h3>
        <ul>
            <li><strong>Empresa:</strong> {requisicao.empresa.nome}</li>
            <li><strong>Fornecedor:</strong> {pedido.fornecedor.nome}</li>
            <li><strong>Valor Total:</strong> R$ {pedido.valor_total:.2f}</li>
            <li><strong>Data Entrega Prevista:</strong> {pedido.data_entrega.strftime('%d/%m/%Y')}</li>
        </ul>
        
        <p>Acompanhe o status do seu pedido no sistema CMMS.</p>
        <p>Att,<br>Sistema CMMS</p>
        """
        
        msg = Message(
            subject=assunto,
            recipients=[solicitante_email],
            html=corpo
        )
        
        mail.send(msg)
        current_app.logger.info(f"Email enviado para {solicitante_email} - RQ convertida para PC")
        return True
        
    except Exception as e:
        current_app.logger.error(f"Erro ao enviar email RQ→PC: {str(e)}")
        return False


def enviar_email_pc_para_oc(pedido, ordem):
    """Envia email quando PC é convertida para OC"""
    try:
        solicitante_email = pedido.requisicao.solicitante.email if pedido.requisicao and pedido.requisicao.solicitante else None
        if not solicitante_email:
            current_app.logger.warning(f"Solicitante sem email para PC {pedido.numero_pc}")
            return False

        assunto = f"✓ Seu Pedido {pedido.numero_pc} foi convertido para Ordem de Compra"
        
        corpo = f"""
        <h2>Pedido Convertido para Ordem de Compra</h2>
        <p>Olá {pedido.requisicao.solicitante.nome},</p>
        <p>Seu pedido <strong>{pedido.numero_pc}</strong> foi aprovado e convertido para <strong>Ordem de Compra nº {ordem.numero_oc}</strong></p>
        
        <h3>Detalhes:</h3>
        <ul>
            <li><strong>Empresa:</strong> {pedido.requisicao.empresa.nome}</li>
            <li><strong>Fornecedor:</strong> {pedido.fornecedor.nome}</li>
            <li><strong>Valor Total:</strong> R$ {ordem.valor_total:.2f}</li>
            <li><strong>Data Entrega Prevista:</strong> {ordem.data_entrega.strftime('%d/%m/%Y')}</li>
        </ul>
        
        <p>Acompanhe o status da sua ordem no sistema CMMS.</p>
        <p>Att,<br>Sistema CMMS</p>
        """
        
        msg = Message(
            subject=assunto,
            recipients=[solicitante_email],
            html=corpo
        )
        
        mail.send(msg)
        current_app.logger.info(f"Email enviado para {solicitante_email} - PC convertida para OC")
        return True
        
    except Exception as e:
        current_app.logger.error(f"Erro ao enviar email PC→OC: {str(e)}")
        return False


def enviar_email_oc_criada_comprador(ordem):
    """Envia email para o comprador quando OC é criada"""
    try:
        comprador_email = os.getenv('COMPRADOR_EMAIL', 'comprador@empresa.com')
        
        assunto = f"📋 Nova Ordem de Compra: {ordem.numero_oc}"
        
        corpo = f"""
        <h2>Nova Ordem de Compra Criada</h2>
        <p>Olá Comprador,</p>
        <p>Uma nova ordem de compra foi criada no sistema.</p>
        
        <h3>Detalhes da Ordem:</h3>
        <ul>
            <li><strong>Nº OC:</strong> {ordem.numero_oc}</li>
            <li><strong>Fornecedor:</strong> {ordem.fornecedor.nome}</li>
            <li><strong>Empresa:</strong> {ordem.pedido.requisicao.empresa.nome if ordem.pedido and ordem.pedido.requisicao else 'N/A'}</li>
            <li><strong>Valor Total:</strong> R$ {ordem.valor_total:.2f}</li>
            <li><strong>Data Entrega Prevista:</strong> {ordem.data_entrega.strftime('%d/%m/%Y')}</li>
            <li><strong>Status:</strong> {ordem.status}</li>
        </ul>
        
        <h3>Itens:</h3>
        <ul>
        """
        
        if ordem.itens:
            for item in ordem.itens:
                corpo += f"<li>{item.nome} - {item.quantidade} UN x R$ {item.preco_unitario:.2f}</li>"
        
        corpo += """
        </ul>
        
        <p>Acesse o sistema CMMS para acompanhar e gerenciar esta ordem.</p>
        <p>Att,<br>Sistema CMMS</p>
        """
        
        msg = Message(
            subject=assunto,
            recipients=[comprador_email],
            html=corpo
        )
        
        mail.send(msg)
        current_app.logger.info(f"Email enviado para comprador - OC {ordem.numero_oc} criada")
        return True
        
    except Exception as e:
        current_app.logger.error(f"Erro ao enviar email OC criada: {str(e)}")
        return False


def enviar_email_oc_aprovada_comprador(ordem):
    """Envia email para o comprador quando OC é aprovada"""
    try:
        comprador_email = os.getenv('COMPRADOR_EMAIL', 'comprador@empresa.com')
        
        assunto = f"✅ Ordem de Compra APROVADA: {ordem.numero_oc}"
        
        corpo = f"""
        <h2>Ordem de Compra Aprovada</h2>
        <p>Olá Comprador,</p>
        <p>A ordem de compra <strong>{ordem.numero_oc}</strong> foi <strong>APROVADA</strong>!</p>
        
        <h3>Detalhes:</h3>
        <ul>
            <li><strong>Nº OC:</strong> {ordem.numero_oc}</li>
            <li><strong>Fornecedor:</strong> {ordem.fornecedor.nome}</li>
            <li><strong>Valor Total:</strong> R$ {ordem.valor_total:.2f}</li>
            <li><strong>Data Entrega Prevista:</strong> {ordem.data_entrega.strftime('%d/%m/%Y')}</li>
        </ul>
        
        <p>Você pode agora prosseguir com o envio ao fornecedor.</p>
        <p>Att,<br>Sistema CMMS</p>
        """
        
        msg = Message(
            subject=assunto,
            recipients=[comprador_email],
            html=corpo
        )
        
        mail.send(msg)
        current_app.logger.info(f"Email enviado para comprador - OC {ordem.numero_oc} aprovada")
        return True
        
    except Exception as e:
        current_app.logger.error(f"Erro ao enviar email OC aprovada: {str(e)}")
        return False
