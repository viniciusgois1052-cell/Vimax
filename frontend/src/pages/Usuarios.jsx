import React, { useState, useEffect } from 'react'
import { UserPlus, Edit2, X, Trash2, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
  super_admin:      { label: 'Super Admin',        color: 'bg-purple-100 text-purple-700' },
  admin:            { label: 'Admin',              color: 'bg-blue-100 text-blue-700' },
  gestao_documentos:{ label: 'Gestão de Documentos',color: 'bg-amber-100 text-amber-800' },
  self_service:     { label: 'Self Service',       color: 'bg-green-100 text-green-700' },
  relatorios:       { label: 'Relatórios',         color: 'bg-yellow-100 text-yellow-700' },
  publico:          { label: 'Público',            color: 'bg-indigo-100 text-indigo-600' },
  marketing:        { label: 'Email Marketing',    color: 'bg-pink-100 text-pink-700' },
}

const ROLE_DESCRICOES = {
  super_admin:       'Acesso total ao sistema',
  admin:             'Ve tudo exceto config de e-mail do sistema',
  gestao_documentos: 'Acesso somente a Contratos e Lembretes',
  self_service:      'Ve e cria chamados da empresa',
  relatorios:        'Somente leitura de relatorios',
  publico:           'Apenas abrir chamado via QR/portal',
  marketing:         'Acesso apenas ao Email Marketing da empresa',
}

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [usuarios,  setUsuarios]  = useState([])
  const [empresas,  setEmpresas]  = useState([])
  const [loading,   setLoading]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData,  setFormData]  = useState({
    username: '', email: '', password: '',
    empresa_id: '',                // empresa principal (opcional)
    empresas_ids: [],              // multi-select
    role: 'admin',
  })

  useEffect(() => { fetchUsuarios(); fetchEmpresas() }, [])

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

  const handleEdit = (u) => {
    setEditingId(u.id)
    setFormData({
      username:    u.username,
      email:       u.email,
      password:    '',
      empresa_id:  u.empresa_id ? u.empresa_id.toString() : 'none',
      empresas_ids: Array.isArray(u.empresas_ids) ? u.empresas_ids.map(x => Number(x)) : [],
      role:        u.role,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ username: '', email: '', password: '', empresa_id: '', empresas_ids: [], role: 'admin' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuario?')) return
    const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: headers() })
    if (res.ok) fetchUsuarios()
  }

  const toggleEmpresa = (idNum) => {
    setFormData(f => {
      const set = new Set(f.empresas_ids.map(Number))
      if (set.has(idNum)) set.delete(idNum)
      else set.add(idNum)
      const arr = Array.from(set).sort((a, b) => a - b)
      // se a empresa principal foi removida da lista, ajusta
      let principal = f.empresa_id
      if (principal && principal !== 'none' && !set.has(Number(principal))) {
        principal = arr.length ? arr[0].toString() : 'none'
      }
      return { ...f, empresas_ids: arr, empresa_id: principal }
    })
  }

  const selectAllEmpresas = () => {
    setFormData(f => ({ ...f, empresas_ids: empresas.map(e => Number(e.id)) }))
  }
  const clearEmpresas = () => {
    setFormData(f => ({ ...f, empresas_ids: [], empresa_id: 'none' }))
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
      body: JSON.stringify({
        ...formData,
        empresa_id,
        empresas_ids: formData.empresas_ids.map(Number),
      })
    })
    if (res.ok) { cancelEdit(); fetchUsuarios() }
    else {
      try {
        const j = await res.json()
        alert('Erro: ' + (j.error || j.detail || res.status))
      } catch { alert('Erro ' + res.status) }
    }
    setLoading(false)
  }

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-foreground">Gestao de Usuarios</h1>

      {/* Formulario */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className={`p-4 border-b border-border ${editingId ? 'bg-amber-50' : 'bg-muted/30'}`}>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            {editingId ? <Edit2 className="w-5 h-5 text-amber-500" /> : <UserPlus className="w-5 h-5 text-primary" />}
            {editingId ? `Editando: ${formData.username}` : 'Novo Usuario'}
          </h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Username</label>
              <input className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Username" value={formData.username} onChange={e => set('username', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Email</label>
              <input className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Email" type="email" value={formData.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                Senha {editingId && <span className="normal-case font-normal">(deixe em branco para manter)</span>}
              </label>
              <input className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                placeholder="Senha" type="password" value={formData.password} onChange={e => set('password', e.target.value)} required={!editingId} />
            </div>

            {/* Perfil */}
            <div className="space-y-1 md:col-span-3">
              <label className="text-xs font-bold text-muted-foreground uppercase">Perfil de Acesso</label>
              <select className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                value={formData.role} onChange={e => set('role', e.target.value)}>
                {currentUser?.role === 'super_admin' && <option value="super_admin">Super Admin — {ROLE_DESCRICOES.super_admin}</option>}
                <option value="admin">Admin — {ROLE_DESCRICOES.admin}</option>
                <option value="gestao_documentos">Gestão de Documentos — {ROLE_DESCRICOES.gestao_documentos}</option>
                <option value="marketing">Email Marketing — {ROLE_DESCRICOES.marketing}</option>
                <option value="self_service">Self Service — {ROLE_DESCRICOES.self_service}</option>
                <option value="relatorios">Relatorios — {ROLE_DESCRICOES.relatorios}</option>
                <option value="publico">Publico — {ROLE_DESCRICOES.publico}</option>
              </select>

              {formData.role && (
                <div className={`mt-2 px-4 py-2.5 rounded-xl text-xs font-medium border ${
                  formData.role === 'super_admin'       ? 'bg-purple-50 border-purple-200 text-purple-700' :
                  formData.role === 'admin'             ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  formData.role === 'gestao_documentos' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  formData.role === 'marketing'         ? 'bg-pink-50 border-pink-200 text-pink-700' :
                  formData.role === 'self_service'      ? 'bg-green-50 border-green-200 text-green-700' :
                  formData.role === 'relatorios'        ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                  'bg-indigo-50 border-indigo-200 text-indigo-700'
                }`}>
                  {ROLE_DESCRICOES[formData.role]}

                  {formData.role === 'marketing' && (
                    <span className="block mt-1 font-bold">Acessa: Contatos, Grupos, Config. SMTP, Modelos e Campanhas (apenas os proprios cadastros).</span>
                  )}
                  {formData.role === 'gestao_documentos' && (
                    <span className="block mt-1 font-bold">Acessa: Contratos + Meus Lembretes. Não acessa outras telas.</span>
                  )}
                </div>
              )}
            </div>

            {/* Multi-select de empresas */}
            <div className="space-y-2 md:col-span-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> Empresas com Acesso
                  <span className="ml-2 normal-case font-normal text-muted-foreground">
                    (marque todas as empresas que este usuario pode acessar)
                  </span>
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={selectAllEmpresas}
                    className="text-xs px-3 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 font-bold">
                    Marcar todas
                  </button>
                  <button type="button" onClick={clearEmpresas}
                    className="text-xs px-3 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold">
                    Limpar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 border border-border rounded-xl bg-muted/20 max-h-64 overflow-auto">
                {empresas.length === 0 && (
                  <div className="text-xs text-muted-foreground p-2">Nenhuma empresa cadastrada.</div>
                )}
                {empresas.map(emp => {
                  const idNum   = Number(emp.id)
                  const checked = formData.empresas_ids.map(Number).includes(idNum)
                  return (
                    <label key={emp.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm border transition-all ${
                        checked
                          ? 'bg-primary/10 border-primary/30 text-foreground font-semibold'
                          : 'bg-white border-border hover:bg-muted/40'
                      }`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEmpresa(idNum)}
                        className="w-4 h-4 accent-primary"
                      />
                      <span className="truncate">{emp.nome}</span>
                    </label>
                  )
                })}
              </div>

              {/* Empresa principal */}
              <div className="space-y-1 mt-3">
                <label className="text-xs font-bold text-muted-foreground uppercase">
                  Empresa principal (padrao)
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  value={formData.empresa_id || 'none'}
                  onChange={e => set('empresa_id', e.target.value)}
                >
                  <option value="none">Sem empresa principal (Acesso Global)</option>
                  {empresas
                    .filter(e => formData.empresas_ids.map(Number).includes(Number(e.id)))
                    .map(e => (
                      <option key={e.id} value={e.id.toString()}>{e.nome}</option>
                    ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Apenas as empresas marcadas acima ficam disponiveis aqui.
                </p>
              </div>
            </div>

            <div className="flex items-end md:col-span-3">
              <div className="flex gap-2">
                <button type="submit" disabled={loading}
                  className={`px-8 py-2.5 rounded-xl font-bold text-white text-sm ${editingId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary hover:opacity-90'} disabled:opacity-50`}>
                  {loading ? 'Salvando...' : editingId ? 'Salvar Alteracoes' : 'Criar Usuario'}
                </button>
                {editingId && (
                  <button type="button" onClick={cancelEdit}
                    className="px-4 py-2.5 bg-slate-100 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 flex items-center gap-1">
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h2 className="text-sm font-bold text-muted-foreground uppercase">Usuarios Cadastrados ({usuarios.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/20 border-b border-border text-xs font-bold text-muted-foreground uppercase">
                <th className="p-4">Usuario</th>
                <th className="p-4">Perfil</th>
                <th className="p-4">Empresas</th>
                <th className="p-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const roleInfo = ROLE_LABELS[u.role] || { label: u.role, color: 'bg-slate-100 text-slate-600' }
                const empresasNomes = (u.empresas_ids || [])
                  .map(eid => (empresas.find(e => Number(e.id) === Number(eid)) || {}).nome)
                  .filter(Boolean)
                return (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-foreground">{u.username}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {empresasNomes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {empresasNomes.map((nome, i) => (
                            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${
                              u.empresa_nome === nome ? 'bg-primary/15 text-primary font-bold' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {nome}{u.empresa_nome === nome ? ' ★' : ''}
                            </span>
                          ))}
                        </div>
                      ) : (u.empresa_nome || 'Global')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(u)} className="p-2 text-muted-foreground hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">Nenhum usuario cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
