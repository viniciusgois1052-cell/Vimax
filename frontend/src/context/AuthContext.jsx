import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const login = async (username, password) => {
    try {
      const response = await fetch('/api/usuarios/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        sessionStorage.removeItem('alertas_vistos');
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Erro ao fazer login' };
      }
    } catch (error) {
      return { success: false, error: 'Erro de conexão com o servidor' };
    }
  };

  const logout = async () => {
    try {
      const token = user?.api_token;
      if (token) {
        await fetch('/api/usuarios/logout', {
          method: 'POST',
          headers: { 'X-API-Token': token }
        });
      }
    } catch (_) {
      // Mesmo se falhar, limpa o frontend
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('selectedEntity');
      sessionStorage.removeItem('alertas_vistos');
    }
  };

  const handleTokenExpired = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('selectedEntity');
    sessionStorage.removeItem('alertas_vistos');
  };

  const refreshUser = async () => {
    try {
      const token = user?.api_token
      if (!token) return
      const res = await fetch(`/api/usuarios/${user.id}`, {
        headers: { 'X-API-Token': token }
      })
      if (res.ok) {
        const updated = await res.json()
        updated.api_token = token
        setUser(updated)
        localStorage.setItem('user', JSON.stringify(updated))
      }
    } catch (_) {}
  }

  /**
   * Verifica se o usuário tem permissão para uma ação em um módulo.
   *
   * Regras:
   *  - super_admin → SEMPRE tem acesso total, sem exceção
   *  - admin SEM perfil_acesso → acesso total (comportamento legado)
   *  - qualquer role COM perfil_acesso → segue estritamente as permissões do perfil
   *  - qualquer role SEM perfil_acesso e não sendo super_admin/admin → sem acesso
   *
   * @param {string} modulo  - ex: 'contratos', 'chamados', 'usuarios'
   * @param {string} acao    - 'ver', 'criar', 'editar', 'excluir'
   * @returns {boolean}
   */
  const can = (modulo, acao) => {
    if (!user) return false

    // super_admin tem acesso total SEMPRE — sem exceção
    if (user.role === 'super_admin') return true

    // admin SEM perfil customizado → acesso total (compatibilidade legada)
    if (user.role === 'admin' && !user.perfil_acesso) return true

    // Com perfil customizado → segue estritamente o perfil
    if (user.perfil_acesso) {
      const chave = `${modulo}_${acao}`
      return !!user.perfil_acesso[chave]
    }

    // Demais roles sem perfil → sem acesso via can()
    return false
  }

  /**
   * Verifica permissões específicas de compras
   * 
   * @param {string} tipo - 'ver_somente_proprias', 'pode_requisitar', 'pode_marcar_recebimento', 'ver_somente_empresa'
   * @returns {boolean}
   */
  const canCompras = (tipo) => {
    if (!user) return false
    if (user.role === 'super_admin') return true
    
    if (user.perfil_acesso) {
      switch(tipo) {
        case 'ver_somente_proprias':
          return user.perfil_acesso.compras_ver_somente_proprias === true
        case 'pode_requisitar':
          return user.perfil_acesso.compras_pode_requisitar === true
        case 'pode_marcar_recebimento':
          return user.perfil_acesso.compras_pode_marcar_recebimento === true
        case 'ver_somente_empresa':
          return user.perfil_acesso.compras_ver_somente_empresa === true
        default:
          return false
      }
    }
    
    return user.role === 'admin'
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, handleTokenExpired, refreshUser, can, canCompras }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
