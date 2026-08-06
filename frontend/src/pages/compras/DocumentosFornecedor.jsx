import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { FaFileInvoiceDollar, FaFilePdf, FaFileAlt, FaSearch, FaFilter, FaCheckCircle, FaClock, FaBuilding, FaUserTie, FaCalendarAlt } from 'react-icons/fa'
import { useEntity } from '../../context/EntityContext'
import { useAuth } from '../../context/AuthContext'

const API = '/api'

export default function DocumentosFornecedor() {
  const { selectedEntity } = useEntity()
  const { user } = useAuth()

  const [ordens, setOrdens] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos') // Todos / AGUARDANDO / ANEXADO

  const authHeaders = () => (user?.api_token ? { 'X-API-Token': user.api_token } : {})

  const fetchOrdens = useCallback(async () => {
    setLoading(true)
    try {
      const qp = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : ''
      const r = await fetch(`${API}/compras/ordens${qp}`, { headers: authHeaders() })
      if (r.ok) setOrdens(await r.json())
    } catch (e) {
      console.error('Erro ao carregar ordens:', e)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntity, user])

  useEffect(() => { fetchOrdens() }, [fetchOrdens])

  const fmtData = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
  const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // 🔒 Download via rota de API protegida (X-API-Token) — busca o BLOB e abre via blob: URL
  const abrirDocumento = async (ordemId, tipo) => {
    try {
      const resp = await fetch(`${API}/oc/interno/oc-doc/${ordemId}/${tipo}`, {
        headers: authHeaders()
      })
      if (!resp.ok) throw new Error('Erro ao carregar documento')
      const blob = await resp.blob()
      const blobUrl = URL.createObjectURL(blob)
      const win = window.open(blobUrl, '_blank')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
      if (!win) alert('Permita popups para abrir o documento.')
    } catch (e) {
      console.error('Erro ao abrir documento:', e)
      alert('Não foi possível abrir o documento.')
    }
  }

  const filtradas = useMemo(() => {
    return ordens.filter(o => {
      const status = o.docs_status || 'AGUARDANDO'
      const matchStatus = statusFilter === 'Todos' || status === statusFilter
      const t = searchTerm.toLowerCase()
      const matchSearch = !t ||
        (o.numero_oc || '').toLowerCase().includes(t) ||
        (o.fornecedor_nome || '').toLowerCase().includes(t) ||
        (o.nf_numero || '').toLowerCase().includes(t)
      return matchStatus && matchSearch
    })
  }, [ordens, statusFilter, searchTerm])

  const counts = useMemo(() => {
    const anexado = ordens.filter(o => (o.docs_status || 'AGUARDANDO') === 'ANEXADO').length
    const aguardando = ordens.length - anexado
    return { anexado, aguardando, total: ordens.length }
  }, [ordens])

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <FaFileInvoiceDollar className="text-indigo-600" /> Documentos do Fornecedor (NF / Boleto)
          </h1>
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
              <FaClock className="text-amber-600" />
              <span className="text-sm font-bold text-amber-700">{counts.aguardando} Aguardando</span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
              <FaCheckCircle className="text-green-600" />
              <span className="text-sm font-bold text-green-700">{counts.anexado} Anexados</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg border border-gray-300">
              <span className="text-sm font-bold text-gray-700">{counts.total} Total de OCs</span>
            </div>
          </div>
        </div>
        <button onClick={fetchOrdens} disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-50">
          {loading ? 'Atualizando...' : '↻ Atualizar'}
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <FaFilter className="text-gray-400" />
          <span className="text-xs font-bold text-gray-500 uppercase">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por OC, fornecedor ou nº NF..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <select className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="Todos">📋 Todos os status</option>
            <option value="AGUARDANDO">⏳ Aguardando anexo</option>
            <option value="ANEXADO">✅ Documentos anexados</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
              <th className="px-6 py-4">OC / Empresa</th>
              <th className="px-6 py-4">Fornecedor</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Status Docs</th>
              <th className="px-6 py-4">Nota Fiscal</th>
              <th className="px-6 py-4">Boleto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                  <FaFileInvoiceDollar size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Nenhuma OC encontrada</p>
                  <p className="text-sm">Ajuste os filtros</p>
                </td>
              </tr>
            ) : filtradas.map(o => {
              const status = o.docs_status || 'AGUARDANDO'
              return (
                <tr key={o.id} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-gray-800 block">{o.numero_oc}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <FaBuilding className="text-indigo-300" /> {o.empresa_nome || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 flex items-center gap-2">
                      <FaUserTie className="text-indigo-400" /> {o.fornecedor_nome || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-700">{fmtMoeda(o.valor_total)}</td>
                  <td className="px-6 py-4">
                    {status === 'ANEXADO' ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold w-fit">
                          <FaCheckCircle /> Anexado
                        </span>
                        {o.docs_data && <span className="text-[11px] text-gray-400 flex items-center gap-1"><FaCalendarAlt /> {fmtData(o.docs_data)}</span>}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold w-fit">
                        <FaClock /> Aguardando
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {o.nf_anexada ? (
                      <div className="flex flex-col gap-1">
                        <a href="#" onClick={(e) => { e.preventDefault(); abrirDocumento(o.id, 'nf'); }}
                          className="inline-flex items-center gap-2 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-bold text-sm w-fit">
                          <FaFilePdf /> Baixar NF
                        </a>
                        {o.nf_numero && <span className="text-[11px] text-gray-400">Nº {o.nf_numero}</span>}
                      </div>
                    ) : <span className="text-xs text-gray-400 italic">Não anexada</span>}
                  </td>
                  <td className="px-6 py-4">
                    {o.boleto_anexado ? (
                      <div className="flex flex-col gap-1">
                        <a href="#" onClick={(e) => { e.preventDefault(); abrirDocumento(o.id, 'boleto'); }}
                          className="inline-flex items-center gap-2 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg font-bold text-sm w-fit">
                          <FaFileAlt /> Baixar Boleto
                        </a>
                        {o.boleto_vencimento && <span className="text-[11px] text-gray-400">Venc. {fmtData(o.boleto_vencimento)}</span>}
                      </div>
                    ) : <span className="text-xs text-gray-400 italic">Não anexado</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}