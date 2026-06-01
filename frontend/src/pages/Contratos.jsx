import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaFileContract, FaBuilding,
    FaUserTie, FaCalendarAlt, FaDollarSign, FaTimes, FaPaperclip,
    FaInfoCircle, FaBell, FaDownload, FaMapMarkerAlt, FaCheck, FaStickyNote,
    FaHandshake, FaUserFriends, FaTable
} from 'react-icons/fa';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

const ITEM_VAZIO = { descricao: '', quantidade: 1, valor_unitario: '' };

const Contratos = () => {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [contratos, setContratos] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [clientes, setClientes] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    const [fornecedorFilter, setFornecedorFilter] = useState('Todos');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentContract, setCurrentContract] = useState(null);
    const [uploading, setUploading] = useState(false);

    // ── Modal de Lembretes ──
    const [isLembreteModalOpen, setIsLembreteModalOpen] = useState(false);
    const [lembreteContratoId, setLembreteContratoId] = useState(null);
    const [lembreteContratoNumero, setLembreteContratoNumero] = useState('');
    const [lembretes, setLembretes] = useState([]);
    const [lembreteForm, setLembreteForm] = useState({ titulo: '', descricao: '', data_lembrete: '' });
    const [lembreteEditingId, setLembreteEditingId] = useState(null);
    const [lembreteLoading, setLembreteLoading] = useState(false);

    const [formData, setFormData] = useState({
        numero: '', fornecedor_id: '', localizacao_id: '', empresa_id: '',
        data_inicio: '', data_fim: '', valor: '', is_mensal: false,
        observacao: '', anexos: [], dias_aviso_vencimento: 30,
        is_prestacao_servico: false, cliente_id: '', itens: [{ ...ITEM_VAZIO }]
    });

    const BACKEND_URL = 'http://192.168.2.71:5002';
    const API_URL = '/api';
    const headers = useCallback(() => {
        const h = {};
        if (user?.api_token) h['X-API-Token'] = user.api_token;
        return h;
    }, [user]);

    const fetchData = useCallback(async () => {
        try {
            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';
            const [c, f, l, e, cl] = await Promise.all([
                fetch(`${API_URL}/contratos${queryParams}`, { headers: headers() }),
                fetch(`${API_URL}/fornecedores${queryParams}`, { headers: headers() }),
                fetch(`${API_URL}/localizacoes${queryParams}`, { headers: headers() }),
                fetch(`${API_URL}/empresas`, { headers: headers() }),
                fetch(`${API_URL}/clientes`, { headers: headers() }),
            ]);
            if (c.ok) setContratos(await c.json());
            if (f.ok) setFornecedores(await f.json());
            if (l.ok) setLocalizacoes(await l.json());
            if (e.ok) setEmpresas(await e.json());
            if (cl.ok) setClientes(await cl.json());
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, [selectedEntity, headers]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Cálculo total dos itens ────────────────────────────────────────────────
    const totalItens = useMemo(() => {
        return formData.itens.reduce((sum, item) => {
            const qtd = parseFloat(item.quantidade) || 0;
            const vunit = parseFloat(item.valor_unitario) || 0;
            return sum + qtd * vunit;
        }, 0);
    }, [formData.itens]);

    const handleItemChange = (index, field, value) => {
        const novosItens = formData.itens.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        );
        setFormData({ ...formData, itens: novosItens });
    };

    const addItem = () => setFormData({ ...formData, itens: [...formData.itens, { ...ITEM_VAZIO }] });

    const removeItem = (index) => {
        if (formData.itens.length === 1) return;
        setFormData({ ...formData, itens: formData.itens.filter((_, i) => i !== index) });
    };

    // ── Funções de Contrato ────────────────────────────────────────────────────
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
                dias_aviso_vencimento: contrato.dias_aviso_vencimento || 30,
                is_prestacao_servico: contrato.is_prestacao_servico || false,
                cliente_id: contrato.cliente_id?.toString() || '',
                itens: contrato.itens?.length ? contrato.itens : [{ ...ITEM_VAZIO }]
            });
        } else {
            setIsEditing(false);
            setCurrentContract(null);
            setFormData({
                numero: '', fornecedor_id: '', localizacao_id: '', empresa_id: '',
                data_inicio: '', data_fim: '', valor: '', is_mensal: false,
                observacao: '', anexos: [], dias_aviso_vencimento: 30,
                is_prestacao_servico: false, cliente_id: '', itens: [{ ...ITEM_VAZIO }]
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
        const valorFinal = formData.is_prestacao_servico ? totalItens : parseFloat(formData.valor);
        const payload = {
            ...formData,
            valor: valorFinal,
            fornecedor_id: parseInt(formData.fornecedor_id),
            localizacao_id: formData.localizacao_id ? parseInt(formData.localizacao_id) : null,
            empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
            cliente_id: formData.is_prestacao_servico && formData.cliente_id ? parseInt(formData.cliente_id) : null,
            dias_aviso_vencimento: parseInt(formData.dias_aviso_vencimento),
            itens: formData.is_prestacao_servico ? formData.itens : []
        };
        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/contratos/${currentContract.id}` : `${API_URL}/contratos`;
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...headers() },
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
                const response = await fetch(`${API_URL}/contratos/${id}`, { method: 'DELETE', headers: headers() });
                if (response.ok) fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    // ── Funções de Lembrete ────────────────────────────────────────────────────
    const fetchLembretes = useCallback(async (contratoId) => {
        setLembreteLoading(true);
        try {
            const res = await fetch(`${API_URL}/lembretes?contrato_id=${contratoId}`, { headers: headers() });
            if (res.ok) setLembretes(await res.json());
        } catch (err) { console.error(err); }
        setLembreteLoading(false);
    }, [headers]);

    const handleOpenLembretes = (contrato) => {
        setLembreteContratoId(contrato.id);
        setLembreteContratoNumero(contrato.numero);
        setLembreteEditingId(null);
        setLembreteForm({ titulo: '', descricao: '', data_lembrete: '' });
        fetchLembretes(contrato.id);
        setIsLembreteModalOpen(true);
    };

    const handleLembreteSubmit = async (e) => {
        e.preventDefault();
        setLembreteLoading(true);
        const payload = { ...lembreteForm, contrato_id: lembreteContratoId };
        const method = lembreteEditingId ? 'PUT' : 'POST';
        const url = lembreteEditingId ? `${API_URL}/lembretes/${lembreteEditingId}` : `${API_URL}/lembretes`;
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...headers() },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setLembreteForm({ titulo: '', descricao: '', data_lembrete: '' });
                setLembreteEditingId(null);
                fetchLembretes(lembreteContratoId);
            }
        } catch (err) { console.error(err); }
        setLembreteLoading(false);
    };

    const handleLembreteConcluir = async (lembrete) => {
        try {
            await fetch(`${API_URL}/lembretes/${lembrete.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...headers() },
                body: JSON.stringify({ concluido: !lembrete.concluido })
            });
            fetchLembretes(lembreteContratoId);
        } catch (err) { console.error(err); }
    };

    const handleLembreteEdit = (lembrete) => {
        setLembreteEditingId(lembrete.id);
        setLembreteForm({ titulo: lembrete.titulo, descricao: lembrete.descricao || '', data_lembrete: lembrete.data_lembrete });
    };

    const handleLembreteDelete = async (id) => {
        if (!window.confirm('Excluir este lembrete?')) return;
        try {
            await fetch(`${API_URL}/lembretes/${id}`, { method: 'DELETE', headers: headers() });
            fetchLembretes(lembreteContratoId);
        } catch (err) { console.error(err); }
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
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
        const diffDays = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        return diffDays <= daysNotice;
    };

    const hoje = new Date().toISOString().split('T')[0];

    // ── Render ─────────────────────────────────────────────────────────────────
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

            {/* Filtros */}
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
                <select className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={empresaFilter} onChange={(e) => setEmpresaFilter(e.target.value)}>
                    <option value="Todas">Todas as Empresas</option>
                    {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                </select>
                <select className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={fornecedorFilter} onChange={(e) => setFornecedorFilter(e.target.value)}>
                    <option value="Todos">Todos os Fornecedores</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                </select>
            </div>

            {/* Tabela */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4">Número / Empresa</th>
                            <th className="px-6 py-4">Fornecedor / Cliente</th>
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
                                        <span className="text-gray-800 font-semibold flex items-center gap-2">
                                            {c.numero}
                                            {nearExp && <FaBell className="text-red-500 animate-pulse" title="Vencimento Próximo" />}
                                            {c.is_prestacao_servico && (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <FaHandshake size={9} /> P.Serviço
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                            <FaBuilding className="text-gray-300" /> {c.empresa_nome || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-600 flex items-center gap-2">
                                            <FaUserTie className="text-indigo-400" /> {c.fornecedor_nome}
                                        </span>
                                        {c.is_prestacao_servico && c.cliente_nome && (
                                            <span className="text-xs text-emerald-600 flex items-center gap-1 mt-1">
                                                <FaUserFriends size={10} /> {c.cliente_nome}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm font-medium flex items-center gap-2 ${nearExp ? 'text-red-600' : 'text-gray-600'}`}>
                                            <FaCalendarAlt /> {new Date(c.data_fim).toLocaleDateString('pt-BR')}
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
                                            <button onClick={() => handleOpenLembretes(c)} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg" title="Lembretes">
                                                <FaStickyNote />
                                            </button>
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

            {/* ── Modal Contrato ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaFileContract /> {isEditing ? 'Editar Contrato' : 'Novo Contrato'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">

                            {/* Toggle Prestação de Serviço */}
                            <div className="mb-6 p-4 rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaHandshake className="text-emerald-500 text-xl" />
                                    <div>
                                        <p className="font-bold text-emerald-800 text-sm">Modo Prestação de Serviço</p>
                                        <p className="text-xs text-emerald-600">Ativa campo de cliente e tabela de serviços/valores</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.is_prestacao_servico}
                                        onChange={(e) => setFormData({ ...formData, is_prestacao_servico: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Coluna Esquerda - Identificação */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Identificação</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Número do Contrato *</label>
                                        <input type="text" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.numero} onChange={(e) => setFormData({ ...formData, numero: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Empresa *</label>
                                        <select required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.empresa_id} onChange={(e) => setFormData({ ...formData, empresa_id: e.target.value })}>
                                            <option value="">Selecione a Empresa</option>
                                            {empresas.map(e => <option key={e.id} value={e.id.toString()}>{e.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Fornecedor *</label>
                                        <select required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.fornecedor_id} onChange={(e) => setFormData({ ...formData, fornecedor_id: e.target.value })}>
                                            <option value="">Selecione o Fornecedor</option>
                                            {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                                        </select>
                                    </div>

                                    {/* Campo Cliente - só aparece no modo prestação */}
                                    {formData.is_prestacao_servico && (
                                        <div className="animate-in slide-in-from-top-2 duration-200">
                                            <label className="block text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">
                                                <FaUserFriends /> Cliente *
                                            </label>
                                            <select
                                                required={formData.is_prestacao_servico}
                                                className="w-full p-2 border-2 border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50"
                                                value={formData.cliente_id}
                                                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                                            >
                                                <option value="">Selecione o Cliente</option>
                                                {clientes.map(cl => <option key={cl.id} value={cl.id.toString()}>{cl.nome}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Localização</label>
                                        <select className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.localizacao_id} onChange={(e) => setFormData({ ...formData, localizacao_id: e.target.value })}>
                                            <option value="">Selecione a Localização</option>
                                            {localizacoes.map(l => <option key={l.id} value={l.id.toString()}>{l.nome}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Coluna Direita - Vigência e Valores */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Vigência e Valores</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Data Início *</label>
                                            <input type="date" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.data_inicio} onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Data Fim *</label>
                                            <input type="date" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.data_fim} onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Valor simples - só quando NÃO é prestação */}
                                    {!formData.is_prestacao_servico && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Valor R$ *</label>
                                                <input type="number" step="0.01" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Aviso Vencimento (Dias)</label>
                                                <input type="number" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.dias_aviso_vencimento} onChange={(e) => setFormData({ ...formData, dias_aviso_vencimento: e.target.value })} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Aviso vencimento quando é prestação */}
                                    {formData.is_prestacao_servico && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1">Aviso Vencimento (Dias)</label>
                                            <input type="number" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.dias_aviso_vencimento} onChange={(e) => setFormData({ ...formData, dias_aviso_vencimento: e.target.value })} />
                                        </div>
                                    )}

                                    {!formData.is_prestacao_servico && (
                                        <div className="flex items-center gap-2 py-2">
                                            <input type="checkbox" id="is_mensal" className="w-4 h-4 text-indigo-600" checked={formData.is_mensal} onChange={(e) => setFormData({ ...formData, is_mensal: e.target.checked })} />
                                            <label htmlFor="is_mensal" className="text-sm font-bold text-gray-700">Valor é Mensal?</label>
                                        </div>
                                    )}
                                </div>

                                {/* Tabela de Itens - só no modo prestação */}
                                {formData.is_prestacao_servico && (
                                    <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                                        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                                                    <FaTable className="text-emerald-600" /> Tabela de Serviços / Itens
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={addItem}
                                                    className="text-xs px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 transition-all"
                                                >
                                                    <FaPlus size={10} /> Adicionar Item
                                                </button>
                                            </div>

                                            {/* Cabeçalho da tabela */}
                                            <div className="grid grid-cols-12 gap-2 mb-2 px-2">
                                                <div className="col-span-6 text-xs font-bold text-emerald-700 uppercase">Descrição do Serviço</div>
                                                <div className="col-span-2 text-xs font-bold text-emerald-700 uppercase text-center">Qtd</div>
                                                <div className="col-span-2 text-xs font-bold text-emerald-700 uppercase text-right">Valor Unit.</div>
                                                <div className="col-span-1 text-xs font-bold text-emerald-700 uppercase text-right">Total</div>
                                                <div className="col-span-1"></div>
                                            </div>

                                            {/* Linhas de itens */}
                                            <div className="space-y-2">
                                                {formData.itens.map((item, index) => {
                                                    const subtotal = (parseFloat(item.quantidade) || 0) * (parseFloat(item.valor_unitario) || 0);
                                                    return (
                                                        <div key={index} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-emerald-100">
                                                            <div className="col-span-6">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Ex: Manutenção mensal, Suporte técnico..."
                                                                    required={formData.is_prestacao_servico}
                                                                    className="w-full p-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                                                                    value={item.descricao}
                                                                    onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    step="1"
                                                                    required={formData.is_prestacao_servico}
                                                                    className="w-full p-1.5 border border-gray-200 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-emerald-400"
                                                                    value={item.quantidade}
                                                                    onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    placeholder="0,00"
                                                                    required={formData.is_prestacao_servico}
                                                                    className="w-full p-1.5 border border-gray-200 rounded-lg text-sm text-right outline-none focus:ring-2 focus:ring-emerald-400"
                                                                    value={item.valor_unitario}
                                                                    onChange={(e) => handleItemChange(index, 'valor_unitario', e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="col-span-1 text-right">
                                                                <span className="text-sm font-bold text-emerald-700">
                                                                    {subtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeItem(index)}
                                                                    disabled={formData.itens.length === 1}
                                                                    className="p-1 text-red-400 hover:text-red-600 disabled:opacity-20 disabled:cursor-not-allowed"
                                                                >
                                                                    <FaTimes size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Total */}
                                            <div className="mt-4 pt-3 border-t-2 border-emerald-300 flex justify-end items-center gap-3">
                                                <span className="text-sm font-bold text-emerald-700 uppercase tracking-wide">Total do Contrato:</span>
                                                <span className="text-xl font-black text-emerald-800">
                                                    R$ {totalItens.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Observações */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Observações</label>
                                    <textarea rows="3" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none" value={formData.observacao} onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}></textarea>
                                </div>

                                {/* Anexos */}
                                <div className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-100">
                                    <label className="block text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><FaPaperclip className="text-indigo-600" /> Documentos / Anexos</label>
                                    <input type="file" multiple onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" disabled={uploading} />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                        {formData.anexos.map((file, i) => (
                                            <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between shadow-sm">
                                                <a href={`${BACKEND_URL}${file.path}`} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 font-medium truncate flex items-center gap-2 hover:underline">
                                                    <FaDownload className="text-gray-400" /> {file.name}
                                                </a>
                                                <button type="button" onClick={() => setFormData({ ...formData, anexos: formData.anexos.filter((_, idx) => idx !== i) })} className="text-red-400 hover:text-red-600 p-1"><FaTimes /></button>
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

            {/* ── Modal Lembretes ── */}
            {isLembreteModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-amber-500 text-white">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FaStickyNote /> Lembretes — Contrato #{lembreteContratoNumero}
                            </h2>
                            <button onClick={() => setIsLembreteModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <form onSubmit={handleLembreteSubmit} className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
                                <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide">
                                    {lembreteEditingId ? '✏️ Editando lembrete' : '+ Novo Lembrete'}
                                </h3>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Título *</label>
                                    <input required type="text" placeholder="Ex: Renovar contrato, Enviar documentação..." className="w-full p-2 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 bg-white text-sm" value={lembreteForm.titulo} onChange={e => setLembreteForm({ ...lembreteForm, titulo: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Data do Lembrete *</label>
                                        <input required type="date" min={hoje} className="w-full p-2 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 bg-white text-sm" value={lembreteForm.data_lembrete} onChange={e => setLembreteForm({ ...lembreteForm, data_lembrete: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Observação</label>
                                        <input type="text" placeholder="Opcional..." className="w-full p-2 border border-amber-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 bg-white text-sm" value={lembreteForm.descricao} onChange={e => setLembreteForm({ ...lembreteForm, descricao: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    {lembreteEditingId && (
                                        <button type="button" onClick={() => { setLembreteEditingId(null); setLembreteForm({ titulo: '', descricao: '', data_lembrete: '' }); }} className="px-4 py-2 text-sm rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">Cancelar</button>
                                    )}
                                    <button type="submit" disabled={lembreteLoading} className="px-5 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow transition-all disabled:opacity-50">
                                        {lembreteLoading ? '...' : lembreteEditingId ? 'Salvar' : 'Adicionar'}
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-2">
                                {lembretes.length === 0 && (
                                    <p className="text-center text-gray-400 text-sm py-6">Nenhum lembrete cadastrado para este contrato.</p>
                                )}
                                {lembretes.map(l => {
                                    const vencido = !l.concluido && l.data_lembrete < hoje;
                                    return (
                                        <div key={l.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${l.concluido ? 'bg-gray-50 border-gray-100 opacity-60' : vencido ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 hover:border-amber-200'}`}>
                                            <button onClick={() => handleLembreteConcluir(l)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${l.concluido ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`} title={l.concluido ? 'Marcar como pendente' : 'Marcar como concluído'}>
                                                {l.concluido && <FaCheck size={10} />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-bold text-sm ${l.concluido ? 'line-through text-gray-400' : vencido ? 'text-red-700' : 'text-gray-800'}`}>{l.titulo}</p>
                                                {l.descricao && <p className="text-xs text-gray-500 mt-0.5">{l.descricao}</p>}
                                                <p className={`text-xs mt-1 font-medium flex items-center gap-1 ${vencido ? 'text-red-500' : 'text-gray-400'}`}>
                                                    <FaCalendarAlt size={10} />
                                                    {new Date(l.data_lembrete + 'T00:00:00').toLocaleDateString('pt-BR')}
                                                    {vencido && ' — ⚠️ Vencido'}
                                                </p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                {!l.concluido && (
                                                    <button onClick={() => handleLembreteEdit(l)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar"><FaEdit size={12} /></button>
                                                )}
                                                <button onClick={() => handleLembreteDelete(l.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Excluir"><FaTrashAlt size={12} /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contratos;
