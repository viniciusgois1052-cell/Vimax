import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaEnvelope,
    FaPhone, FaTimes, FaBuilding, FaUsers, FaInfoCircle, FaTag
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const MarketingContatos = () => {
    const { selectedEntity } = useEntity();
    const { user, can } = useAuth();
    const [contatos, setContatos] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentContato, setCurrentContato] = useState(null);
    const [isGruposModalOpen, setIsGruposModalOpen] = useState(false);
    const [gruposSelecionados, setGruposSelecionados] = useState([]);
    const [contatoGrupos, setContatoGrupos] = useState(null);

    const [formData, setFormData] = useState({
        nome: '', email: '', empresa: '', telefone: '', empresa_id: ''
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
            const [c, g, e] = await Promise.all([
                fetch(`${API_URL}/marketing/contatos${params}`, { headers }),
                fetch(`${API_URL}/marketing/grupos${params}`, { headers }),
                fetch(`${API_URL}/empresas`, { headers })
            ]);
            if (c.ok) setContatos(await c.json());
            if (g.ok) setGrupos(await g.json());
            if (e.ok) setEmpresas(await e.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, [user, selectedEntity]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (contato = null) => {
        if (contato) {
            setIsEditing(true);
            setCurrentContato(contato);
            setFormData({
                nome: contato.nome || '',
                email: contato.email || '',
                empresa: contato.empresa || '',
                telefone: contato.telefone || '',
                empresa_id: contato.empresa_id?.toString() || ''
            });
        } else {
            setIsEditing(false);
            setCurrentContato(null);
            setFormData({ nome: '', email: '', empresa: '', telefone: '', empresa_id: '' });
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
            ? `${API_URL}/marketing/contatos/${currentContato.id}`
            : `${API_URL}/marketing/contatos`;
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
        if (window.confirm('Deseja realmente excluir este contato?')) {
            try {
                await fetch(`${API_URL}/marketing/contatos/${id}`, {
                    method: 'DELETE',
                    headers: getHeaders()
                });
                fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    const handleOpenGruposModal = (contato) => {
        setContatoGrupos(contato);
        const ids = (contato.grupos || []).map(g => g.id);
        setGruposSelecionados(ids);
        setIsGruposModalOpen(true);
    };

    const handleSalvarGrupos = async () => {
        try {
            const response = await fetch(`${API_URL}/marketing/contatos/${contatoGrupos.id}/grupos`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ grupo_ids: gruposSelecionados })
            });
            if (response.ok) {
                setIsGruposModalOpen(false);
                fetchData();
            }
        } catch (error) { console.error("Erro ao salvar grupos:", error); }
    };

    const toggleGrupo = (id) => {
        setGruposSelecionados(prev =>
            prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
        );
    };

    const filteredContatos = useMemo(() => {
        return contatos.filter(c =>
            c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.empresa && c.empresa.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [contatos, searchTerm]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUsers className="text-black" /> Contatos — Email Marketing
                </h1>
                {can('marketing','criar') && (
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-black hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <FaPlus /> Novo Contato
                </button>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200">
                <div className="relative max-w-md">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome, email ou empresa..."
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
                            <th className="px-6 py-4">E-mail</th>
                            <th className="px-6 py-4">Empresa</th>
                            <th className="px-6 py-4">Telefone</th>
                            <th className="px-6 py-4">Grupos</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredContatos.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                                    Nenhum contato encontrado.
                                </td>
                            </tr>
                        ) : filteredContatos.map(c => (
                            <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-6 py-4 font-semibold text-gray-800">{c.nome}</td>
                                <td className="px-6 py-4">
                                    <span className="flex items-center gap-2 text-sm text-gray-600">
                                        <FaEnvelope className="text-blue-400" /> {c.email}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {c.empresa ? (
                                        <span className="flex items-center gap-2 text-sm text-gray-600">
                                            <FaBuilding className="text-indigo-400" /> {c.empresa}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {c.telefone ? (
                                        <span className="flex items-center gap-2 text-sm text-gray-600">
                                            <FaPhone className="text-green-400" /> {c.telefone}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-400 italic">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => handleOpenGruposModal(c)}
                                        className="flex items-center gap-1 text-sm text-gray-700 hover:text-indigo-800 font-semibold"
                                    >
                                        <FaTag className="text-xs" />
                                        {(c.grupos || []).length > 0
                                            ? (c.grupos || []).map(g => g.nome).join(', ')
                                            : <span className="text-gray-400 font-normal italic">Vincular grupos</span>
                                        }
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {can('marketing','editar') && <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><FaEdit /></button>}
                                        {can('marketing','excluir') && <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><FaTrashAlt /></button>}
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-black text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaUsers /> {isEditing ? 'Editar Contato' : 'Novo Contato'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Nome *</label>
                                <input type="text" required
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.nome}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">E-mail *</label>
                                <input type="email" required
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Empresa (do contato)</label>
                                <input type="text"
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.empresa}
                                    onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
                                <input type="text"
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.telefone}
                                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
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
                                    {isEditing ? 'Salvar Alterações' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Grupos */}
            {isGruposModalOpen && contatoGrupos && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FaTag /> Grupos de {contatoGrupos.nome}
                            </h2>
                            <button onClick={() => setIsGruposModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-2 max-h-80 overflow-y-auto">
                            {grupos.length === 0 ? (
                                <p className="text-gray-400 text-sm italic text-center">Nenhum grupo cadastrado ainda.</p>
                            ) : grupos.map(g => (
                                <label key={g.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-indigo-50 cursor-pointer border border-transparent hover:border-indigo-100 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={gruposSelecionados.includes(g.id)}
                                        onChange={() => toggleGrupo(g.id)}
                                        className="w-4 h-4 accent-indigo-600"
                                    />
                                    <span className="font-semibold text-gray-700">{g.nome}</span>
                                </label>
                            ))}
                        </div>
                        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
                            <button onClick={() => setIsGruposModalOpen(false)}
                                className="px-5 py-2 rounded-lg font-bold text-gray-500 hover:bg-gray-200 transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleSalvarGrupos}
                                className="px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow transition-all">
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketingContatos;
