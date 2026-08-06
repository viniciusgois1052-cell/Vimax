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

function DurationEditor({ task, editable, apply }) {
  const current = task.e_marco ? 0 : taskDuration(task)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(current)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) setValue(current)
  }, [current, open])

  const show = event => {
    event.stopPropagation()
    if (!editable || task.e_resumo) return
    const rect = buttonRef.current.getBoundingClientRect()
    const width = 310
    const height = 250
    setPosition({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      top: rect.bottom + height < window.innerHeight ? rect.bottom + 6 : Math.max(8, rect.top - height - 6),
    })
    setValue(current)
    setOpen(true)
  }

  const change = next => setValue(Math.max(0, Math.min(9999, Number(next) || 0)))
  const confirm = () => {
    const duration = Math.max(0, Number(value) || 0)
    setOpen(false)
    if (duration === current) return
    apply({
      duracao_dias: duration,
      duracao_minutos: duration * 480,
      e_marco: duration === 0,
    })
  }

  if (task.e_resumo) return <span title="Calculada pelas subtarefas" className="font-bold text-slate-500">{current} <small>d</small></span>

  return <>
    <button ref={buttonRef} type="button" disabled={!editable} onClick={show} className="flex w-full items-center justify-center gap-1 rounded-md px-1 py-1 text-[10px] font-bold hover:bg-blue-100 hover:text-blue-700 disabled:opacity-50">
      {current} <span className="text-[9px] text-slate-400">d</span>
    </button>
    {open && <>
      <button type="button" aria-label="Fechar editor" className="fixed inset-0 z-[280] cursor-default bg-transparent" onClick={() => setOpen(false)}/>
      <div onClick={event => event.stopPropagation()} className="fixed z-[281] w-[310px] rounded-2xl border bg-white p-4 shadow-2xl" style={position}>
        <div className="mb-3">
          <b className="block truncate text-sm text-slate-800">Duração da tarefa</b>
          <span className="block truncate text-[10px] text-slate-400">{task.nome}</span>
        </div>

        <div className="mb-3 grid grid-cols-[48px_1fr_48px] items-center gap-2">
          <button type="button" onClick={() => change(value - 1)} className="h-11 rounded-xl border bg-slate-50 text-2xl font-black text-slate-600 hover:bg-slate-100">−</button>
          <label className="relative">
            <input autoFocus type="number" min="0" max="9999" step="0.5" value={value} onChange={event => change(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') confirm(); if (event.key === 'Escape') setOpen(false) }} className="h-11 w-full rounded-xl border-2 border-blue-500 px-3 pr-11 text-center text-lg font-black outline-none"/>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">dias</span>
          </label>
          <button type="button" onClick={() => change(value + 1)} className="h-11 rounded-xl border bg-slate-50 text-2xl font-black text-slate-600 hover:bg-slate-100">+</button>
        </div>

        <div className="mb-4 grid grid-cols-5 gap-1.5">
          {[1, 5, 10, 15, 20, 30, 45, 60, 90, 120].map(days => <button type="button" key={days} onClick={() => change(days)} className={`rounded-lg border py-1.5 text-[10px] font-bold ${Number(value) === days ? 'border-blue-600 bg-blue-600 text-white' : 'hover:bg-slate-50'}`}>{days}d</button>)}
        </div>

        <div className="flex gap-2">
          <button type="button" onClick={() => change(0)} className="rounded-xl border px-3 py-2 text-xs font-bold text-violet-600 hover:bg-violet-50">Marco (0d)</button>
          <button type="button" onClick={confirm} className="flex-1 rounded-xl bg-black px-4 py-2 text-xs font-black text-white hover:bg-slate-800">Aplicar e recalcular</button>
        </div>
      </div>
    </>}
  </>
}
'''

old_cell = '<div className={`${column} flex w-20 items-center justify-center`}><input disabled={!permissions.edit || task.e_resumo} type="number" min="0" step="0.5" value={task.e_marco ? 0 : taskDuration(task)} onChange={event => updateTask(task.id, { duracao_dias: Number(event.target.value), duracao_minutos: Number(event.target.value) * 480 }, true)} className="w-12 bg-transparent text-right text-[10px] outline-none"/><span className="text-[9px] text-slate-400">d</span></div>'
new_cell = '<div className={`${column} flex w-20 items-center justify-center`}><DurationEditor task={task} editable={permissions.edit} apply={patch => updateTask(task.id, patch, true)}/></div>'

if source.count(marker) != 1:
    raise SystemExit(f"Ponto do componente não encontrado. O arquivo não foi alterado.")
if source.count(old_cell) != 1:
    raise SystemExit(f"Célula de duração esperada não encontrada. O arquivo não foi alterado.")

updated = source.replace(marker, component + marker, 1).replace(old_cell, new_cell, 1)
backup = path.with_name(path.name + ".bak-duracao")
shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print(f"Editor de duração aplicado em: {path}")
print(f"Backup criado em: {backup}")