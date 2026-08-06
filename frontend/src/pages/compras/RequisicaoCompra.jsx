import React, { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, Search, Filter, FileText, Eye, ChevronDown, DollarSign, Users, Download, AlertCircle, Check, Mail } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Link } from 'react-router-dom'

export default function RequisicaoCompra() {
  const { user, can } = useAuth()
  const [requisicoes, setRequisicoes] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedRQ, setSelectedRQ] = useState(null)
  const [emailParaEnviar, setEmailParaEnviar] = useState(null)
  const [destinatariosEmail, setDestinatariosEmail] = useState('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [empresaFilter, setEmpresaFilter] = useState('todas')
  const [loading, setLoading] = useState(false)
  const [empresas, setEmpresas] = useState([])
  const [itens, setItens] = useState([])
  const [currentId, setCurrentId] = useState(null)

  const [formData, setFormData] = useState({
    empresa_id: '',
    data_necessaria: '',
    observacao: '',
    itens: []
  })

  const [novoItem, setNovoItem] = useState({
    item_id: '',
    quantidade: '',
    observacao: ''
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const [formError, setFormError] = useState('')

  const API_BASE = ""

  useEffect(() => {
    fetchRequisicoes()
    fetchEmpresas()
    fetchItens()
  }, [])

  const fetchRequisicoes = async () => {
    try {
      const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
      const res = await fetch(`${API_BASE}/api/compras/requisicoes`, { headers })
      if (res.ok) {
        setRequisicoes(await res.json())
      }
    } catch (error) {
      console.error('Erro ao carregar requisições:', error)
      setError('Erro ao carregar requisições')
    }
  }

  const fetchEmpresas = async () => {
    try {
      const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
      const res = await fetch(`${API_BASE}/api/empresas`, { headers })
      if (res.ok) {
        setEmpresas(await res.json())
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
    }
  }

  const fetchItens = async () => {
    try {
      const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
      const res = await fetch(`${API_BASE}/api/compras/itens`, { headers })
      if (res.ok) {
        setItens(await res.json())
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
    }
  }

  const handleOpenModal = (rq = null) => {
    if (rq) {
      setIsEditing(true)
      setCurrentId(rq.id)
      setFormData({
        empresa_id: rq.empresa_id,
        data_necessaria: rq.data_necessaria,
        observacao: rq.observacao || '',
        itens: rq.itens || []
      })
    } else {
      setIsEditing(false)
      setCurrentId(null)
      setFormData({
        empresa_id: '',
        data_necessaria: '',
        observacao: '',
        itens: []
      })
    }
    setIsModalOpen(true)
  }

  const handleAddItem = () => {
    if (!novoItem.item_id || !novoItem.quantidade) {
      setFormError('Selecione um item e informe a quantidade')
      return
    }
    setFormError('')

    const itemSelecionado = itens.find(i => i.id === parseInt(novoItem.item_id))
    if (!itemSelecionado) {
      setFormError('Item não encontrado')
      return
    }

    const novoItemCompleto = {
      item_id: parseInt(novoItem.item_id),
      item_nome: itemSelecionado.nome,
      item_preco: itemSelecionado.preco_unitario || 0,
      quantidade: parseFloat(novoItem.quantidade),
      observacao: novoItem.observacao,
      subtotal: parseFloat(novoItem.quantidade) * (itemSelecionado.preco_unitario || 0)
    }

    setFormData({
      ...formData,
      itens: [...formData.itens, novoItemCompleto]
    })

    setNovoItem({ item_id: '', quantidade: '', observacao: '' })
  }

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      itens: formData.itens.filter((_, i) => i !== index)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.empresa_id) {
      setFormError('Selecione uma empresa')
      return
    }

    if (!formData.data_necessaria) {
      setFormError('Data necessária é obrigatória')
      return
    }

    if (formData.itens.length === 0) {
      setFormError('Adicione pelo menos um item')
      return
    }

    setLoading(true)
    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    const payload = {
      empresa_id: parseInt(formData.empresa_id),
      data_necessaria: formData.data_necessaria,
      observacao: formData.observacao,
      itens: formData.itens.map(item => ({
        item_id: item.item_id,
        quantidade: item.quantidade,
        observacao: item.observacao
      }))
    }

    try {
      const url = isEditing
        ? `${API_BASE}/api/compras/requisicoes/${currentId}`
        : `${API_BASE}/api/compras/requisicoes`

      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchRequisicoes()
        setSuccess('Requisição salva com sucesso!')
      } else {
        setError('Erro ao salvar requisição')
      }
    } catch (error) {
      console.error('Erro:', error)
      setError('Erro ao salvar requisição')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (rq) => {
    setSelectedRQ(rq)
    setIsDetailModalOpen(true)
  }

  const handleAprovar = async (id) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    try {
      const res = await fetch(`${API_BASE}/api/compras/requisicoes/${id}/aprovar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      })

      if (res.ok) {
        setIsDetailModalOpen(false)
        fetchRequisicoes()
        setSuccess('Requisição aprovada! Agora ela está disponível em Pedido de Compra para envio aos fornecedores.')
      } else {
        alert('Erro ao aprovar requisição')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao aprovar')
    }
  }

  const handleRejeitar = async (id) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    try {
      const res = await fetch(`${API_BASE}/api/compras/requisicoes/${id}/rejeitar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      })

      if (res.ok) {
        setIsDetailModalOpen(false)
        fetchRequisicoes()
        setSuccess('Requisição rejeitada com sucesso!')
      } else {
        alert('Erro ao rejeitar requisição')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao rejeitar')
    }
  }

  const handleAbrirEmailModal = (rq) => {
    setEmailParaEnviar(rq)
    setDestinatariosEmail(rq.solicitante?.email || '')
    setIsEmailModalOpen(true)
  }

  const handleEnviarEmailRequisicao = async () => {
    if (!destinatariosEmail) {
      setError('Email é obrigatório')
      return
    }

    setEnviandoEmail(true)
    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    try {
      const res = await fetch(`${API_BASE}/api/compras/requisicoes/${emailParaEnviar.id}/enviar-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ destinatarios: [destinatariosEmail] })
      })

      if (res.ok) {
        setIsEmailModalOpen(false)
        setSuccess('Email enviado com sucesso!')
        fetchRequisicoes()
      } else {
        alert('Erro ao enviar email')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao enviar email: ' + error.message)
    } finally {
      setEnviandoEmail(false)
    }
  }

  const handleDelete = async (id) => {
    const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
    try {
      const res = await fetch(`${API_BASE}/api/compras/requisicoes/${id}`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        fetchRequisicoes()
        setSuccess('Requisição deletada com sucesso!')
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const handleGerarPDF = async (id) => {
    try {
      const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
      const res = await fetch(`${API_BASE}/api/compras/requisicoes/${id}/gerar-pdf`, { headers })

      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const rq = requisicoes.find(r => r.id === id)
        a.download = `RQ-${rq?.numero_rq || id}.pdf`
        document.body.appendChild(a)
        a.click()
        setTimeout(() => document.body.removeChild(a), 100)
        window.URL.revokeObjectURL(url)
      } else {
        alert('Erro ao gerar PDF')
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro ao gerar PDF')
    }
  }

  // Aceita 'Aprovada' (enum) e 'APROVADA' (legado)
  const statusAprovada = (s) => (s || '').toString().trim().toUpperCase() === 'APROVADA'

  // Filtros
  const filteredRequisicoes = requisicoes.filter(rq => {
    const termo = searchTerm.trim().toLowerCase()
    const matchSearch = [
      rq.numero_rq,
      rq.empresa_nome,
      rq.projeto_codigo,
      rq.projeto_nome
    ].some(value => String(value || '').toLowerCase().includes(termo))
    const matchStatus = statusFilter === 'todos' ||
                        (rq.status || '').toString().toUpperCase() === statusFilter.toUpperCase()
    const matchEmpresa = empresaFilter === 'todas' || String(rq.empresa_id) === String(empresaFilter)

    return matchSearch && matchStatus && matchEmpresa
  })

  const getStatusColor = (status) => {
    const s = (status || '').toString().toUpperCase()
    const colors = {
      'RASCUNHO': 'bg-gray-100 text-gray-700',
      'PENDENTE': 'bg-yellow-100 text-yellow-700',
      'PENDENTE APROVAÇÃO': 'bg-yellow-100 text-yellow-700',
      'APROVADA': 'bg-green-100 text-green-700',
      'REJEITADA': 'bg-red-100 text-red-700',
      'CONVERTIDA': 'bg-blue-100 text-blue-700'
    }
    return colors[s] || 'bg-gray-100 text-gray-700'
  }

  const calcularTotal = (itens) => {
    return itens.reduce((sum, item) => sum + (item.subtotal || item.quantidade * item.item_preco), 0)
  }

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
            <FileText className="text-indigo-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">Requisição de Compra (RQ)</h1>
          </div>
          {can('compras','criar') && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg font-bold"
          >
            <Plus size={20} /> Nova Requisição
          </button>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Buscar por nº RQ...</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="RQ-2026-001"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="PENDENTE">Pendente</option>
                <option value="APROVADA">Aprovada</option>
                <option value="REJEITADA">Rejeitada</option>
                <option value="CONVERTIDA">Convertida</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Todas Empresas</label>
              <select
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={empresaFilter}
                onChange={(e) => setEmpresaFilter(e.target.value)}
              >
                <option value="todas">Todas</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('todos')
                  setEmpresaFilter('todas')
                }}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-4 py-2 rounded-lg transition-all"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Nº RQ</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Origem</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Empresa</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Solicitante</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Data Solicitação</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Valor Total</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequisicoes.length > 0 ? (
                filteredRequisicoes.map((rq) => (
                  <tr key={rq.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">{rq.numero_rq}</td>
                    <td className="px-6 py-4">
                      {rq.projeto_id ? (
                        <div className="min-w-44">
                          <span className="mb-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                            Projeto
                          </span>
                          <Link
                            to={rq.projeto_link || `/projetos/projecoes?projeto=${rq.projeto_id}`}
                            className="block text-xs font-bold text-blue-700 hover:underline"
                            title="Abrir projeção do projeto"
                          >
                            {rq.projeto_codigo
                              ? `${rq.projeto_codigo} — `
                              : ''}
                            {rq.projeto_nome || `Projeto ${rq.projeto_id}`}
                          </Link>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Compra direta
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{rq.empresa_nome}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{rq.usuario_solicitante_nome || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(rq.status)}`}>
                        {rq.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(rq.data_solicitacao).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">R$ {rq.valor_total?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => handleViewDetails(rq)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleAbrirEmailModal(rq)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                        title="Enviar por Email"
                      >
                        <Mail size={16} />
                      </button>
                      {can('compras','editar') && (
                      <button
                        onClick={() => handleOpenModal(rq)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      )}
                      {can('compras','excluir') && (
                      <button
                        onClick={() => handleDelete(rq.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Deletar"
                      >
                        <Trash2 size={16} />
                      </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    Nenhuma requisição encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-2xl font-bold">
                {isEditing ? 'Editar Requisição' : 'Nova Requisição de Compra'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={28} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Seção 1: Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 border-b-2 border-indigo-300 pb-2">Informações Básicas</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Empresa *</label>
                    <select
                      required
                      className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.empresa_id}
                      onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                    >
                      <option value="">Selecione uma empresa</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Data Necessária *</label>
                    <input
                      type="date"
                      required
                      className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.data_necessaria}
                      onChange={(e) => setFormData({ ...formData, data_necessaria: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Observação</label>
                  <textarea
                    className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                    value={formData.observacao}
                    onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                    placeholder="Adicione observações..."
                  />
                </div>
              </div>

              {/* Seção 2: Adicionar Itens */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-800 border-b-2 border-indigo-300 pb-2">Adicionar Itens</h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Item *</label>
                    <select
                      className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      value={novoItem.item_id}
                      onChange={(e) => setNovoItem({ ...novoItem, item_id: e.target.value })}
                    >
                      <option value="">Selecione um item</option>
                      {itens.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.nome} - R$ {item.preco_unitario?.toFixed(2) || '0.00'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Quantidade *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      value={novoItem.quantidade}
                      onChange={(e) => setNovoItem({ ...novoItem, quantidade: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Observação</label>
                    <input
                      type="text"
                      className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      value={novoItem.observacao}
                      onChange={(e) => setNovoItem({ ...novoItem, observacao: e.target.value })}
                      placeholder="Obs do item"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3 rounded-lg transition-all"
                    >
                      <Plus size={20} className="inline mr-1" /> Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção 3: Itens Adicionados */}
              {formData.itens.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 border-b-2 border-indigo-300 pb-2">Itens Adicionados</h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-bold">Item</th>
                          <th className="px-4 py-2 text-left font-bold">Preço Unit.</th>
                          <th className="px-4 py-2 text-left font-bold">Qtd</th>
                          <th className="px-4 py-2 text-left font-bold">Subtotal</th>
                          <th className="px-4 py-2 text-left font-bold">Obs</th>
                          <th className="px-4 py-2 text-center font-bold">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {formData.itens.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2">{item.item_nome}</td>
                            <td className="px-4 py-2">R$ {item.item_preco?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-2">{item.quantidade}</td>
                            <td className="px-4 py-2 font-bold">R$ {item.subtotal?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-2 text-xs text-gray-600">{item.observacao || '-'}</td>
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-600 hover:bg-red-50 p-1 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <p className="text-lg font-bold text-indigo-700">
                      Valor Total: R$ {calcularTotal(formData.itens).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm font-bold">{formError}</p>
                </div>
              )}
              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Requisição')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES */}
      {isDetailModalOpen && selectedRQ && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <div>
                <h2 className="text-2xl font-bold">Detalhes da Requisição</h2>
                <p className="text-indigo-100 text-sm">Nº {selectedRQ.numero_rq}</p>
                {selectedRQ.projeto_id && (
                  <Link
                    to={selectedRQ.projeto_link || `/projetos/projecoes?projeto=${selectedRQ.projeto_id}`}
                    className="mt-2 inline-flex rounded-lg bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/25"
                  >
                    Projeto: {selectedRQ.projeto_codigo
                      ? `${selectedRQ.projeto_codigo} — `
                      : ''}
                    {selectedRQ.projeto_nome}
                  </Link>
                )}
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={28} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Informações Gerais */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 font-bold uppercase">Nº RQ</p>
                  <p className="text-2xl font-bold text-indigo-600">{selectedRQ.numero_rq}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 font-bold uppercase">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedRQ.status)}`}>
                    {selectedRQ.status}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 font-bold uppercase">Data Solicitação</p>
                  <p className="text-lg font-bold text-gray-900">{new Date(selectedRQ.data_solicitacao).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              {/* Informações Empresa */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Informações</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 font-bold uppercase mb-1">Empresa</p>
                    <p className="text-lg font-bold text-gray-900">{selectedRQ.empresa_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-bold uppercase mb-1">Solicitante</p>
                    <p className="text-lg font-bold text-gray-900">{selectedRQ.usuario_solicitante_nome || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-bold uppercase mb-1">Data Necessária</p>
                    <p className="text-lg font-bold text-gray-900">{new Date(selectedRQ.data_necessaria).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-bold uppercase mb-1">Valor Total</p>
                    <p className="text-2xl font-bold text-green-600">R$ {selectedRQ.valor_total?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
              </div>

              {/* Itens */}
              {selectedRQ.itens && selectedRQ.itens.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Itens da Requisição</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-bold">Item</th>
                          <th className="px-4 py-2 text-left font-bold">Preço Unit.</th>
                          <th className="px-4 py-2 text-left font-bold">Quantidade</th>
                          <th className="px-4 py-2 text-left font-bold">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {selectedRQ.itens.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-medium">
                              <span className="block">{item.nome || item.item_nome || item.nome_item}</span>
                              {item.link_compra && (
                                <a
                                  href={item.link_compra}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex rounded bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700 hover:bg-blue-100"
                                >
                                  Abrir site
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-2">R$ {(item.valor_unitario ?? item.preco_unitario)?.toFixed(2) || '0.00'}</td>
                            <td className="px-4 py-2">{item.quantidade}</td>
                            <td className="px-4 py-2 font-bold">R$ {(item.quantidade * ((item.valor_unitario ?? item.preco_unitario) || 0)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Observação */}
              {selectedRQ.observacao && (
                <div className="border-t pt-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-xs text-amber-600 font-bold uppercase mb-1">Observação</p>
                  <p className="text-gray-900">{selectedRQ.observacao}</p>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="border-t pt-6 space-y-3">
                {((selectedRQ.status || '').toString().toUpperCase() === 'RASCUNHO' ||
                  (selectedRQ.status || '').toString().toUpperCase().startsWith('PENDENTE')) && (
                  <>
                    <button
                      onClick={() => handleAprovar(selectedRQ.id)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      <Check size={20} /> Aprovar Requisição
                    </button>
                    <button
                      onClick={() => handleRejeitar(selectedRQ.id)}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 rounded-lg transition-all"
                    >
                      Rejeitar
                    </button>
                  </>
                )}

                {statusAprovada(selectedRQ.status) && (
                  <div className="w-full bg-blue-50 border border-blue-200 text-blue-700 font-medium px-4 py-3 rounded-lg text-center text-sm">
                    ✅ Requisição aprovada. Vá em <strong>Pedido de Compra</strong> para selecionar os fornecedores e enviar.
                  </div>
                )}

                <button
                  onClick={() => handleGerarPDF(selectedRQ.id)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Download size={20} /> Gerar PDF
                </button>

                <button
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    handleAbrirEmailModal(selectedRQ)
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Mail size={20} /> Enviar por Email
                </button>

                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-4 py-3 rounded-lg transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EMAIL */}
      {isEmailModalOpen && emailParaEnviar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-amber-600 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Mail size={24} /> Enviar Requisição por Email
              </h2>
              <button onClick={() => setIsEmailModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={28} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-sm font-bold text-amber-700">
                  📋 RQ: <span className="font-bold">{emailParaEnviar.numero_rq}</span>
                </p>
                <p className="text-sm font-bold text-amber-700">
                  💼 Empresa: <span className="font-bold">{emailParaEnviar.empresa_nome}</span>
                </p>
                <p className="text-sm font-bold text-amber-700">
                  💰 Valor: <span className="font-bold">R$ {emailParaEnviar.valor_total?.toFixed(2) || '0.00'}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email Destino *</label>
                <input
                  type="email"
                  required
                  className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
                  value={destinatariosEmail}
                  onChange={(e) => setDestinatariosEmail(e.target.value)}
                  placeholder="email@exemplo.com"
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
                  onClick={() => setIsEmailModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all"
                  disabled={enviandoEmail}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviarEmailRequisicao}
                  disabled={enviandoEmail || !destinatariosEmail}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Mail size={18} /> {enviandoEmail ? 'Enviando...' : 'Enviar Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}