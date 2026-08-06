import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, Wifi, X, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

const API = '/api/marketing/smtp'

const formVazio = {
  nome: '', host: '', port: 587, username: '', password: '',
  email_remetente: '', nome_remetente: '', use_tls: true, use_ssl: false, ativo: true
}

export default function MarketingSmtp() {
  const { user } = useAuth()
  const headers  = { 'Content-Type': 'application/json', ...(user?.api_token ? { 'X-API-Token': user.api_token } : {}) }

  const [lista,        setLista]        = useState([])
  const [modal,        setModal]        = useState(false)
  const [form,         setForm]         = useState(formVazio)
  const [editId,       setEditId]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [showPass,     setShowPass]     = useState(false)
  const [testeModal,   setTesteModal]   = useState(false)
  const [testeId,      setTesteId]      = useState(null)
  const [testeEmail,   setTesteEmail]   = useState('')
  const [testeResult,  setTesteResult]  = useState(null)
  const [testando,     setTestando]     = useState(false)

  const carregar = async () => {
    const res = await fetch(API, { headers })
    if (res.ok) setLista(await res.json())
  }

  useEffect(() => { carregar() }, [])

  const abrirNovo = () => { setForm(formVazio); setEditId(null); setModal(true) }
  const abrirEdit = (item) => { setForm({ ...item }); setEditId(item.id); setModal(true) }

  const salvar = async () => {
    setLoading(true)
    const url    = editId ? `${API}/${editId}` : API
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) })
    if (res.ok) { await carregar(); setModal(false) }
    setLoading(false)
  }

  const deletar = async (id) => {
    if (!confirm('Remover esta configuração SMTP?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', headers })
    carregar()
  }

  const abrirTeste = (id) => { setTesteId(id); setTesteEmail(''); setTesteResult(null); setTesteModal(true) }

  const enviarTeste = async () => {
    setTestando(true)
    setTesteResult(null)
    const res  = await fetch(`${API}/${testeId}/testar`, {
      method: 'POST', headers, body: JSON.stringify({ email_destino: testeEmail })
    })
    const data = await res.json()
    setTesteResult(data)
    setTestando(false)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Config. SMTP</h1>
          <p className="text-sm text-muted-foreground mt-1">Configurações de e-mail exclusivas para Email Marketing</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Nova Config
        </button>
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {lista.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-bold">Nenhuma configuração cadastrada</p>
            <p className="text-sm">Clique em "Nova Config" para começar</p>
          </div>
        )}
        {lista.map(item => (
          <div key={item.id} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Wifi className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-foreground">{item.nome}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {item.ativo ? 'ATIVO' : 'INATIVO'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{item.host}:{item.port} — {item.email_remetente}</p>
              <p className="text-xs text-muted-foreground">{item.use_tls ? 'TLS' : ''}{item.use_ssl ? 'SSL' : ''} — Remetente: {item.nome_remetente}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => abrirTeste(item.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-all">
                <Wifi className="w-3 h-3" /> Testar
              </button>
              <button onClick={() => abrirEdit(item)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => deletar(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-primary to-primary/80 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">{editId ? 'Editar' : 'Nova'} Config. SMTP</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Nome da Configuração</label>
                <input value={form.nome} onChange={e => set('nome', e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="Ex: SMTP Marketing Principal" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Host SMTP</label>
                  <input value={form.host} onChange={e => set('host', e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Porta</label>
                  <input type="number" value={form.port} onChange={e => set('port', e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Usuário (e-mail login)</label>
                <input value={form.username} onChange={e => set('username', e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="seu@email.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Senha / App Password</label>
                <div className="relative mt-1">
                  <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Nome Remetente</label>
                  <input value={form.nome_remetente} onChange={e => set('nome_remetente', e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="Vimax Marketing" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">E-mail Remetente</label>
                  <input value={form.email_remetente} onChange={e => set('email_remetente', e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="marketing@empresa.com" />
                </div>
              </div>
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.use_tls} onChange={e => set('use_tls', e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-medium">Usar TLS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.use_ssl} onChange={e => set('use_ssl', e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-medium">Usar SSL</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={e => set('ativo', e.target.checked)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm font-medium">Ativo</span>
                </label>
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100">Cancelar</button>
              <button onClick={salvar} disabled={loading} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Teste */}
      {testeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">Testar Configuração SMTP</h2>
              <button onClick={() => setTesteModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">E-mail de destino para teste</label>
                <input value={testeEmail} onChange={e => setTesteEmail(e.target.value)} className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm" placeholder="destino@email.com" />
              </div>
              {testeResult && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 ${testeResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testeResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                  <p className="text-sm font-medium">{testeResult.message || testeResult.error}</p>
                </div>
              )}
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setTesteModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100">Fechar</button>
              <button onClick={enviarTeste} disabled={testando || !testeEmail} className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50">
                {testando ? 'Enviando...' : '📨 Enviar Teste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
