import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { EntityProvider, useEntity } from './context/EntityContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Settings, MapPin, Users, FileText, DollarSign, Wrench, User, Mail, BarChart, Building2, Menu, X, Box, LogOut, ShieldCheck, Lock, Tag, Hammer, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'
import './App.css'

// Importar páginas
import Dashboard from './pages/Dashboard'
import Localizacoes from './pages/Localizacoes'
import Empresas from './pages/Empresas'
import Fornecedores from './pages/Fornecedores'
import Contratos from './pages/Contratos'
import Orcamentos from './pages/Orcamentos'
import Chamados from './pages/Chamados'
import Usuarios from './pages/Usuarios'
import ConfigEmail from './pages/ConfigEmail'
import Relatorios from './pages/Relatorios'
import Ativos from './pages/Ativos'
import CategoriasChamado from './pages/CategoriasChamado'
import TipoServico from './pages/TipoServico'
import TipoInfraestrutura from './pages/TipoInfraestrutura'
import Infraestrutura from './pages/Infraestrutura'
import FormularioChamadoAdmin from './pages/FormularioChamadoAdmin'
import FormularioChamadoPublico from './pages/FormularioChamadoPublico'
import AbrirChamadoPublico from './pages/AbrirChamadoPublico'
import PortalChamadoEmpresa from './pages/PortalChamadoEmpresa'

function Navigation({ isCollapsed, toggleCollapse }) {
  const location = useLocation()
  const { selectedEntity, setSelectedEntity, treeEntities } = useEntity()
  const { user, logout } = useAuth()
  
  if (user && user.role === 'publico') {
    return null;
  }

  const menuGroups = [
    {
      title: 'Helpdesk',
      items: [
        { path: '/chamados', icon: Wrench, label: 'Chamados', roles: ['super_admin', 'admin'] },
        { path: '/categorias-chamado', icon: Tag, label: 'Tipo Chamado', roles: ['super_admin', 'admin'] },
        { path: '/tipos-servico', icon: Hammer, label: 'Tipo Serviço', roles: ['super_admin', 'admin'] },
        { path: '/formularios-chamado', icon: FileText, label: 'Formulários Chamado', roles: ['super_admin', 'admin'] },
      ]
    },
    {
      title: 'Gestão de Documentos',
      items: [
        { path: '/contratos', icon: FileText, label: 'Contratos', roles: ['super_admin', 'admin'] },
        { path: '/orcamentos', icon: DollarSign, label: 'Orçamentos', roles: ['super_admin', 'admin'] },
      ]
    },
    {
      title: 'Gestão de Ativos',
      items: [
        { path: '/empresas', icon: Building2, label: 'Empresa', roles: ['super_admin', 'admin'] },
        { path: '/localizacoes', icon: MapPin, label: 'Localização', roles: ['super_admin', 'admin'] },
        { path: '/ativos', icon: Box, label: 'Ativos', roles: ['super_admin', 'admin'] },
        { path: '/fornecedores', icon: Users, label: 'Fornecedores', roles: ['super_admin', 'admin'] },
        { path: '/tipos-infraestrutura', icon: Hammer, label: 'Tipo Infraestrutura', roles: ['super_admin', 'admin'] },
        { path: '/infraestruturas', icon: Wrench, label: 'Infraestrutura', roles: ['super_admin', 'admin'] },
      ]
    },
    {
      title: 'BI',
      items: [
        { path: '/relatorios', icon: BarChart, label: 'Relatórios', roles: ['super_admin', 'admin', 'relatorios'] },
      ]
    },
    {
      title: 'Configurações',
      items: [
        { path: '/usuarios', icon: User, label: 'Usuários', roles: ['super_admin'] },
        { path: '/config-email', icon: Mail, label: 'Config. Email', roles: ['super_admin'] },
      ]
    }
  ]

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'
  const linkPadding = isCollapsed ? 'px-0 justify-center' : 'px-4'
  const logoFull = "http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Logo.png"
  const logoIcon = "http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Icone.png"

  return (
    <nav className={`bg-card border-r border-border h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-50 ${sidebarWidth}`}>
      <div className="p-4 border-b border-border flex items-center justify-between min-h-[80px]">
        <div className="flex items-center justify-center flex-1 overflow-hidden">
          {isCollapsed ? (
            <img src={logoIcon} alt="Vimax Icon" className="h-10 w-auto object-contain transition-all duration-300" />
          ) : (
            <img src={logoFull} alt="Vimax Logo" className="h-12 w-auto object-contain transition-all duration-300" />
          )}
        </div>
        <button onClick={toggleCollapse} className="p-2 rounded-full hover:bg-accent text-foreground transition-colors ml-2">
          {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="p-4 border-b border-border">
          <p className="text-[10px] text-muted-foreground mb-4 text-center uppercase tracking-widest font-bold">Grupo Digimax</p>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground px-1">Entidade / Empresa</label>
            <select 
              value={selectedEntity} 
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full bg-accent text-accent-foreground text-sm rounded-md border-none p-2 focus:ring-2 focus:ring-primary"
            >
              <option value="all">Ver Todas (Raiz)</option>
              {(treeEntities || []).map(entity => (
                <option key={entity.id} value={entity.id}>
                  {'\u00A0'.repeat(entity.level * 3)}
                  {entity.level > 0 ? '↳ ' : ''}
                  {entity.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {user && (
          <div className={`mb-6 p-3 bg-accent/50 rounded-xl ${isCollapsed ? 'text-center' : ''}`}>
            {!isCollapsed && <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Usuário</p>}
            <p className="text-sm font-bold truncate text-primary">{user.username}</p>
            {!isCollapsed && <p className="text-[10px] text-muted-foreground font-bold uppercase">{user.role.replace('_', ' ')}</p>}
          </div>
        )}

        <div className="space-y-6">
          {menuGroups.map((group, groupIdx) => {
            const filteredItems = group.items.filter(item => !user || item.roles.includes(user.role))
            if (filteredItems.length === 0) return null

            return (
              <div key={groupIdx} className="space-y-2">
                {!isCollapsed && (
                  <div className="px-4 mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/50 pb-1">
                      {group.title}
                    </p>
                  </div>
                )}
                <ul className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 ${linkPadding} ${
                            isActive 
                              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold' 
                              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                          title={isCollapsed ? item.label : ''}
                        >
                          <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                          {!isCollapsed && <span className="text-sm">{item.label}</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card/50">
        <button onClick={logout} className={`flex items-center gap-3 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all font-bold ${linkPadding}`}>
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm">Sair do Sistema</span>}
        </button>
      </div>
    </nav>
  )
}

function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(username, password)
    if (!result.success) setError(result.error)
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 bg-white flex justify-center border-b border-slate-50">
          <img src="http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Logo.png" alt="Logo" className="h-16 w-auto object-contain" />
        </div>
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Bem-vindo</h1>
            <p className="text-slate-500 text-sm mt-1">Faça login para acessar o sistema</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">{error}</div>}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase ml-1">Usuário</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="Seu usuário" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase ml-1">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="Sua senha" required />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50">
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { user, logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [alertas, setAlertas] = useState([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const checkAlertas = async () => {
      if (user && user.role === 'publico') return;

      if (user && !sessionStorage.getItem('alertas_vistos')) {
        try {
          const headers = user.api_token ? { 'X-API-Token': user.api_token } : {}
          const response = await fetch('/api/contratos/alertas-expiracao', { headers })
          if (response.ok) {
            const data = await response.json()
            if (data && data.length > 0) {
              setAlertas(data)
              setShowModal(true)
              sessionStorage.setItem('alertas_vistos', 'true')
            }
          }
        } catch (error) {
          console.error("Erro ao buscar alertas:", error)
        }
      }
    }
    checkAlertas()
  }, [user])

  // Permitir acesso ao portal sem login no sistema administrativo
  const isPortalRoute = window.location.pathname.match(/^\/portal\/\d+$/);
  if (!user && !isPortalRoute) return <LoginPage />
  
  // Se for rota do portal e não tem usuário, renderiza o portal (ele tem seu próprio login)
  if (!user && isPortalRoute) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 p-8 transition-all duration-300">
          <Routes>
            <Route path="/portal/:empresa_id" element={<PortalChamadoEmpresa />} />
          </Routes>
        </main>
      </div>
    )
  }

  const isPublicUser = user.role === 'publico';
  const mainMargin = isPublicUser ? 'ml-0' : (isCollapsed ? 'ml-20' : 'ml-64');

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      <main className={`flex-1 p-8 transition-all duration-300 ${mainMargin}`}>
        {user && isPublicUser && (
          <div className="fixed top-4 right-4 z-[60]">
            <button onClick={logout} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-500 rounded-xl font-bold shadow-sm hover:bg-red-50 transition-all">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
        <Routes>
          {/* Rota do Portal - Acessível sem login administrativo */}
          <Route path="/portal/:empresa_id" element={<PortalChamadoEmpresa />} />
          
          {/* Rotas administrativas - Requerem login */}
          {user && !isPublicUser ? (
            <>
              <Route path="/" element={<Navigate to="/chamados" replace />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/localizacoes" element={<Localizacoes />} />
              <Route path="/ativos" element={<Ativos />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
              <Route path="/contratos" element={<Contratos />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
              <Route path="/chamados" element={<Chamados />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/config-email" element={<ConfigEmail />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/categorias-chamado" element={<CategoriasChamado />} />
              <Route path="/tipos-servico" element={<TipoServico />} />
              <Route path="/tipos-infraestrutura" element={<TipoInfraestrutura />} />
              <Route path="/infraestruturas" element={<Infraestrutura />} />
              <Route path="/formularios-chamado" element={<FormularioChamadoAdmin />} />
            </>
          ) : (
            <>
              <Route path="/formulario-chamado/:id" element={<FormularioChamadoPublico />} />
              <Route path="/abrir-chamado/:id" element={<AbrirChamadoPublico />} />
              <Route path="*" element={<div className="flex items-center justify-center h-full text-muted-foreground">Acesso restrito via QR Code</div>} />
            </>
          )}
        </Routes>
      </main>

      {showModal && alertas.length > 0 && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Atenção: Contratos que Requerem Ação</h2>
                <p className="text-red-100 text-sm">Existem {alertas.length} contrato(s) que precisam de sua atenção imediata.</p>
              </div>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {alertas.map((alerta, idx) => {
                  const isVencido = alerta.status === 'VENCIDO'
                  return (
                    <div key={idx} className={`p-4 rounded-2xl border-l-4 ${
                      isVencido 
                        ? 'bg-red-50 border-red-500' 
                        : 'bg-amber-50 border-amber-500'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${
                              isVencido ? 'bg-red-600' : 'bg-amber-600'
                            }`}>
                              {isVencido ? 'VENCIDO' : 'AVISO'}
                            </span>
                            <p className={`font-bold ${isVencido ? 'text-red-800' : 'text-amber-800'}`}>
                              Contrato #{alerta.numero}
                            </p>
                          </div>
                          <p className={`text-sm mb-1 ${isVencido ? 'text-red-700' : 'text-amber-700'}`}>
                            <strong>Fornecedor:</strong> {alerta.fornecedor_nome}
                          </p>
                          <p className={`text-sm mb-2 ${isVencido ? 'text-red-700' : 'text-amber-700'}`}>
                            <strong>Data de Vencimento:</strong> {new Date(alerta.data_fim).toLocaleDateString('pt-BR')}
                          </p>
                          <p className={`text-xs font-bold ${isVencido ? 'text-red-600' : 'text-amber-600'}`}>
                            {isVencido ? `⚠️ Vencido há ${Math.abs(alerta.dias_restantes)} dia(s)` : `📅 Vence em ${alerta.dias_restantes} dia(s)`}
                          </p>
                          {alerta.observacao && (
                            <p className={`text-xs mt-2 italic ${isVencido ? 'text-red-600' : 'text-amber-600'}`}>
                              <strong>Obs:</strong> {alerta.observacao}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all active:scale-95"
              >
                Entendi, Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <EntityProvider>
        <Router>
          <AppContent />
        </Router>
      </EntityProvider>
    </AuthProvider>
  )
}

export default App
