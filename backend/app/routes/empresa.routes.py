from flask import Blueprint, request, jsonify
from .. import db
from ..models.empresa import Empresa
from ..models.usuario import Usuario
from ..utils.filters import apply_entity_filter
import json

empresa_bp = Blueprint('empresa_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'null', 'undefined']:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None

@empresa_bp.route('', methods=['GET'])
def get_empresas():
    try:
        api_token = request.headers.get('X-API-Token')
        user = None
        if api_token:
            user = Usuario.query.filter_by(api_token=api_token).first()
            
        query = Empresa.query
        # Para empresas, o filtro é um pouco diferente pois elas são a própria entidade
        if user and user.role != 'super_admin' and user.empresa_id:
            from ..utils.filters import get_all_sub_company_ids
            allowed_ids = get_all_sub_company_ids(user.empresa_id)
            query = query.filter(Empresa.id.in_(allowed_ids))
            
        empresas = query.all()
        return jsonify([e.to_dict() for e in empresas])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@empresa_bp.route('', methods=['POST'])
def create_empresa():
    data = request.get_json()
    try:
        nova_empresa = Empresa(
            nome=data.get('nome'),
            cnpj=data.get('cnpj'),
            endereco=data.get('endereco'),
            email=data.get('email'),
            telefone=data.get('telefone'),
            parent_id=safe_int(data.get('parent_id'))
        )
        
        # Trata anexos vindo como lista do frontend
        anexos = data.get('anexos', [])
        nova_empresa.set_anexos(anexos if isinstance(anexos, list) else [])
            
        db.session.add(nova_empresa)
        db.session.commit()
        return jsonify(nova_empresa.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao criar empresa: {str(e)}")
        return jsonify({"error": str(e)}), 400

@empresa_bp.route('/<int:id>', methods=['PUT'])
def update_empresa(id):
    empresa = Empresa.query.get_or_404(id)
    data = request.get_json()
    try:
        empresa.nome = data.get('nome', empresa.nome)
        empresa.cnpj = data.get('cnpj', empresa.cnpj)
        empresa.endereco = data.get('endereco', empresa.endereco)
        empresa.email = data.get('email', empresa.email)
        empresa.telefone = data.get('telefone', empresa.telefone)
        empresa.parent_id = safe_int(data.get('parent_id'))
        
        if 'anexos' in data:
            anexos = data.get('anexos', [])
            empresa.set_anexos(anexos if isinstance(anexos, list) else [])
            
        db.session.commit()
        return jsonify(empresa.to_dict())
    except Exception as e:
        db.session.rollback()
        print(f"Erro ao atualizar empresa: {str(e)}")
        return jsonify({"error": str(e)}), 400

@empresa_bp.route('/<int:id>', methods=['DELETE'])
def delete_empresa(id):
    empresa = Empresa.query.get_or_404(id)
    try:
        db.session.delete(empresa)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": "Não é possível excluir uma empresa que possui filiais ou vínculos ativos."}), 400
