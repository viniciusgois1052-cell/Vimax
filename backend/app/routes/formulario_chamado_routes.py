# -*- coding: utf-8 -*-
from flask import Blueprint, request, jsonify
from ..models.formulario_chamado import FormularioChamado
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log
from sqlalchemy import desc
import json

formulario_chamado_bp = Blueprint('formulario_chamado_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: return None
    try: return int(val)
    except: return None

# GET - Listar formulários
@formulario_chamado_bp.route('', methods=['GET'])
def list_formularios():
    empresa_id = request.args.get('empresa_id')
    q = (request.args.get('q') or '').strip()

    query = FormularioChamado.query.filter(FormularioChamado.ativo == True)

    if empresa_id:
        try:
            query = query.filter(FormularioChamado.empresa_id == int(empresa_id))
        except Exception:
            pass

    if q:
        like = f"%{q}%"
        query = query.filter(FormularioChamado.nome.ilike(like))

    formularios = query.order_by(desc(FormularioChamado.created_at)).all()

    return jsonify([f.to_dict() for f in formularios]), 200

# GET - Obter formulário por ID
@formulario_chamado_bp.route('/<int:id>', methods=['GET'])
def get_formulario(id):
    form = FormularioChamado.query.get_or_404(id)
    return jsonify(form.to_dict()), 200

# POST - Criar novo formulário
@formulario_chamado_bp.route('', methods=['POST'])
def create_formulario():
    data = request.get_json() or {}
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    try:
        novo_form = FormularioChamado(
            nome=data.get('nome'),
            tipo=data.get('tipo'),  # 'maquinario' ou 'infraestrutura'
            empresa_id=safe_int(data.get('empresa_id')),
            ativo_id=safe_int(data.get('ativo_id')),
            infraestrutura_id=safe_int(data.get('infraestrutura_id')),
            opcoes=json.dumps(data.get('opcoes', [])),
            ativo=data.get('ativo', True)
        )
        
        db.session.add(novo_form)
        db.session.commit()

        try:
            create_log(user=user, action='create_formulario_chamado', entity='formulario_chamado', entity_id=novo_form.id,
                       details={'nome': novo_form.nome, 'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(novo_form.to_dict()), 201
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

# PUT - Atualizar formulário
@formulario_chamado_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_formulario(id):
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None

    form = FormularioChamado.query.get_or_404(id)
    data = request.get_json() or {}

    try:
        before = form.to_dict()

        if 'nome' in data: form.nome = data.get('nome')
        if 'tipo' in data: form.tipo = data.get('tipo')
        if 'empresa_id' in data: form.empresa_id = safe_int(data.get('empresa_id'))
        if 'ativo_id' in data: form.ativo_id = safe_int(data.get('ativo_id'))
        if 'infraestrutura_id' in data: form.infraestrutura_id = safe_int(data.get('infraestrutura_id'))
        if 'opcoes' in data: form.opcoes = json.dumps(data.get('opcoes', []))
        if 'ativo' in data: form.ativo = data.get('ativo')

        db.session.commit()

        try:
            create_log(user=user, action='update_formulario_chamado', entity='formulario_chamado', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(form.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

# DELETE - Deletar formulário
@formulario_chamado_bp.route('/<int:id>', methods=['DELETE'])
def delete_formulario(id):
    api_token = request.headers.get('X-API-Token')
    user = Usuario.query.filter_by(api_token=api_token).first() if api_token else None
    
    form = FormularioChamado.query.get_or_404(id)
    
    try:
        snapshot = form.to_dict()
        form.ativo = False
        db.session.commit()
        
        try:
            create_log(user=user, action='delete_formulario_chamado', entity='formulario_chamado', entity_id=id,
                       details={'deleted': snapshot}, req=request)
        except Exception:
            pass
        
        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500
