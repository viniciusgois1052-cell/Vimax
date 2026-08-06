import React, { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, DollarSign, FileText, Truck, AlertCircle, Calendar, Users, Package } from 'lucide-react'
import { useEntity } from '../../context/EntityContext'
import { useAuth } from '../../context/AuthContext'

export default function DashboardCompras() {
  const { selectedEntity } = useEntity()
  const { user } = useAuth()

  // Estados
  const [requisicoes, setRequisicoes] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [ordens, setOrdens] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)

  const API_BASE = ""

  // Fetch dados
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
        const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : ''

        const [resRQ, resPC, resOC, resFor, resEmp] = await Promise.all([
          fetch(`${API_BASE}/api/compras/requisicoes${queryParams}`, { headers }),
          fetch(`${API_BASE}/api/compras/pedidos${queryParams}`, { headers }),
          fetch(`${API_BASE}/api/compras/ordens${queryParams}`, { headers }),
          fetch(`${API_BASE}/api/fornecedores/`, { headers }),
          fetch(`${API_BASE}/api/empresas/`, { headers })
        ])

        if (resRQ.ok) setRequisicoes(await resRQ.json())
        if (resPC.ok) setPedidos(await resPC.json())
        if (resOC.ok) setOrdens(await resOC.json())
        if (resFor.ok) setFornecedores(await resFor.json())
        if (resEmp.ok) setEmpresas(await resEmp.json())
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, selectedEntity, API_BASE])

  // CÁLCULOS DE DADOS

  const statsCards = useMemo(() => {
    const totalRQ = requisicoes.length
    const rqAprovadas = requisicoes.filter(r => r.status === 'Aprovada').length
    const valorTotalRQ = requisicoes.reduce((sum, r) => sum + parseFloat(r.valor_total || 0), 0)

    const totalPC = pedidos.length
    const valorTotalPC = pedidos.reduce((sum, p) => sum + parseFloat(p.valor_final || 0), 0)

    const totalOC = ordens.length
    const ocEnviadas = ordens.filter(o => o.pdf_enviado).length

    return {
      totalRQ,
      rqAprovadas,
      valorTotalRQ,
      totalPC,
      valorTotalPC,
      totalOC,
      ocEnviadas
    }
  }, [requisicoes, pedidos, ordens])

  // GRÁFICO: Evolução de Compras (últimos 30 dias)
  const graficoEvolucao = useMemo(() => {
    const dados = {}
    const hoje = new Date()

    // Inicializar últimos 30 dias
    for (let i = 29; i >= 0; i--) {
      const data = new Date(hoje)
      data.setDate(data.getDate() - i)
      const chave = data.toISOString().split('T')[0]
      dados[chave] = { data: chave, rq: 0, pc: 0, oc: 0 }
    }

    // Contar requisições
    requisicoes.forEach(r => {
      const chave = r.created_at?.split('T')[0]
      if (chave && dados[chave]) dados[chave].rq++
    })

    // Contar pedidos
    pedidos.forEach(p => {
      const chave = p.created_at?.split('T')[0]
      if (chave && dados[chave]) dados[chave].pc++
    })

    // Contar ordens
    ordens.forEach(o => {
      const chave = o.created_at?.split('T')[0]
      if (chave && dados[chave]) dados[chave].oc++
    })

    return Object.values(dados)
  }, [requisicoes, pedidos, ordens])

  // GRÁFICO: Gastos por Status
  const graficoPorStatus = useMemo(() => {
    return [
      { name: 'Rascunho', value: requisicoes.filter(r => r.status === 'Rascunho').length, color: '#9CA3AF' },
      { name: 'Pendente', value: requisicoes.filter(r => r.status === 'Pendente Aprovação').length, color: '#F59E0B' },
      { name: 'Aprovada', value: requisicoes.filter(r => r.status === 'Aprovada').length, color: '#10B981' },
      { name: 'Rejeitada', value: requisicoes.filter(r => r.status === 'Rejeitada').length, color: '#EF4444' },
    ].filter(item => item.value > 0)
  }, [requisicoes])

  // GRÁFICO: Top 10 Fornecedores (por valor gasto)
  const graficoFornecedores = useMemo(() => {
    const gastosPorFornecedor = {}

    pedidos.forEach(p => {
      if (!gastosPorFornecedor[p.fornecedor_nome]) {
        gastosPorFornecedor[p.fornecedor_nome] = 0
      }
      gastosPorFornecedor[p.fornecedor_nome] += p.valor_final
    })

    return Object.entries(gastosPorFornecedor)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10)
  }, [pedidos])

  // GRÁFICO: Valor de Compras por Mês
  const graficoMensalValor = useMemo(() => {
    const meses = {}
    const nomesMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    // Inicializar últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const data = new Date()
      data.setMonth(data.getMonth() - i)
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
      const mesNome = nomesMeses[data.getMonth()]
      meses[chave] = { mes: mesNome, valor: 0 }
    }

    // Somar valores de pedidos
    pedidos.forEach(p => {
      const dataEmissao = p.data_emissao?.split('T')[0]
      if (dataEmissao) {
        const chave = dataEmissao.substring(0, 7)
        if (meses[chave]) {
          meses[chave].valor += p.valor_final
        }
      }
    })

    return Object.values(meses)
  }, [pedidos])

  // ALERTAS
  const alertas = useMemo(() => {
    const lista = []

    // RQ vencidas (não aprovadas há 7 dias)
    const seteDiasAtras = new Date()
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)

    requisicoes.forEach(r => {
      if (r.status === 'Pendente Aprovação') {
        const dataCriacao = new Date(r.created_at)
        if (dataCriacao < seteDiasAtras) {
          lista.push({
            tipo: 'rq_pendente',
            titulo: `RQ ${r.numero_rq} aguardando aprovação`,
            descricao: `Empresa: ${r.empresa_nome}`,
            dias: Math.floor((new Date() - dataCriacao) / (1000 * 60 * 60 * 24)),
            severidade: 'alta'
          })
        }
      }
    })

    // OC não enviadas
    ordens.forEach(o => {
      if (!o.pdf_enviado) {
        lista.push({
          tipo: 'oc_nao_enviada',
          titulo: `OC ${o.numero_oc} não enviada`,
          descricao: `Fornecedor: ${o.fornecedor_nome}`,
          severidade: 'media'
        })
      }
    })

    // PC sem OC
    pedidos.forEach(p => {
      const temOC = ordens.some(o => o.pedido_id === p.id)
      if (!temOC && p.status === 'Confirmado') {
        lista.push({
          tipo: 'pc_sem_oc',
          titulo: `PC ${p.numero_pc} sem Ordem de Compra`,
          descricao: `Fornecedor: ${p.fornecedor_nome}`,
          severidade: 'media'
        })
      }
    })

    return lista.slice(0, 5)
  }, [requisicoes, pedidos, ordens])

  const CORES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600 font-bold">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3 mb-2">
            <TrendingUp className="text-indigo-600" size={36} />
            Dashboard de Compras
          </h1>
          <p className="text-gray-600">Análise completa do fluxo de compras em tempo real</p>
        </div>

        {/* CARDS DE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card RQ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <FileText className="text-blue-600" size={32} />
              <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {statsCards.rqAprovadas}/{statsCards.totalRQ}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Requisições de Compra</p>
            <p className="text-3xl font-bold text-gray-800">{statsCards.totalRQ}</p>
            <p className="text-xs text-green-600 font-bold mt-2">✓ {statsCards.rqAprovadas} aprovadas</p>
          </div>

          {/* Card PC */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <Truck className="text-indigo-600" size={32} />
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                R$ {(statsCards.valorTotalPC / 1000).toFixed(0)}k
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Pedidos de Compra</p>
            <p className="text-3xl font-bold text-gray-800">{statsCards.totalPC}</p>
            <p className="text-xs text-gray-500 font-bold mt-2">Total: R$ {statsCards.valorTotalPC.toFixed(2)}</p>
          </div>

          {/* Card OC */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between mb-4">
              <Package className="text-green-600" size={32} />
              <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                {statsCards.ocEnviadas}/{statsCards.totalOC}
              </span>
            </div>
            <p className="text-gray-600 text-sm mb-1">Ordens de Compra</p>
            <p className="text-3xl font-bold text-gray-800">{statsCards.totalOC}</p>
            <p className="text-xs text-green-600 font-bold mt-2">📮 {statsCards.ocEnviadas} enviadas</p>
          </div>

          {/* Card Valor Total */}
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl shadow-sm p-6 hover:shadow-lg transition-all text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign size={32} />
              <span className="text-sm font-bold bg-white/20 px-3 py-1 rounded-full">
                Total
              </span>
            </div>
            <p className="text-gray-100 text-sm mb-1">Valor Total de Compras</p>
            <p className="text-3xl font-bold">R$ {(parseFloat(statsCards.valorTotalRQ || 0) + parseFloat(statsCards.valorTotalPC || 0)).toFixed(2)}</p>
            <p className="text-xs text-indigo-100 font-bold mt-2">📊 Últimos 30 dias</p>
          </div>
        </div>

        {/* ALERTAS */}
        {alertas.length > 0 && (
          <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 p-4 flex items-center gap-2">
              <AlertCircle className="text-red-600" size={24} />
              <h2 className="text-lg font-bold text-red-800">Alertas Importantes</h2>
              <span className="ml-auto bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {alertas.length}
              </span>
            </div>
            <div className="p-4 space-y-3">
              {alertas.map((alerta, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-l-4 ${
                  alerta.severidade === 'alta' 
                    ? 'bg-red-50 border-red-500' 
                    : 'bg-yellow-50 border-yellow-500'
                }`}>
                  <p className={`font-bold ${alerta.severidade === 'alta' ? 'text-red-800' : 'text-yellow-800'}`}>
                    {alerta.titulo}
                  </p>
                  <p className={`text-sm ${alerta.severidade === 'alta' ? 'text-red-700' : 'text-yellow-700'}`}>
                    {alerta.descricao}
                  </p>
                  {alerta.dias && (
                    <p className={`text-xs font-bold mt-1 ${alerta.severidade === 'alta' ? 'text-red-600' : 'text-yellow-600'}`}>
                      ⏰ Há {alerta.dias} dias
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GRÁFICOS - ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Evolução */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              Evolução (últimos 30 dias)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={graficoEvolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="data" stroke="#9CA3AF" style={{ fontSize: '11px' }} tickFormatter={(val) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth()+1}` }} interval={4} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  labelStyle={{ color: '#1F2937' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="rq" stroke="#3B82F6" name="RQ" strokeWidth={2} />
                <Line type="monotone" dataKey="pc" stroke="#10B981" name="PC" strokeWidth={2} />
                <Line type="monotone" dataKey="oc" stroke="#F59E0B" name="OC" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Status RQ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-indigo-600" />
              Distribuição por Status (RQ)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={graficoPorStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {graficoPorStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} itens`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICOS - ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Fornecedores */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users size={20} className="text-green-600" />
              Top 10 Fornecedores (Valor)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={graficoFornecedores} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis dataKey="nome" type="category" stroke="#9CA3AF" style={{ fontSize: '11px' }} width={120} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  labelStyle={{ color: '#1F2937' }}
                  formatter={(value) => `R$ ${value.toFixed(2)}`}
                />
                <Bar dataKey="valor" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Valor Mensal */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-purple-600" />
              Valor de Compras por Mês
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={graficoMensalValor}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="mes" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px' }}
                  labelStyle={{ color: '#1F2937' }}
                  formatter={(value) => `R$ ${value.toFixed(2)}`}
                />
                <Bar dataKey="valor" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABELAS DE RESUMO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimas RQ */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Últimas Requisições</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {requisicoes.slice(0, 5).map((rq) => (
                <div key={rq.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{rq.numero_rq}</p>
                      <p className="text-xs text-gray-600">{rq.empresa_nome}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">R$ {parseFloat(rq.valor_total || 0).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        rq.status === 'Aprovada' ? 'bg-green-100 text-green-800' :
                        rq.status === 'Pendente Aprovação' ? 'bg-yellow-100 text-yellow-800' :
                        rq.status === 'Rejeitada' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rq.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Últimos PC */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Últimos Pedidos</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pedidos.slice(0, 5).map((pc) => (
                <div key={pc.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-800">{pc.numero_pc}</p>
                      <p className="text-xs text-gray-600">{pc.fornecedor_nome}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600">R$ {parseFloat(pc.valor_final || 0).toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                        pc.status === 'Emitido' ? 'bg-blue-100 text-blue-800' :
                        pc.status === 'Confirmado' ? 'bg-indigo-100 text-indigo-800' :
                        pc.status === 'Entregue' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {pc.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}