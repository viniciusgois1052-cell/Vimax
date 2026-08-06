import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaUserFriends, FaBuilding,
    FaEnvelope, FaPhone, FaTimes, FaFileInvoice, FaInfoCircle, FaFlask
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const Clientes = () => {
    const { selectedEntity } = useEntity();
    const { user, can } = useAuth();
    const [clientes, setClientes] = useState([]);
    const [empresas, setEmpresas] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentCliente, setCurrentCliente] = useState(null);

    const [formData, setFormData] = useState({
        nome: '', documento: '', exames: '', email: '',
        telefone: '', empresa_id: '', observacao: ''
    });

    const API_URL = '/api';

    const headers = useCallback(() => {
        const h = {};
        if (user?.api_token) h['X-API-Token'] = user.api_token;
        return h;
    }, [user]);

    const fetchData = useCallback(async () => {
        try {
            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';
            const [c, e] = await Promise.all([
                fetch(`${API_URL}/clientes${queryParams}`, { headers: headers() }),
                fetch(`${API_URL}/empresas`, { headers: headers() }),
            ]);
            if (c.ok) setClientes(await c.json());
            if (e.ok) setEmpresas(await e.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, [user, selectedEntity, headers]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (cliente = null) => {
        if (cliente) {
            setIsEditing(true);
            setCurrentCliente(cliente);
            setFormData({
                nome:       cliente.nome       || '',
                documento:  cliente.documento  || '',
                exames:     cliente.exames     || '',
                email:      cliente.email      || '',
                telefone:   cliente.telefone   || '',
                empresa_id: cliente.empresa_id?.toString() || '',
                observacao: cliente.observacao || '',
            });
        } else {
            setIsEditing(false);
            setCurrentCliente(null);
            setFormData({ nome: '', documento: '', exames: '', email: '', telefone: '', empresa_id: '', observacao: '' });
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
        const url    = isEditing ? `${API_URL}/clientes/${currentCliente.id}` : `${API_URL}/clientes`;
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...headers() },
                body: JSON.stringify(payload),
            });
            if (response.ok) { setIsModalOpen(false); fetchData(); }
            else { const err = await response.json(); alert("Erro ao salvar: " + (err.error || "Verifique os dados")); }
        } catch (error) { console.error("Erro ao submeter:", error); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja realmente excluir este cliente?')) {
            try {
                const response = await fetch(`${API_URL}/clientes/${id}`, { method: 'DELETE', headers: headers() });
                if (response.ok) fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    const filteredClientes = useMemo(() => {
        return clientes.filter(c => {
            const matchesSearch =
                c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (c.documento && c.documento.includes(searchTerm));
            const matchesEmpresa = empresaFilter === 'Todas' || c.empresa_id?.toString() === empresaFilter;
            return matchesSearch && matchesEmpresa;
        });
    }, [clientes, searchTerm, empresaFilter]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaUserFriends className="text-black" /> Gestão de Clientes
                </h1>
                {can('clientes', 'criar') && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-black hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                    >
                        <FaPlus /> Novo Cliente
                    </button>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar por nome ou CPF/CNPJ..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-gray-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                    value={empresaFilter}
                    onChange={(e) => setEmpresaFilter(e.target.value)}
                >
                    <option value="Todas">Todas as Empresas</option>
                    {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                </select>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4">Nome / Documento</th>
                            <th className="px-6 py-4">Empresa</th>
                            <th className="px-6 py-4">Exames Contratados</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredClientes.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                                    Nenhum cliente cadastrado.
                                </td>
                            </tr>
                        )}
                        {filteredClientes.map(c => (
                            <tr key={c.id} className="hover:bg-emerald-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="text-gray-800 font-semibold block">{c.nome}</span>
                                    {c.documento && (
                                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                            <FaFileInvoice className="text-gray-300" /> {c.documento}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {c.empresa_nome
                                        ? <span className="text-sm text-gray-600 flex items-center gap-2"><FaBuilding className="text-emerald-400" />{c.empresa_nome}</span>
                                        : <span className="text-sm text-gray-400 italic">Sem empresa</span>
                                    }
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm text-gray-600 flex items-center gap-2">
                                        <FaFlask className="text-purple-400 shrink-0" />
                                        <span className="truncate max-w-xs">{c.exames || '-'}</span>
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600 space-y-1">
                                        {c.email    && <div className="flex items-center gap-2"><FaEnvelope className="text-blue-400 text-xs" />{c.email}</div>}
                                        {c.telefone && <div className="flex items-center gap-2"><FaPhone className="text-gray-500 text-xs" />{c.telefone}</div>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {can('clientes', 'editar') && (
                                            <button onClick={() => handleOpenModal(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar"><FaEdit /></button>
                                        )}
                                        {can('clientes', 'excluir') && (
                                            <button onClick={() => handleDelete(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><FaTrashAlt /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-black text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaUserFriends /> {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
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
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Cliente *</label>
                                        <input type="text" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">CPF / CNPJ</label>
                                        <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={formData.documento} onChange={(e) => setFormData({ ...formData, documento: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><FaFlask className="text-purple-400" /> Exames Contratados</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: Hemograma, Raio-X, Ultrassom..."
                                            className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                            value={formData.exames}
                                            onChange={(e) => setFormData({ ...formData, exames: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Contato</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                                        <input type="email" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Telefone</label>
                                        <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                                    </div>
                                </div>

                                <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FaBuilding className="text-black" /> Vincular Empresa</label>
                                    <select
                                        className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={formData.empresa_id}
                                        onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}
                                    >
                                        <option value="">Selecione a Empresa (Opcional)</option>
                                        {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1"><FaInfoCircle /> Vincule o cliente a uma empresa para facilitar a filtragem.</p>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Observações</label>
                                    <textarea rows="3" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 resize-none" value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })} />
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                <button type="submit" className="px-10 py-3 bg-black hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all">{isEditing ? 'Salvar Alterações' : 'Criar Cliente'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clientes;
