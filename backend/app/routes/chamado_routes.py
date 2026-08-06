from flask import Blueprint, request, jsonify
from ..models.chamado import Chamado
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log
from sqlalchemy import desc
from datetime import datetime
import json

chamado_bp = Blueprint('chamado_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None

def safe_float(val):
    if val in [None, '', 'none', 'undefined']: return 0.0
    try: return float(val)
    except: return 0.0

def get_current_user():
    api_token = request.headers.get('X-API-Token')
    if api_token:
        return Usuario.query.filter_by(api_token=api_token).first()
    return None

@chamado_bp.route('', methods=['GET'])
def list_chamados():
    user = get_current_user()

    # self_service: só vê chamados da própria empresa
    if user and user.role == 'self_service':
        if not user.empresa_id:
            return jsonify({'total': 0, 'page': 1, 'per_page': 100, 'chamados': []}), 200
        query = Chamado.query.filter(
            Chamado.ativo == True,
            Chamado.empresa_id == user.empresa_id
        )
        total = query.count()
        itens = query.order_by(desc(Chamado.created_at)).all()
        return jsonify({'total': total, 'page': 1, 'per_page': total, 'chamados': [c.to_dict() for c in itens]}), 200

    # publico: sem acesso à listagem
    if user and user.role == 'publico':
        return jsonify({'error': 'Acesso negado'}), 403

    include_inactive = request.args.get('include_inactive', '0') in ('1', 'true', 'True')
    empresa_id = request.args.get('empresa_id')
    tipo_filter = request.args.get('tipo')
    q = (request.args.get('q') or '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))

    query = Chamado.query
    if not include_inactive:
        query = query.filter(Chamado.ativo == True)

    if empresa_id:
        try:
            query = query.filter(Chamado.empresa_id == int(empresa_id))
        except Exception:
            pass

    if tipo_filter and tipo_filter in ('maquinario', 'infraestrutura'):
        query = query.filter(Chamado.tipo == tipo_filter)

    orcamento_id_filter = request.args.get('orcamento_id')
    if orcamento_id_filter:
        try:
            oid = int(orcamento_id_filter)
            query = query.filter(
                db.or_(
                    Chamado.orcamento_id == oid,
                    Chamado.orcamentos_ids.like(f'%{oid}%')
                )
            )
        except Exception:
            pass

    fornecedor_id_filter = request.args.get('fornecedor_id')
    if fornecedor_id_filter:
        try:
            fid = int(fornecedor_id_filter)
            query = query.filter(
                db.or_(
                    Chamado.fornecedor_id == fid,
                    Chamado.fornecedores_ids.like(f'%{fid}%')
                )
            )
        except Exception:
            pass

    if q:
        like = f"%{q}%"
        query = query.filter((Chamado.titulo.ilike(like)) | (Chamado.descricao.ilike(like)))

    total = query.count()
    itens = query.order_by(desc(Chamado.created_at)).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'chamados': [c.to_dict() for c in itens]
    }), 200

@chamado_bp.route('', methods=['POST'])
def create_chamado():
    data = request.get_json() or {}
    user = get_current_user()

    # self_service pode criar chamado apenas para a própria empresa
    if user and user.role == 'self_service':
        data['empresa_id'] = user.empresa_id

    # publico: bloqueado na rota normal (usa /portal ou /abrir-chamado)
    if user and user.role == 'publico':
        return jsonify({'error': 'Acesso negado'}), 403

    try:
        criticidade = data.get('criticidade_informada')
        opcoes = data.get('opcoes_selecionadas')
        opcoes_json = json.dumps(opcoes) if opcoes is not None else None
        
        novo = Chamado(
            titulo = data.get('titulo'),
            descricao = data.get('descricao'),
            status = data.get('status') or 'aberto',
            prioridade = data.get('prioridade'),
            tipo = data.get('tipo') or 'maquinario',
            valor_total = safe_float(data.get('valor_total')),
            criticidade_informada = criticidade,
            criticidade_real = data.get('criticidade_real') or criticidade,
            empresa_id = safe_int(data.get('empresa_id')),
            localizacao_id = safe_int(data.get('localizacao_id')),
            usuario_responsavel_id = safe_int(data.get('usuario_responsavel_id')),
            usuario_solicitante_id = user.id if user else None,
            categoria_id = safe_int(data.get('categoria_id')),
            ativo_id = safe_int(data.get('ativo_id')),
            infraestrutura_id = safe_int(data.get('infraestrutura_id')),
            fornecedor_id = safe_int(data.get('fornecedor_id')),
            contrato_id = safe_int(data.get('contrato_id')),
            orcamento_id = safe_int(data.get('orcamento_id')),
            orcamentos_ids = json.dumps(data.get('orcamentos_ids')) if data.get('orcamentos_ids') is not None else None,
            fornecedores_ids = json.dumps(data.get('fornecedores_ids')) if data.get('fornecedores_ids') is not None else None,
            opcoes_selecionadas = opcoes_json,
            anexos = json.dumps(data.get('anexos')) if data.get('anexos') is not None else None,
            data_abertura = datetime.utcnow(),
            ativo = True,
            deleted_at = None
        )
        
        status_resolvidos = ['resolvido', 'concluído', 'fechado']
        if novo.status.lower() in status_resolvidos:
            novo.data_solucao = datetime.utcnow()

        db.session.add(novo)
        db.session.commit()

        try:
            create_log(user=user, action='create_chamado', entity='chamado', entity_id=novo.id,
                       details={'titulo': novo.titulo, 'tipo': novo.tipo, 'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(novo.to_dict()), 201
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@chamado_bp.route('/<int:id>', methods=['GET'])
def get_chamado(id):
    user = get_current_user()
    c = Chamado.query.get_or_404(id)

    # self_service só vê chamados da própria empresa
    if user and user.role == 'self_service':
        if c.empresa_id != user.empresa_id:
            return jsonify({'error': 'Acesso negado'}), 403

    return jsonify(c.to_dict()), 200

@chamado_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_chamado(id):
    user = get_current_user()

    # self_service NÃO pode editar chamados
    if user and user.role in ('self_service', 'publico'):
        return jsonify({'error': 'Acesso negado'}), 403

    c = Chamado.query.get_or_404(id)
    data = request.get_json() or {}

    try:
        before = c.to_dict()
        old_status = (c.status or '').lower()

        if 'titulo' in data: c.titulo = data.get('titulo')
        if 'descricao' in data: c.descricao = data.get('descricao')
        if 'status' in data: c.status = data.get('status')
        if 'prioridade' in data: c.prioridade = data.get('prioridade')
        if 'tipo' in data: c.tipo = data.get('tipo')
        if 'valor_total' in data: c.valor_total = safe_float(data.get('valor_total'))
        if 'criticidade_real' in data: c.criticidade_real = data.get('criticidade_real')
        if 'empresa_id' in data: c.empresa_id = safe_int(data.get('empresa_id'))
        if 'localizacao_id' in data: c.localizacao_id = safe_int(data.get('localizacao_id'))
        if 'usuario_responsavel_id' in data: c.usuario_responsavel_id = safe_int(data.get('usuario_responsavel_id'))
        if 'categoria_id' in data: c.categoria_id = safe_int(data.get('categoria_id'))
        if 'ativo_id' in data: c.ativo_id = safe_int(data.get('ativo_id'))
        if 'infraestrutura_id' in data: c.infraestrutura_id = safe_int(data.get('infraestrutura_id'))
        if 'fornecedor_id' in data: c.fornecedor_id = safe_int(data.get('fornecedor_id'))
        if 'contrato_id' in data: c.contrato_id = safe_int(data.get('contrato_id'))
        if 'orcamento_id' in data: c.orcamento_id = safe_int(data.get('orcamento_id'))
        if 'orcamentos_ids' in data:
            ids = data.get('orcamentos_ids')
            c.orcamentos_ids = json.dumps(ids) if ids is not None else None
        if 'fornecedores_ids' in data:
            fids = data.get('fornecedores_ids')
            c.fornecedores_ids = json.dumps(fids) if fids is not None else None
        if 'opcoes_selecionadas' in data:
            opcoes = data.get('opcoes_selecionadas')
            c.opcoes_selecionadas = json.dumps(opcoes) if opcoes is not None else None
        if 'anexos' in data:
            c.anexos = json.dumps(data.get('anexos')) if data.get('anexos') is not None else None

        new_status = (c.status or '').lower()
        status_resolvidos = ['resolvido', 'concluído', 'fechado']
        if new_status in status_resolvidos and old_status not in status_resolvidos:
            c.data_solucao = datetime.utcnow()
        elif new_status not in status_resolvidos:
            c.data_solucao = None

        db.session.commit()

        try:
            create_log(user=user, action='update_chamado', entity='chamado', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(c.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@chamado_bp.route('/<int:id>', methods=['DELETE'])
def soft_delete_chamado(id):
    user = get_current_user()

    # self_service e publico NÃO podem excluir
    if user and user.role in ('self_service', 'publico'):
        return jsonify({'error': 'Acesso negado'}), 403

    c = Chamado.query.get_or_404(id)
    if not c.ativo:
        return jsonify({'ok': True, 'message': 'already_inactive'}), 200
    try:
        snapshot = c.to_dict()
        c.ativo = False
        c.deleted_at = datetime.utcnow()
        db.session.commit()
        try:
            create_log(user=user, action='soft_delete_chamado', entity='chamado', entity_id=id,
                       details={'deleted': snapshot}, req=request)
        except Exception:
            pass
        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500


# ─────────────────────────────────────────────
# OBSERVAÇÕES / ACOMPANHAMENTOS DO CHAMADO
# ─────────────────────────────────────────────
from ..models.chamado_observacao import ChamadoObservacao

@chamado_bp.route('/<int:chamado_id>/observacoes', methods=['GET'])
def list_observacoes(chamado_id):
    obs = ChamadoObservacao.query.filter_by(chamado_id=chamado_id)\
        .order_by(ChamadoObservacao.created_at.asc()).all()
    return jsonify([o.to_dict() for o in obs]), 200

@chamado_bp.route('/<int:chamado_id>/observacoes', methods=['POST'])
def create_observacao(chamado_id):
    data = request.get_json() or {}
    user = get_current_user()

    texto = (data.get('texto') or '').strip()
    if not texto:
        return jsonify({'error': 'Texto é obrigatório'}), 400

    obs = ChamadoObservacao(
        chamado_id=chamado_id,
        usuario_id=user.id if user else None,
        usuario_nome=data.get('usuario_nome') or (user.username if user else 'Anônimo'),
        texto=texto,
        tipo=data.get('tipo', 'observacao')
    )
    db.session.add(obs)
    db.session.commit()
    return jsonify(obs.to_dict()), 201

@chamado_bp.route('/<int:chamado_id>/observacoes/<int:obs_id>', methods=['DELETE'])
def delete_observacao(chamado_id, obs_id):
    obs = ChamadoObservacao.query.filter_by(id=obs_id, chamado_id=chamado_id).first_or_404()
    db.session.delete(obs)
    db.session.commit()
    return jsonify({'ok': True}), 200


# ─────────────────────────────────────────────────────
# PAINEL FINANCEIRO
# ─────────────────────────────────────────────────────
def _fin_section(title, info):
    if not info: return ''
    rows = ''.join(
        '<tr>'
        '<td style="padding:4px 8px;color:#64748b;font-size:13px;min-width:110px"><b>{k}</b></td>'
        '<td style="padding:4px 8px;color:#1e293b;font-size:13px">{v}</td>'
        '</tr>'.format(k=k, v=v)
        for k, v in info.items() if k != 'text_preview'
    )
    preview = info.get('text_preview', '')[:600]
    prev_html = (
        '<details style="margin-top:8px">'
        '<summary style="cursor:pointer;font-size:11px;color:#94a3b8">Ver texto extraido</summary>'
        '<pre style="font-size:11px;color:#64748b;white-space:pre-wrap;margin:4px 0">{p}</pre>'
        '</details>'
    ).format(p=preview) if preview else ''
    return (
        '<div style="margin:14px 0;background:#fff;border:1px solid #e2e8f0;'
        'border-radius:8px;padding:16px">'
        '<p style="font-weight:700;color:#1e3a5f;margin:0 0 10px">{t}</p>'
        '{tbl}{prev}</div>'
    ).format(t=title, tbl=('<table style="width:100%">'+rows+'</table>') if rows else '', prev=prev_html)


@chamado_bp.route('/<int:cid>/financeiro', methods=['POST'])
def enviar_financeiro(cid):
    user = get_current_user()
    chamado = Chamado.query.get_or_404(cid)

    fornecedor_nome  = (request.form.get('fornecedor_nome')  or '').strip()
    forma_pagamento  = (request.form.get('forma_pagamento')  or '').strip()
    observacao_extra = (request.form.get('observacao')       or '').strip()
    smtp_id          = request.form.get('smtp_id')
    apenas_salvar    = request.form.get('apenas_salvar') == '1'
    clinica = (
        request.form.get('clinica') or
        (chamado.empresa_rel.nome if chamado.empresa_rel else '') or ''
    ).strip()

    nf_file     = request.files.get('nf')
    boleto_file = request.files.get('boleto')

    def _extract(f):
        info = {}
        if not f: return info
        import re
        try:
            import pdfplumber, io
            f.seek(0)
            with pdfplumber.open(io.BytesIO(f.read())) as pdf:
                text = '\n'.join(p.extract_text() or '' for p in pdf.pages[:4])
            info['text_preview'] = text[:1500]
            for pat, label in [
                (r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}',                        'CNPJ'),
                (r'R\$\s*([\d\.]+,\d{2})',                                   'Valor'),
                (r'(?:Vencimento|Venc\.?)[:\s]+(\d{2}/\d{2}/\d{4})',         'Vencimento'),
                (r'(?:Data\s*de\s*emiss[aã]o|Emiss[aã]o)[:\s]+(\d{2}/\d{2}/\d{4})', 'Emissao'),
                (r'(?:Nota\s*Fiscal|NF-?e?)\s*[nN][o°]?\s*([\d/]+)',         'Numero NF'),
            ]:
                m = re.search(pat, text, re.IGNORECASE)
                if m:
                    info[label] = m.group(1) if m.lastindex else m.group()
            f.seek(0)
        except Exception:
            try: f.seek(0)
            except Exception: pass
        return info

    nf_info     = _extract(nf_file)
    boleto_info = _extract(boleto_file)

    if apenas_salvar:
        # Só salvar, não enviar email
        try:
            import os, json as _json
            if fornecedor_nome:
                chamado.fin_fornecedor = fornecedor_nome
            if forma_pagamento:
                chamado.fin_forma_pagamento = forma_pagamento
            if observacao_extra:
                chamado.fin_observacao = observacao_extra

            upload_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'static', 'uploads', 'financeiro'
            )
            os.makedirs(upload_dir, exist_ok=True)
            anexos_salvos = _json.loads(chamado.fin_anexos or '[]')
            for tipo, f_obj in [('nf', nf_file), ('boleto', boleto_file)]:
                if f_obj and f_obj.filename:
                    ext = os.path.splitext(f_obj.filename)[1] or '.pdf'
                    nome = f'chamado_{cid}_{tipo}{ext}'
                    f_obj.seek(0)
                    f_obj.save(os.path.join(upload_dir, nome))
                    anexos_salvos = [a for a in anexos_salvos if a.get('tipo') != tipo]
                    anexos_salvos.append({'tipo': tipo, 'nome': f_obj.filename, 'path': f'financeiro/{nome}'})
            chamado.fin_anexos = _json.dumps(anexos_salvos)
            db.session.commit()
            return jsonify({'success': True, 'extracted': {'nf': nf_info, 'boleto': boleto_info}, 'fin_anexos': _json.loads(chamado.fin_anexos or '[]')})
        except Exception as exc:
            import traceback
            db.session.rollback()
            return jsonify({'success': False, 'error': str(exc), 'trace': traceback.format_exc()}), 500

    from ..models.marketing_smtp import MarketingSmtp
    # Usar sempre a conta de sistema (ti01) que tem permissão de relay interno
    from ..models.config_email import ConfigEmail as _CE

    class _SmtpProxy:
        pass

    _ce = _CE.query.first()
    smtp_cfg = _SmtpProxy()
    smtp_cfg.host           = _ce.mail_server         if _ce else 'smtp.brdrive.net'
    smtp_cfg.port           = _ce.mail_port            if _ce else 587
    smtp_cfg.use_tls        = _ce.mail_use_tls         if _ce else True
    smtp_cfg.use_ssl        = False
    smtp_cfg.username       = 'manutencoes@digimaxdiagnostico.com.br'
    smtp_cfg.password       = 'Man2023@GX'
    smtp_cfg.email_remetente= 'manutencoes@digimaxdiagnostico.com.br'
    smtp_cfg.nome_remetente = 'Vimax'
    if not smtp_cfg:
        return jsonify({'success': False,
                        'error': 'Nenhuma config SMTP ativa. Configure em Marketing > SMTP.'}), 400

    dest = [
        'manutencao02@digimaxdiagnostico.com.br',
        'manutencao@digimaxdiagnostico.com.br',
        'financeiro@digimaxdiagnostico.com.br',
        'controlefinanceiro@digimaxdiagnostico.com.br',
        'expansao@digimaxdiagnostico.com.br',
    ]
    obs_row = (
        '<tr><td style="padding:8px 0;font-weight:700;color:#64748b;width:180px">Observacao</td>'
        '<td style="padding:8px 0;color:#1e293b">{obs}</td></tr>'
    ).format(obs=observacao_extra) if observacao_extra else ''

    html_body = (
        '<html><body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px">'
        '<div style="background:#1e3a5f;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0">'
        '<h2 style="margin:0;font-size:18px">Envio Automático de NF e Boleto Vimax - Chamado #{cid}</h2>'
        '<p style="margin:4px 0 0;opacity:.75;font-size:13px">{titulo}</p></div>'
        '<div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;'
        'border-top:none;border-radius:0 0 12px 12px">'
        '<table style="width:100%;border-collapse:collapse">'
        '<tr><td style="padding:8px 0;font-weight:700;color:#64748b;width:180px">Clinica</td>'
        '<td style="padding:8px 0;color:#1e293b">{clinica}</td></tr>'
        '<tr><td style="padding:8px 0;font-weight:700;color:#64748b">Fornecedor</td>'
        '<td style="padding:8px 0;color:#1e293b">{forn}</td></tr>'
        '<tr><td style="padding:8px 0;font-weight:700;color:#64748b">Forma de Pagamento</td>'
        '<td style="padding:8px 0;color:#1e293b">{forma}</td></tr>'
        '<tr><td style="padding:8px 0;font-weight:700;color:#64748b">Chamado</td>'
        '<td style="padding:8px 0;color:#1e293b">#{cid} - {titulo}</td></tr>'
        '{obs_row}</table>'
        '{nf_sec}{bol_sec}'
        '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">'
        '<p style="color:#94a3b8;font-size:11px">Enviado pelo Vimax - Usuario: {usuario}</p>'
        '</div></body></html>'
    ).format(
        cid=cid, titulo=chamado.titulo or '',
        clinica=clinica or '-', forn=fornecedor_nome or '-', forma=forma_pagamento or '-',
        obs_row=obs_row,
        nf_sec=_fin_section('Dados extraidos da NF', nf_info),
        bol_sec=_fin_section('Dados extraidos do Boleto', boleto_info),
        usuario=getattr(user, 'username', '?'),
    )

    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart as _MM
        from email.mime.text      import MIMEText      as _MT
        from email.mime.base      import MIMEBase      as _MB
        from email                import encoders      as _enc

        msg = _MM()
        from email.header import Header
        msg['Subject'] = Header('[Financeiro] Chamado #{cid} - {forn}'.format(
            cid=cid, forn=fornecedor_nome or chamado.titulo or ''), 'utf-8')
        from email.header import Header as _Hdr
        _nome_rem = smtp_cfg.nome_remetente or ''
        try: _nome_rem.encode('ascii')
        except: _nome_rem = _nome_rem.encode('utf-8').decode('utf-8')
        msg['From'] = '{n} <{e}>'.format(n=_nome_rem, e=smtp_cfg.email_remetente)
        msg['To']   = ', '.join(dest)
        msg.attach(_MT(html_body, 'html', 'utf-8'))

        def _attach(f, fallback):
            if not f: return
            f.seek(0); data = f.read()
            part = _MB('application', 'octet-stream')
            part.set_payload(data)
            _enc.encode_base64(part)
            fname = (f.filename or fallback).encode('ascii', 'replace').decode()
            part.add_header('Content-Disposition', 'attachment', filename=fname)
            msg.attach(part)

        def _attach_from_disk(tipo, fallback):
            """Anexa arquivo salvo em disco se não veio um novo no request."""
            import os, json as _json
            try:
                anexos = _json.loads(chamado.fin_anexos or '[]')
                entry  = next((a for a in anexos if a.get('tipo') == tipo), None)
                if not entry: return
                upload_base = os.path.join(
                    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    'static', 'uploads'
                )
                full_path = os.path.join(upload_base, entry['path'])
                if not os.path.exists(full_path): return
                with open(full_path, 'rb') as fp:
                    data = fp.read()
                part = _MB('application', 'octet-stream')
                part.set_payload(data)
                _enc.encode_base64(part)
                fname = (entry.get('nome') or fallback).encode('ascii', 'replace').decode()
                part.add_header('Content-Disposition', 'attachment', filename=fname)
                msg.attach(part)
            except Exception as _e:
                print(f'[WARN] _attach_from_disk({tipo}): {_e}')

        if nf_file and nf_file.filename:
            _attach(nf_file, 'nota_fiscal.pdf')
        else:
            _attach_from_disk('nf', 'nota_fiscal.pdf')

        if boleto_file and boleto_file.filename:
            _attach(boleto_file, 'boleto.pdf')
        else:
            _attach_from_disk('boleto', 'boleto.pdf')

        if smtp_cfg.use_ssl:
            srv = smtplib.SMTP_SSL(smtp_cfg.host, smtp_cfg.port, timeout=15)
        else:
            srv = smtplib.SMTP(smtp_cfg.host, smtp_cfg.port, timeout=15)
            if smtp_cfg.use_tls: srv.starttls()
        srv.login(smtp_cfg.username, smtp_cfg.password)
        srv.sendmail(smtp_cfg.email_remetente, dest, msg.as_bytes())
        srv.quit()

        # ── Persistir dados financeiros no chamado ──
        try:
            import os, json as _json
            if fornecedor_nome:
                chamado.fin_fornecedor = fornecedor_nome
            if forma_pagamento:
                chamado.fin_forma_pagamento = forma_pagamento
            if observacao_extra:
                chamado.fin_observacao = observacao_extra

            # Salvar PDFs
            upload_dir = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                'static', 'uploads', 'financeiro'
            )
            os.makedirs(upload_dir, exist_ok=True)
            anexos_salvos = _json.loads(chamado.fin_anexos or '[]')

            for tipo, f_obj in [('nf', nf_file), ('boleto', boleto_file)]:
                if f_obj and f_obj.filename:
                    ext = os.path.splitext(f_obj.filename)[1] or '.pdf'
                    nome = f'chamado_{cid}_{tipo}{ext}'
                    f_obj.seek(0)
                    f_obj.save(os.path.join(upload_dir, nome))
                    # Remover entrada anterior do mesmo tipo
                    anexos_salvos = [a for a in anexos_salvos if a.get('tipo') != tipo]
                    anexos_salvos.append({'tipo': tipo, 'nome': f_obj.filename, 'path': f'financeiro/{nome}'})

            chamado.fin_anexos = _json.dumps(anexos_salvos)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f'[WARN] Não salvou dados financeiros: {e}')

        try:
            create_log(user=user, action='enviar_financeiro', entity='chamado',
                       entity_id=cid,
                       details={'fornecedor': fornecedor_nome, 'forma': forma_pagamento, 'smtp_id': smtp_id},
                       req=request)
        except Exception: pass

        return jsonify({'success': True, 'extracted': {'nf': nf_info, 'boleto': boleto_info}, 'fin_anexos': _json.loads(chamado.fin_anexos or '[]')})
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500
