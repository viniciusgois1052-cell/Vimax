#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys


path = Path(sys.argv[1] if len(sys.argv) > 1 else "/var/www/cmms_project/frontend/src/pages/projeto/Projeto.jsx")
if not path.exists():
    raise SystemExit(f"Arquivo não encontrado: {path}")

source = path.read_text(encoding="utf-8")
marker = "\nfunction ProjectForm({ project, companies, groups, users, saving, save, cancel }) {"

component = r'''

function DateEditor({ task, field, editable, apply }) {
  const current = dateOnly(task[field])
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(current)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) setValue(current)
  }, [current, open])

  const show = event => {
    event.stopPropagation()
    if (!editable) return
    const rect = buttonRef.current.getBoundingClientRect()
    const width = 330
    const height = 270
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: rect.bottom + height < window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - height - 6),
    })
    setValue(current || new Date().toISOString().slice(0, 10))
    setOpen(true)
  }

  const shift = days => setValue(previous => addCalendarDays(previous || new Date().toISOString().slice(0, 10), days))
  const confirm = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return
    setOpen(false)
    if (value !== current) apply(value)
  }

  return <>
    <button ref={buttonRef} type="button" disabled={!editable} onClick={show} title={task.e_resumo ? 'Editar e mover todas as subtarefas' : 'Editar data'} className={`flex w-full items-center justify-between gap-1 rounded-md px-1.5 py-1 text-[10px] hover:bg-blue-100 disabled:opacity-50 ${task.e_resumo ? 'font-black text-blue-700' : 'text-slate-700'}`}>
      <span>{formatDate(current)}</span><CalendarDays className="shrink-0 opacity-60" size={11}/>
    </button>
    {open && <>
      <button type="button" aria-label="Fechar calendário" className="fixed inset-0 z-[280] cursor-default bg-black/5" onClick={() => setOpen(false)}/>
      <div onClick={event => event.stopPropagation()} className="fixed z-[281] w-[330px] rounded-2xl border bg-white p-4 shadow-2xl" style={position}>
        <div className="mb-3 flex items-start gap-2">
          <CalendarDays className="mt-0.5 text-blue-600" size={18}/>
          <div className="min-w-0"><b className="block text-sm">{field === 'data_inicio' ? 'Data de início' : 'Data de término'}</b><span className="block truncate text-[10px] text-slate-400">{task.nome}</span></div>
        </div>

        {task.e_resumo && <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-700">Esta é uma tarefa-resumo. Ao aplicar, todas as subtarefas serão movidas juntas.</div>}

        <input autoFocus type="date" min="2000-01-01" max="2100-12-31" value={value} onChange={event => setValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') confirm(); if (event.key === 'Escape') setOpen(false) }} className="mb-3 h-12 w-full rounded-xl border-2 border-blue-500 px-4 text-center text-base font-black outline-none"/>

        <div className="mb-3 grid grid-cols-6 gap-1.5">
          {[-30, -7, -1, 1, 7, 30].map(days => <button type="button" key={days} onClick={() => shift(days)} className="rounded-lg border py-1.5 text-[10px] font-bold hover:bg-slate-50">{days > 0 ? '+' : ''}{days}d</button>)}
        </div>

        <div className="mb-4 rounded-xl bg-slate-50 p-3 text-center"><span className="block text-[9px] font-bold uppercase text-slate-400">Data selecionada</span><b className="text-base text-slate-800">{formatDate(value)}</b></div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setValue(new Date().toISOString().slice(0, 10))} className="rounded-xl border px-3 py-2 text-xs font-bold">Hoje</button>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl border px-3 py-2 text-xs font-bold">Cancelar</button>
          <button type="button" onClick={confirm} className="flex-1 rounded-xl bg-black px-4 py-2 text-xs font-black text-white">Aplicar data</button>
        </div>
      </div>
    </>}
  </>
}
'''

old_start = '<div className={`${column} flex w-28 items-center`}><input title={task.e_resumo ? \'Alterar move todas as subtarefas do grupo\' : \'Data de início\'} disabled={!permissions.edit} type="date" value={dateOnly(task.data_inicio)} onChange={event => task.e_resumo ? shiftSummary(task.id, \'data_inicio\', event.target.value) : updateTask(task.id, { data_inicio: event.target.value }, true)} className={`w-full bg-transparent text-[10px] outline-none ${task.e_resumo ? \'cursor-pointer font-bold text-blue-700\' : \'\'}`}/></div>'
new_start = '<div className={`${column} flex w-28 items-center`}><DateEditor task={task} field="data_inicio" editable={permissions.edit} apply={value => task.e_resumo ? shiftSummary(task.id, \'data_inicio\', value) : updateTask(task.id, { data_inicio: value }, true)}/></div>'

old_finish = '<div className={`${column} flex w-28 items-center`}><input title={task.e_resumo ? \'Alterar move todas as subtarefas do grupo\' : \'Data de término\'} disabled={!permissions.edit} type="date" value={dateOnly(task.data_fim)} onChange={event => task.e_resumo ? shiftSummary(task.id, \'data_fim\', event.target.value) : updateTask(task.id, { data_fim: event.target.value })} className={`w-full bg-transparent text-[10px] outline-none ${task.e_resumo ? \'cursor-pointer font-bold text-blue-700\' : \'\'}`}/></div>'
new_finish = '<div className={`${column} flex w-28 items-center`}><DateEditor task={task} field="data_fim" editable={permissions.edit} apply={value => task.e_resumo ? shiftSummary(task.id, \'data_fim\', value) : updateTask(task.id, { data_fim: value })}/></div>'

for label, old in (("componente", marker), ("início", old_start), ("término", old_finish)):
    if source.count(old) != 1:
        raise SystemExit(f"Trecho de {label} não encontrado exatamente uma vez. O arquivo não foi alterado.")

updated = source.replace(marker, component + marker, 1)
updated = updated.replace(old_start, new_start, 1).replace(old_finish, new_finish, 1)
backup = path.with_name(path.name + ".bak-calendario")
shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print(f"Editor de datas aplicado em: {path}")
print(f"Backup criado em: {backup}")