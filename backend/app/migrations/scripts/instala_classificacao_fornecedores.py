from pathlib import Path
from datetime import datetime
import py_compile
import shutil
import sys


ROOT = Path.cwd()
APP = ROOT / "app"
INIT = APP / "__init__.py"
MODEL = APP / "models" / "fornecedor_avaliacao.py"
ROUTE = APP / "routes" / "fornecedor_avaliacao_routes.py"
STAMP = datetime.now().strftime("%Y%m%d-%H%M%S")


MODEL_CONTENT = r'''from datetime import datetime
from .. import db


class FornecedorAvaliacao(db.Model):
    __tablename__ = 'fornecedor_avaliacoes'
    __table_args__ = (
        db.UniqueConstraint(
            'ordem_compra_id',
            name='uq_fornecedor_avaliacao_ordem'
        ),
        db.Index(
            'ix_fornecedor_avaliacoes_empresa_fornecedor',
            'empresa_id',
            'fornecedor_id'
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    fornecedor_id = db.Column(
        db.Integer,
        db.ForeignKey('fornecedores.id', ondelete='RESTRICT'),
        nullable=False
    )
    empresa_id = db.Column(
        db.Integer,
        db.ForeignKey('empresas.id', ondelete='RESTRICT'),
        nullable=False
    )
    ordem_compra_id = db.Column(
        db.Integer,
        db.ForeignKey('ordens_compra.id', ondelete='RESTRICT'),
        nullable=False
    )
    avaliador_id = db.Column(
        db.Integer,
        db.ForeignKey('usuarios.id', ondelete='RESTRICT'),
        nullable=False
    )

    qualidade = db.Column(db.SmallInteger, nullable=False)
    prazo = db.Column(db.SmallInteger, nullable=False)
    preco = db.Column(db.SmallInteger, nullable=False)
    atendimento = db.Column(db.SmallInteger, nullable=False)
    conformidade = db.Column(db.SmallInteger, nullable=False)

    comentario = db.Column(db.Text, nullable=True)
    recomendaria = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    fornecedor = db.relationship(
        'Fornecedor',
        foreign_keys=[fornecedor_id],
        lazy='joined'
    )
    empresa = db.relationship(
        'Empresa',
        foreign_keys=[empresa_id],
        lazy='joined'
    )
    ordem_compra = db.relationship(
        'OrdemCompra',
        foreign_keys=[ordem_compra_id],
        lazy='joined'
    )
    avaliador = db.relationship(
        'Usuario',
        foreign_keys=[avaliador_id],
        lazy='joined'
    )

    @property
    def nota_geral(self):
        notas = (
            self.qualidade,
            self.prazo,
            self.preco,
            self.atendimento,
            self.conformidade,
        )
        return round(sum(notas) / 5.0, 2)

    def to_dict(self):
        return {
            'id': self.id,
            'fornecedor_id': self.fornecedor_id,
            'fornecedor_nome': (
                self.fornecedor.nome if self.fornecedor else None
            ),
            'empresa_id': self.empresa_id,
            'empresa_nome': self.empresa.nome if self.empresa else None,
            'ordem_compra_id': self.ordem_compra_id,
            'numero_oc': (
                self.ordem_compra.numero_oc
                if self.ordem_compra else None
            ),
            'avaliador_id': self.avaliador_id,
            'avaliador_nome': (
                self.avaliador.nome_completo
                or self.avaliador.username
                if self.avaliador else None
            ),
            'qualidade': self.qualidade,
            'prazo': self.prazo,
            'preco': self.preco,
            'atendimento': self.atendimento,
            'conformidade': self.conformidade,
            'nota_geral': self.nota_geral,
            'comentario': self.comentario,
            'recomendaria': bool(self.recomendaria),
            'created_at': (
                self.created_at.isoformat() if self.created_at else None
            ),
            'updated_at': (
                self.updated_at.isoformat() if self.updated_at else None
            ),
        }
'''


ROUTE_CONTENT = r'''from flask import Blueprint, jsonify, request
from sqlalchemy import case, func

from .. import db
from ..models.compra import OrdemCompra
from ..models.fornecedor import Fornecedor
from ..models.fornecedor_avaliacao import FornecedorAvaliacao
from ..models.usuario import Usuario
from ..utils.filters import get_all_allowed_ids
from ..utils.logging import create_log


fornecedor_avaliacao_bp = Blueprint(
    'fornecedor_avaliacao_bp',
    __name__
)

CAMPOS_NOTA = (
    'qualidade',
    'prazo',
    'preco',
    'atendimento',
    'conformidade',
)


def _usuario_atual():
    token = request.headers.get('X-API-Token')
    if not token:
        return None
    user = Usuario.query.filter_by(api_token=token).first()
    if not user or not user.token_valido():
        return None
    return user


def _tem_permissao(user, acao):
    if user.role in ('super_admin', 'admin'):
        return True

    perfil = getattr(user, 'perfil_acesso', None)
    if not perfil:
        return False

    campos = {
        'ver': (
            'compras_ver',
            'fornecedores_ver',
            'visualizar_fornecedores',
        ),
        'editar': (
            'compras_editar',
            'fornecedores_editar',
            'compras_pode_marcar_recebimento',
        ),
        'excluir': (
            'compras_excluir',
            'fornecedores_excluir',
        ),
    }
    return any(
        getattr(perfil, campo, False) is True
        for campo in campos.get(acao, ())
    )


def _autorizado(acao):
    user = _usuario_atual()
    if not user:
        return None, (
            jsonify({'error': 'Não autenticado'}),
            401
        )
    if not _tem_permissao(user, acao):
        return None, (
            jsonify({
                'error': 'Acesso negado',
                'acao': acao,
            }),
            403
        )
    return user, None


def _empresas_permitidas(user):
    if user.role == 'super_admin':
        return None
    ids = user.get_empresa_ids()
    if not ids:
        return []
    return get_all_allowed_ids(ids)


def _query_permitida(user):
    query = FornecedorAvaliacao.query
    ids = _empresas_permitidas(user)
    if ids is None:
        return query
    if not ids:
        return query.filter(FornecedorAvaliacao.id == -1)
    return query.filter(FornecedorAvaliacao.empresa_id.in_(ids))


def _ordem_permitida(ordem_id, user):
    query = OrdemCompra.query.filter_by(id=ordem_id, ativo=True)
    ids = _empresas_permitidas(user)
    if ids is None:
        return query.first()
    if not ids:
        return None
    return query.filter(OrdemCompra.empresa_id.in_(ids)).first()


def _nota(data, campo):
    try:
        valor = int(data.get(campo))
    except (TypeError, ValueError):
        raise ValueError(
            '{} deve ser um número inteiro de 1 a 5'.format(campo)
        )
    if valor < 1 or valor > 5:
        raise ValueError(
            '{} deve estar entre 1 e 5'.format(campo)
        )
    return valor


def _booleano(valor, padrao=True):
    if valor is None:
        return padrao
    if isinstance(valor, bool):
        return valor
    if isinstance(valor, (int, float)):
        return valor != 0
    if isinstance(valor, str):
        return valor.strip().lower() in (
            '1',
            'true',
            'sim',
            'yes',
            'on',
        )
    return bool(valor)


def _resumo(query):
    total = query.count()
    if not total:
        return {
            'total_avaliacoes': 0,
            'nota_geral': 0,
            'qualidade': 0,
            'prazo': 0,
            'preco': 0,
            'atendimento': 0,
            'conformidade': 0,
            'percentual_recomendacao': 0,
        }

    row = query.with_entities(
        func.avg(FornecedorAvaliacao.qualidade),
        func.avg(FornecedorAvaliacao.prazo),
        func.avg(FornecedorAvaliacao.preco),
        func.avg(FornecedorAvaliacao.atendimento),
        func.avg(FornecedorAvaliacao.conformidade),
        func.avg(
            case(
                (FornecedorAvaliacao.recomendaria.is_(True), 1),
                else_=0
            )
        ),
    ).first()

    medias = [round(float(row[i] or 0), 2) for i in range(5)]
    return {
        'total_avaliacoes': total,
        'nota_geral': round(sum(medias) / 5.0, 2),
        'qualidade': medias[0],
        'prazo': medias[1],
        'preco': medias[2],
        'atendimento': medias[3],
        'conformidade': medias[4],
        'percentual_recomendacao': round(
            float(row[5] or 0) * 100,
            1
        ),
    }


@fornecedor_avaliacao_bp.route('/ranking', methods=['GET'])
def ranking():
    user, erro = _autorizado('ver')
    if erro:
        return erro

    query = _query_permitida(user)
    empresa_id = request.args.get('empresa_id', type=int)
    if empresa_id is not None:
        ids = _empresas_permitidas(user)
        if ids is not None and empresa_id not in ids:
            return jsonify({'error': 'Empresa não permitida'}), 403
        query = query.filter(
            FornecedorAvaliacao.empresa_id == empresa_id
        )

    nota_media = (
        func.avg(FornecedorAvaliacao.qualidade)
        + func.avg(FornecedorAvaliacao.prazo)
        + func.avg(FornecedorAvaliacao.preco)
        + func.avg(FornecedorAvaliacao.atendimento)
        + func.avg(FornecedorAvaliacao.conformidade)
    ) / 5.0

    rows = (
        query.join(
            Fornecedor,
            Fornecedor.id == FornecedorAvaliacao.fornecedor_id
        )
        .with_entities(
            Fornecedor.id,
            Fornecedor.nome,
            func.count(FornecedorAvaliacao.id),
            nota_media,
            func.avg(FornecedorAvaliacao.qualidade),
            func.avg(FornecedorAvaliacao.prazo),
            func.avg(FornecedorAvaliacao.preco),
            func.avg(FornecedorAvaliacao.atendimento),
            func.avg(FornecedorAvaliacao.conformidade),
            func.avg(
                case(
                    (
                        FornecedorAvaliacao.recomendaria.is_(True),
                        1
                    ),
                    else_=0
                )
            ),
        )
        .group_by(Fornecedor.id, Fornecedor.nome)
        .order_by(nota_media.desc(), func.count(
            FornecedorAvaliacao.id
        ).desc())
        .all()
    )

    resultado = [{
        'fornecedor_id': row[0],
        'fornecedor_nome': row[1],
        'total_avaliacoes': int(row[2] or 0),
        'nota_geral': round(float(row[3] or 0), 2),
        'qualidade': round(float(row[4] or 0), 2),
        'prazo': round(float(row[5] or 0), 2),
        'preco': round(float(row[6] or 0), 2),
        'atendimento': round(float(row[7] or 0), 2),
        'conformidade': round(float(row[8] or 0), 2),
        'percentual_recomendacao': round(
            float(row[9] or 0) * 100,
            1
        ),
    } for row in rows]

    for posicao, item in enumerate(resultado, start=1):
        item['posicao'] = posicao

    return jsonify(resultado), 200


@fornecedor_avaliacao_bp.route(
    '/fornecedor/<int:fornecedor_id>',
    methods=['GET']
)
def historico_fornecedor(fornecedor_id):
    user, erro = _autorizado('ver')
    if erro:
        return erro

    fornecedor = Fornecedor.query.get_or_404(fornecedor_id)
    ids = _empresas_permitidas(user)
    if (
        ids is not None
        and fornecedor.empresa_id is not None
        and fornecedor.empresa_id not in ids
    ):
        return jsonify({'error': 'Fornecedor não encontrado'}), 404
    query = _query_permitida(user).filter_by(
        fornecedor_id=fornecedor_id
    )

    empresa_id = request.args.get('empresa_id', type=int)
    if empresa_id is not None:
        ids = _empresas_permitidas(user)
        if ids is not None and empresa_id not in ids:
            return jsonify({'error': 'Empresa não permitida'}), 403
        query = query.filter(
            FornecedorAvaliacao.empresa_id == empresa_id
        )

    avaliacoes = query.order_by(
        FornecedorAvaliacao.created_at.desc()
    ).all()
    return jsonify({
        'fornecedor': fornecedor.to_dict(),
        'resumo': _resumo(query),
        'avaliacoes': [a.to_dict() for a in avaliacoes],
    }), 200


@fornecedor_avaliacao_bp.route(
    '/ordem/<int:ordem_id>',
    methods=['GET']
)
def avaliacao_da_ordem(ordem_id):
    user, erro = _autorizado('ver')
    if erro:
        return erro
    ordem = _ordem_permitida(ordem_id, user)
    if not ordem:
        return jsonify({'error': 'Ordem não encontrada'}), 404
    avaliacao = _query_permitida(user).filter_by(
        ordem_compra_id=ordem.id
    ).first()
    return jsonify(
        avaliacao.to_dict() if avaliacao else None
    ), 200


@fornecedor_avaliacao_bp.route('', methods=['POST'])
def criar_avaliacao():
    user, erro = _autorizado('editar')
    if erro:
        return erro

    data = request.get_json(silent=True) or {}
    ordem_id = data.get('ordem_compra_id')
    try:
        ordem_id = int(ordem_id)
    except (TypeError, ValueError):
        return jsonify({
            'error': 'Informe uma ordem_compra_id válida'
        }), 400

    ordem = _ordem_permitida(ordem_id, user)
    if not ordem:
        return jsonify({'error': 'Ordem não encontrada'}), 404

    existente = FornecedorAvaliacao.query.filter_by(
        ordem_compra_id=ordem.id
    ).first()
    if existente:
        return jsonify({
            'error': 'ordem_ja_avaliada',
            'message': 'Esta Ordem de Compra já possui avaliação',
            'avaliacao': existente.to_dict(),
        }), 409

    try:
        valores = {
            campo: _nota(data, campo)
            for campo in CAMPOS_NOTA
        }
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    avaliacao = FornecedorAvaliacao(
        fornecedor_id=ordem.fornecedor_id,
        empresa_id=ordem.empresa_id,
        ordem_compra_id=ordem.id,
        avaliador_id=user.id,
        comentario=(
            (data.get('comentario') or '').strip()[:5000]
            or None
        ),
        recomendaria=_booleano(data.get('recomendaria'), True),
        **valores
    )

    try:
        db.session.add(avaliacao)
        db.session.commit()
        try:
            create_log(
                user=user,
                action='create_fornecedor_avaliacao',
                entity='fornecedor_avaliacao',
                entity_id=avaliacao.id,
                details={'avaliacao': avaliacao.to_dict()},
                req=request
            )
        except Exception:
            pass
        return jsonify(avaliacao.to_dict()), 201
    except Exception:
        db.session.rollback()
        return jsonify({
            'error': 'Não foi possível salvar a avaliação'
        }), 500


@fornecedor_avaliacao_bp.route(
    '/<int:avaliacao_id>',
    methods=['PUT', 'PATCH']
)
def editar_avaliacao(avaliacao_id):
    user, erro = _autorizado('editar')
    if erro:
        return erro

    avaliacao = _query_permitida(user).filter_by(
        id=avaliacao_id
    ).first()
    if not avaliacao:
        return jsonify({'error': 'Avaliação não encontrada'}), 404

    data = request.get_json(silent=True) or {}
    try:
        for campo in CAMPOS_NOTA:
            if campo in data:
                setattr(avaliacao, campo, _nota(data, campo))
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    if 'comentario' in data:
        avaliacao.comentario = (
            (data.get('comentario') or '').strip()[:5000]
            or None
        )
    if 'recomendaria' in data:
        avaliacao.recomendaria = _booleano(
            data.get('recomendaria'),
            avaliacao.recomendaria
        )

    try:
        db.session.commit()
        try:
            create_log(
                user=user,
                action='update_fornecedor_avaliacao',
                entity='fornecedor_avaliacao',
                entity_id=avaliacao.id,
                details={'avaliacao': avaliacao.to_dict()},
                req=request
            )
        except Exception:
            pass
        return jsonify(avaliacao.to_dict()), 200
    except Exception:
        db.session.rollback()
        return jsonify({
            'error': 'Não foi possível atualizar a avaliação'
        }), 500


@fornecedor_avaliacao_bp.route(
    '/<int:avaliacao_id>',
    methods=['DELETE']
)
def excluir_avaliacao(avaliacao_id):
    user, erro = _autorizado('excluir')
    if erro:
        return erro

    avaliacao = _query_permitida(user).filter_by(
        id=avaliacao_id
    ).first()
    if not avaliacao:
        return jsonify({'error': 'Avaliação não encontrada'}), 404

    snapshot = avaliacao.to_dict()
    try:
        db.session.delete(avaliacao)
        db.session.commit()
        try:
            create_log(
                user=user,
                action='delete_fornecedor_avaliacao',
                entity='fornecedor_avaliacao',
                entity_id=avaliacao_id,
                details={'deleted': snapshot},
                req=request
            )
        except Exception:
            pass
        return jsonify({'ok': True}), 200
    except Exception:
        db.session.rollback()
        return jsonify({
            'error': 'Não foi possível excluir a avaliação'
        }), 500
'''


def fail(message):
    print("ERRO: {}".format(message))
    sys.exit(1)


for required in (APP, INIT, APP / "models", APP / "routes"):
    if not required.exists():
        fail(
            "execute este script em /var/www/cmms_project/backend "
            "(não encontrei {})".format(required)
        )


original_init = INIT.read_text(encoding="utf-8")
new_init = original_init

import_line = (
    "        from .routes.fornecedor_avaliacao_routes "
    "import fornecedor_avaliacao_bp\n"
)
register_line = (
    "        app.register_blueprint("
    "fornecedor_avaliacao_bp, url_prefix="
    "'/api/compras/classificacao-fornecedores')\n"
)

if "fornecedor_avaliacao_bp" not in new_init:
    import_anchor = (
        "        from .routes.oc_portal_routes"
        "           import oc_portal_bp\n"
    )
    register_anchor = (
        "        app.register_blueprint(oc_portal_bp,"
        "             url_prefix='/api/oc')\n"
    )
    if import_anchor not in new_init:
        fail(
            "não encontrei o ponto de importação em app/__init__.py; "
            "nenhum arquivo foi alterado"
        )
    if register_anchor not in new_init:
        fail(
            "não encontrei o ponto de registro em app/__init__.py; "
            "nenhum arquivo foi alterado"
        )
    new_init = new_init.replace(
        import_anchor,
        import_anchor + import_line,
        1
    )
    new_init = new_init.replace(
        register_anchor,
        register_anchor + register_line,
        1
    )


targets = (INIT, MODEL, ROUTE)
backups = {}
for target in targets:
    if target.exists():
        backup = target.with_name(
            target.name + ".bak-classificacao-" + STAMP
        )
        shutil.copy2(target, backup)
        backups[target] = backup
        print("Backup criado: {}".format(backup))


try:
    MODEL.write_text(MODEL_CONTENT, encoding="utf-8")
    ROUTE.write_text(ROUTE_CONTENT, encoding="utf-8")
    INIT.write_text(new_init, encoding="utf-8")

    for target in targets:
        py_compile.compile(str(target), doraise=True)

    sys.path.insert(0, str(ROOT))
    from app import create_app, db
    from app.models.fornecedor_avaliacao import FornecedorAvaliacao

    app = create_app()
    with app.app_context():
        FornecedorAvaliacao.__table__.create(
            bind=db.engine,
            checkfirst=True
        )

except Exception as exc:
    for target in targets:
        if target in backups:
            shutil.copy2(backups[target], target)
        elif target.exists():
            target.unlink()
    print("ERRO: {}".format(exc))
    print("Arquivos restaurados automaticamente.")
    sys.exit(1)


print()
print("=" * 60)
print("CLASSIFICAÇÃO DE FORNECEDORES — BACKEND INSTALADO")
print("=" * 60)
print("Tabela: fornecedor_avaliacoes")
print("API: /api/compras/classificacao-fornecedores")
print("Sintaxe e criação da tabela validadas.")
print("Agora reinicie o backend e execute os testes.")