import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plus, Trash2, Edit2, X, Search, Filter, FileText, Eye, 
  ChevronDown, Calendar, DollarSign, Send, Download, AlertCircle, Check,
  ExternalLink
} from 'lucide-react'
import { useEntity } from '../../context/EntityContext'
import { useAuth } from '../../context/AuthContext'

export default function OrdemCompra() {
  const { selectedEntity } = useEntity()
  const { user, can } = useAuth()

  // Estados principais
  const [ordens, setOrdens] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [empresas, setEmpresas] = useState([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState([])
  const [fornecedorFilter, setFornecedorFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentOCId, setCurrentOCId] = useState(null)

  // Modal Detalhes
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false)
  const [selectedOC, setSelectedOC] = useState(null)

  // Modal Geração
  const [isGeracaoOpen, setIsGeracaoOpen] = useState(false)
  const [pcSelecionada, setPCSelecionada] = useState(null)

  // Modal Envio
  const [isEnvioOpen, setIsEnvioOpen] = useState(false)
  const [ocParaEnviar, setOCParaEnviar] = useState(null)
  const [emailEnvio, setEmailEnvio] = useState('')
  const [mensagemEnvio, setMensagemEnvio] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Formulário principal
  const [formData, setFormData] = useState({
    pedido_id: '',
    fornecedor_id: '',
    data_entrega_prevista: '',
    email_fornecedor: '',
    telefone_fornecedor: '',
    observacoes: '',
    anexos: []
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const fmt = (val) => parseFloat(val || 0).toFixed(2)

  const STATUSES = ['Emitido', 'Confirmado', 'Entrega Parcial', 'Entregue', 'Cancelado']
  const STATUS_BADGE_COLORS = {
    'Emitido': 'bg-blue-500 text-white',
    'Confirmado': 'bg-indigo-500 text-white',
    'Entrega Parcial': 'bg-yellow-500 text-white',
    'Entregue': 'bg-green-500 text-white',
    'Cancelado': 'bg-red-500 text-white',
  }

  const API_BASE = ""

  const getLinkCompra = (registro) => {
    if (registro?.links_compra?.length) {
      return registro.links_compra[0]
    }

    const item = (registro?.itens || []).find(
      atual => /^https?:\/\//i.test(atual.link_compra || '')
    )

    return item?.link_compra || ''
  }

  const isCompraSite = registro =>
    registro?.tipo_compra === 'site'

  // Fetch inicial
  const fetchData = useCallback(async () => {
    try {
      const headers = {}
      if (user?.api_token) {
        headers['X-API-Token'] = user.api_token
      }

      const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : ''

      const [resOC, resPC, resFor, resEmp] = await Promise.all([
        fetch(`${API_BASE}/api/compras/ordens${queryParams}`, { headers }),
        fetch(`${API_BASE}/api/compras/pedidos${queryParams}`, { headers }),
        fetch(`${API_BASE}/api/fornecedores/`, { headers }),
        fetch(`${API_BASE}/api/empresas/`, { headers })
      ])

      if (resOC.ok) setOrdens(await resOC.json())
      if (resPC.ok) setPedidos(await resPC.json())
      if (resFor.ok) setFornecedores(await resFor.json())
      if (resEmp.ok) setEmpresas(await resEmp.json())
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    }
  }, [user, selectedEntity, API_BASE])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Abrir modal criar/editar
  const handleOpenModal = (oc = null) => {
    if (oc) {
      setIsEditing(true)
      setCurrentOCId(oc.id)
      setFormData({
        pedido_id: oc.pedido_id?.toString() || '',
        fornecedor_id: oc.fornecedor_id?.toString() || '',
        data_entrega_prevista: oc.data_entrega_prevista ? oc.data_entrega_prevista.split('T')[0] : '',
        email_fornecedor: oc.email_fornecedor || '',
        telefone_fornecedor: oc.telefone_fornecedor || '',
        observacoes: oc.observacoes || '',
        anexos: oc.anexos || []
      })
    } else {
      setIsEditing(false)
      setCurrentOCId(null)
      setFormData({
        pedido_id: '',
        fornecedor_id: '',
        data_entrega_prevista: '',
        email_fornecedor: '',
        telefone_fornecedor: '',
        observacoes: '',
        anexos: []
      })
    }
    setIsModalOpen(true)
  }

  // Gerar OC a partir de PC
  const handleGerarOC = async () => {
    const compraSite = isCompraSite(pcSelecionada)

    if (!pcSelecionada || (!compraSite && !formData.fornecedor_id)) {
      setError(
        compraSite
          ? 'Selecione um Pedido'
          : 'Selecione um Pedido e um Fornecedor'
      )
      return
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    const payload = {
      pedido_id: pcSelecionada.id,
      fornecedor_id: compraSite
        ? null
        : parseInt(formData.fornecedor_id),
      data_entrega_prevista: formData.data_entrega_prevista,
      email_fornecedor: formData.email_fornecedor,
      telefone_fornecedor: formData.telefone_fornecedor,
      observacoes: formData.observacoes,
      anexos: formData.anexos
    }

    try {
      const res = await fetch(`${API_BASE}/api/compras/ordens`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setIsGeracaoOpen(false)
        fetchData()
        setSuccess('Ordem de Compra gerada com sucesso!')
      } else {
        setError('Erro ao gerar ordem')
      }
    } catch (error) {
      console.error('Erro:', error)
      setError('Erro ao gerar ordem')
    }
  }

  // Submeter formulário de edição
  const handleSubmit = async (e) => {
    e.preventDefault()

    const pedidoFormulario = pedidos.find(
      pedido => pedido.id === parseInt(formData.pedido_id)
    )
    const ordemAtual = ordens.find(
      ordem => ordem.id === currentOCId
    )
    const compraSite = (
      isCompraSite(pedidoFormulario)
      || isCompraSite(ordemAtual)
    )

    if (!formData.pedido_id || (!compraSite && !formData.fornecedor_id)) {
      setError(
        compraSite
          ? 'Pedido é obrigatório'
          : 'Pedido e Fornecedor são obrigatórios'
      )
      return
    }

    const payload = {
      pedido_id: parseInt(formData.pedido_id),
      fornecedor_id: compraSite
        ? null
        : parseInt(formData.fornecedor_id),
      data_entrega_prevista: formData.data_entrega_prevista,
      email_fornecedor: formData.email_fornecedor,
      telefone_fornecedor: formData.telefone_fornecedor,
      observacoes: formData.observacoes,
      anexos: formData.anexos
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    const url = `${API_BASE}/api/compras/ordens/${currentOCId}`

    try {
      const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) })
      if (res.ok) {
        setIsModalOpen(false)
        fetchData()
      } else {
        setError('Erro ao salvar ordem')
      }
    } catch (error) {
      console.error('Erro:', error)
      setError('Erro ao salvar ordem')
    }
  }

  // Deletar
  const handleDelete = async (id) => {
    // confirm substituído por modal

    const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}

    try {
      const res = await fetch(`${API_BASE}/api/compras/ordens/${id}`, { method: 'DELETE', headers })
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  // Abrir modal envio de PDF/Email
  const handleAbrirEnvio = (oc) => {
    setOCParaEnviar(oc)
    setEmailEnvio(oc.email_fornecedor || '')
    setMensagemEnvio(`Segue em anexo a Ordem de Compra ${oc.numero_oc}. Favor confirmar recebimento.`)
    setIsEnvioOpen(true)
  }

  // Enviar por email
  const handleEnviarPorEmail = async () => {
    if (!emailEnvio || !ocParaEnviar) {
      setError('Email é obrigatório')
      return
    }

    setEnviando(true)

    // Simulação de envio - em produção, isso chamaria um endpoint real
    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    const payload = {
      numero_oc: ocParaEnviar.numero_oc,
      email_destino: emailEnvio,
      mensagem: mensagemEnvio,
      gerar_pdf: true
    }

    try {
      const res = await fetch(`${API_BASE}/api/compras/ordens/${ocParaEnviar.id}/enviar-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setIsEnvioOpen(false)
        setSuccess('Email enviado com sucesso!')
        fetchData()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Erro ao enviar email')
      }
      setEnviando(false)
    } catch (error) {
      console.error('Erro:', error)
      setEnviando(false)
      setError('Erro ao enviar email')
    }
  }

  // Ver detalhes
  const handleViewDetalhes = (oc) => {
    setSelectedOC(oc)
    setIsDetalhesOpen(true)
  }

  // Filtros
  const filteredOrdens = useMemo(() => {
    return ordens.filter(oc => {
      const matchesSearch = oc.numero_oc.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(oc.status)
      const matchesFornecedor = !fornecedorFilter || oc.fornecedor_id === parseInt(fornecedorFilter)
      const matchesEmpresa = !empresaFilter || oc.empresa_id === parseInt(empresaFilter)

      return matchesSearch && matchesStatus && matchesFornecedor && matchesEmpresa
    })
  }, [ordens, searchTerm, statusFilter, fornecedorFilter, empresaFilter])

  const pedidoFormularioAtual = pedidos.find(
    pedido => pedido.id === parseInt(formData.pedido_id)
  )
  const ordemFormularioAtual = ordens.find(
    ordem => ordem.id === currentOCId
  )
  const formularioCompraSite = (
    isCompraSite(pedidoFormularioAtual)
    || isCompraSite(ordemFormularioAtual)
  )
  const pedidosDisponiveis = pedidos.filter(
    pedido => (
      pedido.status !== 'Rascunho'
      && !ordens.some(ordem => (
        ordem.pedido_id === pedido.id
        && ordem.ativo !== false
      ))
    )
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
{error && (
  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
    <span className="text-red-700 font-bold flex items-center gap-2">
      <AlertCircle size={18} /> {error}
    </span>
    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={18} /></button>
  </div>
)}
{success && (
  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
    <span className="text-green-700 font-bold flex items-center gap-2">
      <Check size={18} /> {success}
    </span>
    <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700"><X size={18} /></button>
  </div>
)}
{confirmAction && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <p className="text-lg font-bold text-gray-800 text-center">{confirmAction.label}</p>
      <div className="flex gap-3">
        <button onClick={() => setConfirmAction(null)} className="flex-1 px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={() => { confirmAction.fn(); setConfirmAction(null) }} className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Confirmar</button>
      </div>
    </div>
  </div>
)}
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Send className="text-indigo-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-800">Ordem de Compra (OC)</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsGeracaoOpen(true)
                setPCSelecionada(null)
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
            >
              <FileText size={20} /> Gerar de PC
            </button>
            {can('compras','criar') && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
            >
              <Plus size={20} /> Nova Ordem
            </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nº OC..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="relative group">
              <div className="p-2 border rounded-lg bg-white cursor-pointer flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <ChevronDown size={16} />
              </div>
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 hidden group-hover:block z-10 min-w-max">
                {STATUSES.map(s => (
                  <label key={s} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(s)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setStatusFilter([...statusFilter, s])
                        } else {
                          setStatusFilter(statusFilter.filter(x => x !== s))
                        }
                      }}
                    />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Fornecedor */}
            <select
              className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={fornecedorFilter}
              onChange={(e) => setFornecedorFilter(e.target.value)}
            >
              <option value="">Todos Fornecedores</option>
              {fornecedores.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>

            {/* Empresa */}
            <select
              className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={empresaFilter}
              onChange={(e) => setEmpresaFilter(e.target.value)}
            >
              <option value="">Todas Empresas</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
            </select>

            {/* Limpar */}
            <button
              onClick={() => {
                setSearchTerm('')
                setStatusFilter([])
                setFornecedorFilter('')
                setEmpresaFilter('')
              }}
              className="p-2 border rounded-lg text-gray-600 hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
            >
              <Filter size={16} /> Limpar
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-700">Nº OC</th>
                  <th className="px-6 py-4 font-bold text-gray-700">PC</th>
                  <th className="px-6 py-4 font-bold text-gray-700">Fornecedor</th>
                  <th className="px-6 py-4 font-bold text-gray-700">Status</th>
                  <th className="px-6 py-4 font-bold text-gray-700">Data Emissão</th>
                  <th className="px-6 py-4 font-bold text-gray-700">Valor Total</th>
                  <th className="px-6 py-4 font-bold text-gray-700">Enviado</th>
                  <th className="px-6 py-4 font-bold text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrdens.map(oc => (
                  <tr key={oc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-800">
                        {oc.numero_oc}
                      </div>
                      {oc.projeto_id && (
                        <a
                          href={oc.projeto_link}
                          className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700 hover:bg-blue-100"
                        >
                          PROJETO · {oc.projeto_codigo || oc.projeto_nome}
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{oc.numero_pc}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {isCompraSite(oc) ? (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-black text-blue-700">
                          Compra por site
                        </span>
                      ) : (
                        oc.fornecedor_nome || '—'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE_COLORS[oc.status] || 'bg-gray-500 text-white'}`}>
                        {oc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(oc.data_emissao).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-bold text-green-600">
                      R$ {fmt(oc.valor_total)}
                    </td>
                    <td className="px-6 py-4">
                      {isCompraSite(oc) ? (
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                          Controle interno
                        </span>
                      ) : oc.pdf_enviado ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                          ✓ Sim
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold">
                          Não
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      {getLinkCompra(oc) && (
                        <a
                          href={getLinkCompra(oc)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                          title="Abrir site da compra"
                        >
                          <ExternalLink size={16} />
                          Site
                        </a>
                      )}
                      <button
                        onClick={() => handleViewDetalhes(oc)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Visualizar"
                      >
                        <Eye size={16} />
                      </button>
                      {!isCompraSite(oc) && (
                        <button
                          onClick={() => handleAbrirEnvio(oc)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="Enviar por Email"
                        >
                          <Send size={16} />
                        </button>
                      )}
                      {can('compras','editar') && (
                      <button
                        onClick={() => handleOpenModal(oc)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      )}
                      {can('compras','excluir') && (
                      <button
                        onClick={() => handleDelete(oc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Deletar"
                      >
                        <Trash2 size={16} />
                      </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredOrdens.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nenhuma ordem encontrada
            </div>
          )}
        </div>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Send size={24} /> {isEditing ? 'Editar Ordem' : 'Nova Ordem'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Seção 1: Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Pedido de Compra *</label>
                  <select
                    required
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.pedido_id}
                    onChange={e => setFormData({ ...formData, pedido_id: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {pedidos.filter(pc => pc.status !== 'Rascunho').map(pc => (
                      <option key={pc.id} value={pc.id}>
                          {pc.numero_pc} - {isCompraSite(pc)
                            ? 'Compra por site'
                            : pc.fornecedor_nome}
                        </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                    {formularioCompraSite ? 'Tipo da compra' : 'Fornecedor *'}
                  </label>
                  <select
                    required={!formularioCompraSite}
                    disabled={formularioCompraSite}
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.fornecedor_id}
                    onChange={e => setFormData({ ...formData, fornecedor_id: e.target.value })}
                  >
                    <option value="">
                      {formularioCompraSite
                        ? 'Compra por site — sem fornecedor'
                        : 'Selecione...'}
                    </option>
                    {fornecedores.map(f => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Seção 2: Contato do Fornecedor */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Email Fornecedor</label>
                  <input
                    type="email"
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.email_fornecedor}
                    onChange={e => setFormData({ ...formData, email_fornecedor: e.target.value })}
                    placeholder="email@fornecedor.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Telefone Fornecedor</label>
                  <input
                    type="tel"
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.telefone_fornecedor}
                    onChange={e => setFormData({ ...formData, telefone_fornecedor: e.target.value })}
                    placeholder="(11) 9999-9999"
                  />
                </div>
              </div>

              {/* Seção 3: Data Entrega */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Data Entrega Prevista</label>
                <input
                  type="date"
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.data_entrega_prevista}
                  onChange={e => setFormData({ ...formData, data_entrega_prevista: e.target.value })}
                />
              </div>

              {/* Seção 4: Observações */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Observações</label>
                <textarea
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  value={formData.observacoes}
                  onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Informações importantes para o fornecedor..."
                />
              </div>

              {/* Botões */}
              <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-12 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  {isEditing ? 'Salvar Alterações' : 'Emitir Ordem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GERAÇÃO */}
      {isGeracaoOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-purple-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText size={24} /> Gerar Ordem de Compra
              </h2>
              <button onClick={() => setIsGeracaoOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={28} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Selecione um Pedido de Compra</label>
                <select
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  value={pcSelecionada?.id || ''}
                  onChange={(e) => {
                    const pc = pedidos.find(p => p.id === parseInt(e.target.value))
                    setPCSelecionada(pc || null)
                    if (pc) {
                      setFormData({
                        ...formData,
                        pedido_id: pc.id.toString(),
                        fornecedor_id: pc.fornecedor_id?.toString() || '',
                        data_entrega_prevista: pc.data_entrega_prevista ? pc.data_entrega_prevista.split('T')[0] : ''
                      })
                    }
                  }}
                >
                  <option value="">Selecione...</option>
                  {pedidosDisponiveis.map(pc => (
                    <option key={pc.id} value={pc.id}>
                      {pc.numero_pc} - {isCompraSite(pc)
                        ? 'Compra por site'
                        : pc.fornecedor_nome} (R$ {fmt(pc.valor_final)})
                    </option>
                  ))}
                </select>
              </div>

              {pcSelecionada && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-40 overflow-y-auto">
                  <p className="font-bold text-gray-800">{pcSelecionada.numero_pc}</p>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>
                      <strong>Tipo:</strong>{' '}
                      {isCompraSite(pcSelecionada)
                        ? 'Compra por site'
                        : pcSelecionada.fornecedor_nome}
                    </p>
                    {isCompraSite(pcSelecionada) && getLinkCompra(pcSelecionada) && (
                      <a
                        href={getLinkCompra(pcSelecionada)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-blue-700 hover:underline"
                      >
                        <ExternalLink size={15} />
                        Abrir site da compra
                      </a>
                    )}
                    <p><strong>Itens:</strong> {pcSelecionada.itens?.length || 0}</p>
                    <p><strong>Valor:</strong> R$ {pcSelecionada.valor_final.toFixed(2)}</p>
                    <p><strong>Data Entrega:</strong> {pcSelecionada.data_entrega_prevista ? new Date(pcSelecionada.data_entrega_prevista).toLocaleDateString('pt-BR') : '-'}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email do Fornecedor</label>
                <input
                  type="email"
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.email_fornecedor}
                  onChange={(e) => setFormData({ ...formData, email_fornecedor: e.target.value })}
                  placeholder="email@fornecedor.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Telefone do Fornecedor</label>
                <input
                  type="tel"
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.telefone_fornecedor}
                  onChange={(e) => setFormData({ ...formData, telefone_fornecedor: e.target.value })}
                  placeholder="(11) 9999-9999"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsGeracaoOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGerarOC}
                  disabled={
                    !pcSelecionada
                    || (!isCompraSite(pcSelecionada) && !formData.fornecedor_id)
                  }
                  className="flex-1 px-4 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
                >
                  Gerar Ordem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENVIO POR EMAIL */}
      {isEnvioOpen && ocParaEnviar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-green-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Send size={24} /> Enviar Ordem por Email
              </h2>
              <button onClick={() => setIsEnvioOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={28} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm font-bold text-blue-700">
                  🔹 Ordem: <span className="font-bold">{ocParaEnviar.numero_oc}</span>
                </p>
                <p className="text-sm font-bold text-blue-700">
                  🔹 Fornecedor: <span className="font-bold">{ocParaEnviar.fornecedor_nome}</span>
                </p>
                <p className="text-sm font-bold text-blue-700">
                  🔹 Valor: <span className="font-bold">R$ {ocParaEnviar.valor_total.toFixed(2)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Destino *</label>
                <input
                  type="email"
                  required
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  value={emailEnvio}
                  onChange={(e) => setEmailEnvio(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Mensagem</label>
                <textarea
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-green-500"
                  rows="4"
                  value={mensagemEnvio}
                  onChange={(e) => setMensagemEnvio(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Check size={20} className="text-green-600" />
                <p className="text-sm text-green-700">
                  <strong>PDF será gerado e anexado automaticamente</strong>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsEnvioOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviarPorEmail}
                  disabled={enviando || !emailEnvio}
                  className="flex-1 px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send size={18} /> {enviando ? 'Enviando...' : 'Enviar Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {isDetalhesOpen && selectedOC && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">Detalhes da Ordem</h2>
              <button onClick={() => setIsDetalhesOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Nº OC</p>
                  <p className="text-lg font-bold text-gray-800">{selectedOC.numero_oc}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_BADGE_COLORS[selectedOC.status]}`}>
                    {selectedOC.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-1">Fornecedor</p>
                  <p className="font-bold text-gray-800">
                    {isCompraSite(selectedOC)
                      ? 'Compra por site'
                      : selectedOC.fornecedor_nome || '—'}
                  </p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Valor Total</p>
                  <p className="text-lg font-bold text-indigo-700">R$ {selectedOC.valor_total.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">Informações</p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>PC: <span className="font-bold">{selectedOC.numero_pc}</span></p>
                    <p>Data Emissão: <span className="font-bold">{new Date(selectedOC.data_emissao).toLocaleDateString('pt-BR')}</span></p>
                    <p>Data Entrega: <span className="font-bold">{selectedOC.data_entrega_prevista ? new Date(selectedOC.data_entrega_prevista).toLocaleDateString('pt-BR') : '-'}</span></p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">Contato Fornecedor</p>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Email: <span className="font-bold">{selectedOC.email_fornecedor || '-'}</span></p>
                    <p>Telefone: <span className="font-bold">{selectedOC.telefone_fornecedor || '-'}</span></p>
                  </div>
                </div>
              </div>

              {selectedOC.itens.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-2">Itens</p>
                  <div className="space-y-2">
                    {selectedOC.itens.map((item, idx) => (
                      <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-bold text-gray-800">{item.nome_item}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantidade} {item.unidade_medida} × R$ {parseFloat(item.valor_unitario).toFixed(2)} = <span className="font-bold">R$ {item.valor_total.toFixed(2)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedOC.observacoes && (
                <div className="border-t pt-4 bg-yellow-50 p-4 rounded-lg">
                  <p className="text-xs font-bold text-yellow-700 uppercase mb-1">Observações</p>
                  <p className="text-sm text-yellow-800">{selectedOC.observacoes}</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsDetalhesOpen(false)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}