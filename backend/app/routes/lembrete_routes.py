from flask import Blueprint, request, jsonify
from ..models.lembrete import Lembrete
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log
from datetime import date
from ..utils.auth import get_current_user_from_request

lembrete_bp = Blueprint('lembrete_bp', __name__)

def get_current_user():
    api_token = request.headers.get('X-API-Token')
    if api_token:
        return Usuario.query.filter_by(api_token=api_token).first()
    return None

# ── Listar lembretes do usuário logado ────────────────────────────────────────
@lembrete_bp.route('', methods=['GET'])
def list_lembretes():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Não autenticado'}), 401

    # Filtro opcional por contrato
    contrato_id = request.args.get('contrato_id')

    query = Lembrete.query.filter_by(usuario_id=user.id)

    if contrato_id:
        try:
            query = query.filter_by(contrato_id=int(contrato_id))
        except ValueError:
            pass

    lembretes = query.order_by(Lembrete.data_lembrete.asc()).all()
    return jsonify([l.to_dict() for l in lembretes]), 200

# ── Criar lembrete ────────────────────────────────────────────────────────────
@lembrete_bp.route('', methods=['POST'])
def create_lembrete():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Não autenticado'}), 401

    data = request.get_json() or {}

    if not data.get('titulo') or not data.get('data_lembrete'):
        return jsonify({'error': 'titulo e data_lembrete são obrigatórios'}), 400

    try:
        novo = Lembrete(
            titulo=data.get('titulo'),
            descricao=data.get('descricao'),
            data_lembrete=date.fromisoformat(data.get('data_lembrete')),
            concluido=data.get('concluido', False),
            usuario_id=user.id,  # sempre vincula ao usuário logado
            contrato_id=int(data['contrato_id']) if data.get('contrato_id') else None,
        )
        db.session.add(novo)
        db.session.commit()

        try:
            create_log(user=user, action='create_lembrete', entity='lembrete', entity_id=novo.id,
                       details={'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(novo.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


# ── Atualizar lembrete ────────────────────────────────────────────────────────
@lembrete_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_lembrete(id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Não autenticado'}), 401

    lembrete = Lembrete.query.get_or_404(id)

    # Só o dono pode editar
    if lembrete.usuario_id != user.id:
        return jsonify({'error': 'Acesso negado'}), 403

    before = None
    try:
        before = lembrete.to_dict()
    except Exception:
        before = None

    data = request.get_json() or {}

    try:
        if 'titulo' in data: lembrete.titulo = data['titulo']
        if 'descricao' in data: lembrete.descricao = data['descricao']
        if 'data_lembrete' in data: lembrete.data_lembrete = date.fromisoformat(data['data_lembrete'])
        if 'concluido' in data: lembrete.concluido = data['concluido']
        if 'contrato_id' in data:
            lembrete.contrato_id = int(data['contrato_id']) if data['contrato_id'] else None

        db.session.commit()

        try:
            create_log(user=user, action='update_lembrete', entity='lembrete', entity_id=id,
                       details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(lembrete.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


# ── Deletar lembrete ──────────────────────────────────────────────────────────
@lembrete_bp.route('/<int:id>', methods=['DELETE'])
def delete_lembrete(id):
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Não autenticado'}), 401

    lembrete = Lembrete.query.get_or_404(id)

    # Só o dono pode deletar
    if lembrete.usuario_id != user.id:
        return jsonify({'error': 'Acesso negado'}), 403

    snapshot = None
    try:
        snapshot = lembrete.to_dict()
    except Exception:
        snapshot = None

    try:
        db.session.delete(lembrete)
        db.session.commit()

        try:
            create_log(user=user, action='delete_lembrete', entity='lembrete', entity_id=id,
                       details={'deleted': snapshot}, req=request)
        except Exception:
            pass

        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


# ── Lembretes de hoje / próximos (para o modal de alerta) ────────────────────
@lembrete_bp.route('/alertas', methods=['GET'])
def alertas_lembretes():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Não autenticado'}), 401

    hoje = date.today()
    lembretes = Lembrete.query.filter(
        Lembrete.usuario_id == user.id,
        Lembrete.concluido == False,
        Lembrete.data_lembrete <= hoje
    ).order_by(Lembrete.data_lembrete.asc()).all()

    return jsonify([l.to_dict() for l in lembretes]), 200
