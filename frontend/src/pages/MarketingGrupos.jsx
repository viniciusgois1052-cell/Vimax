import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaTimes,
    FaUsers, FaTag, FaBuilding, FaInfoCircle
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const MarketingGrupos = () => {
    const { selectedEntity } = useEntity();
    const { user, can } = useAuth();
    const [grupos, setGrupos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentGrupo, setCurrentGrupo] = useState(null);
    const [isContatosModalOpen, setIsContatosModalOpen] = useState(false);
    const [contatosDoGrupo, setContatosDoGrupo] = useState([]);
    const [grupoSelecionado, setGrupoSelecionado] = useState(null);

    const [formData, setFormData] = useState({
        nome: '', descricao: '', empresa_id: ''
    });

    const API_URL = '/api';

    const getHeaders = useCallback(() => {
        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        return headers;
    }, [user]);

    const fetchData = useCallback(async () => {
        try {
            const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {};
            const params = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';
            const [g, e] = await Promise.all([
                fetch(`${API_URL}/marketing/grupos${params}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers })
            ]);
            if (g.ok) setGrupos(await g.json());
            if (e.ok) setEmpresas(await e.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, [user, selectedEntity]);

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
            empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null
        };
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing
            ? `${API_URL}/marketing/grupos/${currentGrupo.id}`
            : `${API_URL}/marketing/grupos`;
        try {
            const response = await fetch(url, {
                method,
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                setIsModalOpen(false);
                fetchData();
            } else {
                const err = await response.json();
                alert("Erro ao salvar: " + (err.detail || err.error || "Verifique os dados"));
            }
        } catch (error) { console.error("Erro ao submeter:", error); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja realmente excluir este grupo?')) {
            try {
                await fetch(`${API_URL}/marketing/grupos/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    const handleVerContatos = async (grupo) => {
        setGrupoSelecionado(grupo);
        try {
            const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {};
            const res = await fetch(`${API_URL}/marketing/grupos/${grupo.id}/contatos`, { headers });
            if (res.ok) setContatosDoGrupo(await res.json());
        } catch (error) { console.error("Erro ao buscar contatos do grupo:", error); }
        setIsContatosModalOpen(true);
    };

    const filteredGrupos = useMemo(() => {
        return grupos.filter(g =>
            g.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (g.descricao && g.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [grupos, searchTerm]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaTag className="text-gray-700" /> Grupos — Email Marketing
                </h1>
                {can('marketing','criar') && (
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-black hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <FaPlus /> Novo Grupo
                </button>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
                <div className="relative max-w-md">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou descrição..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 outline-none"
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
                        {filteredGrupos.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-10 text-center text-gray-400">
                                    Nenhum grupo encontrado.
                                </td>
                            </tr>
                        ) : filteredGrupos.map(g => (
                            <tr key={g.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-800 flex items-center gap-2">
                                    <FaTag className="text-gray-400" /> {g.nome}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {g.descricao || <span className="italic text-gray-300">—</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleVerContatos(g)}
                                        className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 text-gray-700 rounded-full text-sm font-bold hover:bg-gray-100 transition-colors"
                                    >
                                        <FaUsers className="text-xs" /> {g.total_contatos} contato{g.total_contatos !== 1 ? 's' : ''}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {can('marketing','editar') && <button onClick={() => handleOpenModal(g)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FaEdit /></button>}
                                        {can('marketing','excluir') && <button onClick={() => handleDelete(g.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FaTrashAlt /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-black text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaTag /> {isEditing ? 'Editar Grupo' : 'Novo Grupo'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nome *</label>
                                <input type="text" required
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-gray-500"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Descrição</label>
                                <textarea
                                    rows={3}
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                    value={formData.descricao}
                                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">
                                    <FaBuilding className="inline mr-1 text-indigo-500" />
                                    Empresa Vimax (Opcional)
                                </label>
                                <select
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.empresa_id}
                                    onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                                >
                                    <option value="">Nenhuma</option>
                                    {empresas.map(e => (
                                        <option key={e.id} value={e.id.toString()}>{e.nome}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors">
                                    Cancelar
                                </button>
                                <button type="submit"
                                    className="px-8 py-2 bg-black hover:bg-black text-white rounded-lg font-bold shadow transition-all">
                                    {isEditing ? 'Salvar Alterações' : 'Criar Grupo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Ver Contatos do Grupo */}
            {isContatosModalOpen && grupoSelecionado && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-black text-white">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FaUsers /> Contatos do grupo: {grupoSelecionado.nome}
                            </h2>
                            <button onClick={() => setIsContatosModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={18} />
                            </button>
                        </div>
                        <div className="p-4 max-h-96 overflow-y-auto">
                            {contatosDoGrupo.length === 0 ? (
                                <p className="text-center text-gray-400 italic py-6">Nenhum contato neste grupo ainda.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-500 uppercase text-xs font-bold border-b">
                                            <th className="py-2 text-left">Nome</th>
                                            <th className="py-2 text-left">E-mail</th>
                                            <th className="py-2 text-left">Empresa</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {contatosDoGrupo.map(c => (
                                            <tr key={c.id} className="hover:bg-gray-50">
                                                <td className="py-2 font-semibold text-gray-800">{c.nome}</td>
                                                <td className="py-2 text-gray-500">{c.email}</td>
                                                <td className="py-2 text-gray-400">{c.empresa || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setIsContatosModalOpen(false)}
                                className="px-6 py-2 bg-slate-700 text-white rounded-lg font-bold hover:bg-slate-800 transition-all">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketingGrupos;