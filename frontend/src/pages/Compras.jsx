import React from 'react'
import { ShoppingCart, Package, FileText, Truck, ClipboardList, BarChart2, Inbox, UserPlus, Image, FileCheck, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Compras() {
  const { can } = useAuth()
  const menuItems = [
    {
      title: 'Cadastros',
      items: [
        { path: '/compras/grupos',     label: 'Grupos de Itens',          icon: Package,       color: 'bg-blue-100 text-blue-600' },
        { path: '/compras/itens',      label: 'Itens do Catálogo',        icon: ShoppingCart,  color: 'bg-purple-100 text-purple-600' },
        // 🆕 Cadastro de fornecedor pela tela de Compras (marca origem = compras)
        { path: '/fornecedores?novo=1&origem=compras&tipo=fornecedor', label: 'Cadastrar Fornecedor', icon: UserPlus, color: 'bg-emerald-100 text-emerald-600', desc: 'Abrir cadastro de fornecedor (origem: Compras)' },
        ...(can('compras', 'editar') ? [{ path: '/fornecedores?avaliar=1', label: 'Avaliar Fornecedor', icon: Star, color: 'bg-amber-100 text-amber-600', desc: 'Avaliar fornecedor ou prestador com 1 a 5 estrelas' }] : []),
        // 🆕 Logo dos PDFs de Compras
        { path: '/compras/logo',       label: 'Logo dos PDFs',            icon: Image,         color: 'bg-pink-100 text-pink-600',  desc: 'Logo que aparece nos PDFs de Compras' },
      ]
    },
    {
      title: 'Fluxo de Compra',
      items: [
        { path: '/compras/requisicoes', label: 'Requisição de Compra (RQ)', icon: FileText,      color: 'bg-yellow-100 text-yellow-600',  desc: 'Solicitar itens para compra' },
        { path: '/compras/pedidos',     label: 'Pedido de Compra (PC)',     icon: Truck,         color: 'bg-orange-100 text-orange-600',  desc: 'Emitir pedidos aos fornecedores' },
        { path: '/compras/orcamentos',  label: 'Orçamentos / Cotações',     icon: BarChart2,     color: 'bg-indigo-100 text-indigo-600',  desc: 'Comparar propostas e selecionar vencedor' },
        { path: '/compras/ordens',      label: 'Ordem de Compra (OC)',      icon: ClipboardList, color: 'bg-green-100 text-green-600',    desc: 'Ordens geradas para fornecedores' },
        { path: '/compras/recebimento', label: 'Recebimento de Materiais',  icon: Inbox,         color: 'bg-teal-100 text-teal-600',      desc: 'Conferir e registrar itens recebidos' },
        { path: '/compras/relatorios',  label: 'Relatórios de Compras',     icon: BarChart2,     color: 'bg-rose-100 text-rose-600',      desc: 'Visão geral, por solicitante e exportação CSV' },
        { path: '/compras/documentos-fornecedor', label: 'Documentos do Fornecedor', icon: FileCheck, color: 'bg-cyan-100 text-cyan-600', desc: 'NF e Boleto anexados pelos fornecedores' },
      ]
    }
  ]

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="text-black" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">Módulo de Compras</h1>
          </div>
          <p className="text-gray-600">Gerenciamento completo do fluxo de compras da empresa</p>
        </div>

        <div className="space-y-8">
          {menuItems.map((section, sIdx) => (
            <div key={sIdx}>
              <h2 className="text-lg font-bold text-gray-800 mb-4 uppercase tracking-wide border-b border-gray-200 pb-2">
                {section.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link key={item.path} to={item.path}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-100 hover:border-indigo-200">
                      <div className={`${item.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{item.label}</h3>
                      <p className="text-sm text-gray-500 mt-1">{item.desc || `Gerenciar ${item.label.toLowerCase()}`}</p>
                      <div className="mt-4 flex items-center gap-2 text-indigo-600 font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        Acessar <span>→</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}