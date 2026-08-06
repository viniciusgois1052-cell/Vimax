from datetime import datetime
from pathlib import Path
import py_compile
import shutil
import subprocess
import sys


ROOT = Path("/var/www/cmms_project")
ARQUIVO = ROOT / "frontend/src/pages/projeto/Projeto.jsx"
BACKUP = ARQUIVO.with_name(
    f"{ARQUIVO.name}.bak-cpm-{datetime.now():%Y%m%d-%H%M%S}"
)


def substituir_uma_vez(texto, antigo, novo, nome):
    quantidade = texto.count(antigo)

    if quantidade == 1:
        return texto.replace(antigo, novo, 1)

    if nome == "motor de caminho crítico" and quantidade == 0:
        marcador_inicio = (
            "tasks.forEach(task => { "
            "task.caminho_critico = false })"
        )
        marcador_fim = "return tasks.sort("

        pos_inicio = texto.find(marcador_inicio)
        pos_fim = texto.find(
            marcador_fim,
            pos_inicio + 1
        )

        if pos_inicio >= 0 and pos_fim >= 0:
            inicio_linha = (
                texto.rfind("\n", 0, pos_inicio) + 1
            )
            fim_linha = (
                texto.rfind("\n", 0, pos_fim) + 1
            )

            return (
                texto[:inicio_linha]
                + novo
                + texto[fim_linha:]
            )

    raise RuntimeError(
        f"{nome}: esperava 1 ocorrência, "
        f"encontrei {quantidade}"
    )


if not ARQUIVO.exists():
    print(f"ERRO: arquivo não encontrado: {ARQUIVO}")
    sys.exit(1)

texto_original = ARQUIVO.read_text(encoding="utf-8")
texto = texto_original

bloco_critico_antigo = """    tasks.forEach(task => { task.caminho_critico = false })
    const projectFinish = leafTasks.map(task => dateOnly(map.get(Number(task.id))?.data_fim)).filter(Boolean).sort().pop()
    const criticalStack = tasks.filter(task => !task.e_resumo && dateOnly(task.data_fim) === projectFinish).map(task => Number(task.id))
    const seen = new Set()
    while (criticalStack.length) {
      const id = criticalStack.pop()
      if (seen.has(id)) continue
      seen.add(id)
      const task = map.get(id)
      if (!task) continue
      task.caminho_critico = true
      ;(task.predecessoras || []).forEach(link => criticalStack.push(Number(link.predecessora_id)))
    }
    tasks.filter(task => task.e_resumo).forEach(task => {
      task.caminho_critico = (children.get(Number(task.id)) || []).some(child => child.caminho_critico)
    })
"""

bloco_critico_novo = """    // CPM: calcula datas tardias e folga somente quando existe uma rede
    // real de dependências. Tarefa que apenas termina por último não é,
    // sozinha, considerada caminho crítico.
    tasks.forEach(task => {
      task.caminho_critico = false
      task.folga_dias = null
    })

    const dependencyNetwork = new Map()
    const networkTaskIds = new Set()
    let dependencyCount = 0

    leafTasks.forEach(target => {
      ;(target.predecessoras || []).forEach(link => {
        const predecessorId = Number(link.predecessora_id)
        const predecessor = map.get(predecessorId)
        if (!predecessor || predecessor.e_resumo || predecessor.inativa) return

        if (!dependencyNetwork.has(predecessorId)) {
          dependencyNetwork.set(predecessorId, [])
        }

        dependencyNetwork.get(predecessorId).push({
          targetId: Number(target.id),
          link,
        })
        networkTaskIds.add(predecessorId)
        networkTaskIds.add(Number(target.id))
        dependencyCount += 1
      })
    })

    const projectFinish = leafTasks
      .map(task => dateOnly(map.get(Number(task.id))?.data_fim))
      .filter(Boolean)
      .sort()
      .pop()

    const startFromFinish = (finish, duration) => {
      if (!finish || duration <= 0) return finish
      return addWorkingDays(
        finish,
        -(Math.max(1, duration) - 1),
        calendar
      )
    }

    const finishFromStart = (start, duration) => {
      if (!start || duration <= 0) return start
      return addWorkingDays(
        start,
        Math.max(1, duration) - 1,
        calendar
      )
    }

    const workingDayDistance = (from, to) => {
      let cursor = dateOnly(from)
      const finish = dateOnly(to)
      if (!cursor || !finish || cursor === finish) return 0

      const direction = dateObj(cursor) < dateObj(finish) ? 1 : -1
      let total = 0
      let guard = 0

      while (cursor !== finish && guard < 10000) {
        cursor = addWorkingDays(cursor, direction, calendar)
        total += direction
        guard += 1
      }

      return total
    }

    if (dependencyCount > 0 && projectFinish) {
      const latestStart = new Map()
      const latestFinish = new Map()

      leafTasks.forEach(task => {
        const duration = taskDuration(task)
        latestFinish.set(Number(task.id), projectFinish)
        latestStart.set(
          Number(task.id),
          startFromFinish(projectFinish, duration)
        )
      })

      ;[...ordered].reverse().forEach(id => {
        const task = map.get(Number(id))
        if (!task || task.e_resumo || task.inativa) return

        const duration = taskDuration(task)
        let finishLimit = latestFinish.get(Number(id)) || projectFinish

        ;(dependencyNetwork.get(Number(id)) || []).forEach(edge => {
          const target = map.get(Number(edge.targetId))
          if (!target) return

          const targetDuration = taskDuration(target)
          const targetLatestFinish = (
            latestFinish.get(Number(target.id))
            || target.data_fim
            || target.data_inicio
          )
          const targetLatestStart = (
            latestStart.get(Number(target.id))
            || startFromFinish(targetLatestFinish, targetDuration)
          )
          const lag = Math.round(
            Number(
              edge.link.atraso_dias
              ?? (Number(edge.link.atraso_minutos || 0) / 480)
            ) || 0
          )
          const type = String(edge.link.tipo || 'FS').toUpperCase()
          let candidateFinish = finishLimit

          if (type === 'FS') {
            candidateFinish = addWorkingDays(
              targetLatestStart,
              -(lag + 1),
              calendar
            )
          } else if (type === 'SS') {
            const candidateStart = addWorkingDays(
              targetLatestStart,
              -lag,
              calendar
            )
            candidateFinish = finishFromStart(candidateStart, duration)
          } else if (type === 'FF') {
            candidateFinish = addWorkingDays(
              targetLatestFinish,
              -lag,
              calendar
            )
          } else if (type === 'SF') {
            const candidateStart = addWorkingDays(
              targetLatestFinish,
              -lag,
              calendar
            )
            candidateFinish = finishFromStart(candidateStart, duration)
          }

          if (
            candidateFinish
            && dateObj(candidateFinish) < dateObj(finishLimit)
          ) {
            finishLimit = candidateFinish
          }
        })

        const startLimit = startFromFinish(finishLimit, duration)
        latestFinish.set(Number(id), finishLimit)
        latestStart.set(Number(id), startLimit)
      })

      leafTasks.forEach(task => {
        const id = Number(task.id)
        if (!networkTaskIds.has(id)) return

        const floatDays = workingDayDistance(
          task.data_inicio,
          latestStart.get(id)
        )
        task.folga_dias = floatDays
        task.caminho_critico = floatDays <= 0
      })
    }

    tasks
      .filter(task => task.e_resumo)
      .sort((a, b) => Number(b.nivel || 0) - Number(a.nivel || 0))
      .forEach(task => {
      const descendants = children.get(Number(task.id)) || []
      const floats = descendants
        .map(child => child.folga_dias)
        .filter(value => Number.isFinite(Number(value)))

      task.folga_dias = floats.length
        ? Math.min(...floats.map(Number))
        : null
      task.caminho_critico = descendants.some(
        child => child.caminho_critico && child.folga_dias != null
      )
      })
"""

texto = substituir_uma_vez(
    texto,
    bloco_critico_antigo,
    bloco_critico_novo,
    "motor de caminho crítico",
)

ancora_inspector = (
    "function TaskInspector({ task, selectedCount, calendar, editable, "
    "close, update, updateDuration, updateStart, updateFinish, "
    "dependencies, resources }) {"
)

explicacao = """function ScheduleExplanation({ task }) {
  const links = task.predecessoras || []
  const duration = taskDuration(task)
  const relationLabels = {
    FS: 'Término → Início',
    SS: 'Início → Início',
    FF: 'Término → Término',
    SF: 'Início → Término',
  }

  let explanation = ''

  if (task.e_resumo) {
    explanation = 'As datas são calculadas pelo menor início e pelo maior término das subtarefas.'
  } else if (task.modo_agendamento === 'manual') {
    explanation = 'Agendamento manual: as datas permanecem sob controle do usuário.'
  } else if (links.length) {
    const descriptions = links.slice(0, 3).map(link => {
      const type = String(link.tipo || 'FS').toUpperCase()
      const lag = Number(
        link.atraso_dias
        ?? (Number(link.atraso_minutos || 0) / 480)
        ?? 0
      )
      const name = link.predecessora_nome || `Tarefa ${link.predecessora_id}`
      const lagText = lag
        ? `, ${lag > 0 ? '+' : ''}${lag} dia(s)`
        : ''
      return `${name} — ${relationLabels[type] || type}${lagText}`
    })
    const extra = links.length > 3 ? ` e mais ${links.length - 3}` : ''
    explanation = `O início foi calculado pelas predecessoras: ${descriptions.join('; ')}${extra}.`
  } else {
    explanation = 'Sem predecessora: o início é informado pelo usuário e o término é calculado pela duração.'
  }

  const hasFloat = Number.isFinite(Number(task.folga_dias))

  return <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-slate-600">
    <div className="mb-2 flex items-center justify-between gap-3">
      <b className="text-blue-800">Como esta data foi calculada?</b>
      {task.caminho_critico && hasFloat
        ? <span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-black text-red-700">Caminho crítico</span>
        : hasFloat
          ? <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600">Folga: {task.folga_dias}d</span>
          : null}
    </div>
    <p className="leading-5">{explanation}</p>
    {!task.e_resumo && <p className="mt-2 border-t border-blue-100 pt-2 text-[11px]">
      <b>{duration} dia(s) útil(eis)</b>: {formatDate(task.data_inicio)} → {formatDate(task.data_fim)}
    </p>}
    {task.caminho_critico && hasFloat && <p className="mt-2 text-[10px] font-bold text-red-600">
      Folga zero: atrasar esta tarefa pode alterar o término do projeto.
    </p>}
  </div>
}

"""

if texto.count(ancora_inspector) != 1:
    raise RuntimeError(
        "painel da tarefa: não encontrei a função TaskInspector atual"
    )
texto = texto.replace(
    ancora_inspector,
    explicacao + ancora_inspector,
    1,
)

resumo_antigo = """      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500"><div className="flex justify-between py-1"><span>Modo</span><b>{task.modo_agendamento || 'automático'}</b></div><div className="flex justify-between py-1"><span>Caminho crítico</span><b>{task.caminho_critico ? 'Sim' : 'Não'}</b></div><div className="flex justify-between py-1"><span>Marco</span><b>{task.e_marco ? 'Sim' : 'Não'}</b></div></div>"""
resumo_novo = """      <ScheduleExplanation task={task}/>
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500"><div className="flex justify-between py-1"><span>Modo</span><b>{task.modo_agendamento || 'automático'}</b></div><div className="flex justify-between py-1"><span>Marco</span><b>{task.e_marco ? 'Sim' : 'Não'}</b></div></div>"""

texto = substituir_uma_vez(
    texto,
    resumo_antigo,
    resumo_novo,
    "explicação do cálculo no inspetor",
)

indicador_antigo = """{task.caminho_critico ? <AlertTriangle className="text-red-500" size={12}/> : task.e_marco ? <Milestone className="text-violet-500" size={12}/> : null}"""
indicador_novo = """{task.caminho_critico && task.folga_dias != null ? <Clock3 title="Caminho crítico — informação de agendamento, não é erro" className="text-red-500" size={12}/> : task.e_marco ? <Milestone className="text-violet-500" size={12}/> : null}"""

texto = substituir_uma_vez(
    texto,
    indicador_antigo,
    indicador_novo,
    "indicador informativo",
)

texto = substituir_uma_vez(
    texto,
    "${task.caminho_critico ? 'bg-red-600' : 'bg-violet-600'}",
    "${task.caminho_critico && task.folga_dias != null ? 'bg-red-600' : 'bg-violet-600'}",
    "cor do marco crítico",
)

texto = substituir_uma_vez(
    texto,
    "task.e_resumo ? 'bg-slate-800' : task.caminho_critico ? 'bg-red-500' : 'bg-blue-500'",
    "task.e_resumo ? 'bg-slate-800' : task.caminho_critico && task.folga_dias != null ? 'bg-red-500' : 'bg-blue-500'",
    "cor da barra crítica",
)

texto = substituir_uma_vez(
    texto,
    "source.caminho_critico && target.caminho_critico ? '#ef4444' : '#64748b'",
    "source.caminho_critico && source.folga_dias != null && target.caminho_critico && target.folga_dias != null ? '#ef4444' : '#64748b'",
    "cor da dependência crítica",
)

shutil.copy2(ARQUIVO, BACKUP)
print(f"Backup criado: {BACKUP}")

try:
    ARQUIVO.write_text(texto, encoding="utf-8")

    resultado = subprocess.run(
        ["npm", "run", "build"],
        cwd=ROOT / "frontend",
        check=False,
    )
    if resultado.returncode != 0:
        raise RuntimeError("o build do frontend falhou")

except Exception as exc:
    shutil.copy2(BACKUP, ARQUIVO)
    print(f"ERRO: {exc}")
    print("Backup restaurado automaticamente.")
    sys.exit(1)

print()
print("=" * 60)
print("CAMINHO CRÍTICO E CÁLCULOS CORRIGIDOS")
print("=" * 60)
print("Tarefa que apenas termina por último não vira alerta.")
print("Caminho crítico exige uma rede de dependências.")
print("Folga calculada por passagem regressiva do cronograma.")
print("Triângulo de erro substituído por indicador informativo.")
print('Painel "Como esta data foi calculada?" instalado.')
print("Datas e tarefas existentes não foram apagadas.")
print("Nenhuma alteração foi gravada no Git.")