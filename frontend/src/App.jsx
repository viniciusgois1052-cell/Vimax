import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { EntityProvider, useEntity } from './context/EntityContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { MapPin, Users, FileText, DollarSign, Wrench, User, Mail, BarChart, Building2, Menu, X, Box, LogOut, Lock, Tag, Hammer, AlertTriangle, Bell, Send, Wifi, Database, Printer, TrendingUp } from 'lucide-react'
import './App.css'

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
import Lembretes from './pages/Lembretes'
import MarketingContatos from './pages/MarketingContatos'
import MarketingGrupos from './pages/MarketingGrupos'
import MarketingSmtp from './pages/MarketingSmtp'
import MarketingModelos from './pages/MarketingModelos'
import MarketingCampanhas from './pages/MarketingCampanhas'
import Logs from './pages/Logs'
import CRM from './pages/CRM/CRM'
import Mobilemed from './pages/Mobilemed'

const ADMIN_ROLES     = ['super_admin', 'admin']
const MARKETING_ROLES = ['super_admin', 'admin', 'marketing']
const ALL_INTERNAL    = ['super_admin', 'admin', 'relatorios', 'self_service']

function AcessoRestrito({ mensagem = 'Você não tem permissão para acessar esta página.' }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
      <Lock className="w-12 h-12 opacity-30" />
      <p className="font-bold text-lg">Acesso restrito</p>
      <p className="text-sm">{mensagem}</p>
    </div>
  )
}

function Navigation({ isCollapsed, toggleCollapse }) {
  const location = useLocation()
  const { selectedEntity, setSelectedEntity, treeEntities } = useEntity()
  const { user, logout } = useAuth()

  if (!user || user.role === 'publico') return null

  const isSelfService = user.role === 'self_service'
  const isMarketing   = user.role === 'marketing'

  const menuGroups = [
    {
      title: 'Helpdesk',
      items: [
        { path: '/chamados',            icon: Wrench,    label: 'Chamados',            roles: ALL_INTERNAL },
        { path: '/categorias-chamado',  icon: Tag,       label: 'Tipo Chamado',        roles: ADMIN_ROLES },
        { path: '/tipos-servico',       icon: Hammer,    label: 'Tipo Servico',        roles: ADMIN_ROLES },
        { path: '/formularios-chamado', icon: FileText,  label: 'Formularios Chamado', roles: ADMIN_ROLES },
      ]
    },
    {
      title: 'Gestão de Documentos',
      items: [
        { path: '/contratos',  icon: FileText,   label: 'Contratos',      roles: ADMIN_ROLES },
        { path: '/orcamentos', icon: DollarSign, label: 'Orcamentos',     roles: ADMIN_ROLES },
        { path: '/lembretes',  icon: Bell,       label: 'Meus Lembretes', roles: ['super_admin', 'admin', 'relatorios'] },
      ]
    },
    {
      title: 'Gestão de Ativos',
      items: [
        { path: '/empresas',              icon: Building2, label: 'Empresa',               roles: ADMIN_ROLES },
        { path: '/localizacoes',          icon: MapPin,    label: 'Localizacao',           roles: ADMIN_ROLES },
        { path: '/ativos',                icon: Box,       label: 'Ativos',                roles: ADMIN_ROLES },
        { path: '/fornecedores',          icon: Users,     label: 'Fornecedores',          roles: ADMIN_ROLES },
        { path: '/tipos-infraestrutura',  icon: Hammer,    label: 'Tipo Infraestrutura',   roles: ADMIN_ROLES },
        { path: '/infraestruturas',       icon: Wrench,    label: 'Infraestrutura',        roles: ADMIN_ROLES },
        { path: '/contadores-impressora', icon: Printer,   label: 'Contadores Impressora', roles: ADMIN_ROLES },
      ]
    },
    {
      title: 'BI',
      items: [
        { path: '/relatorios', icon: BarChart, label: 'Relatorios', roles: ['super_admin', 'admin', 'relatorios'] },
      ]
    },
    {
      title: 'CRM',
      items: [
        { path: '/crm', icon: TrendingUp, label: 'CRM', roles: MARKETING_ROLES },
      ]
    },
    {
      title: 'Email Marketing',
      items: [
        { path: '/marketing/contatos',  icon: Users,    label: 'Contatos',     roles: MARKETING_ROLES },
        { path: '/marketing/grupos',    icon: Tag,      label: 'Grupos',       roles: MARKETING_ROLES },
        { path: '/marketing/smtp',      icon: Wifi,     label: 'Config. SMTP', roles: MARKETING_ROLES },
        { path: '/marketing/modelos',   icon: FileText, label: 'Modelos',      roles: MARKETING_ROLES },
        { path: '/marketing/campanhas', icon: Send,     label: 'Campanhas',    roles: MARKETING_ROLES },
      ]
    },
    {
      title: 'Configurações',
      items: [
        { path: '/mobilemed',    icon: Database, label: 'Mobilemed API', roles: ['super_admin'] },
        { path: '/usuarios',     icon: User,     label: 'Usuarios',      roles: ['super_admin'] },
        { path: '/config-email', icon: Mail,     label: 'Config. Email', roles: ['super_admin'] },
        { path: '/logs',         icon: FileText, label: 'Logs',          roles: ['super_admin'] },
      ]
    }
  ]

  const sidebarWidth = isCollapsed ? 'w-20' : 'w-64'
  const linkPadding  = isCollapsed ? 'px-0 justify-center' : 'px-4'
  const logoFull = "http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Logo.png"
  const logoIcon = "http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Icone.png"

  return (
    <nav className={`bg-card border-r border-border h-screen fixed left-0 top-0 flex flex-col transition-all duration-300 z-50 ${sidebarWidth}`}>
      <div className="p-4 border-b border-border flex items-center justify-between min-h-[80px]">
        <div className="flex items-center justify-center flex-1 overflow-hidden">
          {isCollapsed
            ? <img src={logoIcon} alt="Vimax Icon" className="h-10 w-auto object-contain transition-all duration-300" />
            : <img src={logoFull} alt="Vimax Logo" className="h-12 w-auto object-contain transition-all duration-300" />
          }
        </div>
        <button onClick={toggleCollapse} className="p-2 rounded-full hover:bg-accent text-foreground transition-colors ml-2">
          {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </button>
      </div>

      {!isCollapsed && !isSelfService && !isMarketing && (
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
                  {'\u00A0'.repeat(entity.level * 3)}{entity.level > 0 ? '↳ ' : ''}{entity.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!isCollapsed && isMarketing && user.empresa_nome && (
        <div className="p-4 border-b border-border bg-pink-50/50">
          <p className="text-[10px] text-pink-500 font-bold uppercase tracking-widest text-center">Email Marketing</p>
          <p className="text-xs font-bold text-center text-foreground mt-1 truncate">{user.empresa_nome}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {user && (
          <div className={`mb-6 p-3 bg-accent/50 rounded-xl ${isCollapsed ? 'text-center' : ''}`}>
            {!isCollapsed && <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Usuario</p>}
            <p className="text-sm font-bold truncate text-primary">{user.username}</p>
            {!isCollapsed && (
              <p className="text-[10px] text-muted-foreground font-bold uppercase">
                {user.role === 'self_service' ? 'Self Service'  :
                 user.role === 'marketing'    ? 'Email Marketing' :
                 user.role.replace('_', ' ')}
              </p>
            )}
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
                    const isActive = location.pathname.startsWith(item.path)
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
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

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
            <p className="text-slate-500 text-sm mt-1">Faca login para acessar o sistema</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">{error}</div>}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase ml-1">Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                placeholder="Seu usuario" required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase ml-1">Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                placeholder="Sua senha" required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50">
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
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const [alertasContrato, setAlertasContrato] = useState([])
  const [alertasLembrete, setAlertasLembrete] = useState([])
  const [showModal,       setShowModal]       = useState(false)
  const [abaModal,        setAbaModal]        = useState('contratos')

  const sessionKey = user ? `alertas_modal_visto_${user.id || user.username}` : null

  useEffect(() => {
    const checkAlertas = async () => {
      if (!user || ['publico', 'self_service', 'marketing'].includes(user.role)) return
      if (sessionKey && sessionStorage.getItem(sessionKey)) return
      const headers = user.api_token ? { 'X-API-Token': user.api_token } : {}
      try {
        const res = await fetch('/api/contratos/alertas', { headers })
        if (res.ok) { const data = await res.json(); if (data?.length > 0) setAlertasContrato(data) }
      } catch (err) { console.error(err) }
      try {
        const res = await fetch('/api/lembretes/alertas', { headers })
        if (res.ok) { const data = await res.json(); if (data?.length > 0) setAlertasLembrete(data) }
      } catch (err) { console.error(err) }
    }
    checkAlertas()
  }, [user])

  useEffect(() => {
    if (alertasContrato.length > 0 || alertasLembrete.length > 0) {
      setAbaModal(alertasContrato.length > 0 ? 'contratos' : 'lembretes')
      setShowModal(true)
    }
  }, [alertasContrato, alertasLembrete])

  const handleCloseModal = () => {
    setShowModal(false)
    if (sessionKey) sessionStorage.setItem(sessionKey, '1')
  }

  const isPortalRoute = window.location.pathname.match(/^\/portal\/\d+$/)
  if (!user && !isPortalRoute) return <LoginPage />

  if (!user && isPortalRoute) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/portal/:empresa_id" element={<PortalChamadoEmpresa />} />
          </Routes>
        </main>
      </div>
    )
  }

  const role          = user.role
  const isPublicUser  = role === 'publico'
  const isSelfService = role === 'self_service'
  const isAdmin       = role === 'admin' || role === 'super_admin'
  const isSuperAdmin  = role === 'super_admin'
  const isRelatorios  = role === 'relatorios'
  const isMarketing   = role === 'marketing'
  const isCRMRoute    = location.pathname.startsWith("/crm")
  const mainMargin    = isPublicUser ? "ml-0" : isCRMRoute ? (isCollapsed ? "ml-20" : "ml-64") : (isCollapsed ? "ml-20" : "ml-64")
  const mainPadding   = isCRMRoute ? 'p-0' : 'p-8'

  const renderRoutes = () => {
    if (isPublicUser) {
      return (
        <Routes>
          <Route path="/portal/:empresa_id"     element={<PortalChamadoEmpresa />} />
          <Route path="/formulario-chamado/:id" element={<FormularioChamadoPublico />} />
          <Route path="/abrir-chamado/:id"      element={<AbrirChamadoPublico />} />
          <Route path="*" element={<div className="flex items-center justify-center h-full text-muted-foreground">Acesso restrito via QR Code</div>} />
        </Routes>
      )
    }

    if (isSelfService) {
      return (
        <Routes>
          <Route path="/portal/:empresa_id" element={<PortalChamadoEmpresa />} />
          <Route path="/"         element={<Navigate to="/chamados" replace />} />
          <Route path="/chamados" element={<Chamados />} />
          <Route path="*"         element={<AcessoRestrito mensagem="Seu perfil permite apenas visualizar e criar chamados." />} />
        </Routes>
      )
    }

    if (isMarketing) {
      return (
        <Routes>
          <Route path="/"                    element={<Navigate to="/marketing/campanhas" replace />} />
          <Route path="/marketing/contatos"  element={<MarketingContatos />} />
          <Route path="/marketing/grupos"    element={<MarketingGrupos />} />
          <Route path="/marketing/smtp"      element={<MarketingSmtp />} />
          <Route path="/marketing/modelos"   element={<MarketingModelos />} />
          <Route path="/marketing/campanhas" element={<MarketingCampanhas />} />
          <Route path="/crm/*"               element={<CRM />} />
          <Route path="*"                    element={<Navigate to="/marketing/campanhas" replace />} />
        </Routes>
      )
    }

    if (isRelatorios) {
      return (
        <Routes>
          <Route path="/portal/:empresa_id" element={<PortalChamadoEmpresa />} />
          <Route path="/"           element={<Navigate to="/relatorios" replace />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/lembretes"  element={<Lembretes />} />
          <Route path="*"           element={<Navigate to="/relatorios" replace />} />
        </Routes>
      )
    }

    if (isAdmin) {
      return (
        <Routes>
          <Route path="/portal/:empresa_id"        element={<PortalChamadoEmpresa />} />
          <Route path="/"                          element={<Navigate to="/chamados" replace />} />
          <Route path="/chamados"                  element={<Chamados />} />
          <Route path="/categorias-chamado"        element={<CategoriasChamado />} />
          <Route path="/tipos-servico"             element={<TipoServico />} />
          <Route path="/formularios-chamado"       element={<FormularioChamadoAdmin />} />
          <Route path="/contratos"                 element={<Contratos />} />
          <Route path="/orcamentos"                element={<Orcamentos />} />
          <Route path="/lembretes"                 element={<Lembretes />} />
          <Route path="/empresas"                  element={<Empresas />} />
          <Route path="/localizacoes"              element={<Localizacoes />} />
          <Route path="/ativos"                    element={<Ativos />} />
          <Route path="/fornecedores"              element={<Fornecedores />} />
          <Route path="/tipos-infraestrutura"      element={<TipoInfraestrutura />} />
          <Route path="/infraestruturas"           element={<Infraestrutura />} />
          <Route path="/relatorios"                element={<Relatorios />} />
          <Route path="/marketing/contatos"        element={<MarketingContatos />} />
          <Route path="/marketing/grupos"          element={<MarketingGrupos />} />
          <Route path="/marketing/smtp"            element={<MarketingSmtp />} />
          <Route path="/marketing/modelos"         element={<MarketingModelos />} />
          <Route path="/marketing/campanhas"       element={<MarketingCampanhas />} />
          <Route path="/crm/*"                     element={<CRM />} />
          <Route path="/mobilemed"                 element={isSuperAdmin ? <Mobilemed /> : <AcessoRestrito mensagem="Apenas Super Admin pode acessar o Mobilemed API." />} />
          <Route path="/usuarios"                  element={isSuperAdmin ? <Usuarios /> : <AcessoRestrito mensagem="Apenas Super Admin pode gerenciar usuarios." />} />
          <Route path="/config-email"              element={isSuperAdmin ? <ConfigEmail /> : <AcessoRestrito mensagem="Apenas Super Admin pode configurar o e-mail." />} />
          <Route path="/logs"                      element={isSuperAdmin ? <Logs /> : <AcessoRestrito mensagem="Apenas Super Admin pode acessar os logs." />} />
          <Route path="*"                          element={<Navigate to="/chamados" replace />} />
        </Routes>
      )
    }

    return (
      <Routes>
        <Route path="*" element={<AcessoRestrito />} />
      </Routes>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Navigation isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(!isCollapsed)} />
      <main className={`flex-1 transition-all duration-300 ${mainMargin} ${mainPadding} ${isCRMRoute ? "p-0 flex flex-col overflow-hidden" : ""}`} style={isCRMRoute ? {height: "calc(100vh - 64px)"} : {}}>
        {user && isPublicUser && (
          <div className="fixed top-4 right-4 z-[60]">
            <button onClick={logout} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-500 rounded-xl font-bold shadow-sm hover:bg-red-50 transition-all">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        )}
        {renderRoutes()}
      </main>

      {showModal && (alertasContrato.length > 0 || alertasLembrete.length > 0) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
            <div className={`p-6 text-white flex items-center gap-4 ${abaModal === 'contratos' ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-amber-400 to-amber-500'}`}>
              <div className="p-3 bg-white/20 rounded-2xl">
                {abaModal === 'contratos' ? <AlertTriangle size={28} /> : <Bell size={28} />}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{abaModal === 'contratos' ? 'Alertas do Sistema' : 'Seus Lembretes'}</h2>
                <p className={`text-sm ${abaModal === 'contratos' ? 'text-red-100' : 'text-amber-100'}`}>
                  {abaModal === 'contratos'
                    ? `${alertasContrato.length} contrato(s) precisam de atencao`
                    : `${alertasLembrete.length} lembrete(s) pendente(s)`}
                </p>
              </div>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50">
              <button onClick={() => setAbaModal('contratos')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border-b-2 ${abaModal === 'contratos' ? 'border-red-500 text-red-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <AlertTriangle size={14} /> Contratos
                {alertasContrato.length > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{alertasContrato.length}</span>}
              </button>
              <button onClick={() => setAbaModal('lembretes')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-all border-b-2 ${abaModal === 'lembretes' ? 'border-amber-500 text-amber-600 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                <Bell size={14} /> Lembretes
                {alertasLembrete.length > 0 && <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{alertasLembrete.length}</span>}
              </button>
            </div>

            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
              {abaModal === 'contratos' && alertasContrato.map((alerta, idx) => {
                const isVencido = alerta.status === 'VENCIDO'
                return (
                  <div key={idx} className={`p-4 rounded-2xl border-l-4 ${isVencido ? 'bg-red-50 border-red-500' : 'bg-amber-50 border-amber-500'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full text-white ${isVencido ? 'bg-red-600' : 'bg-amber-600'}`}>{isVencido ? 'VENCIDO' : 'AVISO'}</span>
                      <p className={`font-bold ${isVencido ? 'text-red-800' : 'text-amber-800'}`}>Contrato #{alerta.numero}</p>
                    </div>
                    <p className={`text-sm mb-1 ${isVencido ? 'text-red-700' : 'text-amber-700'}`}><strong>Fornecedor:</strong> {alerta.fornecedor_nome}</p>
                    <p className={`text-sm mb-2 ${isVencido ? 'text-red-700' : 'text-amber-700'}`}><strong>Vencimento:</strong> {new Date(alerta.data_fim).toLocaleDateString('pt-BR')}</p>
                    <p className={`text-xs font-bold ${isVencido ? 'text-red-600' : 'text-amber-600'}`}>
                      {isVencido ? `Vencido ha ${Math.abs(alerta.dias_restantes)} dia(s)` : `Vence em ${alerta.dias_restantes} dia(s)`}
                    </p>
                    {alerta.observacao && <p className={`text-xs mt-2 italic ${isVencido ? 'text-red-600' : 'text-amber-600'}`}><strong>Obs:</strong> {alerta.observacao}</p>}
                  </div>
                )
              })}

              {abaModal === 'lembretes' && alertasLembrete.map((l, idx) => {
                const hoje = new Date().toISOString().split('T')[0]
                const vencido = l.data_lembrete < hoje
                return (
                  <div key={idx} className={`p-4 rounded-2xl border-l-4 ${vencido ? 'bg-red-50 border-red-400' : 'bg-amber-50 border-amber-400'}`}>
                    <p className={`font-bold text-sm ${vencido ? 'text-red-800' : 'text-amber-800'}`}>{l.titulo}</p>
                    {l.descricao && <p className="text-xs text-slate-500 mt-0.5">{l.descricao}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <p className={`text-xs font-medium ${vencido ? 'text-red-500' : 'text-amber-600'}`}>
                        {new Date(l.data_lembrete + 'T00:00:00').toLocaleDateString('pt-BR')}
                        {vencido && ' — Em atraso'}
                      </p>
                      {l.contrato_numero && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                          Contrato #{l.contrato_numero}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-400">Alertas aparecem a cada login</p>
              <button onClick={handleCloseModal}
                className={`px-8 py-2.5 text-white rounded-xl font-bold transition-all ${abaModal === 'contratos' ? 'bg-slate-800 hover:bg-slate-900' : 'bg-amber-500 hover:bg-amber-600'}`}>
                Fechar
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
