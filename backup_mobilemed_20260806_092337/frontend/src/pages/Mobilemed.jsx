import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Download,
  Info,
  Loader,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'

const API = '/api/mobilemed'
const DEFAULT_NGROK_WEBHOOK_URL = 'https://proven-duck-instantly.ngrok-free.app/api/mobilemed/webhook'
const WEBHOOK_STORAGE_KEY = 'vimax_mobilemed_webhook_url'

const getWebhookUrlInicial = () => {
  const configuradaNoBuild = import.meta.env.VITE_MOBILEMED_WEBHOOK_URL
  if (configuradaNoBuild) return configuradaNoBuild

  try {
    return window.localStorage.getItem(WEBHOOK_STORAGE_KEY)
      || DEFAULT_NGROK_WEBHOOK_URL
  } catch {
    return DEFAULT_NGROK_WEBHOOK_URL
  }
}

const validarWebhookUrl = (valor) => {
  const texto = String(valor || '').trim()
  if (!texto) return 'Informe a URL HTTPS pública do ngrok.'

  try {
    const url = new URL(texto)
    if (url.protocol !== 'https:') {
      return 'O webhook da MobileMed deve usar HTTPS. Use a URL https:// do ngrok.'
    }

    const host = url.hostname.toLowerCase()
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(host) || host.endsWith('.local')) {
      return 'Use o endereço público do ngrok, não localhost ou IP interno.'
    }

    if (!url.pathname.endsWith('/api/mobilemed/webhook')) {
      return 'A URL deve terminar com /api/mobilemed/webhook.'
    }
  } catch {
    return 'A URL do webhook é inválida. Cole a URL HTTPS completa do ngrok.'
  }

  return null
}

const CAMPOS_GRUPOS = {
  Exame: [
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
  Empresa: [
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
    'subespecialidade.id', 'subespecialidade.descricao',
    'subespecialidade.valor', 'especialidade.id',
  ],
  Laudo: [
    'laudo_usuario.action',
    'laudo_usuario.segunda_assinatura_laudo',
    'laudo_usuario.segunda_assinatura_laudo_id',
  ],
}

const CAMPOS_LABELS = {
  'exame.id': 'ID do exame',
  'exame.nome_paciente': 'Nome do paciente',
  'exame.codigo_paciente': 'Código do paciente',
  'exame.codigo_pedido': 'Código do pedido',
  'exame.data_criacao': 'Data de criação',
  'exame.data_realizacao': 'Data de realização',
  'exame.updated_at': 'Data de atualização',
  'exame.ultima_data_laudo': 'Última data do laudo',
  'exame.estudo_descricao': 'Descrição do estudo',
  'exame.valor': 'Valor do exame',
  'empresa.nome_fantasia': 'Empresa',
  'usuario.nome': 'Médico / usuário',
  'usuario.digitador_nome': 'Digitador',
  'usuario.crm': 'CRM',
  'status.descricao': 'Status',
  'prioridade.nome': 'Prioridade',
  'modalidade.nome': 'Modalidade',
  'subespecialidade.descricao': 'Subespecialidade',
}

const CAMPOS_DATA_FILTRO = [
  { valor: 'exame.data_criacao', label: 'Data de criação' },
  { valor: 'exame.data_realizacao', label: 'Data de realização' },
  { valor: 'exame.updated_at', label: 'Data de atualização' },
  { valor: 'exame.ultima_data_laudo', label: 'Última data do laudo' },
]

const AMBIENTES = [
  {
    valor: 'homolog',
    titulo: 'Homologação',
    descricao: 'Ambiente de teste para validar campos e filtros.',
  },
  {
    valor: 'prod',
    titulo: 'Produção',
    descricao: 'Dados reais dos exames da MobileMed.',
  },
]

const statusConfig = {
  aguardando: {
    label: 'Aguardando',
    color: 'bg-slate-100 text-slate-600',
    icon: Clock,
  },
  processando: {
    label: 'Processando',
    color: 'bg-blue-100 text-blue-700',
    icon: Loader,
  },
  concluido: {
    label: 'Concluído',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  erro: {
    label: 'Erro',
    color: 'bg-red-100 text-red-700',
    icon: AlertTriangle,
  },
}

const NOVO_FORM = {
  nome: '',
  ambiente: 'homolog',
  data_inicio: '',
  data_fim: '',
  campo_data_filtro: 'exame.data_criacao',
  campos: [],
  unidades: [],
  webhook_url: getWebhookUrlInicial(),
}

const isBINome = (nome) => String(nome || '')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .startsWith('BI')

const nomeCampo = (campo) => CAMPOS_LABELS[campo] || campo

const Passo = ({ numero, titulo, subtitulo, children }) => (
  <section className="space-y-3">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {numero}
      </span>
      <div>
        <h3 className="text-sm font-bold text-foreground">{titulo}</h3>
        {subtitulo && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</p>
        )}
      </div>
    </div>
    <div className="pl-10">{children}</div>
  </section>
)

export default function Mobilemed() {
  const { user } = useAuth()

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(user?.api_token ? { 'X-API-Token': user.api_token } : {}),
  }), [user?.api_token])

  const [relatorios, setRelatorios] = useState([])
  const [unidades, setUnidades] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [baixando, setBaixando] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(NOVO_FORM)
  const [expandId, setExpandId] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [abaCampos, setAbaCampos] = useState(Object.keys(CAMPOS_GRUPOS)[0])
  const [buscaCampo, setBuscaCampo] = useState('')

  const showFeedback = (type, msg) => {
    setFeedback({ type, msg })
    window.setTimeout(() => setFeedback(null), 6000)
  }

  const fetchJson = async (url, options = {}) => {
    const resposta = await fetch(url, { ...options, headers: options.headers || headers })
    let dados = {}
    try {
      dados = await resposta.json()
    } catch {
      dados = {}
    }
    if (!resposta.ok) {
      throw new Error(dados.error || `Erro HTTP ${resposta.status}`)
    }
    return dados
  }

  const carregar = async (silencioso = false) => {
    try {
      const dados = await fetchJson(`${API}/relatorios`)
      setRelatorios(Array.isArray(dados) ? dados : [])
    } catch (erro) {
      if (!silencioso) showFeedback('erro', erro.message)
    }
  }

  const carregarUnidades = async (ambiente = form.ambiente) => {
    setLoadingUnidades(true)
    try {
      const dados = await fetchJson(`${API}/unidades?ambiente=${ambiente}`)
      setUnidades(dados.unidadesDisponiveis || dados.unidades || [])
    } catch (erro) {
      setUnidades([])
      showFeedback('erro', `Não foi possível carregar as unidades: ${erro.message}`)
    } finally {
      setLoadingUnidades(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  useEffect(() => {
    if (!modal) return undefined
    carregarUnidades(form.ambiente)
    return undefined
  }, [modal, form.ambiente])

  useEffect(() => {
    const temProcessando = relatorios.some((rel) => (
      rel.status === 'aguardando' || rel.status === 'processando'
    ))
    if (!temProcessando) return undefined

    const timer = window.setInterval(() => carregar(true), 15000)
    return () => window.clearInterval(timer)
  }, [relatorios])

  const validarSelecaoCampos = (campos) => {
    if (campos.includes('usuario.nome') && campos.includes('usuario.digitador_nome')) {
      return 'A MobileMed não aceita usuario.nome junto com usuario.digitador_nome.'
    }
    if (
      campos.includes('laudo_usuario.action')
      && campos.some((campo) => campo.startsWith('usuario.'))
    ) {
      return 'laudo_usuario.action não pode ser combinado com campos usuario.*.'
    }
    return null
  }

  const sanitizarCamposEmLote = (campos) => {
    let resultado = [...new Set(campos)]
    const removidos = []

    if (resultado.includes('usuario.nome') && resultado.includes('usuario.digitador_nome')) {
      resultado = resultado.filter((campo) => campo !== 'usuario.digitador_nome')
      removidos.push('usuario.digitador_nome')
    }

    if (
      resultado.includes('laudo_usuario.action')
      && resultado.some((campo) => campo.startsWith('usuario.'))
    ) {
      resultado = resultado.filter((campo) => campo !== 'laudo_usuario.action')
      removidos.push('laudo_usuario.action')
    }

    if (removidos.length) {
      showFeedback('erro', `Campos incompatíveis ignorados: ${removidos.join(', ')}`)
    }
    return resultado
  }

  const toggleCampo = (campo) => {
    setForm((atual) => {
      const campos = atual.campos.includes(campo)
        ? atual.campos.filter((item) => item !== campo)
        : [...atual.campos, campo]
      const erro = validarSelecaoCampos(campos)
      if (erro) {
        showFeedback('erro', erro)
        return atual
      }
      return { ...atual, campos }
    })
  }

  const selecionarGrupo = (grupo) => {
    const camposGrupo = CAMPOS_GRUPOS[grupo]
    setForm((atual) => {
      const todos = camposGrupo.every((campo) => atual.campos.includes(campo))
      if (todos) {
        return {
          ...atual,
          campos: atual.campos.filter((campo) => !camposGrupo.includes(campo)),
        }
      }
      return {
        ...atual,
        campos: sanitizarCamposEmLote([...atual.campos, ...camposGrupo]),
      }
    })
  }

  const selecionarTodos = () => {
    const todos = Object.values(CAMPOS_GRUPOS).flat()
    setForm((atual) => ({
      ...atual,
      campos: todos.every((campo) => atual.campos.includes(campo))
        ? []
        : sanitizarCamposEmLote(todos),
    }))
  }

  const camposVisiveis = useMemo(() => {
    const termo = buscaCampo.trim().toLowerCase()
    const base = termo
      ? Object.values(CAMPOS_GRUPOS).flat()
      : CAMPOS_GRUPOS[abaCampos]

    if (!termo) return base
    return base.filter((campo) => (
      campo.toLowerCase().includes(termo)
      || nomeCampo(campo).toLowerCase().includes(termo)
    ))
  }, [abaCampos, buscaCampo])

  const solicitar = async () => {
    if (!form.nome.trim()) return showFeedback('erro', 'Informe o nome do relatório.')
    if (!form.data_inicio || !form.data_fim) return showFeedback('erro', 'Informe o período.')
    if (!form.campos.length) return showFeedback('erro', 'Selecione pelo menos um campo.')

    const erroCampos = validarSelecaoCampos(form.campos)
    if (erroCampos) return showFeedback('erro', erroCampos)

    const erroWebhook = validarWebhookUrl(form.webhook_url)
    if (erroWebhook) return showFeedback('erro', erroWebhook)

    const webhookUrl = form.webhook_url.trim()
    try {
      window.localStorage.setItem(WEBHOOK_STORAGE_KEY, webhookUrl)
    } catch {
      // O navegador pode bloquear localStorage; o envio continua normalmente.
    }

    setLoading(true)
    try {
      const filtros = [{
        campo: form.campo_data_filtro,
        operador: 'between',
        valor: [form.data_inicio, form.data_fim],
      }]
      const unidadesParaEnviar = form.unidades.length ? form.unidades : unidades
      const dados = await fetchJson(`${API}/solicitar`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          nome: form.nome.trim(),
          webhook_url: webhookUrl,
          filtros,
          unidades: unidadesParaEnviar,
        }),
      })

      const complemento = dados.is_bi
        ? ' O consolidado BI será atualizado quando o arquivo chegar.'
        : ''
      showFeedback('ok', `Relatório ${dados.relatorio_id} solicitado.${complemento}`)
      setModal(false)
      setForm({ ...NOVO_FORM, webhook_url: webhookUrl })
      setBuscaCampo('')
      await carregar(true)
    } catch (erro) {
      showFeedback('erro', erro.message)
    } finally {
      setLoading(false)
    }
  }

  const deletar = async (id) => {
    if (!window.confirm('Remover este relatório?')) return
    try {
      await fetchJson(`${API}/relatorios/${id}`, { method: 'DELETE' })
      await carregar(true)
    } catch (erro) {
      showFeedback('erro', erro.message)
    }
  }

  const verificar = async (id) => {
    try {
      const dados = await fetchJson(`${API}/relatorios/${id}/verificar`, {
        method: 'POST',
        body: '{}',
      })
      showFeedback('ok', dados.status || 'Consulta realizada com sucesso.')
      await carregar(true)
    } catch (erro) {
      showFeedback('erro', erro.message)
    }
  }

  const baixarArquivo = async (url, nomePadrao, chave) => {
    setBaixando(chave)
    try {
      const resposta = await fetch(url, { headers })
      if (!resposta.ok) {
        let mensagem = 'Erro ao baixar o arquivo.'
        try {
          const dados = await resposta.json()
          mensagem = dados.error || mensagem
        } catch {
          // resposta sem JSON
        }
        throw new Error(mensagem)
      }

      const blob = await resposta.blob()
      const disposition = resposta.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"']+)/i)
      let nome = nomePadrao
      if (match?.[1]) {
        try {
          nome = decodeURIComponent(match[1])
        } catch {
          nome = match[1]
        }
      }

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = nome
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (erro) {
      showFeedback('erro', erro.message)
    } finally {
      setBaixando(null)
    }
  }

  const temBIConcluido = relatorios.some((rel) => (
    isBINome(rel.nome) && (rel.status === 'concluido' || rel.csv_url)
  ))

  const erroWebhookAtual = validarWebhookUrl(form.webhook_url)

  const passoValido = {
    1: Boolean(form.nome.trim()),
    2: Boolean(form.data_inicio && form.data_fim),
    3: form.campos.length > 0,
    4: !erroWebhookAtual,
  }

  const abrirModal = () => {
    setForm({ ...NOVO_FORM, webhook_url: getWebhookUrlInicial() })
    setBuscaCampo('')
    setModal(true)
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`fixed right-6 top-6 z-[200] max-w-md rounded-2xl px-6 py-3 text-sm font-bold text-white shadow-xl ${feedback.type === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}>
          {feedback.msg}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Database className="h-6 w-6 text-primary" />
            Relatórios MobileMed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha os campos e baixe o resultado já convertido para Excel.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {temBIConcluido && (
            <button
              type="button"
              onClick={() => baixarArquivo(
                `${API}/bi/consolidado.xlsx`,
                'BI_MobileMed_Consolidado.xlsx',
                'bi',
              )}
              disabled={baixando === 'bi'}
              className="flex items-center gap-2 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-200 disabled:opacity-50"
            >
              {baixando === 'bi'
                ? <Loader className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
              BI consolidado
            </button>
          )}
          <button
            type="button"
            onClick={() => carregar()}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
          >
            <RefreshCw className="h-4 w-4" /> Atualizar
          </button>
          <button
            type="button"
            onClick={abrirModal}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo relatório
          </button>
        </div>
      </div>

      <div className="flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div>
          <p className="text-sm font-bold text-blue-700">Excel e Power BI sem troca manual de fonte</p>
          <p className="mt-1 text-xs text-blue-600">
            O botão XLSX converte o CSV automaticamente. Relatórios com nome iniciado por BI ou B.I
            também alimentam o arquivo fixo BI_MobileMed_Consolidado.xlsx.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {!relatorios.length && (
          <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
            <Database className="mx-auto mb-3 h-12 w-12 opacity-20" />
            <p className="font-bold">Nenhum relatório solicitado</p>
            <p className="text-sm">Clique em Novo relatório para começar.</p>
          </div>
        )}

        {relatorios.map((rel) => {
          const statusUI = rel.csv_url ? 'concluido' : (rel.status || 'aguardando')
          const status = statusConfig[statusUI] || statusConfig.aguardando
          const StatusIcon = status.icon
          const aberto = expandId === rel.id
          const podeBaixar = statusUI === 'concluido'

          return (
            <div key={rel.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-bold text-foreground">{rel.nome}</p>
                    {isBINome(rel.nome) && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        BI
                      </span>
                    )}
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.color}`}>
                      <StatusIcon className={`h-3 w-3 ${statusUI === 'processando' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{rel.data_inicio || '—'} → {rel.data_fim || '—'}</span>
                    <span>{rel.campos?.length || 0} campo(s)</span>
                    {rel.total_registros > 0 && (
                      <span className="font-bold text-green-600">{rel.total_registros} registros</span>
                    )}
                    <span>Por: {rel.solicitado_por || '—'}</span>
                    <span>
                      {rel.solicitado_em
                        ? new Date(rel.solicitado_em).toLocaleString('pt-BR')
                        : ''}
                    </span>
                  </div>
                  {rel.request_id && (
                    <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      ID: {rel.request_id}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {podeBaixar && (
                    <button
                      type="button"
                      onClick={() => baixarArquivo(
                        `${API}/relatorios/${rel.id}/xlsx`,
                        `${rel.nome || 'Relatorio_MobileMed'}.xlsx`,
                        rel.id,
                      )}
                      disabled={baixando === rel.id}
                      className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                    >
                      {baixando === rel.id
                        ? <Loader className="h-3 w-3 animate-spin" />
                        : <Download className="h-3 w-3" />}
                      XLSX
                    </button>
                  )}
                  {statusUI === 'processando' && (
                    <button
                      type="button"
                      onClick={() => verificar(rel.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                      <RefreshCw className="h-3 w-3" /> Verificar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandId(aberto ? null : rel.id)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                    aria-label="Exibir detalhes"
                  >
                    {aberto
                      ? <ChevronUp className="h-4 w-4" />
                      : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deletar(rel.id)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-red-50 hover:text-red-500"
                    aria-label="Excluir relatório"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {aberto && (
                <div className="space-y-3 border-t border-border bg-muted/20 p-4">
                  {statusUI === 'erro' && rel.erro_msg && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 font-mono text-xs text-red-700">
                      {rel.erro_msg}
                    </div>
                  )}
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
                      Campos solicitados ({rel.campos?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {(rel.campos || []).map((campo) => (
                        <span key={campo} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-mono text-primary">
                          {nomeCampo(campo)}
                        </span>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
              <div>
                <h2 className="text-lg font-bold">Novo relatório MobileMed</h2>
                <p className="text-sm opacity-80">Escolha período e colunas; o download será XLSX.</p>
              </div>
              <button type="button" onClick={() => setModal(false)} aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto p-6">
              <Passo numero={1} titulo="Nome e ambiente">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-600">Nome do relatório</label>
                    <input
                      value={form.nome}
                      onChange={(event) => setForm((atual) => ({
                        ...atual,
                        nome: event.target.value,
                      }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Ex.: B.I Produção MobileMed"
                    />
                    {isBINome(form.nome) && (
                      <p className="text-[11px] font-medium text-emerald-700">
                        Modo BI detectado: exame.id será incluído automaticamente para consolidar sem duplicar.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {AMBIENTES.map((ambiente) => (
                      <button
                        key={ambiente.valor}
                        type="button"
                        onClick={() => setForm((atual) => ({
                          ...atual,
                          ambiente: ambiente.valor,
                          unidades: [],
                        }))}
                        className={`rounded-xl border-2 p-4 text-left transition ${form.ambiente === ambiente.valor ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}
                      >
                        <p className={`text-sm font-bold ${form.ambiente === ambiente.valor ? 'text-primary' : 'text-slate-700'}`}>
                          {ambiente.titulo}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{ambiente.descricao}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </Passo>

              <Passo numero={2} titulo="Período" subtitulo="Defina quais exames entram no relatório">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-600">Data inicial</label>
                      <input
                        type="date"
                        value={form.data_inicio}
                        onChange={(event) => setForm((atual) => ({
                          ...atual,
                          data_inicio: event.target.value,
                        }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase text-slate-600">Data final</label>
                      <input
                        type="date"
                        value={form.data_fim}
                        onChange={(event) => setForm((atual) => ({
                          ...atual,
                          data_fim: event.target.value,
                        }))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-600">Data usada no filtro</label>
                    <select
                      value={form.campo_data_filtro}
                      onChange={(event) => setForm((atual) => ({
                        ...atual,
                        campo_data_filtro: event.target.value,
                      }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                    >
                      {CAMPOS_DATA_FILTRO.map((campo) => (
                        <option key={campo.valor} value={campo.valor}>{campo.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Passo>

              <Passo
                numero={3}
                titulo="Colunas do relatório"
                subtitulo={`${form.campos.length} campo(s) selecionado(s)`}
              >
                <div className="space-y-3">
                  {form.campos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
                      {form.campos.map((campo) => (
                        <button
                          key={campo}
                          type="button"
                          onClick={() => toggleCampo(campo)}
                          className="flex items-center gap-1 rounded-full border border-primary/30 bg-white px-2 py-1 text-[11px] font-medium text-primary transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          {nomeCampo(campo)} <X className="h-2.5 w-2.5" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative min-w-[220px] flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        value={buscaCampo}
                        onChange={(event) => setBuscaCampo(event.target.value)}
                        placeholder="Buscar: paciente, empresa, CRM, data..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button type="button" onClick={selecionarTodos} className="text-xs font-bold text-primary hover:underline">
                      {Object.values(CAMPOS_GRUPOS).flat().every((campo) => form.campos.includes(campo))
                        ? 'Desmarcar todos'
                        : 'Selecionar todos'}
                    </button>
                  </div>

                  {!buscaCampo && (
                    <>
                      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
                        {Object.keys(CAMPOS_GRUPOS).map((grupo) => (
                          <button
                            key={grupo}
                            type="button"
                            onClick={() => setAbaCampos(grupo)}
                            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${abaCampos === grupo ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                          >
                            {grupo}
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => selecionarGrupo(abaCampos)} className="text-xs font-bold text-primary hover:underline">
                        {CAMPOS_GRUPOS[abaCampos].every((campo) => form.campos.includes(campo))
                          ? `Desmarcar grupo ${abaCampos}`
                          : `Selecionar grupo ${abaCampos}`}
                      </button>
                    </>
                  )}

                  <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3">
                    {!camposVisiveis.length && (
                      <p className="col-span-full py-6 text-center text-xs text-slate-400">
                        Nenhum campo encontrado.
                      </p>
                    )}
                    {camposVisiveis.map((campo) => (
                      <label
                        key={campo}
                        className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2.5 text-xs transition ${form.campos.includes(campo) ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      >
                        <input
                          type="checkbox"
                          checked={form.campos.includes(campo)}
                          onChange={() => toggleCampo(campo)}
                          className="mt-0.5 accent-primary"
                        />
                        <span className="min-w-0">
                          <span className="block truncate" title={nomeCampo(campo)}>{nomeCampo(campo)}</span>
                          <span className="block truncate font-mono text-[9px] font-normal opacity-60" title={campo}>{campo}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </Passo>

              <Passo
                numero={4}
                titulo="Revisão e webhook HTTPS"
                subtitulo="A MobileMed chamará o Vimax por este endereço público do ngrok"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Ambiente</p>
                      <p className="mt-0.5 font-bold text-slate-700">
                        {AMBIENTES.find((item) => item.valor === form.ambiente)?.titulo}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Período</p>
                      <p className="mt-0.5 font-bold text-slate-700">
                        {form.data_inicio || '—'} até {form.data_fim || '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Unidades</p>
                      <p className="mt-0.5 font-bold text-slate-700">
                        {loadingUnidades ? 'Carregando...' : `${unidades.length} unidade(s) incluída(s)`}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-600">
                      Webhook HTTPS do ngrok
                    </label>
                    <input
                      type="url"
                      value={form.webhook_url}
                      onChange={(event) => setForm((atual) => ({
                        ...atual,
                        webhook_url: event.target.value,
                      }))}
                      className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 font-mono text-xs outline-none focus:ring-2 focus:ring-primary ${erroWebhookAtual ? 'border-red-300' : 'border-emerald-300'}`}
                      placeholder="https://seu-dominio.ngrok-free.app/api/mobilemed/webhook"
                    />
                    {erroWebhookAtual ? (
                      <p className="text-[11px] font-medium text-red-600">{erroWebhookAtual}</p>
                    ) : (
                      <p className="text-[11px] font-medium text-emerald-700">
                        URL HTTPS válida. Se o ngrok mudar o domínio, atualize este campo.
                      </p>
                    )}
                  </div>
                </div>
              </Passo>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[1, 2, 3, 4].map((numero) => (
                  <span key={numero} className={`flex items-center gap-1 font-bold ${passoValido[numero] ? 'text-green-600' : 'text-slate-300'}`}>
                    {passoValido[numero]
                      ? <CheckCircle className="h-3.5 w-3.5" />
                      : <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-slate-300" />}
                    Passo {numero}
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={solicitar}
                  disabled={loading || !passoValido[1] || !passoValido[2] || !passoValido[3] || !passoValido[4]}
                  className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading
                    ? <Loader className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                  {loading ? 'Solicitando...' : 'Solicitar relatório'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
