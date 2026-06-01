import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, DollarSign, TrendingUp, Settings2,
  Plus, Search, X, Pencil, Trash2, ChevronRight, ChevronUp,
  ChevronDown, MoreHorizontal, Phone, Mail, Linkedin, Github,
  Twitter, Globe, MapPin, Tag, Calendar, Activity, BarChart2,
  Eye, RefreshCw, Check, Clock, AlertCircle, Columns, GripVertical, Filter
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || ''

// ─── helpers ──────────────────────────────────────────────────────────────────
function useHeaders() {
  const { user } = useAuth()
  return useMemo(() =>
    user?.api_token
      ? { 'X-API-Token': user.api_token, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  , [user])
}
function fmtBRL(v) {
  if (v == null || v === '') return null
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDate(v) {
  if (!v) return null
  try { return new Date(v.includes('T') ? v : v + 'T00:00:00').toLocaleDateString('pt-BR') } catch { return v }
}
function fmtDateTime(v) {
  if (!v) return null
  try { return new Date(v).toLocaleString('pt-BR') } catch { return v }
}
function parseExtras(raw) {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}
function useCustomCols(storageKey) {
  const [cols, setCols] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })
  const add = (label) => {
    const key = 'cx_' + Date.now()
    const next = [...cols, { key, label, custom: true }]
    setCols(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }
  const remove = (key) => {
    const next = cols.filter(c => c.key !== key)
    setCols(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
    return next
  }
  return [cols, add, remove]
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────
function Badge({ label, color = 'bg-slate-100 text-slate-600' }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>{label}</span>
}
function Spinner() {
  return (
    <div className="py-20 text-center">
      <div className="inline-block w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm mt-3">Carregando...</p>
    </div>
  )
}
function Empty({ msg = 'Nenhum registro encontrado', icon: Icon = Search }) {
  return (
    <div className="py-16 text-center">
      <Icon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-400 text-sm font-medium">{msg}</p>
    </div>
  )
}
function Modal({ title, subtitle, onClose, children, size = 'max-w-xl' }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl w-full ${size} shadow-2xl flex flex-col max-h-[92vh]`}>
        <div className="flex items-start justify-between px-6 py-5 border-b shrink-0">
          <div>
            <h2 className="font-bold text-base text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 ml-4 mt-0.5 transition">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
function Drawer({ open, onClose, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[480px] bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200">{children}</div>
    </div>
  )
}
function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
function Inp({ type, ...props }) {
  const base = "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 outline-none transition bg-white placeholder:text-slate-300"
  const noSpin = "[appearance:none] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  return <input type={type} className={`${base} ${type === 'number' ? noSpin : ''}`} {...props} />
}
function Sel({ children, ...props }) {
  return (
    <select className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 outline-none transition" {...props}>
      {children}
    </select>
  )
}
function Txta(props) {
  return <textarea className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 outline-none transition resize-none bg-white placeholder:text-slate-300" {...props} />
}
function TableFilter({ value, onChange, options = [], selectedOptions = [], onToggleOption, isFirst }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)
  
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredOptions = options.filter(opt => 
    String(opt || '').toLowerCase().includes(search.toLowerCase())
  )

  const hasActiveFilter = value || selectedOptions.length > 0

  return (
    <div className="relative inline-block" ref={ref} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(!open)} 
        className={`p-1 rounded-md transition-colors ${hasActiveFilter ? 'bg-violet-100 text-violet-600' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}>
        <Filter className="w-3 h-3" />
      </button>
      {open && (
        <div className={`absolute ${isFirst ? 'left-0' : 'right-0'} top-full mt-1 z-[100] bg-white border border-slate-200 rounded-xl shadow-2xl p-3 min-w-[220px] max-w-[300px]`}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Filtrar coluna</p>
          
          <div className="space-y-2">
            <input
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 bg-slate-50"
              placeholder="Buscar..."
              value={value || ''}
              onChange={e => onChange(e.target.value)}
            />
            
            <div className="border-t border-slate-100 pt-2">
              <div className="relative mb-2">
                <Search className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-slate-100 rounded-lg focus:outline-none bg-white"
                  placeholder="Pesquisar na lista..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              
              <div className="max-h-40 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredOptions.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-2">Nenhum valor</p>
                ) : (
                  filteredOptions.map((opt, i) => (
                    <label key={i} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                      <input
                        type="checkbox"
                        checked={selectedOptions.includes(String(opt || ''))}
                        onChange={() => onToggleOption(String(opt || ''))}
                        className="w-3.5 h-3.5 accent-violet-600 rounded border-slate-300"
                      />
                      <span className="text-xs text-slate-600 truncate group-hover:text-slate-900">
                        {opt === '' || opt == null ? <span className="italic text-slate-300">(Vazio)</span> : opt}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {hasActiveFilter && (
            <button onClick={() => { onChange(''); onToggleOption('__CLEAR__'); setOpen(false) }} 
              className="mt-3 w-full py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100">
              Limpar Filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Th({ label, field, sortField, sortDir, onSort, filterValue, onFilter, options, selectedOptions, onToggleOption, isFirst, className = '' }) {
  const active = sortField === field
  return (
    <th className={`relative px-4 py-3 text-left border-b border-slate-100 transition-colors ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div onClick={() => onSort(field)} className="flex items-center gap-1 cursor-pointer group flex-1">
          <span className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${active ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
            {label}
          </span>
          {active ? (
            sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-violet-500" /> : <ChevronDown className="w-3 h-3 text-violet-500" />
          ) : (
            <ChevronUp className="w-3 h-3 text-slate-200 opacity-0 group-hover:opacity-100" />
          )}
        </div>
        {onFilter && (
          <TableFilter 
            value={filterValue} 
            onChange={v => onFilter(field, v)} 
            options={options}
            selectedOptions={selectedOptions}
            onToggleOption={opt => onToggleOption(field, opt)}
            isFirst={isFirst} 
          />
        )}
      </div>
    </th>
  )
}
function RowMenu({ onEdit, onDelete, onView }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-lg hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition text-slate-400">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-xl z-20 min-w-[140px] py-1.5 overflow-hidden">
            {onView   && <button onClick={() => { onView();   setOpen(false) }} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-slate-50 text-slate-600"><Eye    className="w-3.5 h-3.5 text-slate-400" /> Visualizar</button>}
            {onEdit   && <button onClick={() => { onEdit();   setOpen(false) }} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-slate-50 text-slate-600"><Pencil className="w-3.5 h-3.5 text-slate-400" /> Editar</button>}
            {onDelete && <button onClick={() => { onDelete(); setOpen(false) }} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /> Excluir</button>}
          </div>
        </>
      )}
    </div>
  )
}

// ─── ColumnSelector ───────────────────────────────────────────────────────────
function ColumnSelector({ columns, visible, onChange, onAddCustom, onRemoveCustom }) {
  const [open, setOpen]       = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (key) => onChange({ ...visible, [key]: !visible[key] })
  const optional = columns.filter(c => !c.required)
  const visCount = optional.filter(c => visible[c.key] !== false).length

  const addCol = () => {
    const label = newLabel.trim()
    if (!label) return
    onAddCustom(label)
    setNewLabel('')
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-medium transition hover:bg-slate-50 ${open ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>
        <Columns className="w-4 h-4" />
        Colunas
        <span className="text-xs font-bold bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full ml-0.5">{visCount}/{optional.length}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-[300] bg-white border border-slate-200 rounded-2xl shadow-xl w-64 overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Colunas visíveis</p>
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {columns.map(col => (
              <div key={col.key} className="flex items-center gap-1">
                <label className={`flex items-center gap-2.5 flex-1 px-3 py-2 rounded-xl cursor-pointer text-sm transition ${col.required ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}>
                  <input
                    type="checkbox"
                    checked={visible[col.key] !== false}
                    disabled={col.required}
                    onChange={() => !col.required && toggle(col.key)}
                    className="w-4 h-4 accent-violet-600 rounded shrink-0"
                  />
                  <span className="text-slate-700 font-medium truncate">{col.label}</span>
                  {col.required && <span className="ml-auto text-[10px] text-slate-300 font-bold shrink-0">FIXO</span>}
                  {col.custom && <span className="ml-auto text-[10px] bg-violet-100 text-violet-500 font-bold px-1.5 py-0.5 rounded shrink-0">custom</span>}
                </label>
                {col.custom && (
                  <button onClick={() => onRemoveCustom(col.key)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Adicionar coluna personalizada */}
          <div className="px-3 py-3 border-t bg-slate-50/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nova coluna personalizada</p>
            <div className="flex gap-1.5">
              <input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCol()}
                placeholder="Nome da coluna..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 bg-white"
              />
              <button onClick={addCol}
                className="px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 transition flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 px-3 py-2.5 border-t">
            <button onClick={() => onChange(Object.fromEntries(columns.map(c => [c.key, true])))}
              className="flex-1 text-xs py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-600 transition">
              Todas
            </button>
            <button onClick={() => onChange(Object.fromEntries(columns.map(c => [c.key, !!c.required])))}
              className="flex-1 text-xs py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-600 transition">
              Mínimo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── column configs base ──────────────────────────────────────────────────────
const CONTACT_BASE_COLS = [
  { key: 'nome',      label: 'Nome',     required: true },
  { key: 'email',     label: 'Email' },
  { key: 'telefone',  label: 'Telefone' },
  { key: 'empresa',   label: 'Empresa' },
  { key: 'estagio',   label: 'Estágio' },
  { key: 'cargo',     label: 'Cargo' },
  { key: 'cidade',    label: 'Cidade' },
  { key: 'estado',    label: 'Estado' },
  { key: 'fonte',     label: 'Fonte' },
  { key: 'tags',      label: 'Tags' },
]
const CONTACT_COLS_DEFAULT = { nome: true, email: true, telefone: true, empresa: true, estagio: true }

const DEAL_BASE_COLS = [
  { key: 'titulo',        label: 'Título',        required: true },
  { key: 'estagio',       label: 'Estágio' },
  { key: 'valor',         label: 'Valor' },
  { key: 'contact_nome',  label: 'Contato' },
  { key: 'data_prevista', label: 'Data prevista' },
  { key: 'empresa',       label: 'Empresa' },
  { key: 'notas',         label: 'Notas' },
]
const DEAL_COLS_DEFAULT = { titulo: true, estagio: true, valor: true, contact_nome: true, data_prevista: true }

const OPP_BASE_COLS = [
  { key: 'lead_nome',         label: 'Lead',          required: true },
  { key: 'empresa',           label: 'Empresa' },
  { key: 'status',            label: 'Status' },
  { key: 'valor',             label: 'Valor' },
  { key: 'probabilidade',     label: 'Prob.' },
  { key: 'responsavel',       label: 'Responsável' },
  { key: 'data_proxima_acao', label: 'Próxima ação' },
  { key: 'email',             label: 'Email' },
  { key: 'telefone',          label: 'Telefone' },
  { key: 'origem',            label: 'Origem' },
  { key: 'etapa_venda',       label: 'Etapa venda' },
]
const OPP_COLS_DEFAULT = { lead_nome: true, empresa: true, status: true, valor: true, probabilidade: true, responsavel: true, data_proxima_acao: true }

// ─── KanbanCard ───────────────────────────────────────────────────────────────
function KanbanCard({ item, labelField, valueField, dateField, onEdit, onDelete, onView }) {
  return (
    <div onClick={() => onView?.(item)}
      className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all cursor-pointer group">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-snug text-slate-800">{item[labelField]}</p>
        <div onClick={e => e.stopPropagation()} className="shrink-0">
          <RowMenu onEdit={() => onEdit(item)} onDelete={() => onDelete(item.id)} />
        </div>
      </div>
      {item.empresa      && <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{item.empresa}</p>}
      {item.contact_nome && <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Users className="w-3 h-3" />{item.contact_nome}</p>}
      {item[valueField] != null && <p className="text-sm font-bold text-emerald-600 mt-2.5">{fmtBRL(item[valueField])}</p>}
      {item[dateField]  && <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(item[dateField])}</p>}
      {item.probabilidade != null && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Probabilidade</span><span className="font-bold">{item.probabilidade}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-violet-400 to-violet-600 rounded-full" style={{ width: `${item.probabilidade}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function PageHeader({ title, subtitle, count, countLabel = 'registro(s)', children }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}{count != null && ` · ${count} ${countLabel}`}</p>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function Toolbar({ search, onSearch, placeholder, filters, onRefresh, view, onView, views, columnSelector }) {
  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder={placeholder || 'Buscar...'}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 bg-white placeholder:text-slate-300 transition" />
        {search && (
          <button onClick={() => onSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-slate-300 hover:text-slate-500" />
          </button>
        )}
      </div>
      {filters}
      <button onClick={onRefresh} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 transition">
        <RefreshCw className="w-4 h-4" />
      </button>
      {columnSelector}
      {views && (
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white">
          {views.map(v => (
            <button key={v.key} onClick={() => onView(v.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-r border-slate-200 last:border-0 transition-all ${view === v.key ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BtnPrimary({ onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 active:scale-95 transition-all shadow-sm shadow-violet-200">
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  )
}

function FormActions({ onCancel, onSave, saving }) {
  return (
    <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-slate-100">
      <button onClick={onCancel} className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-50 transition text-slate-600">Cancelar</button>
      <button onClick={onSave} disabled={saving}
        className="px-6 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50 flex items-center gap-2">
        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
        Salvar
      </button>
    </div>
  )
}

// ─── seção de campos extras no formulário ─────────────────────────────────────
function CustomFieldsSection({ customCols, extras, onChange }) {
  if (!customCols.length) return null
  return (
    <div className="md:col-span-2">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="h-px flex-1 bg-slate-100" />Campos personalizados<span className="h-px flex-1 bg-slate-100" />
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {customCols.map(col => (
          <Field key={col.key} label={col.label}>
            <Inp
              placeholder={col.label}
              value={extras[col.key] || ''}
              onChange={e => onChange({ ...extras, [col.key]: e.target.value })}
            />
          </Field>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function Dashboard() {
  const headers = useHeaders()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/crm/stats`, { headers })
      if (res.ok) setStats(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const cards = stats ? [
    { label: 'Contatos',      value: stats.total_contacts,                      icon: Users,      bg: 'bg-blue-50',    icon_color: 'text-blue-500',    border: 'border-blue-100' },
    { label: 'Leads',         value: stats.total_deals,                         icon: TrendingUp, bg: 'bg-emerald-50', icon_color: 'text-emerald-500', border: 'border-emerald-100' },
    { label: 'Oportunidades', value: stats.total_opportunities,                 icon: TrendingUp, bg: 'bg-violet-50',  icon_color: 'text-violet-500',  border: 'border-violet-100' },
    { label: 'Pipeline',      value: fmtBRL(stats.valor_pipeline) || 'R$ 0,00', icon: BarChart2,  bg: 'bg-amber-50',   icon_color: 'text-amber-500',   border: 'border-amber-100' },
  ] : []

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Visão geral do CRM">
        <button onClick={load} className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 transition"><RefreshCw className="w-4 h-4" /></button>
      </PageHeader>
      {loading ? <Spinner /> : !stats ? null : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((c, i) => (
              <div key={i} className={`bg-white rounded-2xl border ${c.border} p-5`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                    <c.icon className={`w-6 h-6 ${c.icon_color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-black text-slate-800 truncate">{c.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {stats.por_status?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-500" /> Oportunidades por status</h3>
                <div className="space-y-3">
                  {stats.por_status.map(({ status, total }) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-32 truncate shrink-0">{status || '—'}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-violet-400 to-violet-600 rounded-full" style={{ width: stats.total_opportunities ? `${(total / stats.total_opportunities) * 100}%` : '0%' }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-5 text-right shrink-0">{total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.por_estagio_contato?.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-sm text-slate-700 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Contatos por estágio</h3>
                <div className="space-y-3">
                  {stats.por_estagio_contato.map(({ estagio, total }) => (
                    <div key={estagio} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-32 truncate shrink-0">{estagio || '—'}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: stats.total_contacts ? `${(total / stats.total_contacts) * 100}%` : '0%' }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600 w-5 text-right shrink-0">{total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTATOS
// ══════════════════════════════════════════════════════════════════════════════
const ESTAGIOS = ['Lead', 'Contato', 'Negociação', 'Ganho', 'Perdido']
const FONTES   = ['Indicação', 'Site', 'LinkedIn', 'Email', 'Evento', 'Outro']
const ESTAGIO_COLORS = {
  'Lead': 'bg-blue-100 text-blue-700', 'Contato': 'bg-slate-100 text-slate-700',
  'Negociação': 'bg-amber-100 text-amber-700', 'Ganho': 'bg-emerald-100 text-emerald-700', 'Perdido': 'bg-red-100 text-red-700',
}
const EMPTY_CONTACT = { nome: '', email: '', telefone: '', empresa: '', cargo: '', fonte: '', estagio: '', notas: '', linkedin: '', github: '', twitter: '', website: '', avatar_url: '', cidade: '', estado: '', tags: '' }

function ContactDrawer({ contact, onClose, onEdit, onDelete, customCols }) {
  const extras = parseExtras(contact.campos_extras)
  const links = [
    { icon: Linkedin, href: contact.linkedin, label: 'LinkedIn' },
    { icon: Github,   href: contact.github,   label: 'GitHub' },
    { icon: Twitter,  href: contact.twitter,  label: 'Twitter' },
    { icon: Globe,    href: contact.website,  label: 'Website' },
  ].filter(l => l.href)
  const details = [
    { icon: Mail,     label: 'Email',      value: contact.email },
    { icon: Phone,    label: 'Telefone',   value: contact.telefone },
    { icon: Tag,      label: 'Cargo',      value: contact.cargo },
    { icon: Activity, label: 'Fonte',      value: contact.fonte },
    { icon: MapPin,   label: 'Localização',value: [contact.cidade, contact.estado].filter(Boolean).join(', ') },
    { icon: Calendar, label: 'Criado em',  value: fmtDateTime(contact.criado_em) },
  ].filter(d => d.value)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b flex items-start justify-between shrink-0 bg-gradient-to-r from-violet-50 to-slate-50">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 font-black text-xl flex items-center justify-center uppercase shrink-0">{String(contact.nome)[0]}</div>
          <div>
            <h3 className="font-bold text-lg text-slate-800 leading-tight">{contact.nome}</h3>
            {contact.cargo   && <p className="text-sm text-slate-500 mt-0.5">{contact.cargo}</p>}
            {contact.empresa && <p className="text-xs text-slate-400">{contact.empresa}</p>}
            {contact.estagio && <div className="mt-2"><Badge label={contact.estagio} color={ESTAGIO_COLORS[contact.estagio] || 'bg-slate-100 text-slate-600'} /></div>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/80 transition"><X className="w-5 h-5 text-slate-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {links.length > 0 && (
          <div className="px-6 py-4 border-b flex gap-2 flex-wrap">
            {links.map(({ icon: Icon, href, label }) => (
              <a key={label} href={href.startsWith('http') ? href : `https://${href}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-600 transition">
                <Icon className="w-3.5 h-3.5" /> {label}
              </a>
            ))}
          </div>
        )}
        <div className="px-6 py-4 space-y-4 border-b">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5"><Icon className="w-4 h-4 text-slate-400" /></div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{label}</p>
                <p className="text-sm text-slate-700 mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>
        {customCols.length > 0 && Object.keys(extras).length > 0 && (
          <div className="px-6 py-4 border-b">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-3">Campos personalizados</p>
            <div className="space-y-2">
              {customCols.filter(c => extras[c.key]).map(col => (
                <div key={col.key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{col.label}</p>
                  <p className="text-sm text-slate-700 mt-0.5">{extras[col.key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {contact.tags && (
          <div className="px-6 py-4 border-b">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                <span key={tag} className="px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg text-xs font-semibold border border-violet-100">{tag}</span>
              ))}
            </div>
          </div>
        )}
        {contact.notas && (
          <div className="px-6 py-4">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-2">Notas</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">{contact.notas}</p>
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t flex gap-2 shrink-0 bg-slate-50/50">
        <button onClick={() => onEdit(contact)} className="flex-1 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition text-slate-700">
          <Pencil className="w-4 h-4" /> Editar
        </button>
        <button onClick={() => { onDelete(contact.id); onClose() }} className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function Contatos() {
  const headers = useHeaders()
  const [rows, setRows]             = useState([])
  const [loading, setLoading]       = useState(false)
  const [search, setSearch]         = useState('')
  const [estagioFilter, setEstagio] = useState('')
  const [sortField, setSort]        = useState('id')
  const [sortDir, setSortDir]       = useState('desc')
  const [drawer, setDrawer]         = useState(null)
  const [modal, setModal]           = useState(null)
  const [form, setForm]             = useState(EMPTY_CONTACT)
  const [extras, setExtras]         = useState({})
  const [view, setView]             = useState('table')
  const [saving, setSaving]         = useState(false)
  const [visCols, setVisCols]       = useState(CONTACT_COLS_DEFAULT)
  const [customCols, addCustomCol, removeCustomCol] = useCustomCols('crm_custom_cols_contatos')
  const [colFilters, setColFilters] = useState({})
  const [colSelected, setColSelected] = useState({})

  const allCols = [...CONTACT_BASE_COLS, ...customCols]

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('q', search)
    if (estagioFilter) p.set('estagio', estagioFilter)
    const res = await fetch(`${API}/api/crm/contacts?${p}`, { headers })
    const data = await res.json()
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [search, estagioFilter])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setForm(EMPTY_CONTACT); setExtras({}); setModal('new') }
  const openEdit = (c) => {
    setForm({ nome: c.nome||'', email: c.email||'', telefone: c.telefone||'', empresa: c.empresa||'', cargo: c.cargo||'', fonte: c.fonte||'', notas: c.notas||'', linkedin: c.linkedin||'', github: c.github||'', twitter: c.twitter||'', website: c.website||'', avatar_url: c.avatar_url||'', cidade: c.cidade||'', estado: c.estado||'', tags: c.tags||'', estagio: c.estagio||'' })
    setExtras(parseExtras(c.campos_extras))
    setModal(c)
  }

  const save = async () => {
    if (!form.nome.trim()) return alert('Informe o nome')
    setSaving(true)
    const isEdit = modal !== 'new'
    const res = await fetch(
      isEdit ? `${API}/api/crm/contacts/${modal.id}` : `${API}/api/crm/contacts`,
      { method: isEdit ? 'PUT' : 'POST', headers, body: JSON.stringify({ ...form, campos_extras: JSON.stringify(extras) }) }
    )
    setSaving(false)
    if (!res.ok) return alert('Erro ao salvar')
    setModal(null); load()
  }

  const del = async (id) => {
    if (!confirm('Excluir este contato?')) return
    await fetch(`${API}/api/crm/contacts/${id}`, { method: 'DELETE', headers })
    setDrawer(null); load()
  }

  const onSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(field); setSortDir('asc') }
  }

  const onToggleOption = (field, opt) => {
    if (opt === '__CLEAR__') {
      setColSelected(prev => { const n = { ...prev }; delete n[field]; return n })
      return
    }
    setColSelected(prev => {
      const current = prev[field] || []
      const next = current.includes(opt) ? current.filter(o => o !== opt) : [...current, opt]
      return { ...prev, [field]: next }
    })
  }


  const filteredRows = useMemo(() => {
            return rows.filter(r => {
      const passText = Object.entries(colFilters).every(([f, v]) => {
        if (!v) return true
        let val = ''
        if (f.startsWith('cx_')) val = parseExtras(r.campos_extras)[f] || ''
        else val = r[f] || ''
        return String(val).toLowerCase().includes(v.toLowerCase())
      })
      if (!passText) return false
      const passSelected = Object.entries(colSelected).every(([f, selected]) => {
        if (!selected || selected.length === 0) return true
        let val = ''
        if (f.startsWith('cx_')) val = parseExtras(r.campos_extras)[f] || ''
        else val = r[f] || ''
        return selected.includes(String(val || ''))
      })
      return passSelected
    })
  }, [rows, colFilters])

  const sorted = useMemo(() => [...filteredRows].sort((a, b) => {
    const va = String(a[sortField] ?? '').toLowerCase()
    const vb = String(b[sortField] ?? '').toLowerCase()
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  }), [filteredRows, sortField, sortDir])

  const grouped = useMemo(() => ESTAGIOS.reduce((acc, e) => { acc[e] = rows.filter(c => c.estagio === e); return acc }, {}), [rows])
  const activeCols = allCols.filter(c => visCols[c.key] !== false)
  const sp = { sortField, sortDir, onSort }

  const renderCell = (c, col) => {
    if (col.custom) {
      const val = parseExtras(c.campos_extras)[col.key]
      return val ? <span className="text-slate-500">{val}</span> : <span className="text-slate-200">—</span>
    }
    switch (col.key) {
      case 'nome':    return <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center uppercase shrink-0">{String(c.nome)[0]}</div><span className="font-semibold text-slate-700">{c.nome}</span></div>
      case 'estagio': return c.estagio ? <Badge label={c.estagio} color={ESTAGIO_COLORS[c.estagio] || 'bg-slate-100 text-slate-600'} /> : <span className="text-slate-200">—</span>
      case 'tags':    return c.tags ? <div className="flex flex-wrap gap-1">{c.tags.split(',').map(t=>t.trim()).filter(Boolean).map(t=><span key={t} className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded text-[11px] font-semibold">{t}</span>)}</div> : <span className="text-slate-200">—</span>
      default:        return c[col.key] ? <span className="text-slate-500">{c[col.key]}</span> : <span className="text-slate-200">—</span>
    }
  }

  const handleRemoveCustom = (key) => {
    removeCustomCol(key)
    const next = { ...visCols }; delete next[key]; setVisCols(next)
  }

  return (
    <div>
      <PageHeader title="Contatos" count={rows.length}>
        <BtnPrimary onClick={openNew} icon={Plus}>Novo contato</BtnPrimary>
      </PageHeader>
      <Toolbar search={search} onSearch={setSearch} placeholder="Buscar nome, email, empresa..."
        onRefresh={load} view={view} onView={setView}
        views={[{ key: 'table', label: 'Tabela' }, { key: 'kanban', label: 'Kanban' }]}
        columnSelector={view === 'table' && <ColumnSelector columns={allCols} visible={visCols} onChange={setVisCols} onAddCustom={addCustomCol} onRemoveCustom={handleRemoveCustom} />}
        filters={
          <Sel value={estagioFilter} onChange={e => setEstagio(e.target.value)} style={{ width: 165 }}>
            <option value="">Todos os estágios</option>
            {ESTAGIOS.map(e => <option key={e} value={e}>{e}</option>)}
          </Sel>
        }
      />
      {loading ? <Spinner /> : view === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  {activeCols.map((col, idx) => {
                    const options = Array.from(new Set(rows.map(r => {
                      if (col.key.startsWith('cx_')) return String(parseExtras(r.campos_extras)[col.key] || '')
                      return String(r[col.key] || '')
                    }))).sort()
                    return (
                      <Th 
                        key={col.key} 
                        label={col.label} 
                        field={col.key} 
                        {...sp} 
                        isFirst={idx === 0} 
                        filterValue={colFilters[col.key]} 
                        onFilter={(f, v) => setColFilters(prev => ({ ...prev, [f]: v }))}
                        options={options}
                        selectedOptions={colSelected[col.key] || []}
                        onToggleOption={onToggleOption}
                      />
                    )
                  })}
                  <th className="px-4 py-3.5 border-b border-slate-100 w-10" />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={activeCols.length + 1}><Empty msg="Nenhum contato encontrado" icon={Users} /></td></tr>
                ) : sorted.map(c => (
                  <tr key={c.id} onClick={() => setDrawer(c)} className="border-t border-slate-50 hover:bg-violet-50/30 transition-colors group cursor-pointer">
                    {activeCols.map(col => <td key={col.key} className="px-4 py-3.5">{renderCell(c, col)}</td>)}
                    <td className="px-4 py-3.5"><RowMenu onView={() => setDrawer(c)} onEdit={() => openEdit(c)} onDelete={() => del(c.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {ESTAGIOS.map(estagio => (
            <div key={estagio} className="w-64 shrink-0">
              <div className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex justify-between items-center ${ESTAGIO_COLORS[estagio] || 'bg-slate-100 text-slate-700'}`}>
                <span>{estagio}</span><span className="bg-white/60 px-1.5 py-0.5 rounded-full">{grouped[estagio]?.length || 0}</span>
              </div>
              <div className="bg-slate-50/80 border border-t-0 border-slate-200 rounded-b-xl p-2 space-y-2 min-h-[160px]">
                {!(grouped[estagio]?.length) ? <div className="text-center py-8 text-xs text-slate-300">Nenhum contato</div>
                  : grouped[estagio].map(c => <KanbanCard key={c.id} item={c} labelField="nome" dateField={null} onEdit={openEdit} onDelete={del} onView={setDrawer} />)}
              </div>
            </div>
          ))}
        </div>
      )}
      <Drawer open={!!drawer} onClose={() => setDrawer(null)}>
        {drawer && <ContactDrawer contact={drawer} customCols={customCols} onClose={() => setDrawer(null)} onEdit={c => { openEdit(c); setDrawer(null) }} onDelete={del} />}
      </Drawer>
      {modal && (
        <Modal title={modal === 'new' ? 'Novo Contato' : 'Editar Contato'} subtitle="Preencha os dados do contato" onClose={() => setModal(null)} size="max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome" required><Inp placeholder="Nome completo" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></Field>
            <Field label="Email"><Inp type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Telefone"><Inp placeholder="(11) 99999-9999" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></Field>
            <Field label="Empresa"><Inp placeholder="Nome da empresa" value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} /></Field>
            <Field label="Cargo"><Inp placeholder="Ex: Diretor Comercial" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></Field>
            <Field label="Fonte"><Sel value={form.fonte} onChange={e => setForm({ ...form, fonte: e.target.value })}><option value="">Selecione...</option>{FONTES.map(f => <option key={f} value={f}>{f}</option>)}</Sel></Field>
            <Field label="Estágio"><Sel value={form.estagio} onChange={e => setForm({ ...form, estagio: e.target.value })}>{ESTAGIOS.map(e => <option key={e} value={e}>{e}</option>)}</Sel></Field>
            <Field label="Cidade"><Inp placeholder="São Paulo" value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} /></Field>
            <Field label="Estado"><Inp placeholder="SP" maxLength={2} value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} /></Field>
            <div className="md:col-span-2">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><span className="h-px flex-1 bg-slate-100" />Redes sociais<span className="h-px flex-1 bg-slate-100" /></p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="LinkedIn"><Inp placeholder="linkedin.com/in/..." value={form.linkedin} onChange={e => setForm({ ...form, linkedin: e.target.value })} /></Field>
                <Field label="GitHub"><Inp placeholder="github.com/..." value={form.github} onChange={e => setForm({ ...form, github: e.target.value })} /></Field>
                <Field label="Twitter / X"><Inp placeholder="twitter.com/..." value={form.twitter} onChange={e => setForm({ ...form, twitter: e.target.value })} /></Field>
                <Field label="Website"><Inp placeholder="https://..." value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></Field>
              </div>
            </div>
            <Field label="Tags (separadas por vírgula)"><Inp placeholder="cliente, vip, parceiro" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} /></Field>
            <Field label="Avatar URL"><Inp placeholder="https://..." value={form.avatar_url} onChange={e => setForm({ ...form, avatar_url: e.target.value })} /></Field>
            <div className="md:col-span-2"><Field label="Notas"><Txta rows={3} placeholder="Observações..." value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></Field></div>
            <CustomFieldsSection customCols={customCols} extras={extras} onChange={setExtras} />
          </div>
          <FormActions onCancel={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// DEALS
// ══════════════════════════════════════════════════════════════════════════════
const DEAL_ESTAGIOS = ['Novo', 'Qualificação', 'Proposta', 'Negociação', 'Ganho', 'Perdido']
const DEAL_COLORS   = { 'Novo': 'bg-slate-100 text-slate-700', 'Qualificação': 'bg-blue-100 text-blue-700', 'Proposta': 'bg-violet-100 text-violet-700', 'Negociação': 'bg-amber-100 text-amber-700', 'Ganho': 'bg-emerald-100 text-emerald-700', 'Perdido': 'bg-red-100 text-red-700' }
const EMPTY_DEAL = { titulo: '', contato_id: '', empresa_id: '', valor: '', estagio: 'Novo', data_prevista: '', notas: '' }

function DealDrawer({ deal, onClose, onEdit, onDelete, customCols }) {
  const extras = parseExtras(deal.campos_extras)
  const details = [
    { icon: DollarSign, label: 'Valor',        value: fmtBRL(deal.valor) },
    { icon: Users,      label: 'Contato',       value: deal.contact_nome },
    { icon: Calendar,   label: 'Data prevista', value: fmtDate(deal.data_prevista) },
    { icon: Clock,      label: 'Criado em',     value: fmtDateTime(deal.criado_em) },
  ].filter(d => d.value)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b flex items-start justify-between shrink-0 bg-gradient-to-r from-emerald-50 to-slate-50">
        <div>
          <h3 className="font-bold text-lg text-slate-800 leading-tight">{deal.titulo}</h3>
          <div className="mt-2"><Badge label={deal.estagio || '—'} color={DEAL_COLORS[deal.estagio] || DEAL_COLORS['Novo']} /></div>
          {deal.valor && <p className="text-2xl font-black text-emerald-600 mt-2">{fmtBRL(deal.valor)}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/80 transition"><X className="w-5 h-5 text-slate-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 space-y-4 border-b">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-slate-400" /></div>
              <div><p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">{label}</p><p className="text-sm text-slate-700 mt-0.5">{value}</p></div>
            </div>
          ))}
        </div>
        {customCols.length > 0 && Object.keys(extras).length > 0 && (
          <div className="px-6 py-4 border-b">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-3">Campos personalizados</p>
            <div className="space-y-2">
              {customCols.filter(c => extras[c.key]).map(col => (
                <div key={col.key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{col.label}</p>
                  <p className="text-sm text-slate-700 mt-0.5">{extras[col.key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {deal.notas && (
          <div className="px-6 py-4">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-2">Notas</p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 rounded-xl p-3 border">{deal.notas}</p>
          </div>
        )}
      </div>
      <div className="px-6 py-4 border-t flex gap-2 shrink-0 bg-slate-50/50">
        <button onClick={() => onEdit(deal)} className="flex-1 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition text-slate-700"><Pencil className="w-4 h-4" /> Editar</button>
        <button onClick={() => { onDelete(deal.id); onClose() }} className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

function Deals() {
  const headers = useHeaders()
  const [rows, setRows]         = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [estFilter, setEst]     = useState('')
  const [sortField, setSort]    = useState('id')
  const [sortDir, setSortDir]   = useState('desc')
  const [view, setView]         = useState('kanban')
  const [drawer, setDrawer]     = useState(null)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY_DEAL)
  const [extras, setExtras]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [visCols, setVisCols]   = useState(DEAL_COLS_DEFAULT)
  const [customCols, addCustomCol, removeCustomCol] = useCustomCols('crm_custom_cols_deals')

  const allCols = [...DEAL_BASE_COLS, ...customCols]

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('q', search)
    if (estFilter) p.set('estagio', estFilter)
    const [r1, r2] = await Promise.all([
      fetch(`${API}/api/crm/deals?${p}`, { headers }),
      fetch(`${API}/api/crm/contacts`, { headers }),
    ])
    const d1 = await r1.json(); setRows(Array.isArray(d1) ? d1 : [])
    const d2 = await r2.json(); setContacts(Array.isArray(d2) ? d2 : [])
    setLoading(false)
  }, [search, estFilter])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setForm(EMPTY_DEAL); setExtras({}); setModal('new') }
  const openEdit = (d) => {
    setForm({ titulo: d.titulo||'', contato_id: d.contato_id||'', empresa_id: d.empresa_id||'', valor: d.valor??'', estagio: d.estagio||'Novo', data_prevista: d.data_prevista||'', notas: d.notas||'' })
    setExtras(parseExtras(d.campos_extras))
    setModal(d)
  }

  const save = async () => {
    if (!form.titulo.trim()) return alert('Informe o título')
    setSaving(true)
    const isEdit = modal !== 'new'
    const res = await fetch(
      isEdit ? `${API}/api/crm/deals/${modal.id}` : `${API}/api/crm/deals`,
      { method: isEdit ? 'PUT' : 'POST', headers, body: JSON.stringify({ ...form, campos_extras: JSON.stringify(extras) }) }
    )
    setSaving(false)
    if (!res.ok) return alert('Erro ao salvar')
    setModal(null); load()
  }

  const del = async (id) => {
    if (!confirm('Excluir?')) return
    await fetch(`${API}/api/crm/deals/${id}`, { method: 'DELETE', headers })
    setDrawer(null); load()
  }

  const moveStage = async (id, estagio) => {
    await fetch(`${API}/api/crm/deals/${id}`, { method: 'PUT', headers, body: JSON.stringify({ estagio }) })
    load()
  }

  const onSort = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSort(f); setSortDir('asc') }
  }

  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const va = String(a[sortField]??'').toLowerCase(); const vb = String(b[sortField]??'').toLowerCase()
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  }), [rows, sortField, sortDir])

  const grouped = useMemo(() => DEAL_ESTAGIOS.reduce((acc, e) => { acc[e] = rows.filter(d => d.estagio === e); return acc }, {}), [rows])
  const totalPipeline = rows.reduce((s, d) => s + (d.valor || 0), 0)
  const activeCols = allCols.filter(c => visCols[c.key] !== false)
  const sp = { sortField, sortDir, onSort }

  const renderCell = (d, col) => {
    if (col.custom) {
      const val = parseExtras(d.campos_extras)[col.key]
      return val ? <span className="text-slate-500">{val}</span> : <span className="text-slate-200">—</span>
    }
    switch (col.key) {
      case 'titulo':        return <span className="font-semibold text-slate-700">{d.titulo}</span>
      case 'estagio':       return <select value={d.estagio||'Novo'} onChange={e=>{e.stopPropagation();moveStage(d.id,e.target.value)}} onClick={e=>e.stopPropagation()} className={`px-2.5 py-1 rounded-full text-xs font-bold border-0 cursor-pointer ${DEAL_COLORS[d.estagio]||DEAL_COLORS['Novo']}`}>{DEAL_ESTAGIOS.map(s=><option key={s} value={s}>{s}</option>)}</select>
      case 'valor':         return d.valor ? <span className="text-emerald-600 font-semibold">{fmtBRL(d.valor)}</span> : <span className="text-slate-200">—</span>
      case 'contact_nome':  return d.contact_nome ? <span className="text-slate-500">{d.contact_nome}</span> : <span className="text-slate-200">—</span>
      case 'data_prevista': return d.data_prevista ? <span className="text-slate-500">{fmtDate(d.data_prevista)}</span> : <span className="text-slate-200">—</span>
      case 'notas':         return d.notas ? <span className="text-slate-400 text-xs truncate max-w-[160px] block">{d.notas}</span> : <span className="text-slate-200">—</span>
      default:              return d[col.key] ? <span className="text-slate-500">{d[col.key]}</span> : <span className="text-slate-200">—</span>
    }
  }

  const handleRemoveCustom = (key) => {
    removeCustomCol(key); const next = { ...visCols }; delete next[key]; setVisCols(next)
  }

  return (
    <div>
      <PageHeader title="Negócios" subtitle={`Pipeline: ${fmtBRL(totalPipeline)||'R$ 0,00'}`} count={rows.length} countLabel="negócio(s)">
        <BtnPrimary onClick={openNew} icon={Plus}>Novo negócio</BtnPrimary>
      </PageHeader>
      <Toolbar search={search} onSearch={setSearch} placeholder="Buscar negócio..." onRefresh={load} view={view} onView={setView}
        views={[{ key: 'kanban', label: 'Kanban' }, { key: 'table', label: 'Tabela' }]}
        columnSelector={view === 'table' && <ColumnSelector columns={allCols} visible={visCols} onChange={setVisCols} onAddCustom={addCustomCol} onRemoveCustom={handleRemoveCustom} />}
        filters={<Sel value={estFilter} onChange={e=>setEst(e.target.value)} style={{width:165}}><option value="">Todos os estágios</option>{DEAL_ESTAGIOS.map(e=><option key={e} value={e}>{e}</option>)}</Sel>}
      />
      {loading ? <Spinner /> : view === 'kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {DEAL_ESTAGIOS.map(estagio => (
            <div key={estagio} className="w-64 shrink-0">
              <div className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex justify-between items-center ${DEAL_COLORS[estagio]}`}>
                <span>{estagio}</span><span className="bg-white/60 px-1.5 py-0.5 rounded-full">{grouped[estagio]?.length||0}</span>
              </div>
              <div className="bg-slate-50/80 border border-t-0 border-slate-200 rounded-b-xl p-2 space-y-2 min-h-[160px]">
                {!(grouped[estagio]?.length) ? <div className="text-center py-8 text-xs text-slate-300">Nenhum negócio</div>
                  : grouped[estagio].map(d => (
                    <div key={d.id}>
                      <KanbanCard item={d} labelField="titulo" valueField="valor" dateField="data_prevista" onEdit={openEdit} onDelete={del} onView={setDrawer} />
                      <div className="flex gap-1 mt-1 flex-wrap px-0.5">
                        {DEAL_ESTAGIOS.filter(s=>s!==estagio).map(s=>(
                          <button key={s} onClick={()=>moveStage(d.id,s)} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border border-white/50 ${DEAL_COLORS[s]} hover:opacity-80 transition`}>→ {s}</button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  {activeCols.map((col, idx) => {
                    const options = Array.from(new Set(rows.map(r => {
                      if (col.key.startsWith('cx_')) return String(parseExtras(r.campos_extras)[col.key] || '')
                      return String(r[col.key] || '')
                    }))).sort()
                    return (
                      <Th 
                        key={col.key} 
                        label={col.label} 
                        field={col.key} 
                        {...sp} 
                        isFirst={idx === 0} 
                        filterValue={colFilters[col.key]} 
                        onFilter={(f, v) => setColFilters(prev => ({ ...prev, [f]: v }))}
                        options={options}
                        selectedOptions={colSelected[col.key] || []}
                        onToggleOption={onToggleOption}
                      />
                    )
                  })}
                  <th className="px-4 py-3.5 border-b border-slate-100 w-10" />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? <tr><td colSpan={activeCols.length+1}><Empty msg="Nenhum negócio encontrado" icon={DollarSign} /></td></tr>
                  : sorted.map(d => (
                    <tr key={d.id} onClick={()=>setDrawer(d)} className="border-t border-slate-50 hover:bg-emerald-50/20 transition-colors group cursor-pointer">
                      {activeCols.map(col => <td key={col.key} className="px-4 py-3.5">{renderCell(d,col)}</td>)}
                      <td className="px-4 py-3.5"><RowMenu onView={()=>setDrawer(d)} onEdit={()=>openEdit(d)} onDelete={()=>del(d.id)} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Drawer open={!!drawer} onClose={() => setDrawer(null)}>
        {drawer && <DealDrawer deal={drawer} customCols={customCols} onClose={()=>setDrawer(null)} onEdit={d=>{openEdit(d);setDrawer(null)}} onDelete={del} />}
      </Drawer>
      {modal && (
        <Modal title={modal==='new'?'Novo Negócio':'Editar Negócio'} subtitle="Preencha os dados" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <Field label="Título" required><Inp placeholder="Ex: Contrato anual TI" value={form.titulo} onChange={e=>setForm({...form,titulo:e.target.value})} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Estágio"><Sel value={form.estagio} onChange={e=>setForm({...form,estagio:e.target.value})}>{DEAL_ESTAGIOS.map(e=><option key={e} value={e}>{e}</option>)}</Sel></Field>
              <Field label="Valor (R$)"><Inp type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} /></Field>
            </div>
            <Field label="Contato vinculado"><Sel value={form.contato_id} onChange={e=>setForm({...form,contato_id:e.target.value})}><option value="">Nenhum</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</Sel></Field>
            <Field label="Data prevista"><Inp type="date" value={form.data_prevista} onChange={e=>setForm({...form,data_prevista:e.target.value})} /></Field>
            <Field label="Notas"><Txta rows={3} placeholder="Observações..." value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} /></Field>
            <CustomFieldsSection customCols={customCols} extras={extras} onChange={setExtras} />
          </div>
          <FormActions onCancel={()=>setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// OPORTUNIDADES
// ══════════════════════════════════════════════════════════════════════════════
const EMPTY_OPP = { lead_nome:'',empresa:'',email:'',telefone:'',status:'',responsavel:'',valor:'',probabilidade:'',origem:'',proxima_acao:'',data_proxima_acao:'',etapa_venda:'',observacao:'' }

function OppDrawer({ opp, statuses, headers, onClose, onEdit, onDelete, onUpdated, customCols }) {
  const extras = parseExtras(opp.campos_extras)
  const [acts, setActs]    = useState([])
  const [activity, setAct] = useState({ tipo:'follow-up', descricao:'', novo_status:opp.status, novo_valor:opp.valor||'', responsavel:opp.responsavel||'' })
  const [saving, setSaving] = useState(false)

  const loadActs = useCallback(async () => {
    const res = await fetch(`${API}/api/crm/opportunities/${opp.id}/activities`, { headers })
    if (res.ok) setActs(await res.json())
  }, [opp.id])

  useEffect(() => { loadActs(); setAct({tipo:'follow-up',descricao:'',novo_status:opp.status,novo_valor:opp.valor||'',responsavel:opp.responsavel||''}) }, [opp.id])

  const saveAct = async () => {
    setSaving(true)
    const res = await fetch(`${API}/api/crm/opportunities/${opp.id}/activities`, { method:'POST', headers, body:JSON.stringify(activity) })
    if (!res.ok) { setSaving(false); return alert('Erro') }
    await loadActs()
    const r2 = await fetch(`${API}/api/crm/opportunities/${opp.id}`, { headers })
    if (r2.ok) onUpdated(await r2.json())
    setAct({...activity, descricao:''})
    setSaving(false)
  }

  const TIPO_ICONS = { 'follow-up':Clock, 'ligacao':Phone, 'reuniao':Users, 'proposta':Tag, 'fechamento':Check, 'nota':AlertCircle }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b flex items-start justify-between shrink-0 bg-gradient-to-r from-violet-50 to-slate-50">
        <div>
          <h3 className="font-bold text-lg text-slate-800 leading-tight">{opp.lead_nome}</h3>
          {opp.empresa && <p className="text-sm text-slate-400 mt-0.5">{opp.empresa}</p>}
          <div className="mt-2 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">{opp.status}</span>
            {opp.valor && <span className="text-sm font-bold text-emerald-600">{fmtBRL(opp.valor)}</span>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/80 transition"><X className="w-5 h-5 text-slate-400" /></button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4 grid grid-cols-2 gap-3 border-b">
          {[{label:'Email',value:opp.email},{label:'Telefone',value:opp.telefone},{label:'Responsável',value:opp.responsavel},{label:'Probabilidade',value:opp.probabilidade!=null?`${opp.probabilidade}%`:null},{label:'Origem',value:opp.origem},{label:'Próxima ação',value:fmtDate(opp.data_proxima_acao)}].filter(d=>d.value).map(({label,value})=>(
            <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
              <p className="text-sm text-slate-700 font-semibold mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
        {customCols.length > 0 && Object.keys(extras).length > 0 && (
          <div className="px-6 py-4 border-b">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wide mb-3">Campos personalizados</p>
            <div className="grid grid-cols-2 gap-2">
              {customCols.filter(c=>extras[c.key]).map(col=>(
                <div key={col.key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{col.label}</p>
                  <p className="text-sm text-slate-700 mt-0.5">{extras[col.key]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="px-6 py-4 border-b space-y-3 bg-violet-50/30">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Registrar atividade</p>
          <div className="grid grid-cols-2 gap-2">
            <Sel value={activity.tipo} onChange={e=>setAct({...activity,tipo:e.target.value})}>{['follow-up','ligacao','reuniao','proposta','fechamento','nota'].map(t=><option key={t} value={t}>{t}</option>)}</Sel>
            <Sel value={activity.novo_status} onChange={e=>setAct({...activity,novo_status:e.target.value})}>{statuses.map(s=><option key={s.id} value={s.nome}>{s.nome}</option>)}</Sel>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Inp type="number" step="0.01" min="0" placeholder="Novo valor (R$)" value={activity.novo_valor} onChange={e=>setAct({...activity,novo_valor:e.target.value})} />
            <Inp placeholder="Responsável" value={activity.responsavel} onChange={e=>setAct({...activity,responsavel:e.target.value})} />
          </div>
          <Txta rows={2} placeholder="Descreva a atividade..." value={activity.descricao} onChange={e=>setAct({...activity,descricao:e.target.value})} />
          <button onClick={saveAct} disabled={saving} className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />} Salvar atividade
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Histórico ({acts.length})</p>
          {acts.length === 0 ? <p className="text-sm text-slate-300 text-center py-4">Sem atividades registradas</p>
            : acts.map(a => {
              const Icon = TIPO_ICONS[a.tipo] || Tag
              return (
                <div key={a.id} className="mb-2.5 p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Icon className="w-3.5 h-3.5 text-violet-500" /><span className="text-xs font-bold uppercase text-violet-600">{a.tipo}</span></div>
                    <span className="text-[11px] text-slate-400">{fmtDateTime(a.criado_em)}</span>
                  </div>
                  {a.descricao && <p className="text-sm mt-1.5 text-slate-600">{a.descricao}</p>}
                  <div className="text-xs text-slate-400 mt-1 flex gap-3 flex-wrap">
                    {a.novo_status && <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-semibold">{a.novo_status}</span>}
                    {a.novo_valor != null && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-semibold">{fmtBRL(a.novo_valor)}</span>}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
      <div className="px-6 py-4 border-t flex gap-2 shrink-0 bg-slate-50/50">
        <button onClick={()=>onEdit(opp)} className="flex-1 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold hover:bg-slate-50 flex items-center justify-center gap-2 transition text-slate-700"><Pencil className="w-4 h-4" /> Editar</button>
        <button onClick={()=>{onDelete(opp.id);onClose()}} className="px-4 py-2.5 border border-red-200 text-red-500 rounded-xl text-sm font-semibold hover:bg-red-50 transition"><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

function Oportunidades() {
  const headers = useHeaders()
  const [rows, setRows]         = useState([])
  const [statuses, setStatuses] = useState([])
  const [loading, setLoading]   = useState(false)
  const [search, setSearch]     = useState('')
  const [stFilter, setSt]       = useState('')
  const [sortField, setSort]    = useState('id')
  const [sortDir, setSortDir]   = useState('desc')
  const [view, setView]         = useState('kanban')
  const [drawer, setDrawer]     = useState(null)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(EMPTY_OPP)
  const [extras, setExtras]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [visCols, setVisCols]   = useState(OPP_COLS_DEFAULT)
  const [customCols, addCustomCol, removeCustomCol] = useCustomCols('crm_custom_cols_oportunidades')
  const [colFilters, setColFilters] = useState({})

  const allCols = [...OPP_BASE_COLS, ...customCols]

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('q', search)
    if (stFilter) p.set('status', stFilter)
    const [r1, r2] = await Promise.all([
      fetch(`${API}/api/crm/opportunities?${p}`, { headers }),
      fetch(`${API}/api/crm/statuses`, { headers }),
    ])
    const d1 = await r1.json(); setRows(Array.isArray(d1) ? d1 : [])
    const d2 = await r2.json(); setStatuses(Array.isArray(d2) ? d2 : [])
    setLoading(false)
  }, [search, stFilter])

  useEffect(() => { load() }, [load])

  const openNew  = (status='') => { setForm({...EMPTY_OPP, status: status||statuses[0]?.nome||''}); setExtras({}); setModal('new') }
  const openEdit = (o) => {
    setForm({ lead_nome:o.lead_nome||'', empresa:o.empresa||'', email:o.email||'', telefone:o.telefone||'', status:o.status||'', responsavel:o.responsavel||'', valor:o.valor??'', probabilidade:o.probabilidade??'', origem:o.origem||'', proxima_acao:o.proxima_acao||'', data_proxima_acao:o.data_proxima_acao||'', etapa_venda:o.etapa_venda||'', observacao:o.observacao||'' })
    setExtras(parseExtras(o.campos_extras))
    setModal(o)
  }

  const save = async () => {
    if (!form.lead_nome.trim()) return alert('Informe o nome do lead')
    setSaving(true)
    const isEdit = modal !== 'new'
    const res = await fetch(
      isEdit ? `${API}/api/crm/opportunities/${modal.id}` : `${API}/api/crm/opportunities`,
      { method: isEdit?'PUT':'POST', headers, body: JSON.stringify({...form, campos_extras: JSON.stringify(extras)}) }
    )
    setSaving(false)
    if (!res.ok) return alert('Erro ao salvar')
    setModal(null); load()
  }

  const del = async (id) => {
    if (!confirm('Excluir?')) return
    await fetch(`${API}/api/crm/opportunities/${id}`, { method:'DELETE', headers })
    setDrawer(null); load()
  }

  const moveStatus = async (id, status) => {
    await fetch(`${API}/api/crm/opportunities/${id}`, { method:'PUT', headers, body:JSON.stringify({status}) })
    load()
  }

  const onSort = (f) => {
    if (sortField===f) setSortDir(d=>d==='asc'?'desc':'asc')
    else { setSort(f); setSortDir('asc') }
  }

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      return Object.entries(colFilters).every(([f, v]) => {
        if (!v) return true
        let val = ''
        if (f.startsWith('cx_')) {
          val = parseExtras(r.campos_extras)[f] || ''
        } else {
          val = r[f] || ''
        }
        return String(val).toLowerCase().includes(v.toLowerCase())
      })
    })
  }, [rows, colFilters])

  const sorted = useMemo(() => [...filteredRows].sort((a,b) => {
    const va = String(a[sortField]??'').toLowerCase(); const vb = String(b[sortField]??'').toLowerCase()
    return sortDir==='asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  }), [filteredRows, sortField, sortDir])

  const grouped = useMemo(() => statuses.reduce((acc,s) => { acc[s.nome]=rows.filter(o=>o.status===s.nome); return acc }, {}), [rows,statuses])
  const totalPipeline = rows.reduce((s,o) => s+(o.valor||0), 0)
  const activeCols = allCols.filter(c => visCols[c.key] !== false)
  const sp = { sortField, sortDir, onSort }

  const renderCell = (o, col) => {
    if (col.custom) {
      const val = parseExtras(o.campos_extras)[col.key]
      return val ? <span className="text-slate-500">{val}</span> : <span className="text-slate-200">—</span>
    }
    switch (col.key) {
      case 'lead_nome':         return <span className="font-semibold text-slate-700">{o.lead_nome}</span>
      case 'empresa':           return o.empresa ? <span className="text-slate-500">{o.empresa}</span> : <span className="text-slate-200">—</span>
      case 'status':            return <select value={o.status} onChange={e=>{e.stopPropagation();moveStatus(o.id,e.target.value)}} onClick={e=>e.stopPropagation()} className="px-2.5 py-1 rounded-full text-xs font-bold border-0 cursor-pointer bg-violet-100 text-violet-700">{statuses.map(s=><option key={s.id} value={s.nome}>{s.nome}</option>)}</select>
      case 'valor':             return o.valor ? <span className="text-emerald-600 font-semibold">{fmtBRL(o.valor)}</span> : <span className="text-slate-200">—</span>
      case 'probabilidade':     return o.probabilidade!=null ? <div className="flex items-center gap-2"><div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-1.5 bg-violet-400 rounded-full" style={{width:`${o.probabilidade}%`}} /></div><span className="text-xs text-slate-500">{o.probabilidade}%</span></div> : <span className="text-slate-200">—</span>
      case 'responsavel':       return o.responsavel ? <span className="text-slate-500">{o.responsavel}</span> : <span className="text-slate-200">—</span>
      case 'data_proxima_acao': return o.data_proxima_acao ? <span className="text-slate-500">{fmtDate(o.data_proxima_acao)}</span> : <span className="text-slate-200">—</span>
      default:                  return o[col.key] ? <span className="text-slate-500">{o[col.key]}</span> : <span className="text-slate-200">—</span>
    }
  }

  const handleRemoveCustom = (key) => {
    removeCustomCol(key); const next = {...visCols}; delete next[key]; setVisCols(next)
  }

  return (
    <div>
      <PageHeader title="Leads" subtitle={`Pipeline: ${fmtBRL(totalPipeline)||'R$ 0,00'}`} count={rows.length} countLabel="lead(s)">
        <BtnPrimary onClick={()=>openNew()} icon={Plus}>Novo lead</BtnPrimary>
      </PageHeader>
      <Toolbar search={search} onSearch={setSearch} placeholder="Buscar lead, empresa..." onRefresh={load} view={view} onView={setView}
        views={[{key:'kanban',label:'Kanban'},{key:'table',label:'Tabela'}]}
        columnSelector={view==='table' && <ColumnSelector columns={allCols} visible={visCols} onChange={setVisCols} onAddCustom={addCustomCol} onRemoveCustom={handleRemoveCustom} />}
        filters={<Sel value={stFilter} onChange={e=>setSt(e.target.value)} style={{width:175}}><option value="">Todos os status</option>{statuses.map(s=><option key={s.id} value={s.nome}>{s.nome}</option>)}</Sel>}
      />
      {loading ? <Spinner /> : view==='kanban' ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {statuses.map(st => (
            <div key={st.id} className="w-64 shrink-0">
              <div className={`px-3.5 py-2.5 rounded-t-xl text-xs font-bold flex justify-between items-center ${st.cor||'bg-slate-100 text-slate-700'}`}>
                <span>{st.nome}</span>
                <div className="flex items-center gap-1.5">
                  <span className="bg-white/60 px-1.5 py-0.5 rounded-full">{grouped[st.nome]?.length||0}</span>
                  <button onClick={()=>openNew(st.nome)} className="w-5 h-5 rounded-full bg-white/50 hover:bg-white flex items-center justify-center transition"><Plus className="w-3 h-3" /></button>
                </div>
              </div>
              <div className="bg-slate-50/80 border border-t-0 border-slate-200 rounded-b-xl p-2 space-y-2 min-h-[200px]">
                {!(grouped[st.nome]?.length) ? <div className="text-center py-8 text-xs text-slate-300">Nenhuma oportunidade</div>
                  : grouped[st.nome].map(o => (
                    <div key={o.id}>
                      <KanbanCard item={o} labelField="lead_nome" valueField="valor" dateField="data_proxima_acao" onEdit={openEdit} onDelete={del} onView={setDrawer} />
                      {statuses.length>1 && (
                        <div className="flex gap-1 mt-1 flex-wrap px-0.5">
                          {statuses.filter(s=>s.nome!==st.nome).map(s=>(
                            <button key={s.id} onClick={()=>moveStatus(o.id,s.nome)} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border border-white/50 ${s.cor||'bg-slate-100 text-slate-600'} hover:opacity-80 transition`}>→ {s.nome}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80">
                <tr>
                  {activeCols.map((col, idx) => <Th key={col.key} label={col.label} field={col.key} {...sp} isFirst={idx === 0} filterValue={colFilters[col.key]} onFilter={(f, v) => setColFilters(prev => ({ ...prev, [f]: v }))} />)}
                  <th className="px-4 py-3.5 border-b border-slate-100 w-10" />
                </tr>
              </thead>
              <tbody>
                {sorted.length===0 ? <tr><td colSpan={activeCols.length+1}><Empty msg="Nenhum lead encontrado" icon={TrendingUp} /></td></tr>
                  : sorted.map(o => (
                    <tr key={o.id} onClick={()=>setDrawer(o)} className="border-t border-slate-50 hover:bg-violet-50/20 transition-colors group cursor-pointer">
                      {activeCols.map(col => <td key={col.key} className="px-4 py-3.5">{renderCell(o,col)}</td>)}
                      <td className="px-4 py-3.5"><RowMenu onView={()=>setDrawer(o)} onEdit={()=>openEdit(o)} onDelete={()=>del(o.id)} /></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Drawer open={!!drawer} onClose={()=>setDrawer(null)}>
        {drawer && <OppDrawer opp={drawer} statuses={statuses} headers={headers} customCols={customCols} onClose={()=>setDrawer(null)} onEdit={o=>{openEdit(o);setDrawer(null)}} onDelete={del} onUpdated={updated=>{setRows(prev=>prev.map(r=>r.id===updated.id?updated:r));setDrawer(updated)}} />}
      </Drawer>
      {modal && (
        <Modal title={modal==='new'?'Novo Lead':'Editar Lead'} subtitle="Preencha os dados" onClose={()=>setModal(null)} size="max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Nome do Lead" required><Inp placeholder="Nome do lead" value={form.lead_nome} onChange={e=>setForm({...form,lead_nome:e.target.value})} /></Field>
            <Field label="Empresa"><Inp placeholder="Empresa" value={form.empresa} onChange={e=>setForm({...form,empresa:e.target.value})} /></Field>
            <Field label="Email"><Inp type="email" placeholder="email@..." value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></Field>
            <Field label="Telefone"><Inp placeholder="(11) 99999-9999" value={form.telefone} onChange={e=>setForm({...form,telefone:e.target.value})} /></Field>
            <Field label="Status"><Sel value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="">Selecione...</option>{statuses.map(s=><option key={s.id} value={s.nome}>{s.nome}</option>)}</Sel></Field>
            <Field label="Responsável"><Inp placeholder="Responsável" value={form.responsavel} onChange={e=>setForm({...form,responsavel:e.target.value})} /></Field>
            <Field label="Valor (R$)"><Inp type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} /></Field>
            <Field label="Probabilidade (%)"><Inp type="number" min="0" max="100" placeholder="0 - 100" value={form.probabilidade} onChange={e=>setForm({...form,probabilidade:e.target.value})} /></Field>
            <Field label="Origem"><Inp placeholder="Indicação, Site..." value={form.origem} onChange={e=>setForm({...form,origem:e.target.value})} /></Field>
            <Field label="Etapa da Venda"><Inp placeholder="Proposta enviada..." value={form.etapa_venda} onChange={e=>setForm({...form,etapa_venda:e.target.value})} /></Field>
            <Field label="Próxima ação"><Inp placeholder="Ligar na segunda..." value={form.proxima_acao} onChange={e=>setForm({...form,proxima_acao:e.target.value})} /></Field>
            <Field label="Data próxima ação"><Inp type="date" value={form.data_proxima_acao} onChange={e=>setForm({...form,data_proxima_acao:e.target.value})} /></Field>
            <div className="md:col-span-2"><Field label="Observação"><Txta rows={3} placeholder="Observações..." value={form.observacao} onChange={e=>setForm({...form,observacao:e.target.value})} /></Field></div>
            <CustomFieldsSection customCols={customCols} extras={extras} onChange={setExtras} />
          </div>
          <FormActions onCancel={()=>setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STATUSES
// ══════════════════════════════════════════════════════════════════════════════
const COR_OPTIONS = [
  {label:'Cinza',value:'bg-slate-200 text-slate-800'},{label:'Azul',value:'bg-blue-200 text-blue-800'},
  {label:'Verde',value:'bg-green-200 text-green-800'},{label:'Amarelo',value:'bg-yellow-200 text-yellow-800'},
  {label:'Roxo',value:'bg-purple-200 text-purple-800'},{label:'Vermelho',value:'bg-red-200 text-red-800'},
  {label:'Rosa',value:'bg-pink-200 text-pink-800'},{label:'Laranja',value:'bg-orange-200 text-orange-800'},
  {label:'Índigo',value:'bg-indigo-200 text-indigo-800'},{label:'Esmeralda',value:'bg-emerald-200 text-emerald-800'},
  {label:'Ciano',value:'bg-cyan-200 text-cyan-800'},{label:'Violeta',value:'bg-violet-200 text-violet-800'},
]

function Statuses() {
  const headers = useHeaders()
  const [rows, setRows]     = useState([])
  const [modal, setModal]   = useState(null)
  const [form, setForm]     = useState({ nome:'', cor:'bg-slate-200 text-slate-800', ordem:'', ativo:true })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const res = await fetch(`${API}/api/crm/statuses`, { headers })
    const data = await res.json()
    setRows(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  const openNew  = () => { setForm({nome:'',cor:'bg-slate-200 text-slate-800',ordem:'',ativo:true}); setModal('new') }
  const openEdit = (s) => { setForm({nome:s.nome,cor:s.cor,ordem:s.ordem,ativo:s.ativo}); setModal(s) }

  const save = async () => {
    if (!form.nome.trim()) return alert('Informe o nome')
    setSaving(true)
    const isEdit = modal !== 'new'
    const res = await fetch(isEdit?`${API}/api/crm/statuses/${modal.id}`:`${API}/api/crm/statuses`, { method:isEdit?'PUT':'POST', headers, body:JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) return alert('Erro ao salvar')
    setModal(null); load()
  }

  const del = async (id) => {
    if (!confirm('Excluir este status?')) return
    await fetch(`${API}/api/crm/statuses/${id}`, { method:'DELETE', headers })
    load()
  }

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Configure os status das oportunidades">
        <BtnPrimary onClick={openNew} icon={Plus}>Novo status</BtnPrimary>
      </PageHeader>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50/80">
            <tr>{['Ordem','Nome','Cor','Ativo',''].map((h,i)=><th key={i} className="text-left px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length===0 ? <tr><td colSpan={5}><Empty msg="Nenhum status cadastrado" icon={Settings2} /></td></tr>
              : rows.map(s=>(
                <tr key={s.id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors group">
                  <td className="px-4 py-3.5"><span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">{s.ordem}</span></td>
                  <td className="px-4 py-3.5 font-semibold text-slate-700">{s.nome}</td>
                  <td className="px-4 py-3.5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${s.cor}`}>{s.nome}</span></td>
                  <td className="px-4 py-3.5"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.ativo?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{s.ativo?'Ativo':'Inativo'}</span></td>
                  <td className="px-4 py-3.5"><RowMenu onEdit={()=>openEdit(s)} onDelete={()=>del(s.id)} /></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <Modal title={modal==='new'?'Novo Status':'Editar Status'} subtitle="Configure o status do pipeline" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <Field label="Nome" required><Inp placeholder="Ex: Proposta enviada" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} /></Field>
            <Field label="Cor">
              <Sel value={form.cor} onChange={e=>setForm({...form,cor:e.target.value})}>{COR_OPTIONS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</Sel>
              {form.nome && <div className="mt-2 flex items-center gap-2"><span className="text-xs text-slate-400">Preview:</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${form.cor}`}>{form.nome}</span></div>}
            </Field>
            <Field label="Ordem"><Inp type="number" min="0" placeholder="0" value={form.ordem} onChange={e=>setForm({...form,ordem:e.target.value})} /></Field>
            <Field label="Status">
              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
                <input type="checkbox" checked={form.ativo} onChange={e=>setForm({...form,ativo:e.target.checked})} className="w-4 h-4 accent-violet-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Status ativo (aparece no kanban)</span>
              </label>
            </Field>
          </div>
          <FormActions onCancel={()=>setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// LAYOUT
// ══════════════════════════════════════════════════════════════════════════════
const NAV = [
  { key:'dashboard',     icon:LayoutDashboard, label:'Dashboard' },
  { key:'contatos',      icon:Users,           label:'Contatos' },
  { key:'oportunidades', icon:TrendingUp,      label:'Leads' },
  { key:'statuses',      icon:Settings2,       label:'Pipeline' },
]
const SECTIONS = { dashboard:Dashboard, contatos:Contatos, oportunidades:Oportunidades, statuses:Statuses }

export default function CRM() {
  const [active, setActive] = useState('dashboard')
  const Section = SECTIONS[active]
  return (
    <div className="flex w-full h-full overflow-hidden bg-slate-50">
      <aside className="w-52 shrink-0 bg-white border-r border-slate-200 flex flex-col py-4">
        <div className="px-4 mb-4"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">CRM</p></div>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map(({key,icon:Icon,label})=>(
            <button key={key} onClick={()=>setActive(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active===key?'bg-violet-50 text-violet-700 font-semibold':'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
              <Icon className={`w-4 h-4 shrink-0 ${active===key?'text-violet-600':'text-slate-400'}`} />
              {label}
              {active===key && <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-400" />}
            </button>
          ))}
        </nav>
        <div className="px-4 pt-4 border-t border-slate-100"><p className="text-[10px] text-slate-300 font-medium">Vimax CRM v2</p></div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6 pr-4"><Section /></main>
    </div>
  )
}
