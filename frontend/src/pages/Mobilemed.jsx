import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  RefreshCw, Plus, Trash2, Download, CheckCircle, Clock,
  AlertTriangle, Loader, ChevronDown, ChevronUp, X, Database,
  Send, Settings
} from 'lucide-react'

const API = '/api/mobilemed'
const WEBHOOK_URL = 'https://proven-duck-instantly.ngrok-free.app/api/mobilemed/webhook'

const CAMPOS_GRUPOS = {
  'Exame': [
    'exame.id', 'exame.empresa_id', 'exame.pacs_accession_no',
    'exame.status_id', 'exame.prioridade_id', 'exame.modalidade_id',
    'exame.subespecialidade_id', 'exame.data_criacao', 'exame.data_realizacao',
    'exame.updated_at', 'exame.is_liberado', 'exame.is_excluido',
    'exame.codigo_paciente', 'exame.nome_paciente', 'exame.codigo_pedido',
    'exame.idade_paciente', 'exame.ia_status', 'exame.estudo_descricao',
    'exame.valor', 'exame.is_duplicado', 'exame.data_transferencia_final',
    'exame.ultima_data_laudo', 'exame.sla_expiration_date',
    'exame.count_images', 'exame.count_key_images',
  ],
  'Empresa': [
    'empresa.id', 'empresa.nome_fantasia', 'empresa.is_ativa',
    'empresa.data_criacao', 'empresa.updated_at',
  ],
  'Usuário / Médico': [
    'usuario.id', 'usuario.nome', 'usuario.digitador_nome',
    'usuario.cod_interno', 'usuario.crm', 'usuario.is_ativo',
    'usuario.data_criacao',
  ],
  'Status / Prioridade': [
    'status.id', 'status.descricao',
    'prioridade.id', 'prioridade.nome',
  ],
  'Modalidade / Subespecialidade': [
    'modalidade.id', 'modalidade.nome',
    'subespecialidade.id', 'subespecialidade.descricao', 'subespecialidade.valor',
    'especialidade.id',
  ],
  'Laudo': [
    'laudo_usuario.action',
    'laudo_usuario.segunda_assinatura_laudo',
    'laudo_usuario.segunda_assinatura_laudo_id',
  ],
}

const statusConfig = {
  aguardando:   { label: 'Aguardando',   color: 'bg-slate-100 text-slate-600',   icon: Clock },
  processando:  { label: 'Processando',  color: 'bg-blue-100 text-blue-700',     icon: Loader },
  concluido:    { label: 'Concluído',    color: 'bg-green-100 text-green-700',   icon: CheckCircle },
  vazio:        { label: 'Sem dados',    color: 'bg-amber-100 text-amber-800',   icon: AlertTriangle },
  erro:         { label: 'Erro',         color: 'bg-red-100 text-red-700',       icon: AlertTriangle },
}

const formVazio = {
  nome:        '',
  ambiente:    'homolog',
  data_inicio: '',
  data_fim:    '',
  campo_data_filtro: 'exame.data_criacao',
  campos:      [],
  unidades:    [],
  webhook_url: WEBHOOK_URL,
}

export default function Mobilemed() {
  const { user } = useAuth()
  const headers  = {
    'Content-Type': 'application/json',
    ...(user?.api_token ? { 'X-API-Token': user.api_token } : {})
  }

  const [relatorios,  setRelatorios]  = useState([])
  const [unidades,    setUnidades]    = useState([])
  const [loading,     setLoading]     = useState(false)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(formVazio)
  const [expandId,    setExpandId]    = useState(null)
  const [feedback,    setFeedback]    = useState(null)
  const [loadingUnid, setLoadingUnid] = useState(false)
  const [abaCampos,   setAbaCampos]   = useState(Object.keys(CAMPOS_GRUPOS)[0])

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 6000)
  }

  const isUsuarioCampo = (c) => (c || '').startsWith('usuario.')
  const hasCampo = (arr, val) => Array.isArray(arr) && arr.includes(val)

  const validarSelecaoCampos = (campos) => {
    // Regras para evitar erro Mobilemed: Not unique table/alias: 'u'
    // 1) usuario.nome e usuario.digitador_nome não podem juntos
    if (hasCampo(campos, 'usuario.nome') && hasCampo(campos, 'usuario.digitador_nome')) {
      return "A Mobilemed não aceita 'usuario.nome' junto com 'usuario.digitador_nome'. Selecione apenas um deles."
    }

    // 2) laudo_usuario.action não pode junto com usuario.*
    if (hasCampo(campos, 'laudo_usuario.action') && campos.some(isUsuarioCampo)) {
      return "A Mobilemed pode falhar com 'laudo_usuario.action' junto com campos 'usuario.*'. Remova os campos de usuário ou remova 'laudo_usuario.action'."
    }

    return null
  }

  const carregar = async () => {
    const res = await fetch(`${API}/relatorios`, { headers })
    if (res.ok) setRelatorios(await res.json())
  }

  const carregarUnidades = async () => {
    setLoadingUnid(true)
    const res = await fetch(`${API}/unidades?ambiente=${form.ambiente}`, { headers })
    if (res.ok) {
      const data = await res.json()
      setUnidades(data.unidadesDisponiveis || [])
    }
    setLoadingUnid(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const toggleCampo = (campo) => {
    setForm(f => {
      const next = f.campos.includes(campo)
        ? f.campos.filter(c => c !== campo)
        : [...f.campos, campo]

      const erro = validarSelecaoCampos(next)
      if (erro) {
        showFeedback('erro', erro)
        return f
      }

      // Se acabou de marcar data_realizacao, sugere filtrar por ela (evita confusão)
      let nextCampoData = f.campo_data_filtro
      if (!f.campos.includes('exame.data_realizacao') && next.includes('exame.data_realizacao')) {
        nextCampoData = 'exame.data_realizacao'
      }

      return { ...f, campos: next, campo_data_filtro: nextCampoData }
    })
  }

  const selecionarGrupo = (grupo) => {
    const campos = CAMPOS_GRUPOS[grupo]
    const todos  = campos.every(c => form.campos.includes(c))
    if (todos) {
      setForm(f => ({ ...f, campos: f.campos.filter(c => !campos.includes(c)) }))
    } else {
      setForm(f => ({ ...f, campos: [...new Set([...f.campos, ...campos])] }))
    }
  }

  const selecionarTodos = () => {
    const todos = Object.values(CAMPOS_GRUPOS).flat()
    const marcados = todos.every(c => form.campos.includes(c))
    setForm(f => ({ ...f, campos: marcados ? [] : todos }))
  }

  const solicitar = async () => {
    if (!form.nome) return showFeedback('erro', 'Informe um nome para o relatório!')
    if (!form.campos.length) return showFeedback('erro', 'Selecione pelo menos um campo!')
    if (!form.data_inicio || !form.data_fim) return showFeedback('erro', 'Informe o período!')

    // Evita solicitar relatório com campos "pouco úteis" (que gera confusão)
    const hasChave = form.campos.includes('exame.id') || form.campos.includes('exame.pacs_accession_no')
    if (!hasChave) {
      return showFeedback('erro', "Selecione pelo menos um campo-chave: 'exame.id' ou 'exame.pacs_accession_no'.")
    }

    const campoData = form.campo_data_filtro || 'exame.data_criacao'
    setLoading(true)

    const unidadesParaEnviar = (form.unidades && form.unidades.length)
      ? form.unidades
      : (unidades || [])

    const filtros = [
      {
        campo:    campoData,
        operador: 'between',
        valor:    [form.data_inicio, form.data_fim]
      }
    ]

    const res = await fetch(`${API}/solicitar`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...form, unidades: unidadesParaEnviar, filtros })
    })
    const data = await res.json()

    if (res.ok && data.success) {
      showFeedback('ok', `Relatório solicitado! ID interno: ${data.relatorio_id}. Aguarde o webhook.`)
      setModal(false)
      setForm(formVazio)
      carregar()
    } else {
      showFeedback('erro', data.error || 'Erro ao solicitar relatório')
    }

    setLoading(false)
  }

  const deletar = async (id) => {
    if (!confirm('Remover este relatório?')) return
    await fetch(`${API}/relatorios/${id}`, { method: 'DELETE', headers })
    carregar()
  }

  const verificar = async (id) => {
    const res  = await fetch(`${API}/relatorios/${id}/verificar`, { method: 'POST', headers, body: '{}' })
    const data = await res.json()
    showFeedback(res.ok ? 'ok' : 'erro', JSON.stringify(data))
    carregar()
  }

  const getCampoFiltroFromRel = (rel) => {
    try {
      const f0 = Array.isArray(rel?.filtros) ? rel.filtros[0] : null
      return f0?.campo || null
    } catch {
      return null
    }
  }

  const isEmptyCsvUrl = (url) => (url || '').includes('empty-report.csv')

  return (
    <div className="space-y-6">

      {/* Feedback */}
      {feedback && (
        <div className={`fixed top-6 right-6 z-[200] max-w-md px-6 py-3 rounded-2xl shadow-xl font-bold text-white transition-all text-sm ${feedback.type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> Mobilemed — Relatórios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Solicite relatórios via API e receba via webhook para integração com PowerBI
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
          <button onClick={() => { setModal(true); carregarUnidades() }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> Novo Relatório
          </button>
        </div>
      </div>

      {/* Info PowerBI */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-blue-700 flex items-center gap-2">
          <Settings className="w-4 h-4" /> Integração PowerBI
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Webhook receptor: <code className="bg-blue-100 px-2 py-0.5 rounded font-mono">{WEBHOOK_URL}</code>
          <br />
          Os relatórios concluídos ficam armazenados no banco de dados e podem ser acessados diretamente pelo PowerBI
          via conexão PostgreSQL/MySQL na tabela <code className="bg-blue-100 px-2 py-0.5 rounded font-mono">mobilemed_relatorios</code>.
        </p>
      </div>

      {/* Lista de relatórios */}
      <div className="space-y-3">
        {relatorios.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
            <Database className="w-12 h-12 mx-auto opacity-20 mb-3" />
            <p className="font-bold">Nenhum relatório solicitado ainda</p>
            <p className="text-sm">Clique em "Novo Relatório" para começar</p>
          </div>
        )}

        {relatorios.map(rel => {
          const emptyCsv = isEmptyCsvUrl(rel.csv_url)
          const statusUI =
            (rel.status === 'vazio' || emptyCsv) ? 'vazio'
              : (rel.csv_url ? 'concluido' : (rel.status || 'aguardando'))

          const st   = statusConfig[statusUI] || statusConfig.aguardando
          const Icon = st.icon
          const open = expandId === rel.id
          const campoFiltro = getCampoFiltroFromRel(rel)

          return (
            <div key={rel.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-foreground truncate">{rel.nome}</p>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold ${st.color}`}>
                      <Icon className={`w-3 h-3 ${rel.status === 'processando' ? 'animate-spin' : ''}`} />
                      {st.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    <span>Período: {rel.data_inicio} → {rel.data_fim}</span>
                    {campoFiltro && <span>Filtro: <span className="font-mono">{campoFiltro}</span></span>}
                    <span>Campos: {rel.campos?.length || 0}</span>
                    {statusUI === 'vazio' && <span className="text-amber-700 font-bold">0 registros</span>}
                    {statusUI !== 'vazio' && rel.total_registros > 0 && <span className="text-green-600 font-bold">✓ {rel.total_registros} registros</span>}
                    <span>Por: {rel.solicitado_por}</span>
                    <span>{rel.solicitado_em ? new Date(rel.solicitado_em).toLocaleString('pt-BR') : ''}</span>
                  </div>
                  {rel.request_id && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {rel.request_id}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(rel.csv_url && !emptyCsv && statusUI !== 'vazio') && (
                    <a href={rel.csv_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-all">
                      <Download className="w-3 h-3" /> CSV
                    </a>
                  )}
                  {rel.status === 'processando' && (
                    <button onClick={() => verificar(rel.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all">
                      <RefreshCw className="w-3 h-3" /> Verificar
                    </button>
                  )}
                  <button onClick={() => setExpandId(open ? null : rel.id)}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
                    {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deletar(rel.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {open && (
                <div className="border-t border-border p-4 bg-muted/20 space-y-3">
                  {statusUI === 'vazio' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                      <div className="font-bold mb-1">Relatório concluído sem dados</div>
                      <div className="font-mono break-words">
                        {rel.erro_msg || 'Nenhum registro encontrado para os filtros aplicados.'}
                      </div>
                    </div>
                  )}
                  {(statusUI === 'erro' && rel.erro_msg) && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-mono">
                      {rel.erro_msg}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Campos solicitados ({rel.campos?.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {(rel.campos || []).map(c => (
                        <span key={c} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">

            <div className="p-6 bg-gradient-to-r from-primary to-primary/80 text-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold">Novo Relatório Mobilemed</h2>
                <p className="text-sm opacity-80">Configure os campos e solicite o relatório CSV</p>
              </div>
              <button onClick={() => setModal(false)}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Nome do Relatório</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    placeholder="Ex: Exames Abril 2026" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Ambiente</label>
                  <select value={form.ambiente} onChange={e => setForm(f => ({ ...f, ambiente: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm">
                    <option value="homolog">Homologação</option>
                    <option value="prod">Produção</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Data Início</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Data Fim</label>
                  <input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Filtrar por (data)</label>
                <select
                  value={form.campo_data_filtro || 'exame.data_criacao'}
                  onChange={e => setForm(f => ({ ...f, campo_data_filtro: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  <option value="exame.data_criacao">Data de criação (exame.data_criacao)</option>
                  <option value="exame.data_realizacao">Data de realização (exame.data_realizacao)</option>
                  <option value="exame.updated_at">Atualização (exame.updated_at)</option>
                  <option value="exame.ultima_data_laudo">Última data laudo (exame.ultima_data_laudo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">URL do Webhook</label>
                <div className="w-full px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm font-mono text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {WEBHOOK_URL}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 uppercase">
                    Campos do CSV ({form.campos.length} selecionados)
                  </label>
                  <button onClick={selecionarTodos}
                    className="text-xs text-primary font-bold hover:underline">
                    {Object.values(CAMPOS_GRUPOS).flat().every(c => form.campos.includes(c)) ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
                  {Object.keys(CAMPOS_GRUPOS).map(grupo => (
                    <button key={grupo} onClick={() => setAbaCampos(grupo)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${abaCampos === grupo ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      {grupo}
                      {CAMPOS_GRUPOS[grupo].some(c => form.campos.includes(c)) && (
                        <span className="ml-1 text-[9px]">●</span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => selecionarGrupo(abaCampos)}
                    className="text-xs text-primary font-bold hover:underline">
                    {CAMPOS_GRUPOS[abaCampos].every(c => form.campos.includes(c))
                      ? `Desmarcar grupo "${abaCampos}"`
                      : `Selecionar grupo "${abaCampos}"`}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CAMPOS_GRUPOS[abaCampos].map(campo => (
                    <label key={campo}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${form.campos.includes(campo) ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                      <input type="checkbox" checked={form.campos.includes(campo)} onChange={() => toggleCampo(campo)} className="accent-primary" />
                      <span className="font-mono truncate">{campo.split('.')[1]}</span>
                    </label>
                  ))}
                </div>

                <div className="text-[10px] text-slate-500">
                  Obrigatório: selecione pelo menos <code className="font-mono">exame.id</code> ou <code className="font-mono">exame.pacs_accession_no</code>.
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                {loadingUnid
                  ? <span className="flex items-center gap-2"><Loader className="w-3 h-3 animate-spin" /> Carregando unidades...</span>
                  : <span>✓ <strong>{unidades.length} unidades</strong> disponíveis para este grupo (todas serão incluídas)</span>
                }
              </div>

            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <p className="text-xs text-slate-400">
                O relatório será processado de forma assíncrona e notificado via webhook
              </p>
              <div className="flex gap-3">
                <button onClick={() => setModal(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100">
                  Cancelar
                </button>
                <button onClick={solicitar} disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50">
                  {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? 'Solicitando...' : 'Solicitar Relatório'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
