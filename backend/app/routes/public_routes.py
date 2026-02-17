from flask import Blueprint, request, jsonify
from ..models.ativo import Ativo
from ..models.chamado import Chamado
from .. import db
import json
from datetime import datetime

public_bp = Blueprint('public_bp', __name__)

@public_bp.route('/ativo/<int:id>', methods=['GET'])
def get_ativo_public(id):
    ativo = Ativo.query.get_or_404(id)
    return jsonify({
        'id': ativo.id,
        'nome': ativo.nome,
        'numero_serie': ativo.numero_serie,
        'empresa_id': ativo.empresa_id,
        'empresa_nome': ativo.empresa.nome if ativo.empresa else None,
        'localizacao_id': ativo.localizacao_id,
        'localizacao_nome': ativo.localizacao.nome if ativo.localizacao else None
    })

@public_bp.route('/chamado/abrir', methods=['POST'])
def abrir_chamado_publico():
    data = request.get_json()
    
    if not data.get('titulo') or not data.get('descricao'):
        return jsonify({'error': 'Título e descrição são obrigatórios'}), 400

    # Processar anexos se existirem
    anexos_json = None
    if data.get('anexos') and isinstance(data['anexos'], list) and len(data['anexos']) > 0:
        anexos_json = json.dumps(data['anexos'])
        
    criticidade = data.get('criticidade_informada')
    
    novo_chamado = Chamado(
        titulo=data.get('titulo'),
        descricao=f"Aberto via QR Code por: {data.get('nome_solicitante', 'Anônimo')}\n\nProblema: {data.get('descricao')}",
        status='Aberto',
        #ativo_id=data.get('ativo_id'),
        empresa_id=data.get('empresa_id'),
        localizacao_id=data.get('localizacao_id'),
        criticidade_informada=criticidade,
        criticidade_real=criticidade, # Duplicada inicialmente
        data_abertura=datetime.utcnow(), # Horário real capturado no servidor
        anexos=anexos_json
    )
    
    db.session.add(novo_chamado)
    db.session.commit()
    
    return jsonify({'message': 'Chamado aberto com sucesso!', 'id': novo_chamado.id}), 201
