import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useEntity } from '../context/EntityContext'
import { RefreshCcw, Plus, Activity, Droplets, Trash2, Pencil, Eye, Wifi, Download } from 'lucide-react'

function cn(...xs) { return xs.filter(Boolean).join(' ') }

function statusBadge(status) {
  const s = status || 'desconhecido'
  const cls =
    s === 'online' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    s === 'offline' ? 'bg-red-100 text-red-700 border-red-200' :
    'bg-slate-100 text-slate-700 border-slate-200'
  return <span className={cn('px-3 py-1 rounded-full text-xs font-black border', cls)}>{s}</span>
}

function pctToColor(pct) {
  if (pct === null || pct === undefined) return 'bg-slate-300'
  const v = Number(pct)
  if (Number.isNaN(v)) return 'bg-slate-300'
  if (v <= 10) return 'bg-red-500'
  if (v <= 25) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function Bar({ value }) {
  const pct = (value === null || value === undefined) ? null : Number(value)
  const safe = (pct === null || Number.isNaN(pct)) ? 0 : Math.max(0, Math.min(100, pct))
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div className={cn('h-2.5', pctToColor(pct))} style={{ width: `${safe}%` }} />
      </div>
      <div className="w-12 text-right text-xs font-black text-slate-700">
        {pct === null || Number.isNaN(pct) ? 'N/A' : `${safe}%`}
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  const v = (value === null || value === undefined) ? null : Number(value)
  return (
    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">{label}</p>
      <p className="text-lg font-black text-slate-900">
        {v === null || Number.isNaN(v) ? 'N/A' : v.toLocaleString('pt-BR')}
      </p>
    </div>
  )
}

function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800">{title}</h3>
          <button onClick={onClose} className="px-3 py-1 rounded-xl bg-slate-100 font-black hover:bg-slate-200">
            Fechar
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

const MODELOS = [
  { value: 'xerox_workcentre_7855_7835', label: 'Xerox WorkCentre 7855/7835 (billing_info.php)' },
  { value: 'xerox_altalink', label: 'Xerox AltaLink (stat/consumables.php + counters/usage.php)' },
  { value: 'xerox_primelink', label: 'Xerox PrimeLink (8080/prcnt.htm + 8080/stsply.htm)' },
  { value: 'hp_x557', label: 'HP X557 (UsagePage + Home supplies)' },
]

export default function ContadoresImpressora() {
  const { user } = useAuth()
  const { selectedEntity } = useEntity()

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [items, setItems] = useState([])

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    ip: '',
    community: 'public',
    empresa_id: '',
    localizacao: '',
    modelo: '',
    numero_serie: '',
    modelo_tipo: 'xerox_altalink',
  })

  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [detailsItem, setDetailsItem] = useState(null)

  const API_BASE = window.location.origin.includes('5173')
    ? `${window.location.protocol}//${window.location.hostname}:5002`
    : window.location.origin
  const API_URL = `${API_BASE}/api`

  const headers = useMemo(() => {
    const h = { 'Content-Type': 'application/json' }
    if (user?.api_token) h['X-API-Token'] = user.api_token
    return h
  }, [user?.api_token])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setErro('')
    try {
      const params = new URLSearchParams()
      if (selectedEntity && selectedEntity !== 'all') params.set('empresa_id', selectedEntity)

      const resp = await fetch(`${API_URL}/contadores-impressora?${params.toString()}`, { headers })
      if (!resp.ok) throw new Error(`Erro ao carregar: HTTP ${resp.status}`)
      const data = await resp.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) {
      setErro(e?.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [API_URL, headers, selectedEntity])

  useEffect(() => { fetchData() }, [fetchData])

  const consultarAgora = async (id) => {
    try {
      const resp = await fetch(`${API_URL}/contadores-impressora/${id}/consultar-snmp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      })
      await fetchData()
      if (!resp.ok) {
        const txt = await resp.text()
        alert(`Falha ao consultar (HTTP ${resp.status}): ${txt}`)
      }
    } catch (e) {
      alert(e?.message || 'Erro ao consultar')
    }
  }

  const atualizarTodas = async () => {
    try {
      const resp = await fetch(`${API_URL}/contadores-impressora/atualizar-todas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      })
      const data = await resp.json().catch(() => ({}))
      await fetchData()
      alert(`Atualização concluída. Sucesso: ${data?.sucesso ?? '?'} / Falha: ${data?.falha ?? '?'}`)
    } catch (e) {
      alert(e?.message || 'Erro ao atualizar todas')
    }
  }

  const exportarExcel = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedEntity && selectedEntity !== 'all') params.set('empresa_id', selectedEntity)

      const resp = await fetch(`${API_URL}/contadores-impressora/exportar-excel?${params.toString()}`, {
        method: 'GET',
        headers: {
          ...(user?.api_token ? { 'X-API-Token': user.api_token } : {}),
        },
      })

      if (!resp.ok) {
        const txt = await resp.text()
        return alert(`Falha ao exportar (HTTP ${resp.status}): ${txt}`)
      }

      const blob = await resp.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contadores_impressora.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert(e?.message || 'Erro ao exportar')
    }
  }

  const openCreate = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormData({
      nome: '',
      ip: '',
      community: 'public',
      empresa_id: selectedEntity && selectedEntity !== 'all' ? String(selectedEntity) : '',
      localizacao: '',
      modelo: '',
      numero_serie: '',
      modelo_tipo: 'xerox_altalink',
    })
    setIsFormOpen(true)
  }

  const openEdit = (c) => {
    setIsEditing(true)
    setEditingId(c.id)
    setFormData({
      nome: c.nome || '',
      ip: c.ip || '',
      community: c.community || 'public',
      empresa_id: c.empresa_id ? String(c.empresa_id) : '',
      localizacao: c.localizacao || '',
      modelo: c.modelo || '',
      numero_serie: c.numero_serie || '',
      modelo_tipo: c.modelo_tipo || 'xerox_altalink',
    })
    setIsFormOpen(true)
  }

  const saveForm = async () => {
    if (!formData.nome?.trim()) return alert('Nome é obrigatório')
    if (!formData.ip?.trim()) return alert('IP é obrigatório')
    if (!formData.modelo_tipo?.trim()) return alert('Selecione o Modelo/Tipo')

    const payload = {
      nome: formData.nome.trim(),
      ip: formData.ip.trim(),
      community: (formData.community || 'public').trim(),
      localizacao: formData.localizacao?.trim() || null,
      modelo: formData.modelo?.trim() || null,
      numero_serie: formData.numero_serie?.trim() || null,
      empresa_id: formData.empresa_id ? parseInt(formData.empresa_id, 10) : null,
      modelo_tipo: formData.modelo_tipo,
    }

    try {
      const url = isEditing
        ? `${API_URL}/contadores-impressora/${editingId}`
        : `${API_URL}/contadores-impressora/`
      const method = isEditing ? 'PUT' : 'POST'

      const resp = await fetch(url, { method, headers, body: JSON.stringify(payload) })
      if (!resp.ok) {
        const txt = await resp.text()
        return alert(`Falha ao salvar (HTTP ${resp.status}): ${txt}`)
      }

      setIsFormOpen(false)
      await fetchData()
    } catch (e) {
      alert(e?.message || 'Erro ao salvar')
    }
  }

  const removeItem = async (c) => {
    if (!window.confirm(`Excluir "${c.nome}"?`)) return
    try {
      const resp = await fetch(`${API_URL}/contadores-impressora/${c.id}`, { method: 'DELETE', headers })
      if (!resp.ok) {
        const txt = await resp.text()
        return alert(`Falha ao excluir (HTTP ${resp.status}): ${txt}`)
      }
      await fetchData()
    } catch (e) {
      alert(e?.message || 'Erro ao excluir')
    }
  }

  const openDetails = (c) => {
    setDetailsItem(c)
    setIsDetailsOpen(true)
  }

  const hasAnyDrum = (c) =>
    c.drum_preto_nivel != null ||
    c.drum_ciano_nivel != null ||
    c.drum_magenta_nivel != null ||
    c.drum_amarelo_nivel != null

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Contadores Impressora</h1>
          <p className="text-slate-500 text-sm mt-1">
            Consulta via páginas internas (por modelo) + exportação Excel + atualização diária via cron.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-black hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Nova impressora
          </button>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            <RefreshCcw className="w-4 h-4" />
            Recarregar
          </button>

          <button
            onClick={atualizarTodas}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white font-black hover:opacity-90"
            disabled={loading}
          >
            <Wifi className="w-4 h-4" />
            Atualizar todas
          </button>

          <button
            onClick={exportarExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            Exportar planilha
          </button>
        </div>
      </div>

      {erro && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 font-bold">
          {erro}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-6 rounded-2xl bg-white border border-slate-100 text-slate-500">Carregando…</div>
        ) : items.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-slate-100 text-slate-500">Nenhuma impressora cadastrada.</div>
        ) : (
          items.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-[260px]">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">{c.nome}</h2>
                    {statusBadge(c.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="font-black text-slate-700">IP:</span> {c.ip} &nbsp;•&nbsp;
                    <span className="font-black text-slate-700">Modelo:</span> {c.modelo || '—'}
                    {c.numero_serie ? ` • ${c.numero_serie}` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Última leitura: {c.ultima_leitura || '—'}
                  </p>
                  {c.modelo_tipo && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Tipo: <span className="font-black text-slate-600">{c.modelo_tipo}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => consultarAgora(c.id)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white font-black hover:opacity-90"
                  >
                    <Activity className="w-4 h-4" />
                    Consultar
                  </button>
                  <button
                    onClick={() => openDetails(c)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="w-4 h-4" />
                    Detalhes
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white font-black hover:opacity-90"
                  >
                    <Pencil className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => removeItem(c)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600 text-white font-black hover:opacity-90"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              </div>

              <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-500" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Contadores</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Total" value={c.contador_total} />
                    <Metric label="PB (geral)" value={c.contador_pb} />
                    <Metric label="Color (geral)" value={c.contador_color} />

                    <Metric label="A4 PB" value={c.contador_a4_pb} />
                    <Metric label="A4 Color" value={c.contador_a4_color} />

                    <Metric label="A3 PB" value={c.contador_a3_pb} />
                    <Metric label="A3 Color" value={c.contador_a3_color} />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    A4/A3 dependem do tipo selecionado (script). Se ficar N/A, o modelo não fornece esse contador.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-slate-500" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Insumos</p>
                  </div>

                  <div className="space-y-3">
                    <div><p className="text-xs font-black text-slate-700 mb-1">Toner Preto</p><Bar value={c.toner_preto_nivel} /></div>
                    <div><p className="text-xs font-black text-slate-700 mb-1">Toner Ciano</p><Bar value={c.toner_ciano_nivel} /></div>
                    <div><p className="text-xs font-black text-slate-700 mb-1">Toner Magenta</p><Bar value={c.toner_magenta_nivel} /></div>
                    <div><p className="text-xs font-black text-slate-700 mb-1">Toner Amarelo</p><Bar value={c.toner_amarelo_nivel} /></div>
                    <div><p className="text-xs font-black text-slate-700 mb-1">Reservatório</p><Bar value={c.reservatorio_nivel} /></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-slate-500" />
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Drums</p>
                  </div>

                  {hasAnyDrum(c) ? (
                    <div className="space-y-3">
                      <div><p className="text-xs font-black text-slate-700 mb-1">Drum Preto</p><Bar value={c.drum_preto_nivel} /></div>
                      <div><p className="text-xs font-black text-slate-700 mb-1">Drum Ciano</p><Bar value={c.drum_ciano_nivel} /></div>
                      <div><p className="text-xs font-black text-slate-700 mb-1">Drum Magenta</p><Bar value={c.drum_magenta_nivel} /></div>
                      <div><p className="text-xs font-black text-slate-700 mb-1">Drum Amarelo</p><Bar value={c.drum_amarelo_nivel} /></div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-sm">
                      Sem dados de drum para este modelo/página.
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Status dispositivo</p>
                    <p className="text-sm font-black text-slate-800">{c.status_dispositivo || '—'}</p>
                    {c.alerta_mensagem ? (
                      <p className="text-[11px] text-slate-500 mt-1 break-words">
                        <span className="font-black text-slate-700">Alerta:</span> {c.alerta_mensagem}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-1">Sem alerta.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={isFormOpen}
        title={isEditing ? 'Editar impressora' : 'Nova impressora'}
        onClose={() => setIsFormOpen(false)}
        footer={
          <>
            <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 rounded-xl bg-white border border-slate-200 font-black text-slate-700 hover:bg-slate-50">
              Cancelar
            </button>
            <button onClick={saveForm} className="px-6 py-2 rounded-xl bg-primary text-white font-black hover:opacity-90">
              Salvar
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">Nome *</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">IP *</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              placeholder="192.168.4.68"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">Modelo/Tipo (script) *</label>
            <select
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary bg-white"
              value={formData.modelo_tipo}
              onChange={(e) => setFormData({ ...formData, modelo_tipo: e.target.value })}
            >
              {MODELOS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">Empresa ID</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary"
              value={formData.empresa_id}
              onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
              placeholder="(opcional)"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">Localização</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary"
              value={formData.localizacao}
              onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
              placeholder="(opcional)"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">Modelo (texto)</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary"
              value={formData.modelo}
              onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
              placeholder="(opcional)"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">Número de Série</label>
            <input
              className="w-full px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-primary"
              value={formData.numero_serie}
              onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
              placeholder="(opcional)"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={isDetailsOpen}
        title={`Detalhes — ${detailsItem?.nome || ''}`}
        onClose={() => setIsDetailsOpen(false)}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div><span className="font-black text-slate-700">IP:</span> {detailsItem?.ip}</div>
            <div><span className="font-black text-slate-700">Modelo:</span> {detailsItem?.modelo || '—'}</div>
            <div><span className="font-black text-slate-700">Última leitura:</span> {detailsItem?.ultima_leitura || '—'}</div>
            <div><span className="font-black text-slate-700">Status disp.:</span> {detailsItem?.status_dispositivo || '—'}</div>
            <div><span className="font-black text-slate-700">Tipo:</span> {detailsItem?.modelo_tipo || '—'}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs font-black text-slate-600 uppercase mb-2">Suprimentos (RAW)</p>
            <pre className="text-xs whitespace-pre-wrap break-words">
              {JSON.stringify(detailsItem?.suprimentos_raw || [], null, 2)}
            </pre>
          </div>
        </div>
      </Modal>
    </div>
  )
}
