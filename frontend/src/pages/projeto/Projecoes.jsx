import React, { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, FolderKanban, Loader2, Plus, RefreshCw,
  Save, Send, ShoppingCart, Trash2, X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const API = '/api/projetos'
const EMPTY_SUMMARY = {
  quantidade_itens: 0,
  total_estimado: 0,
  total_enviado_compras: 0,
  total_pendente: 0,
  por_setor: {},
}
const EMPTY_ITEM = {
  id: null,
  setor: 'Manutenção',
  item_id: null,
  nome_item: '',
  descricao: '',
  observacao: '',
  quantidade: 1,
  unidade_medida: 'UN',
  data_necessaria: '',
  valor_unitario_estimado: 0,
  responsavel_id: '',
  status: 'Pendente',
}

function token() {
  try {
    return JSON.parse(localStorage.getItem('user'))?.api_token || null
  } catch {
    return null
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { 'X-API-Token': token() } : {}),
      ...(options.headers || {}),
    },
  })

  if (response.status === 204) return null

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.error
      || data?.message
      || 'Erro na comunicação com o servidor'
    )
  }

  return data
}

function arrayResult(value, keys = []) {
  if (Array.isArray(value)) return value

  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key]
  }

  return []
}

const dateOnly = value => value ? String(value).slice(0, 10) : ''

const money = value => Number(value || 0).toLocaleString(
  'pt-BR',
  {
    style: 'currency',
    currency: 'BRL',
  }
)

function userLabel(user) {
  return (
    user?.nome_completo
    || user?.nome
    || user?.username
    || user?.email
    || `Usuário ${user?.id}`
  )
}

const ProjectionRow = memo(function ProjectionRow({
  item,
  catalog,
  users,
  canEdit,
  isNew,
  save,
  remove,
  evolve,
  cancel,
}) {
  const [draft, setDraft] = useState(() => ({
    ...EMPTY_ITEM,
    ...item,
    data_necessaria: dateOnly(item?.data_necessaria),
    responsavel_id: item?.responsavel_id || '',
  }))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDraft({
      ...EMPTY_ITEM,
      ...item,
      data_necessaria: dateOnly(item?.data_necessaria),
      responsavel_id: item?.responsavel_id || '',
    })
  }, [item])

  const locked = !!item?.requisicao_id
  const editable = canEdit && !locked
  const purchaseLink = /^https?:\/\//i.test(
    String(draft.observacao || '').trim()
  ) ? String(draft.observacao).trim() : null

  const update = (key, value) => {
    setDraft(current => ({
      ...current,
      [key]: value,
    }))
  }

  const chooseCatalog = value => {
    const normalized = String(value || '').trim().toLowerCase()

    const selected = catalog.find(entry => {
      const complete = `${entry.codigo || ''} — ${entry.nome || ''}`
        .trim()
        .toLowerCase()

      return (
        complete === normalized
        || String(entry.nome || '').trim().toLowerCase() === normalized
        || String(entry.codigo || '').trim().toLowerCase() === normalized
      )
    })

    setDraft(current => ({
      ...current,
      item_id: selected?.id || null,
      nome_item: selected?.nome || value,
      descricao: selected?.descricao || current.descricao,
      unidade_medida: selected?.unidade_medida || current.unidade_medida || 'UN',
      valor_unitario_estimado: selected
        ? Number(selected.preco_unitario || 0)
        : current.valor_unitario_estimado,
    }))
  }

  const submit = async () => {
    if (!String(draft.nome_item || '').trim()) return

    setSaving(true)

    try {
      await save({
        ...draft,
        item_id: draft.item_id || null,
        quantidade: Number(draft.quantidade || 0),
        valor_unitario_estimado: Number(
          draft.valor_unitario_estimado || 0
        ),
        responsavel_id: draft.responsavel_id || null,
        data_necessaria: draft.data_necessaria || null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className={isNew ? 'bg-blue-50/60' : 'bg-white hover:bg-slate-50'}>
      <td className="border-b p-2">
        <select
          disabled={!editable}
          value={draft.setor}
          onChange={event => update('setor', event.target.value)}
          className="w-32 rounded-lg border bg-white px-2 py-2 text-xs disabled:bg-transparent"
        >
          <option>Manutenção</option>
          <option>T.I.</option>
        </select>
      </td>

      <td className="border-b p-2">
        <input
          disabled={!editable}
          list="catalogo-projecao"
          value={draft.nome_item}
          onChange={event => chooseCatalog(event.target.value)}
          placeholder="Digite ou escolha um item"
          className="w-60 rounded-lg border bg-white px-3 py-2 text-xs disabled:bg-transparent"
        />
      </td>

      <td className="border-b p-2">
        <div className="flex w-64 items-center gap-1">
          <input
            disabled={!editable}
            value={draft.observacao || ''}
            onChange={event => update(
              'observacao',
              event.target.value
            )}
            placeholder="Observação ou link do produto"
            className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-xs disabled:bg-transparent"
          />

          {purchaseLink && (
            <a
              href={purchaseLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-blue-50 px-2 py-2 text-[10px] font-black text-blue-700 hover:bg-blue-100"
            >
              Abrir
            </a>
          )}
        </div>
      </td>

      <td className="border-b p-2">
        <input
          disabled={!editable}
          type="number"
          min="0.001"
          step="0.001"
          value={draft.quantidade}
          onChange={event => update('quantidade', event.target.value)}
          className="w-20 rounded-lg border bg-white px-2 py-2 text-right text-xs disabled:bg-transparent"
        />
      </td>

      <td className="border-b p-2">
        <input
          disabled={!editable}
          value={draft.unidade_medida}
          onChange={event => update('unidade_medida', event.target.value)}
          className="w-16 rounded-lg border bg-white px-2 py-2 text-xs uppercase disabled:bg-transparent"
        />
      </td>

      <td className="border-b p-2">
        <input
          disabled={!editable}
          type="date"
          value={draft.data_necessaria}
          onChange={event => update('data_necessaria', event.target.value)}
          className="w-36 rounded-lg border bg-white px-2 py-2 text-xs disabled:bg-transparent"
        />
      </td>

      <td className="border-b p-2">
        <input
          disabled={!editable}
          type="number"
          min="0"
          step="0.01"
          value={draft.valor_unitario_estimado}
          onChange={event => update(
            'valor_unitario_estimado',
            event.target.value
          )}
          className="w-32 rounded-lg border bg-white px-2 py-2 text-right text-xs disabled:bg-transparent"
        />
      </td>

      <td className="border-b p-2 text-right text-xs font-black text-slate-700">
        {money(
          Number(draft.quantidade || 0)
          * Number(draft.valor_unitario_estimado || 0)
        )}
      </td>

      <td className="border-b p-2">
        <select
          disabled={!editable}
          value={draft.responsavel_id}
          onChange={event => update('responsavel_id', event.target.value)}
          className="w-40 rounded-lg border bg-white px-2 py-2 text-xs disabled:bg-transparent"
        >
          <option value="">Sem responsável</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {userLabel(user)}
            </option>
          ))}
        </select>
      </td>

      <td className="border-b p-2">
        <select
          disabled={!editable}
          value={draft.status}
          onChange={event => update('status', event.target.value)}
          className="w-40 rounded-lg border bg-white px-2 py-2 text-xs disabled:bg-transparent"
        >
          <option>Pendente</option>
          <option>Aprovado</option>
          <option>Negado</option>
          {draft.status === 'Enviado para Compras' && (
            <option>Enviado para Compras</option>
          )}
          {draft.status === 'Em cotação' && <option>Em cotação</option>}
          {draft.status === 'Comprado' && <option>Comprado</option>}
          {draft.status === 'Recebido' && <option>Recebido</option>}
          {draft.status === 'Cancelado' && <option>Cancelado</option>}
        </select>
      </td>

      <td className="border-b p-2">
        <div className="flex min-w-[235px] items-center gap-1">
          {editable && (
            <button
              type="button"
              onClick={submit}
              disabled={saving || !String(draft.nome_item || '').trim()}
              className="rounded-lg bg-slate-900 p-2 text-white disabled:opacity-40"
              title="Salvar"
            >
              {saving
                ? <Loader2 className="animate-spin" size={14}/>
                : <Save size={14}/>}
            </button>
          )}

          {!isNew && !locked && canEdit && (
            <button
              type="button"
              onClick={() => evolve(item)}
              disabled={item.status !== 'Aprovado'}
              title={
                item.status === 'Aprovado'
                  ? 'Criar requisição de compra'
                  : 'Salve o item com status Aprovado'
              }
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              <Send size={13}/>
              Evoluir para compra
            </button>
          )}

          {locked && (
            <span className="rounded-lg bg-emerald-50 px-2 py-2 text-[10px] font-bold text-emerald-700">
              {item.numero_requisicao || 'Enviado para Compras'}
            </span>
          )}

          {!isNew && canEdit && !locked && (
            <button
              type="button"
              onClick={() => remove(item)}
              className="rounded-lg p-2 text-red-500 hover:bg-red-50"
              title="Excluir"
            >
              <Trash2 size={14}/>
            </button>
          )}

          {isNew && (
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg p-2 text-slate-500 hover:bg-white"
              title="Cancelar"
            >
              <X size={14}/>
            </button>
          )}
        </div>
      </td>
    </tr>
  )
})

export default function Projecoes() {
  const auth = useAuth()
  const user = auth?.user || null
  const role = String(
    user?.role
    || user?.tipo
    || user?.tipo_usuario
    || ''
  ).toLowerCase()
  const profile = user?.perfil_acesso || user?.perfil || null

  const permission = useCallback(action => {
    if (['admin', 'super_admin', 'superadmin'].includes(role)) return true

    const key = `projetos_${action}`

    if (
      profile
      && Object.prototype.hasOwnProperty.call(profile, key)
    ) {
      return !!profile[key]
    }

    return action === 'ver'
  }, [profile, role])

  const canEdit = permission('editar')
  const canDelete = permission('excluir')

  const [projects, setProjects] = useState([])
  const [catalog, setCatalog] = useState([])
  const [users, setUsers] = useState([])
  const [companies, setCompanies] = useState([])
  const [projectId, setProjectId] = useState('')
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(true)
  const [loadingRows, setLoadingRows] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [evolveItem, setEvolveItem] = useState(null)
  const [evolveCompanyId, setEvolveCompanyId] = useState('')
  const [evolving, setEvolving] = useState(false)
  const [message, setMessage] = useState(null)

  const notify = useCallback((text, type = 'success') => {
    setMessage({ text, type })
    window.setTimeout(() => setMessage(null), 3500)
  }, [])

  const loadInitial = useCallback(async () => {
    setLoading(true)

    const results = await Promise.allSettled([
      api(API),
      api('/api/compras/itens'),
      api('/api/usuarios'),
      api('/api/empresas'),
    ])

    if (results[0].status === 'fulfilled') {
      const projectList = arrayResult(
        results[0].value,
        ['projetos', 'items', 'data']
      )

      setProjects(projectList)

      const queryProject = new URLSearchParams(
        window.location.search
      ).get('projeto')

      const initialProject = projectList.find(
        project => Number(project.id) === Number(queryProject)
      ) || projectList[0]

      if (initialProject) {
        setProjectId(String(initialProject.id))
      }
    } else {
      notify(
        results[0].reason?.message || 'Erro ao carregar projetos',
        'error'
      )
    }

    if (results[1].status === 'fulfilled') {
      setCatalog(arrayResult(
        results[1].value,
        ['itens', 'items', 'data']
      ))
    }

    if (results[2].status === 'fulfilled') {
      setUsers(arrayResult(
        results[2].value,
        ['usuarios', 'users', 'items', 'data']
      ))
    }

    if (results[3].status === 'fulfilled') {
      setCompanies(arrayResult(
        results[3].value,
        ['empresas', 'companies', 'items', 'data']
      ))
    }

    setLoading(false)
  }, [notify])

  const loadRows = useCallback(async () => {
    if (!projectId) {
      setItems([])
      setSummary(EMPTY_SUMMARY)
      return
    }

    setLoadingRows(true)

    try {
      const result = await api(
        `${API}/${projectId}/projecoes-compras`
      )

      setItems(result?.itens || [])
      setSummary(result?.resumo || EMPTY_SUMMARY)
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setLoadingRows(false)
    }
  }, [notify, projectId])

  useEffect(() => {
    loadInitial()
  }, [loadInitial])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const saveItem = async payload => {
    const isNew = !payload.id

    try {
      await api(
        isNew
          ? `${API}/${projectId}/projecoes-compras`
          : `${API}/${projectId}/projecoes-compras/${payload.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          body: JSON.stringify(payload),
        }
      )

      setNewOpen(false)
      await loadRows()
      notify(isNew ? 'Item adicionado' : 'Item atualizado')
    } catch (error) {
      notify(error.message, 'error')
      throw error
    }
  }

  const removeItem = async item => {
    if (!canDelete) {
      notify('Sem permissão para excluir', 'error')
      return
    }

    if (!window.confirm(`Excluir "${item.nome_item}"?`)) return

    try {
      await api(
        `${API}/${projectId}/projecoes-compras/${item.id}`,
        { method: 'DELETE' }
      )

      await loadRows()
      notify('Item excluído')
    } catch (error) {
      notify(error.message, 'error')
    }
  }

  const openEvolution = item => {
    if (item.status !== 'Aprovado') {
      notify(
        'Salve o item como Aprovado antes de evoluir',
        'error'
      )
      return
    }

    if (companies.length === 0) {
      notify(
        'Nenhuma empresa disponível para a compra',
        'error'
      )
      return
    }

    setEvolveItem(item)
    setEvolveCompanyId(
      String(item.empresa_id || companies[0]?.id || '')
    )
  }

  const confirmEvolution = async () => {
    if (!evolveItem || !evolveCompanyId) {
      notify('Selecione a empresa da compra', 'error')
      return
    }

    setEvolving(true)

    try {
      const result = await api(
        `${API}/${projectId}/projecoes-compras/evoluir`,
        {
          method: 'POST',
          body: JSON.stringify({
            empresa_id: Number(evolveCompanyId),
            item_ids: [evolveItem.id],
          }),
        }
      )

      setEvolveItem(null)
      setEvolveCompanyId('')
      await loadRows()

      notify(
        result?.message
        || 'Item enviado para Compras'
      )
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setEvolving(false)
    }
  }

  const selectedProject = useMemo(
    () => projects.find(
      project => Number(project.id) === Number(projectId)
    ),
    [projectId, projects]
  )

  return (
    <div className="min-h-full bg-slate-50">
      <datalist id="catalogo-projecao">
        {catalog.map(item => (
          <option
            key={item.id}
            value={`${item.codigo || ''} — ${item.nome}`}
          />
        ))}
      </datalist>

      <header className="border-b bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/projetos"
            className="rounded-xl border p-2 text-slate-600 hover:bg-slate-50"
            title="Voltar"
          >
            <ArrowLeft size={18}/>
          </Link>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <ShoppingCart size={21}/>
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900">
              Projeções
            </h1>
            <p className="text-xs text-slate-500">
              Planejamento de compras de Manutenção e T.I.
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={projectId}
              onChange={event => {
                setProjectId(event.target.value)
                setNewOpen(false)
              }}
              className="min-w-64 rounded-xl border bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecione um projeto</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.codigo ? `${project.codigo} — ` : ''}
                  {project.nome}
                </option>
              ))}
            </select>

            <button
              onClick={loadRows}
              disabled={!projectId || loadingRows}
              className="rounded-xl border bg-white p-2.5 text-slate-600 disabled:opacity-40"
              title="Atualizar"
            >
              <RefreshCw
                className={loadingRows ? 'animate-spin' : ''}
                size={17}
              />
            </button>

            <Link
              to="/projetos/gestao"
              className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-bold"
            >
              <FolderKanban size={16}/>
              Gestão
            </Link>

            {canEdit && projectId && (
              <button
                onClick={() => setNewOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white"
              >
                <Plus size={16}/>
                Adicionar item
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Itens previstos', summary.quantidade_itens],
            ['Total previsto', money(summary.total_estimado)],
            ['Enviado para Compras', money(summary.total_enviado_compras)],
            ['Pendente', money(summary.total_pendente)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
              <span className="text-[10px] font-black uppercase text-slate-400">
                {label}
              </span>
              <b className="mt-1 block text-lg text-slate-800">
                {value}
              </b>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <b className="text-sm text-slate-800">
              {selectedProject?.nome || 'Selecione um projeto'}
            </b>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[1720px] w-full border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left">
                <tr className="text-[10px] font-black uppercase text-slate-500">
                  <th className="p-3">Setor</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Observação / link</th>
                  <th className="p-3 text-right">Qtd.</th>
                  <th className="p-3">Un.</th>
                  <th className="p-3">Necessário até</th>
                  <th className="p-3 text-right">Valor unitário</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {newOpen && (
                  <ProjectionRow
                    item={EMPTY_ITEM}
                    catalog={catalog}
                    users={users}
                    canEdit={canEdit}
                    isNew
                    save={saveItem}
                    remove={removeItem}
                    evolve={openEvolution}
                    cancel={() => setNewOpen(false)}
                  />
                )}

                {loadingRows ? (
                  <tr>
                    <td colSpan="11" className="p-10 text-center text-sm text-slate-400">
                      <Loader2 className="mx-auto mb-2 animate-spin" size={24}/>
                      Carregando projeção...
                    </td>
                  </tr>
                ) : items.length === 0 && !newOpen ? (
                  <tr>
                    <td colSpan="11" className="p-12 text-center text-sm text-slate-400">
                      Nenhum item cadastrado neste projeto.
                    </td>
                  </tr>
                ) : items.map(item => (
                  <ProjectionRow
                    key={item.id}
                    item={item}
                    catalog={catalog}
                    users={users}
                    canEdit={canEdit}
                    isNew={false}
                    save={saveItem}
                    remove={removeItem}
                    evolve={openEvolution}
                    cancel={() => {}}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {evolveItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-black text-slate-900">
              Evoluir para compra
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Item: <b>{evolveItem.nome_item}</b>
            </p>

            <label className="mt-5 block text-xs font-black uppercase text-slate-500">
              Empresa da compra
              <select
                value={evolveCompanyId}
                onChange={event => setEvolveCompanyId(event.target.value)}
                className="mt-2 w-full rounded-xl border bg-white px-3 py-2.5 text-sm normal-case"
              >
                <option value="">Selecione</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.nome}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={evolving}
                onClick={() => {
                  setEvolveItem(null)
                  setEvolveCompanyId('')
                }}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={evolving || !evolveCompanyId}
                onClick={confirmEvolution}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              >
                {evolving
                  ? <Loader2 className="animate-spin" size={16}/>
                  : <Send size={16}/>}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className={`fixed bottom-5 right-5 z-[100] rounded-xl px-4 py-3 text-sm font-bold text-white shadow-xl ${
          message.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
        }`}>
          {message.text}
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white/70">
          <Loader2 className="animate-spin text-slate-700" size={32}/>
        </div>
      )}
    </div>
  )
}
