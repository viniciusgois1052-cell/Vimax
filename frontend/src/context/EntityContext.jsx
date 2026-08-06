import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const EntityContext = createContext();

export const EntityProvider = ({ children }) => {
  const { user } = useAuth();
  const [selectedEntity, setSelectedEntity] = useState(() => {
    return localStorage.getItem('selectedEntity') || 'all';
  });
  const [entities, setEntities] = useState([]);
  const [treeEntities, setTreeEntities] = useState([]);

  const fetchEntities = useCallback(async () => {
    try {
      const headers = {};
      if (user?.api_token) {
        headers['X-API-Token'] = user.api_token;
      }

      const response = await fetch('/api/empresas/', { headers });
      if (response.ok) {
        let data = await response.json();

        // Se o usuário não for super_admin, filtra pelas empresas permitidas
        if (user && user.role !== 'super_admin') {
          const getSubCompanyIds = (items, parentId) => {
            let ids = [parentId];
            items.filter(item => item.parent_id === parentId).forEach(sub => {
              ids = [...ids, ...getSubCompanyIds(items, sub.id)];
            });
            return ids;
          };
          // Usa empresas_ids (lista completa) ou fallback para empresa_id principal
          const baseIds = (user.empresas_ids && user.empresas_ids.length > 0)
            ? user.empresas_ids
            : (user.empresa_id ? [user.empresa_id] : []);
          let allAllowed = [];
          baseIds.forEach(id => { allAllowed = [...allAllowed, ...getSubCompanyIds(data, id)]; });
          const allowedIds = [...new Set(allAllowed)];
          data = data.filter(item => allowedIds.includes(item.id));
        }

        // Ordenar alfabeticamente por nome
        const sortedData = data.sort((a, b) => a.nome.localeCompare(b.nome));
        setEntities(sortedData);

        // Construir a árvore (lista linear com níveis para indentação)
        const buildTree = (items, parentId = null, level = 0) => {
          let result = [];
          const filtered = items.filter(item => item.parent_id === parentId);

          for (const item of filtered) {
            result.push({ ...item, level });
            const children = buildTree(items, item.id, level + 1);
            result = result.concat(children);
          }
          return result;
        };

        setTreeEntities(buildTree(sortedData));
      }
    } catch (error) {
      console.error('Erro ao buscar entidades:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user?.api_token) {
      fetchEntities();
    }
  }, [fetchEntities, user]);

  useEffect(() => {
    localStorage.setItem('selectedEntity', selectedEntity);
  }, [selectedEntity]);

  return (
    <EntityContext.Provider value={{
      selectedEntity,
      setSelectedEntity,
      entities,
      treeEntities,
      refreshEntities: fetchEntities
    }}>
      {children}
    </EntityContext.Provider>
  );
};

export const useEntity = () => useContext(EntityContext);
