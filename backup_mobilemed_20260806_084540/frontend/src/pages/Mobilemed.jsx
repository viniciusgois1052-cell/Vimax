import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  RefreshCw, Plus, Trash2, Download, CheckCircle, Clock,
  AlertTriangle, Loader, ChevronDown, ChevronUp, X, Database,
  Send, Settings, Search, Info
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
  erro:         { label: 'Erro',         color: 'bg-red-100 text-red-700',       icon: AlertTriangle },
}

const AMBIENTES = [
  {
    valor: 'homolog',
    titulo: 'Homologação',
    descricao: 'Ambiente de teste. Não mexe em dados reais — use para experimentar campos e filtros.',
  },
  {
    valor: 'prod',
    titulo: 'Produção',
    descricao: 'Dados reais dos exames. Use quando já souber exatamente o que precisa.',
  },
]

const CAMPOS_DATA_FILTRO = [
  { valor: 'exame.data_criacao',     label: 'Data de criação' },
  { valor: 'exame.data_realizacao',  label: 'Data de realização' },
  { valor: 'exame.updated_at',       label: 'Data de atualização' },
  { valor: 'exame.ultima_data_laudo', label: 'Última data do laudo' },
]

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

// ── Bloco de passo numerado, reutilizado no modal ──────────────────────────
const Passo = ({ numero, titulo, subtitulo, children }) => (
  <div className="space-y-3">
    <div className="flex items-start gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {numero}
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground">{titulo}</h3>
        {subtitulo && <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>}
      </div>
    </div>
    <div className="pl-10">{children}</div>
  </div>
)

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
  const [buscaCampo,  setBuscaCampo]  = useState('')

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg })
    setTimeout(() => setFeedback(null), 5000)
  }

  const isUsuarioCampo = (c) => (c || '').startsWith('usuario.')
  const hasCampo = (arr, val) => Array.isArray(arr) && arr.includes(val)

  const validarSelecaoCampos = (campos) => {
    // Regras para evitar erro Mobilemed: Not unique table/alias: 'u'
    if (hasCampo(campos, 'usuario.nome') && hasCampo(campos, 'usuario.digitador_nome')) {
      return "A Mobilemed não aceita 'usuario.nome' junto com 'usuario.digitador_nome'. Selecione apenas um deles."
    }
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
  const ambienteSolicitado = form.ambiente
  const res = await fetch(`${API}/unidades?ambiente=${ambienteSolicitado}`, { headers })
  if (res.ok) {
    const data = await res.json()
    setForm(f => {
      if (f.ambiente === ambienteSolicitado) {
        setUnidades(data.unidadesDisponiveis || [])
      }
      return f
    })
  } else {
    setUnidades([])
  }
  setLoadingUnid(false)
}

  useEffect(() => {
    carregar()
  }, [])

  // Se o usuário troca de ambiente com o modal já aberto, recarrega as unidades daquele ambiente
  useEffect(() => {
    if (modal) carregarUnidades()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ambiente])

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
      return { ...f, campos: next }
    })
  }

  const removerCampo = (campo) => {
    setForm(f => ({ ...f, campos: f.campos.filter(c => c !== campo) }))
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

  // Campos do grupo ativo, filtrados pela busca (funciona em qualquer aba)
  const camposVisiveis = useMemo(() => {
    const termo = buscaCampo.trim().toLowerCase()
    if (!termo) return CAMPOS_GRUPOS[abaCampos]
    // com busca ativa, ignora a aba e procura em todos os grupos
    return Object.values(CAMPOS_GRUPOS).flat().filter(c => c.toLowerCase().includes(termo))
  }, [abaCampos, buscaCampo])

  const passoValido = {
    1: !!form.nome,
    2: !!form.data_inicio && !!form.data_fim,
    3: form.campos.length > 0,
  }

  const solicitar = async () => {
    if (!form.nome)           return showFeedback('erro', 'Informe um nome para o relatório!')
    if (!form.campos.length)  return showFeedback('erro', 'Selecione pelo menos um campo!')
    if (!form.data_inicio || !form.data_fim) return showFeedback('erro', 'Informe o período!')

    setLoading(true)
    const unidadesParaEnviar = (form.unidades && form.unidades.length)
      ? form.unidades
      : (unidades || [])

    const filtros = [
      {
        campo:    form.campo_data_filtro || 'exame.data_criacao',
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
      showFeedback('ok', `Relatório solicitado! ID: ${data.request_id}. Aguarde o webhook.`)
      setModal(false)
      setForm(formVazio)
      setBuscaCampo('')
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

  const fecharModal = () => {
    setModal(false)
    setBuscaCampo('')
  }

  return (
    <div className="space-y-6">

      {feedback && (
        <div className={`fixed top-6 right-6 z-[200] max-w-md px-6 py-3 rounded-2xl shadow-xl font-bold text-white transition-all text-sm ${feedback.type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-primary" /> Relatórios Mobilemed
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Peça um relatório de exames em CSV para usar no PowerBI. Escolha o período e os
            campos que você precisa — o resto acontece sozinho.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
            <RefreshCw className="w-4 h-4" /> Atualizar lista
          </button>
          <button onClick={() => { setModal(true); carregarUnidades() }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> Novo Relatório
          </button>
        </div>
      </div>

      {/* Info PowerBI */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-blue-700">Como isso chega no PowerBI</p>
          <p className="text-xs text-blue-600 mt-1">
            Quando o relatório fica pronto, a Mobilemed avisa este sistema automaticamente e o
            CSV é salvo no banco de dados, na tabela{' '}
            <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">mobilemed_relatorios</code>.
            É só conectar o PowerBI direto nessa tabela.
          </p>
        </div>
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
          const statusUI = rel.csv_url ? 'concluido' : (rel.status || 'aguardando')
          const st   = statusConfig[statusUI] || statusConfig.aguardando
          const Icon = st.icon
          const open = expandId === rel.id

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
                    <span>{rel.campos?.length || 0} campo(s)</span>
                    {rel.csv_url && rel.total_registros === 0 && <span className="text-amber-600 font-bold">0 registros encontrados</span>}
                    {rel.total_registros > 0 && <span className="text-green-600 font-bold">✓ {rel.total_registros} registros</span>}
                    <span>Por: {rel.solicitado_por}</span>
                    <span>{rel.solicitado_em ? new Date(rel.solicitado_em).toLocaleString('pt-BR') : ''}</span>
                  </div>
                  {rel.request_id && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {rel.request_id}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {rel.csv_url && (
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

      {/* Modal novo relatório */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">

            <div className="p-6 bg-gradient-to-r from-primary to-primary/80 text-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-lg font-bold">Novo Relatório Mobilemed</h2>
                <p className="text-sm opacity-80">Quatro passos rápidos e o relatório entra na fila</p>
              </div>
              <button onClick={fecharModal}><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* Passo 1 — Nome e ambiente */}
              <Passo numero={1} titulo="Dê um nome e escolha o ambiente">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Nome do Relatório</label>
                    <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                      placeholder="Ex: Exames Abril 2026" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {AMBIENTES.map(a => (
                      <button key={a.valor} type="button"
                        onClick={() => setForm(f => ({ ...f, ambiente: a.valor }))}
                        className={`text-left p-4 rounded-xl border-2 transition-all ${
                          form.ambiente === a.valor
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        <p className={`text-sm font-bold ${form.ambiente === a.valor ? 'text-primary' : 'text-slate-700'}`}>
                          {a.titulo}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{a.descricao}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </Passo>

              {/* Passo 2 — Período */}
              <Passo numero={2} titulo="Escolha o período" subtitulo="Quais exames entram no relatório">
                <div className="space-y-4">
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
                    <label className="text-xs font-bold text-slate-600 uppercase">Qual data usar para filtrar?</label>
                    <select
                      value={form.campo_data_filtro || 'exame.data_criacao'}
                      onChange={e => setForm(f => ({ ...f, campo_data_filtro: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      {CAMPOS_DATA_FILTRO.map(c => (
                        <option key={c.valor} value={c.valor}>{c.label}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-muted-foreground">
                      Se o CSV vier vazio, tente trocar essa opção — em homologação, "Data de criação" costuma ter mais resultados.
                    </p>
                  </div>
                </div>
              </Passo>

              {/* Passo 3 — Campos */}
              <Passo numero={3} titulo="Escolha os campos do CSV" subtitulo={`${form.campos.length} campo(s) selecionado(s)`}>
                <div className="space-y-3">
                  {/* Chips dos campos já escolhidos */}
                  {form.campos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                      {form.campos.map(c => (
                        <button key={c} type="button" onClick={() => removerCampo(c)}
                          className="flex items-center gap-1 text-[11px] bg-white border border-primary/30 text-primary px-2 py-1 rounded-full font-mono hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all">
                          {c} <X className="w-2.5 h-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input value={buscaCampo} onChange={e => setBuscaCampo(e.target.value)}
                        placeholder="Buscar campo (ex: crm, paciente, status...)"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary text-xs" />
                    </div>
                    <button onClick={selecionarTodos}
                      className="text-xs text-primary font-bold hover:underline shrink-0">
                      {Object.values(CAMPOS_GRUPOS).flat().every(c => form.campos.includes(c)) ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>

                  {/* Abas de grupos — escondidas durante a busca, porque a busca já olha todos os grupos */}
                  {!buscaCampo && (
                    <>
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
                      <button onClick={() => selecionarGrupo(abaCampos)}
                        className="text-xs text-primary font-bold hover:underline">
                        {CAMPOS_GRUPOS[abaCampos].every(c => form.campos.includes(c))
                          ? `Desmarcar grupo "${abaCampos}"`
                          : `Selecionar grupo "${abaCampos}"`}
                      </button>
                    </>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                    {camposVisiveis.length === 0 && (
                      <p className="col-span-full text-center text-xs text-slate-400 py-6">
                        Nenhum campo encontrado para "{buscaCampo}"
                      </p>
                    )}
                    {camposVisiveis.map(campo => (
                      <label key={campo}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${form.campos.includes(campo) ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                        <input type="checkbox" checked={form.campos.includes(campo)} onChange={() => toggleCampo(campo)} className="accent-primary" />
                        <span className="font-mono truncate" title={campo}>{campo}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </Passo>

              {/* Passo 4 — Revisão */}
              <Passo numero={4} titulo="Revise e envie">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-slate-400 font-bold uppercase text-[10px]">Ambiente</p>
                      <p className="text-slate-700 font-bold mt-0.5">
                        {AMBIENTES.find(a => a.valor === form.ambiente)?.titulo}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-slate-400 font-bold uppercase text-[10px]">Período</p>
                      <p className="text-slate-700 font-bold mt-0.5">
                        {form.data_inicio || '—'} até {form.data_fim || '—'}
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <p className="text-slate-400 font-bold uppercase text-[10px]">Unidades</p>
                      <p className="text-slate-700 font-bold mt-0.5">
                        {loadingUnid ? 'Carregando...' : `${unidades.length} unidade(s), todas incluídas`}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                    Quando o relatório ficar pronto, este sistema é avisado automaticamente e o CSV
                    aparece na lista — não é preciso ficar atualizando a página.
                  </div>
                </div>
              </Passo>

            </div>

            <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs">
                {[1, 2, 3].map(n => (
                  <span key={n} className={`flex items-center gap-1 font-bold ${passoValido[n] ? 'text-green-600' : 'text-slate-300'}`}>
                    {passoValido[n] ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 inline-block" />}
                    Passo {n}
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={fecharModal}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100">
                  Cancelar
                </button>
                <button onClick={solicitar} disabled={loading || !passoValido[1] || !passoValido[2] || !passoValido[3]}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
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