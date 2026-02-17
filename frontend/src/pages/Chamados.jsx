import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaFilter, FaEye, FaTag, 
    FaDollarSign, FaCalendarAlt, FaMapMarkerAlt, FaFileContract, 
    FaShoppingCart, FaTimes, FaBox, FaUser, FaPaperclip, FaCheckCircle,
    FaExclamationCircle, FaClock, FaInfoCircle, FaSearch, FaBuilding, FaBolt, FaTools, FaQrcode, FaTruck
} from 'react-icons/fa';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const Chamados = () => {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [chamados, setAtivosChamados] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [contratos, setContratos] = useState([]);
    const [orcamentos, setOrcamentos] = useState([]);
    const [ativos, setAtivos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Não Encerrados');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentChamado, setCurrentChamado] = useState(null);
    const [isAnexosModalOpen, setIsAnexosModalOpen] = useState(false);
    const [selectedAnexos, setSelectedAnexos] = useState([]);
    
    const [formData, setFormData] = useState({
        titulo: '', descricao: '', status: 'Aberto',
        empresa_id: '', fornecedor_id: '', localizacao_id: '', 
        contrato_id: '', orcamento_id: '', ativo_id: '', 
        categoria_id: '',
        criticidade_informada: 'Média', criticidade_real: 'Média',
        valor_total: 0, anexos: []
    });
    
    const [uploading, setUploading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const API_BASE = window.location.origin.includes('5173') 
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;
    const API_URL = `${API_BASE}/api`;

    const criticidades = ['Muito Baixa', 'Baixa', 'Média', 'Alta', 'Muito Alta'];

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            const queryParams = selectedEntity && selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';

            const [c, f, l, con, o, a, emp, cat] = await Promise.all([
                fetch(`${API_URL}/chamados${queryParams}`, { headers }),
                fetch(`${API_URL}/fornecedores${queryParams}`, { headers }),
                fetch(`${API_URL}/localizacoes${queryParams}`, { headers }),
                fetch(`${API_URL}/contratos${queryParams}`, { headers }),
                fetch(`${API_URL}/orcamentos${queryParams}`, { headers }),
                fetch(`${API_URL}/ativos${queryParams}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers }),
                fetch(`${API_URL}/categorias-chamado`, { headers })
            ]);
            
            if (c.ok) {
                const data = await c.json();
                setAtivosChamados(Array.isArray(data.chamados) ? data.chamados : (Array.isArray(data) ? data : []));
            }
            if (f.ok) setFornecedores(await f.json());
            if (l.ok) setLocalizacoes(await l.json());
            if (con.ok) setContratos(await con.json());
            if (o.ok) setOrcamentos(await o.json());
            if (a.ok) setAtivos(await a.json());
            if (emp.ok) setEmpresas(await emp.json());
            if (cat.ok) setCategorias(await cat.json());
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }, [user?.api_token, selectedEntity, API_URL]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAtivoChange = (ativoId) => {
        if (!ativoId) {
            setFormData({ ...formData, ativo_id: '' });
            return;
        }

        const selectedAtivo = ativos.find(a => a.id.toString() === ativoId);
        if (selectedAtivo) {
            setFormData({
                ...formData,
                ativo_id: ativoId,
                empresa_id: selectedAtivo.empresa_id?.toString() || formData.empresa_id,
                localizacao_id: selectedAtivo.localizacao_id?.toString() || formData.localizacao_id,
                fornecedor_id: selectedAtivo.fornecedor_id?.toString() || formData.fornecedor_id,
                contrato_id: selectedAtivo.contrato_id?.toString() || formData.contrato_id,
                orcamento_id: selectedAtivo.orcamento_id?.toString() || formData.orcamento_id
            });
        } else {
            setFormData({ ...formData, ativo_id: ativoId });
        }
    };

    const handleOpenAnexosModal = (anexos) => {
        setSelectedAnexos(anexos || []);
        setIsAnexosModalOpen(true);
    };

    const handleOpenModal = (chamado = null) => {
        if (chamado) {
            setIsEditing(true);
            setCurrentChamado(chamado);
            setFormData({
                titulo: chamado.titulo || '',
                descricao: chamado.descricao || '',
                status: chamado.status || 'Aberto',
                empresa_id: chamado.empresa_id?.toString() || '',
                fornecedor_id: chamado.fornecedor_id?.toString() || '',
                localizacao_id: chamado.localizacao_id?.toString() || '',
                contrato_id: chamado.contrato_id?.toString() || '',
                orcamento_id: chamado.orcamento_id?.toString() || '',
                ativo_id: chamado.ativo_id?.toString() || '',
                categoria_id: chamado.categoria_id?.toString() || '',
                criticidade_informada: chamado.criticidade_informada || 'Média',
                criticidade_real: chamado.criticidade_real || 'Média',
                valor_total: chamado.valor_total || 0,
                anexos: Array.isArray(chamado.anexos) ? chamado.anexos : (typeof chamado.anexos === 'string' ? JSON.parse(chamado.anexos) : [])
            });
        } else {
            setIsEditing(false);
            setCurrentChamado(null);
            setFormData({
                titulo: '', descricao: '', status: 'Aberto',
                empresa_id: '', fornecedor_id: '', localizacao_id: '', 
                contrato_id: '', orcamento_id: '', ativo_id: '', 
                categoria_id: '',
                criticidade_informada: 'Média', criticidade_real: 'Média',
                valor_total: 0, anexos: []
            });
        }
        setIsModalOpen(true);
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
        setIsSaving(true);
        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        const url = isEditing ? `${API_URL}/chamados/${currentChamado.id}` : `${API_URL}/chamados`;
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method, headers,
                body: JSON.stringify({
                    ...formData,
                    empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
                    fornecedor_id: formData.fornecedor_id ? parseInt(formData.fornecedor_id) : null,
                    localizacao_id: formData.localizacao_id ? parseInt(formData.localizacao_id) : null,
                    contrato_id: formData.contrato_id ? parseInt(formData.contrato_id) : null,
                    orcamento_id: formData.orcamento_id ? parseInt(formData.orcamento_id) : null,
                    ativo_id: formData.ativo_id ? parseInt(formData.ativo_id) : null,
                    categoria_id: formData.categoria_id ? parseInt(formData.categoria_id) : null,
                    anexos: formData.anexos
                })
            });
            if (res.ok) { setIsModalOpen(false); fetchData(); }
        } catch (err) { console.error('Save error', err); } finally { setIsSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Deseja realmente excluir este chamado?')) return;
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        try {
            const res = await fetch(`${API_URL}/chamados/${id}`, { method: 'DELETE', headers });
            if (res.ok) fetchData();
        } catch (err) { console.error('Delete error', err); }
    };

    const filteredChamados = useMemo(() => {
        return chamados.filter(c => {
            const matchesSearch = c.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 c.id?.toString().includes(searchTerm);
            const matchesStatus = statusFilter === 'Todos' || 
                                 (statusFilter === 'Não Encerrados' ? ['Aberto', 'Em Atendimento'].includes(c.status) : c.status === statusFilter);
            const matchesEmpresa = empresaFilter === 'Todas' || c.empresa_id?.toString() === empresaFilter;
            return matchesSearch && matchesStatus && matchesEmpresa;
        });
    }, [chamados, searchTerm, statusFilter, empresaFilter]);

    const filteredAtivosForm = useMemo(() => {
        if (!formData.empresa_id) return ativos;
        return ativos.filter(a => a.empresa_id?.toString() === formData.empresa_id);
    }, [ativos, formData.empresa_id]);

    const filteredLocalizacoesForm = useMemo(() => {
        if (!formData.empresa_id) return localizacoes;
        return localizacoes.filter(l => l.empresa_id?.toString() === formData.empresa_id);
    }, [localizacoes, formData.empresa_id]);

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        try {
            const date = parseISO(dateStr);
            return format(date, "dd/MM/yy HH:mm", { locale: ptBR });
        } catch (e) { return '-'; }
    };

    const getAnexoHref = (path) => {
        if (!path) return '#';
        if (path.startsWith('http')) return path;
        return `${API_BASE}/${path}`;
    };

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <FaTools className="text-primary" /> Gestão de Chamados
                    </h1>
                    <p className="text-slate-500 text-sm">Controle e manutenção de ativos</p>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95">
                    <FaPlus /> Novo Chamado
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Buscar por título ou ID..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="Não Encerrados">Não Encerrados</option>
                    <option value="Todos">Todos os Status</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Em Atendimento">Em Atendimento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                </select>
                <select className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium" value={empresaFilter} onChange={(e) => setEmpresaFilter(e.target.value)}>
                    <option value="Todas">Todas as Empresas</option>
                    {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                <th className="p-4">ID / Título</th>
                                <th className="p-4">Ativo / Fornecedor</th>
                                <th className="p-4">Status / Prioridade</th>
                                <th className="p-4">Datas</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredChamados.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-primary">#{c.id}</span>
                                            <span className="text-sm font-bold text-slate-700">{c.titulo}</span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold">{c.empresa_nome || 'Empresa não vinculada'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-700 flex items-center gap-1"><FaBox className="text-primary/60" size={12} /> {c.ativo_nome || 'Sem Ativo'}</span>
                                            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1"><FaTruck className="text-slate-300" size={10} /> {c.fornecedor_nome || 'Sem Fornecedor'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border w-fit ${c.status === 'Aberto' ? 'bg-blue-50 text-blue-600 border-blue-100' : c.status === 'Em Atendimento' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{c.status}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><FaBolt className="text-amber-400" /> {c.criticidade_real || 'Média'}</span>
                                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><FaQrcode className="text-slate-300" /> {c.criticidade_informada || 'Média'}</span>
                                            </div>
                                            {c.contrato_nome && <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><FaFileContract className="text-primary/60" /> {c.contrato_nome}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col text-[11px]">
                                            <span className="text-slate-400 font-bold uppercase">Abertura</span>
                                            <span className="text-slate-600 font-medium">{formatDate(c.created_at)}</span>
                                            {c.data_solucao && (
                                                <>
                                                    <span className="text-green-500 font-bold uppercase mt-1">Solução</span>
                                                    <span className="text-green-600 font-medium">{formatDate(c.data_solucao)}</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm font-bold text-slate-700">{formatCurrency(c.valor_total)}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {c.anexos && c.anexos.length > 0 && (
                                                <button onClick={() => handleOpenAnexosModal(c.anexos)} className="p-2 text-primary hover:bg-primary/5 rounded-lg transition-all" title="Ver Anexos"><FaPaperclip size={16} /></button>
                                            )}
                                            <button onClick={() => handleOpenModal(c)} className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"><FaEdit size={16} /></button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><FaTrashAlt size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Anexos */}
            {isAnexosModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><FaPaperclip className="text-primary" /> Anexos do Chamado</h2>
                            <button onClick={() => setIsAnexosModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FaTimes /></button>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                            {selectedAnexos.map((anexo, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/30 transition-all">
                                    <div className="flex items-center gap-3 truncate">
                                        <div className="p-3 bg-white rounded-xl shadow-sm"><FaPaperclip className="text-primary" /></div>
                                        <span className="text-sm font-bold text-slate-700 truncate">{anexo.name || anexo.filename}</span>
                                    </div>
                                    <button onClick={() => window.open(getAnexoHref(anexo.path || anexo.url), '_blank')} className="p-2 bg-white text-primary hover:bg-primary hover:text-white rounded-xl shadow-sm transition-all"><FaEye size={18} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Cadastro/Edição Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-slate-800">{isEditing ? `Editar Chamado #${currentChamado.id}` : 'Abrir Novo Chamado'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><FaTimes /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Informações do Problema</h3>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Título do Chamado *</label>
                                            <input type="text" required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" placeholder="Ex: Ar condicionado não liga" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Descrição Detalhada</label>
                                            <textarea rows="4" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none" placeholder="Descreva o problema..." value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})}></textarea>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-600 uppercase ml-1">Status</label>
                                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                                    <option value="Aberto">Aberto</option>
                                                    <option value="Em Atendimento">Em Atendimento</option>
                                                    <option value="Concluído">Concluído</option>
                                                    <option value="Cancelado">Cancelado</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-600 uppercase ml-1">Criticidade Real</label>
                                                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.criticidade_real} onChange={(e) => setFormData({...formData, criticidade_real: e.target.value})}>
                                                    {criticidades.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Criticidade Informada (QR)</label>
                                            <input type="text" disabled className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none text-slate-500 cursor-not-allowed" value={formData.criticidade_informada} />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Vínculos e Ativos</h3>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Equipamento / Ativo</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.ativo_id} onChange={(e) => handleAtivoChange(e.target.value)}>
                                                <option value="">Selecione um Ativo (Opcional)</option>
                                                {ativos.map(a => <option key={a.id} value={a.id.toString()}>{a.nome} {a.numero_serie ? `(S/N: ${a.numero_serie})` : ''}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Empresa / Clínica *</label>
                                            <select required className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.empresa_id} onChange={(e) => setFormData({...formData, empresa_id: e.target.value})}>
                                                <option value="">Selecione uma Empresa</option>
                                                {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Localização Interna</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.localizacao_id} onChange={(e) => setFormData({...formData, localizacao_id: e.target.value})}>
                                                <option value="">Selecione um Local (Opcional)</option>
                                                {filteredLocalizacoesForm.map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Categoria do Chamado</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.categoria_id} onChange={(e) => setFormData({...formData, categoria_id: e.target.value})}>
                                                <option value="">Selecione uma Categoria</option>
                                                {categorias.map(c => <option key={c.id} value={c.id.toString()}>{c.nome}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Custos e Fornecedores</h3>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Valor Total do Serviço (R$)</label>
                                            <input type="number" step="0.01" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.valor_total} onChange={(e) => setFormData({...formData, valor_total: parseFloat(e.target.value) || 0})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Fornecedor Responsável</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.fornecedor_id} onChange={(e) => setFormData({...formData, fornecedor_id: e.target.value})}>
                                                <option value="">Selecione um Fornecedor</option>
                                                {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Contrato Vinculado</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.contrato_id} onChange={(e) => setFormData({...formData, contrato_id: e.target.value})}>
                                                <option value="">Selecione um Contrato</option>
                                                {contratos.map(c => <option key={c.id} value={c.id.toString()}>{c.numero || c.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-600 uppercase ml-1">Orçamento Vinculado</label>
                                            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" value={formData.orcamento_id} onChange={(e) => setFormData({...formData, orcamento_id: e.target.value})}>
                                                <option value="">Selecione um Orçamento</option>
                                                {orcamentos.map(o => <option key={o.id} value={o.id.toString()}>{o.numero || o.titulo}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Anexos e Documentos</h3>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="relative group">
                                                <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} disabled={uploading} />
                                                <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 group-hover:bg-primary/5 group-hover:border-primary/30 transition-all">
                                                    <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-primary transition-colors"><FaPaperclip size={20} /></div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{uploading ? 'Enviando...' : 'Clique ou arraste arquivos'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                                {formData.anexos.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group animate-in zoom-in duration-200">
                                                        <div className="flex items-center gap-3 truncate">
                                                            <FaPaperclip className="text-primary shrink-0" size={12} />
                                                            <span className="text-xs font-bold text-slate-600 truncate">{file.name}</span>
                                                        </div>
                                                        <button type="button" onClick={() => removeAnexo(idx)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><FaTimes size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="px-8 py-2.5 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50">{isSaving ? 'Salvando...' : 'Salvar Chamado'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chamados;
