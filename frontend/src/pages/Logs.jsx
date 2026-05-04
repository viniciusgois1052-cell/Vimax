import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Search, Filter, RefreshCw } from 'lucide-react'

function isoLocal(dt) {
  if (!dt) return ''
  try {
    // backend retorna "2026-04-27T17:35:20"
    const d = new Date(dt)
    return isNaN(d.getTime()) ? dt : d.toLocaleString()
  } catch {
    return dt
  }
}

function safeParseDetails(details) {
  if (details == null) return null
  if (typeof details === 'object') return details
  if (typeof details !== 'string') return String(details)
  try {
    return JSON.parse(details)
  } catch {
    return details
  }
}

function tryPrettyJson(details) {
  const parsed = safeParseDetails(details)
  if (parsed == null) return ''
  if (typeof parsed === 'string') return parsed
  try {
    return JSON.stringify(parsed, null, 2)
  } catch {
    return String(details)
  }
}

function detailsPreview(details) {
  const parsed = safeParseDetails(details)
  if (!parsed) return '-'

  // se vier texto puro
  if (typeof parsed === 'string') {
    const s = parsed.replace(/\s+/g, ' ').trim()
    return s.length > 120 ? s.slice(0, 120) + '…' : s
  }

  // preview "inteligente"
  const parts = []
  if (parsed.empresa_nome) parts.push(`empresa: ${parsed.empresa_nome}`)
  if (parsed.filename) parts.push(`arquivo: ${parsed.filename}`)
  if (parsed.path) parts.push(`path: ${String(parsed.path).split('/').slice(-3).join('/')}`)
  if (parts.length) return parts.join(' | ')

  // fallback: json reduzido
  try {
    const s = JSON.stringify(parsed)
    return s.length > 120 ? s.slice(0, 120) + '…' : s
  } catch {
    return '[details]'
  }
}

function diffKeys(before, after) {
  if (!before || !after) return []
  if (typeof before !== 'object' || typeof after !== 'object') return []

  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const changes = []
  for (const key of keys) {
    const a = before[key]
    const b = after[key]
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      changes.push({ key, before: a, after: b })
    }
  }
  return changes
}

export default function Logs() {
  const { user } = useAuth()

  const [q, setQ] = useState('')
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState({ total: 0, logs: [], page: 1, per_page: 50 })

  const [selected, setSelected] = useState(null)
  const [detailsTab, setDetailsTab] = useState('json') // json | changes

  const headers = useMemo(() => {
    const h = { 'Content-Type': 'application/json' }
    if (user?.api_token) h['X-API-Token'] = user.api_token
    return h
  }, [user])

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('per_page', String(perPage))
    if (q.trim()) p.set('q', q.trim())
    if (entity) p.set('entity', entity)
    if (action) p.set('action', action)
    if (dateFrom) p.set('date_from', dateFrom)
    if (dateTo) p.set('date_to', dateTo)
    return p.toString()
  }, [q, entity, action, dateFrom, dateTo, page, perPage])

  const fetchLogs = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/logs?${qs}`, { headers })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Erro ao carregar logs')
      setData(j)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs])

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / perPage))

  const onApplyFilters = (e) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const selectedParsed = safeParseDetails(selected?.details)
  const before = selectedParsed && typeof selectedParsed === 'object' ? selectedParsed.before : null
  const after = selectedParsed && typeof selectedParsed === 'object' ? selectedParsed.after_payload : null
  const changes = diffKeys(before, after)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-foreground">Logs do Sistema</h1>
          <p className="text-sm text-muted-foreground">
            Auditoria de ações: login, criação/alteração/exclusão e eventos do sistema.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent/70 text-foreground font-bold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <form onSubmit={onApplyFilters} className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Filter className="w-4 h-4" /> Filtros
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Busca</label>
            <div className="flex items-center gap-2 bg-accent rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="bg-transparent outline-none w-full text-sm"
                placeholder="username, action, entity, details..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Entidade</label>
            <input
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full bg-accent rounded-xl px-3 py-2 text-sm outline-none"
              placeholder="ex: chamado"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Ação</label>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full bg-accent rounded-xl px-3 py-2 text-sm outline-none"
              placeholder="ex: update_empresa"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">De</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-accent rounded-xl px-3 py-2 text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">Até</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-accent rounded-xl px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-muted-foreground uppercase">Por página</label>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-accent rounded-xl px-3 py-2 text-sm outline-none"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div className="text-sm text-muted-foreground">
            Total: <span className="font-bold text-foreground">{data.total || 0}</span>
            {' '}| Página {page} de {totalPages}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/70 disabled:opacity-40 font-bold"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent/70 disabled:opacity-40 font-bold"
            >
              Próxima
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-bold">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-accent/40">
              <tr className="text-left">
                <th className="p-3 font-black">Data</th>
                <th className="p-3 font-black">Usuário</th>
                <th className="p-3 font-black">Ação</th>
                <th className="p-3 font-black">Entidade</th>
                <th className="p-3 font-black">ID</th>
                <th className="p-3 font-black">IP</th>
                <th className="p-3 font-black">Detalhes</th>
                <th className="p-3 font-black text-right">Ver</th>
              </tr>
            </thead>
            <tbody>
              {(data.logs || []).map((l) => (
                <tr key={l.id} className="border-t border-border hover:bg-accent/20">
                  <td className="p-3 whitespace-nowrap">{isoLocal(l.timestamp)}</td>
                  <td className="p-3">{l.username || '-'}</td>
                  <td className="p-3 font-bold">{l.action}</td>
                  <td className="p-3">{l.entity || '-'}</td>
                  <td className="p-3">{l.entity_id || '-'}</td>
                  <td className="p-3">{l.ip || '-'}</td>
                  <td
                    className="p-3 text-muted-foreground max-w-[520px] truncate"
                    title={typeof l.details === 'string' ? l.details : ''}
                  >
                    {detailsPreview(l.details)}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      className="px-3 py-2 rounded-xl bg-accent hover:bg-accent/70 font-bold"
                      onClick={() => { setSelected(l); setDetailsTab('json') }}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
              {(data.logs || []).length === 0 && (
                <tr>
                  <td className="p-6 text-center text-muted-foreground" colSpan={8}>
                    {loading ? 'Carregando...' : 'Nenhum log encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-[999] flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-5xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-black">Log #{selected.id}</p>
                <p className="text-xs text-muted-foreground">
                  {isoLocal(selected.timestamp)} • {selected.username || '-'} • {selected.ip || '-'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  onClick={async () => {
                    const text = tryPrettyJson(selected.details)
                    await navigator.clipboard.writeText(text)
                  }}
                >
                  Copiar JSON
                </button>
                <button className="px-3 py-2 rounded-xl bg-accent hover:bg-accent/70 font-bold" onClick={() => setSelected(null)}>
                  Fechar
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-accent/30 rounded-xl p-3">
                <p className="text-[10px] uppercase font-black text-muted-foreground">Ação</p>
                <p className="font-bold">{selected.action}</p>
              </div>
              <div className="bg-accent/30 rounded-xl p-3">
                <p className="text-[10px] uppercase font-black text-muted-foreground">Entidade</p>
                <p className="font-bold">{selected.entity || '-'}</p>
              </div>
              <div className="bg-accent/30 rounded-xl p-3">
                <p className="text-[10px] uppercase font-black text-muted-foreground">Entity ID</p>
                <p className="font-bold">{selected.entity_id || '-'}</p>
              </div>
            </div>

            <div className="px-4 pb-2 flex items-center gap-2">
              <button
                className={`px-3 py-2 rounded-xl font-bold ${detailsTab === 'json' ? 'bg-foreground text-background' : 'bg-accent hover:bg-accent/70'}`}
                onClick={() => setDetailsTab('json')}
              >
                JSON
              </button>
              <button
                className={`px-3 py-2 rounded-xl font-bold ${detailsTab === 'changes' ? 'bg-foreground text-background' : 'bg-accent hover:bg-accent/70'}`}
                onClick={() => setDetailsTab('changes')}
              >
                Alterações
              </button>
              {detailsTab === 'changes' && (
                <span className="text-xs text-muted-foreground">
                  {changes.length} campo(s) alterado(s)
                </span>
              )}
            </div>

            <div className="p-4 pt-0">
              {detailsTab === 'json' && (
                <>
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-2">Details (JSON)</p>
                  <pre className="bg-accent/30 rounded-xl p-3 text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
{tryPrettyJson(selected.details)}
                  </pre>
                </>
              )}

              {detailsTab === 'changes' && (
                <>
                  <p className="text-[10px] uppercase font-black text-muted-foreground mb-2">Alterações (before → after_payload)</p>

                  {!before || !after ? (
                    <div className="bg-accent/30 rounded-xl p-3 text-sm text-muted-foreground">
                      Este log não contém <span className="font-bold">before</span> e <span className="font-bold">after_payload</span>.
                    </div>
                  ) : changes.length === 0 ? (
                    <div className="bg-accent/30 rounded-xl p-3 text-sm text-muted-foreground">
                      Nenhuma diferença detectada.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-auto">
                      {changes.map((ch) => (
                        <div key={ch.key} className="bg-accent/20 border border-border rounded-xl p-3">
                          <div className="font-black text-sm mb-2">{ch.key}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <div className="font-bold text-muted-foreground mb-1">Antes</div>
                              <pre className="bg-accent/30 rounded-xl p-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(ch.before, null, 2)}</pre>
                            </div>
                            <div>
                              <div className="font-bold text-muted-foreground mb-1">Depois</div>
                              <pre className="bg-accent/30 rounded-xl p-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(ch.after, null, 2)}</pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
