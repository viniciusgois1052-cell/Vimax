import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    FaWrench, FaMapMarkerAlt, FaCheckCircle, FaExclamationCircle, 
    FaPaperclip, FaTimes, FaCamera, FaArrowLeft, FaSignOutAlt,
    FaBuilding, FaTruck, FaFileContract, FaLock
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const AbrirChamadoPublico = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();
    const [ativo, setAtivo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    
    // Estados para o login
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);

    const [formData, setFormData] = useState({
        titulo: '',
        descricao: '',
        criticidade_informada: 'Média',
        anexos: []
    });

    const [uploading, setUploading] = useState(false);

    // Definição da base da API e do Backend
    const API_BASE = "";

    useEffect(() => {
        const fetchAtivo = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/ativos/${id}`, {
                    headers: {
                        'X-API-Token': user.api_token || ''
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setAtivo(data);
                } else {
                    setError('Equipamento não encontrado ou QR Code inválido.');
                }
            } catch (err) {
                setError('Erro ao conectar com o servidor.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchAtivo();
        else setLoading(false);
    }, [id, user, API_BASE]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setError(null);
        try {
            const result = await login(username, password);
            if (!result.success) {
                setError(result.error || 'Falha na autenticação.');
            }
        } catch (err) {
            setError('Erro ao tentar fazer login.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        setUploading(true);
        const newAnexos = [...formData.anexos];
        
        for (const file of files) {
            const fData = new FormData();
            fData.append('file', file);
            
            try {
                const res = await fetch(`${API_BASE}/api/upload`, { 
                    method: 'POST', 
                    body: fData 
                });
                
                if (res.ok) {
                    const data = await res.json();
                    newAnexos.push({
                        name: file.name,
                        filename: data.filename,
                        path: data.path,
                        url: data.url
                    });
                }
            } catch (err) {
                console.error('Upload error', err);
            }
        }
        
        setFormData({ ...formData, anexos: newAnexos });
        setUploading(false);
    };

    const removeAnexo = (index) => {
        const updated = formData.anexos.filter((_, i) => i !== index);
        setFormData({ ...formData, anexos: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            const res = await fetch(`${API_BASE}/api/chamados`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Token': user?.api_token || ''
                },
                body: JSON.stringify({
                    ...formData,
                    ativo_id: id ? parseInt(id) : null,
                    empresa_id: ativo?.empresa_id || null,
                    localizacao_id: ativo?.localizacao_id || null,
                    fornecedor_id: ativo?.fornecedor_id || null,
                    contrato_id: ativo?.contrato_id || null,
                    orcamento_id: ativo?.orcamento_id || null,
                    status: 'Aberto'
                })
            });
            
            if (res.ok) {
                setSuccess(true);
            } else {
                setError('Erro ao enviar chamado. Tente novamente.');
            }
        } catch (err) {
            setError('Erro de conexão ao enviar chamado.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        logout();
    };

    // Se não estiver logado, mostra a tela de login
    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                    <div className="p-8 bg-primary flex justify-center">
                        <img src="http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Logo.png" alt="Logo" className="h-16 w-auto brightness-0 invert" />
                    </div>
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                                <FaLock className="text-primary" size={20} /> Acesso Restrito
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">Faça login para abrir o chamado do ativo</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top duration-300">
                                    <FaExclamationCircle className="shrink-0" />
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase ml-1">Usuário</label>
                                <input 
                                    type="text" required
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    placeholder="Seu usuário"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase ml-1">Senha</label>
                                <input 
                                    type="password" required
                                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    placeholder="Sua senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={loginLoading}
                                className="w-full bg-primary text-white py-5 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                            >
                                {loginLoading ? 'Autenticando...' : 'Entrar e Abrir Chamado'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500 font-medium">Carregando informações...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <FaCheckCircle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-bold text-slate-800">Chamado Aberto!</h2>
                        <p className="text-slate-500">Sua solicitação foi enviada com sucesso e nossa equipe técnica já foi notificada.</p>
                    </div>
                    <div className="pt-4 space-y-3">
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-primary/90 transition-all active:scale-95"
                        >
                            Abrir Novo Chamado
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                            <FaSignOutAlt /> Sair do Sistema
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-8">
            <div className="max-w-2xl mx-auto w-full space-y-6">
                {/* Header with Logout */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                            <FaWrench size={20} />
                        </div>
                        <h1 className="text-lg font-bold text-slate-800 hidden sm:block">Vimax CMMS</h1>
                    </div>
                    <img src="http://wiki.digimaxdiagnostico.com.br/wp/wp-content/uploads/2026/01/Vimax-Logo.png" alt="Logo" className="h-10 w-auto" />
                    <button onClick={handleLogout} className="p-3 bg-white rounded-2xl shadow-sm text-red-500 hover:bg-red-50 transition-all active:scale-95" title="Sair">
                        <FaSignOutAlt size={20} />
                    </button>
                </div>

                {/* Ativo Info Card */}
                {ativo && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom duration-500">
                        <div className="p-6 bg-primary/5 border-b border-primary/10 flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary">
                                <FaWrench size={32} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">{ativo.nome}</h2>
                                <p className="text-slate-500 text-sm font-medium">S/N: {ativo.numero_serie || 'Não informado'}</p>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="p-2 bg-slate-50 rounded-lg"><FaBuilding className="text-primary" /></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Empresa</span>
                                    <span className="text-sm font-bold">{ativo.empresa_nome || 'Não vinculada'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="p-2 bg-slate-50 rounded-lg"><FaMapMarkerAlt className="text-primary" /></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Localização</span>
                                    <span className="text-sm font-bold">{ativo.localizacao_nome || 'Não informada'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="p-2 bg-slate-50 rounded-lg"><FaTruck className="text-primary" /></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Fornecedor</span>
                                    <span className="text-sm font-bold">{ativo.fornecedor_nome || 'Não vinculado'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <div className="p-2 bg-slate-50 rounded-lg"><FaFileContract className="text-primary" /></div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase text-slate-400">Contrato</span>
                                    <span className="text-sm font-bold">{ativo.contrato_nome || ativo.contrato_numero || 'Sem contrato'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">O que está acontecendo? *</label>
                            <input 
                                type="text" required
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                placeholder="Ex: Equipamento não liga"
                                value={formData.titulo}
                                onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Descrição Detalhada</label>
                            <textarea 
                                rows="4"
                                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium resize-none"
                                placeholder="Descreva o problema com mais detalhes..."
                                value={formData.descricao}
                                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                            ></textarea>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Criticidade do Problema</label>
                            <div className="grid grid-cols-3 gap-3">
                                {['Baixa', 'Média', 'Alta'].map((crit) => (
                                    <button
                                        key={crit}
                                        type="button"
                                        onClick={() => setFormData({...formData, criticidade_informada: crit})}
                                        className={`py-3 rounded-2xl font-bold text-sm transition-all border-2 ${
                                            formData.criticidade_informada === crit 
                                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                            : 'bg-white border-slate-100 text-slate-500 hover:border-primary/30'
                                        }`}
                                    >
                                        {crit}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Anexar Fotos / Vídeos</label>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="relative group">
                                    <input 
                                        type="file" multiple
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 group-hover:bg-primary/5 group-hover:border-primary/30 transition-all">
                                        <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-primary transition-colors">
                                            <FaCamera size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {uploading ? 'Enviando...' : 'Clique para tirar foto ou anexar'}
                                        </span>
                                    </div>
                                </div>

                                {formData.anexos.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {formData.anexos.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group animate-in zoom-in duration-200">
                                                <div className="flex items-center gap-3 truncate">
                                                    <FaPaperclip className="text-primary shrink-0" size={12} />
                                                    <span className="text-xs font-bold text-slate-600 truncate">{file.name}</span>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeAnexo(idx)}
                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <FaTimes size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3">
                                <FaExclamationCircle className="shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={submitting || uploading}
                            className="w-full bg-primary text-white py-5 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
                        >
                            {submitting ? 'Enviando...' : 'Abrir Chamado Agora'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AbrirChamadoPublico;
