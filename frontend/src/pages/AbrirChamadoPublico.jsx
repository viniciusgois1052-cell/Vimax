import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, MapPin, Building2, Send, CheckCircle2, AlertCircle, User, FileText, Paperclip, X } from 'lucide-react';

const AbrirChamadoPublico = () => {
    const { id } = useParams();
    const [ativo, setAtivo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [erro, setErro] = useState(null);

    const [formData, setFormData] = useState({
        nome_solicitante: '',
        titulo: '',
        descricao: '',
        anexos: []
    });

    const API_BASE = window.location.origin.includes('5173') 
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;

    useEffect(() => {
        const fetchAtivo = async () => {
            try {
                const response = await fetch(`${API_BASE}/api/public/ativo/${id}`);
                if (response.ok) {
                    setAtivo(await response.json());
                } else {
                    setErro("Ativo não encontrado ou link inválido.");
                }
            } catch (err) {
                setErro("Erro ao conectar com o servidor.");
            } finally {
                setLoading(false);
            }
        };
        fetchAtivo();
    }, [id, API_BASE]);

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
        setEnviando(true);
        setErro(null);

        try {
            const response = await fetch(`${API_BASE}/api/public/chamado/abrir`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    ativo_id: ativo.id,
                    empresa_id: ativo.empresa_id,
                    localizacao_id: ativo.localizacao_id
                })
            });

            if (response.ok) {
                setSucesso(true);
            } else {
                const data = await response.json();
                setErro(data.error || "Erro ao abrir chamado.");
            }
        } catch (err) {
            setErro("Erro de conexão ao enviar.");
        } finally {
            setEnviando(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (sucesso) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
                <div className="flex justify-center">
                    <div className="bg-green-100 p-4 rounded-full">
                        <CheckCircle2 className="w-16 h-16 text-green-500" />
                    </div>
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800">Chamado Aberto!</h2>
                    <p className="text-gray-600 text-sm">Sua solicitação foi enviada com sucesso. Nossa equipe técnica já foi notificada e entrará em contato em breve.</p>
                </div>
                <div className="pt-4 space-y-3">
                    <button 
                        onClick={() => window.location.reload()} 
                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        Abrir Novo Chamado
                    </button>
                    <p className="text-xs text-gray-400">Você já pode fechar esta aba do seu navegador.</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center">
            <div className="max-w-lg w-full space-y-6 flex-1">
                <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-white/20 p-3 rounded-2xl">
                            <Box size={32} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{ativo?.nome}</h1>
                            <p className="text-indigo-100 text-sm font-mono">S/N: {ativo?.numero_serie || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl">
                            <Building2 size={16} />
                            <span className="truncate">{ativo?.empresa_nome}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl">
                            <MapPin size={16} />
                            <span className="truncate">{ativo?.localizacao_nome || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-3xl shadow-lg border border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <FileText className="text-indigo-600" /> Abrir Chamado Técnico
                    </h2>

                    {erro && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-sm">
                            <AlertCircle size={20} />
                            {erro}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Seu Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Ex: João Silva"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    value={formData.nome_solicitante}
                                    onChange={(e) => setFormData({...formData, nome_solicitante: e.target.value})}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">O que está acontecendo? (Título)</label>
                            <input 
                                type="text" 
                                required
                                placeholder="Ex: Equipamento não liga"
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={formData.titulo}
                                onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Descrição do Problema</label>
                            <textarea 
                                required
                                rows="4"
                                placeholder="Descreva com detalhes o que ocorreu..."
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                value={formData.descricao}
                                onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Anexar Fotos ou Documentos (Opcional)</label>
                            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-indigo-300 transition-colors relative bg-gray-50">
                                <input 
                                    type="file" 
                                    multiple 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                                    onChange={handleFileUpload} 
                                    disabled={uploading} 
                                />
                                <Paperclip className="mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">{uploading ? 'Enviando...' : 'Clique para tirar foto ou anexar arquivos'}</p>
                            </div>

                            {formData.anexos.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {formData.anexos.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-indigo-50 p-2 rounded-xl text-sm border border-indigo-100">
                                            <span className="truncate max-w-[200px] text-indigo-700 font-medium ml-2">{file.name}</span>
                                            <button type="button" onClick={() => removeAnexo(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                <X size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            disabled={enviando || uploading}
                            className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${enviando || uploading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
                        >
                            {enviando ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <>
                                    <Send size={20} /> Enviar Solicitação
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <footer className="mt-8 pb-6 text-center">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Grupo Digimax - Sistema de Gestão de Ativos</p>
                <p className="text-gray-300 text-[10px] mt-1">© 2026 Vimax CMMS. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
};

export default AbrirChamadoPublico;
