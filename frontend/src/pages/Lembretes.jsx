import React, { useState, useEffect, useCallback } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaCheck, FaStickyNote, 
    FaCalendarAlt, FaFileContract, FaTimes, FaFilter
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const FILTROS = [
    { label: 'Todos', value: 'todos' },
    { label: 'Pendentes', value: 'pendentes' },
    { label: 'Concluídos', value: 'concluidos' },
    { label: 'Em atraso', value: 'atrasados' },
];

const Lembretes = () => {
    const { user, can } = useAuth();
    const [lembretes, setLembretes] = useState([]);
    const [contratos, setContratos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filtro, setFiltro] = useState('pendentes');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        titulo: '',
        descricao: '',
        data_lembrete: '',
        contrato_id: ''
    });

    const API_URL = '/api';
    const hoje = new Date().toISOString().split('T')[0];

    const headers = useCallback(() => {
        const h = { 'Content-Type': 'application/json' };
        if (user?.api_token) h['X-API-Token'] = user.api_token;
        return h;
    }, [user]);

    const fetchLembretes = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/lembretes`, { headers: headers() });
            if (res.ok) setLembretes(await res.json());
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    }, [headers]);

    const fetchContratos = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/contratos`, { headers: headers() });
            if (res.ok) setContratos(await res.json());
        } catch (err) {
            console.error(err);
        }
    }, [headers]);

    useEffect(() => {
        fetchLembretes();
        fetchContratos();
    }, [fetchLembretes, fetchContratos]);

    const resetForm = () => {
        setEditingId(null);
        setFormData({ titulo: '', descricao: '', data_lembrete: '', contrato_id: '' });
    };

    const handleEdit = (l) => {
        setEditingId(l.id);
        setFormData({
            titulo: l.titulo,
            descricao: l.descricao || '',
            data_lembrete: l.data_lembrete,
            contrato_id: l.contrato_id ? l.contrato_id.toString() : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const payload = {
            ...formData,
            contrato_id: formData.contrato_id ? parseInt(formData.contrato_id) : null
        };
        const method = editingId ? 'PUT' : 'POST';
        const url = editingId ? `${API_URL}/lembretes/${editingId}` : `${API_URL}/lembretes`;
        try {
            const res = await fetch(url, {
                method,
                headers: headers(),
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                resetForm();
                fetchLembretes();
            }
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleConcluir = async (l) => {
        try {
            await fetch(`${API_URL}/lembretes/${l.id}`, {
                method: 'PATCH',
                headers: headers(),
                body: JSON.stringify({ concluido: !l.concluido })
            });
            fetchLembretes();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir este lembrete?')) return;
        try {
            await fetch(`${API_URL}/lembretes/${id}`, { method: 'DELETE', headers: headers() });
            fetchLembretes();
        } catch (err) {
            console.error(err);
        }
    };

    const lembretesFiltrados = lembretes.filter(l => {
        if (filtro === 'pendentes') return !l.concluido;
        if (filtro === 'concluidos') return l.concluido;
        if (filtro === 'atrasados') return !l.concluido && l.data_lembrete < hoje;
        return true;
    });

    const totalAtrasados = lembretes.filter(l => !l.concluido && l.data_lembrete < hoje).length;
    const totalPendentes = lembretes.filter(l => !l.concluido).length;
    const totalConcluidos = lembretes.filter(l => l.concluido).length;

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-4">

            {/* Cabeçalho */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <FaStickyNote className="text-black" />
                        Meus Lembretes
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Apenas você vê estes lembretes</p>
                </div>
                {/* Contadores rápidos */}
                <div className="flex gap-3">
                    <div className="text-center px-4 py-2 bg--amber50 border border-amber-200 rounded-xl">
                        <p className="text-xl font-black text-amber-600">{totalPendentes}</p>
                        <p className="text-[10px] uppercase font-bold text-amber-500">Pendentes</p>
                    </div>
                    {totalAtrasados > 0 && (
                        <div className="text-center px-4 py-2 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-xl font-black text-red-600">{totalAtrasados}</p>
                            <p className="text-[10px] uppercase font-bold text-red-500">Atrasados</p>
                        </div>
                    )}
                    <div className="text-center px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-xl font-black text-green-600">{totalConcluidos}</p>
                        <p className="text-[10px] uppercase font-bold text-green-500">Concluídos</p>
                    </div>
                </div>
            </div>

            {/* Formulário */}
            <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${editingId ? 'border-amber-300' : 'border-slate-200'}`}>
                <div className={`px-6 py-4 border-b flex items-center gap-2 ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                    <FaEdit className={editingId ? 'text-amber-500' : 'text-slate-400'} />
                    <h2 className="font-bold text-slate-700">
                        {editingId ? 'Editando lembrete' : 'Novo Lembrete'}
                    </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Título */}
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Título *</label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: Renovar contrato, Ligar para fornecedor..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                                value={formData.titulo}
                                onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                            />
                        </div>

                        {/* Data */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Data do Lembrete *</label>
                            <input
                                required
                                type="date"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                                value={formData.data_lembrete}
                                onChange={e => setFormData({ ...formData, data_lembrete: e.target.value })}
                            />
                        </div>

                        {/* Contrato (opcional) */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                                Vincular a Contrato <span className="text-slate-300">(opcional)</span>
                            </label>
                            <select
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                                value={formData.contrato_id}
                                onChange={e => setFormData({ ...formData, contrato_id: e.target.value })}
                            >
                                <option value="">Nenhum contrato</option>
                                {contratos.map(c => (
                                    <option key={c.id} value={c.id.toString()}>
                                        #{c.numero} — {c.fornecedor_nome || 'Sem fornecedor'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Observação */}
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                                Observação <span className="text-slate-300">(opcional)</span>
                            </label>
                            <textarea
                                rows={2}
                                placeholder="Detalhes adicionais..."
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 text-sm resize-none"
                                value={formData.descricao}
                                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Botões */}
                    <div className="flex justify-end gap-2 mt-4">
                        {editingId && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all text-sm"
                            >
                                <FaTimes /> Cancelar
                            </button>
                        )}
                        {(can('lembretes','criar') || (editingId && can('lembretes','editar'))) && (
                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-white transition-all text-sm shadow ${
                                editingId ? 'bg-black hover:bg-black' : 'bg-black hover:bg-black'
                            } disabled:opacity-50`}
                        >
                            <FaPlus />
                            {loading ? '...' : editingId ? 'Salvar Alterações' : 'Adicionar Lembrete'}
                        </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
                {FILTROS.map(f => (
                    <button
                        key={f.value}
                        onClick={() => setFiltro(f.value)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all border ${
                            filtro === f.value
                                ? 'bg-black text-white border-black shadow'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-black'
                        }`}
                    >
                        {f.label}
                        {f.value === 'atrasados' && totalAtrasados > 0 && (
                            <span className="ml-1.5 bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[9px]">
                                {totalAtrasados}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista */}
            <div className="space-y-3">
                {loading && lembretesFiltrados.length === 0 && (
                    <p className="text-center text-slate-400 py-10 text-sm">Carregando...</p>
                )}
                {!loading && lembretesFiltrados.length === 0 && (
                    <div className="text-center py-16 text-slate-300">
                        <FaStickyNote size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="font-bold text-slate-400">Nenhum lembrete encontrado</p>
                        <p className="text-sm mt-1">
                            {filtro === 'pendentes' && 'Você não tem lembretes pendentes 🎉'}
                            {filtro === 'concluidos' && 'Nenhum lembrete concluído ainda'}
                            {filtro === 'atrasados' && 'Nenhum lembrete em atraso 👍'}
                            {filtro === 'todos' && 'Crie seu primeiro lembrete acima'}
                        </p>
                    </div>
                )}

                {lembretesFiltrados.map(l => {
                    const atrasado = !l.concluido && l.data_lembrete < hoje;
                    const eHoje = l.data_lembrete === hoje;

                    return (
                        <div
                            key={l.id}
                            className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${
                                l.concluido
                                    ? 'bg-slate-50 border-slate-100 opacity-60'
                                    : atrasado
                                    ? 'bg-red-50 border-red-200 shadow-sm'
                                    : eHoje
                                    ? 'bg-gray-50 border-amber-200 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-amber-200 hover:shadow-sm'
                            }`}
                        >
                            {/* Botão concluir */}
                            <button
                                onClick={() => handleConcluir(l)}
                                className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    l.concluido
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : atrasado
                                        ? 'border-red-300 hover:border-red-500 hover:bg-red-100'
                                        : 'border-slate-300 hover:border-amber-400 hover:bg-amber-50'
                                }`}
                                title={l.concluido ? 'Marcar como pendente' : 'Marcar como concluído'}
                            >
                                {l.concluido && <FaCheck size={10} />}
                            </button>

                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                                <p className={`font-bold text-sm ${
                                    l.concluido ? 'line-through text-slate-400' : atrasado ? 'text-red-800' : 'text-slate-800'
                                }`}>
                                    {l.titulo}
                                </p>
                                {l.descricao && (
                                    <p className="text-xs text-slate-500 mt-0.5">{l.descricao}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                    <span className={`text-xs font-medium flex items-center gap-1 ${
                                        atrasado ? 'text-red-500' : eHoje ? 'text-amber-600' : 'text-slate-400'
                                    }`}>
                                        <FaCalendarAlt size={10} />
                                        {new Date(l.data_lembrete + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        {atrasado && ' — ⚠️ Em atraso'}
                                        {eHoje && !l.concluido && ' — 🔔 Hoje!'}
                                    </span>
                                    {l.contrato_numero && (
                                        <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                                            <FaFileContract size={8} />
                                            Contrato #{l.contrato_numero}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="flex gap-1 shrink-0">
                                {!l.concluido && (
                                    <button
                                        onClick={() => handleEdit(l)}
                                        className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Editar"
                                    >
                                        <FaEdit size={13} />
                                    </button>
                                )}
                                {can('lembretes','excluir') && (
                                <button
                                    onClick={() => handleDelete(l.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Excluir"
                                >
                                    <FaTrashAlt size={13} />
                                </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Lembretes;
