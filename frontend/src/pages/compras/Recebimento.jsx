import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Inbox, Search, CheckCircle, XCircle, AlertCircle, Eye, X, Check } from 'lucide-react'

const API_BASE = ""

const STATUS_COLORS = {
  EMITIDA:    'bg-blue-100 text-blue-800',
  ENVIADA:    'bg-yellow-100 text-yellow-800',
  RECEBIDA:   'bg-green-100 text-green-800',
  CANCELADA:  'bg-red-100 text-red-700',
  PARCIAL:    'bg-orange-100 text-orange-800',
}

export default function Recebimento() {
  const { user } = useAuth()
  const headers = user?.api_token
    ? { 'X-API-Token': user.api_token, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }

  const [ordens,        setOrdens]        = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState('')
  const [searchTerm,    setSearchTerm]    = useState('')
  const [statusFilter,  setStatusFilter]  = useState('pendentes')
  const [modalOrdem,    setModalOrdem]    = useState(null)
  const [salvando,      setSalvando]      = useState(false)
  const [itensReceb,    setItensReceb]    = useState([])
  const [obsReceb,      setObsReceb]      = useState('')
  const [dataReceb,     setDataReceb]     = useState(new Date().toISOString().split('T')[0])

  const fetchOrdens = useCallback(async () => {
    try {
      setLoading(true)
      const r = await fetch(`${API_BASE}/api/compras/ordens`, { headers })
      const d = await r.json()
      setOrdens(Array.isArray(d) ? d : [])
    } catch { setError('Erro ao carregar ordens') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchOrdens() }, [fetchOrdens])

  const abrirRecebimento = (ordem) => {
    setModalOrdem(ordem)
    setItensReceb((ordem.itens || []).map(i => ({
      ...i,
      qtd_recebida: i.quantidade,
      conforme: true,
      obs_item: ''
    })))
    setObsReceb('')
    setDataReceb(new Date().toISOString().split('T')[0])
  }

  const handleConfirmarRecebimento = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload = {
        data_recebimento: dataReceb,
        observacoes: obsReceb,
        itens: itensReceb.map(i => ({
          id: i.id,
          qtd_recebida: parseFloat(i.qtd_recebida) || 0,
          conforme: i.conforme,
          obs_item: i.obs_item
        }))
      }
      const r = await fetch(`${API_BASE}/api/compras/ordens/${modalOrdem.id}/receber`, {
        method: 'POST', headers, body: JSON.stringify(payload)
      })
      const d = await r.json()
      if (r.ok && (d.success !== false)) {
        setSuccess(`Recebimento da OC ${modalOrdem.numero_oc} registrado com sucesso!`)
        setModalOrdem(null)
        fetchOrdens()
      } else {
        setError(d.error || 'Erro ao registrar recebimento')
      }
    } catch { setError('Erro ao registrar recebimento') }
    finally { setSalvando(false) }
  }

  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const ordensFiltradas = ordens.filter(o => {
    const matchSearch = !searchTerm ||
      o.numero_oc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStatus = statusFilter === 'todos'
      ? true
      : statusFilter === 'pendentes'
        ? ['EMITIDA', 'ENVIADA', 'PARCIAL'].includes(o.status)
        : o.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalPendentes = ordens.filter(o => ['EMITIDA', 'ENVIADA', 'PARCIAL'].includes(o.status)).length
  const totalRecebidas = ordens.filter(o => o.status === 'RECEBIDA').length

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
            <span className="text-red-700 flex items-center gap-2"><AlertCircle size={18} /> {error}</span>
            <button onClick={() => setError('')}><X size={18} className="text-red-500" /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between items-center">
            <span className="text-green-700 flex items-center gap-2"><Check size={18} /> {success}</span>
            <button onClick={() => setSuccess('')}><X size={18} className="text-green-500" /></button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Inbox className="text-teal-600" size={32} />
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Recebimento de Materiais</h1>
            <p className="text-gray-500 text-sm">Conferência e registro de itens recebidos</p>
          </div>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{totalPendentes}</p>
            <p className="text-sm text-gray-500 mt-1">Pendentes</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{totalRecebidas}</p>
            <p className="text-sm text-gray-500 mt-1">Recebidas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{ordens.filter(o => o.status === 'PARCIAL').length}</p>
            <p className="text-sm text-gray-500 mt-1">Parciais</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-700">{ordens.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total OCs</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Buscar por OC ou fornecedor..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'pendentes', label: 'Pendentes', color: 'bg-blue-600' },
              { value: 'RECEBIDA',  label: 'Recebidas', color: 'bg-green-600' },
              { value: 'todos',     label: 'Todas',     color: 'bg-gray-600' },
            ].map(f => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === f.value ? `${f.color} text-white` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Carregando...</div>
        ) : ordensFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-5xl mb-3">📦</p>
            <p className="font-medium">Nenhuma ordem encontrada</p>
            <p className="text-sm mt-1">
              {statusFilter === 'pendentes' ? 'Não há ordens aguardando recebimento' : 'Tente outro filtro'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3 text-left text-sm font-bold text-gray-700">Nº OC</th>
                  <th className="px-5 py-3 text-left text-sm font-bold text-gray-700">Fornecedor</th>
                  <th className="px-5 py-3 text-left text-sm font-bold text-gray-700">Status</th>
                  <th className="px-5 py-3 text-left text-sm font-bold text-gray-700">Valor Total</th>
                  <th className="px-5 py-3 text-left text-sm font-bold text-gray-700">Emissão</th>
                  <th className="px-5 py-3 text-left text-sm font-bold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ordensFiltradas.map(ordem => (
                  <tr key={ordem.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-teal-700">{ordem.numero_oc}</td>
                    <td className="px-5 py-4 text-sm text-gray-800">{ordem.fornecedor_nome || ordem.fornecedor?.nome || '-'}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[ordem.status] || 'bg-gray-100 text-gray-600'}`}>
                        {ordem.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-green-600">{fmt(ordem.valor_total)}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {ordem.created_at ? new Date(ordem.created_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-5 py-4">
                      {['EMITIDA', 'ENVIADA', 'PARCIAL'].includes(ordem.status) ? (
                        <button onClick={() => abrirRecebimento(ordem)}
                          className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium flex items-center gap-1">
                          <Inbox size={14} /> Receber
                        </button>
                      ) : (
                        <button onClick={() => abrirRecebimento(ordem)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 font-medium flex items-center gap-1">
                          <Eye size={14} /> Ver
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL RECEBIMENTO */}
      {modalOrdem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b bg-teal-600 text-white rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold">📦 Registrar Recebimento</h2>
                <p className="text-sm text-teal-200">OC: {modalOrdem.numero_oc} · {modalOrdem.fornecedor_nome || modalOrdem.fornecedor?.nome}</p>
              </div>
              <button onClick={() => setModalOrdem(null)} className="p-1 hover:bg-white/10 rounded-full"><X size={24} /></button>
            </div>

            <form onSubmit={handleConfirmarRecebimento} className="p-5 space-y-5">
              {/* Data */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Data do Recebimento *</label>
                <input type="date" required value={dataReceb} onChange={e => setDataReceb(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>

              {/* Itens */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Itens Recebidos</label>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-gray-600 font-semibold">Item</th>
                        <th className="text-center px-3 py-2 text-xs text-gray-600 font-semibold">Pedido</th>
                        <th className="text-center px-3 py-2 text-xs text-gray-600 font-semibold">Recebido</th>
                        <th className="text-center px-3 py-2 text-xs text-gray-600 font-semibold">Conforme</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itensReceb.map((item, idx) => (
                        <tr key={idx} className={item.conforme ? '' : 'bg-red-50'}>
                          <td className="px-3 py-2">
                            <p className="font-medium text-gray-800">{item.nome_item || item.nome}</p>
                            {item.codigo_item && <p className="text-xs text-gray-400">{item.codigo_item}</p>}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.quantidade} {item.unidade_medida || 'UN'}</td>
                          <td className="px-3 py-2 text-center">
                            <input type="number" min="0" step="0.01"
                              value={itensReceb[idx].qtd_recebida}
                              onChange={e => setItensReceb(prev => prev.map((it, i) => i === idx ? { ...it, qtd_recebida: e.target.value } : it))}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-teal-500" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button type="button"
                              onClick={() => setItensReceb(prev => prev.map((it, i) => i === idx ? { ...it, conforme: !it.conforme } : it))}
                              className={`p-1 rounded-full transition-colors ${item.conforme ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-600'}`}>
                              {item.conforme ? <CheckCircle size={22} /> : <XCircle size={22} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {itensReceb.some(i => !i.conforme) && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> Itens não conformes serão registrados para tratativa
                  </p>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Observações do Recebimento</label>
                <textarea value={obsReceb} onChange={e => setObsReceb(e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder="Condições da entrega, divergências, etc..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOrdem(null)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex-1 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2">
                  <Inbox size={18} /> {salvando ? 'Salvando...' : 'Confirmar Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}