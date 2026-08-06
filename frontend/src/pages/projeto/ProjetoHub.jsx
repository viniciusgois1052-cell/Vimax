import React from 'react'
import { ArrowRight, FolderKanban, ShoppingCart, Target } from 'lucide-react'
import { Link } from 'react-router-dom'

const cards = [
  {
    path: '/projetos/gestao',
    icon: FolderKanban,
    title: 'Gestão de Projetos',
    description: 'Projetos, tarefas, cronogramas, predecessoras, recursos e Gantt.',
    color: 'bg-blue-600',
  },
  {
    path: '/projetos/projecoes',
    icon: ShoppingCart,
    title: 'Projeções',
    description: 'Planejamento de compras dos setores de Manutenção e T.I.',
    color: 'bg-emerald-600',
  },
]

export default function ProjetoHub() {
  return (
    <div className="min-h-full bg-slate-50 p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">
            <Target size={27}/>
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">Projetos</h1>
            <p className="text-sm text-slate-500">
              Gestão do cronograma e planejamento de compras.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {cards.map(card => {
            const Icon = card.icon

            return (
              <Link
                key={card.path}
                to={card.path}
                className="group rounded-3xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white ${card.color}`}>
                    <Icon size={23}/>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-slate-900">
                      {card.title}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {card.description}
                    </p>
                  </div>

                  <ArrowRight
                    className="mt-3 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-700"
                    size={20}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
