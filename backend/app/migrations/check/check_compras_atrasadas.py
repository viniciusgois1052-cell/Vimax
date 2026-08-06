#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.compra import PedidoCompra, OrdemCompra
from app.models.usuario import Usuario
from app.models.config_email import ConfigEmail
from datetime import date
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = create_app()

def enviar_email_atraso(compra, destinatarios, tipo_compra):
    config = ConfigEmail.query.first()
    if not config:
        print("❌ Config email não encontrada")
        return False
    
    try:
        # Calcular dias de atraso
        data_prevista = compra.data_entrega_prevista
        if isinstance(data_prevista, str):
            from datetime import datetime
            data_prevista = datetime.strptime(data_prevista, '%Y-%m-%d').date()
        elif hasattr(data_prevista, 'date'):
            data_prevista = data_prevista.date()
        
        dias_atraso = (date.today() - data_prevista).days
        
        numero = getattr(compra, 'numero_pc', None) or getattr(compra, 'numero_oc', None) or compra.id
        
        msg = MIMEMultipart('alternative')
        msg['From'] = config.email_remetente
        msg['To'] = ', '.join(destinatarios)
        msg['Subject'] = f'⚠️ Material Atrasado - {tipo_compra} #{numero}'
        
        corpo_html = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                    <h2 style="margin: 0;">⚠️ Material Atrasado</h2>
                </div>
                <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                    <div style="background: white; padding: 15px; border-left: 4px solid #dc2626;">
                        <p><strong>Tipo:</strong> {tipo_compra}</p>
                        <p><strong>Número:</strong> #{numero}</p>
                        <p><strong>Data Prevista:</strong> {data_prevista.strftime('%d/%m/%Y')}</p>
                        <p><strong>Status:</strong> {compra.status}</p>
                    </div>
                    <div style="background: #fee2e2; border: 2px solid #dc2626; padding: 15px; margin: 15px 0; text-align: center;">
                        <h3 style="color: #dc2626; margin: 0;">Atraso: {dias_atraso} dia{'s' if dias_atraso > 1 else ''}</h3>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(corpo_html, 'html', 'utf-8'))
        
        server = smtplib.SMTP(config.smtp_host, config.smtp_port)
        if config.smtp_usar_tls:
            server.starttls()
        if config.smtp_usuario and config.smtp_senha:
            server.login(config.smtp_usuario, config.smtp_senha)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"❌ Erro ao enviar email: {e}")
        return False

def processar_compras(compras, tipo_compra):
    enviados = 0
    for idx, compra in enumerate(compras, 1):
        print(f"\n[{idx}/{len(compras)}] {tipo_compra} #{compra.id}")
        
        if not compra.material_atrasado:
            compra.material_atrasado = True
        
        if not compra.alerta_atraso_enviado:
            destinatarios = []
            
            # Buscar criador
            if hasattr(compra, 'criado_por_usuario_id') and compra.criado_por_usuario_id:
                criador = Usuario.query.get(compra.criado_por_usuario_id)
                if criador and criador.email:
                    destinatarios.append(criador.email)
            
            # Buscar comprador (se existir)
            if hasattr(compra, 'usuario_comprador_id') and compra.usuario_comprador_id:
                comprador = Usuario.query.get(compra.usuario_comprador_id)
                if comprador and comprador.email and comprador.email not in destinatarios:
                    destinatarios.append(comprador.email)
            
            # Buscar admins da empresa
            if hasattr(compra, 'empresa_id') and compra.empresa_id:
                admins = Usuario.query.filter(
                    Usuario.empresa_id == compra.empresa_id,
                    Usuario.role.in_(['super_admin', 'admin']),
                    Usuario.email.isnot(None)
                ).all()
                for admin in admins:
                    if admin.email and admin.email not in destinatarios:
                        destinatarios.append(admin.email)
            
            if destinatarios:
                if enviar_email_atraso(compra, destinatarios, tipo_compra):
                    compra.alerta_atraso_enviado = True
                    enviados += 1
                    print(f"    ✅ Email enviado para: {', '.join(destinatarios)}")
                else:
                    print("    ❌ Falha ao enviar email")
            else:
                print("    ⚠️  Nenhum destinatário encontrado")
        else:
            print("    ℹ️  Alerta já enviado anteriormente")
        
        db.session.commit()
    
    return enviados

def main():
    with app.app_context():
        print("="*70)
        print(f"🔍 VERIFICANDO COMPRAS - {date.today().strftime('%d/%m/%Y')}")
        print("="*70)
        
        # Verificar Pedidos de Compra
        pedidos_atrasados = PedidoCompra.query.filter(
            PedidoCompra.data_entrega_prevista < date.today(),
            PedidoCompra.status.in_(['Emitido', 'Confirmado', 'Entrega Parcial']),
            PedidoCompra.data_recebimento.is_(None)
        ).all()
        
        # Verificar Ordens de Compra
        ordens_atrasadas = OrdemCompra.query.filter(
            OrdemCompra.data_entrega_prevista < date.today(),
            OrdemCompra.status.in_(['Emitida', 'Confirmada', 'Entrega Parcial']),
            OrdemCompra.data_recebimento.is_(None)
        ).all()
        
        total_pedidos = len(pedidos_atrasados)
        total_ordens = len(ordens_atrasadas)
        total = total_pedidos + total_ordens
        
        print(f"\n📊 Pedidos atrasados: {total_pedidos}")
        print(f"📊 Ordens atrasadas: {total_ordens}")
        print(f"📊 Total: {total}")
        
        if total == 0:
            print("\n✅ Nenhuma compra atrasada!")
            return
        
        enviados = 0
        
        if pedidos_atrasados:
            print("\n" + "="*70)
            print("📦 PROCESSANDO PEDIDOS DE COMPRA")
            print("="*70)
            enviados += processar_compras(pedidos_atrasados, "Pedido de Compra")
        
        if ordens_atrasadas:
            print("\n" + "="*70)
            print("📄 PROCESSANDO ORDENS DE COMPRA")
            print("="*70)
            enviados += processar_compras(ordens_atrasadas, "Ordem de Compra")
        
        print(f"\n{'='*70}")
        print(f"✅ CONCLUÍDO: {enviados}/{total} alertas enviados")
        print(f"{'='*70}")

if __name__ == '__main__':
    main()
