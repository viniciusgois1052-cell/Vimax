# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify, current_app
from ..models.cotacao import Cotacao, PropostaFornecedor, ItemProposta
from ..models.compra import PedidoCompra
from ..models.fornecedor import Fornecedor
from ..models.fornecedor_acesso import FornecedorAcesso
from ..utils.auth import get_current_user_from_request
from .. import db
from datetime import datetime
import secrets, os

cotacao_bp = Blueprint('cotacao_bp', __name__)
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://vimax.ad.digimaxdiagnostico.com.br:5173')

def gerar_numero_cotacao():
    ano    = datetime.now().year
    ultimo = Cotacao.query.order_by(Cotacao.id.desc()).first()
    numero = (ultimo.id + 1) if ultimo else 1
    return f"COT-{ano}-{numero:04d}"

def gerar_senha_temp():
    return secrets.token_urlsafe(6).upper()

# ─────────────────────────────────────────────
# ROTAS INTERNAS (requerem X-API-Token)
# ─────────────────────────────────────────────

@cotacao_bp.route('', methods=['GET'])
def listar_cotacoes():
    try:
        query = Cotacao.query.filter(Cotacao.ativo == True)
        empresa_id = request.args.get('empresa_id')
        if empresa_id:
            query = query.filter(Cotacao.empresa_id == int(empresa_id))
        cotacoes = query.order_by(Cotacao.created_at.desc()).all()
        return jsonify([c.to_dict() for c in cotacoes])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cotacao_bp.route('/<int:id>', methods=['GET'])
def get_cotacao(id):
    try:
        cotacao = Cotacao.query.get_or_404(id)
        return jsonify(cotacao.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@cotacao_bp.route('', methods=['POST'])
def create_cotacao():
    data             = request.get_json() or {}
    pedido_id        = data.get('pedido_id')
    fornecedores_ids = data.get('fornecedores_ids', [])

    if not pedido_id:
        return jsonify({"error": "pedido_id é obrigatório"}), 400
    if not fornecedores_ids:
        return jsonify({"error": "Selecione ao menos um fornecedor"}), 400

    pedido = PedidoCompra.query.get_or_404(pedido_id)

    try:
        cotacao = Cotacao(
            numero_cotacao=gerar_numero_cotacao(),
            pedido_id=pedido.id,
            empresa_id=pedido.empresa_id,
            data_limite=datetime.fromisoformat(data['data_limite']) if data.get('data_limite') else None,
            observacoes=data.get('observacoes'),
            status='ABERTA'
        )
        db.session.add(cotacao)
        db.session.flush()

        emails_enviados, erros_email = [], []

        for forn_id in fornecedores_ids:
            fornecedor = Fornecedor.query.get(forn_id)
            if not fornecedor or not fornecedor.email:
                erros_email.append(f"{fornecedor.nome if fornecedor else forn_id}: sem email")
                continue

            # ── Gera/renova senha única do fornecedor ──
            senha_temp = gerar_senha_temp()
            acesso = FornecedorAcesso.query.filter_by(fornecedor_id=fornecedor.id).first()
            if acesso:
                acesso.email = fornecedor.email
                acesso.set_senha(senha_temp)
            else:
                acesso = FornecedorAcesso(
                    fornecedor_id=fornecedor.id,
                    email=fornecedor.email
                )
                acesso.set_senha(senha_temp)
                db.session.add(acesso)

            # ── Cria proposta para esta cotação ──
            proposta_existente = PropostaFornecedor.query.filter_by(
                cotacao_id=cotacao.id,
                fornecedor_id=fornecedor.id
            ).first()

            if not proposta_existente:
                proposta = PropostaFornecedor(
                    cotacao_id=cotacao.id,
                    fornecedor_id=fornecedor.id,
                    email_fornecedor=fornecedor.email,
                    token_acesso=secrets.token_urlsafe(32),
                    status='PENDENTE',
                    primeiro_acesso=True
                )
                proposta.set_senha(senha_temp)   # mantém compat. com campo existente
                for item_ped in pedido.itens:
                    proposta.itens.append(ItemProposta(
                        item_pedido_id=item_ped.id,
                        codigo_item=item_ped.codigo_item,
                        nome_item=item_ped.nome_item,
                        quantidade=item_ped.quantidade,
                        unidade_medida=item_ped.unidade_medida,
                        valor_unitario=0,
                        valor_total=0
                    ))
                db.session.add(proposta)

            db.session.flush()

            # ── Monta e envia email ──
            try:
                from ..utils.email_service import EmailService
                portal_url = os.environ.get('PORTAL_FORNECEDOR_URL', FRONTEND_URL + '/portal-fornecedor')
                itens_html = ''.join(
                    f"<tr><td style='padding:8px;border:1px solid #e5e7eb'>{i.nome_item}</td>"
                    f"<td style='padding:8px;border:1px solid #e5e7eb;text-align:center'>{i.quantidade} {i.unidade_medida}</td></tr>"
                    for i in pedido.itens
                )
                corpo = f"""
                <div style='font-family:Arial,sans-serif;max-width:620px;margin:0 auto'>
                  <div style='background:#1a56db;padding:20px;border-radius:8px 8px 0 0'>
                    <h2 style='color:white;margin:0'>📋 Solicitação de Cotação</h2>
                    <p style='color:#bfdbfe;margin:4px 0 0'>{cotacao.numero_cotacao}</p>
                  </div>
                  <div style='padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px'>
                    <p>Prezado(a) <strong>{fornecedor.nome}</strong>,</p>
                    <p>Você recebeu uma solicitação de cotação de <strong>{pedido.empresa.nome if pedido.empresa else 'nossa empresa'}</strong>.</p>
                    {'<p>⏰ <strong>Data limite:</strong> ' + cotacao.data_limite.strftime('%d/%m/%Y') + '</p>' if cotacao.data_limite else ''}
                    <h3 style='margin-top:20px'>Itens para cotar:</h3>
                    <table style='width:100%;border-collapse:collapse;margin-bottom:20px'>
                      <tr style='background:#f3f4f6'>
                        <th style='padding:8px;border:1px solid #e5e7eb;text-align:left'>Item</th>
                        <th style='padding:8px;border:1px solid #e5e7eb;text-align:center'>Qtd / UN</th>
                      </tr>
                      {itens_html}
                    </table>
                    <div style='background:#eff6ff;border-left:4px solid #1a56db;padding:16px;border-radius:4px;margin-bottom:20px'>
                      <p style='margin:0 0 8px'><strong>🔐 Seus dados de acesso ao portal:</strong></p>
                      <p style='margin:2px 0'>🌐 Portal: <a href='{portal_url}'>{portal_url}</a></p>
                      <p style='margin:2px 0'>📧 Email: <strong>{fornecedor.email}</strong></p>
                      <p style='margin:2px 0'>🔑 Senha: <strong style='font-size:20px;letter-spacing:3px;color:#1a56db'>{senha_temp}</strong></p>
                      <p style='margin:8px 0 0;font-size:12px;color:#ef4444'>⚠️ Esta senha expira em 72 horas.</p>
                    </div>
                    <a href='{portal_url}' style='display:inline-block;padding:14px 28px;background:#1a56db;color:white;text-decoration:none;border-radius:6px;font-weight:bold;font-size:16px'>
                      Acessar Portal →
                    </a>
                    <p style='margin-top:20px;color:#9ca3af;font-size:12px'>Acesso exclusivo para {fornecedor.nome}. Não compartilhe.</p>
                  </div>
                </div>"""

                EmailService.send_email(
                    destinatarios=fornecedor.email,
                    assunto=f'📋 Cotação {cotacao.numero_cotacao} — Solicitação de Proposta',
                    corpo_html=corpo
                )
                emails_enviados.append(fornecedor.nome)
            except Exception as email_err:
                current_app.logger.warning(f"Erro email {fornecedor.nome}: {email_err}")
                erros_email.append(f"{fornecedor.nome}: falha no envio")

        db.session.commit()
        return jsonify({
            "success": True,
            "cotacao": cotacao.to_dict(),
            "emails_enviados": emails_enviados,
            "erros_email": erros_email
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro ao criar cotação")
        return jsonify({"error": str(e)}), 500

@cotacao_bp.route('/<int:id>/encerrar', methods=['POST'])
def encerrar_cotacao(id):
    cotacao = Cotacao.query.get_or_404(id)
    cotacao.status = 'ENCERRADA'
    db.session.commit()
    return jsonify(cotacao.to_dict())

@cotacao_bp.route('/<int:id>/selecionar-vencedor', methods=['POST'])
def selecionar_vencedor(id):
    data        = request.get_json() or {}
    proposta_id = data.get('proposta_id')
    cotacao     = Cotacao.query.get_or_404(id)
    proposta    = PropostaFornecedor.query.get_or_404(proposta_id)

    try:
        from ..models.compra import OrdemCompra, ItemOrdem
        ano       = datetime.now().year
        ultimo    = OrdemCompra.query.order_by(OrdemCompra.id.desc()).first()
        num_oc    = (ultimo.id + 1) if ultimo else 1
        numero_oc = f"OC-{ano}-{num_oc:04d}"

        nova_ordem = OrdemCompra(
            numero_oc=numero_oc,
            pedido_id=cotacao.pedido_id,
            empresa_id=cotacao.empresa_id,
            fornecedor_id=proposta.fornecedor_id,
            status='EMITIDA',
            valor_total=proposta.valor_total,
            condicao_pagamento=proposta.condicao_pagamento,
            email_fornecedor=proposta.email_fornecedor,
            observacoes=f"Gerada da cotação {cotacao.numero_cotacao}"
        )
        for item in proposta.itens:
            nova_ordem.itens.append(ItemOrdem(
                codigo_item=item.codigo_item,
                nome_item=item.nome_item,
                quantidade=item.quantidade,
                unidade_medida=item.unidade_medida,
                valor_unitario=item.valor_unitario,
                valor_total=item.valor_total
            ))

        cotacao.status = 'ENCERRADA'
        db.session.add(nova_ordem)
        db.session.commit()
        return jsonify({"success": True, "ordem": nova_ordem.to_dict(), "message": f"OC {numero_oc} gerada!"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ─────────────────────────────────────────────
# PORTAL DO FORNECEDOR (público — sem token)
# ─────────────────────────────────────────────

@cotacao_bp.route('/portal/login', methods=['POST'])
def portal_login():
    data  = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    senha = data.get('senha', '')

    if not email or not senha:
        return jsonify({"error": "Email e senha obrigatórios"}), 400

    acesso = FornecedorAcesso.query.filter_by(email=email).first()
    if not acesso:
        return jsonify({"error": "Credenciais inválidas"}), 401
    if not acesso.check_senha(senha):
        return jsonify({"error": "Senha incorreta"}), 401
    if acesso.expirada():
        return jsonify({"error": "Senha expirada. Aguarde uma nova cotação ou solicite reenvio."}), 401

    # Busca todas as propostas pendentes deste fornecedor
    propostas = PropostaFornecedor.query.filter_by(
        fornecedor_id=acesso.fornecedor_id,
        ativo=True
    ).order_by(PropostaFornecedor.created_at.desc()).all()

    return jsonify({
        "success": True,
        "primeiro_acesso": acesso.primeiro_acesso,
        "fornecedor": acesso.fornecedor.to_dict(),
        "propostas": [p.to_dict() for p in propostas],
        "session_token": acesso.fornecedor.id   # usa id como session simples
    })

@cotacao_bp.route('/portal/alterar-senha', methods=['POST'])
def portal_alterar_senha():
    data       = request.get_json() or {}
    email      = data.get('email', '').strip().lower()
    nova_senha = data.get('nova_senha', '')

    if not email or not nova_senha:
        return jsonify({"error": "Dados obrigatórios ausentes"}), 400

    acesso = FornecedorAcesso.query.filter_by(email=email).first()
    if not acesso:
        return jsonify({"error": "Acesso não encontrado"}), 404

    try:
        acesso.set_senha(nova_senha)
        acesso.primeiro_acesso = False
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@cotacao_bp.route('/portal/propostas/<int:fornecedor_id>', methods=['GET'])
def get_propostas_fornecedor(fornecedor_id):
    propostas = PropostaFornecedor.query.filter_by(
        fornecedor_id=fornecedor_id,
        ativo=True
    ).order_by(PropostaFornecedor.created_at.desc()).all()
    return jsonify([p.to_dict() for p in propostas])

@cotacao_bp.route('/portal/proposta/<token>', methods=['GET'])
def get_proposta_portal(token):
    proposta = PropostaFornecedor.query.filter_by(token_acesso=token, ativo=True).first()
    if not proposta:
        return jsonify({"error": "Token inválido"}), 404
    return jsonify(proposta.to_dict())

@cotacao_bp.route('/portal/proposta/<token>', methods=['PUT'])
def salvar_proposta_portal(token):
    proposta = PropostaFornecedor.query.filter_by(token_acesso=token, ativo=True).first()
    if not proposta:
        return jsonify({"error": "Token inválido"}), 404
    if proposta.cotacao.status != 'ABERTA':
        return jsonify({"error": "Esta cotação não está mais aberta"}), 400
    if proposta.cotacao.data_limite and datetime.utcnow() > proposta.cotacao.data_limite:
        return jsonify({"error": "Prazo da cotação encerrado"}), 400

    data = request.get_json() or {}
    try:
        proposta.valor_frete        = float(data.get('valor_frete', 0))
        proposta.prazo_entrega      = data.get('prazo_entrega')
        proposta.condicao_pagamento = data.get('condicao_pagamento')
        proposta.observacoes        = data.get('observacoes')
        proposta.status             = 'RESPONDIDA'
        proposta.data_resposta      = datetime.utcnow()

        total_itens = 0
        for item_data in data.get('itens', []):
            item = ItemProposta.query.get(item_data.get('id'))
            if item and item.proposta_id == proposta.id:
                item.valor_unitario = float(item_data.get('valor_unitario', 0))
                item.valor_total    = item.valor_unitario * item.quantidade
                item.marca          = item_data.get('marca')
                item.observacao     = item_data.get('observacao')
                item.foto_url       = item_data.get('foto_url')
                total_itens        += item.valor_total

        proposta.valor_total = total_itens + proposta.valor_frete
        db.session.commit()
        return jsonify({"success": True, "proposta": proposta.to_dict()})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@cotacao_bp.route('/portal/upload', methods=['POST'])
def portal_upload():
    token    = request.form.get('token')
    proposta = PropostaFornecedor.query.filter_by(token_acesso=token, ativo=True).first()
    if not proposta:
        return jsonify({"error": "Token inválido"}), 404
    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado"}), 400
    file = request.files['file']
    if not file.filename:
        return jsonify({"error": "Nome vazio"}), 400
    try:
        from werkzeug.utils import secure_filename
        upload_dir = '/var/www/cmms_project/backend/static/uploads/cotacoes'
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"{secrets.token_hex(8)}_{secure_filename(file.filename)}"
        file.save(os.path.join(upload_dir, filename))
        return jsonify({"success": True, "url": f"/static/uploads/cotacoes/{filename}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
