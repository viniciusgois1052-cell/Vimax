import json
from datetime import datetime
from flask import request as _flask_request
from .. import db
from ..models.log import Log

def create_log(user=None, action='', entity=None, entity_id=None, details=None, req=None):
    """
    Grava um log na tabela `logs`.
    Parâmetros:
      - user: objeto usuário (pode ser None)
      - action: string curta descrevendo a ação (ex: 'create_chamado')
      - entity: recurso afetado (ex: 'chamado', 'ativo')
      - entity_id: id do recurso (opcional)
      - details: dict ou string com contexto adicional (será convertido para string)
      - req: request do Flask (opcional) — usado para obter IP / headers
    Retorna o objeto Log criado ou None em caso de erro.
    """
    try:
        req = req or _flask_request
        ip = None
        try:
            ip = req.headers.get('X-Forwarded-For', req.remote_addr)
        except Exception:
            ip = None

        user_id = None
        username = None
        if user:
            user_id = getattr(user, 'id', None)
            username = getattr(user, 'username', None) or getattr(user, 'email', None)

        if details is not None:
            if isinstance(details, str):
                details_str = details
            else:
                try:
                    details_str = json.dumps(details, default=str, ensure_ascii=False)
                except Exception:
                    details_str = str(details)
        else:
            details_str = None

        log = Log(
            timestamp=datetime.utcnow(),
            user_id=user_id,
            username=username,
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            action=action,
            details=details_str,
            ip=ip
        )
        db.session.add(log)
        db.session.commit()
        return log
    except Exception as e:
        try:
            db.session.rollback()
        except Exception:
            pass
        # Não lançar exceção: o logger não deve quebrar a operação principal
        print("create_log error:", e)
        return None
