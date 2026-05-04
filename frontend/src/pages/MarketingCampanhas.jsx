import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Send, Clock, Loader, Users, UserPlus, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

const API_CAMP   = '/api/marketing/campanhas'
const API_MOD    = '/api/marketing/modelos'
const API_SMTP   = '/api/marketing/smtp'
const API_GRUPOS = '/api/marketing/grupos'
const API_CONT   = '/api/marketing/contatos'

const formVazio = {
  nome: '', assunto: '', corpo_html: '', smtp_id: '',
  grupos_ids: [], contatos_ids: [], contatos_extras: [],
  data_agendamento: ''
}

const statusConfig = {
  rascunho: { label: 'Rascunho', color: 'bg-slate-100 text-slate-600' },
  agendada: { label: 'Agendada', color: 'bg-blue-100 text-blue-700' },
  enviando: { label: 'Enviando', color: 'bg-yellow-100 text-yellow-700' },
  enviada:  { label: 'Enviada',  color: 'bg-green-100 text-green-700' },
  erro:     { label: 'Erro',     color: 'bg-red-100 text-red-700' },
}

export default function MarketingCampanhas() {
  const { user } = useAuth()
  const headers  = { 'Content-Type': 'application/json', ...(user?.api_token ? { 'X-API-Token': user.api_token } : {}) }

  const [lista,     setLista]     = useState([])
  const [modelos,   setModelos]   = useState([])
  const [smtps,     setSmtps]     = useState([])
  const [grupos,    setGrupos]    = useState([])
  const [contatos,  setContatos]  = useState([])
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(formVazio)
  const [editId,    setEditId]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [expandLog, setExpandLog] = useState(null)
  const [novoExtra, setNovoExtra] = useState({ nome: '', email: '' })
  const [agModal,   setAgModal]   = useState(null)
  const [agData,    setAgData]    = useState('')
  const [feedback,  setFeedback]  = useState(null)

  const carregar = async () => {
    const [r1, r2, r3, r4, r5] = await Promise.all([
      fetch(API_CAMP,   { headers }),
      fetch(API_MOD,    { headers }),
      fetch(API_SMTP,   { headers }),
      fetch(API_GRUPOS, { headers }),
      fetch(API_CONT,   { headers }),
    ])
    if (r1.ok) setLista(await r1.json())
    if (r2.ok) setModelos(await r2.json())
    if (r3.ok) setSmtps(await r3.json())
    if (r4.ok) setGrupos(await r4.json())
    if (r5.ok) setContatos(await r5.json())
  }

  useEffect(() => { carregar() }, [])

  const abrirNovo = () => { setForm(formVazio); setEditId(null); setModal(true) }

  const abrirEdit = (item) => {
    setForm({
      nome: item.nome, assunto: item.assunto, corpo_html: item.corpo_html,
      smtp_id: item.smtp_id, grupos_ids: item.grupos_ids,
      contatos_ids: item.contatos_ids, contatos_extras: item.contatos_extras,
      data_agendamento: item.data_agendamento ? item.data_agendamento.slice(0, 16) : ''
    })
    setEditId(item.id)
    setModal(true)
  }

  const aplicarModelo = (id) => {
    const m = modelos.find(x => x.id === parseInt(id))
    if (m) setForm(f => ({ ...f, assunto: m.assunto, corpo_html: m.corpo_html }))
  }

  const toggleGrupo = (id) => {
    setForm(f => ({
      ...f,
      grupos_ids: f.grupos_ids.includes(id)
        ? f.grupos_ids.filter(x => x !== id)
        : [...f.grupos_ids, id]
    }))
  }

  const toggleContato = (id) => {
    setForm(f => ({
      ...f,
      contatos_ids: f.contatos_ids.includes(id)
        ? f.contatos_ids.filter(x => x !== id)
        : [...f.contatos_ids, id]
    }))
  }

  const adicionarExtra = () => {
    if (!novoExtra.email) return
    setForm(f => ({ ...f, contatos_extras: [...f.contatos_extras, { ...novoExtra }] }))
    setNovoExtra({ nome: '', email: '' })
  }

  const removerExtra = (idx) => {
    setForm(f => ({ ...f, contatos_extras: f.contatos_extras.filter((_, i) => i !== idx) }))
  }

  const salvar = async () => {
    if (!form.nome || !form.assunto || !form.smtp_id) return alert('Preencha nome, assunto e SMTP!')
    setLoading(true)
    const url    = editId ? `${API_CAMP}/${editId}` : API_CAMP
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) })
    if (res.ok) { await carregar(); setModal(false) }
    setLoading(false)
  }

  const deletar = async (id) => {
    if (!confirm('Remover esta campanha?')) return
    await fetch(`${API_CAMP}/${id}`, { method: 'DELETE', headers })
    carregar()
  }

  const enviarAgora = async (id) => {
    if (!confirm('Disparar campanha agora para todos os destinatarios?')) return
    const res  = await fetch(`${API_CAMP}/${id}/enviar`, { method: 'POST', headers, body: JSON.stringify({}) })
    const data = await res.json()
    setFeedback({ type: data.success ? 'ok' : 'erro', msg: data.message || data.error })
    setTimeout(() => setFeedback(null), 4000)
    carregar()
  }

  const confirmarAgendamento = async () => {
    if (!agData) return alert('Selecione a data/hora!')
    const res  = await fetch(`${API_CAMP}/${agModal}/agendar`, {
      method: 'POST', headers, body: JSON.stringify({ data_agendamento: agData })
    })
    const data = await res.json()
    setFeedback({ type: data.success ? 'ok' : 'erro', msg: data.message || data.error })
    setTimeout(() => setFeedback(null), 4000)
    setAgModal(null)
    setAgData('')
    carregar()
  }

  // ✅ CORRIGIDO — usa g.contatos (array) retornado pelo backend
  const totalDestinatarios = () => {
    const emails = new Set()

    form.grupos_ids.forEach(gid => {
      const g = grupos.find(x => x.id === gid)
      if (g?.contatos) {
        g.contatos.forEach(c => { if (c.email) emails.add(c.email) })
      }
    })

    form.contatos_ids.forEach(cid => {
      const c = contatos.find(x => x.id === cid)
      if (c?.email) emails.add(c.email)
    })

    form.contatos_extras.forEach(e => { if (e.email) emails.add(e.email) })

    return emails.size
  }

  return (
    <div className="space-y-6">

      {/* Feedback */}
      {feedback && (
        <div className={`fixed top-6 right-6 z-[200] px-6 py-3 rounded-2xl shadow-xl font-bold text-white transition-all ${feedback.type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie e dispare campanhas de e-mail</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Nova Campanha
        </button>
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {lista.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Send className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p className="text-lg font-bold">Nenhuma campanha criada</p>
            <p className="text-sm">Clique em "Nova Campanha" para comecar</p>
          </div>
        )}
        {lista.map(item => {
          const st = statusConfig[item.status] || statusConfig.rascunho
          return (
            <div key={item.id} className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-foreground">{item.nome}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${st.color}`}>{st.label}</span>
                    {item.status === 'enviando' && <Loader className="w-3 h-3 animate-spin text-yellow-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground">Assunto: {item.assunto}</p>
                  <p className="text-xs text-muted-foreground">
                    SMTP: {item.smtp_nome} &nbsp;|&nbsp;
                    Enviados: {item.total_enviados} &nbsp;|&nbsp;
                    Erros: {item.total_erros}
                    {item.data_agendamento && ` | Agendado: ${new Date(item.data_agendamento).toLocaleString('pt-BR')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {(['rascunho', 'agendada', 'enviada', 'erro'].includes(item.status)) && (
                    <button onClick={() => enviarAgora(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-all">
                      <Send className="w-3 h-3" /> Enviar Agora
                    </button>
                  )}
                  {(['rascunho', 'agendada'].includes(item.status)) && (
                    <button onClick={() => { setAgModal(item.id); setAgData('') }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all">
                      <Clock className="w-3 h-3" /> Agendar
                    </button>
                  )}
                  <button onClick={() => abrirEdit(item)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deletar(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {item.log_erros && (
                <div>
                  <button onClick={() => setExpandLog(expandLog === item.id ? null : item.id)}
                    className="flex items-center gap-1 text-xs text-red-500 font-bold hover:underline">
                    {expandLog === item.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Ver log de erros
                  </button>
                  {expandLog === item.id && (
                    <pre className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 overflow-auto max-h-32">
                      {item.log_erros}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Campanha */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 bg-gradient-to-r from-primary to-primary/80 text-white flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold">{editId ? 'Editar' : 'Nova'} Campanha</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Nome */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Nome da Campanha</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="Ex: Promocao de Abril" />
              </div>

              {/* Modelo */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Usar Modelo (opcional)</label>
                <select onChange={e => aplicarModelo(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm">
                  <option value="">-- Selecione um modelo para carregar --</option>
                  {modelos.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              {/* Assunto */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Assunto</label>
                <input value={form.assunto} onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="Assunto do e-mail" />
              </div>

              {/* SMTP */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Configuracao SMTP</label>
                <select value={form.smtp_id} onChange={e => setForm(f => ({ ...f, smtp_id: parseInt(e.target.value) }))}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm">
                  <option value="">-- Selecione o SMTP --</option>
                  {smtps.filter(s => s.ativo).map(s => <option key={s.id} value={s.id}>{s.nome} ({s.email_remetente})</option>)}
                </select>
              </div>

              {/* Grupos */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <Users className="w-3 h-3" /> Grupos de Contatos
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {grupos.map(g => (
                    <label key={g.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${form.grupos_ids.includes(g.id) ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={form.grupos_ids.includes(g.id)} onChange={() => toggleGrupo(g.id)} className="accent-primary" />
                      <span className="text-sm font-medium flex-1">{g.nome}</span>
                      {/* ✅ CORRIGIDO — usa total_contatos */}
                      <span className="text-xs text-slate-400">{g.total_contatos || 0} contatos</span>
                    </label>
                  ))}
                  {grupos.length === 0 && <p className="text-xs text-slate-400 col-span-2">Nenhum grupo cadastrado.</p>}
                </div>
              </div>

              {/* Contatos individuais */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <Users className="w-3 h-3" /> Contatos Individuais
                </label>
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-3">
                  {contatos.filter(c => c.ativo).map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg">
                      <input type="checkbox" checked={form.contatos_ids.includes(c.id)} onChange={() => toggleContato(c.id)} className="accent-primary" />
                      <span className="text-sm">{c.nome} <span className="text-slate-400 text-xs">({c.email})</span></span>
                    </label>
                  ))}
                  {contatos.length === 0 && <p className="text-xs text-slate-400">Nenhum contato cadastrado.</p>}
                </div>
              </div>

              {/* Contato avulso */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <UserPlus className="w-3 h-3" /> Adicionar Contato Avulso
                </label>
                <div className="flex gap-2 mt-2">
                  <input value={novoExtra.nome} onChange={e => setNovoExtra(x => ({ ...x, nome: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="Nome" />
                  <input value={novoExtra.email} onChange={e => setNovoExtra(x => ({ ...x, email: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="E-mail" />
                  <button onClick={adicionarExtra} className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {form.contatos_extras.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {form.contatos_extras.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <span className="text-sm flex-1">{e.nome} <span className="text-slate-400">({e.email})</span></span>
                        <button onClick={() => removerExtra(i)} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-bold text-primary">
                Total estimado de destinatarios: {totalDestinatarios()} e-mails
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => setModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100">Cancelar</button>
              <button onClick={salvar} disabled={loading} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agendamento */}
      {agModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold">Agendar Envio</h2>
              <button onClick={() => setAgModal(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Data e Hora do Disparo
                </label>
                <input type="datetime-local" value={agData} onChange={e => setAgData(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setAgModal(null)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100">Cancelar</button>
              <button onClick={confirmarAgendamento} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:opacity-90">
                Confirmar Agendamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
