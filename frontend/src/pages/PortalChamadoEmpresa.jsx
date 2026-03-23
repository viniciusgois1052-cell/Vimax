import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Wrench, AlertCircle, CheckCircle, Camera, X, ChevronLeft, Send, Loader2, Layers, AlertTriangle } from 'lucide-react'

const API_BASE = window.location.origin.includes('5173')
    ? `${window.location.protocol}//${window.location.hostname}:5002`
    : window.location.origin
const API = `${API_BASE}/api`

const VIMAX_LOGO = 'http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Icone.png'

const s = {
    page:    { background: '#efefef', minHeight: '100vh' },
    card:    { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '1rem' },
    input:   { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.75rem', color: '#374151', width: '100%', padding: '0.75rem 1rem', outline: 'none' },
    label:   { color: '#6b7280', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' },
    btnPrim: { background: '#6b7280', color: '#fff', borderRadius: '0.75rem', fontWeight: 700, width: '100%', padding: '0.875rem', cursor: 'pointer', border: 'none' },
    btnDis:  { background: '#e5e7eb', color: '#9ca3af', borderRadius: '0.75rem', fontWeight: 700, width: '100%', padding: '0.875rem', cursor: 'not-allowed', border: 'none' },
}

// ─── Loading ─────────────────────────────────────────────────────────────────
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

// ─── Erro ─────────────────────────────────────────────────────────────────────
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

// ─── Login ─────────────────────────────────────────────────────────────────────
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
        <div className="flex flex-col items-center justify-center h-screen p-4" style={{ background: '#efefef' }}>
            <div className="w-full max-w-md overflow-hidden" style={s.card}>
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
                            <div className="p-3 rounded-lg text-sm font-medium" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}>
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

// ─── Sucesso ──────────────────────────────────────────────────────────────────
function SuccessScreen({ tipo, onNovoChamado }) {
    return (
        <div className="flex items-center justify-center h-screen p-4" style={{ background: '#efefef' }}>
            <div className="p-10 max-w-md w-full text-center" style={s.card}>
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-200">
                    <CheckCircle className="text-green-500" size={40} />
                </div>
                <h2 className="text-3xl font-bold mb-3" style={{ color: '#374151' }}>Chamado Aberto!</h2>
                <p className="mb-2" style={{ color: '#6b7280' }}>
                    Seu chamado de <strong style={{ color: '#374151' }}>{tipo === 'maquinario' ? 'Maquinário' : 'Infraestrutura'}</strong> foi registrado com sucesso.
                </p>
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

// ─── Seleção de Tipo ──────────────────────────────────────────────────────────
function TipoSelector({ empresa, onSelect }) {
    return (
        <div className="flex flex-col items-center justify-center h-screen p-4" style={{ background: '#efefef' }}>
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
                        { tipo: 'maquinario', icon: <Wrench size={26} style={{ color: '#6b7280' }} />, titulo: 'Maquinário', desc: 'Problemas em máquinas, equipamentos e ativos' },
                        { tipo: 'infraestrutura', icon: <Layers size={26} style={{ color: '#6b7280' }} />, titulo: 'Infraestrutura', desc: 'Problemas em instalações, rede, elétrica e civil' },
                    ].map(({ tipo, icon, titulo, desc }) => (
                        <button
                            key={tipo}
                            onClick={() => onSelect(tipo)}
                            className="rounded-2xl p-6 text-left transition-all duration-200 border"
                            style={{ background: '#fff', borderColor: '#e5e7eb' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#d1d5db'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl flex items-center justify-center border" style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}>
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

// ─── Formulário ───────────────────────────────────────────────────────────────
function FormularioChamado({ empresa, tipo, ativos, infraestruturas, onBack, onSuccess }) {
    const [formData, setFormData] = useState({
        username: '',
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
    const items = isMaquinario ? ativos : infraestruturas
    const itemLabel = isMaquinario ? 'Máquina / Equipamento' : 'Item de Infraestrutura'

    const handleItemChange = async (itemId) => {
        setFormData(prev => ({ ...prev, item_id: itemId, opcoes_selecionadas: [] }))
        if (!itemId) { setOpcoes([]); return }
        try {
            const endpoint = isMaquinario ? `/public/ativo/${itemId}/problemas` : `/public/infraestrutura/${itemId}/problemas`
            const res = await fetch(`${API}${endpoint}`)
            if (res.ok) { const data = await res.json(); setOpcoes(data.opcoes || []) }
        } catch { setOpcoes([]) }
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
        if (!formData.item_id) { setError(`Selecione um ${itemLabel} antes de continuar.`); return }
        setSubmitting(true)

        const itemSelecionado = items.find(i => i.id.toString() === formData.item_id.toString())
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
            if (res.ok) { onSuccess(tipo) }
            else { const err = await res.json(); setError(err.error || 'Erro ao abrir chamado. Tente novamente.') }
        } catch { setError('Erro de conexão. Verifique sua internet e tente novamente.') }
        finally { setSubmitting(false) }
    }

    return (
        <div className="min-h-screen p-4 md:p-8" style={{ background: '#efefef' }}>
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={onBack} className="p-2 rounded-xl transition-all border" style={{ background: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }}>
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-xl font-bold" style={{ color: '#374151' }}>
                        {isMaquinario ? '🔧 Maquinário' : '🏗️ Infraestrutura'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="rounded-2xl p-8 space-y-6" style={s.card}>

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

                    {/* Item */}
                    <div>
                        <label style={s.label}>{itemLabel} *</label>
                        <select required value={formData.item_id} onChange={(e) => handleItemChange(e.target.value)} style={s.input}>
                            <option value="">Selecione um item...</option>
                            {items.map(item => (
                                <option key={item.id} value={item.id}>
                                    {item.nome} {item.numero_serie ? `(${item.numero_serie})` : ''}
                                </option>
                            ))}
                        </select>
                        {items.length === 0 && <p className="text-red-500 text-sm mt-1">Nenhum item disponível para esta empresa.</p>}
                    </div>

                    {/* Opções */}
                    {opcoes.length > 0 && (
                        <div>
                            <label style={s.label}>Problemas / Opções</label>
                            <div className="space-y-2">
                                {opcoes.map((opcao, idx) => (
                                    <label key={idx} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border"
                                        style={{ background: '#f9fafb', borderColor: formData.opcoes_selecionadas.includes(opcao) ? '#d1d5db' : '#e5e7eb' }}>
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
                        <div className="relative rounded-xl p-6 text-center cursor-pointer border-2 border-dashed" style={{ borderColor: '#e5e7eb' }}>
                            <input type="file" multiple accept="image/*" onChange={handleAddFoto}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <Camera className="mx-auto mb-2" size={26} style={{ color: '#d1d5db' }} />
                            <p className="text-sm" style={{ color: '#9ca3af' }}>Clique ou arraste fotos aqui</p>
                            <p className="text-xs mt-1" style={{ color: '#d1d5db' }}>JPG, PNG, WEBP</p>
                        </div>
                        {formData.fotos.length > 0 && (
                            <div className="grid grid-cols-3 gap-3 mt-3">
                                {formData.fotos.map((foto, idx) => (
                                    <div key={idx} className="relative group rounded-xl overflow-hidden aspect-square">
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
                        <div className="p-3 rounded-xl text-sm flex items-center gap-2"
                            style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button type="submit" disabled={submitting || items.length === 0}
                        className="flex items-center justify-center gap-2"
                        style={submitting || items.length === 0 ? s.btnDis : s.btnPrim}>
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

// ─── Principal ────────────────────────────────────────────────────────────────
export default function PortalChamadoEmpresa() {
    const { empresa_id } = useParams()
    const [loading, setLoading] = useState(true)
    const [empresa, setEmpresa] = useState(null)
    const [ativos, setAtivos] = useState([])
    const [infraestruturas, setInfraestruturas] = useState([])
    const [error, setError] = useState('')
    const [tela, setTela] = useState('login')
    const [tipoSucesso, setTipoSucesso] = useState('')

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

    const handleLoginSuccess = async (userData, token) => {
        localStorage.setItem('token', token)
        try {
            const [resAtivos, resInfras] = await Promise.all([
                fetch(`${API}/public/empresa/${empresa_id}/ativos`),
                fetch(`${API}/public/empresa/${empresa_id}/infraestruturas`)
            ])
            if (resAtivos.ok) setAtivos(await resAtivos.json())
            if (resInfras.ok) setInfraestruturas(await resInfras.json())
        } catch { console.error('Erro ao carregar ativos') }
        setTela('selecao')
    }

    if (loading) return <LoadingScreen />
    if (error || !empresa) return <ErrorScreen message={error} />
    if (tela === 'login') return <LoginPortal empresa={empresa} onLoginSuccess={handleLoginSuccess} />
    if (tela === 'sucesso') return <SuccessScreen tipo={tipoSucesso} onNovoChamado={() => setTela('selecao')} />
    if (tela === 'maquinario' || tela === 'infraestrutura') {
        return (
            <FormularioChamado
                empresa={empresa} tipo={tela} ativos={ativos} infraestruturas={infraestruturas}
                onBack={() => setTela('selecao')}
                onSuccess={(tipo) => { setTipoSucesso(tipo); setTela('sucesso') }}
            />
        )
    }
    return <TipoSelector empresa={empresa} onSelect={(tipo) => setTela(tipo)} />
}
