import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Search, ShoppingCart } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function ItensEstrutura() {
  const { user, can } = useAuth()
  const [itens, setItens] = useState([])
  const [grupos, setGrupos] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [grupoFilterId, setGrupoFilterId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    grupo_id: '',
    unidade_medida: 'UN',
    preco_unitario: '',
    especificacoes: ''
  })

  const API_BASE = ""

  useEffect(() => {
    fetchGrupos()
    fetchItens()
  }, [grupoFilterId])

  const fetchGrupos = async () => {
    try {
      const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
      const res = await fetch(`${API_BASE}/api/compras/grupos`, { headers })
      if (res.ok) {
        setGrupos(await res.json())
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error)
    }
  }

  const fetchItens = async () => {
    try {
      const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
      let url = `${API_BASE}/api/compras/itens`
      if (grupoFilterId) {
        url += `?grupo_id=${grupoFilterId}`
      }
      const res = await fetch(url, { headers })
      if (res.ok) {
        setItens(await res.json())
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
    }
  }

  const handleOpenModal = (item = null) => {
    if (item) {
      setIsEditing(true)
      setCurrentId(item.id)
      setFormData({
        codigo: item.codigo,
        nome: item.nome,
        descricao: item.descricao || '',
        grupo_id: item.grupo_id?.toString() || '',
        unidade_medida: item.unidade_medida || 'UN',
        preco_unitario: item.preco_unitario || '',
        especificacoes: item.especificacoes || ''
      })
    } else {
      setIsEditing(false)
      setCurrentId(null)
      setFormData({
        codigo: '',
        nome: '',
        descricao: '',
        grupo_id: '',
        unidade_medida: 'UN',
        preco_unitario: '',
        especificacoes: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.codigo.trim() || !formData.nome.trim() || !formData.grupo_id) {
      setError('Código, Nome e Grupo são obrigatórios')
      return
    }

    setLoading(true)
    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    try {
      const url = isEditing 
        ? `${API_BASE}/api/compras/itens/${currentId}`
        : `${API_BASE}/api/compras/itens`
      
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchItens()
      } else {
        setError('Erro ao salvar item')
      }
    } catch (error) {
      console.error('Erro:', error)
      setError('Erro ao salvar item')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar?')) return

    const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
    try {
      const res = await fetch(`${API_BASE}/api/compras/itens/${id}`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        fetchItens()
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const filteredItens = itens.filter(i =>
    i.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700 font-bold">{error}</span>
            <button onClick={() => setError('')}><X size={18} /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-green-700 font-bold">{success}</span>
            <button onClick={() => setSuccess('')}><X size={18} /></button>
          </div>
        )}
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <ShoppingCart className="text-indigo-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-800">Itens do Catálogo</h1>
          </div>
          {can('compras','criar') && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
          >
            <Plus size={20} /> Novo Item
          </button>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={grupoFilterId}
              onChange={(e) => setGrupoFilterId(e.target.value)}
            >
              <option value="">Todos os Grupos</option>
              {grupos.map(g => (
                <option key={g.id} value={g.id}>{g.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Código</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Grupo</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Unidade</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Preço Unit.</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItens.length > 0 ? (
                filteredItens.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.codigo}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.nome}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.grupo_nome}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.unidade_medida}</td>
                    <td className="px-6 py-4 text-sm font-bold text-green-600">
                      {item.preco_unitario ? `R$ ${parseFloat(item.preco_unitario).toFixed(2)}` : '-'}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      {can('compras','editar') && (
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      )}
                      {can('compras','excluir') && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Nenhum item encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Editar Item' : 'Novo Item'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Código *</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ex: IT001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Grupo *</label>
                  <select
                    required
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.grupo_id}
                    onChange={(e) => setFormData({ ...formData, grupo_id: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Teclado Mecânico"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                <textarea
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="2"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do item..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Unidade Medida</label>
                  <select
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.unidade_medida}
                    onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value })}
                  >
                    <option value="UN">Unidade</option>
                    <option value="KG">Quilograma</option>
                    <option value="L">Litro</option>
                    <option value="M">Metro</option>
                    <option value="M2">Metro Quadrado</option>
                    <option value="M3">Metro Cúbico</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Preço Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={formData.preco_unitario}
                    onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Especificações</label>
                <textarea
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="2"
                  value={formData.especificacoes}
                  onChange={(e) => setFormData({ ...formData, especificacoes: e.target.value })}
                  placeholder="Especificações técnicas..."
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}