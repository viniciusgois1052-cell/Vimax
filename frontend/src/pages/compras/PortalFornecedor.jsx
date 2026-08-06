import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_URL || 'http://vimax.ad.digimaxdiagnostico.com.br:5002'

export default function PortalFornecedor() {
  const [searchParams]  = useSearchParams()
  const tokenUrl        = searchParams.get('token')

  const [step,        setStep]        = useState('login')   // login | trocar-senha | formulario | enviado
  const [tokenAcesso, setTokenAcesso] = useState(tokenUrl || '')
  const [proposta,    setProposta]    = useState(null)
  const [cotacao,     setCotacao]     = useState(null)
  const [fornecedor,  setFornecedor]  = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [salvando,    setSalvando]    = useState(false)

  // Form login
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')

  // Form nova senha
  const [novaSenha,    setNovaSenha]    = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')

  // Form proposta
  const [itens,             setItens]             = useState([])
  const [valorFrete,        setValorFrete]        = useState(0)
  const [prazoEntrega,      setPrazoEntrega]      = useState('')
  const [condicaoPagamento, setCondicaoPagamento] = useState('')
  const [observacoes,       setObservacoes]       = useState('')
  const [uploadingIdx,      setUploadingIdx]      = useState(null)

  // Se veio token pela URL, tenta buscar proposta direto
  useEffect(() => {
    if (tokenUrl) {
      setTokenAcesso(tokenUrl)
    }
  }, [tokenUrl])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/cotacoes/portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), senha, token: tokenUrl || undefined })
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Erro ao fazer login'); return }

      setTokenAcesso(d.token_acesso)
      setFornecedor(d.fornecedor)
      setCotacao(d.cotacao)

      if (d.primeiro_acesso) {
        setStep('trocar-senha')
      } else {
        carregarProposta(d.token_acesso, d.proposta)
      }
    } catch (e) { setError('Erro de conexão') }
    finally { setLoading(false) }
  }

  const handleTrocarSenha = async (e) => {
    e.preventDefault()
    setError('')
    if (novaSenha !== confirmSenha) { setError('As senhas não coincidem'); return }
    if (novaSenha.length < 6) { setError('A senha deve ter ao menos 6 caracteres'); return }
    setLoading(true)
    try {
      const r = await fetch(`${API_BASE}/api/cotacoes/portal/alterar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_acesso: tokenAcesso, nova_senha: novaSenha })
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Erro ao alterar senha'); return }
      // Após trocar senha, carregar proposta
      await carregarPropostaRemoto(tokenAcesso)
    } catch (e) { setError('Erro de conexão') }
    finally { setLoading(false) }
  }

  const carregarPropostaRemoto = async (token) => {
    const r = await fetch(`${API_BASE}/api/cotacoes/portal/proposta/${token}`)
    const d = await r.json()
    carregarProposta(token, d)
  }

  const carregarProposta = (token, data) => {
    setProposta(data)
    setItens((data.itens || []).map(i => ({ ...i })))
    setValorFrete(data.valor_frete || 0)
    setPrazoEntrega(data.prazo_entrega || '')
    setCondicaoPagamento(data.condicao_pagamento || '')
    setObservacoes(data.observacoes || '')
    if (data.status === 'RESPONDIDA') setStep('enviado')
    else setStep('formulario')
  }

  const atualizarItem = (idx, campo, valor) => {
    setItens(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [campo]: valor }
      if (campo === 'valor_unitario') updated.valor_total = parseFloat(valor || 0) * item.quantidade
      return updated
    }))
  }

  const handleUploadFoto = async (idx, file) => {
    if (!file) return
    setUploadingIdx(idx)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('token', tokenAcesso)
      const r = await fetch(`${API_BASE}/api/cotacoes/portal/upload`, { method: 'POST', body: fd })
      const d = await r.json()
      if (d.success) atualizarItem(idx, 'foto_url', d.url)
      else setError('Erro no upload: ' + d.error)
    } catch (e) { setError('Erro no upload') }
    finally { setUploadingIdx(null) }
  }

  const handleEnviar = async (e) => {
    e.preventDefault()
    setError('')
    const semPreco = itens.filter(i => !i.valor_unitario || i.valor_unitario <= 0)
    if (semPreco.length > 0) { setError('Preencha o preço de todos os itens'); return }
    setSalvando(true)
    try {
      const r = await fetch(`${API_BASE}/api/cotacoes/portal/proposta/${tokenAcesso}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens, valor_frete: parseFloat(valorFrete) || 0, prazo_entrega: prazoEntrega, condicao_pagamento: condicaoPagamento, observacoes })
      })
      const d = await r.json()
      if (d.success) setStep('enviado')
      else setError(d.error || 'Erro ao enviar proposta')
    } catch (e) { setError('Erro ao enviar proposta') }
    finally { setSalvando(false) }
  }

  const totalItens   = itens.reduce((s, i) => s + (parseFloat(i.valor_unitario || 0) * i.quantidade), 0)
  const totalGeral   = totalItens + parseFloat(valorFrete || 0)
  const fmt          = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">V</div>
          <div>
            <h1 className="font-bold text-gray-900">Portal do Fornecedor</h1>
            <p className="text-xs text-gray-500">Vimax CMMS</p>
          </div>
          {fornecedor && (
            <div className="ml-auto text-right">
              <p className="text-sm font-medium text-gray-700">{fornecedor.nome}</p>
              <p className="text-xs text-gray-500">{fornecedor.email}</p>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')}>✕</button>
          </div>
        )}

        {/* LOGIN */}
        {step === 'login' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-3xl">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Acesso ao Portal</h2>
                <p className="text-gray-500 text-sm mt-1">Use as credenciais recebidas por email</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                {!tokenUrl && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="seu@email.com" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                  <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Senha temporária recebida por email" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {loading ? 'Entrando...' : 'Entrar no Portal →'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TROCAR SENHA */}
        {step === 'trocar-senha' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="text-center mb-6">
                <span className="text-4xl">🔑</span>
                <h2 className="text-xl font-bold text-gray-900 mt-2">Primeiro Acesso</h2>
                <p className="text-gray-500 text-sm mt-1">Crie uma senha personalizada para continuar</p>
              </div>
              <form onSubmit={handleTrocarSenha} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                  <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={6}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                  <input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {loading ? 'Salvando...' : 'Salvar e Continuar →'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* FORMULARIO DA PROPOSTA */}
        {step === 'formulario' && proposta && (
          <form onSubmit={handleEnviar} className="space-y-6">
            {/* Info cotação */}
            {cotacao && (
              <div className="bg-white rounded-xl border border-blue-200 p-4 flex flex-wrap gap-4">
                <div><p className="text-xs text-gray-500">Cotação</p><p className="font-bold text-blue-700">{cotacao.numero_cotacao}</p></div>
                {cotacao.data_limite && <div><p className="text-xs text-gray-500">Prazo</p><p className="font-semibold text-orange-600">{new Date(cotacao.data_limite).toLocaleDateString('pt-BR')}</p></div>}
                {cotacao.observacoes && <div className="flex-1"><p className="text-xs text-gray-500">Observações</p><p className="text-sm text-gray-700">{cotacao.observacoes}</p></div>}
              </div>
            )}

            {/* Itens */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-800">📦 Itens para Cotar</h2>
                <p className="text-xs text-gray-500 mt-0.5">Preencha o preço unitário de cada item</p>
              </div>
              <div className="divide-y divide-gray-100">
                {itens.map((item, idx) => (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {item.codigo_item && <span className="text-xs text-gray-400 mr-2">[{item.codigo_item}]</span>}
                        <span className="font-medium text-gray-800">{item.nome_item}</span>
                        <span className="ml-2 text-sm text-gray-500">{item.quantidade} {item.unidade_medida}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-700">{fmt(item.valor_total || 0)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Preço Unitário *</label>
                        <input type="number" min="0" step="0.01"
                          value={item.valor_unitario || ''}
                          onChange={e => atualizarItem(idx, 'valor_unitario', e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0,00" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Marca</label>
                        <input type="text" value={item.marca || ''} onChange={e => atualizarItem(idx, 'marca', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Marca/Fabricante" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Foto/Imagem</label>
                        <label className="flex items-center gap-2 cursor-pointer border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                          {uploadingIdx === idx ? '⏳ Enviando...' : item.foto_url ? '✅ Enviada' : '📷 Foto'}
                          <input type="file" accept="image/*,application/pdf" className="hidden"
                            onChange={e => handleUploadFoto(idx, e.target.files[0])} disabled={uploadingIdx !== null} />
                        </label>
                        {item.foto_url && (
                          <a href={`${API_BASE}${item.foto_url}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline mt-1 block">Ver arquivo</a>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Observação</label>
                        <input type="text" value={item.observacao || ''} onChange={e => atualizarItem(idx, 'observacao', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Obs do item" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Condições gerais */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-800 mb-4">🚚 Condições Gerais</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Frete (R$)</label>
                  <input type="number" min="0" step="0.01" value={valorFrete} onChange={e => setValorFrete(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0,00" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Prazo de Entrega (dias)</label>
                  <input type="number" min="1" value={prazoEntrega} onChange={e => setPrazoEntrega(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 7" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Condição de Pagamento</label>
                  <input type="text" value={condicaoPagamento} onChange={e => setCondicaoPagamento(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 30/60 dias, À vista..." />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-700 block mb-1">Observações gerais</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Validade da proposta, condições especiais, etc..." />
              </div>
            </div>

            {/* Resumo + Enviar */}
            <div className="bg-blue-600 rounded-xl p-4 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-6">
                <div><p className="text-blue-200 text-xs">Subtotal Itens</p><p className="font-bold">{fmt(totalItens)}</p></div>
                <div><p className="text-blue-200 text-xs">Frete</p><p className="font-bold">{fmt(parseFloat(valorFrete) || 0)}</p></div>
                <div><p className="text-blue-200 text-xs">Total Geral</p><p className="text-2xl font-bold">{fmt(totalGeral)}</p></div>
              </div>
              <button type="submit" disabled={salvando}
                className="px-8 py-3 bg-white text-blue-700 rounded-lg font-bold hover:bg-blue-50 disabled:opacity-50 transition-colors">
                {salvando ? 'Enviando...' : '✅ Enviar Proposta'}
              </button>
            </div>
          </form>
        )}

        {/* ENVIADO */}
        {step === 'enviado' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-2xl shadow-lg p-10">
              <div className="text-7xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposta Enviada!</h2>
              <p className="text-gray-500 mb-6">Sua proposta foi recebida com sucesso. Nossa equipe de compras irá analisá-la e entrará em contato.</p>
              <div className="bg-green-50 rounded-lg p-4 text-left">
                <p className="text-sm text-green-800 font-medium">✅ Dados recebidos:</p>
                {proposta && (
                  <div className="mt-2 text-sm text-green-700 space-y-1">
                    <p>Total: <strong>{fmt(proposta.valor_total || totalGeral)}</strong></p>
                    {prazoEntrega && <p>Prazo: <strong>{prazoEntrega} dias</strong></p>}
                    {condicaoPagamento && <p>Pagamento: <strong>{condicaoPagamento}</strong></p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        Portal do Fornecedor — Vimax CMMS © {new Date().getFullYear()}
      </footer>
    </div>
  )
}