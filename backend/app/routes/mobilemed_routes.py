# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from ..utils.logging import create_log
from .. import db
from ..models.mobilemed_relatorio import MobilemedException as MobilemedRelatorio
import os
import requests, json, threading
from threading import Thread
from datetime import datetime, timedelta

mobilemed_bp = Blueprint('mobilemed', __name__)

MOBILEMED_BASE_HOMOLOG = 'https://public-report-api-homolog.mobilemed.com.br'
MOBILEMED_BASE_PROD    = 'https://public-report-api.mobilemed.com.br'
CLIENT_ID              = '711bruims4b80du957618idj5v'
CLIENT_SECRET          = '7fqqqu93112kilk2775f24okais1ojnp54s4pse8kd9dqrcg4os'

CAMPOS_DISPONIVEIS = [
    "exame.id", "exame.empresa_id", "exame.pacs_accession_no",
    "exame.status_id", "exame.prioridade_id", "exame.modalidade_id",
    "exame.subespecialidade_id", "exame.data_criacao", "exame.data_realizacao",
    "exame.updated_at", "exame.is_liberado", "exame.is_excluido",
    "exame.codigo_paciente", "exame.nome_paciente", "exame.codigo_pedido",
    "exame.idade_paciente", "exame.ia_status", "exame.estudo_descricao",
    "exame.valor", "exame.is_duplicado", "exame.data_transferencia_final",
    "exame.ultima_data_laudo", "exame.sla_expiration_date",
    "exame.count_images", "exame.count_key_images",
    "empresa.id", "empresa.nome_fantasia", "empresa.is_ativa",
    "empresa.data_criacao", "empresa.updated_at",
    "usuario.id", "usuario.nome", "usuario.digitador_nome",
    "usuario.cod_interno", "usuario.crm", "usuario.is_ativo",
    "usuario.data_criacao",
    "status.id", "status.descricao",
    "prioridade.id", "prioridade.nome",
    "modalidade.id", "modalidade.nome",
    "subespecialidade.id", "subespecialidade.descricao", "subespecialidade.valor",
    "especialidade.id",
    "laudo_usuario.action", "laudo_usuario.segunda_assinatura_laudo",
    "laudo_usuario.segunda_assinatura_laudo_id",
]

def _get_base(ambiente: str):
    return MOBILEMED_BASE_HOMOLOG if ambiente == 'homolog' else MOBILEMED_BASE_PROD

def _get_token(ambiente='homolog'):
    base = _get_base(ambiente)
    res = requests.post(
        f'{base}/authenticate',
        data={
            'grant_type':    'client_credentials',
            'client_id':     CLIENT_ID,
            'client_secret': CLIENT_SECRET,
        },
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
        timeout=90
    )
    res.raise_for_status()
    return res.json()['access_token']

def _require_super_admin():
    from ..models.usuario import Usuario
    api_token = request.headers.get('X-API-Token')
    if not api_token:
        return None, (jsonify({'error': 'Nao autenticado'}), 401)
    user = Usuario.query.filter_by(api_token=api_token).first()
    if not user or user.role != 'super_admin':
        return None, (jsonify({'error': 'Apenas Super Admin'}), 403)
    return user, None

def _safe_json_loads(s, default):
    try:
        return json.loads(s) if s else default
    except Exception:
        return default

def _extract_filtro_data(rel):
    filtros = _safe_json_loads(getattr(rel, 'filtros', None), [])
    if isinstance(filtros, list) and filtros:
        f0 = filtros[0] if isinstance(filtros[0], dict) else None
        return f0
    return None

def _set_filtro_data(rel, campo):
    filtros = _safe_json_loads(getattr(rel, 'filtros', None), [])
    if not isinstance(filtros, list):
        filtros = []
    if filtros and isinstance(filtros[0], dict):
        filtros[0]['campo'] = campo
    else:
        # se não existir, cria um mínimo baseado no período salvo
        filtros = [{
            'campo': campo,
            'operador': 'between',
            'valor': [rel.data_inicio, rel.data_fim]
        }]
    rel.filtros = json.dumps(filtros)

def _build_payload_for_rel(rel, user_email, webhook_url):
    campos   = _safe_json_loads(rel.campos, [])
    filtros  = _safe_json_loads(rel.filtros, [])
    unidades = _safe_json_loads(rel.unidades, [])

    payload = {
        'nome':   rel.nome,
        'email':  user_email or 'ti01@digimaxdiagnostico.com.br',
        'campos': campos,
        'webhook': {
            'url': webhook_url,
            'metodo': 'POST',
            'perfil': 'SLOW',
            'headers': {
                'X-Vimax-Relatorio-Id': str(rel.id),
                'Content-Type': 'application/json'
            }
        }
    }
    if filtros:
        payload['filtros'] = filtros
    if unidades:
        payload['unidades'] = unidades
    return payload

def _enviar_para_mobilemed(app, relatorio_id, ambiente, payload):
    """Roda em background thread — não bloqueia o Flask"""
    with app.app_context():
        rel = MobilemedRelatorio.query.get(relatorio_id)
        if not rel:
            return

        # Se já concluiu/vazio/erro, não sobrescreve
        if getattr(rel, 'status', None) in ('concluido', 'vazio', 'erro'):
            return

        try:
            base  = _get_base(ambiente)

            # LOG: filtro e período antes de enviar
            try:
                filtros = payload.get('filtros') or []
                f0 = filtros[0] if isinstance(filtros, list) and filtros and isinstance(filtros[0], dict) else {}
                print(f"[MOBILEMED] relatorio_id={relatorio_id} ambiente={ambiente} filtro={f0.get('campo')} valor={f0.get('valor')}")
            except Exception:
                pass

            print(f'[MOBILEMED] Autenticando... (relatorio_id={relatorio_id})')
            token = _get_token(ambiente)

            print(f'[MOBILEMED] Enviando request-report...')
            res   = requests.post(
                f'{base}/request-report',
                json=payload,
                headers={'Authorization': f'Bearer {token}'},
                timeout=(10, 240)
            )

            # tenta parsear json; se falhar, loga texto
            try:
                res_data = res.json()
            except Exception:
                res_data = {'_raw': res.text}

            # LOG: status e requestId
            try:
                print(f"[MOBILEMED] relatorio_id={relatorio_id} http={res.status_code} requestId={res_data.get('requestId')}")
            except Exception:
                pass

            if res.status_code in (201, 202):
                rel.request_id = res_data.get("requestId")
                rel.status     = "processando"
                rel.erro_msg   = None
            else:
                rel.status   = "erro"
                rel.erro_msg = json.dumps(res_data)

            db.session.commit()

        except Exception as e:
            rel.status   = 'erro'
            rel.erro_msg = str(e)
            db.session.commit()


@mobilemed_bp.route('/campos', methods=['GET'])
def listar_campos():
    user, err = _require_super_admin()
    if err: return err
    return jsonify(CAMPOS_DISPONIVEIS)

@mobilemed_bp.route('/unidades', methods=['GET'])
def listar_unidades():
    user, err = _require_super_admin()
    if err: return err
    try:
        ambiente = request.args.get('ambiente', 'homolog')
        base     = _get_base(ambiente)
        token    = _get_token(ambiente)
        res      = requests.get(
            f'{base}/reports/debug/unity',
            headers={'Authorization': f'Bearer {token}'},
            timeout=90
        )
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mobilemed_bp.route('/solicitar', methods=['POST'])
def solicitar_relatorio():
    from flask import current_app
    user, err = _require_super_admin()
    if err: return err

    data        = request.get_json() or {}
    ambiente    = data.get('ambiente', 'homolog')
    nome        = data.get('nome', f'Relatorio {datetime.now().strftime("%d/%m/%Y %H:%M")}')
    campos      = data.get('campos', [])
    filtros     = data.get('filtros', [])
    unidades    = data.get('unidades', [])
    webhook_url = data.get('webhook_url', '')

    if not campos:
        return jsonify({'error': 'Selecione pelo menos um campo'}), 400
    if not webhook_url:
        return jsonify({'error': 'Informe a URL do webhook'}), 400

    rel = MobilemedRelatorio(
        nome           = nome,
        status         = 'aguardando',
        campos         = json.dumps(campos),
        filtros        = json.dumps(filtros),
        unidades       = json.dumps(unidades),
        data_inicio    = data.get('data_inicio'),
        data_fim       = data.get('data_fim'),
        solicitado_por = user.username,
    )
    db.session.add(rel)
    db.session.commit()

    payload = {
        'nome':    nome,
        'email':   user.email or 'ti@digimaxdiagnostico.com.br',
        'campos':  campos,
        'webhook': {
            'url':    webhook_url,
            'metodo': 'POST',
            'perfil': 'SLOW',
            'headers': {
                'X-Vimax-Relatorio-Id': str(rel.id),
                'Content-Type': 'application/json'
            }
        }
    }
    if filtros:
        payload['filtros'] = filtros
    if unidades:
        payload['unidades'] = unidades

    app = current_app._get_current_object()
    t = threading.Thread(
        target=_enviar_para_mobilemed,
        args=(app, rel.id, ambiente, payload),
        daemon=True
    )
    t.start()

    return jsonify({
        'success':      True,
        'relatorio_id': rel.id,
        'request_id':   None,
        'message':      'Relatório em fila! Processando em background...',
    }), 202

@mobilemed_bp.route('/webhook', methods=['POST'])
def webhook_receiver():
    """
    Fallback (modo B):
    - Se rowCount=0 / hasData=false e o filtro de data for exame.data_realizacao,
      re-solicita automaticamente UMA vez trocando para exame.data_criacao (mesmo período).
    """
    try:
        payload = request.get_json(force=True) or {}

        relatorio_id = request.headers.get('X-Vimax-Relatorio-Id')
        request_id   = payload.get('requestId') or payload.get('request_id')

        rel = None
        if relatorio_id:
            rel = MobilemedRelatorio.query.get(int(relatorio_id))
        if not rel and request_id:
            rel = MobilemedRelatorio.query.filter_by(request_id=request_id).first()

        if not rel:
            return jsonify({'ok': True}), 200

        # Atualiza request_id se necessário
        if request_id and not rel.request_id:
            rel.request_id = request_id

        # Guarda payload do webhook
        rel.webhook_payload = json.dumps(payload)
        rel.concluido_em    = datetime.utcnow()

        csv_url = (
            payload.get('downloadUrl')
            or payload.get('csvUrl')
            or payload.get('csv_url')
            or payload.get('s3Url')
            or payload.get('url')
        )
        if csv_url:
            rel.csv_url = csv_url

        total = payload.get('rowCount') or payload.get('totalRecords') or payload.get('total_records') or payload.get('total')
        has_data = payload.get('hasData')
        msg = payload.get('message') or payload.get('mensagem')

        try:
            rel.total_registros = int(total) if total is not None else 0
        except Exception:
            rel.total_registros = 0

        is_empty_csv = bool(csv_url) and ('empty-report.csv' in str(csv_url))
        is_no_data = (has_data is False) or (rel.total_registros == 0) or is_empty_csv

        # Detecta se já fez fallback antes
        meta = _safe_json_loads(rel.webhook_payload, {})
        already_fallback = bool(isinstance(meta, dict) and meta.get('__fallback_applied') is True)

        f0 = _extract_filtro_data(rel)
        filtro_campo = (f0.get('campo') if isinstance(f0, dict) else None)

        # Se não tem dados e filtro era data_realizacao, tenta fallback para data_criacao (1 vez)
        if is_no_data and (filtro_campo == 'exame.data_realizacao') and not already_fallback:
            # marca no payload salvo que fez fallback (pra não loopar)
            meta = meta if isinstance(meta, dict) else {}
            meta['__fallback_applied'] = True
            meta['__fallback_reason'] = 'rowCount=0 => retry with exame.data_criacao'
            rel.webhook_payload = json.dumps(meta)

            # atualiza filtro no relatorio
            _set_filtro_data(rel, 'exame.data_criacao')

            # reseta status para reprocessar
            rel.status = 'processando'
            rel.erro_msg = 'Fallback aplicado: tentando novamente com exame.data_criacao (mesmo período).'
            db.session.commit()

            # reenvia (usa o mesmo webhook do front)
            # tenta descobrir webhook_url salvo; se não tiver no model, usa o do próprio request atual (não existe aqui)
            # então, por padrão, reusa o mesmo endpoint que o front usa (constante) via relatorio.campos... não existe.
            # Melhor: usar o webhook_url que já veio no payload original do /solicitar, mas não armazenamos.
            # Então aqui vamos reusar o próprio endpoint atual (o webhook do sistema), que é fixo na prática.
            webhook_url = 'https://proven-duck-instantly.ngrok-free.app/api/mobilemed/webhook'

            # ambiente: se você não salva, assume homolog (como está seu uso)
            ambiente = 'homolog'

            from flask import current_app
            app = current_app._get_current_object()

            # precisa de email; se não tem no model, usa padrão
            user_email = 'ti@digimaxdiagnostico.com.br'

            new_payload = _build_payload_for_rel(rel, user_email=user_email, webhook_url=webhook_url)

            t = threading.Thread(
                target=_enviar_para_mobilemed,
                args=(app, rel.id, ambiente, new_payload),
                daemon=True
            )
            t.start()

            return jsonify({'ok': True, 'fallback': True}), 200

        # Se chegou aqui, finaliza status normal
        if is_no_data:
            rel.status = 'vazio'
            rel.erro_msg = msg or 'Nenhum registro encontrado para os filtros aplicados.'
        else:
            rel.status = 'concluido'
            rel.erro_msg = None

        db.session.commit()
        return jsonify({'ok': True}), 200

    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500

@mobilemed_bp.route('/relatorios', methods=['GET'])
def listar_relatorios():
    user, err = _require_super_admin()
    if err: return err
    rels = MobilemedRelatorio.query.order_by(MobilemedRelatorio.solicitado_em.desc()).all()
    return jsonify([r.to_dict() for r in rels])

@mobilemed_bp.route('/relatorios/<int:id>/verificar', methods=['POST'])
def verificar_status(id):
    user, err = _require_super_admin()
    if err: return err
    rel = MobilemedRelatorio.query.get_or_404(id)
    if not rel.request_id:
        return jsonify({'error': 'Sem request_id — ainda processando em background'}), 400
    try:
        token = _get_token('homolog')
        res   = requests.get(
            f'{MOBILEMED_BASE_HOMOLOG}/reports/{rel.request_id}/status',
            headers={'Authorization': f'Bearer {token}'},
            timeout=90
        )
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==========================
# Automacao (PROD) - Power BI
# ==========================

@mobilemed_bp.route("/auto/diario-prod", methods=["POST"])
def auto_diario_prod():
    """
    Dispara automaticamente um relatório diário em PRODUÇÃO.
    Por padrão filtra por exame.data_criacao (ontem).
    """
    from flask import current_app

    user, err = _require_super_admin()
    if err:
        return err

    hoje = datetime.now().date()
    ontem = hoje - timedelta(days=1)
    data_inicio = ontem.strftime("%Y-%m-%d")
    data_fim = ontem.strftime("%Y-%m-%d")

    ambiente = "homolog"

    # URL pública fixa para o Mobilemed chamar o webhook
    webhook_url = os.environ.get("MOBILEMED_WEBHOOK_URL", "").strip()
    if not webhook_url:
        return jsonify({"error": "MOBILEMED_WEBHOOK_URL nao configurada (URL publica fixa do webhook)"}), 500

    campos = [
        "exame.nome_paciente",
        "exame.estudo_descricao",
        "exame.data_transferencia_final",
        "exame.data_realizacao",
        "exame.prioridade_id",
        "exame.data_criacao",
        "exame.subespecialidade_id",
        "exame.status_id",
        "exame.ultima_data_laudo",
        "empresa.nome_fantasia",
        "usuario.digitador_nome",
        "status.descricao",
        "prioridade.nome",
        "modalidade.nome",
        "laudo_usuario.segunda_assinatura_laudo",
        "exame.id",
    ]

    filtros = [
        {"campo": "exame.data_criacao", "operador": "between", "valor": [data_inicio, data_fim]}
    ]

    unidades = []
    nome = f"BI PROD - Diario ({ontem.strftime('%d/%m/%Y')})"

    rel = MobilemedRelatorio(
        nome=nome,
        status="aguardando",
        campos=json.dumps(campos),
        filtros=json.dumps(filtros),
        unidades=json.dumps(unidades),
        data_inicio=data_inicio,
        data_fim=data_fim,
        solicitado_por=user.username,
    )

    # Campos opcionais (se existirem no model)
    if hasattr(rel, "ambiente"):
        rel.ambiente = ambiente
    if hasattr(rel, "webhook_url"):
        rel.webhook_url = webhook_url
    if hasattr(rel, "payload_enviado"):
        rel.payload_enviado = json.dumps({
            "nome": nome,
            "email": user.email or "ti@digimaxdiagnostico.com.br",
            "campos": campos,
            "filtros": filtros,
            "unidades": unidades,
            "webhook": {"url": webhook_url, "metodo": "POST"},
        })

    db.session.add(rel)
    db.session.commit()

    payload = {
        "nome": nome,
        "email": user.email or "ti@digimaxdiagnostico.com.br",
        "campos": campos,
        "filtros": filtros,
        "unidades": unidades,
        "webhook": {"url": webhook_url, "metodo": "POST"},
    }

    print(f"[MOBILEMED][AUTO] disparando relatorio_id={rel.id} ambiente={ambiente} data_inicio={data_inicio} data_fim={data_fim}")

    t = Thread(
        target=_enviar_para_mobilemed,
        args=(current_app._get_current_object(), rel.id, ambiente, payload)
    )
    t.daemon = True
    t.start()

    return jsonify({
        "ok": True,
        "relatorio_id": rel.id,
        "ambiente": ambiente,
        "data_inicio": data_inicio,
        "data_fim": data_fim,
        "webhook_url": webhook_url,
        "campos": campos,
    }), 202
