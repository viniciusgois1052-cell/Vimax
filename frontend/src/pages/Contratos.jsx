import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaFileContract, FaBuilding, 
    FaUserTie, FaCalendarAlt, FaDollarSign, FaTimes, FaPaperclip, 
    FaInfoCircle, FaBell, FaDownload, FaMapMarkerAlt
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const Contratos = () => {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [contratos, setContratos] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    const [fornecedorFilter, setFornecedorFilter] = useState('Todos');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentContract, setCurrentContract] = useState(null);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        numero: '', fornecedor_id: '', localizacao_id: '', empresa_id: '',
        data_inicio: '', data_fim: '', valor: '', is_mensal: false,
        observacao: '', anexos: [], dias_aviso_vencimento: 30
    });

    const BACKEND_URL = 'http://192.168.2.70:5002';
    const API_URL = '/api';

    const fetchData = useCallback(async ( ) => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';

            const [c, f, l, e] = await Promise.all([
                fetch(`${API_URL}/contratos${queryParams}`, { headers }),
                fetch(`${API_URL}/fornecedores${queryParams}`, { headers }),
                fetch(`${API_URL}/localizacoes${queryParams}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers })
            ]);
            if (c.ok) setContratos(await c.json());
            if (f.ok) setFornecedores(await f.json());
            if (l.ok) setLocalizacoes(await l.json());
            if (e.ok) setEmpresas(await e.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData, selectedEntity]);

    const handleOpenModal = (contrato = null) => {
        if (contrato) {
            setIsEditing(true);
            setCurrentContract(contrato);
            setFormData({
                numero: contrato.numero || '',
                fornecedor_id: contrato.fornecedor_id?.toString() || '',
                localizacao_id: contrato.localizacao_id?.toString() || '',
                empresa_id: contrato.empresa_id?.toString() || '',
                data_inicio: contrato.data_inicio || '',
                data_fim: contrato.data_fim || '',
                valor: contrato.valor || '',
                is_mensal: contrato.is_mensal || false,
                observacao: contrato.observacao || '',
                anexos: contrato.anexos || [],
                dias_aviso_vencimento: contrato.dias_aviso_vencimento || 30
            });
        } else {
            setIsEditing(false);
            setCurrentContract(null);
            setFormData({
                numero: '', fornecedor_id: '', localizacao_id: '', empresa_id: '',
                data_inicio: '', data_fim: '', valor: '', is_mensal: false,
                observacao: '', anexos: [], dias_aviso_vencimento: 30
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
            valor: parseFloat(formData.valor),
            fornecedor_id: parseInt(formData.fornecedor_id),
            localizacao_id: formData.localizacao_id ? parseInt(formData.localizacao_id) : null,
            empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
            dias_aviso_vencimento: parseInt(formData.dias_aviso_vencimento)
        };

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/contratos/${currentContract.id}` : `${API_URL}/contratos`;

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchData();
            } else {
                const err = await response.json();
                alert("Erro ao salvar: " + (err.error || "Verifique os dados"));
            }
        } catch (error) { console.error("Erro ao submeter:", error); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja realmente excluir este contrato?')) {
            try {
                const response = await fetch(`${API_URL}/contratos/${id}`, { method: 'DELETE' });
                if (response.ok) fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    const filteredContratos = useMemo(() => {
        return contratos.filter(c => {
            const matchesSearch = c.numero.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (c.fornecedor_nome && c.fornecedor_nome.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesEmpresa = empresaFilter === 'Todas' || c.empresa_id?.toString() === empresaFilter;
            const matchesFornecedor = fornecedorFilter === 'Todos' || c.fornecedor_id?.toString() === fornecedorFilter;
            return matchesSearch && matchesEmpresa && matchesFornecedor;
        });
    }, [contratos, searchTerm, empresaFilter, fornecedorFilter]);

    const isNearExpiration = (dateFim, daysNotice) => {
        const today = new Date();
        const expirationDate = new Date(dateFim);
        const diffTime = expirationDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= daysNotice;
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaFileContract className="text-indigo-600" /> Gestão de Contratos
                </h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <FaPlus /> Novo Contrato
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar número ou fornecedor..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={empresaFilter}
                    onChange={(e) => setEmpresaFilter(e.target.value)}
                >
                    <option value="Todas">Todas as Empresas</option>
                    {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                </select>
                <select 
                    className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={fornecedorFilter}
                    onChange={(e) => setFornecedorFilter(e.target.value)}
                >
                    <option value="Todos">Todos os Fornecedores</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4">Número / Empresa</th>
                            <th className="px-6 py-4">Fornecedor</th>
                            <th className="px-6 py-4">Vencimento</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredContratos.map(c => {
                            const nearExp = isNearExpiration(c.data_fim, c.dias_aviso_vencimento);
                            return (
                                <tr key={c.id} className={`hover:bg-indigo-50/30 transition-colors group ${nearExp ? 'bg-red-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <span className="text-gray-800 font-semibold block flex items-center gap-2">
                                            {c.numero} {nearExp && <FaBell className="text-red-500 animate-pulse" title="Vencimento Próximo" />}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                            <FaBuilding className="text-gray-300" /> {c.empresa_nome || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-600 flex items-center gap-2">
                                            <FaUserTie className="text-indigo-400" /> {c.fornecedor_nome}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-medium flex items-center gap-2 ${nearExp ? 'text-red-600' : 'text-gray-600'}`}>
                                            <FaCalendarAlt /> {new Date(c.data_fim).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-gray-700 flex items-center gap-1">
                                            <FaDollarSign className="text-green-500" /> 
                                            {c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {c.is_mensal ? '/mês' : ''}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                                                <FaTrashAlt />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaFileContract /> {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Identificação</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Número do Contrato *</label>
                                        <input type="text" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.numero} onChange={(e) => setFormData({...formData, numero: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Empresa *</label>
                                        <select required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.empresa_id} onChange={(e) => setFormData({...formData, empresa_id: e.target.value})}>
                                            <option value="">Selecione a Empresa</option>
                                            {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Fornecedor *</label>
                                        <select required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.fornecedor_id} onChange={(e) => setFormData({...formData, fornecedor_id: e.target.value})}>
                                            <option value="">Selecione o Fornecedor</option>
                                            {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Localização</label>
                                        <select className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.localizacao_id} onChange={(e) => setFormData({...formData, localizacao_id: e.target.value})}>
                                            <option value="">Selecione a Localização</option>
                                            {localizacoes.map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Vigência e Valores</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Data Início *</label>
                                            <input type="date" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.data_inicio} onChange={(e) => setFormData({...formData, data_inicio: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Data Fim *</label>
                                            <input type="date" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.data_fim} onChange={(e) => setFormData({...formData, data_fim: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Valor R$ *</label>
                                            <input type="number" step="0.01" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.valor} onChange={(e) => setFormData({...formData, valor: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Aviso Vencimento (Dias)</label>
                                            <input type="number" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.dias_aviso_vencimento} onChange={(e) => setFormData({...formData, dias_aviso_vencimento: e.target.value})} />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 py-2">
                                        <input type="checkbox" id="is_mensal" className="w-4 h-4 text-indigo-600" checked={formData.is_mensal} onChange={(e) => setFormData({...formData, is_mensal: e.target.checked})} />
                                        <label htmlFor="is_mensal" className="text-sm font-bold text-gray-700">Valor é Mensal?</label>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Observações</label>
                                    <textarea rows="3" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={formData.observacao} onChange={(e) => setFormData({...formData, observacao: e.target.value})}></textarea>
                                </div>

                                <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FaPaperclip className="text-indigo-600" /> Documentos / Anexos</label>
                                    <input type="file" multiple onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" disabled={uploading} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                        {formData.anexos.map((file, i) => (
                                            <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm">
                                                <a 
                                                    href={`${BACKEND_URL}${file.path}`} 
                                                    target="_blank" 
                                                    rel="noreferrer" 
                                                    className="text-sm text-indigo-600 font-medium truncate flex items-center gap-2 hover:underline"
                                                >
                                                    <FaDownload className="text-gray-400" /> {file.name}
                                                </a>
                                                <button type="button" onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, idx) => idx !== i)})} className="text-red-400 hover:text-red-600 p-1"><FaTimes /></button>
                                            </div>
                                        ))}
                                    </div>
                                    {uploading && <p className="text-xs text-indigo-600 mt-2 animate-pulse">Enviando arquivos...</p>}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                <button type="submit" className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">{isEditing ? 'Salvar Alterações' : 'Criar Contrato'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contratos;
