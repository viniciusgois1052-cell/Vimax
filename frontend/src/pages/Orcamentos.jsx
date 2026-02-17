import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaFileInvoiceDollar, 
    FaTimes, FaInfoCircle, FaCalendarAlt, FaTag, FaBuilding,
    FaCheckCircle, FaExclamationCircle, FaClock, FaPaperclip, FaEye, FaUser
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const Orcamentos = () => {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [orcamentos, setOrcamentos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentOrcamento, setCurrentOrcamento] = useState(null);
    const [isAnexosModalOpen, setIsAnexosModalOpen] = useState(false);
    const [selectedAnexos, setSelectedAnexos] = useState([]);
    
    const [formData, setFormData] = useState({
        numero: '', descricao: '', valor: '', data_emissao: '',
        data_validade: '', status: 'Pendente', empresa_id: '',
        fornecedor_id: '', localizacao_id: '', anexos: []
    });

    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Definição da base da API e do Backend
    const API_BASE = window.location.origin.includes('5173') 
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;
    const API_URL = `${API_BASE}/api`;

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) headers['X-API-Token'] = user.api_token;
            const queryParams = selectedEntity && selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';
            
            const [o, e, f, l] = await Promise.all([
                fetch(`${API_URL}/orcamentos${queryParams}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers }),
                fetch(`${API_URL}/fornecedores${queryParams}`, { headers }),
                fetch(`${API_URL}/localizacoes`, { headers })
            ]);
            
            if (o.ok) setOrcamentos(await o.json());
            if (e.ok) setEmpresas(await e.json());
            if (f.ok) setFornecedores(await f.json());
            if (l.ok) setLocalizacoes(await l.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, [user, selectedEntity, API_URL]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (orcamento = null) => {
        if (orcamento) {
            setIsEditing(true);
            setCurrentOrcamento(orcamento);
            setFormData({
                numero: orcamento.numero || '',
                descricao: orcamento.descricao || '',
                valor: orcamento.valor || '',
                data_emissao: orcamento.data_emissao || '',
                data_validade: orcamento.data_validade || '',
                status: orcamento.status || 'Pendente',
                empresa_id: orcamento.empresa_id?.toString() || '',
                fornecedor_id: orcamento.fornecedor_id?.toString() || '',
                localizacao_id: orcamento.localizacao_id?.toString() || '',
                anexos: Array.isArray(orcamento.anexos) ? orcamento.anexos : (typeof orcamento.anexos === 'string' ? JSON.parse(orcamento.anexos) : [])
            });
        } else {
            setIsEditing(false);
            setCurrentOrcamento(null);
            setFormData({
                numero: '', descricao: '', valor: '', data_emissao: '',
                data_validade: '', status: 'Pendente', empresa_id: '',
                fornecedor_id: '', localizacao_id: '', anexos: []
            });
        }
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        
        setUploading(true);
        // Criamos uma cópia local para acumular os novos anexos
        let updatedAnexos = [...formData.anexos];
        
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
                    // Adicionamos o novo anexo à lista
                    updatedAnexos = [...updatedAnexos, { 
                        name: file.name, 
                        path: data.path, 
                        url: data.url 
                    }];
                    
                    // Atualizamos o estado a cada upload bem-sucedido para feedback imediato
                    setFormData(prev => ({ ...prev, anexos: updatedAnexos }));
                }
            } catch (err) { 
                console.error('Upload error', err); 
            }
        }
        
        setUploading(false);
        // Limpar o input de arquivo para permitir novo upload do mesmo arquivo se necessário
        e.target.value = '';
    };

    const removeAnexo = (index) => {
        const updated = formData.anexos.filter((_, i) => i !== index);
        setFormData({ ...formData, anexos: updated });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        const url = isEditing ? `${API_URL}/orcamentos/${currentOrcamento.id}` : `${API_URL}/orcamentos`;
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify({
                    ...formData,
                    empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
                    fornecedor_id: formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
                    localizacao_id: formData.localizacao_id ? parseInt(formData.localizacao_id) : null,
                    anexos: formData.anexos
                })
            });
            if (res.ok) { setIsModalOpen(false); fetchData(); }
        } catch (err) { console.error('Save error', err); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir este orçamento?')) return;
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        try {
            const res = await fetch(`${API_URL}/orcamentos/${id}`, { method: 'DELETE', headers });
            if (res.ok) fetchData();
        } catch (err) { console.error('Delete error', err); }
    };

    const handleOpenAnexosModal = (anexos) => {
        setSelectedAnexos(anexos || []);
        setIsAnexosModalOpen(true);
    };

    const getAnexoHref = (path) => {
        if (!path) return '#';
        if (path.startsWith('http')) return path;
        
        let cleanPath = path;
        cleanPath = cleanPath.replace(/^\/+/, '');
        cleanPath = cleanPath.replace(/^static\/uploads\//, '');
        cleanPath = cleanPath.replace(/^uploads\//, '');
        
        return `${API_BASE}/static/uploads/${cleanPath}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Aprovado': return 'bg-green-100 text-green-700 border-green-200';
            case 'Reprovado': return 'bg-red-100 text-red-700 border-red-200';
            case 'Pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const filteredLocalizacoesForm = useMemo(() => {
        if (!Array.isArray(localizacoes)) return [];
        if (!formData.empresa_id) return [];
        return localizacoes.filter(l => l.empresa_id?.toString() === formData.empresa_id.toString());
    }, [localizacoes, formData.empresa_id]);

    const filteredOrcamentos = orcamentos.filter(o => 
        o.numero?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <FaFileInvoiceDollar className="text-primary" /> Orçamentos e Cotações
                    </h1>
                    <p className="text-slate-500 mt-1">Gerencie propostas comerciais e aprovações de custos</p>
                </div>
                <button onClick={() => handleOpenModal()} className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2">
                    <FaPlus /> Novo Orçamento
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar por número ou descrição..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4">Nº / Descrição</th>
                                <th className="p-4">Empresa / Fornecedor</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Anexos</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredOrcamentos.map(o => (
                                <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">#{o.numero}</span>
                                            <span className="text-xs text-slate-400 truncate max-w-[200px]">{o.descricao}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-slate-600">{o.empresa_nome}</span>
                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                                                <FaBuilding size={10} /> {o.localizacao_nome || 'Sem localização'}
                                            </span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1"><FaUser size={10} /> {o.fornecedor_nome}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-sm font-bold text-slate-700">R$ {parseFloat(o.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${getStatusColor(o.status)}`}>{o.status}</span>
                                    </td>
                                    <td className="p-4">
                                        {o.anexos && o.anexos.length > 0 ? (
                                            <button onClick={() => handleOpenAnexosModal(o.anexos)} className="flex items-center gap-2 text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-all font-bold text-xs">
                                                <FaPaperclip /> Ver {o.anexos.length}
                                            </button>
                                        ) : <span className="text-xs text-slate-300">Nenhum</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleOpenModal(o)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all"><FaEdit /></button>
                                            <button onClick={() => handleDelete(o.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><FaTrashAlt /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Anexos Modal */}
            {isAnexosModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FaPaperclip className="text-primary" /> Documentos do Orçamento</h2>
                            <button onClick={() => setIsAnexosModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><FaTimes className="text-slate-400" /></button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                            {selectedAnexos.map((anexo, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary/30 transition-all group">
                                    <div className="flex items-center gap-4 truncate">
                                        <FaPaperclip className="text-primary" />
                                        <span className="text-sm font-bold text-slate-700 truncate">{anexo.name || anexo.filename}</span>
                                    </div>
                                    <button onClick={() => window.open(getAnexoHref(anexo.path || anexo.url), '_blank')} className="p-2 bg-white text-primary hover:bg-primary hover:text-white rounded-xl shadow-sm transition-all"><FaEye size={18} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Cadastro Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">{isEditing ? 'Editar Orçamento' : 'Novo Orçamento'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Informações Básicas</h3>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600 uppercase ml-1">Número do Orçamento *</label>
                                        <input type="text" required className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600 uppercase ml-1">Descrição</label>
                                        <textarea rows="3" className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none resize-none" value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})}></textarea>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Valor (R$)</label>
                                            <input type="number" step="0.01" className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" value={formData.valor} onChange={e => setFormData({...formData, valor: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Status</label>
                                            <select className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                                <option value="Pendente">Pendente</option>
                                                <option value="Aprovado">Aprovado</option>
                                                <option value="Reprovado">Reprovado</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Vínculos e Anexos</h3>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600 uppercase ml-1">Empresa *</label>
                                        <select required className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" value={formData.empresa_id} onChange={e => setFormData({...formData, empresa_id: e.target.value})}>
                                            <option value="">Selecione uma Empresa</option>
                                            {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600 uppercase ml-1">Fornecedor *</label>
                                        <select required className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" value={formData.fornecedor_id} onChange={e => setFormData({...formData, fornecedor_id: e.target.value})}>
                                            <option value="">Selecione um Fornecedor</option>
                                            {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-600 uppercase ml-1">Localização Interna</label>
                                        <select className="w-full px-4 py-2 bg-slate-50 border rounded-xl outline-none" value={formData.localizacao_id} onChange={e => setFormData({...formData, localizacao_id: e.target.value})}>
                                            <option value="">Selecione uma Localização (Opcional)</option>
                                            {filteredLocalizacoesForm.map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-4 pt-4">
                                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center hover:bg-slate-50 transition-all relative">
                                            <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                                            <FaPaperclip className="mx-auto text-slate-300 mb-2" />
                                            <p className="text-xs text-slate-500">{uploading ? 'Enviando...' : 'Clique para anexar propostas PDF/IMG'}</p>
                                        </div>
                                        <div className="space-y-2">
                                            {formData.anexos.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border">
                                                    <span className="text-xs font-medium truncate max-w-[200px]">{file.name || file.filename}</span>
                                                    <div className="flex gap-1">
                                                        <button type="button" onClick={() => window.open(getAnexoHref(file.path || file.url), '_blank')} className="p-1 text-primary"><FaEye size={12} /></button>
                                                        <button type="button" onClick={() => removeAnexo(idx)} className="p-1 text-red-500"><FaTimes size={12} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 font-bold">Cancelar</button>
                                <button type="submit" disabled={isSaving || uploading} className="px-10 py-2 bg-primary text-white rounded-xl font-bold shadow-lg disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Orçamento'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orcamentos;
