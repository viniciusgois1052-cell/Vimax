import React, { useEffect, useState } from 'react'
import { Trash2, Edit2, Check, X, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../apiFetch'

const PERMISSION_MODULE = 'tipo_infraestrutura'

const EMPTY_FORM = {
  nome: '',
  descricao: '',
  ativo: true,
}

async function getResponseError(response, fallback) {
  try {
    const data = await response.json()
    return data.error || data.erro || data.message || fallback
  } catch {
    return fallback
  }
}

export default function TipoInfraestrutura() {
  const { can } = useAuth()

  const [tipos, setTipos] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editando, setEditando] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const podeVer = can(PERMISSION_MODULE, 'ver')
  const podeCriar = can(PERMISSION_MODULE, 'criar')
  const podeEditar = can(PERMISSION_MODULE, 'editar')
  const podeExcluir = can(PERMISSION_MODULE, 'excluir')

  const podeExibirFormulario = editando ? podeEditar : podeCriar
  const podeExibirAcoes = podeEditar || podeExcluir

  useEffect(() => {
    if (podeVer) {
      fetchTipos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podeVer])

  const fetchTipos = async () => {
    if (!podeVer) return

    setLoading(true)
    setErro('')

    try {
      const response = await apiFetch('/api/tipos-infraestrutura')

      if (!response.ok) {
        const message = await getResponseError(
          response,
          'Erro ao carregar tipos de infraestrutura'
        )

        setTipos([])
        setErro(message)
        return
      }

      const data = await response.json()
      setTipos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao buscar tipos de infraestrutura:', error)
      setTipos([])
      setErro('Erro de conexão ao carregar tipos de infraestrutura')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const acao = editando ? 'editar' : 'criar'

    if (!can(PERMISSION_MODULE, acao)) {
      setErro('Você não possui permissão para realizar esta operação.')
      setSucesso('')
      return
    }

    const nome = formData.nome.trim()

    if (!nome) {
      setErro('Nome é obrigatório')
      setSucesso('')
      return
    }

    setSaving(true)
    setErro('')
    setSucesso('')

    try {
      const url = editando
        ? `/api/tipos-infraestrutura/${editando.id}`
        : '/api/tipos-infraestrutura'

      const method = editando ? 'PUT' : 'POST'

      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          descricao: formData.descricao?.trim() || '',
          ativo: Boolean(formData.ativo),
        }),
      })

      if (!response.ok) {
        const message = await getResponseError(
          response,
          'Erro ao salvar tipo de infraestrutura'
        )

        setErro(message)
        return
      }

      setSucesso(
        editando
          ? 'Tipo de infraestrutura atualizado com sucesso!'
          : 'Tipo de infraestrutura criado com sucesso!'
      )

      setFormData(EMPTY_FORM)
      setEditando(null)

      await fetchTipos()
    } catch (error) {
      console.error('Erro ao salvar tipo de infraestrutura:', error)
      setErro('Erro de conexão ao salvar tipo de infraestrutura')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (tipo) => {
    if (!podeEditar) {
      setErro('Você não possui permissão para editar.')
      setSucesso('')
      return
    }

    setErro('')
    setSucesso('')
    setEditando(tipo)

    setFormData({
      nome: tipo.nome || '',
      descricao: tipo.descricao || '',
      ativo: tipo.ativo !== false,
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const handleDelete = async (id) => {
    if (!podeExcluir) {
      setErro('Você não possui permissão para excluir.')
      setSucesso('')
      return
    }

    const confirmado = window.confirm(
      'Tem certeza que deseja excluir este tipo de infraestrutura?'
    )

    if (!confirmado) return

    setDeletingId(id)
    setErro('')
    setSucesso('')

    try {
      const response = await apiFetch(
        `/api/tipos-infraestrutura/${id}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const message = await getResponseError(
          response,
          'Erro ao excluir tipo de infraestrutura'
        )

        setErro(message)
        return
      }

      if (editando?.id === id) {
        setEditando(null)
        setFormData(EMPTY_FORM)
      }

      setSucesso('Tipo de infraestrutura excluído com sucesso!')
      await fetchTipos()
    } catch (error) {
      console.error('Erro ao excluir tipo de infraestrutura:', error)
      setErro('Erro de conexão ao excluir tipo de infraestrutura')
    } finally {
      setDeletingId(null)
    }
  }

  const handleCancel = () => {
    setEditando(null)
    setFormData(EMPTY_FORM)
    setErro('')
    setSucesso('')
  }

  if (!podeVer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] gap-3 text-muted-foreground">
        <Lock className="w-12 h-12 opacity-30" />

        <div className="text-center">
          <h2 className="text-lg font-bold text-foreground">
            Acesso restrito
          </h2>

          <p className="text-sm mt-1">
            Você não possui permissão para visualizar tipos de infraestrutura.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Tipos de Infraestrutura
        </h1>

        <p className="text-muted-foreground">
          Gerencie os tipos de infraestrutura do sistema
        </p>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          {sucesso}
        </div>
      )}

      {podeExibirFormulario && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editando
                ? 'Editar Tipo de Infraestrutura'
                : 'Novo Tipo de Infraestrutura'}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome *
                </label>

                <input
                  type="text"
                  value={formData.nome}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      nome: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Elétrica"
                  disabled={saving}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descrição
                </label>

                <textarea
                  value={formData.descricao}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      descricao: event.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Descrição do tipo de infraestrutura..."
                  rows="3"
                  disabled={saving}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tipo-infraestrutura-ativo"
                  checked={formData.ativo}
                  onChange={(event) =>
                    setFormData((previous) => ({
                      ...previous,
                      ativo: event.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-border"
                  disabled={saving}
                />

                <label
                  htmlFor="tipo-infraestrutura-ativo"
                  className="text-sm font-medium text-foreground"
                >
                  Ativo
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />

                  {saving
                    ? 'Salvando...'
                    : editando
                      ? 'Atualizar'
                      : 'Criar'}
                </button>

                {editando && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tipos Cadastrados</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tipos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum tipo de infraestrutura cadastrado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Nome</th>
                    <th className="pb-3 font-medium">Descrição</th>
                    <th className="pb-3 font-medium">Status</th>

                    {podeExibirAcoes && (
                      <th className="pb-3 font-medium text-right">
                        Ações
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {tipos.map((tipo) => (
                    <tr
                      key={tipo.id}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="py-3 font-medium">
                        {tipo.nome}
                      </td>

                      <td className="py-3 text-muted-foreground">
                        {tipo.descricao || '-'}
                      </td>

                      <td className="py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tipo.ativo
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tipo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>

                      {podeExibirAcoes && (
                        <td className="py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            {podeEditar && (
                              <button
                                type="button"
                                onClick={() => handleEdit(tipo)}
                                className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {podeExcluir && (
                              <button
                                type="button"
                                onClick={() => handleDelete(tipo.id)}
                                disabled={deletingId === tipo.id}
                                className="p-2 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}