# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from datetime import datetime
from io import BytesIO
import os

class PDFService:
    """Serviço centralizado para geração de PDFs"""

    LOGO_PATH = "/var/www/cmms_project/backend/app/static/logo.png"
    EMPRESA_NOME = "Digimax Diagnóstico"
    EMPRESA_CNPJ = "12.345.678/0001-90"
    EMPRESA_EMAIL = "contato@digimax.com.br"
    EMPRESA_TELEFONE = "(11) 3000-0000"

    # Dimensões máximas da logo no PDF
    LOGO_MAX_WIDTH = 1.8 * inch
    LOGO_MAX_HEIGHT = 0.9 * inch

    @staticmethod
    def _logo_header():
        """
        Retorna uma lista de elementos (logo alinhada à ESQUERDA + espaço)
        se existir uma logo cadastrada. Caso contrário, retorna lista vazia.
        A logo é inserida numa tabela de 1 célula alinhada à esquerda para
        garantir que fique no canto superior esquerdo do documento.
        """
        elements = []
        try:
            if PDFService.LOGO_PATH and os.path.exists(PDFService.LOGO_PATH):
                # Preserva proporção respeitando limites máximos
                try:
                    from reportlab.lib.utils import ImageReader
                    ir = ImageReader(PDFService.LOGO_PATH)
                    iw, ih = ir.getSize()
                    ratio = min(PDFService.LOGO_MAX_WIDTH / iw, PDFService.LOGO_MAX_HEIGHT / ih)
                    w = iw * ratio
                    h = ih * ratio
                except Exception:
                    w, h = PDFService.LOGO_MAX_WIDTH, PDFService.LOGO_MAX_HEIGHT

                logo = Image(PDFService.LOGO_PATH, width=w, height=h)
                logo.hAlign = 'LEFT'

                # Tabela de 1 coluna larga para forçar alinhamento à esquerda
                header_table = Table([[logo]], colWidths=[7.0 * inch])
                header_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                    ('TOPPADDING', (0, 0), (-1, -1), 0),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ]))
                elements.append(header_table)
                elements.append(Spacer(1, 0.15 * inch))
        except Exception:
            # Nunca deixa a logo quebrar a geração do PDF
            pass
        return elements

    @staticmethod
    def gerar_pdf_requisicao(requisicao):
        """Gera PDF de requisição de compra"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()

        # 🆕 Logo no canto superior esquerdo
        elements.extend(PDFService._logo_header())

        # Header
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#4F46E5'),
            spaceAfter=12,
            alignment=1
        )

        elements.append(Paragraph(f"REQUISIÇÃO DE COMPRA - {requisicao.numero_rq}", header_style))
        elements.append(Spacer(1, 0.3*inch))

        # Informações básicas
        info_data = [
            ['Nº Requisição:', requisicao.numero_rq, 'Data Solicitação:', requisicao.data_solicitacao.strftime('%d/%m/%Y')],
            ['Empresa:', requisicao.empresa.nome, 'Solicitante:', requisicao.solicitante.username],
            ['Status:', requisicao.status, 'Data Necessária:', requisicao.data_necessaria.strftime('%d/%m/%Y') if requisicao.data_necessaria else '-'],
        ]

        info_table = Table(info_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))

        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))

        # Itens
        elements.append(Paragraph("ITENS DA REQUISIÇÃO", header_style))
        elements.append(Spacer(1, 0.2*inch))

        items_data = [['Item', 'Quantidade', 'Unidade', 'V. Unitário', 'Total']]
        for item in requisicao.itens:
            items_data.append([
                item.nome_item,
                str(item.quantidade),
                item.unidade_medida,
                f"R$ {item.valor_unitario:.2f}",
                f"R$ {item.valor_total:.2f}"
            ])

        items_table = Table(items_data, colWidths=[2.5*inch, 1*inch, 1*inch, 1.25*inch, 1.25*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4F46E5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))

        elements.append(items_table)
        elements.append(Spacer(1, 0.2*inch))

        # Total
        total_valor = sum(item.valor_total for item in requisicao.itens)
        total_style = ParagraphStyle(
            'Total',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#10B981'),
            alignment=2,
            fontName='Helvetica-Bold'
        )
        elements.append(Paragraph(f"VALOR TOTAL: R$ {total_valor:.2f}", total_style))

        # Observações
        if requisicao.descricao or requisicao.observacoes:
            elements.append(Spacer(1, 0.3*inch))
            elements.append(Paragraph("OBSERVAÇÕES", header_style))
            elements.append(Spacer(1, 0.1*inch))
            if requisicao.descricao:
                elements.append(Paragraph(f"<b>Descrição:</b> {requisicao.descricao}", styles['Normal']))
            if requisicao.observacoes:
                elements.append(Paragraph(f"<b>Observações:</b> {requisicao.observacoes}", styles['Normal']))

        # Footer
        elements.append(Spacer(1, 0.3*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=1
        )
        elements.append(Paragraph(
            f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')} | {PDFService.EMPRESA_NOME}",
            footer_style
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def gerar_pdf_pedido(pedido):
        """Gera PDF de pedido de compra"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()

        # 🆕 Logo no canto superior esquerdo
        elements.extend(PDFService._logo_header())

        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#3B82F6'),
            spaceAfter=12,
            alignment=1
        )

        elements.append(Paragraph(f"PEDIDO DE COMPRA - {pedido.numero_pc}", header_style))
        elements.append(Spacer(1, 0.3*inch))

        # Informações básicas
        info_data = [
            ['Nº Pedido:', pedido.numero_pc, 'Data Emissão:', pedido.data_emissao.strftime('%d/%m/%Y')],
            ['Fornecedor:', (pedido.fornecedor.nome if pedido.fornecedor else '-'), 'Empresa:', pedido.empresa.nome],
            ['Entrega Prevista:', pedido.data_entrega_prevista.strftime('%d/%m/%Y') if pedido.data_entrega_prevista else '-', 'Status:', pedido.status],
            ['Condição Pagamento:', (pedido.condicao_pagamento or '-'), 'Local Entrega:', pedido.local_entrega or '-'],
        ]

        info_table = Table(info_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))

        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))

        # Itens
        elements.append(Paragraph("ITENS DO PEDIDO", header_style))
        elements.append(Spacer(1, 0.2*inch))

        items_data = [['Item', 'Quantidade', 'Unidade', 'V. Unitário', 'Total']]
        for item in pedido.itens:
            items_data.append([
                item.nome_item,
                str(item.quantidade),
                item.unidade_medida,
                f"R$ {item.valor_unitario:.2f}",
                f"R$ {(item.quantidade * item.valor_unitario):.2f}"
            ])

        items_table = Table(items_data, colWidths=[2.5*inch, 1*inch, 1*inch, 1.25*inch, 1.25*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))

        elements.append(items_table)
        elements.append(Spacer(1, 0.2*inch))

        # Resumo financeiro
        resumo_data = [
            ['Subtotal:', f"R$ {(pedido.valor_total or 0):.2f}"],
            ['Desconto:', f"R$ {(pedido.desconto or 0):.2f}"],
            ['TOTAL:', f"R$ {(pedido.valor_final or 0):.2f}"],
        ]

        resumo_table = Table(resumo_data, colWidths=[4*inch, 2.5*inch])
        resumo_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, -1), (1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (1, -1), (1, -1), 12),
            ('BACKGROUND', (1, -1), (1, -1), colors.HexColor('#10B981')),
            ('TEXTCOLOR', (1, -1), (1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))

        elements.append(resumo_table)

        # Footer
        elements.append(Spacer(1, 0.3*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=1
        )
        elements.append(Paragraph(
            f"Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')} | {PDFService.EMPRESA_NOME}",
            footer_style
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def gerar_pdf_ordem(ordem):
        """Gera PDF de ordem de compra para fornecedor"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        elements = []
        styles = getSampleStyleSheet()

        # 🆕 Logo no canto superior esquerdo
        elements.extend(PDFService._logo_header())

        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#8B5CF6'),
            spaceAfter=12,
            alignment=1
        )

        elements.append(Paragraph(f"ORDEM DE COMPRA - {ordem.numero_oc}", header_style))
        elements.append(Spacer(1, 0.2*inch))

        # Cabeçalho
        cabecalho_data = [
            ['EMPRESA:', ordem.empresa.nome],
            ['CNPJ:', ordem.empresa.cnpj or '-'],
            ['EMAIL:', ordem.empresa.email or '-'],
        ]

        cabecalho_table = Table(cabecalho_data, colWidths=[1.5*inch, 4.5*inch])
        cabecalho_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))

        elements.append(cabecalho_table)
        elements.append(Spacer(1, 0.2*inch))

        # Informações da Ordem
        info_data = [
            ['Nº Ordem:', ordem.numero_oc, 'Data Emissão:', ordem.data_emissao.strftime('%d/%m/%Y')],
            ['Fornecedor:', ordem.fornecedor.nome, 'Data Entrega:', ordem.data_entrega_prevista.strftime('%d/%m/%Y') if ordem.data_entrega_prevista else '-'],
            ['Telefone:', ordem.telefone_fornecedor or '-', 'Email:', ordem.email_fornecedor or '-'],
        ]

        info_table = Table(info_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))

        elements.append(info_table)
        elements.append(Spacer(1, 0.3*inch))

        # Itens
        elements.append(Paragraph("ITENS SOLICITADOS", header_style))
        elements.append(Spacer(1, 0.2*inch))

        items_data = [['Item', 'Quantidade', 'Unidade', 'V. Unitário', 'Total']]
        for item in ordem.itens:
            items_data.append([
                item.nome_item,
                str(item.quantidade),
                item.unidade_medida,
                f"R$ {item.valor_unitario:.2f}",
                f"R$ {item.valor_total:.2f}"
            ])

        items_table = Table(items_data, colWidths=[2.5*inch, 1*inch, 1*inch, 1.25*inch, 1.25*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8B5CF6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))

        elements.append(items_table)
        elements.append(Spacer(1, 0.2*inch))

        # Total
        total_style = ParagraphStyle(
            'Total',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#8B5CF6'),
            alignment=2,
            fontName='Helvetica-Bold'
        )
        elements.append(Paragraph(f"VALOR TOTAL: R$ {ordem.valor_total:.2f}", total_style))

        # Condições
        elements.append(Spacer(1, 0.3*inch))
        elementos_data = [
            ['Condição Pagamento:', ordem.condicao_pagamento],
        ]
        elementos_table = Table(elementos_data, colWidths=[2*inch, 4*inch])
        elementos_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F3F4F6')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ]))
        elements.append(elementos_table)

        # Observações
        if ordem.observacoes:
            elements.append(Spacer(1, 0.2*inch))
            elements.append(Paragraph("<b>OBSERVAÇÕES:</b>", styles['Normal']))
            elements.append(Paragraph(ordem.observacoes, styles['Normal']))

        # Footer
        elements.append(Spacer(1, 0.3*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=1
        )
        elements.append(Paragraph(
            f"Favor confirmar recebimento e data de entrega | Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            footer_style
        ))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()