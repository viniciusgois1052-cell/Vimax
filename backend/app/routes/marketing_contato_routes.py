from flask import Blueprint, request, jsonify
from ..utils.auth import get_current_user_from_request
from ..utils.marketing_acl import is_super, filter_owned, can_access, forbidden
from ..models.marketing_contato import MarketingContato
from ..models.marketing_grupo import MarketingGrupo
from ..models.marketing_contato_grupo import MarketingContatoGrupo
from ..models.usuario import Usuario
from .. import db
from ..utils.logging import create_log

marketing_contato_bp = Blueprint('marketing_contato_bp', __name__)


def safe_int(val):
    if val in [None, '', 'none', 'undefined']:
        return None
    try:
        return int(val)
    except:
        return None


@marketing_contato_bp.route('', methods=['GET'])
def list_contatos():
    user = get_current_user_from_request(request)
    try:
        empresa_id = request.args.get('empresa_id')
        query = MarketingContato.query
        if empresa_id:
            query = query.filter_by(empresa_id=int(empresa_id))
        # ACL: nao-super_admin so ve seus proprios cadastros
        query = filter_owned(query, MarketingContato, user)
        contatos = query.order_by(MarketingContato.id.desc()).all()
        return jsonify([c.to_dict() for c in contatos]), 200
    except Exception as e:
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


@marketing_contato_bp.route('', methods=['POST'])
def create_contato():
    user = get_current_user_from_request(request)
    data = request.get_json() or {}
    try:
        novo = MarketingContato(
            nome=data.get('nome', ''),
            email=data.get('email', ''),
            empresa=data.get('empresa'),
            telefone=data.get('telefone'),
            empresa_id=safe_int(data.get('empresa_id')),
            criado_por=user.id if user else None,
        )
        db.session.add(novo)
        db.session.commit()

        try:
            create_log(user=user, action='create_marketing_contato', entity='marketing_contato',
                       entity_id=novo.id, details={'payload': data}, req=request)
        except Exception:
            pass

        return jsonify(novo.to_dict()), 201
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


@marketing_contato_bp.route('/<int:id>', methods=['GET'])
def get_contato(id):
    user = get_current_user_from_request(request)
    c = MarketingContato.query.get_or_404(id)
    if not can_access(user, c):
        return forbidden()
    return jsonify(c.to_dict()), 200


@marketing_contato_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
def update_contato(id):
    user = get_current_user_from_request(request)
    c = MarketingContato.query.get_or_404(id)
    if not can_access(user, c):
        return forbidden()
    data = request.get_json() or {}

    before = None
    try: before = c.to_dict()
    except Exception: before = None

    try:
        for field in ['nome', 'email', 'empresa', 'telefone']:
            if field in data:
                setattr(c, field, data[field])
        if 'empresa_id' in data:
            c.empresa_id = safe_int(data['empresa_id'])
        db.session.commit()

        try:
            create_log(user=user, action='update_marketing_contato', entity='marketing_contato',
                       entity_id=id, details={'before': before, 'after_payload': data}, req=request)
        except Exception:
            pass

        return jsonify(c.to_dict()), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'error': 'db_error', 'detail': str(e)}), 500


@marketing_contato_bp.route('/<int:id>', methods=['DELETE'])
def delete_contato(id):
    user = get_current_user_from_request(request)
    c = MarketingContato.query.get_or_404(id)
    if not can_access(user, c):
        return forbidden()

    snapshot = None
    try: snapshot = c.to_dict()
    except Exception: snapshot = None

    try:
        db.session.delete(c)
        db.session.commit()
        try:
            create_log(user=user, action='delete_marketing_contato', entity='marketing_contato',
                       entity_id=id, details={'deleted': snapshot}, req=request)
        except Exception: pass
        return jsonify({'ok': True}), 200
    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500


@marketing_contato_bp.route('/<int:id>/grupos', methods=['GET'])
def get_grupos_do_contato(id):
    user = get_current_user_from_request(request)
    c = MarketingContato.query.get_or_404(id)
    if not can_access(user, c):
        return forbidden()
    grupos = [{'id': cg.grupo.id, 'nome': cg.grupo.nome} for cg in c.grupos if cg.grupo]
    return jsonify(grupos), 200


@marketing_contato_bp.route('/<int:id>/grupos', methods=['POST'])
def set_grupos_do_contato(id):
    user = get_current_user_from_request(request)
    c = MarketingContato.query.get_or_404(id)
    if not can_access(user, c):
        return forbidden()
    data = request.get_json(silent=True) or {}

    grupo_ids = []
    if isinstance(data, dict):
        if data.get('grupo_id') is not None:
            grupo_ids = [data.get('grupo_id')]
        elif isinstance(data.get('grupo_ids'), list):
            grupo_ids = data.get('grupo_ids')
        elif isinstance(data.get('grupos'), list):
            grupo_ids = data.get('grupos')

    cleaned = []
    for gid in (grupo_ids or []):
        try:
            if gid is None or gid == '':
                continue
            cleaned.append(int(gid))
        except Exception:
            continue
    grupo_ids = sorted(set(cleaned))

    before_group_ids = []
    try:
        before_group_ids = [cg.grupo_id for cg in MarketingContatoGrupo.query.filter_by(contato_id=id).all()]
    except Exception:
        before_group_ids = []

    if not grupo_ids:
        try:
            MarketingContatoGrupo.query.filter_by(contato_id=id).delete()
            db.session.commit()
            try:
                create_log(user=user, action='update_marketing_contato', entity='marketing_contato',
                           entity_id=id, details={'before_group_ids': before_group_ids,
                                                  'after_group_ids': [], 'payload': data}, req=request)
            except Exception: pass
            db.session.refresh(c)
            return jsonify(c.to_dict()), 200
        except Exception as e:
            try: db.session.rollback()
            except: pass
            return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500

    try:
        MarketingContatoGrupo.query.filter_by(contato_id=id).delete()
        # so permite anexar a grupos que o usuario tem acesso
        grupos_q = MarketingGrupo.query.filter(MarketingGrupo.id.in_(grupo_ids))
        grupos_q = filter_owned(grupos_q, MarketingGrupo, user)
        existentes = set([g.id for g in grupos_q.all()])
        faltando = [gid for gid in grupo_ids if gid not in existentes]
        if faltando:
            db.session.rollback()
            return jsonify({'ok': False, 'error': 'grupo_not_found',
                            'detail': f'Grupo(s) inexistente(s) ou sem acesso: {faltando}'}), 404

        for gid in grupo_ids:
            db.session.add(MarketingContatoGrupo(contato_id=id, grupo_id=gid))
        db.session.commit()

        try:
            create_log(user=user, action='update_marketing_contato', entity='marketing_contato',
                       entity_id=id, details={'before_group_ids': before_group_ids,
                                              'after_group_ids': grupo_ids, 'payload': data}, req=request)
        except Exception: pass

        db.session.refresh(c)
        return jsonify(c.to_dict()), 200

    except Exception as e:
        try: db.session.rollback()
        except: pass
        return jsonify({'ok': False, 'error': 'db_error', 'detail': str(e)}), 500
