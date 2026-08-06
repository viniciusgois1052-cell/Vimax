from sqlalchemy import or_
from ..models.empresa import Empresa

def get_all_sub_company_ids(empresa_id):
    if empresa_id is None: return []
    ids = [empresa_id]
    sub_empresas = Empresa.query.filter_by(parent_id=empresa_id).all()
    for sub in sub_empresas:
        ids.extend(get_all_sub_company_ids(sub.id))
    return ids

def get_all_allowed_ids(empresa_ids):
    """Expande lista de empresa_ids incluindo todas as sub-empresas de cada uma."""
    all_ids = []
    for eid in empresa_ids:
        all_ids.extend(get_all_sub_company_ids(eid))
    return list(set(all_ids))

def apply_entity_filter(query, model, empresa_id, user=None):
    # super_admin: acesso total
    if user and user.role == 'super_admin':
        if not empresa_id or empresa_id in ('all', 'none', 'null'):
            return query
        try:
            e_id = int(empresa_id)
            company_ids = get_all_sub_company_ids(e_id)
            return query.filter(model.empresa_id.in_(company_ids))
        except (ValueError, TypeError):
            return query

    # self_service: vê APENAS os dados da empresa vinculada (sem sub-empresas)
    if user and user.role == 'self_service':
        if not user.empresa_id: return query.filter(model.id == -1)
        return query.filter(model.empresa_id == user.empresa_id)

    # todos os demais roles (admin, marketing, relatorios, gestao_documentos,
    # e qualquer role com perfil customizado): restrito às empresas vinculadas
    if user:
        empresa_ids = user.get_empresa_ids()
        if not empresa_ids:
            return query.filter(model.id == -1)  # sem empresa = sem acesso
        allowed_ids = get_all_allowed_ids(empresa_ids)
        if empresa_id and empresa_id not in ('all', 'none', 'null'):
            try:
                requested_id = int(empresa_id)
                if requested_id in allowed_ids:
                    company_ids = get_all_sub_company_ids(requested_id)
                    return query.filter(model.empresa_id.in_(company_ids))
                else:
                    return query.filter(model.id == -1)
            except (ValueError, TypeError): pass
        return query.filter(model.empresa_id.in_(allowed_ids))

    # fallback sem user autenticado: filtra por empresa_id da query se informado
    if not empresa_id or empresa_id in ('all', 'none', 'null'):
        return query
    try:
        e_id = int(empresa_id)
        company_ids = get_all_sub_company_ids(e_id)
        return query.filter(model.empresa_id.in_(company_ids))
    except (ValueError, TypeError):
        return query