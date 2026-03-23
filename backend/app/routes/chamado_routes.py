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

@chamado_bp.route('', methods=['GET'])
def list_chamados():
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
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    try:
        criticidade = data.get('criticidade_informada')
        
        # Processar opcoes_selecionadas
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
            categoria_id = safe_int(data.get('categoria_id')),
            ativo_id = safe_int(data.get('ativo_id')),
            infraestrutura_id = safe_int(data.get('infraestrutura_id')),
            fornecedor_id = safe_int(data.get('fornecedor_id')),
            contrato_id = safe_int(data.get('contrato_id')),
            orcamento_id = safe_int(data.get('orcamento_id')),
            opcoes_selecionadas = opcoes_json,
            anexos = json.dumps(data.get('anexos')) if data.get('anexos') is not None else None,
            data_abertura = datetime.utcnow(),
            ativo = True,
            deleted_at = None
        )
        
        # Lógica automática de data de solução na criação
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
    c = Chamado.query.get_or_404(id)
    return jsonify(c.to_dict()), 200

@chamado_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_chamado(id):
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

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
        
        if 'opcoes_selecionadas' in data:
            opcoes = data.get('opcoes_selecionadas')
            c.opcoes_selecionadas = json.dumps(opcoes) if opcoes is not None else None
        
        if 'anexos' in data:
            c.anexos = json.dumps(data.get('anexos')) if data.get('anexos') is not None else None
        
        # Lógica AUTOMÁTICA de data de solução
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
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None
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
