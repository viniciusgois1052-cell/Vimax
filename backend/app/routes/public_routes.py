from flask import Blueprint, request, jsonify, current_app
from ..models.usuario import Usuario
from ..models.ativo import Ativo
from ..models.infraestrutura import Infraestrutura
from ..models.chamado import Chamado
from ..models.empresa import Empresa
from ..models.formulario_chamado import FormularioChamado
from .. import db
import json
import os
import base64
import uuid
from datetime import datetime
import traceback

public_bp = Blueprint('public_bp', __name__)

# ============================================
# ROTA DE LOGIN PARA O PORTAL
# ============================================
@public_bp.route('/auth/login', methods=['POST'])
def portal_login():
    """Login para o portal de chamados"""
    from .. import bcrypt
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Usuário e senha são obrigatórios'}), 400
    
    user = Usuario.query.filter_by(username=username).first()
    
    if user and bcrypt.check_password_hash(user.password_hash, password):
        user_data = user.to_dict()
        user_data['token'] = user.api_token
        return jsonify({'user': user_data, 'token': user.api_token}), 200
    
    return jsonify({'error': 'Usuário ou senha inválidos'}), 401

def save_base64_image(base64_str):
    """
    Decodifica uma string Base64 e salva como arquivo físico na pasta de uploads.
    Retorna o caminho relativo para salvar no banco de dados.
    """
    try:
        if not base64_str or not isinstance(base64_str, str) or 'base64,' not in base64_str:
            return None
            
        # Extrair o conteúdo base64 (remover o prefixo data:image/xxx;base64,)
        header, encoded = base64_str.split('base64,')
        image_data = base64.b64decode(encoded)
        
        # Definir o nome do arquivo e o caminho
        filename = f"portal_{uuid.uuid4().hex}.jpg"
        
        # Caminho absoluto para salvar o arquivo (conforme estrutura do projeto)
        # /var/www/cmms_project/backend/app/static/uploads/empresas/geral
        upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'empresas', 'geral')
        
        # Garantir que a pasta existe
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir, exist_ok=True)
            
        filepath = os.path.join(upload_dir, filename)
        
        # Salvar o arquivo físico
        with open(filepath, 'wb') as f:
            f.write(image_data)
            
        # Retornar o caminho relativo que o frontend usa para exibir a imagem
        # Exemplo: /static/uploads/empresas/geral/portal_xyz.jpg
        return f"/static/uploads/empresas/geral/{filename}"
        
    except Exception as e:
        print(f"❌ Erro ao salvar imagem Base64: {str(e)}")
        return None

# ============================================
# ROTA ORIGINAL: Abrir chamado via QR Code
# ============================================
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

    anexos_json = None
    if data.get('anexos') and isinstance(data['anexos'], list) and len(data['anexos']) > 0:
        anexos_json = json.dumps(data['anexos'])
        
    criticidade = data.get('criticidade_informada')
    
    novo_chamado = Chamado(
        titulo=data.get('titulo'),
        descricao=f"Aberto via QR Code por: {data.get('nome_solicitante', 'Anônimo')}\n\nProblema: {data.get('descricao')}",
        status='Aberto',
        empresa_id=data.get('empresa_id'),
        localizacao_id=data.get('localizacao_id'),
        criticidade_informada=criticidade,
        criticidade_real=criticidade,
        data_abertura=datetime.utcnow(),
        anexos=anexos_json
    )
    
    db.session.add(novo_chamado)
    db.session.commit()
    
    return jsonify({'message': 'Chamado aberto com sucesso!', 'id': novo_chamado.id}), 201


# ============================================
# NOVAS ROTAS: Portal Externo por Empresa
# ============================================

@public_bp.route('/empresa/<int:empresa_id>', methods=['GET'])
def get_empresa_portal(empresa_id):
    """Retorna dados da empresa para o portal externo."""
    empresa = Empresa.query.get_or_404(empresa_id)
    return jsonify({
        'id': empresa.id,
        'nome': empresa.nome,
        'cnpj': empresa.cnpj,
        'email': empresa.email,
        'telefone': empresa.telefone
    }), 200


@public_bp.route('/empresa/<int:empresa_id>/ativos', methods=['GET'])
def get_ativos_empresa(empresa_id):
    """Retorna os ativos (maquinário) ativos de uma empresa."""
    ativos = Ativo.query.filter_by(empresa_id=empresa_id).all()
    result = []
    for a in ativos:
        result.append({
            'id': a.id,
            'nome': a.nome,
            'numero_serie': a.numero_serie,
            'localizacao_nome': a.localizacao.nome if a.localizacao else None
        })
    return jsonify(result), 200


@public_bp.route('/empresa/<int:empresa_id>/infraestruturas', methods=['GET'])
def get_infraestruturas_empresa(empresa_id):
    """Retorna as infraestruturas ativas de uma empresa."""
    infras = Infraestrutura.query.filter_by(empresa_id=empresa_id, ativo=True).all()
    result = []
    for i in infras:
        result.append({
            'id': i.id,
            'nome': i.nome,
            'descricao': i.descricao,
            'tipo_nome': i.tipo_infra.nome if i.tipo_infra else None,
            'localizacao_nome': i.localizacao.nome if i.localizacao else None
        })
    return jsonify(result), 200


# ✅ Buscar problemas por ativo específico
@public_bp.route('/ativo/<int:ativo_id>/problemas', methods=['GET'])
def get_problemas_ativo(ativo_id):
    """Retorna os problemas (opções) cadastrados para um ativo específico."""
    formularios = FormularioChamado.query.filter_by(
        ativo_id=ativo_id,
        ativo=True
    ).all()
    
    opcoes = []
    for form in formularios:
        if form.opcoes:
            opcoes.extend(json.loads(form.opcoes) if isinstance(form.opcoes, str) else form.opcoes)
    
    # Remover duplicatas mantendo ordem
    opcoes_unicas = []
    for op in opcoes:
        if op not in opcoes_unicas:
            opcoes_unicas.append(op)
    
    return jsonify({
        'ativo_id': ativo_id,
        'opcoes': opcoes_unicas
    }), 200


# ✅ Buscar problemas por infraestrutura específica
@public_bp.route('/infraestrutura/<int:infraestrutura_id>/problemas', methods=['GET'])
def get_problemas_infraestrutura(infraestrutura_id):
    """Retorna os problemas (opções) cadastrados para uma infraestrutura específica."""
    formularios = FormularioChamado.query.filter_by(
        infraestrutura_id=infraestrutura_id,
        ativo=True
    ).all()
    
    opcoes = []
    for form in formularios:
        if form.opcoes:
            opcoes.extend(json.loads(form.opcoes) if isinstance(form.opcoes, str) else form.opcoes)
    
    # Remover duplicatas mantendo ordem
    opcoes_unicas = []
    for op in opcoes:
        if op not in opcoes_unicas:
            opcoes_unicas.append(op)
    
    return jsonify({
        'infraestrutura_id': infraestrutura_id,
        'opcoes': opcoes_unicas
    }), 200


@public_bp.route('/portal/chamado', methods=['POST'])
def abrir_chamado_portal():
    """
    Abre um chamado a partir do portal externo por empresa.
    Salva as fotos fisicamente no servidor.
    """
    data = request.get_json() or {}
    
    if not data.get('titulo'):
        return jsonify({'error': 'Título é obrigatório'}), 400
    
    if not data.get('empresa_id'):
        return jsonify({'error': 'Empresa é obrigatória'}), 400

    tipo = data.get('tipo', 'maquinario')
    
    # Processar opcoes_selecionadas
    opcoes = data.get('opcoes_selecionadas', [])
    opcoes_json = json.dumps(opcoes) if opcoes else None
    
    # ✅ CORREÇÃO FINAL: Salvar fotos fisicamente no servidor
    fotos_base64 = data.get('fotos', [])
    anexos_json = None
    if fotos_base64:
        anexos_list = []
        for i, b64 in enumerate(fotos_base64):
            # Salvar o arquivo físico e obter o caminho relativo
            relative_path = save_base64_image(b64)
            if relative_path:
                anexos_list.append({
                    'name': f'foto_portal_{i+1}.jpg',
                    'url': relative_path, # Caminho que o frontend usa (/static/uploads/...)
                    'path': relative_path
                })
        if anexos_list:
            anexos_json = json.dumps(anexos_list)
    
    # Montar descrição
    descricao_parts = []
    if data.get('descricao'):
        descricao_parts.append(data.get('descricao'))
    if opcoes:
        descricao_parts.append(f"Problemas selecionados: {', '.join(opcoes)}")
    if data.get('nome_solicitante'):
        descricao_parts.append(f"Solicitante: {data.get('nome_solicitante')}")
    
    descricao_final = '\n\n'.join(descricao_parts) if descricao_parts else None
    
    try:
        novo_chamado = Chamado(
            titulo=data.get('titulo'),
            descricao=descricao_final,
            status='Aberto',
            tipo=tipo,
            empresa_id=int(data.get('empresa_id')),
            ativo_id=int(data.get('ativo_id')) if data.get('ativo_id') else None,
            infraestrutura_id=int(data.get('infraestrutura_id')) if data.get('infraestrutura_id') else None,
            opcoes_selecionadas=opcoes_json,
            criticidade_informada=data.get('criticidade_informada', 'media'),
            criticidade_real=data.get('criticidade_informada', 'media'),
            data_abertura=datetime.utcnow(),
            anexos=anexos_json,
            ativo=True
        )
        
        db.session.add(novo_chamado)
        db.session.commit()
        
        return jsonify({
            'message': 'Chamado aberto com sucesso!', 
            'id': novo_chamado.id,
            'tipo': tipo
        }), 201
        
    except Exception as e:
        print(f"❌ ERRO NO PORTAL: {str(e)}")
        print(traceback.format_exc())
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500
