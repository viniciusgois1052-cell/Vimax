// frontend/src/pages/PerfilAcesso.jsx - COMPLETO COM COLUNAS EXTRAS EM COMPRAS
import React, { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Plus, Edit2, Trash2, X, Save, Check, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API = '/api/perfis-acesso'

const MODULOS = [
  { key: 'chamados',              label: 'Chamados',              grupo: 'Helpdesk',       cor: 'blue' },
  { key: 'tipo_chamado',          label: 'Tipo Chamado',          grupo: 'Helpdesk',       cor: 'blue' },
  { key: 'tipo_servico',          label: 'Tipo Serviço',          grupo: 'Helpdesk',       cor: 'blue' },
  { key: 'formularios_chamado',   label: 'Formulários Chamado',   grupo: 'Helpdesk',       cor: 'blue' },
  { key: 'contratos',             label: 'Contratos',             grupo: 'Documentos',     cor: 'green' },
  { key: 'orcamentos',            label: 'Orçamentos',            grupo: 'Documentos',     cor: 'green' },
  { key: 'clientes',              label: 'Clientes',              grupo: 'Documentos',     cor: 'cyan' },
  { key: 'lembretes',             label: 'Lembretes',             grupo: 'Documentos',     cor: 'green' },
  { key: 'empresas',              label: 'Empresas',              grupo: 'Ativos',         cor: 'indigo' },
  { key: 'localizacoes',          label: 'Localizações',          grupo: 'Ativos',         cor: 'teal' },
  { key: 'ativos',                label: 'Ativos',                grupo: 'Ativos',         cor: 'purple' },
  { key: 'fornecedores',          label: 'Fornecedores',          grupo: 'Ativos',         cor: 'pink' },
  { key: 'compras',               label: 'Compras',               grupo: 'Ativos',         cor: 'green' },
  { key: 'tipo_infraestrutura',   label: 'Tipo Infraestrutura',   grupo: 'Ativos',         cor: 'orange' },
  { key: 'infraestrutura',        label: 'Infraestrutura',        grupo: 'Ativos',         cor: 'orange' },
  { key: 'contadores_impressora', label: 'Contadores Impressora', grupo: 'Ativos',         cor: 'orange' },
  { key: 'relatorios',            label: 'Relatórios',            grupo: 'BI',             cor: 'red' },
  { key: 'crm',                   label: 'CRM',                   grupo: 'CRM',            cor: 'emerald' },
  { key: 'marketing',             label: 'Marketing',             grupo: 'CRM',            cor: 'rose' },
  { key: 'usuarios',              label: 'Usuários',              grupo: 'Configurações',  cor: 'violet' },
  { key: 'perfis_acesso',         label: 'Perfis de Acesso',      grupo: 'Configurações',  cor: 'violet' },
  { key: 'config_email',          label: 'Config. Email',         grupo: 'Configurações',  cor: 'slate' },
  { key: 'logs',                  label: 'Logs',                  grupo: 'Configurações',  cor: 'slate' },
  { key: 'mobilemed',             label: 'Mobilemed API',         grupo: 'Configurações',  cor: 'slate' },
]

const GRUPOS = [...new Set(MODULOS.map(m => m.grupo))]

const ACOES = [
  { key: 'ver',     label: 'Ver'     },
  { key: 'criar',   label: 'Criar'   },
  { key: 'editar',  label: 'Editar'  },
  { key: 'excluir', label: 'Excluir' },
]

// Ações extras EXCLUSIVAS para o módulo "compras"
const ACOES_COMPRAS = [
  { key: 'compras_ver_somente_proprias',    label: 'Ver Próprias',    icon: '👤', tooltip: 'Usuário só visualiza compras que ele criou' },
  { key: 'compras_pode_requisitar',         label: 'Requisitar',      icon: '📝', tooltip: 'Pode criar requisições de compra (RQ)' },
  { key: 'compras_pode_marcar_recebimento', label: 'Receber',         icon: '✅', tooltip: 'Pode marcar materiais como recebidos' },
  { key: 'compras_ver_somente_empresa',     label: 'Só Empresa',      icon: '🏢', tooltip: 'Visualiza apenas compras da(s) empresa(s) vinculada(s)' },
]

const COR_MAP = {
  blue:    'bg-blue-100 text-blue-700 border-blue-200',
  green:   'bg-green-100 text-green-700 border-green-200',
  purple:  'bg-purple-100 text-purple-700 border-purple-200',
  indigo:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  pink:    'bg-pink-100 text-pink-700 border-pink-200',
  teal:    'bg-teal-100 text-teal-700 border-teal-200',
  orange:  'bg-orange-100 text-orange-700 border-orange-200',
  red:     'bg-red-100 text-red-700 border-red-200',
  cyan:    'bg-cyan-100 text-cyan-700 border-cyan-200',
  violet:  'bg-violet-100 text-violet-700 border-violet-200',
  rose:    'bg-rose-100 text-rose-700 border-rose-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  slate:   'bg-slate-100 text-slate-700 border-slate-200',
}

const GRUPO_COR = {
  'Helpdesk':      'bg-blue-600',
  'Documentos':    'bg-green-600',
  'Ativos':        'bg-purple-600',
  'BI':            'bg-red-600',
  'CRM':           'bg-emerald-600',
  'Configurações': 'bg-slate-600',
}

function emptyPerfil() {
  const p = {
    nome: '',
    descricao: '',
    visualizar_fornecedores: true,
    visualizar_prestadores: true,
    compras_ver_somente_proprias: false,
    compras_pode_requisitar: false,
    compras_pode_marcar_recebimento: false,
    compras_ver_somente_empresa: false
  }
  MODULOS.forEach(m => ACOES.forEach(a => { p[`${m.key}_${a.key}`] = false }))
  return p
}

function getToken() {
  try { return JSON.parse(localStorage.getItem('user'))?.api_token } catch { return null }
}

function apiFetch(url, opts = {}) {
  const token = getToken()
  return fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { 'X-API-Token': token } : {}), ...(opts.headers || {}) }
  })
}

function Checkbox({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all cursor-pointer
        ${checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 hover:border-indigo-400'}`}>
      {checked && <Check size={13} strokeWidth={3} />}
    </button>
  )
}

function ConfirmModal({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="text-red-500" size={22} />
          <h3 className="font-bold text-gray-800">{title}</h3>
        </div>
        <p className="text-gray-600 text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border text-gray-600 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-bold">Excluir</button>
        </div>
      </div>
    </div>
  )
}

function PainelEdicao({ perfil, onSave, onCancel, saving }) {
  const [form, setForm] = useState(() => {
    if (!perfil) return emptyPerfil()
    const base = emptyPerfil()
    const merged = { ...base }
    Object.keys(perfil).forEach(key => {
        if (perfil.hasOwnProperty(key)) {
            merged[key] = perfil[key]
        }
    })
    return merged
  })
  const [grupoAtivo, setGrupoAtivo] = useState(GRUPOS[0])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const toggleGrupo = (grupo) => {
    const mods = MODULOS.filter(m => m.grupo === grupo)
    const todos = mods.every(m => ACOES.every(a => form[`${m.key}_${a.key}`]))
    const upd = {}
    mods.forEach(m => ACOES.forEach(a => { upd[`${m.key}_${a.key}`] = !todos }))
    setForm(f => ({ ...f, ...upd }))
  }

  const toggleModulo = (modKey) => {
    const todos = ACOES.every(a => form[`${modKey}_${a.key}`])
    const upd = {}
    ACOES.forEach(a => { upd[`${modKey}_${a.key}`] = !todos })
    setForm(f => ({ ...f, ...upd }))
  }

  const toggleAcaoGrupo = (grupo, acao) => {
    const mods = MODULOS.filter(m => m.grupo === grupo)
    const todos = mods.every(m => form[`${m.key}_${acao}`])
    const upd = {}
    mods.forEach(m => { upd[`${m.key}_${acao}`] = !todos })
    setForm(f => ({ ...f, ...upd }))
  }

  const toggleTudo = () => {
    const todos = MODULOS.every(m => ACOES.every(a => form[`${m.key}_${a.key}`]))
    const upd = {}
    MODULOS.forEach(m => ACOES.forEach(a => { upd[`${m.key}_${a.key}`] = !todos }))
    setForm(f => ({ ...f, ...upd }))
  }

  const tudo = MODULOS.every(m => ACOES.every(a => form[`${m.key}_${a.key}`]))
  const modsGrupo = MODULOS.filter(m => m.grupo === grupoAtivo)

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Nome do Perfil *</label>
          <input value={form.nome} onChange={e => set('nome', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Ex: Técnico de Campo" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Descrição</label>
          <input value={form.descricao || ''} onChange={e => set('descricao', e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Descrição opcional" />
        </div>
      </div>

      {/* SEÇÃO: Controle de Visualização de Fornecedores/Prestadores */}
      <div className="bg-gradient-to-br from-gray-50 via-gray-50 to-pink-50 border-2 border-gray-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="text-gray-600" size={20} />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
            Controle de Visualização: Fornecedores & Prestadores
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-transparent hover:border-blue-400 cursor-pointer transition-all shadow-sm">
            <input
              type="checkbox"
              checked={form.visualizar_fornecedores !== false}
              onChange={e => set('visualizar_fornecedores', e.target.checked)}
              className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
            />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">📦</span>
              </div>
              <div>
                <div className="font-bold text-sm text-gray-800">Visualizar Fornecedores</div>
                <div className="text-xs text-gray-500">Permite ver registros de fornecedores de materiais</div>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-transparent hover:border-green-400 cursor-pointer transition-all shadow-sm">
            <input
              type="checkbox"
              checked={form.visualizar_prestadores !== false}
              onChange={e => set('visualizar_prestadores', e.target.checked)}
              className="w-5 h-5 accent-green-600 rounded cursor-pointer"
            />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <div className="font-bold text-sm text-gray-800">Visualizar Prestadores</div>
                <div className="text-xs text-gray-500">Permite ver registros de prestadores de serviços</div>
              </div>
            </div>
          </label>
        </div>
        <div className="mt-4 flex items-start gap-2 bg-indigo-100 border border-indigo-300 rounded-lg p-3 text-xs text-indigo-800">
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={14} />
          <div>
            <span className="font-bold">💡 Dica para Setor de Compras:</span> Desmarque "Visualizar Prestadores" se o usuário trabalha apenas com compras de materiais, ou desmarque "Visualizar Fornecedores" se trabalha apenas com contratação de serviços.
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-1 flex-wrap">
          {GRUPOS.map(g => {
            const mods = MODULOS.filter(m => m.grupo === g)
            const algum = mods.some(m => ACOES.some(a => form[`${m.key}_${a.key}`]))
            const ativo = grupoAtivo === g
            return (
              <button key={g} type="button" onClick={() => setGrupoAtivo(g)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap
                  ${ativo ? `${GRUPO_COR[g]} text-white shadow` : 'text-gray-600 hover:bg-gray-200'}`}>
                {algum && !ativo && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                {g}
              </button>
            )
          })}
          <div className="ml-auto">
            <button type="button" onClick={toggleTudo}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all">
              {tudo ? 'Desmarcar tudo' : 'Marcar tudo'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 w-48">
                  <button type="button" onClick={() => toggleGrupo(grupoAtivo)}
                    className="text-indigo-600 hover:underline text-xs font-bold">
                    {MODULOS.filter(m => m.grupo === grupoAtivo).every(m => ACOES.every(a => form[`${m.key}_${a.key}`]))
                      ? 'Desmarcar grupo' : 'Marcar grupo'}
                  </button>
                </th>
                {ACOES.map(a => (
                  <th key={a.key} className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-600">{a.label}</span>
                      <Checkbox
                        checked={modsGrupo.every(m => form[`${m.key}_${a.key}`])}
                        onChange={() => toggleAcaoGrupo(grupoAtivo, a.key)}
                      />
                    </div>
                  </th>
                ))}
                {/* Cabeçalhos extras SOMENTE se houver módulo "compras" no grupo ativo */}
                {modsGrupo.some(m => m.key === 'compras') && ACOES_COMPRAS.map(ac => (
                  <th key={ac.key} className="px-3 py-3 text-center bg-blue-50">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg">{ac.icon}</span>
                      <span className="text-[10px] font-bold text-blue-700 leading-tight" title={ac.tooltip}>{ac.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modsGrupo.map((m, i) => (
                <tr key={m.key} className={`border-b border-gray-50 hover:bg-indigo-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => toggleModulo(m.key)}
                        className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                        {ACOES.every(a => form[`${m.key}_${a.key}`]) ? '✓' : '○'}
                      </button>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${COR_MAP[m.cor]}`}>{m.label}</span>
                    </div>
                  </td>
                  {ACOES.map(a => (
                    <td key={a.key} className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        <Checkbox checked={!!form[`${m.key}_${a.key}`]} onChange={v => set(`${m.key}_${a.key}`, v)} />
                      </div>
                    </td>
                  ))}
                  {/* Colunas extras SOMENTE na linha de "compras" */}
                  {m.key === 'compras' && ACOES_COMPRAS.map(ac => (
                    <td key={ac.key} className="px-3 py-3 text-center bg-blue-50/50">
                      <div className="flex justify-center">
                        <Checkbox checked={!!form[ac.key]} onChange={v => set(ac.key, v)} />
                      </div>
                    </td>
                  ))}
                  {/* Células vazias para outros módulos quando compras está no grupo */}
                  {m.key !== 'compras' && modsGrupo.some(mod => mod.key === 'compras') && ACOES_COMPRAS.map(ac => (
                    <td key={ac.key} className="px-3 py-3 bg-gray-50/30"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Resumo Geral</span>
          <span className="text-xs text-gray-400">
            {MODULOS.reduce((acc, m) => acc + ACOES.filter(a => form[`${m.key}_${a.key}`]).length, 0)} / {MODULOS.length * ACOES.length} permissões ativas
          </span>
        </div>
        <div className="p-4 flex flex-wrap gap-2">
          {GRUPOS.map(g => {
            const mods = MODULOS.filter(m => m.grupo === g)
            const ativos = mods.filter(m => ACOES.some(a => form[`${m.key}_${a.key}`])).length
            const total = mods.length
            return (
              <button key={g} type="button" onClick={() => setGrupoAtivo(g)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all
                  ${ativos > 0 ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                <span className={`w-2 h-2 rounded-full ${ativos === total ? 'bg-green-500' : ativos > 0 ? 'bg-amber-400' : 'bg-gray-300'}`} />
                {g} <span className="opacity-60">{ativos}/{total}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-1">
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-bold flex items-center gap-2">
          <X size={15} /> Cancelar
        </button>
        <button type="button" disabled={saving || !form.nome.trim()} onClick={() => onSave(form)}
          className="px-6 py-2.5 rounded-xl bg-black text-white hover:bg-black text-sm font-bold flex items-center gap-2 disabled:opacity-50 shadow-lg">
          <Save size={15} /> {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  )
}

function PerfilCard({ perfil, onEdit, onDelete }) {
  const total = MODULOS.length * ACOES.length
  const ativos = MODULOS.reduce((acc, m) => acc + ACOES.filter(a => perfil[`${m.key}_${a.key}`]).length, 0)
  const pct = Math.round((ativos / total) * 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="text-indigo-600" size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800 truncate">{perfil.nome}</h3>
            {perfil.descricao && <p className="text-xs text-gray-500 truncate">{perfil.descricao}</p>}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(perfil)} className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"><Edit2 size={15}/></button>
          <button onClick={() => onDelete(perfil)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={15}/></button>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{ativos} permissões ativas</span><span>{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {perfil.visualizar_fornecedores !== false && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">
            📦 Fornecedores
          </span>
        )}
        {perfil.visualizar_prestadores !== false && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold border border-green-200">
            🔧 Prestadores
          </span>
        )}
        {perfil.compras_ver_somente_proprias && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold border border-purple-200">
            👤 Próprias
          </span>
        )}
        {perfil.compras_pode_requisitar && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold border border-green-200">
            📝 Requisitar
          </span>
        )}
        {perfil.compras_pode_marcar_recebimento && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold border border-orange-200">
            ✅ Receber
          </span>
        )}
        {perfil.compras_ver_somente_empresa && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
            🏢 Empresa
          </span>
        )}

        {GRUPOS.map(g => {
          const mods = MODULOS.filter(m => m.grupo === g)
          const temAlgum = mods.some(m => ACOES.some(a => perfil[`${m.key}_${a.key}`]))
          if (!temAlgum) return null
          const cor = GRUPO_COR[g] || 'bg-gray-500'
          return (
            <span key={g} className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold ${cor}`}>{g}</span>
          )
        })}
        {ativos === 0 && <span className="text-xs text-gray-400 italic">Sem permissões</span>}
      </div>
    </div>
  )
}

export default function PerfilAcesso() {
  const { user } = useAuth()

  const [perfis,     setPerfis]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [erro,       setErro]       = useState(null)
  const [modo,       setModo]       = useState(null)
  const [perfilEdit, setPerfilEdit] = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [confirm,    setConfirm]    = useState(null)
  const [toast,      setToast]      = useState(null)

  const showToast = useCallback((msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const r = await apiFetch(API)
      if (!r.ok) throw new Error()
      setPerfis(await r.json())
    } catch {
      setErro('Erro ao carregar perfis')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-gray-500">
          <ShieldCheck size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="font-bold">Acesso restrito</p>
          <p className="text-sm">Apenas Super Admin pode acessar esta área.</p>
        </div>
      </div>
    )
  }

  const salvar = async (form) => {
    setSaving(true)
    try {
      const url  = modo === 'editar' ? `${API}/${perfilEdit.id}` : API
      const meth = modo === 'editar' ? 'PUT' : 'POST'
      const r = await apiFetch(url, { method: meth, body: JSON.stringify(form) })
      if (!r.ok) { const d = await r.json(); showToast(d.error || 'Erro ao salvar', 'erro'); return }
      showToast(modo === 'editar' ? 'Perfil atualizado!' : 'Perfil criado!', 'ok')
      setModo(null); setPerfilEdit(null); carregar()
    } catch { showToast('Erro de conexão', 'erro') }
    finally { setSaving(false) }
  }

  const excluir = async (perfil) => {
    try {
      const r = await apiFetch(`${API}/${perfil.id}`, { method: 'DELETE' })
      if (!r.ok) { showToast('Erro ao excluir', 'erro'); return }
      showToast('Perfil excluído!')
      carregar()
    } catch { showToast('Erro de conexão', 'erro') }
    finally { setConfirm(null) }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2
          ${toast.tipo === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.tipo === 'ok' ? <Check size={16}/> : <AlertTriangle size={16}/>}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
            <ShieldCheck className="text-white" size={20}/>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Perfis de Acesso</h1>
            <p className="text-xs text-gray-500">{perfis.length} perfil{perfis.length !== 1 ? 's' : ''} cadastrado{perfis.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {modo === null && (
          <button onClick={() => { setModo('criar'); setPerfilEdit(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-black shadow-sm">
            <Plus size={16}/> Novo Perfil
          </button>
        )}
      </div>

      {modo && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-md p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              {modo === 'criar' ? <><Plus size={16} className="text-indigo-600"/> Novo Perfil</> : <><Edit2 size={16} className="text-indigo-600"/> Editar: {perfilEdit?.nome}</>}
            </h2>
            <button onClick={() => { setModo(null); setPerfilEdit(null) }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><X size={16}/></button>
          </div>
          <PainelEdicao perfil={modo === 'editar' ? perfilEdit : null} onSave={salvar} onCancel={() => { setModo(null); setPerfilEdit(null) }} saving={saving} />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/>
        </div>
      ) : erro ? (
        <div className="text-center py-12 text-red-500">{erro}</div>
      ) : perfis.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShieldCheck size={40} className="mx-auto mb-3 opacity-30"/>
          <p className="font-bold">Nenhum perfil cadastrado</p>
          <p className="text-sm">Clique em "Novo Perfil" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {perfis.map(p => (
            <PerfilCard key={p.id} perfil={p}
              onEdit={pf => { setPerfilEdit(pf); setModo('editar'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              onDelete={pf => setConfirm(pf)} />
          ))}
        </div>
      )}

      <ConfirmModal open={!!confirm} title="Excluir Perfil"
        message={`Tem certeza que deseja excluir "${confirm?.nome}"?`}
        onConfirm={() => excluir(confirm)} onCancel={() => setConfirm(null)} />
    </div>
  )
}
