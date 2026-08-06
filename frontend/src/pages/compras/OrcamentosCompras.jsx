import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://vimax.ad.digimaxdiagnostico.com.br:5002'

const STATUS_COLORS = {
  ABERTA:    'bg-green-100 text-green-800',
  ENCERRADA: 'bg-gray-100 text-gray-700',
  CANCELADA: 'bg-red-100 text-red-700',
}

const PROPOSTA_COLORS = {
  PENDENTE:   'bg-yellow-100 text-yellow-800',
  RESPONDIDA: 'bg-blue-100 text-blue-800',
  EXPIRADA:   'bg-red-100 text-red-700',
}

export default function OrcamentosCompras() {
  const { user } = useAuth()
  const headers = user?.api_token
    ? { 'X-API-Token': user.api_token, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }

  const [cotacoes,       setCotacoes]       = useState([])
  const [cotacaoAtiva,   setCotacaoAtiva]   = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [loadingDetalhe, setLoadingDetalhe] = useState(false)
  const [error,          setError]          = useState('')
  const [confirmando,    setConfirmando]    = useState(null)
  const [salvando,       setSalvando]       = useState(false)
  const [sucesso,        setSucesso]        = useState('')
  const [avaliacoes,     setAvaliacoes]     = useState({})

  const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const fetchCotacoes = useCallback(async () => {
    try {
      setLoading(true)
      const r = await fetch(`${API_BASE}/api/cotacoes`, { headers })
      const d = await r.json()
      setCotacoes(Array.isArray(d) ? d : [])
    } catch { setError('Erro ao carregar cotações') }
    finally { setLoading(false) }
  }, [])

  const fetchAvaliacoes = async (empresaId) => {
    try {
      const params = new URLSearchParams()
      if (empresaId) params.set('empresa_id', empresaId)
      const query = params.toString() ? `?${params.toString()}` : ''
      const r = await fetch(
        `${API_BASE}/api/compras/classificacao-fornecedores/ranking${query}`,
        { headers }
      )
      const d = await r.json()
      if (!r.ok || !Array.isArray(d)) {
        setAvaliacoes({})
        return
      }
      const mapa = {}
      d.forEach(item => {
        mapa[String(item.fornecedor_id)] = item
      })
      setAvaliacoes(mapa)
    } catch {
      setAvaliacoes({})
    }
  }

  const abrirCotacao = async (id) => {
    try {
      setLoadingDetalhe(true)
      const r = await fetch(`${API_BASE}/api/cotacoes/${id}`, { headers })
      const d = await r.json()
      setCotacaoAtiva(d)
      await fetchAvaliacoes(d.empresa_id)
    } catch { setError('Erro ao carregar cotação') }
    finally { setLoadingDetalhe(false) }
  }

  const selecionarVencedor = async (proposta_id) => {
    if (!cotacaoAtiva) return
    try {
      setSalvando(true)
      const r = await fetch(`${API_BASE}/api/cotacoes/${cotacaoAtiva.id}/selecionar-vencedor`, {
        method: 'POST', headers,
        body: JSON.stringify({ proposta_id })
      })
      const d = await r.json()
      if (d.success) {
        setSucesso(d.message || 'Ordem de Compra gerada!')
        setConfirmando(null)
        fetchCotacoes()
        abrirCotacao(cotacaoAtiva.id)
      } else setError(d.error || 'Erro ao selecionar vencedor')
    } catch { setError('Erro ao selecionar vencedor') }
    finally { setSalvando(false) }
  }

  const encerrarCotacao = async () => {
    if (!cotacaoAtiva) return
    try {
      await fetch(`${API_BASE}/api/cotacoes/${cotacaoAtiva.id}/encerrar`, { method: 'POST', headers })
      fetchCotacoes()
      abrirCotacao(cotacaoAtiva.id)
    } catch { setError('Erro ao encerrar cotação') }
  }

  useEffect(() => { fetchCotacoes() }, [fetchCotacoes])

  const propostasRespondidas = (cotacaoAtiva?.propostas || []).filter(p => p.status === 'RESPONDIDA')
  const menorValor = propostasRespondidas.length > 0
    ? Math.min(...propostasRespondidas.map(p => p.valor_total).filter(v => v > 0))
    : null

  const avaliacaoFornecedor = (fornecedorId) => (
    avaliacoes[String(fornecedorId)] || null
  )

  const badgeAvaliacao = (fornecedorId, compacta = false) => {
    const avaliacao = avaliacaoFornecedor(fornecedorId)
    if (!avaliacao) {
      return (
        <span className="text-[11px] text-gray-400 whitespace-nowrap">
          ☆ Sem avaliação
        </span>
      )
    }
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap"
        title={`${avaliacao.total_avaliacoes} avaliação(ões) nesta clínica`}
      >
        <span className="text-amber-500">★</span>
        {Number(avaliacao.nota_media || 0).toFixed(1)}
        {!compacta && (
          <span className="font-normal text-amber-600">
            ({avaliacao.total_avaliacoes})
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos / Cotações</h1>
          <p className="text-gray-500 text-sm mt-1">Comparativo de propostas de fornecedores</p>
        </div>
        <button onClick={fetchCotacoes} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          🔄 Atualizar
        </button>
      </div>

      {sucesso && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex justify-between">
          <span className="text-green-800 font-medium">✅ {sucesso}</span>
          <button onClick={() => setSucesso('')}>✕</button>
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between">
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-700">Cotações ({cotacoes.length})</h2>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400">Carregando...</div>
            ) : cotacoes.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p className="text-sm">Nenhuma cotação encontrada</p>
                <p className="text-xs mt-1">Solicite cotações a partir dos Pedidos de Compra</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cotacoes.map(c => (
                  <button key={c.id} onClick={() => abrirCotacao(c.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${cotacaoAtiva?.id === c.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800 text-sm">{c.numero_cotacao}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {c.pedido?.numero_pc && <span>PC: {c.pedido.numero_pc} · </span>}
                      <span>{c.propostas_respondidas}/{c.total_propostas} respondidas</span>
                    </div>
                    {c.data_limite && (
                      <div className="text-xs text-orange-600 mt-0.5">
                        ⏰ Limite: {new Date(c.data_limite).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detalhe */}
        <div className="lg:col-span-2">
          {loadingDetalhe ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Carregando...</div>
          ) : !cotacaoAtiva ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
              <p className="text-5xl mb-3">👈</p>
              <p>Selecione uma cotação para ver o comparativo</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header cotação */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{cotacaoAtiva.numero_cotacao}</h2>
                  <p className="text-sm text-gray-500">
                    {cotacaoAtiva.pedido?.numero_pc && `PC: ${cotacaoAtiva.pedido.numero_pc} · `}
                    {cotacaoAtiva.total_propostas} fornecedores · {cotacaoAtiva.propostas_respondidas} responderam
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {cotacaoAtiva.status === 'ABERTA' && (
                    <button onClick={encerrarCotacao}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                      Encerrar
                    </button>
                  )}
                  <span className={`px-3 py-1.5 text-sm rounded-lg font-medium ${STATUS_COLORS[cotacaoAtiva.status]}`}>
                    {cotacaoAtiva.status}
                  </span>
                </div>
              </div>

              {/* Cards de propostas */}
              {(cotacaoAtiva.propostas || []).length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  Nenhuma proposta ainda.
                </div>
              ) : (
                <>
                  <div className={`grid gap-4 grid-cols-1 ${cotacaoAtiva.propostas.length >= 2 ? 'md:grid-cols-2' : ''} ${cotacaoAtiva.propostas.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
                    {cotacaoAtiva.propostas.map(p => {
                      const isMelhor = p.status === 'RESPONDIDA' && menorValor !== null && p.valor_total === menorValor && p.valor_total > 0
                      return (
                        <div key={p.id} className={`bg-white rounded-xl border-2 shadow-sm ${isMelhor ? 'border-green-400' : 'border-gray-200'}`}>
                          {isMelhor && (
                            <div className="bg-green-500 text-white text-xs font-bold text-center py-1 rounded-t-xl">
                              🏆 MENOR PREÇO
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="font-bold text-gray-900 text-sm">{p.fornecedor?.nome || 'Fornecedor'}</h3>
                                <div className="mt-1">
                                  {badgeAvaliacao(p.fornecedor_id)}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{p.email_fornecedor}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${PROPOSTA_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                                {p.status}
                              </span>
                            </div>

                            {p.status === 'RESPONDIDA' ? (
                              <>
                                <div className="space-y-1 mb-3">
                                  {(p.itens || []).map(item => (
                                    <div key={item.id} className="flex justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                                      <span className="text-gray-600 truncate pr-2">{item.nome_item}</span>
                                      <div className="text-right shrink-0">
                                        {item.marca && <span className="text-gray-400 mr-1">({item.marca})</span>}
                                        <span className="font-medium">{fmt(item.valor_unitario)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="space-y-1 text-xs text-gray-600 mb-3">
                                  <div className="flex justify-between">
                                    <span>Frete:</span><span>{fmt(p.valor_frete)}</span>
                                  </div>
                                  {p.prazo_entrega && (
                                    <div className="flex justify-between">
                                      <span>Prazo:</span><span>{p.prazo_entrega} dias</span>
                                    </div>
                                  )}
                                  {p.condicao_pagamento && (
                                    <div className="flex justify-between">
                                      <span>Pagamento:</span><span className="text-right max-w-[60%]">{p.condicao_pagamento}</span>
                                    </div>
                                  )}
                                </div>

                                <div className={`pt-3 border-t text-center ${isMelhor ? 'border-green-300' : 'border-gray-200'}`}>
                                  <p className="text-xs text-gray-500">Total Geral</p>
                                  <p className={`text-xl font-bold ${isMelhor ? 'text-green-600' : 'text-gray-900'}`}>
                                    {fmt(p.valor_total)}
                                  </p>
                                </div>

                                {p.observacoes && (
                                  <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">{p.observacoes}</p>
                                )}

                                {(p.anexos || []).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {p.anexos.map((a, i) => (
                                      <a key={i} href={`${API_BASE}${a}`} target="_blank" rel="noreferrer"
                                        className="text-xs text-blue-600 underline">📎 Anexo {i + 1}</a>
                                    ))}
                                  </div>
                                )}

                                {cotacaoAtiva.status === 'ABERTA' && (
                                  confirmando === p.id ? (
                                    <div className="mt-3 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                                      <p className="text-xs text-yellow-800 mb-2 text-center font-medium">
                                        Confirmar como vencedor e gerar OC?
                                      </p>
                                      <div className="flex gap-2">
                                        <button onClick={() => selecionarVencedor(p.id)} disabled={salvando}
                                          className="flex-1 py-1.5 bg-green-600 text-white text-xs rounded font-medium hover:bg-green-700 disabled:opacity-50">
                                          {salvando ? '...' : '✓ Confirmar'}
                                        </button>
                                        <button onClick={() => setConfirmando(null)}
                                          className="flex-1 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button onClick={() => setConfirmando(p.id)}
                                      className={`mt-3 w-full py-2 text-xs font-bold rounded-lg transition-colors ${isMelhor ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                                      🏆 Selecionar Vencedor
                                    </button>
                                  )
                                )}
                              </>
                            ) : (
                              <div className="text-center py-6 text-gray-400">
                                <p className="text-3xl mb-1">⏳</p>
                                <p className="text-xs">Aguardando resposta</p>
                                {p.data_resposta && (
                                  <p className="text-xs mt-1">Respondido: {new Date(p.data_resposta).toLocaleDateString('pt-BR')}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Tabela comparativa */}
                  {propostasRespondidas.length > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-semibold text-gray-700 text-sm">📊 Tabela Comparativa por Item</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left px-4 py-2 text-gray-600 font-medium">Item</th>
                              <th className="text-center px-3 py-2 text-gray-600">Qtd</th>
                              {propostasRespondidas.map(p => (
                                <th key={p.id} className="text-center px-3 py-2 text-gray-600 max-w-[140px]">
                                  <div className="flex flex-col items-center gap-1">
                                    <span>{p.fornecedor?.nome}</span>
                                    {badgeAvaliacao(p.fornecedor_id, true)}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(propostasRespondidas[0]?.itens || []).map((itemRef, idx) => {
                              const valores = propostasRespondidas.map(p => p.itens[idx]?.valor_unitario || 0).filter(v => v > 0)
                              const menor = valores.length > 0 ? Math.min(...valores) : null
                              return (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-4 py-2 text-gray-700">{itemRef.nome_item}</td>
                                  <td className="px-3 py-2 text-center text-gray-500">{itemRef.quantidade} {itemRef.unidade_medida}</td>
                                  {propostasRespondidas.map(p => {
                                    const item = p.itens[idx]
                                    const isBest = menor !== null && item?.valor_unitario === menor && item?.valor_unitario > 0
                                    return (
                                      <td key={p.id} className={`px-3 py-2 text-center font-medium ${isBest ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}>
                                        {item?.valor_unitario > 0 ? fmt(item.valor_unitario) : '-'}
                                        {isBest && ' ✓'}
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                            {/* Linha de totais */}
                            <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                              <td className="px-4 py-2 text-gray-800" colSpan={2}>Total Geral</td>
                              {propostasRespondidas.map(p => {
                                const isBest = menorValor !== null && p.valor_total === menorValor && p.valor_total > 0
                                return (
                                  <td key={p.id} className={`px-3 py-2 text-center ${isBest ? 'text-green-700' : 'text-gray-800'}`}>
                                    {fmt(p.valor_total)}
                                    {isBest && ' 🏆'}
                                  </td>
                                )
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}