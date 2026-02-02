from ..models.empresa import Empresa

def get_all_sub_company_ids(empresa_id):
    if empresa_id is None: return []
    ids = [empresa_id]
    sub_empresas = Empresa.query.filter_by(parent_id=empresa_id).all()
    for sub in sub_empresas:
        ids.extend(get_all_sub_company_ids(sub.id))
    return ids

def apply_entity_filter(query, model, empresa_id, user=None):
    if user and user.role == 'super_admin':
        if not empresa_id or empresa_id == 'all' or empresa_id == 'none' or empresa_id == 'null':
            return query
        try:
            e_id = int(empresa_id)
            company_ids = get_all_sub_company_ids(e_id)
            return query.filter(model.empresa_id.in_(company_ids))
        except (ValueError, TypeError):
            return query

    if user and (user.role == 'admin' or user.role == 'relatorios'):
        if not user.empresa_id: return query.filter(model.id == -1)
        allowed_ids = get_all_sub_company_ids(user.empresa_id)
        if empresa_id and empresa_id != 'all' and empresa_id != 'none' and empresa_id != 'null':
            try:
                requested_id = int(empresa_id)
                if requested_id in allowed_ids:
                    company_ids = get_all_sub_company_ids(requested_id)
                    return query.filter(model.empresa_id.in_(company_ids))
                else:
                    return query.filter(model.id == -1)
            except (ValueError, TypeError): pass
        return query.filter(model.empresa_id.in_(allowed_ids))

    if not empresa_id or empresa_id == 'all' or empresa_id == 'none' or empresa_id == 'null':
        return query
    try:
        e_id = int(empresa_id)
        company_ids = get_all_sub_company_ids(e_id)
        return query.filter(model.empresa_id.in_(company_ids))
    except (ValueError, TypeError):
        return query
