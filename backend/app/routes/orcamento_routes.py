from flask import Blueprint, request, jsonify, current_app
from ..models.orcamento import Orcamento, Anexo
from ..models.localizacao import Localizacao
from ..models.usuario import Usuario
from ..utils.filters import apply_entity_filter
from .. import db
from ..utils.logging import create_log
from datetime import datetime
import traceback
from ..utils.auth import get_current_user_from_request

orcamento_bp = Blueprint('orcamento_bp', __name__)

def parse_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None

def to_int(value):
    try:
        return int(value) if value is not None and value != '' else None
    except Exception:
        return None

def to_float(value):
    try:
        return float(value) if value is not None and value != '' else None
    except Exception:
        return None

@orcamento_bp.route('/', methods=['GET'])
def get_orcamentos():
    """
    GET /api/orcamentos/
    Query params: empresa_id, localizacao_id (opcional)
    """
    empresa_id = request.args.get('empresa_id')
    localizacao_id = request.args.get('localizacao_id')
    api_token = request.headers.get('X-API-Token')
    
    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
    
    query = Orcamento.query
    query = apply_entity_filter(query, Orcamento, empresa_id, user)
    
    if localizacao_id:
        try:
            query = query.filter(Orcamento.localizacao_id == int(localizacao_id))
        except ValueError:
            pass

    orcamentos = query.all()
    return jsonify([o.to_dict() for o in orcamentos])

@orcamento_bp.route('/localizacoes_por_empresa/<int:empresa_id>', methods=['GET'])
def get_localizacoes_por_empresa(empresa_id):
    localizacoes = Localizacao.query.filter_by(empresa_id=empresa_id).all()
    return jsonify([l.to_dict() for l in localizacoes])

@orcamento_bp.route('/', methods=['POST'])
def create_orcamento():
    try:
        raw = request.get_data(as_text=True)
        current_app.logger.debug("RAW request body: %s", raw)
        data = request.get_json() or {}
        current_app.logger.debug("Parsed JSON payload: %s", data)
    except Exception as e:
        current_app.logger.exception("Erro ao ler request body")
        data = {}

    # Validação mínima - aceita tanto 'numero' quanto 'titulo'
    numero_campo = data.get('numero') or data.get('titulo')
    if not numero_campo or not data.get('empresa_id'):
        return jsonify({"error": "Número e Empresa são obrigatórios", "received": data}), 400

    try:
        novo_orcamento = Orcamento(
            numero = numero_campo,
            descricao = data.get('descricao'),
            data_inicial = parse_datetime(data.get('data_inicial') or data.get('data_emissao')),
            data_final = parse_datetime(data.get('data_final')),
            valor = to_float(data.get('valor') or data.get('valor_total')),
            data_validade = parse_datetime(data.get('data_validade')),
            status = data.get('status', 'Pendente'),
            empresa_id = to_int(data.get('empresa_id')),
            localizacao_id = to_int(data.get('localizacao_id')),
            fornecedor_id = to_int(data.get('fornecedor_id'))
        )

        anexos_data = data.get('anexos', [])
        for anexo_data in anexos_data:
            # Aceita tanto 'nome'/'caminho' quanto 'name'/'path'
            nome = anexo_data.get('nome') or anexo_data.get('name') or anexo_data.get('filename')
            caminho = anexo_data.get('caminho') or anexo_data.get('path') or anexo_data.get('url')
            if nome and caminho:
                anexo = Anexo(nome=nome, caminho=caminho)
                novo_orcamento.anexos.append(anexo)

        db.session.add(novo_orcamento)
        db.session.commit()
        current_app.logger.debug("Orcamento criado id: %s", novo_orcamento.id)
        return jsonify(novo_orcamento.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro ao criar orçamento")
        traceback.print_exc()
        return jsonify({"error": "Erro ao criar orçamento", "details": str(e)}), 500

@orcamento_bp.route('/<int:id>', methods=['PUT'])
def update_orcamento(id):
    user = get_current_user_from_request(request)
    orcamento = Orcamento.query.get_or_404(id)

    before = None
    try:
        before = orcamento.to_dict()
    except Exception:
        before = None
    data = request.get_json() or {}
    try:
        # Aceita tanto 'numero' quanto 'titulo'
        if 'numero' in data or 'titulo' in data:
            orcamento.numero = data.get('numero') or data.get('titulo')
        if 'descricao' in data:
            orcamento.descricao = data.get('descricao')
        # Aceita tanto 'valor' quanto 'valor_total'
        if 'valor' in data or 'valor_total' in data:
            orcamento.valor = to_float(data.get('valor') or data.get('valor_total'))
        if 'data_inicial' in data or 'data_emissao' in data:
            orcamento.data_inicial = parse_datetime(data.get('data_inicial') or data.get('data_emissao'))
        if 'data_final' in data:
            orcamento.data_final = parse_datetime(data.get('data_final'))
        if 'data_validade' in data:
            orcamento.data_validade = parse_datetime(data.get('data_validade'))
        if 'status' in data:
            orcamento.status = data.get('status')
        if 'empresa_id' in data:
            orcamento.empresa_id = to_int(data.get('empresa_id'))
        if 'localizacao_id' in data:
            orcamento.localizacao_id = to_int(data.get('localizacao_id'))
        if 'fornecedor_id' in data:
            orcamento.fornecedor_id = to_int(data.get('fornecedor_id'))

        # Atualizar anexos (remove todos e adiciona de novo)
        Anexo.query.filter_by(orcamento_id=orcamento.id).delete()
        anexos_data = data.get('anexos', [])
        for anexo_data in anexos_data:
            # Aceita tanto 'nome'/'caminho' quanto 'name'/'path'
            nome = anexo_data.get('nome') or anexo_data.get('name') or anexo_data.get('filename')
            caminho = anexo_data.get('caminho') or anexo_data.get('path') or anexo_data.get('url')
            if nome and caminho:
                anexo = Anexo(nome=nome, caminho=caminho)
                orcamento.anexos.append(anexo)

        db.session.commit()

        try:
            create_log(user=user, action='update_orcamento', entity='orcamento', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(orcamento.to_dict())
    except Exception as e:
        db.session.rollback()
        current_app.logger.exception("Erro ao atualizar orçamento")
        traceback.print_exc()
        return jsonify({"error": "Erro ao atualizar orçamento", "details": str(e)}), 500

@orcamento_bp.route('/<int:id>', methods=['DELETE'])
def delete_orcamento(id):
    user = get_current_user_from_request(request)
    orcamento = Orcamento.query.get_or_404(id)

    snapshot = None
    try:
        snapshot = orcamento.to_dict()
    except Exception:
        snapshot = None
    db.session.delete(orcamento)
    db.session.commit()

    try:
        create_log(user=user, action='delete_orcamento', entity='orcamento', entity_id=id,
                   details={'deleted': snapshot}, req=request)
    except Exception:
        pass
    return '', 204
