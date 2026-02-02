import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaMapMarkerAlt, FaBuilding, 
    FaTimes, FaChevronRight, FaInfoCircle
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const Localizacoes = () => {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [localizacoes, setLocalizacoes] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentLocalizacao, setCurrentLocalizacao] = useState(null);

    const [formData, setFormData] = useState({
        nome: '', descricao: '', empresa_id: ''
    });

    const API_URL = '/api';

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';

            const [l, e] = await Promise.all([
                fetch(`${API_URL}/localizacoes${queryParams}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers })
            ]);
            if (l.ok) setLocalizacoes(await l.json());
            if (e.ok) setEmpresas(await e.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData, selectedEntity]);

    const handleOpenModal = (localizacao = null) => {
        if (localizacao) {
            setIsEditing(true);
            setCurrentLocalizacao(localizacao);
            setFormData({
                nome: localizacao.nome || '',
                descricao: localizacao.descricao || '',
                empresa_id: localizacao.empresa_id ? localizacao.empresa_id.toString() : ''
            });
        } else {
            setIsEditing(false);
            setCurrentLocalizacao(null);
            setFormData({
                nome: '', descricao: '', empresa_id: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            nome: formData.nome,
            descricao: formData.descricao,
            empresa_id: formData.empresa_id ? parseInt(formData.empresa_id, 10) : null
        };

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/localizacoes/${currentLocalizacao.id}` : `${API_URL}/localizacoes`;

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
                const responseData = await response.json();
                alert("Erro ao salvar: " + (responseData.error || "Verifique os dados"));
            }
        } catch (error) { 
            console.error("Erro ao submeter:", error);
            alert("Erro ao salvar localização");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja realmente excluir esta localização?')) {
            try {
                const response = await fetch(`${API_URL}/localizacoes/${id}`, { method: 'DELETE' });
                if (response.ok) fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    const buildEmpresaHierarchy = useCallback((empresaId) => {
        if (!empresaId) return '';
        const idToFind = parseInt(empresaId, 10);
        const empresa = empresas.find(e => e.id === idToFind);
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

    // Função para renderizar as opções do select com indentação visual (Árvore)
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

    // Função auxiliar para pegar todos os IDs de sub-empresas (para o filtro ser abrangente)
    const getAllSubCompanyIds = useCallback((parentId) => {
        const ids = [parseInt(parentId, 10)];
        const children = empresas.filter(e => e.parent_id === parseInt(parentId, 10));
        children.forEach(child => {
            ids.push(...getAllSubCompanyIds(child.id));
        });
        return ids;
    }, [empresas]);

    const filteredLocalizacoes = useMemo(() => {
        return localizacoes.filter(l => {
            const matchesSearch = l.nome.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesEmpresa = true;
            if (empresaFilter !== 'Todas') {
                const allowedIds = getAllSubCompanyIds(empresaFilter);
                matchesEmpresa = allowedIds.includes(parseInt(l.empresa_id, 10));
            }
            
            return matchesSearch && matchesEmpresa;
        });
    }, [localizacoes, searchTerm, empresaFilter, getAllSubCompanyIds]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaMapMarkerAlt className="text-indigo-600" /> Gestão de Localizações
                </h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <FaPlus /> Nova Localização
                </button>
            </div>

            {/* Filtros com Hierarquia Visual */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por nome..." 
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
                    {renderEmpresaOptions()}
                </select>
            </div>

            {/* Tabela de Localizações */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4">Empresa Vinculada</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredLocalizacoes.map(l => (
                            <tr key={l.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="text-gray-800 font-semibold flex items-center gap-2">
                                        <FaMapMarkerAlt className="text-indigo-400" /> {l.nome}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-600">{l.descricao || '-'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    {l.empresa_id ? (
                                        <span className="text-sm text-gray-600 flex items-center gap-2">
                                            <FaBuilding className="text-indigo-400" /> 
                                            {buildEmpresaHierarchy(l.empresa_id)}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">Sem empresa vinculada</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleOpenModal(l)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                            <FaEdit />
                                        </button>
                                        <button onClick={() => handleDelete(l.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                            <FaTrashAlt />
                                        </button>
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
                                <FaMapMarkerAlt /> {isEditing ? 'Editar Localização' : 'Nova Localização'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Nome da Localização *</label>
                                    <input 
                                        type="text" 
                                        required 
                                        className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                        value={formData.nome} 
                                        onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Descrição</label>
                                    <textarea 
                                        rows="3"
                                        className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none" 
                                        value={formData.descricao} 
                                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                                    />
                                </div>

                                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                                        <FaBuilding className="text-indigo-600" /> Vincular Empresa
                                    </label>
                                    <select 
                                        className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                        value={formData.empresa_id} 
                                        onChange={(e) => setFormData({...formData, empresa_id: e.target.value})}
                                    >
                                        <option value="">Nenhuma (Localização Global)</option>
                                        {renderEmpresaOptions()}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                        <FaInfoCircle /> Selecione a empresa ou deixe em branco para localização global.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                <button type="submit" className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all">{isEditing ? 'Salvar Alterações' : 'Criar Localização'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Localizacoes;
