# backend/app/routes/fornecedor_routes.py
from flask import Blueprint, request, jsonify
from ..models.fornecedor import Fornecedor
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log

fornecedor_bp = Blueprint('fornecedor_bp', __name__)

def safe_int(val):
    if val in [None, '', 'none', 'undefined']: 
        return None
    try: 
        return int(val)
    except: 
        return None

def model_columns(obj):
    try:
        return [c.name for c in obj.__table__.columns]
    except Exception:
        return []

def get_current_user_from_request():
    api_token = request.headers.get('X-API-Token')
    if api_token:
        user = Usuario.query.filter_by(api_token=api_token).first()
        if user and user.token_valido():
            return user
    return None

def require_roles(*roles):
    user = get_current_user_from_request()
    if not user:
        return None, (jsonify({'error': 'Não autenticado'}), 401)
    if user.role not in roles:
        return None, (jsonify({'error': 'Acesso negado'}), 403)
    return user, None

@fornecedor_bp.route('', methods=['GET'])
def list_fornecedores():
    try:
        origem = request.args.get('origem')
        query = Fornecedor.query
        if origem:
            query = query.filter(Fornecedor.origem == origem)
        fornecedores = query.order_by(Fornecedor.id.desc()).all()
        return jsonify([f.to_dict() for f in fornecedores]), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@fornecedor_bp.route('', methods=['POST'])
def create_fornecedor():
    user, err = require_roles('super_admin', 'admin')
    if err: 
        return err

    data = request.get_json() or {}

    try:
        cols = model_columns(Fornecedor)
        novo = Fornecedor()
        
        for k, v in data.items():
            if k in cols and k not in ['id', 'created_at', 'updated_at', 'criado_por_usuario_id', 'criado_por_nome']:
                if k.endswith('_id'):
                    setattr(novo, k, safe_int(v))
                elif k == 'tipo_entidade':
                    if v in ['fornecedor', 'prestador']:
                        setattr(novo, k, v)
                    else:
                        setattr(novo, k, 'fornecedor')
                else:
                    setattr(novo, k, v)
        
        if not hasattr(novo, 'tipo_entidade') or novo.tipo_entidade is None:
            novo.tipo_entidade = 'fornecedor'
        
        # REGISTRA QUEM CRIOU
        novo.criado_por_usuario_id = user.id
        novo.criado_por_nome = user.username
            
        db.session.add(novo)
        db.session.commit()

        try:
            create_log(user=user, action='create_fornecedor', entity='fornecedor', entity_id=novo.id,
                       details={'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(novo.to_dict()), 201
        
    except Exception as e:
        try: 
            db.session.rollback()
        except: 
            pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@fornecedor_bp.route('/<int:id>', methods=['GET'])
def get_fornecedor(id):
    f = Fornecedor.query.get_or_404(id)
    return jsonify(f.to_dict()), 200

@fornecedor_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_fornecedor(id):
    user, err = require_roles('super_admin', 'admin')
    if err: 
        return err

    f = Fornecedor.query.get_or_404(id)
    data = request.get_json() or {}

    try:
        before = None
        try:
            before = f.to_dict()
        except Exception:
            before = None

        cols = model_columns(Fornecedor)
        for k, v in data.items():
            if k in cols and k not in ['id', 'created_at', 'criado_por_usuario_id', 'criado_por_nome']:
                if k == 'updated_at':
                    continue
                elif k.endswith('_id'):
                    setattr(f, k, safe_int(v))
                elif k == 'tipo_entidade':
                    if v in ['fornecedor', 'prestador']:
                        setattr(f, k, v)
                else:
                    setattr(f, k, v)

        db.session.commit()

        try:
            create_log(user=user, action='update_fornecedor', entity='fornecedor', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(f.to_dict()), 200
        
    except Exception as e:
        try: 
            db.session.rollback()
        except: 
            pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500

@fornecedor_bp.route('/<int:id>', methods=['DELETE'])
def delete_fornecedor(id):
    user, err = require_roles('super_admin', 'admin')
    if err:
        return err

    fornecedor = Fornecedor.query.get_or_404(id)

    try:
        from sqlalchemy import inspect, text

        inspector = inspect(db.engine)
        vinculos = []
        referencias_verificadas = set()

        for tabela in inspector.get_table_names():
            for foreign_key in inspector.get_foreign_keys(tabela):
                if foreign_key.get('referred_table') != 'fornecedores':
                    continue

                for coluna in foreign_key.get(
                    'constrained_columns',
                    []
                ):
                    referencia = (tabela, coluna)

                    if referencia in referencias_verificadas:
                        continue

                    referencias_verificadas.add(referencia)

                    # Os identificadores vêm do próprio banco, mas esta
                    # validação evita montar SQL com nome inesperado.
                    tabela_valida = tabela.replace('_', '').isalnum()
                    coluna_valida = coluna.replace('_', '').isalnum()

                    if not tabela_valida or not coluna_valida:
                        continue

                    quantidade = db.session.execute(
                        text(
                            f"SELECT COUNT(*) "
                            f"FROM `{tabela}` "
                            f"WHERE `{coluna}` = :fornecedor_id"
                        ),
                        {'fornecedor_id': fornecedor.id}
                    ).scalar() or 0

                    if quantidade:
                        vinculos.append({
                            'tabela': tabela,
                            'coluna': coluna,
                            'quantidade': int(quantidade),
                        })

        if vinculos:
            return jsonify({
                'ok': False,
                'error': 'fornecedor_em_uso',
                'message': (
                    'Não é possível excluir este fornecedor porque '
                    'ele possui vínculos no sistema.'
                ),
                'fornecedor_id': fornecedor.id,
                'fornecedor_nome': fornecedor.nome,
                'vinculos': vinculos,
            }), 409

        try:
            snapshot = fornecedor.to_dict()
        except Exception:
            snapshot = None

        db.session.delete(fornecedor)
        db.session.commit()

        try:
            create_log(
                user=user,
                action='delete_fornecedor',
                entity='fornecedor',
                entity_id=id,
                details={'deleted': snapshot},
                req=request
            )
        except Exception:
            pass

        return jsonify({
            'ok': True,
            'message': 'Fornecedor excluído com sucesso'
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            'ok': False,
            'error': 'db_error',
            'message': 'Erro ao verificar ou excluir fornecedor'
        }), 500
