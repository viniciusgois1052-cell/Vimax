from flask import Blueprint, request, jsonify
from ..models.chamado import Chamado
from ..models.empresa import Empresa
from ..models.ativo import Ativo
from ..models.localizacao import Localizacao
from ..models.fornecedor import Fornecedor
from ..models.contrato import Contrato
from ..models.orcamento import Orcamento
from ..models.categoria_chamado import CategoriaChamado
from ..utils.filters import apply_entity_filter
from ..utils.auth import token_required
from .. import db
import os
from werkzeug.utils import secure_filename
from datetime import datetime

chamado_bp = Blueprint('chamado_bp', __name__)

@chamado_bp.route('', methods=['GET'])
@token_required
def list_chamados(current_user):
    include_inactive = request.args.get('include_inactive', '0') in ('1', 'true', 'True')
    empresa_id = request.args.get('empresa_id')
    q = (request.args.get('q') or '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))

    query = Chamado.query
    if not include_inactive:
        query = query.filter(Chamado.ativo == True)

    # Aplicar filtro baseado no usuário e role
    query = apply_entity_filter(query, Chamado, empresa_id, current_user)

    if q:
        like = f"%{q}%"
        query = query.filter((Chamado.titulo.ilike(like)) | (Chamado.descricao.ilike(like)))

    total = query.count()
    chamados = query.order_by(Chamado.id.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    ).items

    result = []
    for c in chamados:
        chamado_dict = c.to_dict()
        if c.empresa_id:
            empresa = Empresa.query.get(c.empresa_id)
            chamado_dict['empresa_nome'] = empresa.nome if empresa else None
        if c.ativo_id:
            ativo = Ativo.query.get(c.ativo_id)
            chamado_dict['ativo_nome'] = ativo.nome if ativo else None
        if c.localizacao_id:
            localizacao = Localizacao.query.get(c.localizacao_id)
            chamado_dict['localizacao_nome'] = localizacao.nome if localizacao else None
        if c.fornecedor_id:
            fornecedor = Fornecedor.query.get(c.fornecedor_id)
            chamado_dict['fornecedor_nome'] = fornecedor.nome if fornecedor else None
        if c.contrato_id:
            contrato = Contrato.query.get(c.contrato_id)
            chamado_dict['contrato_nome'] = contrato.nome if contrato else None
        if c.orcamento_id:
            orcamento = Orcamento.query.get(c.orcamento_id)
            chamado_dict['orcamento_nome'] = orcamento.nome if orcamento else None
        if c.categoria_id:
            categoria = CategoriaChamado.query.get(c.categoria_id)
            chamado_dict['categoria_nome'] = categoria.nome if categoria else None
        result.append(chamado_dict)

    return jsonify({
        'chamados': result,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total // per_page) + (1 if total % per_page > 0 else 0)
    })

@chamado_bp.route('', methods=['POST'])
@token_required
def create_chamado(current_user):
    data = request.get_json()
    
    # Para perfil empresa_restrita, forçar empresa_id do usuário
    if current_user.role == 'empresa_restrita':
        if not current_user.empresa_id:
            return jsonify({'error': 'Usuário não possui empresa vinculada'}), 400
        data['empresa_id'] = current_user.empresa_id
    
    chamado = Chamado(
        titulo=data.get('titulo'),
        descricao=data.get('descricao'),
        status=data.get('status', 'Aberto'),
        criticidade_prevista=data.get('criticidade_prevista'),
        criticidade_real=data.get('criticidade_real'),
        valor_orcado=data.get('valor_orcado', 0),
        valor_real=data.get('valor_real', 0),
        data_abertura=datetime.utcnow(),
        data_prevista=datetime.fromisoformat(data.get('data_prevista').replace('Z', '+00:00')) if data.get('data_prevista') else None,
        data_conclusao=datetime.fromisoformat(data.get('data_conclusao').replace('Z', '+00:00')) if data.get('data_conclusao') else None,
        empresa_id=data.get('empresa_id'),
        ativo_id=data.get('ativo_id'),
        localizacao_id=data.get('localizacao_id'),
        fornecedor_id=data.get('fornecedor_id'),
        contrato_id=data.get('contrato_id'),
        orcamento_id=data.get('orcamento_id'),
        categoria_id=data.get('categoria_id'),
        anexos=data.get('anexos', [])
    )
    
    db.session.add(chamado)
    db.session.commit()
    
    return jsonify(chamado.to_dict()), 201

@chamado_bp.route('/<int:id>', methods=['PUT'])
@token_required
def update_chamado(id, current_user):
    chamado = Chamado.query.get_or_404(id)
    
    # Verificar se o usuário empresa_restrita pode editar este chamado
    if current_user.role == 'empresa_restrita':
        if not current_user.empresa_id or chamado.empresa_id != current_user.empresa_id:
            return jsonify({'error': 'Sem permissão para editar este chamado'}), 403
    
    data = request.get_json()
    
    chamado.titulo = data.get('titulo', chamado.titulo)
    chamado.descricao = data.get('descricao', chamado.descricao)
    chamado.status = data.get('status', chamado.status)
    chamado.criticidade_prevista = data.get('criticidade_prevista', chamado.criticidade_prevista)
    chamado.criticidade_real = data.get('criticidade_real', chamado.criticidade_real)
    chamado.valor_orcado = data.get('valor_orcado', chamado.valor_orcado)
    chamado.valor_real = data.get('valor_real', chamado.valor_real)
    
    if data.get('data_prevista'):
        chamado.data_prevista = datetime.fromisoformat(data.get('data_prevista').replace('Z', '+00:00'))
    if data.get('data_conclusao'):
        chamado.data_conclusao = datetime.fromisoformat(data.get('data_conclusao').replace('Z', '+00:00'))
    
    # Para perfil empresa_restrita, não permitir mudança de empresa
    if current_user.role != 'empresa_restrita':
        chamado.empresa_id = data.get('empresa_id', chamado.empresa_id)
    
    chamado.ativo_id = data.get('ativo_id', chamado.ativo_id)
    chamado.localizacao_id = data.get('localizacao_id', chamado.localizacao_id)
    chamado.fornecedor_id = data.get('fornecedor_id', chamado.fornecedor_id)
    chamado.contrato_id = data.get('contrato_id', chamado.contrato_id)
    chamado.orcamento_id = data.get('orcamento_id', chamado.orcamento_id)
    chamado.categoria_id = data.get('categoria_id', chamado.categoria_id)
    chamado.anexos = data.get('anexos', chamado.anexos)
    
    db.session.commit()
    return jsonify(chamado.to_dict())

@chamado_bp.route('/<int:id>', methods=['DELETE'])
@token_required
def delete_chamado(id, current_user):
    chamado = Chamado.query.get_or_404(id)
    
    # Verificar se o usuário empresa_restrita pode deletar este chamado
    if current_user.role == 'empresa_restrita':
        if not current_user.empresa_id or chamado.empresa_id != current_user.empresa_id:
            return jsonify({'error': 'Sem permissão para deletar este chamado'}), 403
    
    db.session.delete(chamado)
    db.session.commit()
    return '', 204

@chamado_bp.route('/<int:id>', methods=['GET'])
@token_required
def get_chamado(id, current_user):
    chamado = Chamado.query.get_or_404(id)
    
    # Verificar se o usuário empresa_restrita pode ver este chamado
    if current_user.role == 'empresa_restrita':
        if not current_user.empresa_id or chamado.empresa_id != current_user.empresa_id:
            return jsonify({'error': 'Sem permissão para ver este chamado'}), 403
    
    return jsonify(chamado.to_dict())
