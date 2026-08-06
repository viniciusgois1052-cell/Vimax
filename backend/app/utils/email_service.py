# -*- coding: utf-8 -*-
from flask_mail import Message
from flask import current_app, render_template_string
from .. import mail, db
from datetime import datetime
import os

class EmailService:
    """Serviço centralizado para envio de emails"""

    @staticmethod
    def send_email(destinatarios, assunto, corpo_html, anexos=None):
        """
        Envia email com suporte a múltiplos destinatários e anexos
        
        Args:
            destinatarios: str ou list de emails
            assunto: str
            corpo_html: str (HTML do email)
            anexos: list de dicts {'filename': 'nome.pdf', 'data': bytes, 'mimetype': 'application/pdf'}
        """
        try:
            if isinstance(destinatarios, str):
                destinatarios = [destinatarios]

            msg = Message(
                subject=assunto,
                recipients=destinatarios,
                html=corpo_html,
                sender=current_app.config.get('MAIL_DEFAULT_SENDER', 'noreply@vimax.com.br')
            )

            # Adicionar anexos
            if anexos:
                for anexo in anexos:
                    msg.attach(
                        filename=anexo['filename'],
                        content_type=anexo.get('mimetype', 'application/pdf'),
                        data=anexo['data']
                    )

            mail.send(msg)
            return {'success': True, 'message': 'Email enviado com sucesso'}

        except Exception as e:
            current_app.logger.error(f"Erro ao enviar email: {str(e)}")
            return {'success': False, 'message': str(e)}

    @staticmethod
    def template_requisicao_criada(requisicao, usuario_solicitante):
        """Template para nova requisição de compra"""
        return f"""
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .header h1 {{ margin: 0; font-size: 24px; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .info {{ margin: 10px 0; }}
                    .label {{ font-weight: bold; color: #4F46E5; }}
                    .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; }}
                    .badge {{ display: inline-block; background-color: #DBEAFE; color: #1E40AF; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📋 Nova Requisição de Compra Criada</h1>
                    </div>
                    
                    <div class="content">
                        <div class="info">
                            <span class="label">Nº Requisição:</span> {requisicao.numero_rq}
                        </div>
                        <div class="info">
                            <span class="label">Solicitante:</span> {usuario_solicitante.username}
                        </div>
                        <div class="info">
                            <span class="label">Empresa:</span> {requisicao.empresa.nome}
                        </div>
                        <div class="info">
                            <span class="label">Data Solicitação:</span> {requisicao.data_solicitacao.strftime('%d/%m/%Y %H:%M')}
                        </div>
                        <div class="info">
                            <span class="label">Data Necessária:</span> {requisicao.data_necessaria.strftime('%d/%m/%Y') if requisicao.data_necessaria else '-'}
                        </div>
                        <div class="info">
                            <span class="label">Valor Total:</span> R$ {sum(item.valor_total for item in requisicao.itens):.2f}
                        </div>
                        <div class="info">
                            <span class="label">Status:</span> <span class="badge">{requisicao.status}</span>
                        </div>
                        
                        {f'<div class="info"><span class="label">Descrição:</span> {requisicao.descricao}</div>' if requisicao.descricao else ''}
                        {f'<div class="info"><span class="label">Justificativa:</span> {requisicao.justificativa}</div>' if requisicao.justificativa else ''}
                    </div>
                    
                    <div class="footer">
                        <p>Este é um email automático. Favor não responda.</p>
                        <p>Vimax - Sistema de Gestão de Compras</p>
                    </div>
                </div>
            </body>
        </html>
        """

    @staticmethod
    def template_requisicao_aprovada(requisicao):
        """Template para requisição aprovada"""
        return f"""
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #10B981; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .header h1 {{ margin: 0; font-size: 24px; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .info {{ margin: 10px 0; }}
                    .label {{ font-weight: bold; color: #10B981; }}
                    .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; }}
                    .badge {{ display: inline-block; background-color: #D1FAE5; color: #065F46; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✓ Requisição de Compra Aprovada</h1>
                    </div>
                    
                    <div class="content">
                        <div class="info">
                            <span class="label">Nº Requisição:</span> {requisicao.numero_rq}
                        </div>
                        <div class="info">
                            <span class="label">Empresa:</span> {requisicao.empresa.nome}
                        </div>
                        <div class="info">
                            <span class="label">Valor Total:</span> R$ {sum(item.valor_total for item in requisicao.itens):.2f}
                        </div>
                        <div class="info">
                            <span class="label">Status:</span> <span class="badge">{requisicao.status}</span>
                        </div>
                        <div class="info">
                            <span class="label">Data Aprovação:</span> {requisicao.data_aprovacao.strftime('%d/%m/%Y %H:%M')}
                        </div>
                        <div class="info">
                            <span class="label">Aprovador:</span> {requisicao.aprovador.username if requisicao.aprovador else '-'}
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Sua requisição foi aprovada! Aguarde a emissão do Pedido de Compra.</p>
                        <p>Vimax - Sistema de Gestão de Compras</p>
                    </div>
                </div>
            </body>
        </html>
        """

    @staticmethod
    def template_requisicao_rejeitada(requisicao):
        """Template para requisição rejeitada"""
        return f"""
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #EF4444; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .header h1 {{ margin: 0; font-size: 24px; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .info {{ margin: 10px 0; }}
                    .label {{ font-weight: bold; color: #EF4444; }}
                    .motivo {{ background-color: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 15px 0; }}
                    .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; }}
                    .badge {{ display: inline-block; background-color: #FECACA; color: #7F1D1D; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✗ Requisição de Compra Rejeitada</h1>
                    </div>
                    
                    <div class="content">
                        <div class="info">
                            <span class="label">Nº Requisição:</span> {requisicao.numero_rq}
                        </div>
                        <div class="info">
                            <span class="label">Empresa:</span> {requisicao.empresa.nome}
                        </div>
                        <div class="info">
                            <span class="label">Status:</span> <span class="badge">{requisicao.status}</span>
                        </div>
                        
                        {f'<div class="motivo"><strong>Motivo da Rejeição:</strong><br>{requisicao.motivo_rejeicao}</div>' if requisicao.motivo_rejeicao else ''}
                        
                        <div class="info">
                            <span class="label">Data Rejeição:</span> {requisicao.data_aprovacao.strftime('%d/%m/%Y %H:%M') if requisicao.data_aprovacao else '-'}
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Sua requisição foi rejeitada. Favor revisar e reenviar.</p>
                        <p>Vimax - Sistema de Gestão de Compras</p>
                    </div>
                </div>
            </body>
        </html>
        """

    @staticmethod
    def template_pedido_emitido(pedido):
        """Template para pedido de compra emitido"""
        return f"""
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #3B82F6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .header h1 {{ margin: 0; font-size: 24px; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .info {{ margin: 10px 0; }}
                    .label {{ font-weight: bold; color: #3B82F6; }}
                    .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; }}
                    .badge {{ display: inline-block; background-color: #DBEAFE; color: #1E40AF; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📦 Pedido de Compra Emitido</h1>
                    </div>
                    
                    <div class="content">
                        <div class="info">
                            <span class="label">Nº Pedido:</span> {pedido.numero_pc}
                        </div>
                        <div class="info">
                            <span class="label">Fornecedor:</span> {pedido.fornecedor.nome}
                        </div>
                        <div class="info">
                            <span class="label">Empresa:</span> {pedido.empresa.nome}
                        </div>
                        <div class="info">
                            <span class="label">Data Emissão:</span> {pedido.data_emissao.strftime('%d/%m/%Y %H:%M')}
                        </div>
                        <div class="info">
                            <span class="label">Data Entrega Prevista:</span> {pedido.data_entrega_prevista.strftime('%d/%m/%Y') if pedido.data_entrega_prevista else '-'}
                        </div>
                        <div class="info">
                            <span class="label">Valor Total:</span> R$ {pedido.valor_total:.2f}
                        </div>
                        <div class="info">
                            <span class="label">Desconto:</span> R$ {pedido.desconto:.2f}
                        </div>
                        <div class="info">
                            <span class="label">Valor Final:</span> <strong>R$ {pedido.valor_final:.2f}</strong>
                        </div>
                        <div class="info">
                            <span class="label">Condição Pagamento:</span> {pedido.condicao_pagamento}
                        </div>
                        <div class="info">
                            <span class="label">Status:</span> <span class="badge">{pedido.status}</span>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>Um novo Pedido de Compra foi emitido no sistema.</p>
                        <p>Vimax - Sistema de Gestão de Compras</p>
                    </div>
                </div>
            </body>
        </html>
        """

    @staticmethod
    def template_ordem_enviada(ordem):
        """Template para ordem de compra enviada ao fornecedor"""
        return f"""
        <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {{ font-family: Arial, sans-serif; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #8B5CF6; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .header h1 {{ margin: 0; font-size: 24px; }}
                    .content {{ background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }}
                    .info {{ margin: 10px 0; }}
                    .label {{ font-weight: bold; color: #8B5CF6; }}
                    .items {{ margin: 15px 0; }}
                    .item {{ background-color: #white; padding: 10px; margin: 5px 0; border-left: 3px solid #8B5CF6; }}
                    .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📮 Ordem de Compra Enviada</h1>
                    </div>
                    
                    <div class="content">
                        <div class="info">
                            <span class="label">Nº Ordem:</span> {ordem.numero_oc}
                        </div>
                        <div class="info">
                            <span class="label">Nº Pedido Referência:</span> {ordem.pedido_ref.numero_pc}
                        </div>
                        <div class="info">
                            <span class="label">Fornecedor:</span> {ordem.fornecedor.nome}
                        </div>
                        <div class="info">
                            <span class="label">Data Emissão:</span> {ordem.data_emissao.strftime('%d/%m/%Y %H:%M')}
                        </div>
                        <div class="info">
                            <span class="label">Data Entrega Prevista:</span> {ordem.data_entrega_prevista.strftime('%d/%m/%Y') if ordem.data_entrega_prevista else '-'}
                        </div>
                        <div class="info">
                            <span class="label">Valor Total:</span> <strong>R$ {ordem.valor_total:.2f}</strong>
                        </div>
                        <div class="info">
                            <span class="label">Condição Pagamento:</span> {ordem.condicao_pagamento}
                        </div>
                        
                        <div class="items">
                            <span class="label">Itens Solicitados:</span>
                            {f''.join([f'<div class="item">{i+1}. {item.nome_item} - {item.quantidade} {item.unidade_medida} @ R$ {item.valor_unitario:.2f}</div>' for i, item in enumerate(ordem.itens)])}
                        </div>
                        
                        {f'<div class="info"><strong>Observações:</strong><br>{ordem.observacoes}</div>' if ordem.observacoes else ''}
                    </div>
                    
                    <div class="footer">
                        <p>Anexo: Ordem de Compra em PDF</p>
                        <p>Favor confirmar recebimento e data de entrega.</p>
                        <p>Vimax - Sistema de Gestão de Compras</p>
                    </div>
                </div>
            </body>
        </html>
        """