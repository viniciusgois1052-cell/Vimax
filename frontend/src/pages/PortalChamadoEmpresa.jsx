import React, { useState, useEffect, useMemo } from 'react'

import { useParams } from 'react-router-dom'
import { Wrench, AlertCircle, CheckCircle, Camera, X, ChevronLeft, Send, Loader2, Layers, MapPin } from 'lucide-react'

const API_BASE = window.location.origin.includes('5173')
    ? `${window.location.protocol}//${window.location.hostname}:5002`
    : window.location.origin
const API = `${API_BASE}/api`

const VIMAX_LOGO = 'http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Icone.png'

const GlobalRoundedStyle = () => (
    <style>{`
        html, body, #root {
            border-radius: 2rem;
            overflow-x: hidden;
            overflow-y: auto;
        }
    `}</style>
)

const s = {
    page:    { background: '#efefef', minHeight: '100vh' },
    card:    { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1.5rem' },
    input:   { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '1rem', color: '#374151', width: '100%', padding: '0.75rem 1rem', outline: 'none' },
    label:   { color: '#6b7280', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' },
    btnPrim: { background: '#6b7280', color: '#fff', borderRadius: '1rem', fontWeight: 700, width: '100%', padding: '0.875rem', cursor: 'pointer', border: 'none' },
    btnDis:  { background: '#e5e7eb', color: '#9ca3af', borderRadius: '1rem', fontWeight: 700, width: '100%', padding: '0.875rem', cursor: 'not-allowed', border: 'none' },
}

function LoadingScreen() {
    return (
        <div className="flex items-center justify-center h-screen" style={{ background: '#efefef' }}>
            <div className="text-center">
                <Loader2 className="animate-spin mx-auto mb-4" size={48} style={{ color: '#9ca3af' }} />
                <p className="font-medium" style={{ color: '#6b7280' }}>Carregando portal...</p>
            </div>
        </div>
    )
}

function ErrorScreen({ message }) {
    return (
        <div className="flex items-center justify-center h-screen p-4" style={{ background: '#efefef' }}>
            <div className="p-8 max-w-md w-full text-center" style={s.card}>
                <AlertCircle className="mx-auto text-red-400 mb-4" size={48} />
                <h2 className="text-2xl font-bold mb-2" style={{ color: '#374151' }}>Portal não encontrado</h2>
                <p style={{ color: '#9ca3af' }}>{message || 'Esta empresa não existe ou não está disponível.'}</p>
            </div>
        </div>
    )
}

function LoginPortal({ empresa, onLoginSuccess }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const response = await fetch(`${API}/public/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            if (response.ok) {
                const data = await response.json()
                if (data.user.empresa_id === empresa.id || !data.user.empresa_id) {
                    onLoginSuccess(data.user, data.token)
                } else {
                    setError('Você não tem permissão para acessar este portal.')
                }
            } else {
                setError('Usuário ou senha inválidos.')
            }
        } catch {
            setError('Erro de conexão. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ background: '#efefef' }}>
            <div className="w-full max-w-md" style={s.card}>
                <div className="p-8 flex flex-col items-center border-b" style={{ borderColor: '#f3f4f6' }}>
                    <div className="rounded-2xl flex items-center justify-center mb-4 border overflow-hidden px-6 py-3" style={{ background: '#fff', borderColor: '#e5e7eb' }}>
                        <img src="http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Logo.png" alt="Vimax" className="h-10 object-contain" />
                    </div>
                    <h1 className="text-xl font-bold mb-1" style={{ color: '#374151' }}>{empresa.nome}</h1>
                    <p className="text-sm" style={{ color: '#9ca3af' }}>Portal de Abertura de Chamados</p>
                </div>
                <div className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-2xl text-sm font-medium" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
                                {error}
                            </div>
                        )}
                        <div>
                            <label style={s.label}>Usuário</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={s.input} placeholder="Seu usuário" required />
                        </div>
                        <div>
                            <label style={s.label}>Senha</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={s.input} placeholder="Sua senha" required />
                        </div>
                        <button type="submit" disabled={loading} style={loading ? s.btnDis : s.btnPrim}>
                            {loading ? 'Autenticando...' : 'Entrar no Portal'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

function SuccessScreen({ tipo, numeroChamado, onNovoChamado }) {
    return (
        <div className="flex items-center justify-center min-h-screen p-4" style={{ background: '#efefef' }}>
            <div className="p-10 max-w-md w-full text-center" style={s.card}>
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-200">
                    <CheckCircle className="text-green-500" size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-3" style={{ color: '#374151' }}>Chamado Aberto!</h2>
                <p className="mb-2" style={{ color: '#6b7280' }}>
                    Seu chamado de <strong style={{ color: '#374151' }}>{tipo === 'maquinario' ? 'Maquinário' : 'Infraestrutura'}</strong> foi registrado com sucesso.
                </p>
                {numeroChamado && (
                    <div className="my-5 px-6 py-4 border-2" style={{ background: '#f9fafb', borderColor: '#e5e7eb', borderRadius: '1.25rem' }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>Número do chamado</p>
                        <p className="text-3xl font-black" style={{ color: '#374151' }}>#{numeroChamado}</p>
                    </div>
                )}
                <p className="text-sm mb-8" style={{ color: '#9ca3af' }}>Nossa equipe irá analisar e entrar em contato em breve.</p>
                <button onClick={onNovoChamado} style={s.btnPrim}
                    onMouseEnter={e => e.target.style.background = '#4b5563'}
                    onMouseLeave={e => e.target.style.background = '#6b7280'}>
                    Abrir Outro Chamado
                </button>
            </div>
        </div>
    )
}

function TipoSelector({ empresa, onSelect }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4" style={{ background: '#efefef' }}>
            <div className="w-full max-w-lg">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border overflow-hidden" style={{ background: '#fff', borderColor: '#e5e7eb' }}>
                        <img src={VIMAX_LOGO} alt="Vimax" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#374151' }}>{empresa.nome}</h1>
                    <p className="text-sm uppercase tracking-widest font-medium" style={{ color: '#9ca3af' }}>Portal Vimax</p>
                </div>
                <p className="text-center font-medium mb-6 text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>
                    Selecione o tipo de chamado
                </p>
                <div className="grid grid-cols-1 gap-3">
                    {[
                        { tipo: 'maquinario',     icon: <Wrench size={26} style={{ color: '#6b7280' }} />, titulo: 'Maquinário',     desc: 'Problemas em máquinas, equipamentos e ativos' },
                        { tipo: 'infraestrutura', icon: <Layers size={26} style={{ color: '#6b7280' }} />, titulo: 'Infraestrutura', desc: 'Problemas em instalações, rede, elétrica e civil' },
                    ].map(({ tipo, icon, titulo, desc }) => (
                        <button key={tipo} onClick={() => onSelect(tipo)}
                            className="p-6 text-left transition-all duration-200 border"
                            style={{ background: '#fff', borderColor: '#e5e7eb', borderRadius: '1.5rem' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#d1d5db'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}>
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 flex items-center justify-center border" style={{ background: '#f9fafb', borderColor: '#e5e7eb', borderRadius: '1rem' }}>
                                    {icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold mb-1" style={{ color: '#374151' }}>{titulo}</h3>
                                    <p className="text-sm" style={{ color: '#9ca3af' }}>{desc}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

function FormularioChamado({ empresa, tipo, ativos, infraestruturas, localizacoes, formularios, onBack, onSuccess }) {
    const [formData, setFormData] = useState({
        username: '',
        localizacao_id: '',   // ← novo: só para infraestrutura
          formulario_id: '',  // ← novo: formulário (filtrado por localização)
        item_id: '',
        criticidade: 'media',
        opcoes_selecionadas: [],
        descricao: '',
        fotos: []
    })
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [opcoes, setOpcoes] = useState([])

    const isMaquinario = tipo === 'maquinario'
    const itemLabel = isMaquinario ? 'Máquina / Equipamento' : 'Item de Infraestrutura'

    // ── Para infraestrutura: filtra infras pela localização selecionada ────────
    const infrasFiltradasPorLocal = isMaquinario
        ? ativos
        : (formData.localizacao_id
            ? infraestruturas.filter(i => i.localizacao_id?.toString() === formData.localizacao_id)
            : [])

// ── Ao trocar localização, limpa item e opções ────────────────────────────
    const handleLocalizacaoChange = (locId) => {
        setFormData(prev => ({ ...prev, localizacao_id: locId, formulario_id: '', item_id: '', opcoes_selecionadas: [] }))
        setOpcoes([])
    }

    const handleFormularioChange = (formId) => {
          setFormData(prev => ({ ...prev, formulario_id: formId, opcoes_selecionadas: [] }))
          const f = (formulariosFiltradosPorItem || []).find(x => x.id.toString() === formId.toString())
          setOpcoes(f?.opcoes || [])
      }

      const handleItemChange = async (itemId) => {
        setFormData(prev => ({ ...prev, item_id: itemId, formulario_id: '', opcoes_selecionadas: [] }))
        setOpcoes([])
        if (!itemId) return

          // opções virão do Formulário selecionado
      
      }

      const handleToggleOpcao = (opcao) => {
        setFormData(prev => ({
            ...prev,
            opcoes_selecionadas: prev.opcoes_selecionadas.includes(opcao)
                ? prev.opcoes_selecionadas.filter(o => o !== opcao)
                : [...prev.opcoes_selecionadas, opcao]
        }))
    }

    const handleAddFoto = (e) => {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader()
            reader.onload = (ev) => setFormData(prev => ({ ...prev, fotos: [...prev.fotos, ev.target.result] }))
            reader.readAsDataURL(file)
        })
    }

    const handleRemoveFoto = (idx) => {
        setFormData(prev => ({ ...prev, fotos: prev.fotos.filter((_, i) => i !== idx) }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!formData.username.trim()) { setError('Por favor, informe seu nome de usuário.'); return }
        if (!isMaquinario && !formData.localizacao_id) { setError('Selecione uma localização antes de continuar.'); return }
          if (!isMaquinario && !formData.formulario_id) { setError('Selecione um formulário antes de continuar.'); return }
        if (!formData.item_id) { setError(`Selecione um ${itemLabel} antes de continuar.`); return }
        setSubmitting(true)

        const itemSelecionado = infrasFiltradasPorLocal.find(i => i.id.toString() === formData.item_id.toString())
        const nomeItem = itemSelecionado ? itemSelecionado.nome : 'Item'
        const tituloBase = formData.opcoes_selecionadas.length > 0
            ? formData.opcoes_selecionadas.join(', ')
            : (formData.descricao ? formData.descricao.substring(0, 60) : `Chamado - ${nomeItem}`)

        const payload = {
            titulo: `[${isMaquinario ? 'Maquinário' : 'Infraestrutura'}] ${nomeItem}: ${tituloBase}`.substring(0, 255),
            descricao: formData.descricao,
            tipo,
            empresa_id: empresa.id,
            ativo_id: isMaquinario ? parseInt(formData.item_id) : null,
            infraestrutura_id: !isMaquinario ? parseInt(formData.item_id) : null,
              localizacao_id: !isMaquinario ? parseInt(formData.localizacao_id) : null,
              formulario_id: parseInt(formData.formulario_id),
            opcoes_selecionadas: formData.opcoes_selecionadas,
            fotos: formData.fotos,
            nome_solicitante: formData.username,
            criticidade_informada: formData.criticidade,
            status: 'Aberto'
        }

        try {
            const res = await fetch(`${API}/public/portal/chamado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                const resData = await res.json()
                onSuccess(tipo, resData.id)
            } else {
                const err = await res.json()
                setError(err.error || 'Erro ao abrir chamado. Tente novamente.')
            }
        } catch { setError('Erro de conexão. Verifique sua internet e tente novamente.') }
        finally { setSubmitting(false) }
    }

    // ── Formulários filtrados por empresa/tipo/localização + vínculo do item ──
      const formulariosDaEmpresa = useMemo(() => {
          return (formularios || []).filter(f => String(f.empresa_id) === String(empresa.id))
      }, [formularios, empresa.id])

      const formulariosFiltradosPorItem = useMemo(() => {
          const base = (formulariosDaEmpresa || []).filter(f =>
              String(f.tipo || '').toLowerCase() === String(tipo || '').toLowerCase()
          )

          // Maquinário: filtra por ativo_id (ou gerais)
          if (isMaquinario) {
              if (!formData.item_id) return []
              return base.filter(f =>
                  f.ativo_id == null || String(f.ativo_id) === String(formData.item_id)
              )
          }

          // Infraestrutura: precisa localização e item (infraestrutura)
          if (!formData.localizacao_id || !formData.item_id) return []

          return base.filter(f => {
              const okLoc = (f.localizacao_id == null) || (String(f.localizacao_id) === String(formData.localizacao_id))
              const okInfra = (f.infraestrutura_id == null) || (String(f.infraestrutura_id) === String(formData.item_id))
              return okLoc && okInfra
          })
      }, [formulariosDaEmpresa, tipo, isMaquinario, formData.localizacao_id, formData.item_id])

      // ── Localizações disponíveis no portal ──────────────────────────────────
      // Mostra todas as localizações da empresa (mesmo sem infraestrutura vinculada).
      const localizacoesComInfra = localizacoes

      return (
        <div className="min-h-screen p-4 md:p-8" style={{ background: '#efefef' }}>
            <div className="max-w-2xl mx-auto pb-10">

                <div className="flex items-center gap-3 mb-6">
                    <button onClick={onBack} className="p-2 transition-all border"
                        style={{ background: '#fff', borderColor: '#e5e7eb', color: '#6b7280', borderRadius: '1rem' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold" style={{ color: '#374151' }}>
                        {isMaquinario ? '🔧 Maquinário' : '🏗️ Infraestrutura'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6" style={s.card}>

                    {/* Usuário */}
                    <div>
                        <label style={s.label}>Seu Usuário *</label>
                        <input type="text" required placeholder="Digite seu usuário..." value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })} style={s.input} />
                    </div>

                    {/* Criticidade */}
                    <div>
                        <label style={s.label}>Criticidade *</label>
                        <select required value={formData.criticidade} onChange={(e) => setFormData({ ...formData, criticidade: e.target.value })} style={s.input}>
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>

                    {/* ── LOCALIZAÇÃO (apenas infraestrutura) ── */}
                    {!isMaquinario && (
                        <div>
                            <label style={s.label}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <MapPin size={12} /> Localização *
                                </span>
                            </label>
                            {localizacoesComInfra.length === 0 ? (
                                <div className="p-3 text-sm text-center" style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: '1rem', color: '#92400e' }}>
                                    Nenhuma localização com infraestrutura vinculada encontrada.
                                </div>
                            ) : (
                                <>
                                    <select
                                        required
                                        value={formData.localizacao_id}
                                        onChange={e => handleLocalizacaoChange(e.target.value)}
                                        style={s.input}>
                                        <option value="">Selecione a localização...</option>
                                        {localizacoesComInfra.map(loc => (
                                            <option key={loc.id} value={loc.id.toString()}>{loc.nome}</option>
                                        ))}
                                    </select>
                                    {formData.localizacao_id && (
                                        <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                                            {infrasFiltradasPorLocal.length} item(s) disponível(is) nesta localização
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                      {/* ── ITEM (máquina ou infra) ── */}
                    {/* Para maquinário: sempre mostra. Para infra: só mostra após escolher localização */}
                    {(isMaquinario || formData.localizacao_id) && (
                        <div>
                            <label style={s.label}>{itemLabel} *</label>
                            {infrasFiltradasPorLocal.length === 0 ? (
                                <div className="p-3 text-sm text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '1rem', color: '#ef4444' }}>
                                    Nenhum item encontrado para esta localização.
                                </div>
                            ) : (
                                <select required value={formData.item_id} onChange={e => handleItemChange(e.target.value)} style={s.input}>
                                    <option value="">Selecione um item...</option>
                                    {infrasFiltradasPorLocal.map(item => (
                                        <option key={item.id} value={item.id}>
                                            {item.nome}{item.numero_serie ? ` (${item.numero_serie})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                      {/* ── FORMULÁRIO (após item; filtra por item) ── */}
                      {formData.item_id && (
                          <div>
                              <label style={s.label}>Formulário *</label>
                              {formulariosFiltradosPorItem.length === 0 ? (
                                  <div className="p-3 text-sm text-center" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '1rem', color: '#ef4444' }}>
                                      Nenhum formulário encontrado para esta seleção.
                                  </div>
                              ) : (
                                  <select
                                      required
                                      value={formData.formulario_id}
                                      onChange={e => handleFormularioChange(e.target.value)}
                                      style={s.input}
                                  >
                                      <option value="">Selecione o formulário...</option>
                                      {formulariosFiltradosPorItem.map(f => (
                                          <option key={f.id} value={f.id.toString()}>{f.nome}</option>
                                      ))}
                                  </select>
                              )}
                          </div>
                      )}



                    {/* Opções */}
                    {opcoes.length > 0 && (
                        <div>
                            <label style={s.label}>Problemas / Opções</label>
                            <div className="space-y-2">
                                {opcoes.map((opcao, idx) => (
                                    <label key={idx} className="flex items-center gap-3 p-3 cursor-pointer transition-all border"
                                        style={{ background: '#f9fafb', borderColor: formData.opcoes_selecionadas.includes(opcao) ? '#d1d5db' : '#e5e7eb', borderRadius: '1rem' }}>
                                        <input type="checkbox" checked={formData.opcoes_selecionadas.includes(opcao)}
                                            onChange={() => handleToggleOpcao(opcao)} className="w-4 h-4 rounded cursor-pointer" />
                                        <span className="text-sm" style={{ color: '#4b5563' }}>{opcao}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Descrição */}
                    <div>
                        <label style={s.label}>Descrição adicional</label>
                        <textarea rows={4} placeholder="Descreva o problema com mais detalhes..." value={formData.descricao}
                            onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                            style={{ ...s.input, resize: 'none' }} />
                    </div>

                    {/* Fotos */}
                    <div>
                        <label style={s.label}>Fotos do problema</label>
                        <div className="relative p-6 text-center cursor-pointer border-2 border-dashed" style={{ borderColor: '#e5e7eb', borderRadius: '1.25rem' }}>
                            <input type="file" multiple accept="image/*" onChange={handleAddFoto}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <Camera className="mx-auto mb-2" size={26} style={{ color: '#d1d5db' }} />
                            <p className="text-sm" style={{ color: '#9ca3af' }}>Clique ou arraste fotos aqui</p>
                            <p className="text-xs mt-1" style={{ color: '#d1d5db' }}>JPG, PNG, WEBP</p>
                        </div>
                        {formData.fotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-3 mt-3">
                                {formData.fotos.map((foto, idx) => (
                                    <div key={idx} className="relative group overflow-hidden aspect-square" style={{ borderRadius: '1rem' }}>
                                        <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => handleRemoveFoto(idx)}
                                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Erro */}
                    {error && (
                        <div className="p-3 text-sm flex items-center gap-2"
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', borderRadius: '1rem' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button type="submit"
                        disabled={submitting || (!isMaquinario && (!formData.localizacao_id || !formData.formulario_id)) || !formData.item_id}
                        className="flex items-center justify-center gap-2"
                        style={(submitting || (!isMaquinario && (!formData.localizacao_id || !formData.formulario_id)) || !formData.item_id) ? s.btnDis : s.btnPrim}>
                        {submitting
                            ? <><Loader2 className="animate-spin" size={20} /> Enviando chamado...</>
                            : <><Send size={20} /> Abrir Chamado</>}
                    </button>
                </form>

                <p className="text-center text-xs mt-6" style={{ color: '#d1d5db' }}>
                    Portal de Chamados — {empresa.nome}
                </p>
            </div>
        </div>
    )
}

export default function PortalChamadoEmpresa() {
    const { empresa_id } = useParams()
    const [loading, setLoading] = useState(true)
    const [empresa, setEmpresa] = useState(null)
    const [ativos, setAtivos] = useState([])
    const [infraestruturas, setInfraestruturas] = useState([])
    const [localizacoes, setLocalizacoes] = useState([])
    const [formularios, setFormularios] = useState([])
    const [error, setError] = useState('')
    const [tela, setTela] = useState('login')
    const [tipoSucesso, setTipoSucesso] = useState('')
    const [numeroChamado, setNumeroChamado] = useState(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resEmp = await fetch(`${API}/public/empresa/${empresa_id}`)
                if (!resEmp.ok) { setError('Empresa não encontrada.'); setLoading(false); return }
                const emp = await resEmp.json()
                setEmpresa(emp)
                setLoading(false)
            } catch {
                setError('Erro ao carregar o portal. Verifique sua conexão.')
                setLoading(false)
            }
        }
        if (empresa_id) fetchData()
    }, [empresa_id])

    const handleLoginSuccess = async () => {
        try {
            const [resAtivos, resInfras, resLocs, resForms] = await Promise.all([
                fetch(`${API}/public/empresa/${empresa_id}/ativos`),
                fetch(`${API}/public/empresa/${empresa_id}/infraestruturas`),
                fetch(`${API}/public/empresa/${empresa_id}/localizacoes`),
                fetch(`${API}/formularios-chamado`)
            ])
            if (resAtivos.ok) {
                const d = await resAtivos.json()
                setAtivos(Array.isArray(d) ? d : (d.ativos || []))
            }
            if (resInfras.ok) {
                const d = await resInfras.json()
                setInfraestruturas(Array.isArray(d) ? d : (d.infraestruturas || []))
            }
            if (resLocs.ok) {
                const d = await resLocs.json()
                setLocalizacoes(Array.isArray(d) ? d : (d.localizacoes || []))
            }
            if (resForms.ok) {
                const d = await resForms.json()
                const forms = Array.isArray(d) ? d : (d.formularios || [])
                // importante: manter só formulários da empresa do portal
                setFormularios(forms.filter(f => String(f.empresa_id) === String(empresa_id)))
            }
        } catch { console.error('Erro ao carregar dados') }
        setTela('selecao')
    }

    if (loading)           return <><GlobalRoundedStyle /><LoadingScreen /></>
    if (error || !empresa) return <><GlobalRoundedStyle /><ErrorScreen message={error} /></>
    if (tela === 'login')  return <><GlobalRoundedStyle /><LoginPortal empresa={empresa} onLoginSuccess={handleLoginSuccess} /></>
    if (tela === 'sucesso') return (
        <><GlobalRoundedStyle /><SuccessScreen tipo={tipoSucesso} numeroChamado={numeroChamado}
            onNovoChamado={() => { setNumeroChamado(null); setTela('selecao') }} /></>
    )
    if (tela === 'maquinario' || tela === 'infraestrutura') return (
        <><GlobalRoundedStyle /><FormularioChamado
            empresa={empresa} tipo={tela}
            ativos={ativos} infraestruturas={infraestruturas} localizacoes={localizacoes} formularios={formularios}
            onBack={() => setTela('selecao')}
            onSuccess={(tipo, id) => { setTipoSucesso(tipo); setNumeroChamado(id); setTela('sucesso') }}
        /></>
    )
    return <><GlobalRoundedStyle /><TipoSelector empresa={empresa} onSelect={(tipo) => setTela(tipo)} /></>
}
