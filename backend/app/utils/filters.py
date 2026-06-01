from ..models.empresa import Empresa

def get_all_sub_company_ids(empresa_id):
    if empresa_id is None:
        return []
    ids = [empresa_id]
    sub_empresas = Empresa.query.filter_by(parent_id=empresa_id).all()
    for sub in sub_empresas:
        ids.extend(get_all_sub_company_ids(sub.id))
    return ids

def _empty(query, model):
    # Query vazia de forma genérica
    return query.filter(model.id == -1)

def apply_entity_filter(query, model, empresa_id, user=None):
    """
    Filtro multi-empresa para models que possuem model.empresa_id.

    Roles suportados:
      - super_admin: vê tudo; filtra se passar empresa_id
      - admin: limitado à empresa do usuário (e sub)
      - marketing: limitado à empresa do usuário (e sub)
      - relatorios: limitado à empresa do usuário (e sub)
      - gestao_documentos: limitado à empresa do usuário (e sub)
      - self_service: limitado à empresa do usuário (e sub)
      - publico: bloqueado
    """

    # Se não tem user (rota pública/sem token), aplica apenas se vier empresa_id
    if not user:
        if not empresa_id or empresa_id in ('all', 'none', 'null'):
            return query
        try:
            e_id = int(empresa_id)
            company_ids = get_all_sub_company_ids(e_id)
            return query.filter(model.empresa_id.in_(company_ids))
        except (ValueError, TypeError):
            return query

    # Público não acessa entidades corporativas
    if user.role == 'publico':
        return _empty(query, model)

    # super_admin
    if user.role == 'super_admin':
        if not empresa_id or empresa_id in ('all', 'none', 'null'):
            return query
        try:
            e_id = int(empresa_id)
            company_ids = get_all_sub_company_ids(e_id)
            return query.filter(model.empresa_id.in_(company_ids))
        except (ValueError, TypeError):
            return query

    # Perfis que SEMPRE devem ficar dentro da empresa do usuário
    tenant_roles = ('admin', 'marketing', 'relatorios', 'gestao_documentos', 'self_service')
    if user.role in tenant_roles:
        if not user.empresa_id:
            return _empty(query, model)

        allowed_ids = get_all_sub_company_ids(user.empresa_id)

        # Se veio empresa_id explícito, só permite se estiver dentro do allowed_ids
        if empresa_id and empresa_id not in ('all', 'none', 'null'):
            try:
                requested_id = int(empresa_id)
            except (ValueError, TypeError):
                return _empty(query, model)

            if requested_id not in allowed_ids:
                return _empty(query, model)

            company_ids = get_all_sub_company_ids(requested_id)
            return query.filter(model.empresa_id.in_(company_ids))

        # Sem filtro explícito => tudo dentro da empresa do usuário (e sub)
        return query.filter(model.empresa_id.in_(allowed_ids))

    # Default deny (segurança)
    return _empty(query, model)
