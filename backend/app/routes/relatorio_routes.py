from flask import Blueprint, jsonify, request
from sqlalchemy import func, extract
from datetime import datetime, timedelta

from .. import db
from ..models.chamado import Chamado
from ..models.contrato import Contrato
from ..models.orcamento import Orcamento
from ..models.ativo import Ativo
from ..models.empresa import Empresa
from ..models.usuario import Usuario
from ..utils.filters import apply_entity_filter, get_all_sub_company_ids

relatorio_bp = Blueprint('relatorio_bp', __name__)

# =========================
# UTIL
# =========================
def get_user_from_request():
    api_token = request.headers.get('X-API-Token')
    if api_token:
        return Usuario.query.filter_by(api_token=api_token).first()
    return None


# =========================
# DASHBOARD
# =========================
@relatorio_bp.route('/dashboard', methods=['GET'])
def get_dashboard_stats():
    user = get_user_from_request()
    empresa_id = request.args.get('empresa_id')

    q_chamados = apply_entity_filter(Chamado.query, Chamado, empresa_id, user)
    q_contratos = apply_entity_filter(Contrato.query, Contrato, empresa_id, user)
    q_orcamentos = apply_entity_filter(Orcamento.query, Orcamento, empresa_id, user)
    q_ativos = apply_entity_filter(Ativo.query, Ativo, empresa_id, user)

    hoje = datetime.now()

    stats = {
        'total_chamados': q_chamados.count(),
        'chamados_abertos': q_chamados.filter(Chamado.status == 'Aberto').count(),
        'total_contratos': q_contratos.count(),
        'total_orcamentos': q_orcamentos.count(),
        'total_ativos': q_ativos.count(),
        'custo_total': (
            db.session.query(func.sum(Chamado.valor_total))
            .select_from(q_chamados.subquery())
            .scalar() or 0
        ),
        'contratos_a_vencer': q_contratos.filter(
            Contrato.data_fim >= hoje,
            Contrato.data_fim <= hoje + timedelta(days=30)
        ).count(),
        'ativos_sem_contrato': q_ativos.count()  # ainda não há vínculo ativo x contrato
    }

    tendencia = (
        db.session.query(
            extract('month', Chamado.data_abertura).label('mes'),
            func.count(Chamado.id).label('total')
        )
        .select_from(q_chamados.subquery())
        .group_by('mes')
        .order_by('mes')
        .all()
    )

    stats['tendencia_mensal'] = [
        {'mes': int(t.mes), 'total': t.total} for t in tendencia
    ]

    return jsonify(stats)


# =========================
# RELATÓRIO GERAL
# =========================
@relatorio_bp.route('/geral', methods=['GET'])
def get_relatorios_gerais():
    user = get_user_from_request()
    empresa_id = request.args.get('empresa_id')
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')

    # -------------------------
    # EMPRESAS
    # -------------------------
    q_emp = Empresa.query
    if user and user.role != 'super_admin' and user.empresa_id:
        allowed_ids = get_all_sub_company_ids(user.empresa_id)
        q_emp = q_emp.filter(Empresa.id.in_(allowed_ids))

    empresas_data = []
    for emp in q_emp.all():
        q_ch = Chamado.query.filter(Chamado.empresa_id == emp.id)

        if data_inicio:
            q_ch = q_ch.filter(Chamado.data_abertura >= data_inicio)
        if data_fim:
            q_ch = q_ch.filter(Chamado.data_abertura <= data_fim)

        empresas_data.append({
            'id': emp.id,
            'nome': emp.nome,
            'total_chamados': q_ch.count(),
            'total_gasto': (
                db.session.query(func.sum(Chamado.valor_total))
                .filter(Chamado.empresa_id == emp.id)
                .scalar() or 0
            ),
            'total_ativos': Ativo.query.filter_by(empresa_id=emp.id).count()
        })

    # -------------------------
    # ATIVOS
    # -------------------------
    q_at = apply_entity_filter(Ativo.query, Ativo, empresa_id, user)

    ativos_data = []
    for at in q_at.all():
        q_ch_at = Chamado.query.filter(Chamado.ativo_id == at.id)

        if data_inicio:
            q_ch_at = q_ch_at.filter(Chamado.data_abertura >= data_inicio)
        if data_fim:
            q_ch_at = q_ch_at.filter(Chamado.data_abertura <= data_fim)

        ativos_data.append({
            'id': at.id,
            'nome': at.nome,
            'tag': at.tag,
            'total_chamados': q_ch_at.count(),
            'total_gasto': (
                db.session.query(func.sum(Chamado.valor_total))
                .filter(Chamado.ativo_id == at.id)
                .scalar() or 0
            ),
            'tem_contrato': False  # ainda não existe vínculo contrato x ativo
        })

    # -------------------------
    # CHAMADOS (STATUS)
    # -------------------------
    q_ch = apply_entity_filter(Chamado.query, Chamado, empresa_id, user)

    if data_inicio:
        q_ch = q_ch.filter(Chamado.data_abertura >= data_inicio)
    if data_fim:
        q_ch = q_ch.filter(Chamado.data_abertura <= data_fim)

    status_count = (
        db.session.query(Chamado.status, func.count(Chamado.id))
        .select_from(q_ch.subquery())
        .group_by(Chamado.status)
        .all()
    )

    # -------------------------
    # CONTRATOS
    # -------------------------
    q_con = apply_entity_filter(Contrato.query, Contrato, empresa_id, user)
    hoje = datetime.now()

    contratos_stats = {
        'ativos': q_con.filter(Contrato.data_fim >= hoje).count(),
        'vencidos': q_con.filter(Contrato.data_fim < hoje).count(),
        'a_vencer_30': q_con.filter(
            Contrato.data_fim <= hoje + timedelta(days=30),
            Contrato.data_fim >= hoje
        ).count(),
        'a_vencer_60': q_con.filter(
            Contrato.data_fim <= hoje + timedelta(days=60),
            Contrato.data_fim >= hoje
        ).count(),
    }

    # -------------------------
    # FINANCEIRO
    # -------------------------
    resumo_financeiro = {
        'total_gasto': (
            db.session.query(func.sum(Chamado.valor_total))
            .select_from(q_ch.subquery())
            .scalar() or 0
        ),
        'media_por_chamado': (
            db.session.query(func.avg(Chamado.valor_total))
            .select_from(q_ch.subquery())
            .scalar() or 0
        )
    }

    return jsonify({
        'empresas': sorted(empresas_data, key=lambda x: x['total_chamados'], reverse=True),
        'ativos': sorted(ativos_data, key=lambda x: x['total_chamados'], reverse=True),
        'chamados_status': {s: c for s, c in status_count},
        'contratos': contratos_stats,
        'resumo_financeiro': resumo_financeiro
    })
