import React, { useState, useEffect } from 'react'
import { UserPlus, Key, Building2, ShieldCheck, Mail, User, Lock, Trash2, Edit2, X, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Usuarios() {
  const { user: currentUser } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ username: '', email: '', password: '', empresa_id: '', role: 'admin' })

  useEffect(() => { fetchUsuarios(); fetchEmpresas(); }, [])

  const fetchUsuarios = async () => {
    const headers = currentUser?.api_token ? { 'X-API-Token': currentUser.api_token } : {}
    const res = await fetch('/api/usuarios/', { headers })
    if (res.ok) setUsuarios(await res.json())
  }

  const fetchEmpresas = async () => {
    const headers = currentUser?.api_token ? { 'X-API-Token': currentUser.api_token } : {}
    const res = await fetch('/api/empresas/', { headers })
    if (res.ok) setEmpresas(await res.json())
  }

  const handleEdit = (u) => {
    setEditingId(u.id)
    setFormData({
      username: u.username,
      email: u.email,
      password: '',
      empresa_id: u.empresa_id ? u.empresa_id.toString() : 'none',
      role: u.role
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ username: '', email: '', password: '', empresa_id: '', role: 'admin' })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return
    const headers = currentUser?.api_token ? { 'X-API-Token': currentUser.api_token } : {}
    const res = await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers })
    if (res.ok) fetchUsuarios()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // NOVA VALIDAÇÃO: empresa_restrita precisa de empresa
    if (formData.role === 'empresa_restrita' && (!formData.empresa_id || formData.empresa_id === 'none')) {
      alert('Perfil "Empresa Restrita" deve ter uma empresa vinculada obrigatoriamente!')
      return
    }
    
    setLoading(true)
    const headers = { 'Content-Type': 'application/json' }
    if (currentUser?.api_token) headers['X-API-Token'] = currentUser.api_token
    const url = editingId ? `/api/usuarios/${editingId}` : '/api/usuarios/'
    const method = editingId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers,
      body: JSON.stringify({
        ...formData,
        empresa_id: formData.empresa_id === 'none' || formData.empresa_id === '' ? null : parseInt(formData.empresa_id)
      })
    })
    if (res.ok) { cancelEdit(); fetchUsuarios(); }
    setLoading(false)
  }

  const getRoleDisplayName = (role) => {
    const roles = {
      'super_admin': 'Super Admin',
      'admin': 'Admin',
      'relatorios': 'Relatórios',
      'publico': 'Público',
      'empresa_restrita': 'Empresa Restrita'  // NOVO
    }
    return roles[role] || role
  }

  const getRoleColor = (role) => {
    const colors = {
      'super_admin': 'bg-red-100 text-red-600',
      'admin': 'bg-blue-100 text-blue-600',
      'relatorios': 'bg-green-100 text-green-600',
      'publico': 'bg-indigo-100 text-indigo-600',
      'empresa_restrita': 'bg-orange-100 text-orange-600'  // NOVO
    }
    return colors[role] || 'bg-slate-100 text-slate-600'
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold text-slate-800">Gestão de Usuários</h1>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className={`p-4 border-b border-slate-100 ${editingId ? 'bg-amber-50' : 'bg-slate-50'}`}>
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
            {editingId ? <Edit2 className="w-5 h-5 text-amber-500" /> : <UserPlus className="w-5 h-5 text-primary" />}
            {editingId ? `Editando Usuário: ${formData.username}` : 'Novo Usuário'}
          </h2>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
              <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="Username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
              <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label>
              <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary" placeholder="Senha" type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required={!editingId} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Perfil / Role</label>
              <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="relatorios">Relatórios</option>
                <option value="publico">Público (Apenas Abrir Chamado)</option>
                <option value="empresa_restrita">Empresa Restrita (Apenas Chamados da Empresa)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Empresa {formData.role === 'empresa_restrita' && <span className="text-red-500">*</span>}
              </label>
              <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary" value={formData.empresa_id} onChange={e => setFormData({...formData, empresa_id: e.target.value})}>
                <option value="none">Acesso Global</option>
                {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
              </select>
              {formData.role === 'empresa_restrita' && (
                <p className="text-xs text-red-500 mt-1">Empresa obrigatória para este perfil</p>
              )}
            </div>
            <div className="flex items-end">
              <div className="flex gap-2 w-full">
                <button type="submit" disabled={loading} className={`flex-1 py-2 rounded-xl font-bold text-white ${editingId ? 'bg-amber-500' : 'bg-primary'}`}>
                  {loading ? '...' : editingId ? 'Salvar' : 'Criar'}
                </button>
                {editingId && <button type="button" onClick={cancelEdit} className="p-2 bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>}
              </div>
            </div>
          </form>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase">
              <th className="p-4">Usuário</th>
              <th className="p-4">Perfil</th>
              <th className="p-4">Empresa</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="p-4">
                  <div className="font-bold text-slate-700">{u.username}</div>
                  <div className="text-xs text-slate-400">{u.email}</div>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${getRoleColor(u.role)}`}>
                    {getRoleDisplayName(u.role)}
                  </span>
                </td>
                <td className="p-4 text-sm text-slate-600">
                  {u.empresa_nome || 'Global'}
                  {u.role === 'empresa_restrita' && !u.empresa_nome && (
                    <span className="text-red-500 text-xs block">⚠️ Empresa obrigatória</span>
                  )}
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <button onClick={() => handleEdit(u)} className="p-2 text-slate-400 hover:text-amber-500"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
