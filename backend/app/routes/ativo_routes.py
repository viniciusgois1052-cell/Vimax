from flask import Blueprint, request, jsonify
from .. import db
from ..models.ativo import Ativo
from ..models.usuario import Usuario
from ..utils.filters import apply_entity_filter
from datetime import datetime
from sqlalchemy.exc import IntegrityError

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
    data = request.get_json()

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

@ativo_bp.route('/<int:id>', methods=['PUT'])
def update_ativo(id):
    ativo = Ativo.query.get_or_404(id)
    data = request.get_json()

    ativo.nome = data.get('nome')
    ativo.numero_serie = data.get('numero_serie')
    ativo.voltagem_entrada = data.get('voltagem_entrada')

    ativo.data_aquisicao = datetime.strptime(data['data_aquisicao'], '%Y-%m-%d').date() if data.get('data_aquisicao') else None
    ativo.data_inativacao = datetime.strptime(data['data_inativacao'], '%Y-%m-%d').date() if data.get('data_inativacao') else None

    ativo.localizacao_id = data.get('localizacao_id')
    ativo.fornecedor_id = data.get('fornecedor_id')
    ativo.contrato_id = data.get('contrato_id')
    ativo.orcamento_id = data.get('orcamento_id')

    ativo.anexos = data.get('anexos', [])

    db.session.commit()
    return jsonify(ativo.to_dict())

@ativo_bp.route('/<int:id>', methods=['DELETE'])
def delete_ativo(id):
    ativo = Ativo.query.get(id)
    if not ativo:
        return jsonify({'error': 'Ativo não encontrado'}), 404

    try:
        from ..models.chamado import Chamado

        Chamado.query.filter_by(ativo_id=id).update({'ativo_id': None}, synchronize_session=False)
        db.session.delete(ativo)
        db.session.commit()
        return jsonify({'message': 'Ativo deletado com sucesso'}), 200

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'error': 'Não foi possível excluir o ativo devido a restrição de integridade. Remova ou atualize registros vinculados antes de excluir.'
        }), 409

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
