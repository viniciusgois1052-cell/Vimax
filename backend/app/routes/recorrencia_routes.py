from flask import Blueprint, request, jsonify
from ..models.chamado_recorrencia import ChamadoRecorrencia
from ..models.chamado import Chamado
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log
from datetime import datetime, timedelta
import json
from ..utils.auth import get_current_user_from_request

recorrencia_bp = Blueprint('recorrencia_bp', __name__)

def get_current_user():
    token = request.headers.get('X-API-Token')
    if token:
        return Usuario.query.filter_by(api_token=token).first()
    return None

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None

FREQ_LABELS = {
    'diario': 'Diário', 'semanal': 'Semanal', 'quinzenal': 'Quinzenal',
    'mensal': 'Mensal', 'bimestral': 'Bimestral', 'trimestral': 'Trimestral',
    'semestral': 'Semestral', 'anual': 'Anual'
}

def calcular_proxima(recorrencia, a_partir=None):
    """Calcula a próxima execução baseada na frequência."""
    agora = a_partir or datetime.utcnow()
    freq = recorrencia.frequencia
    hora = recorrencia.hora or 8
    minuto = recorrencia.minuto or 0

    if freq == 'diario':
        proxima = agora.replace(hour=hora, minute=minuto, second=0, microsecond=0) + timedelta(days=1)

    elif freq in ('semanal', 'quinzenal'):
        dia_alvo = recorrencia.dia_semana or 0  # 0=seg
        dias_add = (dia_alvo - agora.weekday()) % 7
        if dias_add == 0: dias_add = 7
        proxima = (agora + timedelta(days=dias_add)).replace(hour=hora, minute=minuto, second=0, microsecond=0)
        if freq == 'quinzenal':
            proxima = proxima + timedelta(weeks=1) if dias_add <= 7 else proxima

    elif freq in ('mensal', 'bimestral', 'trimestral', 'semestral', 'anual'):
        meses = {'mensal': 1, 'bimestral': 2, 'trimestral': 3, 'semestral': 6, 'anual': 12}[freq]
        dia = recorrencia.dia_mes or 1
        mes = agora.month + meses
        ano = agora.year + (mes - 1) // 12
        mes = ((mes - 1) % 12) + 1
        import calendar
        ultimo_dia = calendar.monthrange(ano, mes)[1]
        dia = min(dia, ultimo_dia)
        proxima = datetime(ano, mes, dia, hora, minuto, 0)
    else:
        proxima = agora + timedelta(days=1)

    return proxima


@recorrencia_bp.route('', methods=['GET'])
def list_recorrencias():
    user = get_current_user()
    empresa_id = request.args.get('empresa_id')
    query = ChamadoRecorrencia.query
    if empresa_id:
        query = query.filter_by(empresa_id=int(empresa_id))
    itens = query.order_by(ChamadoRecorrencia.created_at.desc()).all()
    return jsonify([r.to_dict() for r in itens]), 200


@recorrencia_bp.route('', methods=['POST'])
def create_recorrencia():
    user = get_current_user()
    data = request.get_json() or {}

    data_inicio_str = data.get('data_inicio')
    data_inicio = datetime.fromisoformat(data_inicio_str.replace('Z','')) if data_inicio_str else datetime.utcnow()
    data_fim_str = data.get('data_fim')
    data_fim = datetime.fromisoformat(data_fim_str.replace('Z','')) if data_fim_str else None

    rec = ChamadoRecorrencia(
        titulo=data.get('titulo', 'Chamado Recorrente'),
        descricao=data.get('descricao'),
        tipo=data.get('tipo', 'maquinario'),
        criticidade_real=data.get('criticidade_real', 'Média'),
        empresa_id=safe_int(data.get('empresa_id')),
        localizacao_id=safe_int(data.get('localizacao_id')),
        ativo_id=safe_int(data.get('ativo_id')),
        infraestrutura_id=safe_int(data.get('infraestrutura_id')),
        fornecedor_id=safe_int(data.get('fornecedor_id')),
        contrato_id=safe_int(data.get('contrato_id')),
        orcamento_id=safe_int(data.get('orcamento_id')),
        categoria_id=safe_int(data.get('categoria_id')),
        frequencia=data.get('frequencia', 'mensal'),
        dia_semana=safe_int(data.get('dia_semana')),
        dia_mes=safe_int(data.get('dia_mes')) or 1,
        hora=safe_int(data.get('hora')) or 8,
        minuto=safe_int(data.get('minuto')) or 0,
        ativo=True,
        data_inicio=data_inicio,
        data_fim=data_fim,
        criado_por_id=user.id if user else None,
        total_gerado=0
    )
    rec.proxima_execucao = calcular_proxima(rec, data_inicio)
    db.session.add(rec)
    db.session.commit()
    return jsonify(rec.to_dict()), 201


@recorrencia_bp.route('/<int:rec_id>', methods=['PUT'])
def update_recorrencia(rec_id):
    user = get_current_user_from_request(request)
    rec = ChamadoRecorrencia.query.get_or_404(rec_id)

    before = None
    try:
        before = rec.to_dict()
    except Exception:
        before = None
    data = request.get_json() or {}
    for campo in ['titulo','descricao','tipo','criticidade_real','frequencia','dia_semana','dia_mes','hora','minuto']:
        if campo in data:
            setattr(rec, campo, data[campo] if campo not in ['dia_semana','dia_mes','hora','minuto'] else safe_int(data[campo]))
    for campo in ['empresa_id','localizacao_id','ativo_id','infraestrutura_id','fornecedor_id','contrato_id','orcamento_id','categoria_id']:
        if campo in data: setattr(rec, campo, safe_int(data[campo]))
    if 'ativo' in data: rec.ativo = bool(data['ativo'])
    if 'data_fim' in data:
        rec.data_fim = datetime.fromisoformat(data['data_fim'].replace('Z','')) if data['data_fim'] else None
    rec.proxima_execucao = calcular_proxima(rec)
    db.session.commit()

    try:
        create_log(user=user, action='update_recorrencia', entity='recorrencia', entity_id=id,
                   details={'before': before, 'after_payload': data}, req=request)
    except Exception:
        pass
    return jsonify(rec.to_dict()), 200


@recorrencia_bp.route('/<int:rec_id>', methods=['DELETE'])
def delete_recorrencia(rec_id):
    user = get_current_user_from_request(request)
    rec = ChamadoRecorrencia.query.get_or_404(rec_id)

    snapshot = None
    try:
        snapshot = rec.to_dict()
    except Exception:
        snapshot = None
    db.session.delete(rec)
    db.session.commit()

    try:
        create_log(user=user, action='delete_recorrencia', entity='recorrencia', entity_id=id,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass
    return jsonify({'ok': True}), 200


@recorrencia_bp.route('/<int:rec_id>/executar', methods=['POST'])
def executar_agora(rec_id):
    """Força a geração imediata de um chamado a partir da recorrência."""
    rec = ChamadoRecorrencia.query.get_or_404(rec_id)
    chamado = _gerar_chamado(rec)
    return jsonify({'ok': True, 'chamado_id': chamado.id}), 201


def _gerar_chamado(rec):
    """Cria um chamado baseado no template da recorrência."""
    freq_label = FREQ_LABELS.get(rec.frequencia, rec.frequencia)
    chamado = Chamado(
        titulo=f"[{freq_label}] {rec.titulo}",
        descricao=rec.descricao,
        status='Aberto',
        tipo=rec.tipo,
        criticidade_real=rec.criticidade_real,
        criticidade_informada=rec.criticidade_real,
        empresa_id=rec.empresa_id,
        localizacao_id=rec.localizacao_id,
        ativo_id=rec.ativo_id,
        infraestrutura_id=rec.infraestrutura_id,
        fornecedor_id=rec.fornecedor_id,
        contrato_id=rec.contrato_id,
        orcamento_id=rec.orcamento_id,
        categoria_id=rec.categoria_id,
        data_abertura=datetime.utcnow(),
        ativo=True
    )
    db.session.add(chamado)
    rec.ultima_execucao = datetime.utcnow()
    rec.total_gerado = (rec.total_gerado or 0) + 1
    rec.proxima_execucao = calcular_proxima(rec)
    db.session.commit()
    return chamado


@recorrencia_bp.route('/processar', methods=['POST'])
def processar_recorrencias():
    """
    Endpoint chamado pelo cron/scheduler para gerar chamados vencidos.
    Protegido por token interno.
    """
    import os
    import secrets

    token_recebido = request.headers.get(
        'X-Cron-Token',
        ''
    )
    token_configurado = os.environ.get(
        'CRON_TOKEN',
        ''
    )

    if (
        not token_configurado
        or not token_recebido
        or not secrets.compare_digest(
            token_recebido,
            token_configurado
        )
    ):
        return jsonify({
            'error': 'Token de cron inválido'
        }), 403

    agora = datetime.utcnow()
    pendentes = ChamadoRecorrencia.query.filter(
        ChamadoRecorrencia.ativo == True,
        ChamadoRecorrencia.proxima_execucao <= agora
    ).all()

    gerados = []
    for rec in pendentes:
        if rec.data_fim and agora > rec.data_fim:
            rec.ativo = False
            db.session.commit()
            continue
        c = _gerar_chamado(rec)
        gerados.append({'recorrencia_id': rec.id, 'chamado_id': c.id})

    return jsonify({'processados': len(gerados), 'detalhes': gerados}), 200
