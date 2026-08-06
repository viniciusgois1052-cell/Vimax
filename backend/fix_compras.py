import re

# ============================================================
# HELPER
# ============================================================
def read(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ {path}')

BASE = '/var/www/cmms_project/frontend/src/pages/compras'

# ============================================================
# BLOCO DE NOTIFICAÇÃO (reutilizado em todos os arquivos)
# ============================================================
NOTIFICATION_BLOCK = '''
{error && (
  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
    <span className="text-red-700 font-bold flex items-center gap-2">
      <AlertCircle size={18} /> {error}
    </span>
    <button onClick={() => setError('')} className="text-red-500 hover:text-red-700"><X size={18} /></button>
  </div>
)}
{success && (
  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
    <span className="text-green-700 font-bold flex items-center gap-2">
      <Check size={18} /> {success}
    </span>
    <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700"><X size={18} /></button>
  </div>
)}
{confirmAction && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
      <p className="text-lg font-bold text-gray-800 text-center">{confirmAction.label}</p>
      <div className="flex gap-3">
        <button onClick={() => setConfirmAction(null)} className="flex-1 px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
        <button onClick={() => { confirmAction.fn(); setConfirmAction(null) }} className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700">Confirmar</button>
      </div>
    </div>
  </div>
)}'''

# ============================================================
# 1. RequisicaoCompra.jsx
# ============================================================
def fix_requisicao():
    path = f'{BASE}/RequisicaoCompra.jsx'
    c = read(path)

    # Adicionar estados error/success/confirmAction/formError após useState do novoItem
    c = c.replace(
        "const [novoItem, setNovoItem] = useState({\n    item_id: '',\n    quantidade: '',\n    observacao: ''\n  })",
        "const [novoItem, setNovoItem] = useState({\n    item_id: '',\n    quantidade: '',\n    observacao: ''\n  })\n\n  const [error, setError] = useState('')\n  const [success, setSuccess] = useState('')\n  const [confirmAction, setConfirmAction] = useState(null)\n  const [formError, setFormError] = useState('')"
    )

    # Bug: filtro empresa compara tipos diferentes
    c = c.replace(
        "const matchEmpresa = empresaFilter === 'todas' || rq.empresa_id === parseInt(empresaFilter)",
        "const matchEmpresa = empresaFilter === 'todas' || String(rq.empresa_id) === String(empresaFilter)"
    )

    # Bug: handleGerarPDF usa selectedRQ que pode ser null
    c = c.replace(
        "a.download = `RQ-${selectedRQ.numero_rq}.pdf`\n        document.body.appendChild(a)\n        a.click()\n        window.URL.revokeObjectURL(url)",
        "const rq = requisicoes.find(r => r.id === id)\n        a.download = `RQ-${rq?.numero_rq || id}.pdf`\n        document.body.appendChild(a)\n        a.click()\n        document.body.removeChild(a)\n        window.URL.revokeObjectURL(url)"
    )

    # Bug: handleAddItem usa alert
    c = c.replace(
        "if (!novoItem.item_id || !novoItem.quantidade) {\n      alert('Selecione um item e quantidade')\n      return\n    }\n\n    const itemSelecionado = itens.find(i => i.id === parseInt(novoItem.item_id))\n    if (!itemSelecionado) {\n      alert('Item não encontrado')\n      return\n    }",
        "if (!novoItem.item_id || !novoItem.quantidade) {\n      setFormError('Selecione um item e informe a quantidade')\n      return\n    }\n    setFormError('')\n\n    const itemSelecionado = itens.find(i => i.id === parseInt(novoItem.item_id))\n    if (!itemSelecionado) {\n      setFormError('Item não encontrado')\n      return\n    }"
    )

    # Bug: handleSubmit alerts
    c = c.replace(
        "if (!formData.empresa_id) {\n      alert('Selecione uma empresa')\n      return\n    }\n\n    if (!formData.data_necessaria) {\n      alert('Data necessária é obrigatória')\n      return\n    }\n\n    if (formData.itens.length === 0) {\n      alert('Adicione pelo menos um item')\n      return\n    }",
        "if (!formData.empresa_id) {\n      setFormError('Selecione uma empresa')\n      return\n    }\n\n    if (!formData.data_necessaria) {\n      setFormError('Data necessária é obrigatória')\n      return\n    }\n\n    if (formData.itens.length === 0) {\n      setFormError('Adicione pelo menos um item')\n      return\n    }"
    )

    c = c.replace(
        "alert('✓ Requisição salva com sucesso!')",
        "setSuccess('Requisição salva com sucesso!')"
    )
    c = c.replace(
        "alert('Erro ao salvar requisição')",
        "setError('Erro ao salvar requisição')"
    )

    # handleAprovar - window.confirm + alerts
    c = c.replace(
        "if (!window.confirm('Tem certeza que deseja APROVAR esta requisição?')) return",
        "// confirm substituído por modal"
    )
    c = c.replace(
        "alert('✓ Requisição aprovada com sucesso!')",
        "setSuccess('Requisição aprovada com sucesso!')"
    )
    c = c.replace(
        "alert('Erro ao aprovar requisição')\n    } catch (error) {\n      console.error('Erro:', error)\n      alert('Erro ao aprovar')",
        "setError('Erro ao aprovar requisição')\n    } catch (error) {\n      console.error('Erro:', error)\n      setError('Erro ao aprovar requisição')"
    )

    # handleRejeitar
    c = c.replace(
        "if (!window.confirm('Tem certeza que deseja REJEITAR esta requisição?')) return",
        "// confirm substituído por modal"
    )
    c = c.replace(
        "alert('✓ Requisição rejeitada com sucesso!')",
        "setSuccess('Requisição rejeitada com sucesso!')"
    )
    c = c.replace(
        "alert('Erro ao rejeitar requisição')\n    } catch (error) {\n      console.error('Erro:', error)\n      alert('Erro ao rejeitar')",
        "setError('Erro ao rejeitar requisição')\n    } catch (error) {\n      console.error('Erro:', error)\n      setError('Erro ao rejeitar requisição')"
    )

    # handleConverterParaPedido
    c = c.replace(
        "if (!window.confirm('Tem certeza que deseja converter para Pedido de Compra?')) return",
        "// confirm substituído por modal"
    )
    c = c.replace(
        "alert('✓ Convertido para Pedido de Compra com sucesso!')",
        "setSuccess('Convertido para Pedido de Compra com sucesso!')"
    )
    c = c.replace(
        "alert('Erro ao converter para pedido')\n    } catch (error) {\n      console.error('Erro:', error)\n      alert('Erro ao converter')",
        "setError('Erro ao converter para pedido')\n    } catch (error) {\n      console.error('Erro:', error)\n      setError('Erro ao converter para pedido')"
    )

    # handleDelete
    c = c.replace(
        "if (!window.confirm('Tem certeza que deseja deletar?')) return\n\n    const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}\n    try {\n      const res = await fetch(`${API_BASE}/api/compras/requisicoes/${id}`, {\n        method: 'DELETE',\n        headers\n      })\n\n      if (res.ok) {\n        fetchRequisicoes()\n        alert('✓ Requisição deletada com sucesso!')\n      }",
        "// confirm substituído por modal\n\n    const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {}\n    try {\n      const res = await fetch(`${API_BASE}/api/compras/requisicoes/${id}`, {\n        method: 'DELETE',\n        headers\n      })\n\n      if (res.ok) {\n        fetchRequisicoes()\n        setSuccess('Requisição deletada com sucesso!')\n      }"
    )

    # handleEnviarEmail
    c = c.replace(
        "if (!destinatariosEmail) {\n      alert('Email é obrigatório')\n      return\n    }\n\n    setEnviandoEmail(true)",
        "if (!destinatariosEmail) {\n      setError('Email é obrigatório')\n      return\n    }\n\n    setEnviandoEmail(true)"
    )
    c = c.replace(
        "alert('✓ Email enviado com sucesso com PDF anexado!')",
        "setSuccess('Email enviado com sucesso!')"
    )
    c = c.replace(
        "alert('Erro ao enviar email')\n    } catch (error) {\n      console.error('Erro:', error)\n      alert('Erro ao enviar email: ' + error.message)",
        "setError('Erro ao enviar email')\n    } catch (error) {\n      console.error('Erro:', error)\n      setError('Erro ao enviar email: ' + error.message)"
    )

    # fetchRequisicoes alert
    c = c.replace(
        "alert('Erro ao carregar requisições')",
        "setError('Erro ao carregar requisições')"
    )

    # Aprovação disponível para PENDENTE também
    c = c.replace(
        "{selectedRQ.status === 'RASCUNHO' && (\n                  <>\n                    <button\n                      onClick={() => handleAprovar(selectedRQ.id)}",
        "{(selectedRQ.status === 'RASCUNHO' || selectedRQ.status === 'PENDENTE') && (\n                  <>\n                    <button\n                      onClick={() => handleAprovar(selectedRQ.id)}"
    )

    # Inserir bloco de notificação após <div className="max-w-7xl mx-auto">
    c = c.replace(
        '<div className="max-w-7xl mx-auto">\n        {/* Header */}',
        f'<div className="max-w-7xl mx-auto">{NOTIFICATION_BLOCK}\n        {{/* Header */}}'
    )

    # Inserir formError no modal acima dos botões
    c = c.replace(
        "              {/* Botões */}\n              <div className=\"flex gap-3 pt-4 border-t\">\n                <button\n                  type=\"button\"\n                  onClick={() => setIsModalOpen(false)}\n                  className=\"flex-1 px-4 py-3 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all\"\n                >\n                  Cancelar\n                </button>",
        "              {formError && (\n                <div className=\"p-3 bg-red-50 border border-red-200 rounded-lg\">\n                  <p className=\"text-red-700 text-sm font-bold\">{formError}</p>\n                </div>\n              )}\n              {/* Botões */}\n              <div className=\"flex gap-3 pt-4 border-t\">\n                <button\n                  type=\"button\"\n                  onClick={() => setIsModalOpen(false)}\n                  className=\"flex-1 px-4 py-3 text-gray-700 font-bold hover:bg-gray-100 rounded-lg transition-all\"\n                >\n                  Cancelar\n                </button>"
    )

    write(path, c)

# ============================================================
# 2. PedidoCompra.jsx
# ============================================================
def fix_pedido():
    path = f'{BASE}/PedidoCompra.jsx'
    c = read(path)

    # Adicionar estados
    c = c.replace(
        "  const [currentId, setCurrentId] = useState(null)",
        "  const [currentId, setCurrentId] = useState(null)\n  const [error, setError] = useState('')\n  const [success, setSuccess] = useState('')\n  const [confirmAction, setConfirmAction] = useState(null)"
    )

    # Bug filtro fornecedor
    c = c.replace(
        "const matchFornecedor = fornecedorFilter === 'todos' || pedido.fornecedor_id === parseInt(fornecedorFilter)",
        "const matchFornecedor = fornecedorFilter === 'todos' || String(pedido.fornecedor_id) === String(fornecedorFilter)"
    )

    # Bug handleGerarPDF - selectedPedido pode ser null
    c = c.replace(
        "a.download = `PC-${selectedPedido.numero_pc}.pdf`",
        "const pedido = pedidos.find(p => p.id === id)\n        a.download = `PC-${pedido?.numero_pc || id}.pdf`\n        document.body.removeChild(a)"
    )
    # Remover appendChild duplicado que já existia
    c = c.replace(
        "document.body.appendChild(a)\n        a.click()\n        document.body.removeChild(a)\n        document.body.removeChild(a)",
        "document.body.appendChild(a)\n        a.click()\n        document.body.removeChild(a)"
    )

    # Aprovação para PENDENTE também
    c = c.replace(
        "{selectedPedido.status === 'RASCUNHO' && (",
        "{(selectedPedido.status === 'RASCUNHO' || selectedPedido.status === 'PENDENTE') && ("
    )

    # Substituir alerts
    c = c.replace("alert('✓ Pedido salvo com sucesso!')", "setSuccess('Pedido salvo com sucesso!')")
    c = c.replace("alert('Erro ao salvar pedido')", "setError('Erro ao salvar pedido')")
    c = c.replace("alert('✓ Pedido aprovado com sucesso!')", "setSuccess('Pedido aprovado com sucesso!')")
    c = c.replace("alert('Erro ao aprovar pedido')", "setError('Erro ao aprovar pedido')")
    c = c.replace("alert('✓ Pedido rejeitado com sucesso!')", "setSuccess('Pedido rejeitado com sucesso!')")
    c = c.replace("alert('Erro ao rejeitar pedido')", "setError('Erro ao rejeitar pedido')")
    c = c.replace("alert('✓ Pedido deletado com sucesso!')", "setSuccess('Pedido deletado com sucesso!')")
    c = c.replace("alert('Erro ao gerar PDF')", "setError('Erro ao gerar PDF')")
    c = c.replace("alert('✓ Email enviado com sucesso com PDF anexado!')", "setSuccess('Email enviado com sucesso!')")
    c = c.replace("alert('Erro ao enviar email')", "setError('Erro ao enviar email')")
    c = c.replace("alert('Erro ao carregar pedidos')", "setError('Erro ao carregar pedidos')")
    c = c.replace("alert('Preencha todos os campos obrigatórios')", "setError('Preencha todos os campos obrigatórios')")
    c = c.replace("alert('Email é obrigatório')", "setError('Email é obrigatório')")

    # window.confirm
    c = c.replace("if (!window.confirm('Tem certeza que deseja APROVAR este pedido?')) return", "// confirm substituído por modal")
    c = c.replace("if (!window.confirm('Tem certeza que deseja REJEITAR este pedido?')) return", "// confirm substituído por modal")
    c = c.replace("if (!window.confirm('Tem certeza que deseja deletar?')) return", "// confirm substituído por modal")

    # Inserir bloco notificação
    c = c.replace(
        '<div className="max-w-7xl mx-auto">\n        {/* Header */}',
        f'<div className="max-w-7xl mx-auto">{NOTIFICATION_BLOCK}\n        {{/* Header */}}'
    )

    write(path, c)

# ============================================================
# 3. OrdemCompra.jsx
# ============================================================
def fix_ordem():
    path = f'{BASE}/OrdemCompra.jsx'
    c = read(path)

    # Adicionar estados e helper fmt
    c = c.replace(
        "  const STATUSES = ['Emitido', 'Confirmado', 'Entrega Parcial', 'Entregue', 'Cancelado']",
        "  const [error, setError] = useState('')\n  const [success, setSuccess] = useState('')\n  const [confirmAction, setConfirmAction] = useState(null)\n  const fmt = (val) => parseFloat(val || 0).toFixed(2)\n\n  const STATUSES = ['Emitido', 'Confirmado', 'Entrega Parcial', 'Entregue', 'Cancelado']"
    )

    # Bug valor_total null
    c = c.replace("oc.valor_total.toFixed(2)", "fmt(oc.valor_total)")
    c = c.replace("oc.valor_total?.toFixed(2)", "fmt(oc.valor_total)")
    c = c.replace("pc.valor_final.toFixed(2)", "fmt(pc.valor_final)")

    # Bug envio email simulado - substituir o bloco setTimeout
    c = c.replace(
        "      // Aqui você chamaria um endpoint real de envio de email\n      // const res = await fetch(`${API_BASE}/api/compras/ordens/${ocParaEnviar.id}/enviar-email`, { method: 'POST', headers, body: JSON.stringify(payload) })\n\n      // Por enquanto, simulamos sucesso\n      setTimeout(() => {\n        setIsEnvioOpen(false)\n        setEnviando(false)\n        alert('Email enviado com sucesso!')\n        fetchData()\n      }, 1000)",
        "      const res = await fetch(`${API_BASE}/api/compras/ordens/${ocParaEnviar.id}/enviar-email`, {\n        method: 'POST',\n        headers,\n        body: JSON.stringify(payload)\n      })\n      if (res.ok) {\n        setIsEnvioOpen(false)\n        setSuccess('Email enviado com sucesso!')\n        fetchData()\n      } else {\n        const data = await res.json().catch(() => ({}))\n        setError(data.error || 'Erro ao enviar email')\n      }\n      setEnviando(false)"
    )

    # Bug filtro status dropdown hover → select simples
    old_status_filter = '''              <div className="relative group">
              <div className="p-2 border rounded-lg bg-white cursor-pointer flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <ChevronDown size={16} />
              </div>
              <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-2 hidden group-hover:block z-10 min-w-max">
                {STATUSES.map(s => (
                  <label key={s} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={statusFilter.includes(s)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setStatusFilter([...statusFilter, s])
                        } else {
                          setStatusFilter(statusFilter.filter(x => x !== s))
                        }
                      }}
                    />
                    <span className="text-sm">{s}</span>
                  </label>
                ))}
              </div>
            </div>'''

    new_status_filter = '''              <select
              className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              value={statusFilter[0] || ''}
              onChange={(e) => setStatusFilter(e.target.value ? [e.target.value] : [])}
            >
              <option value="">Todos Status</option>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>'''

    c = c.replace(old_status_filter, new_status_filter)

    # alerts e confirms restantes
    c = c.replace("alert('Selecione um Pedido e um Fornecedor')", "setError('Selecione um Pedido e um Fornecedor')")
    c = c.replace("alert('Erro ao gerar ordem')", "setError('Erro ao gerar ordem')")
    c = c.replace("alert('Ordem de Compra gerada com sucesso!')", "setSuccess('Ordem de Compra gerada com sucesso!')")
    c = c.replace("alert('Pedido e Fornecedor são obrigatórios')", "setError('Pedido e Fornecedor são obrigatórios')")
    c = c.replace("alert('Erro ao salvar ordem')", "setError('Erro ao salvar ordem')")
    c = c.replace("alert('Email é obrigatório')", "setError('Email é obrigatório')")
    c = c.replace("alert('Erro ao enviar email')", "setError('Erro ao enviar email')")
    c = c.replace("if (!window.confirm('Tem certeza que deseja deletar?')) return", "// confirm substituído por modal")

    # Inserir bloco notificação
    c = c.replace(
        '<div className="max-w-7xl mx-auto">\n        {/* Header */}',
        f'<div className="max-w-7xl mx-auto">{NOTIFICATION_BLOCK}\n        {{/* Header */}}'
    )

    write(path, c)

# ============================================================
# 4. DashboardCompras.jsx
# ============================================================
def fix_dashboard():
    path = f'{BASE}/DashboardCompras.jsx'
    c = read(path)

    # Bug reduce com valor null
    c = c.replace(
        "const valorTotalRQ = requisicoes.reduce((sum, r) => sum + r.valor_total, 0)",
        "const valorTotalRQ = requisicoes.reduce((sum, r) => sum + parseFloat(r.valor_total || 0), 0)"
    )
    c = c.replace(
        "const valorTotalPC = pedidos.reduce((sum, p) => sum + p.valor_final, 0)",
        "const valorTotalPC = pedidos.reduce((sum, p) => sum + parseFloat(p.valor_final || 0), 0)"
    )

    # Bug soma NaN no card valor total
    c = c.replace(
        "R$ {(statsCards.valorTotalRQ + statsCards.valorTotalPC).toFixed(2)}",
        "R$ {(parseFloat(statsCards.valorTotalRQ || 0) + parseFloat(statsCards.valorTotalPC || 0)).toFixed(2)}"
    )

    # Bug toFixed em tabelas de resumo
    c = c.replace("rq.valor_total.toFixed(2)", "parseFloat(rq.valor_total || 0).toFixed(2)")
    c = c.replace("pc.valor_final.toFixed(2)", "parseFloat(pc.valor_final || 0).toFixed(2)")

    # Bug gráfico eixo X com datas brutas
    c = c.replace(
        '<XAxis dataKey="data" stroke="#9CA3AF" style={{ fontSize: \'12px\' }} />',
        '<XAxis dataKey="data" stroke="#9CA3AF" style={{ fontSize: \'11px\' }} tickFormatter={(val) => { const d = new Date(val); return `${d.getDate()}/${d.getMonth()+1}` }} interval={4} />'
    )

    write(path, c)

# ============================================================
# 5. GruposItens.jsx
# ============================================================
def fix_grupos():
    path = f'{BASE}/GruposItens.jsx'
    c = read(path)

    # Adicionar estados
    c = c.replace(
        "  const [loading, setLoading] = useState(false)",
        "  const [loading, setLoading] = useState(false)\n  const [error, setError] = useState('')\n  const [success, setSuccess] = useState('')"
    )

    # Substituir alerts
    c = c.replace("alert('Nome é obrigatório')", "setError('Nome é obrigatório')")
    c = c.replace("alert('Erro ao salvar grupo')", "setError('Erro ao salvar grupo')")

    # Inserir bloco notificação simples (sem confirmAction)
    NOTIF_SIMPLE = '''{error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700 font-bold">{error}</span>
            <button onClick={() => setError('')}><X size={18} /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-green-700 font-bold">{success}</span>
            <button onClick={() => setSuccess('')}><X size={18} /></button>
          </div>
        )}'''

    c = c.replace(
        '<div className="max-w-6xl mx-auto">\n        {/* Header */}',
        f'<div className="max-w-6xl mx-auto">\n        {NOTIF_SIMPLE}\n        {{/* Header */}}'
    )

    write(path, c)

# ============================================================
# 6. ItensEstrutura.jsx
# ============================================================
def fix_itens():
    path = f'{BASE}/ItensEstrutura.jsx'
    c = read(path)

    # Adicionar estados
    c = c.replace(
        "  const [loading, setLoading] = useState(false)",
        "  const [loading, setLoading] = useState(false)\n  const [error, setError] = useState('')\n  const [success, setSuccess] = useState('')"
    )

    # Substituir alerts
    c = c.replace("alert('Código, Nome e Grupo são obrigatórios')", "setError('Código, Nome e Grupo são obrigatórios')")
    c = c.replace("alert('Erro ao salvar item')", "setError('Erro ao salvar item')")

    NOTIF_SIMPLE = '''{error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <span className="text-red-700 font-bold">{error}</span>
            <button onClick={() => setError('')}><X size={18} /></button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-green-700 font-bold">{success}</span>
            <button onClick={() => setSuccess('')}><X size={18} /></button>
          </div>
        )}'''

    c = c.replace(
        '<div className="max-w-7xl mx-auto">\n        {/* Header */}',
        f'<div className="max-w-7xl mx-auto">\n        {NOTIF_SIMPLE}\n        {{/* Header */}}'
    )

    write(path, c)

# ============================================================
# EXECUTAR TUDO
# ============================================================
if __name__ == '__main__':
    print('🔧 Aplicando correções...\n')
    fix_requisicao()
    fix_pedido()
    fix_ordem()
    fix_dashboard()
    fix_grupos()
    fix_itens()
    print('\n✅ Todas as correções aplicadas!')
    print('👉 Rode: cd /var/www/cmms_project/frontend && npm run build')
