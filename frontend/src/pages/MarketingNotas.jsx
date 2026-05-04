import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Paperclip, Download, FileText, Archive, FileEdit } from 'lucide-react'

const API = '/api/marketing/notas'

const formVazio = { titulo: '', destinatarios: '', corpo: '', status: 'rascunho' }

const STATUS_BADGE = {
  rascunho:  'bg-yellow-100 text-yellow-700',
  arquivado: 'bg-slate-100 text-slate-500',
}

const STATUS_LABEL = {
  rascunho:  'Rascunho',
  arquivado: 'Arquivado',
}

function formatBytes(b) {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

export default function MarketingNotas() {
  const { user }  = useAuth()
  const headers   = { 'Content-Type': 'application/json', ...(user?.api_token ? { 'X-API-Token': user.api_token } : {}) }
  const headersRaw = user?.api_token ? { 'X-API-Token': user.api_token } : {}

  const [lista,       setLista]       = useState([])
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(formVazio)
  const [editId,      setEditId]      = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [anexos,      setAnexos]      = useState([])
  const [uploading,   setUploading]   = useState(false)
  const [filtroStatus, setFiltroStatus] = useState('')
  const fileRef = useRef()

  const carregar = async () => {
    const url = filtroStatus ? `${API}?status=${filtroStatus}` : API
    const res = await fetch(url, { headers })
    if (res.ok) setLista(await res.json())
  }

  useEffect(() => { carregar() }, [filtroStatus])

  const abrirNovo = () => {
    setForm(formVazio)
    setEditId(null)
    setAnexos([])
    setModal(true)
  }

  const abrirEdit = (item) => {
    setForm({ titulo: item.titulo, destinatarios: item.destinatarios || '', corpo: item.corpo || '', status: item.status })
    setEditId(item.id)
    setAnexos(item.anexos || [])
    setModal(true)
  }

  const salvar = async () => {
    if (!form.titulo) return alert('Preencha o título!')
    setLoading(true)
    const url    = editId ? `${API}/${editId}` : API
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) })
    if (res.ok) {
      const saved = await res.json()
      if (!editId) setEditId(saved.id)   // permite fazer upload de anexos após criar
      await carregar()
      if (editId) setModal(false)
      else {
        // mantém modal aberto para adicionar anexos
        setEditId(saved.id)
        setAnexos(saved.anexos || [])
      }
    }
    setLoading(false)
  }

  const deletar = async (id) => {
    if (!confirm('Remover esta nota e todos os anexos?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', headers })
    carregar()
  }

  const uploadAnexo = async (e) => {
    if (!editId) return alert('Salve a nota primeiro!')
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API}/${editId}/anexos`, { method: 'POST', headers: headersRaw, body: fd })
    if (res.ok) {
      const novo = await res.json()
      setAnexos(a => [...a, novo])
      await carregar()
    } else {
      alert('Erro ao enviar arquivo.')
    }
    setUploading(false)
    e.target.value = ''
  }

  const deletarAnexo = async (anexoId) => {
    if (!confirm('Remover este anexo?')) return
    await fetch(`${API}/anexo/${anexoId}`, { method: 'DELETE', headers })
    setAnexos(a => a.filter(x => x.id !== anexoId))
    await carregar()
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notas de Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">Rascunhos e anotações com suporte a anexos</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Nova Nota
        </button>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        {[['', 'Todas'], ['rascunho', 'Rascunhos'], ['arquivado', 'Arquivados']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltroStatus(v)}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold border transition-all ${filtroStatus === v ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-200 hover:border-primary'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="grid gap-4">
        {lista.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileEdit className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p className="text-lg font-bold">Nenhuma nota encontrada</p>
            <p className="text-sm">Clique em "Nova Nota" para começar</p>
          </div>
        )}
        {lista.map(item => (
          <div key={item.id} className="bg-card border border-border rounded-2xl p-5 flex items-start gap-4 hover:shadow-md transition-all">
            <div className="p-3 bg-primary/10 rounded-xl mt-0.5">
              <FileEdit className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground">{item.titulo}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${STATUS_BADGE[item.status] || 'bg-slate-100 text-slate-500'}`}>
                  {STATUS_LABEL[item.status] || item.status}
                </span>
              </div>
              {item.destinatarios && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">Para: {item.destinatarios}</p>
              )}
              {item.corpo && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.corpo}</p>
              )}
              {item.anexos?.length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  {item.anexos.map(a => (
                    <span key={a.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{a.nome}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(item.atualizado_em).toLocaleString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">

            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-primary to-primary/80 text-white flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold">{editId ? 'Editar' : 'Nova'} Nota</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Título */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Título</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="Ex: Ideias campanha maio"
                />
              </div>

              {/* Destinatários */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Destinatários (opcional)</label>
                <input
                  value={form.destinatarios}
                  onChange={e => setForm(f => ({ ...f, destinatarios: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                  placeholder="email@exemplo.com, outro@email.com"
                />
              </div>

              {/* Corpo */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Conteúdo / Anotação</label>
                <textarea
                  value={form.corpo}
                  onChange={e => setForm(f => ({ ...f, corpo: e.target.value }))}
                  rows={7}
                  className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                  placeholder="Escreva suas anotações, ideias ou rascunho aqui..."
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm">
                  <option value="rascunho">Rascunho</option>
                  <option value="arquivado">Arquivado</option>
                </select>
              </div>

              {/* Anexos */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Anexos</label>
                {!editId && (
                  <p className="text-xs text-amber-600 mt-1">💡 Salve a nota primeiro para adicionar anexos.</p>
                )}

                {editId && (
                  <>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="mt-2 flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-primary hover:text-primary transition-all w-full justify-center disabled:opacity-50">
                      <Paperclip className="w-4 h-4" />
                      {uploading ? 'Enviando...' : 'Clique para anexar arquivo'}
                    </button>
                    <input ref={fileRef} type="file" className="hidden" onChange={uploadAnexo} />
                  </>
                )}

                {anexos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {anexos.map(a => (
                      <div key={a.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{a.nome}</p>
                          {a.tamanho && <p className="text-xs text-slate-400">{formatBytes(a.tamanho)}</p>}
                        </div>
                        <a href={a.url} download className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={() => deletarAnexo(a.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => setModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100">Fechar</button>
              <button onClick={salvar} disabled={loading} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar Nota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
