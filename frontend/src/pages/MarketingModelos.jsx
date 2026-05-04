import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Eye, FileText, Code, Type, StickyNote } from 'lucide-react'

const API = '/api/marketing/modelos'

const formVazio = { nome: '', assunto: '', corpo_html: '', notas: '', notas_no_email: false }

const TEMPLATE_BASICO = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #4F46E5; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Titulo do E-mail</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Ola {{nome}},</p>
    <p style="color: #374151; font-size: 16px; line-height: 1.6;">
      Escreva o conteudo do seu e-mail aqui. Voce pode usar HTML completo.
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="#" style="background: #4F46E5; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
        Botao de Acao
      </a>
    </div>
    <p style="color: #6B7280; font-size: 14px;">Atenciosamente,<br><strong>Equipe Vimax</strong></p>
  </div>
  <div style="background: #F9FAFB; padding: 15px; border-radius: 0 0 12px 12px; text-align: center; border: 1px solid #e5e7eb; border-top: none;">
    <p style="color: #9CA3AF; font-size: 12px; margin: 0;">Este e-mail foi enviado para {{email}}</p>
  </div>
</div>`

export default function MarketingModelos() {
  const { user }  = useAuth()
  const headers   = { 'Content-Type': 'application/json', ...(user?.api_token ? { 'X-API-Token': user.api_token } : {}) }

  const [lista,   setLista]   = useState([])
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(formVazio)
  const [editId,  setEditId]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [aba,     setAba]     = useState('html')

  const carregar = async () => {
    const res = await fetch(API, { headers })
    if (res.ok) setLista(await res.json())
  }

  useEffect(() => { carregar() }, [])

  const abrirNovo = () => {
    setForm(formVazio)
    setEditId(null)
    setAba('html')
    setModal(true)
  }

  const abrirEdit = (item) => {
    setForm({ ...item })
    setEditId(item.id)
    setAba('html')
    setModal(true)
  }

  const salvar = async () => {
    if (!form.nome || !form.assunto || !form.corpo_html) return alert('Preencha todos os campos!')
    setLoading(true)
    const url    = editId ? `${API}/${editId}` : API
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) })
    if (res.ok) { await carregar(); setModal(false) }
    setLoading(false)
  }

  const deletar = async (id) => {
    if (!confirm('Remover este modelo?')) return
    await fetch(`${API}/${id}`, { method: 'DELETE', headers })
    carregar()
  }

  const inserirVariavel = (v) => {
    const textarea = document.getElementById('editor-html')
    if (!textarea) return
    const start = textarea.selectionStart
    const end   = textarea.selectionEnd
    const novo  = form.corpo_html.substring(0, start) + v + form.corpo_html.substring(end)
    setForm(f => ({ ...f, corpo_html: novo }))
    setTimeout(() => {
      textarea.focus()
      textarea.selectionStart = start + v.length
      textarea.selectionEnd   = start + v.length
    }, 0)
  }

  const inserirNotasTag = (open, close, tip) => {
    const ta = document.getElementById('notas-textarea')
    if (!ta) return
    const s   = ta.selectionStart
    const e   = ta.selectionEnd
    const txt = form.notas || ''
    const sel = txt.substring(s, e) || tip
    const novo = txt.substring(0, s) + open + sel + close + txt.substring(e)
    setForm(f => ({ ...f, notas: novo }))
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = s + open.length
      ta.selectionEnd   = s + open.length + sel.length
    }, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modelos de E-mail</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie templates HTML reutilizaveis para suas campanhas</p>
        </div>
        <button onClick={abrirNovo} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all">
          <Plus className="w-4 h-4" /> Novo Modelo
        </button>
      </div>

      <div className="grid gap-4">
        {lista.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p className="text-lg font-bold">Nenhum modelo cadastrado</p>
            <p className="text-sm">Clique em "Novo Modelo" para comecar</p>
          </div>
        )}
        {lista.map(item => (
          <div key={item.id} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">{item.nome}</p>
              <p className="text-sm text-muted-foreground">Assunto: {item.assunto}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Criado em: {new Date(item.criado_em).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="flex items-center gap-2">
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

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[95vh]">

            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-primary to-primary/80 text-white flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold">{editId ? 'Editar' : 'Novo'} Modelo de E-mail</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">

              {/* Nome e Assunto */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Nome do Modelo</label>
                  <input
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="Ex: Newsletter Mensal"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Assunto do E-mail</label>
                  <input
                    value={form.assunto}
                    onChange={e => setForm(f => ({ ...f, assunto: e.target.value }))}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="Ex: Novidades do mes!"
                  />
                </div>
              </div>

              {/* Variáveis + Template base */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-500 uppercase">Variaveis:</span>
                {['{{nome}}', '{{email}}'].map(v => (
                  <button key={v} onClick={() => inserirVariavel(v)}
                    className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-all border border-indigo-200">
                    {v}
                  </button>
                ))}
                <div className="ml-auto">
                  <button
                    onClick={() => setForm(f => ({ ...f, corpo_html: TEMPLATE_BASICO }))}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-all border border-slate-200">
                    Carregar Template Base
                  </button>
                </div>
              </div>

              {/* Abas */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="flex border-b border-slate-200 bg-slate-50">
                  {[
                    { id: 'visual',   icon: <Type   className="w-4 h-4" />, label: 'Editor Visual'  },
                    { id: 'html',     icon: <Code   className="w-4 h-4" />, label: 'Editor HTML'    },
                    { id: 'preview',  icon: <Eye    className="w-4 h-4" />, label: 'Preview'         },
                    { id: 'notas',    icon: <StickyNote className="w-4 h-4" />, label: 'Notas'       },
                  ].map(tab => (
                    <button key={tab.id}
                      onClick={() => setAba(tab.id)}
                      className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 ${
                        aba === tab.id
                          ? 'border-primary text-primary bg-white'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}>
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Aba Visual / HTML (mesmo editor) */}
                {(aba === 'visual' || aba === 'html') && (
                  <div className="relative">
                    <textarea
                      id="editor-html"
                      value={form.corpo_html}
                      onChange={e => setForm(f => ({ ...f, corpo_html: e.target.value }))}
                      className="w-full h-80 p-4 font-mono text-sm outline-none resize-none bg-slate-900 text-green-400"
                      placeholder="Cole ou digite o HTML do seu e-mail aqui..."
                      spellCheck={false}
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                      {form.corpo_html.length} caracteres
                    </div>
                  </div>
                )}

                {/* Aba Preview */}
                {aba === 'preview' && (
                  <div className="bg-slate-100 p-4 min-h-[320px]">
                    <div className="bg-white rounded-xl shadow-sm overflow-auto max-h-[400px]">
                      {form.corpo_html ? (
                        <iframe
                          srcDoc={form.corpo_html}
                          className="w-full min-h-[320px] border-0"
                          title="preview"
                          sandbox="allow-same-origin"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-48 text-slate-400">
                          <p className="text-sm">Nenhum conteudo para visualizar. Adicione HTML na aba Editor.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Aba Notas */}
                {aba === 'notas' && (
                  <div className="flex flex-col bg-white min-h-[320px]">
                    {/* Toolbar */}
                    <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-2 bg-slate-50 flex-wrap">
                      {[
                        ['<b>',  '</b>',  'B', 'bold',         'Negrito'   ],
                        ['<i>',  '</i>',  'I', 'italic',       'Itálico'   ],
                        ['<u>',  '</u>',  'U', 'underline',    'Sublinhado'],
                        ['<s>',  '</s>',  'S', 'line-through', 'Tachado'   ],
                      ].map(([open, close, lbl, st, tip]) => (
                        <button key={lbl} type="button" title={tip}
                          onClick={() => inserirNotasTag(open, close, tip)}
                          className="px-2.5 py-1 rounded text-xs border border-slate-200 bg-white hover:bg-slate-200 text-slate-700"
                          style={{
                            fontWeight:      st === 'bold'         ? 'bold'         : 'normal',
                            fontStyle:       st === 'italic'       ? 'italic'       : 'normal',
                            textDecoration:  ['underline','line-through'].includes(st) ? st : 'none',
                          }}>
                          {lbl}
                        </button>
                      ))}

                      <div className="w-px h-5 bg-slate-300 mx-1" />

                      <button type="button" title="Lista não ordenada"
                        onClick={() => {
                          const ta  = document.getElementById('notas-textarea')
                          if (!ta) return
                          const s   = ta.selectionStart
                          const txt = form.notas || ''
                          const ins = '<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>'
                          setForm(f => ({ ...f, notas: txt.substring(0, s) + ins + txt.substring(s) }))
                        }}
                        className="px-2.5 py-1 rounded text-xs border border-slate-200 bg-white hover:bg-slate-200 text-slate-700">
                        ≡ Lista
                      </button>

                      <button type="button" title="Linha separadora"
                        onClick={() => {
                          const ta  = document.getElementById('notas-textarea')
                          if (!ta) return
                          const s   = ta.selectionStart
                          const txt = form.notas || ''
                          const ins = '\n<hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;">\n'
                          setForm(f => ({ ...f, notas: txt.substring(0, s) + ins + txt.substring(s) }))
                        }}
                        className="px-2.5 py-1 rounded text-xs border border-slate-200 bg-white hover:bg-slate-200 text-slate-700">
                        ― Linha
                      </button>

                      <div className="w-px h-5 bg-slate-300 mx-1" />

                      <label className="flex items-center gap-1 px-2.5 py-1 rounded text-xs border border-slate-200 bg-white hover:bg-slate-200 text-slate-700 cursor-pointer" title="Inserir imagem">
                        🖼 Imagem
                        <input type="file" accept="image/*" className="hidden" onChange={e => {
                          const file = e.target.files[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => {
                            const ta  = document.getElementById('notas-textarea')
                            const s   = ta ? ta.selectionStart : (form.notas || '').length
                            const txt = form.notas || ''
                            const ins = `\n<img src="${ev.target.result}" alt="${file.name}" style="max-width:100%;border-radius:8px;margin:8px 0;">\n`
                            setForm(f => ({ ...f, notas: txt.substring(0, s) + ins + txt.substring(s) }))
                          }
                          reader.readAsDataURL(file)
                          e.target.value = ''
                        }} />
                      </label>

                      <div className="ml-auto flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none font-medium">
                          <input type="checkbox"
                            checked={form.notas_no_email || false}
                            onChange={e => setForm(f => ({ ...f, notas_no_email: e.target.checked }))}
                            className="rounded accent-primary" />
                          Incluir no e-mail
                        </label>
                      </div>
                    </div>

                    {/* Textarea */}
                    <textarea
                      id="notas-textarea"
                      value={form.notas || ''}
                      onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                      className="w-full min-h-[180px] p-4 text-sm text-slate-700 outline-none resize-none font-mono border-0"
                      style={{ lineHeight: '1.7' }}
                      placeholder={"Escreva suas anotações aqui...\nSuporta HTML: <b>negrito</b>, <i>itálico</i>"}
                    />

                    {/* Prévia */}
                    {form.notas && (
                      <div className="border-t border-slate-200">
                        <div className="px-4 py-1.5 bg-slate-50 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase">Prévia</span>
                          {form.notas_no_email && (
                            <span className="text-xs text-green-600 font-bold">✓ Será incluído no e-mail</span>
                          )}
                        </div>
                        <div className="p-4 text-sm text-slate-700 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: form.notas }} />
                      </div>
                    )}

                    {/* Rodapé */}
                    <div className="px-4 py-2 border-t border-slate-100 bg-amber-50">
                      <p className="text-xs text-amber-600">
                        {form.notas_no_email
                          ? '📧 Este conteúdo será anexado ao e-mail enviado.'
                          : '💡 Notas internas — marque "Incluir no e-mail" para enviar junto.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Dica: Use HTML completo com estilos inline para melhor compatibilidade com clientes de e-mail.
                Use as variaveis <strong>{'{{nome}}'}</strong> e <strong>{'{{email}}'}</strong> para personalizar.
              </p>
            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
              <button onClick={() => setModal(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100">
                Cancelar
              </button>
              <button onClick={salvar} disabled={loading} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50">
                {loading ? 'Salvando...' : 'Salvar Modelo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
