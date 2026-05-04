from flask import Blueprint, request, jsonify
from .. import db
from ..utils.logging import create_log
from ..models.ativo import Ativo
from ..models.usuario import Usuario
from ..utils.filters import apply_entity_filter
from datetime import datetime
from ..utils.auth import get_current_user_from_request

ativo_bp = Blueprint('ativo_bp', __name__)

@ativo_bp.route('/', methods=['GET'])
def get_ativos():
    empresa_id = request.args.get('empresa_id')
    api_token = request.headers.get('X-API-Token')
    
    user = None
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
        
    query = Ativo.query
    query = apply_entity_filter(query, Ativo, empresa_id, user)
    
    ativos = query.all()
    return jsonify([ativo.to_dict() for ativo in ativos])

@ativo_bp.route('/<int:id>', methods=['GET'])
def get_ativo(id):
    ativo = Ativo.query.get_or_404(id)
    return jsonify(ativo.to_dict())

@ativo_bp.route('/', methods=['POST'])
def create_ativo():
    data = request.get_json() or {}

    data_aquisicao = datetime.strptime(data['data_aquisicao'], '%Y-%m-%d').date() if data.get('data_aquisicao') else None
    data_inativacao = datetime.strptime(data['data_inativacao'], '%Y-%m-%d').date() if data.get('data_inativacao') else None

    novo_ativo = Ativo(
        nome=data['nome'],
        numero_serie=data.get('numero_serie'),
        voltagem_entrada=data.get('voltagem_entrada'),
        data_aquisicao=data_aquisicao,
        data_inativacao=data_inativacao,
        empresa_id=data['empresa_id'],
        localizacao_id=data.get('localizacao_id'),
        fornecedor_id=data.get('fornecedor_id'),
        contrato_id=data.get('contrato_id'),
        orcamento_id=data.get('orcamento_id'),
        anexos=data.get('anexos', [])
    )

    db.session.add(novo_ativo)
    db.session.commit()
    return jsonify(novo_ativo.to_dict()), 201


# ✅ SEU FRONTEND JÁ USA PUT — ESTA ROTA NÃO EXISTIA
@ativo_bp.route('/<int:id>', methods=['PUT'])
def update_ativo(id):
    user = get_current_user_from_request(request)
    ativo = Ativo.query.get_or_404(id)

    before = None
    try:
        before = ativo.to_dict()
    except Exception:
        before = None
    data = request.get_json() or {}

    ativo.nome = data.get('nome')
    ativo.numero_serie = data.get('numero_serie')
    ativo.voltagem_entrada = data.get('voltagem_entrada')

    ativo.data_aquisicao = datetime.strptime(data['data_aquisicao'], '%Y-%m-%d').date() if data.get('data_aquisicao') else None
    ativo.data_inativacao = datetime.strptime(data['data_inativacao'], '%Y-%m-%d').date() if data.get('data_inativacao') else None

    ativo.localizacao_id = data.get('localizacao_id')
    ativo.fornecedor_id = data.get('fornecedor_id')
    ativo.contrato_id = data.get('contrato_id')
    ativo.orcamento_id = data.get('orcamento_id')

    # ✅ SALVAR ANEXOS
    ativo.anexos = data.get('anexos', [])

    db.session.commit()

    try:
        create_log(user=user, action='update_ativo', entity='ativo', entity_id=id,
                   details={'before': before, 'after_payload': data}, req=request)
    except Exception:
        pass
    return jsonify(ativo.to_dict())


@ativo_bp.route('/<int:id>', methods=['DELETE'])
def delete_ativo(id):
    user = get_current_user_from_request(request)
    ativo = Ativo.query.get_or_404(id)

    snapshot = None
    try:
        snapshot = ativo.to_dict()
    except Exception:
        snapshot = None

    try:
        # Desvincular chamados antes de excluir
        from ..models.chamado import Chamado
        Chamado.query.filter_by(ativo_id=id).update({'ativo_id': None})

        db.session.delete(ativo)
        db.session.commit()

        try:
            create_log(user=user, action='delete_ativo', entity='ativo', entity_id=id,
                       details={'deleted': snapshot}, req=request)
        except Exception:
            pass

        return jsonify({'ok': True}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
