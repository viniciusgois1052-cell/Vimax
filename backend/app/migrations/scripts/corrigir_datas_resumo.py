#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys


path = Path(sys.argv[1] if len(sys.argv) > 1 else "/var/www/cmms_project/frontend/src/pages/projeto/Projeto.jsx")
if not path.exists():
    raise SystemExit(f"Arquivo não encontrado: {path}")

source = path.read_text(encoding="utf-8")

old_update = """  const updateTask = useCallback((id, patch, autoschedule = false) => {
    let next = tasks.map(item => Number(item.id) === Number(id) ? { ...item, ...patch } : item)
    if (autoschedule) next = scheduleTasks(next, calendar)
    saveBatch(next)
  }, [tasks, calendar, saveBatch])
"""

new_update = old_update + """
  const shiftSummary = useCallback((summaryId, anchorField, targetDate) => {
    const summary = tasks.find(item => Number(item.id) === Number(summaryId))
    const currentAnchor = dateOnly(anchorField === 'data_fim' ? summary?.data_fim : summary?.data_inicio)
    const target = dateOnly(targetDate)
    if (!summary || !currentAnchor || !target) return
    const delta = diffDays(currentAnchor, target)
    if (!delta) return

    const childrenByParent = new Map()
    tasks.forEach(item => {
      const parentId = item.parent_id == null ? null : Number(item.parent_id)
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, [])
      childrenByParent.get(parentId).push(Number(item.id))
    })

    const descendantIds = new Set()
    const stack = [...(childrenByParent.get(Number(summaryId)) || [])]
    while (stack.length) {
      const id = stack.pop()
      if (descendantIds.has(id)) continue
      descendantIds.add(id)
      stack.push(...(childrenByParent.get(id) || []))
    }
    if (!descendantIds.size) return

    const direction = delta < 0 ? -1 : 1
    const moved = tasks.map(item => {
      if (!descendantIds.has(Number(item.id))) return item
      const start = dateOnly(item.data_inicio)
      const finish = dateOnly(item.data_fim || item.data_inicio)
      const shiftedStart = start ? nextWorkingDay(addCalendarDays(start, delta), calendar, direction, true) : start
      const shiftedFinish = finish ? nextWorkingDay(addCalendarDays(finish, delta), calendar, direction, true) : finish
      return {
        ...item,
        data_inicio: shiftedStart,
        data_fim: item.e_marco ? shiftedStart : shiftedFinish,
      }
    })

    saveBatch(scheduleTasks(moved, calendar), `Grupo "${summary.nome}" movido`)
  }, [tasks, calendar, saveBatch])
"""

replacements = [
    (
        "    if (!editable || task.e_resumo) return",
        "    if (!editable || (task.e_resumo && mode !== 'move')) return",
    ),
    (old_update, new_update),
    (
        '<div className={`${column} flex w-28 items-center`}><input disabled={!permissions.edit || task.e_resumo} type="date" value={dateOnly(task.data_inicio)} onChange={event => updateTask(task.id, { data_inicio: event.target.value }, true)} className="w-full bg-transparent text-[10px] outline-none"/></div>',
        '<div className={`${column} flex w-28 items-center`}><input title={task.e_resumo ? \'Alterar move todas as subtarefas do grupo\' : \'Data de início\'} disabled={!permissions.edit} type="date" value={dateOnly(task.data_inicio)} onChange={event => task.e_resumo ? shiftSummary(task.id, \'data_inicio\', event.target.value) : updateTask(task.id, { data_inicio: event.target.value }, true)} className={`w-full bg-transparent text-[10px] outline-none ${task.e_resumo ? \'cursor-pointer font-bold text-blue-700\' : \'\'}`}/></div>',
    ),
    (
        '<div className={`${column} flex w-28 items-center`}><input disabled={!permissions.edit || task.e_resumo} type="date" value={dateOnly(task.data_fim)} onChange={event => updateTask(task.id, { data_fim: event.target.value })} className="w-full bg-transparent text-[10px] outline-none"/></div>',
        '<div className={`${column} flex w-28 items-center`}><input title={task.e_resumo ? \'Alterar move todas as subtarefas do grupo\' : \'Data de término\'} disabled={!permissions.edit} type="date" value={dateOnly(task.data_fim)} onChange={event => task.e_resumo ? shiftSummary(task.id, \'data_fim\', event.target.value) : updateTask(task.id, { data_fim: event.target.value })} className={`w-full bg-transparent text-[10px] outline-none ${task.e_resumo ? \'cursor-pointer font-bold text-blue-700\' : \'\'}`}/></div>',
    ),
    (
        'change={patch => updateTask(task.id, patch, true)} editable={permissions.edit}',
        "change={patch => task.e_resumo ? shiftSummary(task.id, 'data_inicio', patch.data_inicio) : updateTask(task.id, patch, true)} editable={permissions.edit}",
    ),
]

updated = source
for index, (old, new) in enumerate(replacements, start=1):
    count = updated.count(old)
    if count != 1:
        raise SystemExit(f"Correção {index} não aplicada: esperado 1 trecho, encontrado {count}. O arquivo não foi alterado.")
    updated = updated.replace(old, new, 1)

backup = path.with_name(path.name + ".bak-resumos")
shutil.copy2(path, backup)
path.write_text(updated, encoding="utf-8")
print(f"Correção aplicada em: {path}")
print(f"Backup criado em: {backup}")
