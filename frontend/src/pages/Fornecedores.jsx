import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaUserTie, FaBuilding, 
    FaEnvelope, FaPhone, FaTimes, FaMapMarkerAlt, FaFileInvoice, 
    FaInfoCircle, FaBriefcase
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const Fornecedores = () => {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [fornecedores, setFornecedores] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentFornecedor, setCurrentFornecedor] = useState(null);

    const [formData, setFormData] = useState({
        nome: '', cnpj: '', servico: '', email: '', 
        telefone: '', endereco: '', empresa_id: ''
    });

    const API_URL = '/api';

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';

            const [f, e] = await Promise.all([
                fetch(`${API_URL}/fornecedores${queryParams}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers })
            ]);
            if (f.ok) setFornecedores(await f.json());
            if (e.ok) setEmpresas(await e.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData, selectedEntity]);

    const handleOpenModal = (fornecedor = null) => {
        if (fornecedor) {
            setIsEditing(true);
            setCurrentFornecedor(fornecedor);
            setFormData({
                nome: fornecedor.nome || '',
                cnpj: fornecedor.cnpj || '',
                servico: fornecedor.servico || '',
                email: fornecedor.email || '',
                telefone: fornecedor.telefone || '',
                endereco: fornecedor.endereco || '',
                empresa_id: fornecedor.empresa_id?.toString() || ''
            });
        } else {
            setIsEditing(false);
            setCurrentFornecedor(null);
            setFormData({
                nome: '', cnpj: '', servico: '', email: '', 
                telefone: '', endereco: '', empresa_id: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const payload = {
            ...formData,
            empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null
        };

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/fornecedores/${currentFornecedor.id}` : `${API_URL}/fornecedores`;

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
        if (window.confirm('Deseja realmente excluir este fornecedor?')) {
            try {
                const response = await fetch(`${API_URL}/fornecedores/${id}`, { method: 'DELETE' });
                if (response.ok) fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    // Função para construir o caminho hierárquico da empresa (ex: Matriz > Filial)
    const buildEmpresaHierarchy = useCallback((empresaId) => {
        if (!empresaId) return '';
        const empresa = empresas.find(e => e.id === empresaId);
        if (!empresa) return '';
        
        let hierarchy = empresa.nome;
        let currentParentId = empresa.parent_id;
        
        while (currentParentId) {
            const parent = empresas.find(e => e.id === currentParentId);
            if (parent) {
                hierarchy = `${parent.nome} > ${hierarchy}`;
                currentParentId = parent.parent_id;
            } else {
                break;
            }
        }
        return hierarchy;
    }, [empresas]);

    // Função para renderizar as opções do select com indentação visual
    const renderEmpresaOptions = () => {
        const buildTree = (parentId = null, level = 0) => {
            return empresas
                .filter(e => e.parent_id === parentId)
                .flatMap(empresa => [
                    <option key={empresa.id} value={empresa.id.toString()}>
                        {'\u00A0'.repeat(level * 4)}{level > 0 ? '└─ ' : ''}{empresa.nome}
                    </option>,
                    ...buildTree(empresa.id, level + 1)
                ]);
        };
        return buildTree();
    };

    const filteredFornecedores = useMemo(() => {
        return fornecedores.filter(f => {
            const matchesSearch = f.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (f.cnpj && f.cnpj.includes(searchTerm));
            const matchesEmpresa = empresaFilter === 'Todas' || f.empresa_id?.toString() === empresaFilter;
            return matchesSearch && matchesEmpresa;
        });
    }, [fornecedores, searchTerm, empresaFilter]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUserTie className="text-indigo-600" /> Gestão de Fornecedores
                </h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <FaPlus /> Novo Fornecedor
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por nome ou CNPJ..." 
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
                    {empresas.map(e => (
                        <option key={e.id} value={e.id.toString()}>
                            {buildEmpresaHierarchy(e.id)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tabela de Fornecedores */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4">Nome / CNPJ</th>
                            <th className="px-6 py-4">Empresa (Vínculo)</th>
                            <th className="px-6 py-4">Serviço</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredFornecedores.map(f => (
                            <tr key={f.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="text-gray-800 font-semibold block">{f.nome}</span>
                                    {f.cnpj && (
                                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                            <FaFileInvoice className="text-gray-300" /> {f.cnpj}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {f.empresa_id ? (
                                        <span className="text-sm text-gray-600 flex items-center gap-2">
                                            <FaBuilding className="text-indigo-400" /> 
                                            {buildEmpresaHierarchy(f.empresa_id)}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">Sem empresa vinculada</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-600 flex items-center gap-2">
                                        <FaBriefcase className="text-green-400" /> {f.servico || '-'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600 space-y-1">
                                        {f.email && <div className="flex items-center gap-2"><FaEnvelope className="text-blue-400 text-xs" /> {f.email}</div>}
                                        {f.telefone && <div className="flex items-center gap-2"><FaPhone className="text-green-400 text-xs" /> {f.telefone}</div>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleOpenModal(f)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FaEdit /></button>
                                        <button onClick={() => handleDelete(f.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FaTrashAlt /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal de Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaUserTie /> {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Dados Principais</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Fornecedor *</label>
                                        <input type="text" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">CNPJ</label>
                                        <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Serviço</label>
                                        <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.servico} onChange={(e) => setFormData({...formData, servico: e.target.value})} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Contato</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                                        <input type="email" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
                                        <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Endereço</label>
                                        <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FaBuilding className="text-indigo-600" /> Vincular Empresa</label>
                                    <select 
                                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                        value={formData.empresa_id} 
                                        onChange={(e) => setFormData({...formData, empresa_id: e.target.value})}
                                    >
                                        <option value="">Selecione a Empresa (Opcional)</option>
                                        {renderEmpresaOptions()}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><FaInfoCircle /> A hierarquia ajuda a organizar fornecedores por unidade.</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                <button type="submit" className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all">{isEditing ? 'Salvar Alterações' : 'Criar Fornecedor'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Fornecedores;
