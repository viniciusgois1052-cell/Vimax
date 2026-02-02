import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { EntityProvider, useEntity } from './context/EntityContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Settings, MapPin, Users, FileText, DollarSign, Wrench, User, Mail, BarChart, Building2, Menu, X, Box, LogOut, ShieldCheck, Lock, Tag, Hammer, AlertTriangle } from 'lucide-react'
import './App.css'
import { useState, useEffect } from 'react'

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
import AbrirChamadoPublico from './pages/AbrirChamadoPublico'

function Navigation({ isCollapsed, toggleCollapse }) {
  const location = useLocation()
  const { selectedEntity, setSelectedEntity, treeEntities } = useEntity()
  const { user, logout } = useAuth()
  
  const allMenuItems = [
    { path: '/', icon: Settings, label: 'Dashboard', roles: ['super_admin', 'admin', 'relatorios'] },
    { path: '/empresas', icon: Building2, label: 'Empresas', roles: ['super_admin', 'admin'] },
    { path: '/localizacoes', icon: MapPin, label: 'Localizações', roles: ['super_admin', 'admin'] },
    { path: '/ativos', icon: Box, label: 'Ativos', roles: ['super_admin', 'admin'] },
    { path: '/fornecedores', icon: Users, label: 'Fornecedores', roles: ['super_admin', 'admin'] },
    { path: '/contratos', icon: FileText, label: 'Contratos', roles: ['super_admin', 'admin'] },
    { path: '/orcamentos', icon: DollarSign, label: 'Orçamentos', roles: ['super_admin', 'admin'] },
    { path: '/chamados', icon: Wrench, label: 'Chamados', roles: ['super_admin', 'admin'] },
    { path: '/usuarios', icon: User, label: 'Usuários', roles: ['super_admin'] },
    { path: '/config-email', icon: Mail, label: 'Config. Email', roles: ['super_admin'] },
    { path: '/relatorios', icon: BarChart, label: 'Relatórios', roles: ['super_admin', 'admin', 'relatorios'] },
    { path: '/categorias-chamado', icon: Tag, label: 'Categorias de Chamados', roles: ['super_admin', 'admin'] },
    { path: '/tipos-servico', icon: Hammer, label: 'Tipos de Serviço', roles: ['super_admin', 'admin'] },
  ]

  const menuItems = allMenuItems.filter(item => !user || item.roles.includes(user.role))
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
      
      <div className="flex-1 overflow-y-auto p-4">
        {user && (
          <div className={`mb-4 p-2 bg-accent/50 rounded-lg ${isCollapsed ? 'text-center' : ''}`}>
            {!isCollapsed && <p className="text-[10px] uppercase font-bold text-muted-foreground">Usuário</p>}
            <p className="text-sm font-medium truncate">{user.username}</p>
            {!isCollapsed && <p className="text-[10px] text-primary font-bold uppercase">{user.role.replace('_', ' ')}</p>}
          </div>
        )}
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 py-3 rounded-lg transition-all duration-200 ${linkPadding} ${
                    isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="p-4 border-t border-border">
        <button onClick={logout} className={`flex items-center gap-3 py-2 w-full rounded-lg text-red-500 hover:bg-red-50 transition-all ${linkPadding}`}>
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Sair</span>}
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
        <div className="p-8 bg-primary flex justify-center">
          <img src="http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Logo.png" alt="Logo" className="h-16 w-auto brightness-0 invert" />
        </div>
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Bem-vindo ao CMMS</h1>
            <p className="text-slate-500 text-sm mt-1">Faça login para acessar o sistema</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">{error}</div>}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase ml-1">Usuário</label>
              <input type="text" value={username} onChange={(e ) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="Seu usuário" required />
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
  const { user } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [alertas, setAlertas] = useState([])
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const checkAlertas = async () => {
      // O sessionStorage garante que o alerta só apareça uma vez por sessão (após o login)
      // Ele é limpo quando a aba é fechada, mas persiste em navegação normal.
      // Se você quiser que apareça APENAS no momento exato do login, usamos uma flag temporária.
      if (user && !sessionStorage.getItem('alertas_vistos')) {
        try {
          const headers = user.api_token ? { 'X-API-Token': user.api_token } : {}
          const response = await fetch('/api/contratos/alertas', { headers })
          if (response.ok) {
            const data = await response.json()
            if (data && data.length > 0) {
              setAlertas(data)
              setShowModal(true)
              // Marca como visto para não aparecer no F5
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

  if (!user) return <LoginPage />

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      <main className={`flex-1 p-8 transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
          <Route path="/abrir-chamado/:id" element={<AbrirChamadoPublico />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Modal de Alerta de Vencimento */}
      {showModal && alertas.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="p-6 bg-orange-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">Atenção: Contratos a Vencer</h2>
                  <p className="text-orange-100 text-xs font-bold">Existem contratos que precisam de sua atenção imediata.</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {alertas.map((alerta) => (
                  <div key={alerta.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-orange-300 transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-black rounded uppercase">Vence em {alerta.dias_restantes} dias</span>
                        <h3 className="font-bold text-slate-800">Contrato: {alerta.numero}</h3>
                      </div>
                      <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {alerta.empresa_nome}
                      </p>
                      <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" /> Fornecedor: {alerta.fornecedor_nome}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Vencimento</p>
                      <p className="font-black text-slate-700">{new Date(alerta.data_fim).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="px-8 py-3 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-900 transition-all active:scale-95"
              >
                Entendido, vou verificar
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
