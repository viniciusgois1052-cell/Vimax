import React, { useState, useEffect, useMemo } from 'react'
import {
  UserPlus, Edit2, X, Trash2, Building2, Search,
  ShieldCheck, Users, AlertTriangle, CheckCircle2, Eye, EyeOff
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  super_admin:       { label: 'Super Admin',        color: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500' },
  admin:             { label: 'Admin',              color: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500' },
  gestao_documentos: { label: 'Gestão Docs',        color: 'bg-amber-100 text-amber-800',    dot: 'bg-amber-500' },
  self_service:      { label: 'Self Service',       color: 'bg-green-100 text-green-700',    dot: 'bg-green-500' },
  relatorios:        { label: 'Relatórios',         color: 'bg-yellow-100 text-yellow-700',  dot: 'bg-yellow-500' },
  publico:           { label: 'Público',            color: 'bg-indigo-100 text-indigo-600',  dot: 'bg-indigo-400' },
  marketing:         { label: 'Email Marketing',    color: 'bg-pink-100 text-pink-700',      dot: 'bg-pink-500' },
}

const ROLE_DESCRICOES = {
  super_admin:       'Acesso total ao sistema',
  admin:             'Vê tudo exceto config de e-mail do sistema',
  gestao_documentos: 'Acesso somente a Contratos, Clientes e Lembretes',
  self_service:      'Vê e cria chamados da empresa',
  relatorios:        'Somente leitura de relatórios',
  publico:           'Apenas abrir chamado via QR/portal',
  marketing:         'Acesso apenas ao Email Marketing da empresa',
}

const AVATAR_COLORS = [
  'bg-blue-500','bg-purple-500','bg-pink-500','bg-green-500',
  'bg-amber-500','bg-teal-500','bg-indigo-500','bg-rose-500',
]

function getAvatarColor(str = '') {
  let hash = 0
  for (let c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ name = '' }) {
  const initials = name.slice(0, 2).toUpperCase() || '??'
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${getAvatarColor(name)}`}>
      {initials}
    </div>
  )
}

function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600">Excluir</button>
        </div>
      </div>
    </div>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-bold transition-all
      ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {toast.message}
    </div>
  )
}

export default function Usuarios() {
  const { user: currentUser, can } = useAuth()
  const [usuarios,   setUsuarios]   = useState([])
  const [empresas,   setEmpresas]   = useState([])
  const [perfis,     setPerfis]     = useState([])
  const [loading,    setLoading]    = useState(false)
  const [editingId,  setEditingId]  = useState(null)
  const [search,     setSearch]     = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [showPass,   setShowPass]   = useState(false)
  const [confirm,    setConfirm]    = useState(null)
  const [toast,      setToast]      = useState(null)
  const [formData,   setFormData]   = useState({
    username: '', nome_completo: '', email: '', password: '',
    empresa_id: '', empresas_ids: [], role: 'admin', perfil_acesso_id: '',
  })

  useEffect(() => { fetchUsuarios(); fetchEmpresas(); fetchPerfis() }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const headers = (extra = {}) => ({
    ...extra,
    ...(currentUser?.api_token ? { 'X-API-Token': currentUser.api_token } : {})
  })

  const fetchUsuarios = async () => {
    const res = await fetch('/api/usuarios/', { headers: headers() })
    if (res.ok) setUsuarios(await res.json())
  }

  const fetchEmpresas = async () => {
    const res = await fetch('/api/empresas/', { headers: headers() })
    if (res.ok) setEmpresas(await res.json())
  }

  const fetchPerfis = async () => {
    const res = await fetch('/api/perfis-acesso', { headers: headers() })
    if (res.ok) setPerfis(await res.json())
  }

  const handleEdit = (u) => {
    setEditingId(u.id)
    setShowPass(false)
    setFormData({
      username:      u.username,
      nome_completo: u.nome_completo || '',
      email:         u.email,
      password:      '',
      empresa_id:    u.empresa_id ? u.empresa_id.toString() : 'none',
      empresas_ids:  Array.isArray(u.empresas_ids) ? u.empresas_ids.map(Number) : [],
      role:          u.role,
      perfil_acesso_id: u.perfil_acesso_id ? u.perfil_acesso_id.toString() : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setShowPass(false)
    setFormData({ username: '', nome_completo: '', email: '', password: '', empresa_id: '', empresas_ids: [], role: 'admin', perfil_acesso_id: '' })
  }

  const handleDelete = (u) => setConfirm(u)

  const confirmDelete = async () => {
    const { id, username } = confirm
    setConfirm(null)
    const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: headers() })
    if (res.ok) { fetchUsuarios(); showToast(`Usuário "${username}" excluído.`) }
    else showToast('Erro ao excluir usuário.', 'error')
  }

  const toggleEmpresa = (idNum) => {
    setFormData(f => {
      const set = new Set(f.empresas_ids.map(Number))
      if (set.has(idNum)) set.delete(idNum)
      else set.add(idNum)
      const arr = Array.from(set).sort((a, b) => a - b)
      let principal = f.empresa_id
      if (principal && principal !== 'none' && !set.has(Number(principal)))
        principal = arr.length ? arr[0].toString() : 'none'
      return { ...f, empresas_ids: arr, empresa_id: principal }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const url    = editingId ? `/api/usuarios/${editingId}` : '/api/usuarios/'
    const method = editingId ? 'PUT' : 'POST'
    const empresa_id = (formData.empresa_id === 'none' || formData.empresa_id === '')
      ? (formData.empresas_ids.length ? Number(formData.empresas_ids[0]) : null)
      : Number(formData.empresa_id)
    const res = await fetch(url, {
      method,
      headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ...formData, empresa_id, empresas_ids: formData.empresas_ids.map(Number), perfil_acesso_id: formData.perfil_acesso_id ? Number(formData.perfil_acesso_id) : null })
    })
    if (res.ok) {
      cancelEdit(); fetchUsuarios()
      showToast(editingId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!')
    } else {
      try { const j = await res.json(); showToast('Erro: ' + (j.error || j.detail || res.status), 'error') }
      catch { showToast('Erro ' + res.status, 'error') }
    }
    setLoading(false)
  }

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }))

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.nome_completo || '').toLowerCase().includes(q)
      const matchRole = !filterRole || u.role === filterRole
      return matchSearch && matchRole
    })
  }, [usuarios, search, filterRole])

  const stats = useMemo(() => {
    const total = usuarios.length
    const porRole = {}
    usuarios.forEach(u => { porRole[u.role] = (porRole[u.role] || 0) + 1 })
    return { total, porRole }
  }, [usuarios])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <Toast toast={toast} />
      <ConfirmModal
        open={!!confirm}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir "${confirm?.username}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirm(null)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> Gestão de Usuários
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.total} usuário{stats.total !== 1 ? 's' : ''} cadastrado{stats.total !== 1 ? 's' : ''}</p>
        </div>
        <div className="hidden md:flex gap-2 flex-wrap justify-end">
          {Object.entries(stats.porRole).map(([role, count]) => {
            const info = ROLE_LABELS[role] || { label: role, color: 'bg-slate-100 text-slate-600' }
            return (
              <span key={role} className={`text-[11px] px-2.5 py-1 rounded-full font-bold ${info.color}`}>
                {info.label}: {count}
              </span>
            )
          })}
        </div>
      </div>

      {/* Formulário — só exibe se pode criar ou está editando */}
      {(can('usuarios', 'criar') || editingId) && (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
          <div className={`px-5 py-3.5 border-b border-border flex items-center gap-2 ${editingId ? 'bg-amber-50' : 'bg-muted/30'}`}>
            {editingId
              ? <><Edit2 className="w-4 h-4 text-amber-500" /><span className="font-bold text-sm">Editando: <span className="text-amber-600">{formData.username}</span></span></>
              : <><UserPlus className="w-4 h-4 text-primary" /><span className="font-bold text-sm">Novo Usuário</span></>
            }
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Username *</label>
                  <input className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="ex: joao.silva" value={formData.username} onChange={e => set('username', e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Nome Completo</label>
                  <input className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="ex: João da Silva" value={formData.nome_completo} onChange={e => set('nome_completo', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">Email *</label>
                  <input className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                    placeholder="email@empresa.com" type="email" value={formData.email} onChange={e => set('email', e.target.value)} required />
                </div>
              </div>

              <div className={`grid grid-cols-1 gap-4 ${formData.perfil_acesso_id ? '' : 'md:grid-cols-2'}`}>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    Senha {editingId && <span className="normal-case font-normal">(deixe em branco para manter)</span>}
                  </label>
                  <div className="relative">
                    <input className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary pr-10"
                      placeholder="••••••••" type={showPass ? 'text' : 'password'}
                      value={formData.password} onChange={e => set('password', e.target.value)} required={!editingId} />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {!formData.perfil_acesso_id && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Perfil de Acesso *</label>
                    <select className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                      value={formData.role} onChange={e => set('role', e.target.value)}>
                      {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                      <option value="admin">Admin</option>
                      <option value="gestao_documentos">Gestão de Documentos</option>
                      <option value="marketing">Email Marketing</option>
                      <option value="self_service">Self Service</option>
                      <option value="relatorios">Relatórios</option>
                      <option value="publico">Público</option>
                    </select>
                  </div>
                )}
              </div>

              {formData.role && !formData.perfil_acesso_id && (
                <div className={`flex items-start gap-2 px-4 py-2.5 rounded-xl text-xs border ${
                  formData.role === 'super_admin'       ? 'bg-purple-50 border-purple-200 text-purple-700' :
                  formData.role === 'admin'             ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  formData.role === 'gestao_documentos' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  formData.role === 'marketing'         ? 'bg-pink-50 border-pink-200 text-pink-700' :
                  formData.role === 'self_service'      ? 'bg-green-50 border-green-200 text-green-700' :
                  formData.role === 'relatorios'        ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                  'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}>
                  <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{ROLE_DESCRICOES[formData.role]}</span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Empresas com Acesso
                    <span className="normal-case font-normal ml-1">({formData.empresas_ids.length} selecionada{formData.empresas_ids.length !== 1 ? 's' : ''})</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setFormData(f => ({ ...f, empresas_ids: empresas.map(e => Number(e.id)) }))}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-bold">Todas</button>
                    <button type="button" onClick={() => setFormData(f => ({ ...f, empresas_ids: [], empresa_id: 'none' }))}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold">Limpar</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 border border-border rounded-xl bg-muted/10 max-h-48 overflow-auto">
                  {empresas.length === 0
                    ? <div className="text-xs text-muted-foreground p-2">Nenhuma empresa cadastrada.</div>
                    : empresas.map(emp => {
                      const idNum   = Number(emp.id)
                      const checked = formData.empresas_ids.map(Number).includes(idNum)
                      const isPrincipal = formData.empresa_id && Number(formData.empresa_id) === idNum
                      return (
                        <label key={emp.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm border transition-all ${
                          checked ? 'bg-primary/10 border-primary/40 font-semibold text-foreground' : 'bg-white border-border hover:bg-muted/30'
                        }`}>
                          <input type="checkbox" checked={checked} onChange={() => toggleEmpresa(idNum)} className="w-3.5 h-3.5 accent-primary flex-shrink-0" />
                          <span className="truncate flex-1">{emp.nome}</span>
                          {isPrincipal && checked && <span className="text-[10px] text-primary font-bold flex-shrink-0">★</span>}
                        </label>
                      )
                    })}
                </div>
                {formData.empresas_ids.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">Empresa Principal ★</label>
                    <select className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                      value={formData.empresa_id || 'none'} onChange={e => set('empresa_id', e.target.value)}>
                      <option value="none">Sem empresa principal (Acesso Global)</option>
                      {empresas.filter(e => formData.empresas_ids.map(Number).includes(Number(e.id)))
                        .map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {perfis.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Perfil de Acesso Customizado
                    <span className="normal-case font-normal text-muted-foreground">(opcional)</span>
                  </label>
                  <select className="w-full px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
                    value={formData.perfil_acesso_id || ''} onChange={e => set('perfil_acesso_id', e.target.value)}>
                    <option value="">— Sem perfil customizado —</option>
                    {perfis.map(p => <option key={p.id} value={p.id.toString()}>{p.nome}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={loading}
                  className={`px-6 py-2.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:opacity-90'}`}>
                  {loading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit}
                    className="px-4 py-2.5 bg-slate-100 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 flex items-center gap-1.5">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
            placeholder="Buscar por nome, username ou email..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary"
          value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">Todos os perfis</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
          <h2 className="text-xs font-bold text-muted-foreground uppercase">
            Usuários ({usuariosFiltrados.length}{usuariosFiltrados.length !== usuarios.length ? ` de ${usuarios.length}` : ''})
          </h2>
        </div>
        <div className="divide-y divide-border">
          {usuariosFiltrados.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhum usuário encontrado.
            </div>
          ) : usuariosFiltrados.map(u => {
            const roleInfo   = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' }
            const perfilNome = u.perfil_acesso_id ? (perfis.find(p => p.id === u.perfil_acesso_id)?.nome || null) : null
            const empresasArr = (u.empresas_ids || [])
              .map(eid => empresas.find(e => Number(e.id) === Number(eid)))
              .filter(Boolean)
            return (
              <div key={u.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group">
                <Avatar name={u.username} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{u.username}</span>
                    {u.nome_completo && <span className="text-xs text-muted-foreground">({u.nome_completo})</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 ${roleInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${roleInfo.dot}`} />{roleInfo.label}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{u.email}</div>
                  {perfilNome && (
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold mt-0.5">
                      <ShieldCheck className="w-3 h-3" />{perfilNome}
                    </span>
                  )}
                  {empresasArr.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {empresasArr.map(emp => (
                        <span key={emp.id} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          Number(emp.id) === Number(u.empresa_id) ? 'bg-primary/15 text-primary font-bold' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {Number(emp.id) === Number(u.empresa_id) ? '★ ' : ''}{emp.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {can('usuarios', 'editar') && (
                    <button onClick={() => handleEdit(u)}
                      className="p-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {can('usuarios', 'excluir') && (
                    <button onClick={() => handleDelete(u)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
