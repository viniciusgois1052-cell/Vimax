import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaTags,
    FaTimes, FaBuilding, FaInfoCircle, FaUsers
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const MarketingGrupos = () => {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [grupos, setGrupos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentGrupo, setCurrentGrupo] = useState(null);
    const [isContatosModalOpen, setIsContatosModalOpen] = useState(false);
    const [contatosDoGrupo, setContatosDoGrupo] = useState([]);
    const [formData, setFormData] = useState({ nome: '', descricao: '', empresa_id: '' });

    const API_URL = '/api';

    const headers = useMemo(() => {
        const h = { 'Content-Type': 'application/json' };
        if (user?.api_token) h['X-API-Token'] = user.api_token;
        return h;
    }, [user]);

    const fetchData = useCallback(async () => {
        try {
            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';
            const [g, e] = await Promise.all([
                fetch(`${API_URL}/marketing/grupos${queryParams}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers }),
            ]);
            if (g.ok) setGrupos(await g.json());
            if (e.ok) setEmpresas(await e.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, [user, selectedEntity, headers]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (grupo = null) => {
        if (grupo) {
            setIsEditing(true);
            setCurrentGrupo(grupo);
            setFormData({
                nome: grupo.nome || '',
                descricao: grupo.descricao || '',
                empresa_id: grupo.empresa_id?.toString() || ''
            });
        } else {
            setIsEditing(false);
            setCurrentGrupo(null);
            setFormData({ nome: '', descricao: '', empresa_id: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
        };
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing
            ? `${API_URL}/marketing/grupos/${currentGrupo.id}`
            : `${API_URL}/marketing/grupos`;
        try {
            const response = await fetch(url, { method, headers, body: JSON.stringify(payload) });
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
        if (window.confirm('Deseja realmente excluir este grupo?')) {
            try {
                const response = await fetch(`${API_URL}/marketing/grupos/${id}`, { method: 'DELETE', headers });
                if (response.ok) fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    const handleOpenContatosModal = async (grupo) => {
        setCurrentGrupo(grupo);
        try {
            const response = await fetch(`${API_URL}/marketing/grupos/${grupo.id}/contatos`, { headers });
            if (response.ok) setContatosDoGrupo(await response.json());
        } catch (error) { console.error("Erro ao buscar contatos:", error); }
        setIsContatosModalOpen(true);
    };

    const renderEmpresaOptions = () => {
        return empresas.map(e => (
            <option key={e.id} value={e.id.toString()}>{e.nome}</option>
        ));
    };

    const filteredGrupos = useMemo(() => {
        return grupos.filter(g =>
            g.nome.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [grupos, searchTerm]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaTags className="text-indigo-600" /> Grupos de Contatos
                </h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <FaPlus /> Novo Grupo
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
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
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4">Nome</th>
                            <th className="px-6 py-4">Descrição</th>
                            <th className="px-6 py-4">Qtd. Contatos</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredGrupos.map(g => (
                            <tr key={g.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4 font-semibold text-gray-800">{g.nome}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {g.descricao || <span className="text-gray-400 italic">—</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleOpenContatosModal(g)}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold hover:bg-indigo-200 transition-colors"
                                    >
                                        <FaUsers className="text-xs" />
                                        {g.qtd_contatos ?? 0} contato{(g.qtd_contatos ?? 0) !== 1 ? 's' : ''}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleOpenModal(g)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FaEdit /></button>
                                        <button onClick={() => handleDelete(g.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FaTrashAlt /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredGrupos.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">Nenhum grupo encontrado.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaTags /> {isEditing ? 'Editar Grupo' : 'Novo Grupo'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nome *</label>
                                <input type="text" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição</label>
                                <textarea className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={3} value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><FaBuilding className="text-indigo-600" /> Empresa Vimax (opcional)</label>
                                <select className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.empresa_id} onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}>
                                    <option value="">Selecione a Empresa (Opcional)</option>
                                    {renderEmpresaOptions()}
                                </select>
                                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><FaInfoCircle /> Para multiempresa.</p>
                            </div>
                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                <button type="submit" className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all">{isEditing ? 'Salvar Alterações' : 'Criar Grupo'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Contatos do Grupo */}
            {isContatosModalOpen && currentGrupo && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaUsers /> Contatos — {currentGrupo.nome}
                            </h2>
                            <button onClick={() => setIsContatosModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-2">
                            {contatosDoGrupo.length === 0 && (
                                <p className="text-gray-400 italic text-sm">Nenhum contato neste grupo.</p>
                            )}
                            {contatosDoGrupo.map(c => (
                                <div key={c.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                                    <p className="font-semibold text-gray-800">{c.nome}</p>
                                    <p className="text-xs text-gray-500">{c.email}</p>
                                    {c.empresa && <p className="text-xs text-gray-400">{c.empresa}</p>}
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setIsContatosModalOpen(false)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all">Fechar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketingGrupos;
