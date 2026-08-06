import React, { useState, useEffect } from 'react'
import { BarChart2, FileText, TrendingUp, ShoppingCart, Download, Filter, X, AlertCircle, Check, Users, DollarSign, Package, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function RelatorioCompras() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [requisicoes, setRequisicoes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [activeTab, setActiveTab] = useState('geral')

  // Filtros
  const [filtros, setFiltros] = useState({
    empresa_id: '',
    status: '',
    data_inicio: '',
    data_fim: '',
    solicitante: ''
  })

  const API_BASE = ''

  const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}

  useEffect(() => {
    fetchDados()
    fetchEmpresas()
  }, [])

  const fetchDados = async () => {
    setLoading(true)
    try {
      const [resRQ, resPD] = await Promise.all([
        fetch(`${API_BASE}/api/compras/requisicoes`, { headers }),
        fetch(`${API_BASE}/api/compras/pedidos`, { headers })
      ])
      if (resRQ.ok) setRequisicoes(await resRQ.json())
      if (resPD.ok) setPedidos(await resPD.json())
    } catch (e) {
      setError('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmpresas = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/empresas`, { headers })
      if (res.ok) setEmpresas(await res.json())
    } catch (e) {}
  }

  // Aplicar filtros
  const aplicarFiltros = (lista) => {
    return lista.filter(item => {
      const matchEmpresa = !filtros.empresa_id || String(item.empresa_id) === filtros.empresa_id
      const matchStatus  = !filtros.status    || item.status === filtros.status
      const matchSolic   = !filtros.solicitante ||
        (item.usuario_solicitante_nome || item.usuario_comprador_nome || '')
          .toLowerCase().includes(filtros.solicitante.toLowerCase())
      const dataItem = new Date(item.data_solicitacao || item.data_pedido || item.created_at)
      const matchInicio  = !filtros.data_inicio || dataItem >= new Date(filtros.data_inicio)
      const matchFim     = !filtros.data_fim    || dataItem <= new Date(filtros.data_fim + 'T23:59:59')
      return matchEmpresa && matchStatus && matchSolic && matchInicio && matchFim
    })
  }

  const rqFiltradas = aplicarFiltros(requisicoes)
  const pdFiltrados = aplicarFiltros(pedidos)

  // KPIs Requisições
  const totalRQ         = rqFiltradas.length
  const totalRQValor    = rqFiltradas.reduce((s, r) => s + (r.valor_total || 0), 0)
  const rqPendentes     = rqFiltradas.filter(r => r.status === 'PENDENTE').length
  const rqAprovadas     = rqFiltradas.filter(r => r.status === 'APROVADA').length
  const rqRejeitadas    = rqFiltradas.filter(r => r.status === 'REJEITADA').length
  const rqConvertidas   = rqFiltradas.filter(r => r.status === 'CONVERTIDA').length

  // KPIs Pedidos
  const totalPD         = pdFiltrados.length
  const totalPDValor    = pdFiltrados.reduce((s, p) => s + (p.valor_total || 0), 0)
  const pdPendentes     = pdFiltrados.filter(p => p.status === 'PENDENTE').length
  const pdAprovados     = pdFiltrados.filter(p => p.status === 'APROVADO').length
  const pdRecebidos     = pdFiltrados.filter(p => p.status === 'RECEBIDO').length

  // Agrupamento por solicitante (RQ)
  const porSolicitante = rqFiltradas.reduce((acc, rq) => {
    const nome = rq.usuario_solicitante_nome || 'Desconhecido'
    if (!acc[nome]) acc[nome] = { total: 0, valor: 0 }
    acc[nome].total++
    acc[nome].valor += rq.valor_total || 0
    return acc
  }, {})

  // Agrupamento por empresa
  const porEmpresa = rqFiltradas.reduce((acc, rq) => {
    const nome = rq.empresa_nome || 'Desconhecida'
    if (!acc[nome]) acc[nome] = { total: 0, valor: 0 }
    acc[nome].total++
    acc[nome].valor += rq.valor_total || 0
    return acc
  }, {})

  // Agrupamento por status
  const statusRQ = ['RASCUNHO','PENDENTE','APROVADA','REJEITADA','CONVERTIDA']
  const statusPD = ['RASCUNHO','PENDENTE','APROVADO','ENVIADO','RECEBIDO','CANCELADO']

  const getStatusColor = (status) => {
    const c = {
      'RASCUNHO':'bg-gray-100 text-gray-700',
      'PENDENTE':'bg-yellow-100 text-yellow-700',
      'APROVADA':'bg-green-100 text-green-700',
      'APROVADO':'bg-green-100 text-green-700',
      'REJEITADA':'bg-red-100 text-red-700',
      'CONVERTIDA':'bg-blue-100 text-blue-700',
      'ENVIADO':'bg-purple-100 text-purple-700',
      'RECEBIDO':'bg-teal-100 text-teal-700',
      'CANCELADO':'bg-red-100 text-red-700',
    }
    return c[status] || 'bg-gray-100 text-gray-700'
  }

  const exportarCSV = (dados, nomeArquivo) => {
    if (!dados.length) return
    const cols = Object.keys(dados[0])
    const csv = [cols.join(';'), ...dados.map(row => cols.map(c => `"${row[c] ?? ''}"`).join(';'))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = nomeArquivo; a.click()
    URL.revokeObjectURL(url)
  }

  const exportarRelatorioRQ = () => {
    const dados = rqFiltradas.map(r => ({
      'Nº RQ': r.numero_rq,
      'Empresa': r.empresa_nome,
      'Solicitante': r.usuario_solicitante_nome || '',
      'Status': r.status,
      'Data Solicitação': r.data_solicitacao ? new Date(r.data_solicitacao).toLocaleDateString('pt-BR') : '',
      'Data Necessária': r.data_necessaria ? new Date(r.data_necessaria).toLocaleDateString('pt-BR') : '',
      'Valor Total': r.valor_total?.toFixed(2) || '0.00',
      'Qtd Itens': r.itens?.length || 0,
      'Observação': r.observacao || ''
    }))
    exportarCSV(dados, 'relatorio_requisicoes.csv')
  }

  const exportarRelatorioPD = () => {
    const dados = pdFiltrados.map(p => ({
      'Nº Pedido': p.numero_pedido,
      'Empresa': p.empresa_nome,
      'Fornecedor': p.fornecedor_nome || '',
      'Comprador': p.usuario_comprador_nome || '',
      'Status': p.status,
      'Data Pedido': p.data_pedido ? new Date(p.data_pedido).toLocaleDateString('pt-BR') : '',
      'Valor Total': p.valor_total?.toFixed(2) || '0.00',
      'Observação': p.observacao || ''
    }))
    exportarCSV(dados, 'relatorio_pedidos.csv')
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
            <span className="text-red-700 font-bold flex items-center gap-2"><AlertCircle size={18}/>{error}</span>
            <button onClick={() => setError('')}><X size={18} className="text-red-500"/></button>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <BarChart2 className="text-indigo-600" size={32}/>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Relatórios de Compras</h1>
              <p className="text-gray-500 text-sm">Visão geral e detalhada do setor de compras</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={exportarRelatorioRQ} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm">
              <Download size={16}/> CSV Requisições
            </button>
            <button onClick={exportarRelatorioPD} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm">
              <Download size={16}/> CSV Pedidos
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={18} className="text-indigo-600"/>
            <h2 className="font-bold text-gray-700">Filtros</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Empresa</label>
              <select className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={filtros.empresa_id} onChange={e => setFiltros({...filtros, empresa_id: e.target.value})}>
                <option value="">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Status RQ</label>
              <select className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={filtros.status} onChange={e => setFiltros({...filtros, status: e.target.value})}>
                <option value="">Todos</option>
                {statusRQ.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Solicitante</label>
              <input type="text" placeholder="Nome do solicitante..."
                className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={filtros.solicitante} onChange={e => setFiltros({...filtros, solicitante: e.target.value})}/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Data Início</label>
              <input type="date" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={filtros.data_inicio} onChange={e => setFiltros({...filtros, data_inicio: e.target.value})}/>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">Data Fim</label>
              <input type="date" className="w-full p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={filtros.data_fim} onChange={e => setFiltros({...filtros, data_fim: e.target.value})}/>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={() => setFiltros({empresa_id:'',status:'',data_inicio:'',data_fim:'',solicitante:''})}
              className="text-sm text-gray-500 hover:text-gray-700 font-bold px-3 py-1 rounded-lg hover:bg-gray-100">
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <FileText size={24} className="text-indigo-500"/>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">Requisições</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{totalRQ}</p>
            <p className="text-xs text-gray-500 mt-1">Total de RQs no período</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <DollarSign size={24} className="text-green-500"/>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Valor RQ</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">R$ {totalRQValor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
            <p className="text-xs text-gray-500 mt-1">Valor total requisitado</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <ShoppingCart size={24} className="text-blue-500"/>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Pedidos</span>
            </div>
            <p className="text-3xl font-bold text-gray-800">{totalPD}</p>
            <p className="text-xs text-gray-500 mt-1">Total de pedidos no período</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={24} className="text-purple-500"/>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Valor PD</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">R$ {totalPDValor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
            <p className="text-xs text-gray-500 mt-1">Valor total em pedidos</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id:'geral',       label:'Visão Geral',    icon:<BarChart2 size={16}/> },
            { id:'requisicoes', label:'Requisições',    icon:<FileText size={16}/> },
            { id:'pedidos',     label:'Pedidos',        icon:<ShoppingCart size={16}/> },
            { id:'solicitantes',label:'Por Solicitante',icon:<Users size={16}/> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all -mb-px ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das Tabs */}

        {/* VISÃO GERAL */}
        {activeTab === 'geral' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Requisições */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText size={18} className="text-indigo-500"/>Status das Requisições</h3>
              <div className="space-y-3">
                {statusRQ.map(s => {
                  const qtd = rqFiltradas.filter(r => r.status === s).length
                  const pct = totalRQ > 0 ? (qtd / totalRQ * 100).toFixed(0) : 0
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(s)}`}>{s}</span>
                        <span className="font-bold text-gray-700">{qtd} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{width: `${pct}%`}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Status Pedidos */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><ShoppingCart size={18} className="text-blue-500"/>Status dos Pedidos</h3>
              <div className="space-y-3">
                {statusPD.map(s => {
                  const qtd = pdFiltrados.filter(p => p.status === s).length
                  const pct = totalPD > 0 ? (qtd / totalPD * 100).toFixed(0) : 0
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(s)}`}>{s}</span>
                        <span className="font-bold text-gray-700">{qtd} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width: `${pct}%`}}/>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Por Empresa */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm md:col-span-2">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Package size={18} className="text-green-500"/>Requisições por Empresa</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-bold text-gray-600">Empresa</th>
                      <th className="px-4 py-2 text-left font-bold text-gray-600">Qtd RQs</th>
                      <th className="px-4 py-2 text-left font-bold text-gray-600">Valor Total</th>
                      <th className="px-4 py-2 text-left font-bold text-gray-600">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.entries(porEmpresa).sort((a,b) => b[1].valor - a[1].valor).map(([nome, dados]) => (
                      <tr key={nome} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{nome}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600">{dados.total}</td>
                        <td className="px-4 py-3 font-bold text-green-600">R$ {dados.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                        <td className="px-4 py-3 text-gray-600">R$ {(dados.valor / dados.total).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                      </tr>
                    ))}
                    {Object.keys(porEmpresa).length === 0 && (
                      <tr><td colSpan="4" className="px-4 py-6 text-center text-gray-400">Nenhum dado encontrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* REQUISIÇÕES */}
        {activeTab === 'requisicoes' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">{rqFiltradas.length} Requisições encontradas</h3>
              <button onClick={exportarRelatorioRQ} className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold hover:bg-green-700">
                <Download size={14}/> Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Nº RQ</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Empresa</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Solicitante</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Data Solic.</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Data Neces.</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Valor Total</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Qtd Itens</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rqFiltradas.map(rq => (
                    <tr key={rq.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-indigo-600">{rq.numero_rq}</td>
                      <td className="px-4 py-3 text-gray-800">{rq.empresa_nome}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{rq.usuario_solicitante_nome || <span className="text-gray-400 italic">N/A</span>}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(rq.status)}`}>{rq.status}</span></td>
                      <td className="px-4 py-3 text-gray-600">{rq.data_solicitacao ? new Date(rq.data_solicitacao).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{rq.data_necessaria ? new Date(rq.data_necessaria).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-4 py-3 font-bold text-green-600">R$ {rq.valor_total?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-700">{rq.itens?.length || 0}</td>
                    </tr>
                  ))}
                  {rqFiltradas.length === 0 && (
                    <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">Nenhuma requisição encontrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PEDIDOS */}
        {activeTab === 'pedidos' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">{pdFiltrados.length} Pedidos encontrados</h3>
              <button onClick={exportarRelatorioPD} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold hover:bg-blue-700">
                <Download size={14}/> Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Nº Pedido</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Empresa</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Fornecedor</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Comprador</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Data Pedido</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pdFiltrados.map(pd => (
                    <tr key={pd.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-blue-600">{pd.numero_pedido}</td>
                      <td className="px-4 py-3 text-gray-800">{pd.empresa_nome}</td>
                      <td className="px-4 py-3 text-gray-700">{pd.fornecedor_nome || <span className="text-gray-400 italic">N/A</span>}</td>
                      <td className="px-4 py-3 font-medium text-gray-700">{pd.usuario_comprador_nome || <span className="text-gray-400 italic">N/A</span>}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(pd.status)}`}>{pd.status}</span></td>
                      <td className="px-4 py-3 text-gray-600">{pd.data_pedido ? new Date(pd.data_pedido).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-4 py-3 font-bold text-green-600">R$ {pd.valor_total?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))}
                  {pdFiltrados.length === 0 && (
                    <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Nenhum pedido encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* POR SOLICITANTE */}
        {activeTab === 'solicitantes' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Requisições por Solicitante</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Solicitante</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Qtd RQs</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Valor Total</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">Ticket Médio</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-600">% do Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Object.entries(porSolicitante).sort((a,b) => b[1].valor - a[1].valor).map(([nome, dados]) => (
                    <tr key={nome} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                          {nome.charAt(0).toUpperCase()}
                        </div>
                        {nome}
                      </td>
                      <td className="px-4 py-3 font-bold text-indigo-600">{dados.total}</td>
                      <td className="px-4 py-3 font-bold text-green-600">R$ {dados.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3 text-gray-600">R$ {(dados.valor/dados.total).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-indigo-500 h-2 rounded-full" style={{width: `${totalRQValor > 0 ? (dados.valor/totalRQValor*100).toFixed(0) : 0}%`}}/>
                          </div>
                          <span className="text-xs font-bold text-gray-600">{totalRQValor > 0 ? (dados.valor/totalRQValor*100).toFixed(1) : 0}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {Object.keys(porSolicitante).length === 0 && (
                    <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">Nenhum dado encontrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}