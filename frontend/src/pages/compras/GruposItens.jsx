import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Search, Package } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function GruposItens() {
  const { user, can } = useAuth()
  const [grupos, setGrupos] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentId, setCurrentId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    codigo: ''
  })

  const API_BASE = ""

  useEffect(() => {
    fetchGrupos()
  }, [])

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

  const handleOpenModal = (grupo = null) => {
    if (grupo) {
      setIsEditing(true)
      setCurrentId(grupo.id)
      setFormData({
        nome: grupo.nome,
        descricao: grupo.descricao || '',
        codigo: grupo.codigo || ''
      })
    } else {
      setIsEditing(false)
      setCurrentId(null)
      setFormData({ nome: '', descricao: '', codigo: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório')
      return
    }

    setLoading(true)
    const headers = {
      'Content-Type': 'application/json',
      ...(user?.api_token && { 'X-API-Token': user.api_token })
    }

    try {
      const url = isEditing 
        ? `${API_BASE}/api/compras/grupos/${currentId}`
        : `${API_BASE}/api/compras/grupos`
      
      const method = isEditing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchGrupos()
      } else {
        setError('Erro ao salvar grupo')
      }
    } catch (error) {
      console.error('Erro:', error)
      setError('Erro ao salvar grupo')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar?')) return

    const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}
    try {
      const res = await fetch(`${API_BASE}/api/compras/grupos/${id}`, {
        method: 'DELETE',
        headers
      })

      if (res.ok) {
        fetchGrupos()
      }
    } catch (error) {
      console.error('Erro:', error)
    }
  }

  const filteredGrupos = grupos.filter(g =>
    g.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.codigo && g.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
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
            <Package className="text-indigo-600" size={28} />
            <h1 className="text-2xl font-bold text-gray-800">Grupos de Itens</h1>
          </div>
          {can('compras','criar') && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
          >
            <Plus size={20} /> Novo Grupo
          </button>
          )}
        </div>

        {/* Busca */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
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
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Código</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Nome</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Descrição</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredGrupos.length > 0 ? (
                filteredGrupos.map((grupo) => (
                  <tr key={grupo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{grupo.codigo || '-'}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{grupo.nome}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{grupo.descricao || '-'}</td>
                    <td className="px-6 py-4 flex gap-2">
                      {can('compras','editar') && (
                      <button
                        onClick={() => handleOpenModal(grupo)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      )}
                      {can('compras','excluir') && (
                      <button
                        onClick={() => handleDelete(grupo.id)}
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
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    Nenhum grupo encontrado
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
              <h2 className="text-xl font-bold">
                {isEditing ? 'Editar Grupo' : 'Novo Grupo'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ex: GRP001"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Materiais de Escritório"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                <textarea
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  rows="3"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do grupo..."
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