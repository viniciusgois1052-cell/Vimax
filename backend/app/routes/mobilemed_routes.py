# -*- coding: utf-8 -*-
from __future__ import annotations

import json
import os
import threading
from datetime import datetime

import requests
from flask import Blueprint, current_app, jsonify, request, send_file

from .. import db
from ..models.mobilemed_relatorio import MobilemedException as MobilemedRelatorio
from ..utils.logging import create_log
from ..utils.mobilemed_xlsx import (
    build_report_xlsx,
    cache_report_csv,
    is_bi_name,
    normalize_selected_fields,
    regenerate_bi_xlsx,
    safe_filename,
)


mobilemed_bp = Blueprint("mobilemed", __name__)

MOBILEMED_BASE_HOMOLOG = "https://public-report-api-homolog.mobilemed.com.br"
MOBILEMED_BASE_PROD = "https://public-report-api.mobilemed.com.br"

# URL publica HTTPS usada no payload enviado a MobileMed.
# Pode ser sobrescrita pela variavel de ambiente MOBILEMED_WEBHOOK_URL.
MOBILEMED_WEBHOOK_URL = os.environ.get(
    "MOBILEMED_WEBHOOK_URL",
    "https://proven-duck-instantly.ngrok-free.app/api/mobilemed/webhook",
).strip()

# Mantidos compativeis com a v8.5. Prefira configurar todos por variavel de ambiente.
CLIENT_ID_HOMOLOG = os.environ.get(
    "MOBILEMED_CLIENT_ID_HOMOLOG",
    "711bruims4b80du957618idj5v",
)
CLIENT_SECRET_HOMOLOG = os.environ.get(
    "MOBILEMED_CLIENT_SECRET_HOMOLOG",
    "7fqqqu93112kilk2775f24okais1ojnp54s4pse8kd9dqrcg4os",
)
CLIENT_ID_PROD = os.environ.get(
    "MOBILEMED_CLIENT_ID_PROD",
    "3kihchsh7p1ueruv30iss5n617",
)
CLIENT_SECRET_PROD = os.environ.get(
    "MOBILEMED_CLIENT_SECRET_PROD",
    "ceoceqoq520clf52ke80p30tsqqrea550ktm4lu6cc835ftsug",
)

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


def _base_url(ambiente: str) -> str:
    return MOBILEMED_BASE_PROD if ambiente == "prod" else MOBILEMED_BASE_HOMOLOG


def _get_token(ambiente: str = "homolog") -> str:
    if ambiente == "prod":
        client_id = CLIENT_ID_PROD
        client_secret = CLIENT_SECRET_PROD
    else:
        client_id = CLIENT_ID_HOMOLOG
        client_secret = CLIENT_SECRET_HOMOLOG

    if not client_id or not client_secret:
        raise RuntimeError(
            f"Credenciais MobileMed nao configuradas para o ambiente {ambiente}."
        )

    resposta = requests.post(
        f"{_base_url(ambiente)}/authenticate",
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=90,
    )
    resposta.raise_for_status()
    return resposta.json()["access_token"]


def _require_super_admin():
    from ..models.usuario import Usuario

    api_token = request.headers.get("X-API-Token") or request.args.get("token")
    if not api_token:
        return None, (jsonify({"error": "Nao autenticado"}), 401)

    user = Usuario.query.filter_by(api_token=api_token).first()
    if not user or user.role != "super_admin":
        return None, (jsonify({"error": "Apenas Super Admin"}), 403)
    return user, None


def _log_safe(**kwargs) -> None:
    try:
        create_log(**kwargs)
    except Exception:  # noqa: BLE001
        pass


def _enviar_para_mobilemed(app, relatorio_id: int, ambiente: str, payload: dict) -> None:
    """Envia a solicitacao em thread para nao bloquear o Flask."""
    with app.app_context():
        relatorio = db.session.get(MobilemedRelatorio, relatorio_id)
        if not relatorio or relatorio.status == "concluido":
            return

        try:
            print(f"[MOBILEMED] Autenticando relatorio_id={relatorio_id}")
            token = _get_token(ambiente)
            resposta = requests.post(
                f"{_base_url(ambiente)}/request-report",
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=(10, 240),
            )

            try:
                dados = resposta.json()
            except ValueError:
                dados = {"raw": resposta.text[:1000]}

            print(
                f"[MOBILEMED] Resposta {resposta.status_code}: "
                f"{json.dumps(dados, ensure_ascii=False)[:300]}"
            )

            if resposta.status_code in (200, 201, 202):
                relatorio.request_id = dados.get("requestId") or dados.get("request_id")
                relatorio.status = "processando"
                relatorio.erro_msg = None
            else:
                relatorio.status = "erro"
                relatorio.erro_msg = json.dumps(dados, ensure_ascii=False)

            db.session.commit()

        except Exception as erro:  # noqa: BLE001
            db.session.rollback()
            relatorio = db.session.get(MobilemedRelatorio, relatorio_id)
            if relatorio:
                relatorio.status = "erro"
                relatorio.erro_msg = str(erro)
                db.session.commit()
            print(f"[MOBILEMED] Erro em background: {erro}")


@mobilemed_bp.route("/campos", methods=["GET"])
def listar_campos():
    _, err = _require_super_admin()
    if err:
        return err
    return jsonify(CAMPOS_DISPONIVEIS)


@mobilemed_bp.route("/unidades", methods=["GET"])
def listar_unidades():
    _, err = _require_super_admin()
    if err:
        return err

    try:
        ambiente = request.args.get("ambiente", "homolog")
        token = _get_token(ambiente)
        resposta = requests.get(
            f"{_base_url(ambiente)}/reports/debug/unity",
            headers={"Authorization": f"Bearer {token}"},
            timeout=90,
        )
        return jsonify(resposta.json()), resposta.status_code
    except Exception as erro:  # noqa: BLE001
        return jsonify({"error": str(erro)}), 500


@mobilemed_bp.route("/solicitar", methods=["POST"])
def solicitar_relatorio():
    user, err = _require_super_admin()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    ambiente = data.get("ambiente", "homolog")
    nome = (data.get("nome") or "").strip() or (
        f"Relatorio {datetime.now().strftime('%d/%m/%Y %H:%M')}"
    )
    filtros = data.get("filtros", [])
    unidades = data.get("unidades", [])
    requested_webhook_url = (data.get("webhook_url") or "").strip()
    # O backend e a fonte de verdade. Isso impede que um frontend aberto via
    # HTTP envie window.location.origin e seja rejeitado pela MobileMed.
    webhook_url = MOBILEMED_WEBHOOK_URL or requested_webhook_url

    try:
        campos = normalize_selected_fields(
            data.get("campos", []),
            nome,
            CAMPOS_DISPONIVEIS,
        )
    except ValueError as erro:
        return jsonify({"error": str(erro)}), 400

    if not campos:
        return jsonify({"error": "Selecione pelo menos um campo"}), 400
    if not webhook_url:
        return jsonify({"error": "Informe a URL do webhook"}), 400
    if not webhook_url.lower().startswith("https://"):
        return jsonify({
            "error": "webhook_url deve usar HTTPS",
            "webhook_url_recebida": webhook_url,
        }), 400
    if ambiente not in ("homolog", "prod"):
        return jsonify({"error": "Ambiente invalido"}), 400

    relatorio = MobilemedRelatorio(
        nome=nome,
        status="aguardando",
        campos=json.dumps(campos),
        filtros=json.dumps(filtros),
        unidades=json.dumps(unidades),
        data_inicio=data.get("data_inicio"),
        data_fim=data.get("data_fim"),
        solicitado_por=user.username,
    )
    db.session.add(relatorio)
    db.session.commit()

    _log_safe(
        user=user,
        action="mobilemed_request_report",
        entity="mobilemed_relatorio",
        entity_id=relatorio.id,
        details={
            "ambiente": ambiente,
            "nome": nome,
            "campos_count": len(campos),
            "filtros_count": len(filtros) if isinstance(filtros, list) else None,
            "unidades_count": len(unidades) if isinstance(unidades, list) else None,
            "webhook_url": webhook_url,
            "webhook_url_solicitada": requested_webhook_url,
            "is_bi": is_bi_name(nome),
        },
        req=request,
    )

    payload = {
        "nome": nome,
        "email": user.email or "ti@digimaxdiagnostico.com.br",
        "campos": campos,
        "webhook": {
            "url": webhook_url,
            "metodo": "POST",
            "perfil": "SLOW",
            "headers": {
                "X-Vimax-Relatorio-Id": str(relatorio.id),
                "Content-Type": "application/json",
            },
        },
    }
    if filtros:
        payload["filtros"] = filtros
    if unidades:
        payload["unidades"] = unidades

    app = current_app._get_current_object()
    thread = threading.Thread(
        target=_enviar_para_mobilemed,
        args=(app, relatorio.id, ambiente, payload),
        daemon=True,
    )
    thread.start()

    return jsonify({
        "success": True,
        "relatorio_id": relatorio.id,
        "request_id": None,
        "message": "Relatorio em fila. O processamento continuara em background.",
        "campos": campos,
        "is_bi": is_bi_name(nome),
    }), 202


@mobilemed_bp.route(
    "/webhook",
    methods=["GET", "POST", "PUT", "PATCH", "HEAD", "OPTIONS"],
)
def webhook_receiver():
    # Alguns provedores validam o webhook primeiro com GET ou HEAD.
    # Esses testes devem responder 200 sem tentar processar um relatorio.
    if request.method == "OPTIONS":
        return "", 204

    if request.method in ("GET", "HEAD"):
        return jsonify({
            "ok": True,
            "service": "mobilemed_webhook",
            "message": "webhook disponivel",
        }), 200

    try:
        payload = request.get_json(force=True, silent=True) or {}
        print(
            "[MOBILEMED WEBHOOK] Recebido: "
            f"{json.dumps(payload, ensure_ascii=False)[:500]}"
        )

        relatorio_id = request.headers.get("X-Vimax-Relatorio-Id")
        request_id = payload.get("requestId") or payload.get("request_id")

        relatorio = None
        if relatorio_id:
            try:
                relatorio = db.session.get(MobilemedRelatorio, int(relatorio_id))
            except (TypeError, ValueError):
                relatorio = None
        if not relatorio and request_id:
            relatorio = MobilemedRelatorio.query.filter_by(request_id=request_id).first()

        if not relatorio:
            print(f"[MOBILEMED WEBHOOK] Relatorio nao encontrado: {request_id}")
            return jsonify({"ok": True, "warning": "relatorio nao encontrado"}), 200

        if request_id and not relatorio.request_id:
            relatorio.request_id = request_id
        relatorio.webhook_payload = json.dumps(payload, ensure_ascii=False)
        relatorio.concluido_em = datetime.utcnow()

        csv_url = (
            payload.get("downloadUrl")
            or payload.get("csvUrl")
            or payload.get("csv_url")
            or payload.get("s3Url")
            or payload.get("url")
        )
        csv_inline = (
            payload.get("csv")
            or payload.get("csvData")
            or payload.get("csv_data")
            or payload.get("content")
        )
        status = str(payload.get("status") or "").lower()
        erro_msg = None
        if "erro" in status or "error" in status or "fail" in status:
            erro_msg = payload.get("error") or payload.get("message") or status

        if csv_url:
            relatorio.csv_url = str(csv_url)
            relatorio.status = "concluido"
            relatorio.erro_msg = None
        elif isinstance(csv_inline, str) and csv_inline.strip():
            relatorio.csv_dados = csv_inline
            relatorio.status = "concluido"
            relatorio.erro_msg = None
        elif erro_msg:
            relatorio.status = "erro"
            relatorio.erro_msg = str(erro_msg)
        else:
            relatorio.status = "concluido"
            relatorio.csv_dados = json.dumps(payload, ensure_ascii=False)

        total = (
            payload.get("rowCount")
            or payload.get("totalRecords")
            or payload.get("total_records")
            or payload.get("total")
        )
        if total is not None:
            try:
                relatorio.total_registros = int(total)
            except (TypeError, ValueError):
                pass

        db.session.commit()

        _log_safe(
            user=None,
            action="mobilemed_webhook_received",
            entity="mobilemed_relatorio",
            entity_id=relatorio.id,
            details={
                "request_id": request_id,
                "status": status,
                "total": relatorio.total_registros,
                "has_csv_url": bool(csv_url),
                "has_csv_inline": bool(csv_inline),
                "is_bi": is_bi_name(relatorio.nome),
            },
            req=request,
        )

        # Faz o cache e atualiza o consolidado sem transformar uma falha de XLSX
        # em falha do webhook. O usuario ainda pode tentar pelo botao de download.
        try:
            if relatorio.status == "concluido":
                cache_report_csv(relatorio)
                if is_bi_name(relatorio.nome):
                    regenerate_bi_xlsx()
        except Exception as erro_cache:  # noqa: BLE001
            print(f"[MOBILEMED WEBHOOK] Falha no cache/consolidado: {erro_cache}")

        print(
            f"[MOBILEMED WEBHOOK] Relatorio {relatorio.id} atualizado: "
            f"{relatorio.status}"
        )
        return jsonify({"ok": True}), 200

    except Exception as erro:  # noqa: BLE001
        db.session.rollback()
        print(f"[MOBILEMED WEBHOOK] Erro: {erro}")
        return jsonify({"ok": False, "error": str(erro)}), 500


@mobilemed_bp.route("/relatorios", methods=["GET"])
def listar_relatorios():
    _, err = _require_super_admin()
    if err:
        return err

    relatorios = (
        MobilemedRelatorio.query
        .order_by(MobilemedRelatorio.solicitado_em.desc())
        .all()
    )
    return jsonify([relatorio.to_dict() for relatorio in relatorios])


@mobilemed_bp.route("/relatorios/<int:relatorio_id>", methods=["GET"])
def get_relatorio(relatorio_id: int):
    user, err = _require_super_admin()
    if err:
        return err

    relatorio = MobilemedRelatorio.query.get_or_404(relatorio_id)
    _log_safe(
        user=user,
        action="mobilemed_check_status",
        entity="mobilemed_relatorio",
        entity_id=relatorio_id,
        details={"request_id": relatorio.request_id},
        req=request,
    )

    dados = relatorio.to_dict()
    try:
        dados["webhook_payload"] = (
            json.loads(relatorio.webhook_payload)
            if relatorio.webhook_payload else None
        )
    except json.JSONDecodeError:
        dados["webhook_payload"] = relatorio.webhook_payload
    return jsonify(dados)


@mobilemed_bp.route("/relatorios/<int:relatorio_id>/xlsx", methods=["GET"])
def baixar_relatorio_xlsx(relatorio_id: int):
    user, err = _require_super_admin()
    if err:
        return err

    relatorio = MobilemedRelatorio.query.get_or_404(relatorio_id)
    if relatorio.status != "concluido" and not relatorio.csv_url:
        return jsonify({"error": "O relatorio ainda nao esta concluido."}), 409

    try:
        arquivo = build_report_xlsx(relatorio)
        nome_arquivo = f"{safe_filename(relatorio.nome)}.xlsx"
        _log_safe(
            user=user,
            action="mobilemed_download_xlsx",
            entity="mobilemed_relatorio",
            entity_id=relatorio.id,
            details={"filename": nome_arquivo},
            req=request,
        )
        return send_file(
            arquivo,
            as_attachment=True,
            download_name=nome_arquivo,
            mimetype=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
        )
    except Exception as erro:  # noqa: BLE001
        return jsonify({"error": f"Nao foi possivel gerar o XLSX: {erro}"}), 500


@mobilemed_bp.route("/bi/consolidado.xlsx", methods=["GET"])
def baixar_bi_consolidado():
    user, err = _require_super_admin()
    if err:
        return err

    try:
        caminho = regenerate_bi_xlsx()
        _log_safe(
            user=user,
            action="mobilemed_download_bi_consolidado",
            entity="mobilemed_relatorio",
            entity_id=None,
            details={"filename": caminho.name},
            req=request,
        )
        return send_file(
            caminho,
            as_attachment=True,
            download_name="BI_MobileMed_Consolidado.xlsx",
            mimetype=(
                "application/vnd.openxmlformats-officedocument."
                "spreadsheetml.sheet"
            ),
        )
    except ValueError as erro:
        return jsonify({"error": str(erro)}), 404
    except Exception as erro:  # noqa: BLE001
        return jsonify({
            "error": f"Nao foi possivel gerar o BI consolidado: {erro}"
        }), 500


@mobilemed_bp.route("/relatorios/<int:relatorio_id>", methods=["DELETE"])
def deletar_relatorio(relatorio_id: int):
    user, err = _require_super_admin()
    if err:
        return err

    relatorio = MobilemedRelatorio.query.get_or_404(relatorio_id)
    try:
        snapshot = relatorio.to_dict()
    except Exception:  # noqa: BLE001
        snapshot = None

    db.session.delete(relatorio)
    db.session.commit()
    _log_safe(
        user=user,
        action="mobilemed_delete_relatorio",
        entity="mobilemed_relatorio",
        entity_id=relatorio_id,
        details={"deleted": snapshot},
        req=request,
    )
    return jsonify({"ok": True})


@mobilemed_bp.route("/relatorios/<int:relatorio_id>/verificar", methods=["POST"])
def verificar_status(relatorio_id: int):
    user, err = _require_super_admin()
    if err:
        return err

    relatorio = MobilemedRelatorio.query.get_or_404(relatorio_id)
    if not relatorio.request_id:
        return jsonify({
            "error": "Sem request_id. A solicitacao ainda pode estar em processamento."
        }), 400

    _log_safe(
        user=user,
        action="mobilemed_check_status",
        entity="mobilemed_relatorio",
        entity_id=relatorio_id,
        details={"request_id": relatorio.request_id},
        req=request,
    )

    # Mantem a compatibilidade da v8.5. Primeiro tenta homologacao e, se a API
    # responder 404, tenta producao.
    ultimo_erro = None
    for ambiente in ("homolog", "prod"):
        try:
            token = _get_token(ambiente)
            resposta = requests.get(
                f"{_base_url(ambiente)}/reports/{relatorio.request_id}/status",
                headers={"Authorization": f"Bearer {token}"},
                timeout=90,
            )
            if resposta.status_code != 404:
                return jsonify(resposta.json()), resposta.status_code
        except Exception as erro:  # noqa: BLE001
            ultimo_erro = erro

    return jsonify({
        "error": str(ultimo_erro or "Relatorio nao encontrado na MobileMed")
    }), 500
