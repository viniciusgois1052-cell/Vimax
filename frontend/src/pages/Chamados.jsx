import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaFilter, FaEye, FaDownload, FaTag, 
    FaDollarSign, FaCalendarAlt, FaMapMarkerAlt, FaFileContract, 
    FaShoppingCart, FaTimes, FaBox, FaUser, FaPaperclip, FaCheckCircle,
    FaExclamationCircle, FaClock, FaInfoCircle, FaSearch, FaBuilding
} from 'react-icons/fa';
import { format } from 'date-fns';
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
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
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
        valor_total: 0, anexos: []
    });
    
    const [uploading, setUploading] = useState(false);
    const API_URL = '/api';

    // BACKEND_ORIGIN resolution:
    // use VITE_BACKEND_URL when available, or VITE_BACKEND_PORT, or fallback to hostname:5002
    const VITE_BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ? import.meta.env.VITE_BACKEND_URL : null;
    const VITE_BACKEND_PORT = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_PORT) ? import.meta.env.VITE_BACKEND_PORT : null;

    let BACKEND_ORIGIN = window.location.origin;
    if (VITE_BACKEND_URL) {
        BACKEND_ORIGIN = VITE_BACKEND_URL;
    } else if (VITE_BACKEND_PORT) {
        BACKEND_ORIGIN = `${window.location.protocol}//${window.location.hostname}:${VITE_BACKEND_PORT}`;
    } else {
        BACKEND_ORIGIN = `${window.location.protocol}//${window.location.hostname}:5002`;
    }

    const renderHierarchicalOptions = (items, parentId = null, level = 0) => {
        return items
            .filter(item => item.parent_id === parentId)
            .map(item => (
                <React.Fragment key={item.id}>
                    <option value={item.id.toString()}>
                        {'\u00A0'.repeat(level * 4)}{level > 0 ? '↳ ' : ''}{item.nome}
                    </option>
                    {renderHierarchicalOptions(items, item.id, level + 1)}
                </React.Fragment>
            ));
    };

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';

            const [c, f, l, con, o, a, emp] = await Promise.all([
                fetch(`${API_URL}/chamados${queryParams}`, { headers }),
                fetch(`${API_URL}/fornecedores${queryParams}`, { headers }),
                fetch(`${API_URL}/localizacoes${queryParams}`, { headers }),
                fetch(`${API_URL}/contratos${queryParams}`, { headers }),
                fetch(`${API_URL}/orcamentos${queryParams}`, { headers }),
                fetch(`${API_URL}/ativos${queryParams}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers })
            ]);
            
            if (c.ok) setAtivosChamados(await c.json());
            if (f.ok) setFornecedores(await f.json());
            if (l.ok) setLocalizacoes(await l.json());
            if (con.ok) setContratos(await con.json());
            if (o.ok) setOrcamentos(await o.json());
            if (a.ok) setAtivos(await a.json());
            if (emp.ok) setEmpresas(await emp.json());
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData, selectedEntity]);

    const handleOpenAnexosModal = (anexos) => {
        setSelectedAnexos(anexos || []);
        setIsAnexosModalOpen(true);
    };

    const handleOpenModal = (chamado = null) => {
        if (chamado) {
            setIsEditing(true);
            setCurrentChamado(chamado);
            setFormData({
                titulo: chamado.titulo,
                descricao: chamado.descricao,
                status: chamado.status,
                empresa_id: chamado.empresa_id || '',
                fornecedor_id: chamado.fornecedor_id || '',
                localizacao_id: chamado.localizacao_id || '',
                contrato_id: chamado.contrato_id || '',
                orcamento_id: chamado.orcamento_id || '',
                ativo_id: chamado.ativo_id || '',
                valor_total: chamado.valor_total || 0,
                anexos: chamado.anexos || []
            });
        } else {
            setIsEditing(false);
            setCurrentChamado(null);
            setFormData({
                titulo: '', descricao: '', status: 'Aberto',
                empresa_id: '', fornecedor_id: '', localizacao_id: '', 
                contrato_id: '', orcamento_id: '', ativo_id: '', 
                valor_total: 0, anexos: []
            });
        }
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        setUploading(true);
        const newAnexos = [...formData.anexos];
        for (const file of files) {
            const data = new FormData();
            data.append('file', file);
            try {
                const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: data });
                const result = await res.json();
                if (result.path) newAnexos.push({ name: file.name, path: result.path });
            } catch (err) { console.error(err); }
        }
        setFormData({ ...formData, anexos: newAnexos });
        setUploading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            valor_total: parseFloat(formData.valor_total) || 0,
            empresa_id: formData.empresa_id || null,
            fornecedor_id: formData.fornecedor_id || null,
            localizacao_id: formData.localizacao_id || null,
            contrato_id: formData.contrato_id || null,
            orcamento_id: formData.orcamento_id || null,
            ativo_id: formData.ativo_id || null
        };
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/chamados/${currentChamado.id}` : `${API_URL}/chamados`;
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (response.ok) { setIsModalOpen(false); fetchData(); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja realmente excluir este chamado?')) {
            const response = await fetch(`${API_URL}/chamados/${id}`, { method: 'DELETE' });
            if (response.ok) fetchData();
        }
    };

    const filteredChamados = useMemo(() => {
        return chamados.filter(c => {
            const matchesSearch = c.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toString().includes(searchTerm);
            const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
            const matchesEmpresa = empresaFilter === 'Todas' || (c.empresa_id && c.empresa_id.toString() === empresaFilter);
            return matchesSearch && matchesStatus && matchesEmpresa;
        });
    }, [chamados, searchTerm, statusFilter, empresaFilter]);

    // Filtros dinâmicos para o formulário baseados na empresa selecionada
    const filteredAtivosForm = useMemo(() => {
        if (!formData.empresa_id) return ativos;
        return ativos.filter(a => a.empresa_id?.toString() === formData.empresa_id.toString());
    }, [ativos, formData.empresa_id]);

    const filteredLocalizacoesForm = useMemo(() => {
        if (!formData.empresa_id) return localizacoes;
        return localizacoes.filter(l => l.empresa_id?.toString() === formData.empresa_id.toString());
    }, [localizacoes, formData.empresa_id]);

    const filteredFornecedoresForm = useMemo(() => {
        if (!formData.empresa_id) return fornecedores;
        return fornecedores.filter(f => f.empresa_id?.toString() === formData.empresa_id.toString());
    }, [fornecedores, formData.empresa_id]);

    const filteredContratosForm = useMemo(() => {
        if (!formData.empresa_id) return contratos;
        return contratos.filter(c => c.empresa_id?.toString() === formData.empresa_id.toString());
    }, [contratos, formData.empresa_id]);

    const filteredOrcamentosForm = useMemo(() => {
        if (!formData.empresa_id) return orcamentos;
        const validLocIds = localizacoes
            .filter(l => l.empresa_id?.toString() === formData.empresa_id.toString())
            .map(l => l.id);
        return orcamentos.filter(o => validLocIds.includes(o.localizacao_id));
    }, [orcamentos, localizacoes, formData.empresa_id]);

    const getStatusBadge = (status) => {
        const styles = {
            'Aberto': 'bg-red-100 text-red-700 border-red-200',
            'Em Atendimento': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'Solucionado': 'bg-green-100 text-green-700 border-green-200',
            'Fechado': 'bg-gray-100 text-gray-700 border-gray-200'
        };
        return <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles['Aberto']}`}>{status}</span>;
    };

    // Constrói a URL final do anexo considerando backend externo
    const getAnexoHref = (path) => {
        if (!path) return '#';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        if (path.startsWith('//')) return window.location.protocol + path;
        if (path.startsWith('/')) return `${BACKEND_ORIGIN}${path}`;
        return `${BACKEND_ORIGIN}/${path.replace(/^\/+/, '')}`;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaClock className="text-indigo-600" /> Chamados
                </h1>
                <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-sm">
                    <FaPlus /> Novo Chamado
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Pesquisar..." className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="p-2 border rounded-lg outline-none" value={empresaFilter} onChange={(e) => setEmpresaFilter(e.target.value)}>
                    <option value="Todas">Todas as Empresas</option>
                    {renderHierarchicalOptions(empresas)}
                </select>
                <select className="p-2 border rounded-lg outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="Todos">Todos os Status</option>
                    <option value="Aberto">Aberto</option>
                    <option value="Em Atendimento">Em Atendimento</option>
                    <option value="Solucionado">Solucionado</option>
                    <option value="Fechado">Fechado</option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4 w-20">ID</th>
                            <th className="px-6 py-4">Título</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Empresa</th>
                            <th className="px-6 py-4">Abertura</th>
                            <th className="px-6 py-4">Localização</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredChamados.map(c => (
                            <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4 font-mono text-sm text-gray-500">#{c.id}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => handleOpenModal(c)} className="text-indigo-600 font-semibold hover:underline text-left block">{c.titulo}</button>
                                    <span className="text-xs text-gray-400 block mt-1 truncate max-w-xs">{c.descricao}</span>
                                </td>
                                <td className="px-6 py-4">{getStatusBadge(c.status)}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1"><FaBuilding className="text-gray-400" /> {c.empresa_nome || 'Não definida'}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{c.data_abertura ? format(new Date(c.data_abertura), 'dd/MM/yyyy HH:mm') : '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1"><FaMapMarkerAlt className="text-gray-400" /> {c.localizacao_nome || 'Não definida'}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {c.anexos && c.anexos.length > 0 && (
                                            <button onClick={() => handleOpenAnexosModal(c.anexos)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Ver Anexos">
                                                <FaPaperclip />
                                            </button>
                                        )}
                                        <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><FaEdit /></button>
                                        <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir"><FaTrashAlt /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isAnexosModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h3 className="font-bold flex items-center gap-2"><FaPaperclip /> Anexos do Chamado</h3>
                            <button onClick={() => setIsAnexosModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><FaTimes /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {selectedAnexos.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedAnexos.map((anexo, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                                    <FaFileContract />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 truncate">{anexo.name || anexo.filename || 'Arquivo'}</span>
                                            </div>
                                            <a 
                                                href={getAnexoHref(anexo.path || anexo.url || '')} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                title="Visualizar/Baixar"
                                            >
                                                <FaEye />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhum anexo encontrado.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button onClick={() => setIsAnexosModalOpen(false)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 font-semibold transition-colors">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">{isEditing ? `Chamado #${currentChamado.id}` : 'Novo Chamado'}</h2>
                                {isEditing && currentChamado.data_abertura && <span className="text-indigo-100 text-sm">Aberto em {format(new Date(currentChamado.data_abertura), 'dd/MM/yyyy HH:mm')}</span>}
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><FaTimes size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Título do Chamado *</label>
                                        <input type="text" required className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Descrição Detalhada</label>
                                        <textarea rows="4" className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.descricao} onChange={(e) => setFormData({...formData, descricao: e.target.value})}></textarea>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Status</label>
                                            <select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                                                <option value="Aberto">Aberto</option>
                                                <option value="Em Atendimento">Em Atendimento</option>
                                                <option value="Solucionado">Solucionado</option>
                                                <option value="Fechado">Fechado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Valor Total (R$)</label>
                                            <div className="relative">
                                                <FaDollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input type="number" step="0.01" className="w-full pl-8 pr-3 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.valor_total} onChange={(e) => setFormData({...formData, valor_total: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Empresa Vinculada *</label>
                                        <select required className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-semibold text-indigo-600" value={formData.empresa_id} onChange={(e) => setFormData({...formData, empresa_id: e.target.value, ativo_id: '', localizacao_id: '', fornecedor_id: '', contrato_id: '', orcamento_id: ''})}>
                                            <option value="">Selecione uma Empresa</option>
                                            {renderHierarchicalOptions(empresas)}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1 italic">* Selecione a empresa para filtrar os ativos e localizações abaixo.</p>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Ativo Vinculado</label>
                                            <select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={formData.ativo_id} onChange={(e) => setFormData({...formData, ativo_id: e.target.value})}>
                                                <option value="">{formData.empresa_id ? 'Nenhum Ativo' : 'Selecione uma Empresa primeiro'}</option>
                                                {filteredAtivosForm.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Localização</label>
                                            <select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={formData.localizacao_id} onChange={(e) => setFormData({...formData, localizacao_id: e.target.value})}>
                                                <option value="">{formData.empresa_id ? 'Nenhuma' : 'Selecione uma Empresa primeiro'}</option>
                                                {filteredLocalizacoesForm.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Fornecedor</label>
                                        <select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={formData.fornecedor_id} onChange={(e) => setFormData({...formData, fornecedor_id: e.target.value})}>
                                            <option value="">{formData.empresa_id ? 'Nenhum' : 'Selecione uma Empresa primeiro'}</option>
                                            {filteredFornecedoresForm.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Contrato</label>
                                            <select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={formData.contrato_id} onChange={(e) => setFormData({...formData, contrato_id: e.target.value})}>
                                                <option value="">{formData.empresa_id ? 'Nenhum' : 'Selecione uma Empresa primeiro'}</option>
                                                {filteredContratosForm.map(c => <option key={c.id} value={c.id}>{c.numero}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Orçamento</label>
                                            <select className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={formData.orcamento_id} onChange={(e) => setFormData({...formData, orcamento_id: e.target.value})}>
                                                <option value="">{formData.empresa_id ? 'Nenhum' : 'Selecione uma Empresa primeiro'}</option>
                                                {filteredOrcamentosForm.map(o => <option key={o.id} value={o.id}>{o.numero}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Anexos</label>
                                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-indigo-300 transition-colors relative">
                                            <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                                            <FaPaperclip className="mx-auto text-gray-400 mb-2" />
                                            <p className="text-sm text-gray-500">{uploading ? 'Enviando...' : 'Clique ou arraste arquivos para anexar'}</p>
                                        </div>
                                        <div className="mt-3 space-y-2">
                                            {formData.anexos.map((file, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-xs">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="truncate max-w-[220px]">{file.name || file.filename || file.originalname || 'Arquivo'}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const url = getAnexoHref(file.path || file.url || '');
                                                                // abre em nova aba com noopener + noreferrer para segurança
                                                                window.open(url, '_blank', 'noopener,noreferrer');
                                                            }}
                                                            className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                            title="Visualizar anexo"
                                                            aria-label={`Visualizar anexo ${file.name || file.filename || ''}`}
                                                        >
                                                            <FaEye />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, i) => i !== idx)})}
                                                            className="p-1 text-red-500 hover:text-red-700 rounded transition-colors"
                                                            title="Remover anexo"
                                                            aria-label={`Remover anexo ${file.name || file.filename || ''}`}
                                                        >
                                                            <FaTimes />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                <button type="submit" className="px-12 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">{isEditing ? 'Salvar Alterações' : 'Criar Chamado'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chamados;
