# -*- coding: utf-8 -*-
import json
import os
import secrets
import threading
from datetime import datetime

import requests
from flask import Blueprint, jsonify, request

from .. import db
from ..models.mobilemed_relatorio import MobilemedException as MobilemedRelatorio
from ..utils.logging import create_log

mobilemed_bp = Blueprint('mobilemed', __name__)

MOBILEMED_BASE_HOMOLOG = 'https://public-report-api-homolog.mobilemed.com.br'
MOBILEMED_BASE_PROD    = 'https://public-report-api.mobilemed.com.br'

CLIENT_ID_HOMOLOG = os.environ.get(
    'MOBILEMED_CLIENT_ID_HOMOLOG',
    ''
).strip()
CLIENT_SECRET_HOMOLOG = os.environ.get(
    'MOBILEMED_CLIENT_SECRET_HOMOLOG',
    ''
).strip()
CLIENT_ID_PROD = os.environ.get(
    'MOBILEMED_CLIENT_ID_PROD',
    ''
).strip()
CLIENT_SECRET_PROD = os.environ.get(
    'MOBILEMED_CLIENT_SECRET_PROD',
    ''
).strip()
MOBILEMED_WEBHOOK_SECRET = os.environ.get(
    'MOBILEMED_WEBHOOK_SECRET',
    ''
).strip()

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

def _get_token(ambiente='homolog'):
    if ambiente == 'prod':
        base, client_id, client_secret = MOBILEMED_BASE_PROD, CLIENT_ID_PROD, CLIENT_SECRET_PROD
    else:
        base, client_id, client_secret = MOBILEMED_BASE_HOMOLOG, CLIENT_ID_HOMOLOG, CLIENT_SECRET_HOMOLOG

    if not client_id or not client_secret:
        raise RuntimeError(
            f'Credenciais do MobileMed não configuradas para o ambiente {ambiente}'
        )

    res = requests.post(
        f'{base}/authenticate',
        data={
            'grant_type':    'client_credentials',
            'client_id':     client_id,
            'client_secret': client_secret,
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


def _enviar_para_mobilemed(app, relatorio_id, ambiente, payload):
    """Roda em background thread — não bloqueia o Flask"""
    with app.app_context():
        rel = MobilemedRelatorio.query.get(relatorio_id)
        if not rel:
            return

        # Se o webhook já concluiu, não deixa a thread sobrescrever status/erro_msg
        if getattr(rel, 'status', None) == 'concluido':
            return
        try:
            base  = MOBILEMED_BASE_HOMOLOG if ambiente == 'homolog' else MOBILEMED_BASE_PROD
            print(f'[MOBILEMED] Autenticando... (relatorio_id={relatorio_id})')
            token = _get_token(ambiente)
            print(f'[MOBILEMED] Token OK. Enviando request-report...')
            res   = requests.post(
                f'{base}/request-report',
                json=payload,
                headers={'Authorization': f'Bearer {token}'},
                timeout=(10, 240)
            )
            res_data = res.json()
            print(f'[MOBILEMED] Resposta: {res.status_code} — {json.dumps(res_data)[:200]}')

            if res.status_code in (201, 202):
                rel.request_id = res_data.get("requestId")
                rel.status     = "processando"
                rel.erro_msg   = None
            else:
                rel.status   = "erro"
                rel.erro_msg = json.dumps(res_data)

            db.session.commit()

        except Exception as e:
            print(f'[MOBILEMED] Erro background: {e}')
            rel.status   = 'erro'
            rel.erro_msg = str(e)
            db.session.commit()


# ─── Listar campos disponíveis ────────────────────────────────────────────────
@mobilemed_bp.route('/campos', methods=['GET'])
def listar_campos():
    user, err = _require_super_admin()
    if err: return err
    return jsonify(CAMPOS_DISPONIVEIS)


# ─── Listar unidades disponíveis ──────────────────────────────────────────────
@mobilemed_bp.route('/unidades', methods=['GET'])
def listar_unidades():
    user, err = _require_super_admin()
    if err: return err
    try:
        ambiente = request.args.get('ambiente', 'homolog')
        base     = MOBILEMED_BASE_HOMOLOG if ambiente == 'homolog' else MOBILEMED_BASE_PROD
        token    = _get_token(ambiente)
        res      = requests.get(
            f'{base}/reports/debug/unity',
            headers={'Authorization': f'Bearer {token}'},
            timeout=90
        )
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ─── Solicitar relatório (resposta imediata + background thread) ──────────────
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
    if ambiente not in ('homolog', 'prod'):
        return jsonify({'error': 'Ambiente inválido'}), 400
    if not MOBILEMED_WEBHOOK_SECRET:
        return jsonify({
            'error': 'MOBILEMED_WEBHOOK_SECRET não configurado no servidor'
        }), 503

    # Salva no banco imediatamente
    rel = MobilemedRelatorio(
        nome           = nome,
        ambiente       = ambiente,
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

    try:
        create_log(user=user, action='mobilemed_request_report', entity='mobilemed_relatorio', entity_id=rel.id,
                   details={
                       'ambiente': ambiente,
                       'nome': nome,
                       'campos_count': len(campos) if isinstance(campos, list) else None,
                       'filtros_count': len(filtros) if isinstance(filtros, list) else None,
                       'unidades_count': len(unidades) if isinstance(unidades, list) else None,
                       'webhook_url': webhook_url,
                   }, req=request)
    except Exception:
        pass

    # Monta payload para o Mobilemed
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
                'X-MobileMed-Webhook-Secret': MOBILEMED_WEBHOOK_SECRET,
                'Content-Type': 'application/json'
            }
        }
    }
    if filtros:
        payload['filtros'] = filtros
    if unidades:
        payload['unidades'] = unidades

    # Dispara em background — não bloqueia
    app = current_app._get_current_object()
    t = threading.Thread(
        target=_enviar_para_mobilemed,
        args=(app, rel.id, ambiente, payload),
        daemon=True
    )
    t.start()

    # Responde imediatamente para o frontend
    return jsonify({
        'success':      True,
        'relatorio_id': rel.id,
        'request_id':   None,
        'message':      'Relatório em fila! Processando em background...',
    }), 202


# ─── Webhook receiver (chamado pelo Mobilemed) ────────────────────────────────
@mobilemed_bp.route('/webhook', methods=['POST'])
def webhook_receiver():
    received_secret = request.headers.get(
        'X-MobileMed-Webhook-Secret',
        ''
    )

    if (
        not MOBILEMED_WEBHOOK_SECRET
        or not received_secret
        or not secrets.compare_digest(
            received_secret,
            MOBILEMED_WEBHOOK_SECRET
        )
    ):
        return jsonify({
            'ok': False,
            'error': 'Webhook não autorizado'
        }), 403

    try:
        payload = request.get_json(silent=True) or {}
        # log resumido (sem salvar payload inteiro no log)
        print(f'[MOBILEMED WEBHOOK] Recebido: {json.dumps(payload)[:500]}')

        relatorio_id = request.headers.get('X-Vimax-Relatorio-Id')
        request_id   = payload.get('requestId') or payload.get('request_id')

        rel = None
        if relatorio_id:
            try:
                rel = MobilemedRelatorio.query.get(int(relatorio_id))
            except (TypeError, ValueError):
                return jsonify({
                    'ok': False,
                    'error': 'Identificador de relatório inválido'
                }), 400
        if not rel and request_id:
            rel = MobilemedRelatorio.query.filter_by(request_id=request_id).first()

        if rel:
            # garante que request_id fique gravado mesmo se o webhook chegar antes do retorno do request-report
            if request_id and not rel.request_id:
                rel.request_id = request_id
            rel.webhook_payload = json.dumps(payload)
            rel.concluido_em    = datetime.utcnow()

            csv_url = (
                payload.get('downloadUrl')
                or payload.get('csvUrl')
                or payload.get('csv_url')
                or payload.get('s3Url')
                or payload.get('url')
            )
            status  = payload.get('status', '').lower()
            erro    = payload.get('error') or payload.get('message') if ('erro' in status or 'error' in status) else None

            if csv_url:
                rel.csv_url = csv_url
                rel.status = 'concluido'
                rel.erro_msg = None
            elif erro:
                rel.status   = 'erro'
                rel.erro_msg = str(erro)
            else:
                rel.status    = 'concluido'
                rel.csv_dados = json.dumps(payload)

            total = payload.get('rowCount') or payload.get('totalRecords') or payload.get('total_records') or payload.get('total')
            if total:
                rel.total_registros = int(total)

            db.session.commit()

            try:
                csv_url = (
                payload.get('downloadUrl')
                or payload.get('csvUrl')
                or payload.get('csv_url')
                or payload.get('s3Url')
                or payload.get('url')
            )
                status  = (payload.get('status') or '').lower()
                total   = payload.get('rowCount') or payload.get('totalRecords') or payload.get('total_records') or payload.get('total')
                create_log(user=None, action='mobilemed_webhook_received', entity='mobilemed_relatorio', entity_id=rel.id,
                           details={
                               'request_id': payload.get('requestId') or payload.get('request_id'),
                               'status': status,
                               'total': int(total) if total else None,
                               'has_csv_url': True if csv_url else False,
                           }, req=request)
            except Exception:
                pass

            print(f'[MOBILEMED WEBHOOK] Relatorio {rel.id} atualizado: {rel.status}')
        else:
            print(f'[MOBILEMED WEBHOOK] Nao encontrado. request_id={request_id}')

        return jsonify({'ok': True}), 200

    except Exception as e:
        print(f'[MOBILEMED WEBHOOK] Erro: {e}')
        return jsonify({'ok': False, 'error': str(e)}), 500


# ─── Listar relatórios ────────────────────────────────────────────────────────
@mobilemed_bp.route('/relatorios', methods=['GET'])
def listar_relatorios():
    user, err = _require_super_admin()
    if err: return err
    rels = MobilemedRelatorio.query.order_by(MobilemedRelatorio.solicitado_em.desc()).all()
    return jsonify([r.to_dict() for r in rels])


# ─── Ver relatório ────────────────────────────────────────────────────────────
@mobilemed_bp.route('/relatorios/<int:id>', methods=['GET'])
def get_relatorio(id):
    user, err = _require_super_admin()
    if err: return err
    rel = MobilemedRelatorio.query.get_or_404(id)

    try:
        create_log(user=user, action='mobilemed_check_status', entity='mobilemed_relatorio', entity_id=id,
                   details={'request_id': rel.request_id}, req=request)
    except Exception:
        pass
    d   = rel.to_dict()
    d['webhook_payload'] = json.loads(rel.webhook_payload) if rel.webhook_payload else None
    return jsonify(d)


# ─── Deletar relatório ────────────────────────────────────────────────────────
@mobilemed_bp.route('/relatorios/<int:id>', methods=['DELETE'])
def deletar_relatorio(id):
    user, err = _require_super_admin()
    if err: return err
    rel = MobilemedRelatorio.query.get_or_404(id)

    try:
        create_log(user=user, action='mobilemed_check_status', entity='mobilemed_relatorio', entity_id=id,
                   details={'request_id': rel.request_id}, req=request)
    except Exception:
        pass

    snapshot = None
    try:
        snapshot = rel.to_dict()
    except Exception:
        snapshot = None

    db.session.delete(rel)
    db.session.commit()

    try:
        create_log(user=user, action='mobilemed_delete_relatorio', entity='mobilemed_relatorio', entity_id=id,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass

    return jsonify({'ok': True})


# ─── Verificar status no Mobilemed ───────────────────────────────────────────
@mobilemed_bp.route('/relatorios/<int:id>/verificar', methods=['POST'])
def verificar_status(id):
    user, err = _require_super_admin()
    if err: return err
    rel = MobilemedRelatorio.query.get_or_404(id)

    try:
        create_log(user=user, action='mobilemed_check_status', entity='mobilemed_relatorio', entity_id=id,
                   details={'request_id': rel.request_id}, req=request)
    except Exception:
        pass
    if not rel.request_id:
        return jsonify({'error': 'Sem request_id — ainda processando em background'}), 400
    try:
        ambiente = rel.ambiente or 'homolog'
        base  = MOBILEMED_BASE_PROD if ambiente == 'prod' else MOBILEMED_BASE_HOMOLOG
        token = _get_token(ambiente)
        res   = requests.get(
            f'{base}/reports/{rel.request_id}/status',
            headers={'Authorization': f'Bearer {token}'},
            timeout=90
        )
        return jsonify(res.json()), res.status_code
    except Exception as e:
        return jsonify({'error': str(e)}), 500