from flask import Blueprint, request, jsonify
from .. import db
from ..models.cliente import Cliente

cliente_bp = Blueprint('clientes', __name__)


@cliente_bp.route('', methods=['GET'])
def get_clientes():
    empresa_id = request.args.get('empresa_id')
    query = Cliente.query
    if empresa_id:
        try:
            query = query.filter_by(empresa_id=int(empresa_id))
        except (ValueError, TypeError):
            pass
    return jsonify([c.to_dict() for c in query.order_by(Cliente.nome).all()]), 200


@cliente_bp.route('', methods=['POST'])
def create_cliente():
    data = request.get_json() or {}

    if not data.get('nome'):
        return jsonify({'error': 'Nome é obrigatório'}), 400

    c = Cliente(
        nome       = data.get('nome'),
        email      = data.get('email'),
        telefone   = data.get('telefone'),
        documento  = data.get('documento'),
        exames     = data.get('exames'),
        empresa_id = int(data['empresa_id']) if data.get('empresa_id') else None,
        observacao = data.get('observacao'),
    )
    db.session.add(c)
    db.session.commit()
    return jsonify(c.to_dict()), 201


@cliente_bp.route('/<int:cliente_id>', methods=['GET'])
def get_cliente(cliente_id):
    c = Cliente.query.get_or_404(cliente_id)
    return jsonify(c.to_dict()), 200


@cliente_bp.route('/<int:cliente_id>', methods=['PUT'])
def update_cliente(cliente_id):
    c    = Cliente.query.get_or_404(cliente_id)
    data = request.get_json() or {}

    c.nome       = data.get('nome',       c.nome)
    c.email      = data.get('email',      c.email)
    c.telefone   = data.get('telefone',   c.telefone)
    c.documento  = data.get('documento',  c.documento)
    c.exames     = data.get('exames',     c.exames)
    c.observacao = data.get('observacao', c.observacao)
    c.empresa_id = int(data['empresa_id']) if data.get('empresa_id') else c.empresa_id

    db.session.commit()
    return jsonify(c.to_dict()), 200


@cliente_bp.route('/<int:cliente_id>', methods=['DELETE'])
def delete_cliente(cliente_id):
    c = Cliente.query.get_or_404(cliente_id)
    db.session.delete(c)
    db.session.commit()
    return jsonify({'message': 'Cliente excluído com sucesso'}), 200
