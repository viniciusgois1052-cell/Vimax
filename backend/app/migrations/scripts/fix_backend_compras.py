# Salve em /var/www/cmms_project/ e execute com: python3 fix_backend_compras.py

ROUTES_FILE = '/var/www/cmms_project/backend/app/routes/compra_routes.py'

NOVAS_ROTAS = '''

# ============================================================================
# ROTAS FALTANTES - ADICIONADAS PELO FIX
# ============================================================================

@compra_bp.route('/requisicoes/<int:id>/gerar-pdf', methods=['GET', 'OPTIONS'])
def gerar_pdf_requisicao(id):
    """GET /api/compras/requisicoes/<id>/gerar-pdf"""
    if request.method == 'OPTIONS':
        from flask import Response
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        return resp, 200

    try:
        from flask import send_file
        import io
        requisicao = RequisicaoCompra.query.get_or_404(id)
        pdf_bytes = PDFService.gerar_pdf_requisicao(requisicao)
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'RQ-{requisicao.numero_rq}.pdf'
        )
    except Exception as e:
        current_app.logger.exception("Erro ao gerar PDF da requisicao")
        return jsonify({"error": str(e)}), 500


@compra_bp.route('/pedidos/<int:id>/aprovar', methods=['POST', 'OPTIONS'])
def aprovar_pedido(id):
    """POST /api/compras/pedidos/<id>/aprovar"""
    if request.method == 'OPTIONS':
        from flask import Response
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        return resp, 200

    user = get_current_user_from_request(request)
    pedido = PedidoCompra.query.get_or_404(id)

    try:
        pedido.status = 'APROVADA'
        pedido.data_aprovacao = datetime.utcnow()
        pedido.usuario_aprovador_id = user.id if user else None
        db.session.commit()

        try:
            create_log(user=user, action='aprovar_pedido', entity='pedido', entity_id=id, req=request)
        except:
            pass

        return jsonify(pedido.to_dict())
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro ao aprovar pedido")
        return jsonify({"error": str(e)}), 500


@compra_bp.route('/pedidos/<int:id>/rejeitar', methods=['POST', 'OPTIONS'])
def rejeitar_pedido(id):
    """POST /api/compras/pedidos/<id>/rejeitar"""
    if request.method == 'OPTIONS':
        from flask import Response
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        return resp, 200

    user = get_current_user_from_request(request)
    pedido = PedidoCompra.query.get_or_404(id)
    data = request.get_json() or {}

    try:
        pedido.status = 'REJEITADA'
        pedido.motivo_rejeicao = data.get('motivo_rejeicao', '')
        db.session.commit()

        try:
            create_log(user=user, action='rejeitar_pedido', entity='pedido', entity_id=id, req=request)
        except:
            pass

        return jsonify(pedido.to_dict())
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro ao rejeitar pedido")
        return jsonify({"error": str(e)}), 500


@compra_bp.route('/pedidos/<int:id>/gerar-pdf', methods=['GET', 'OPTIONS'])
def gerar_pdf_pedido(id):
    """GET /api/compras/pedidos/<id>/gerar-pdf"""
    if request.method == 'OPTIONS':
        from flask import Response
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        return resp, 200

    try:
        from flask import send_file
        import io
        pedido = PedidoCompra.query.get_or_404(id)
        pdf_bytes = PDFService.gerar_pdf_pedido(pedido)
        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'PC-{pedido.numero_pc}.pdf'
        )
    except Exception as e:
        current_app.logger.exception("Erro ao gerar PDF do pedido")
        return jsonify({"error": str(e)}), 500


@compra_bp.route('/ordens/<int:id>/enviar-email', methods=['POST', 'OPTIONS'])
def enviar_email_ordem(id):
    """POST /api/compras/ordens/<id>/enviar-email - alias de enviar-para-fornecedor"""
    if request.method == 'OPTIONS':
        from flask import Response
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        return resp, 200

    return enviar_ordem_fornecedor(id)


@compra_bp.route('/requisicoes/<int:id>/converter-pedido', methods=['POST', 'OPTIONS'])
def converter_requisicao_pedido(id):
    """POST /api/compras/requisicoes/<id>/converter-pedido"""
    if request.method == 'OPTIONS':
        from flask import Response
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Token'
        return resp, 200

    user = get_current_user_from_request(request)
    requisicao = RequisicaoCompra.query.get_or_404(id)

    if requisicao.status != 'APROVADA':
        return jsonify({"error": "Apenas requisições APROVADAS podem ser convertidas"}), 400

    try:
        numero_pc = gerar_numero_sequencial('PC', PedidoCompra)

        novo_pedido = PedidoCompra(
            numero_pc=numero_pc,
            status=StatusPedido.RASCUNHO.value,
            requisicao_id=requisicao.id,
            empresa_id=requisicao.empresa_id,
            usuario_comprador_id=user.id if user else None,
            data_entrega_prevista=requisicao.data_necessaria,
            valor_total=requisicao.valor_total or 0,
            valor_final=requisicao.valor_total or 0,
            observacoes=requisicao.observacoes
        )

        # Copiar itens da requisição para o pedido
        for item_rq in requisicao.itens:
            item_pc = ItemPedido(
                codigo_item=item_rq.codigo_item,
                nome_item=item_rq.nome_item,
                quantidade=item_rq.quantidade,
                unidade_medida=item_rq.unidade_medida,
                valor_unitario=item_rq.valor_unitario,
                valor_total=item_rq.valor_total,
                item_id=item_rq.item_id
            )
            novo_pedido.itens.append(item_pc)

        # Marcar requisição como convertida
        requisicao.status = 'CONVERTIDA'

        db.session.add(novo_pedido)
        db.session.commit()

        try:
            create_log(user=user, action='converter_requisicao_pedido', entity='requisicao',
                      entity_id=id, details={'numero_pc': numero_pc}, req=request)
        except:
            pass

        return jsonify({
            "success": True,
            "message": f"Requisição convertida para {numero_pc}",
            "pedido": novo_pedido.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro ao converter requisição para pedido")
        return jsonify({"error": str(e)}), 500
'''

def fix_backend():
    with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Verificar se já foi aplicado
    if 'gerar_pdf_requisicao' in content:
        print('⚠️  Fix já foi aplicado anteriormente!')
        return

    # Adicionar as rotas no final do arquivo
    content += NOVAS_ROTAS

    with open(ROUTES_FILE, 'w', encoding='utf-8') as f:
        f.write(content)

    print('✓ Rotas adicionadas em compra_routes.py')
    print('\n✅ Backend corrigido!')
    print('👉 Reinicie o backend: sudo systemctl restart vimax  (ou o nome do seu serviço)')

if __name__ == '__main__':
    fix_backend()
