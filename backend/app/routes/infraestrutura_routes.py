# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from ..models.infraestrutura import Infraestrutura
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log
from sqlalchemy import desc
from datetime import datetime
import json
from ..utils.auth import get_current_user_from_request

infraestrutura_bp = Blueprint('infraestrutura_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None

def parse_date(date_str):
    """Parse date string in format YYYY-MM-DD"""
    if not date_str or date_str in ['', 'none', 'undefined']:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        return None

# GET - Listar todas as infraestruturas
@infraestrutura_bp.route('', methods=['GET'])
def list_infraestruturas():
    empresa_id = request.args.get('empresa_id')
    q = (request.args.get('q') or '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))

    query = Infraestrutura.query.filter(Infraestrutura.ativo == True)

    if empresa_id:
        try:
            query = query.filter(Infraestrutura.empresa_id == int(empresa_id))
        except Exception:
            pass

    if q:
        like = f"%{q}%"
        query = query.filter((Infraestrutura.nome.ilike(like)) | (Infraestrutura.descricao.ilike(like)))

    total = query.count()
    itens = query.order_by(desc(Infraestrutura.created_at)).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'total': total,
        'page': page,
        'per_page': per_page,
        'infraestruturas': [i.to_dict() for i in itens]
    }), 200

# GET - Obter infraestrutura por ID
@infraestrutura_bp.route('/<int:id>', methods=['GET'])
def get_infraestrutura(id):
    infra = Infraestrutura.query.get_or_404(id)
    return jsonify(infra.to_dict()), 200

# POST - Criar nova infraestrutura
@infraestrutura_bp.route('', methods=['POST'])
def create_infraestrutura():
    data = request.get_json() or {}
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    try:
        nova_infra = Infraestrutura(
            nome=data.get('nome'),
            descricao=data.get('descricao'),
            tipo_infraestrutura_id=safe_int(data.get('tipo_infraestrutura_id')),
            empresa_id=safe_int(data.get('empresa_id')),
            localizacao_id=safe_int(data.get('localizacao_id')),
            data_instalacao=parse_date(data.get('data_instalacao')),
            data_manutencao=parse_date(data.get('data_manutencao')),
            ativo=data.get('ativo', True),
            anexos=json.dumps(data.get('anexos')) if data.get('anexos') is not None else None
        )
        
        db.session.add(nova_infra)
        db.session.commit()

        try:
            create_log(user=user, action='create_infraestrutura', entity='infraestrutura', entity_id=nova_infra.id,
                       details={'nome': nova_infra.nome, 'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(nova_infra.to_dict()), 201
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

# PUT - Atualizar infraestrutura
@infraestrutura_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_infraestrutura(id):
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    infra = Infraestrutura.query.get_or_404(id)
    data = request.get_json() or {}

    try:
        before = infra.to_dict()

        if 'nome' in data: infra.nome = data.get('nome')
        if 'descricao' in data: infra.descricao = data.get('descricao')
        if 'tipo_infraestrutura_id' in data: infra.tipo_infraestrutura_id = safe_int(data.get('tipo_infraestrutura_id'))
        if 'empresa_id' in data: infra.empresa_id = safe_int(data.get('empresa_id'))
        if 'localizacao_id' in data: infra.localizacao_id = safe_int(data.get('localizacao_id'))
        if 'data_instalacao' in data: infra.data_instalacao = parse_date(data.get('data_instalacao'))
        if 'data_manutencao' in data: infra.data_manutencao = parse_date(data.get('data_manutencao'))
        if 'ativo' in data: infra.ativo = data.get('ativo')
        if 'anexos' in data:
            infra.anexos = json.dumps(data.get('anexos')) if data.get('anexos') is not None else None

        db.session.commit()

        try:
            create_log(user=user, action='update_infraestrutura', entity='infraestrutura', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(infra.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

# DELETE - Deletar infraestrutura (soft delete)
@infraestrutura_bp.route('/<int:id>', methods=['DELETE'])
def delete_infraestrutura(id):
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None
    
    infra = Infraestrutura.query.get_or_404(id)
    
    try:
        snapshot = infra.to_dict()
        infra.ativo = False
        db.session.commit()
        
        try:
            create_log(user=user, action='delete_infraestrutura', entity='infraestrutura', entity_id=id,
                       details={'deleted': snapshot}, req=request)
        except Exception:
            pass
        
        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500
