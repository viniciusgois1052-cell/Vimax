from flask import Blueprint, jsonify, request
from ..models.chamado_interacao import ChamadoInteracao
from ..models.chamado import Chamado

chamado_interacao_bp = Blueprint('chamado_interacao_bp', __name__)

@chamado_interacao_bp.route('/<int:chamado_id>/interacoes', methods=['GET'])
def list_interacoes(chamado_id):
    Chamado.query.get_or_404(chamado_id)
    itens = ChamadoInteracao.query.filter_by(chamado_id=chamado_id).order_by(ChamadoInteracao.created_at.asc()).all()
    return jsonify([i.to_dict() for i in itens]), 200
