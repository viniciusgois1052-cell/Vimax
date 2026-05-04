import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Edit2, FileText, X, Copy, ArrowRightLeft, Search, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';

export default function FormularioChamadoAdmin() {
    const { user } = useAuth();
    const [formularios, setFormularios] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [ativos, setAtivos] = useState([]);
    const [infraestruturas, setInfraestruturas] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentFormId, setCurrentFormId] = useState(null);

    // ── Seleção múltipla ───────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    // ── Filtros ────────────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEmpresa, setFilterEmpresa] = useState('');
    const [filterTipo, setFilterTipo] = useState('');
    const [filterVinculo, setFilterVinculo] = useState('');

    // ── Modal duplicar ─────────────────────────────────────────────────────────
    const [isDupModalOpen, setIsDupModalOpen] = useState(false);
    const [dupQuantidade, setDupQuantidade] = useState(1);
    const [dupTargetIds, setDupTargetIds] = useState([]);

    // ── Modal transferir ───────────────────────────────────────────────────────
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [transTargetIds, setTransTargetIds] = useState([]);
    const [transEmpresaId, setTransEmpresaId] = useState('');

    const [formData, setFormData] = useState({
        nome: '', tipo: 'maquinario', empresa_id: '',
        localizacao_id: '',
        ativo_id: '', infraestrutura_id: '', opcoes: []
    });
    const [novaOpcao, setNovaOpcao] = useState('');

    const API_BASE = window.location.origin.includes('5173')
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;
    const API_PREFIX = `${API_BASE}/api`;

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) headers['X-API-Token'] = user.api_token;
            const [resForm, resEmp, resAtivos, resInfras, resLoc] = await Promise.all([
                fetch(`${API_PREFIX}/formularios-chamado/`, { headers }),
                fetch(`${API_PREFIX}/empresas/`, { headers }),
                fetch(`${API_PREFIX}/ativos/`, { headers }),
                fetch(`${API_PREFIX}/infraestruturas/`, { headers }),
                fetch(`${API_PREFIX}/localizacoes/`, { headers })
            ]);
            if (resForm.ok) setFormularios(await resForm.json());
            if (resEmp.ok) setEmpresas(await resEmp.json());
            if (resAtivos.ok) { const d = await resAtivos.json(); setAtivos(Array.isArray(d) ? d : []); }
            if (resInfras.ok) { const d = await resInfras.json(); setInfraestruturas(Array.isArray(d.infraestruturas) ? d.infraestruturas : (Array.isArray(d) ? d : [])); }
            if (resLoc.ok) { const d = await resLoc.json(); setLocalizacoes(Array.isArray(d) ? d : []); }
            setSelectedIds([]);
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, [user, API_PREFIX]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Vínculos disponíveis no filtro ─────────────────────────────────────────
    const vinculosDisponiveis = useMemo(() => {
        if (!filterEmpresa) return [];
        if (filterTipo === 'maquinario') return ativos.filter(a => a.empresa_id?.toString() === filterEmpresa).map(a => ({ id: a.id, nome: a.nome }));
        if (filterTipo === 'infraestrutura') return infraestruturas.filter(i => i.empresa_id?.toString() === filterEmpresa).map(i => ({ id: i.id, nome: i.nome }));
        return [];
    }, [filterEmpresa, filterTipo, ativos, infraestruturas]);

    useEffect(() => { setFilterVinculo(''); }, [filterEmpresa, filterTipo]);

    // ── Formulários filtrados ──────────────────────────────────────────────────
    const filteredFormularios = useMemo(() => formularios.filter(f => {
        const matchSearch = !searchTerm || f.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchEmpresa = !filterEmpresa || f.empresa_id?.toString() === filterEmpresa;
        const matchTipo = !filterTipo || f.tipo === filterTipo;
        const matchVinculo = !filterVinculo || (filterTipo === 'maquinario' ? f.ativo_id?.toString() === filterVinculo : f.infraestrutura_id?.toString() === filterVinculo);
        return matchSearch && matchEmpresa && matchTipo && matchVinculo;
    }), [formularios, searchTerm, filterEmpresa, filterTipo, filterVinculo]);

    const allSelected = filteredFormularios.length > 0 && selectedIds.length === filteredFormularios.length;
    const someSelected = selectedIds.length > 0;
    const empresaDestinoNome = empresas.find(e => e.id.toString() === transEmpresaId)?.nome || '';
    const labelVinculo = filterTipo === 'maquinario' ? 'Maquinário' : filterTipo === 'infraestrutura' ? 'Infraestrutura' : '';

    // ── Seleção ────────────────────────────────────────────────────────────────
    const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredFormularios.length) setSelectedIds([]);
        else setSelectedIds(filteredFormularios.map(f => f.id));
    };
    const clearSelection = () => { setSelectedIds([]); setIsBulkMenuOpen(false); };

    // ── Ações em lote ──────────────────────────────────────────────────────────
    const handleBulkDelete = async () => {
        if (!window.confirm(`Excluir ${selectedIds.length} formulário(s)?`)) return;
        setBulkLoading(true);
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        for (const id of selectedIds) {
            try { await fetch(`${API_PREFIX}/formularios-chamado/${id}`, { method: 'DELETE', headers }); }
            catch (e) { console.error(e); }
        }
        setBulkLoading(false);
        setIsBulkMenuOpen(false);
        fetchData();
    };

    // ── Duplicar ───────────────────────────────────────────────────────────────
    const abrirModalDuplicar = (ids) => { setDupTargetIds(ids); setDupQuantidade(1); setIsDupModalOpen(true); setIsBulkMenuOpen(false); };

    const executarDuplicar = async () => {
        setIsDupModalOpen(false);
        setBulkLoading(true);
        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        for (const id of dupTargetIds) {
            const original = formularios.find(f => f.id === id);
            if (!original) continue;
            for (let n = 1; n <= dupQuantidade; n++) {
                const payload = {
                    nome: dupQuantidade > 1 ? `${original.nome} (cópia ${n})` : `${original.nome} (cópia)`,
                    tipo: original.tipo, empresa_id: original.empresa_id,
                    ativo_id: original.ativo_id || null,
                    infraestrutura_id: original.infraestrutura_id || null,
                    opcoes: original.opcoes || []
                };
                try { await fetch(`${API_PREFIX}/formularios-chamado`, { method: 'POST', headers, body: JSON.stringify(payload) }); }
                catch (e) { console.error(e); }
            }
        }
        setBulkLoading(false);
        setDupTargetIds([]);
        setSelectedIds([]);
        fetchData();
    };

    // ── Transferir ─────────────────────────────────────────────────────────────
    const abrirModalTransferir = (ids) => { setTransTargetIds(ids); setTransEmpresaId(''); setIsTransModalOpen(true); setIsBulkMenuOpen(false); };

    const executarTransferir = async () => {
        if (!transEmpresaId) return;
        setIsTransModalOpen(false);
        setBulkLoading(true);
        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        for (const id of transTargetIds) {
            const original = formularios.find(f => f.id === id);
            if (!original) continue;
            const payload = {
                nome: original.nome, tipo: original.tipo,
                empresa_id: parseInt(transEmpresaId),
                ativo_id: null, infraestrutura_id: null,
                opcoes: original.opcoes || []
            };
            try { await fetch(`${API_PREFIX}/formularios-chamado/${id}`, { method: 'PUT', headers, body: JSON.stringify(payload) }); }
            catch (e) { console.error(e); }
        }
        setBulkLoading(false);
        setTransTargetIds([]);
        setSelectedIds([]);
        fetchData();
    };

    // ── CRUD ───────────────────────────────────────────────────────────────────
    const handleOpenModal = (form = null) => {
        if (form) {
            setIsEditing(true); setCurrentFormId(form.id);
            setFormData({
                nome: form.nome, tipo: form.tipo,
                empresa_id: form.empresa_id.toString(),
                  localizacao_id: form.localizacao_id ? form.localizacao_id.toString() : '',
                ativo_id: form.ativo_id ? form.ativo_id.toString() : '',
                infraestrutura_id: form.infraestrutura_id ? form.infraestrutura_id.toString() : '',
                opcoes: form.opcoes || []
            });
        } else {
            setIsEditing(false); setCurrentFormId(null);
            setFormData({ nome: '', tipo: 'maquinario', empresa_id: '', localizacao_id: '', ativo_id: '', infraestrutura_id: '', opcoes: [] });
        }
        setNovaOpcao('');
        setIsModalOpen(true);
    };

    const handleAddOpcao = () => {
        if (novaOpcao.trim()) { setFormData({ ...formData, opcoes: [...formData.opcoes, novaOpcao.trim()] }); setNovaOpcao(''); }
    };
    const handleRemoveOpcao = (idx) => setFormData({ ...formData, opcoes: formData.opcoes.filter((_, i) => i !== idx) });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.tipo === 'maquinario' && !formData.ativo_id) { alert('Selecione um Ativo'); return; }
        if (formData.tipo === 'infraestrutura' && !formData.infraestrutura_id) { alert('Selecione uma Infraestrutura'); return; }
        const payload = {
            nome: formData.nome, tipo: formData.tipo,
            empresa_id: parseInt(formData.empresa_id),
              localizacao_id: formData.localizacao_id ? parseInt(formData.localizacao_id) : null,
            ativo_id: formData.tipo === 'maquinario' && formData.ativo_id ? parseInt(formData.ativo_id) : null,
            infraestrutura_id: formData.tipo === 'infraestrutura' && formData.infraestrutura_id ? parseInt(formData.infraestrutura_id) : null,
            opcoes: formData.opcoes
        };
        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        const url = isEditing ? `${API_PREFIX}/formularios-chamado/${currentFormId}` : `${API_PREFIX}/formularios-chamado`;
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (res.ok) { setIsModalOpen(false); fetchData(); }
            else alert('Erro ao salvar formulário');
        } catch (error) { console.error("Erro ao salvar:", error); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir este formulário?')) return;
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        try {
            const res = await fetch(`${API_PREFIX}/formularios-chamado/${id}`, { method: 'DELETE', headers });
            if (res.ok) fetchData();
        } catch (error) { console.error("Erro ao excluir:", error); }
    };

    const renderHierarchicalOptions = (items, parentId = null, level = 0) => {
        return items.filter(item => item.parent_id === parentId).map(item => (
            <React.Fragment key={item.id}>
                <option value={item.id.toString()}>{'\u00A0'.repeat(level * 4)}{level > 0 ? '↳ ' : ''}{item.nome}</option>
                {renderHierarchicalOptions(items, item.id, level + 1)}
            </React.Fragment>
        ));
    };

    const ativosFiltered = formData.empresa_id ? ativos.filter(a => a.empresa_id.toString() === formData.empresa_id) : [];
    const infrasFiltered = formData.empresa_id ? infraestruturas.filter(i => i.empresa_id.toString() === formData.empresa_id) : [];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">

            {/* ── Header ── */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-blue-600" /> Formulários de Chamado
                </h1>
                <button onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                    <Plus size={20} /> Novo Formulário
                </button>
            </div>

            {/* ── Filtros ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" placeholder="Buscar por nome..."
                            className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <select className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)}>
                        <option value="">Todas as Clínicas</option>
                        {renderHierarchicalOptions(empresas)}
                    </select>
                    <select className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                        <option value="">Todos os Tipos</option>
                        <option value="maquinario">🔧 Maquinário</option>
                        <option value="infraestrutura">🏗️ Infraestrutura</option>
                    </select>
                    {filterEmpresa && filterTipo && (
                        <select className="p-2 border-2 border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-blue-50"
                            value={filterVinculo} onChange={e => setFilterVinculo(e.target.value)}>
                            <option value="">Todos os {labelVinculo}s</option>
                            {vinculosDisponiveis.map(v => <option key={v.id} value={v.id.toString()}>{v.nome}</option>)}
                        </select>
                    )}
                </div>
                {(searchTerm || filterEmpresa || filterTipo || filterVinculo) && (
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400 flex items-center">Filtros ativos:</span>
                        {searchTerm && <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">"{searchTerm}" <button onClick={() => setSearchTerm('')}><X size={12} /></button></span>}
                        {filterEmpresa && <span className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">🏢 {empresas.find(e => e.id.toString() === filterEmpresa)?.nome} <button onClick={() => setFilterEmpresa('')}><X size={12} /></button></span>}
                        {filterTipo && <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">{filterTipo === 'maquinario' ? '🔧 Maquinário' : '🏗️ Infraestrutura'} <button onClick={() => setFilterTipo('')}><X size={12} /></button></span>}
                        {filterVinculo && <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{vinculosDisponiveis.find(v => v.id.toString() === filterVinculo)?.nome} <button onClick={() => setFilterVinculo('')}><X size={12} /></button></span>}
                        <button onClick={() => { setSearchTerm(''); setFilterEmpresa(''); setFilterTipo(''); setFilterVinculo(''); }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium underline ml-1">Limpar tudo</button>
                    </div>
                )}
            </div>

            {/* ── Barra de seleção em lote ── */}
            <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${someSelected ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200'}`}>
                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors">
                    {allSelected
                        ? <CheckSquare size={20} className="text-blue-600" />
                        : someSelected
                            ? <CheckSquare size={20} className="text-blue-400" />
                            : <Square size={20} className="text-gray-400" />}
                    {someSelected ? `${selectedIds.length} selecionado(s)` : 'Selecionar todos'}
                </button>

                {someSelected && (
                    <>
                        <span className="text-gray-300">|</span>

                        <div className="relative">
                            <button onClick={() => setIsBulkMenuOpen(o => !o)}
                                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all">
                                Ações em lote <ChevronDown size={14} />
                            </button>
                            {isBulkMenuOpen && (
                                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[210px] overflow-hidden">
                                    <button onClick={() => abrirModalDuplicar(selectedIds)} disabled={bulkLoading}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                                        <Copy size={15} /> Duplicar selecionados
                                    </button>
                                    <button onClick={() => abrirModalTransferir(selectedIds)}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-violet-700 hover:bg-violet-50 transition-colors">
                                        <ArrowRightLeft size={15} /> Transferir selecionados
                                    </button>
                                    <div className="border-t border-gray-100" />
                                    <button onClick={handleBulkDelete} disabled={bulkLoading}
                                        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                                        <Trash2 size={15} /> Excluir selecionados
                                    </button>
                                </div>
                            )}
                        </div>

                        <button onClick={clearSelection} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto">
                            <X size={14} /> Limpar seleção
                        </button>
                    </>
                )}

                {!someSelected && (
                    <span className="text-xs text-gray-400 ml-2">{filteredFormularios.length} formulário(s) encontrado(s)</span>
                )}
            </div>

            {/* ── Grid de Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFormularios.map(form => {
                    const isSelected = selectedIds.includes(form.id);
                    return (
                        <Card key={form.id}
                            className={`transition-all border-2 group ${isSelected ? 'border-blue-400 shadow-md ring-2 ring-blue-200' : 'border-gray-200 hover:shadow-md'}`}>
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                        <button onClick={() => toggleSelect(form.id)} className="mt-0.5 shrink-0">
                                            {isSelected
                                                ? <CheckSquare size={18} className="text-blue-600" />
                                                : <Square size={18} className="text-gray-300 hover:text-blue-400" />}
                                        </button>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-800 text-base truncate">{form.nome}</h3>
                                            <p className="text-xs text-gray-500 uppercase font-bold mt-0.5">
                                                {form.tipo === 'maquinario' ? '🔧 Maquinário' : '🏗️ Infraestrutura'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0 ml-1">
                                        <button onClick={() => abrirModalDuplicar([form.id])}
                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Duplicar">
                                            <Copy size={15} />
                                        </button>
                                        <button onClick={() => abrirModalTransferir([form.id])}
                                            className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-md transition-colors" title="Transferir">
                                            <ArrowRightLeft size={15} />
                                        </button>
                                        <button onClick={() => handleOpenModal(form)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                                            <Edit2 size={15} />
                                        </button>
                                        <button onClick={() => handleDelete(form.id)}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mb-1 pl-6">{form.empresa_nome}</p>
                                <p className="text-sm text-gray-600 mb-3 pl-6">
                                    {form.tipo === 'maquinario'
                                        ? `🔧 ${form.ativo_nome || 'Ativo não especificado'}`
                                        : `🏗️ ${form.infraestrutura_nome || 'Infraestrutura não especificada'}`}
                                </p>

                                <div className="pl-6 space-y-1">
                                    <p className="text-xs font-bold text-gray-500">Problemas:</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {form.opcoes.map((op, idx) => (
                                            <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{op}</span>
                                        ))}
                                    </div>
                                </div>

                                {isSelected && (
                                    <div className="mt-3 pt-2 border-t border-blue-100">
                                        <span className="text-xs text-blue-500 font-bold">✓ Selecionado</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
                {filteredFormularios.length === 0 && (
                    <div className="col-span-3 text-center py-16 text-gray-400 text-sm">
                        <FileText size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-medium">Nenhum formulário encontrado</p>
                        <p className="text-xs mt-1">Tente ajustar os filtros acima</p>
                    </div>
                )}
            </div>

            {/* ── Modal Duplicar ── */}
            {isDupModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-5 bg-emerald-600 text-white flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl"><Copy size={22} /></div>
                            <div>
                                <h2 className="text-lg font-bold">Duplicar Formulário</h2>
                                <p className="text-emerald-100 text-xs">{dupTargetIds.length} item(s) selecionado(s)</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Quantas cópias deseja criar?</label>
                            <div className="flex items-center gap-3">
                                <button type="button" onClick={() => setDupQuantidade(q => Math.max(1, q - 1))}
                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xl text-gray-600 flex items-center justify-center">−</button>
                                <input type="number" min={1} max={50} value={dupQuantidade}
                                    onChange={e => setDupQuantidade(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                                    className="flex-1 text-center text-2xl font-bold p-2 border-2 border-emerald-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400" />
                                <button type="button" onClick={() => setDupQuantidade(q => Math.min(50, q + 1))}
                                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xl text-gray-600 flex items-center justify-center">+</button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                Serão criadas <strong>{dupQuantidade * dupTargetIds.length}</strong> cópia(s) no total. Máximo: 50.
                            </p>
                        </div>
                        <div className="p-5 bg-gray-50 border-t flex gap-3">
                            <button onClick={() => { setIsDupModalOpen(false); setDupTargetIds([]); }}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100">Cancelar</button>
                            <button onClick={executarDuplicar}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg">Duplicar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Transferir ── */}
            {isTransModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-5 bg-violet-600 text-white flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl"><ArrowRightLeft size={22} /></div>
                            <div>
                                <h2 className="text-lg font-bold">Transferir Formulário</h2>
                                <p className="text-violet-100 text-xs">{transTargetIds.length} item(s) selecionado(s)</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Empresa de destino *</label>
                                <select value={transEmpresaId} onChange={e => setTransEmpresaId(e.target.value)}
                                    className="w-full p-3 border-2 border-violet-200 rounded-xl outline-none focus:ring-2 focus:ring-violet-400 text-sm">
                                    <option value="">Selecione a empresa...</option>
                                    {renderHierarchicalOptions(empresas)}
                                </select>
                            </div>
                            {transEmpresaId && (
                                <>
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                        <p className="text-xs text-amber-700 font-bold">⚠️ Atenção</p>
                                        <p className="text-xs text-amber-600 mt-1">Os vínculos de <strong>Ativo</strong> e <strong>Infraestrutura</strong> serão removidos. Você precisará revinculá-los após a transferência.</p>
                                    </div>
                                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center gap-3">
                                        <ArrowRightLeft size={16} className="text-violet-500 shrink-0" />
                                        <p className="text-sm text-violet-700 font-bold">Transferir para: <span className="text-violet-900">{empresaDestinoNome}</span></p>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-5 bg-gray-50 border-t flex gap-3">
                            <button onClick={() => { setIsTransModalOpen(false); setTransTargetIds([]); setTransEmpresaId(''); }}
                                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100">Cancelar</button>
                            <button onClick={executarTransferir} disabled={!transEmpresaId}
                                className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-40">Transferir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Cadastro/Edição ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-blue-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FileText size={24} /> {isEditing ? 'Editar Formulário' : 'Novo Formulário'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><X size={28} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Nome do Formulário *</label>
                                <input type="text" required className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})}
                                    placeholder="Ex: Problemas da Máquina X" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Empresa *</label>
                                <select required className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.empresa_id} onChange={e => setFormData({...formData, empresa_id: e.target.value, ativo_id: '', infraestrutura_id: ''})}>
                                    <option value="">Selecione...</option>
                                    {renderHierarchicalOptions(empresas)}
                                </select>
                      {/* LOCALIZAÇÃO (opcional) */}
                      <label className="text-xs font-bold text-slate-600 uppercase ml-1 mt-3">Localização</label>
                      <select
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                          value={formData.localizacao_id || ''}
                          onChange={(e) => setFormData({ ...formData, localizacao_id: e.target.value })}
                      >
                          <option value="">Selecione (opcional)</option>
                          {(localizacoes || [])
                              .filter(l => !formData.empresa_id || l.empresa_id?.toString() === formData.empresa_id)
                              .map(l => (
                                  <option key={l.id} value={l.id.toString()}>{l.nome}</option>
                              ))
                          }
                      </select>

                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Tipo *</label>
                                <select required className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value, ativo_id: '', infraestrutura_id: ''})}>
                                    <option value="maquinario">🔧 Maquinário</option>
                                    <option value="infraestrutura">🏗️ Infraestrutura</option>
                                </select>
                            </div>
                            {formData.tipo === 'maquinario' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Ativo / Máquina *</label>
                                    <select required className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.ativo_id} onChange={e => setFormData({...formData, ativo_id: e.target.value})}>
                                        <option value="">Selecione um ativo...</option>
                                        {ativosFiltered.map(a => <option key={a.id} value={a.id.toString()}>{a.nome} ({a.numero_serie || 'S/N'})</option>)}
                                    </select>
                                    {formData.empresa_id && ativosFiltered.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhum ativo cadastrado para esta empresa</p>}
                                </div>
                            )}
                            {formData.tipo === 'infraestrutura' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Infraestrutura *</label>
                                    <select required className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.infraestrutura_id} onChange={e => setFormData({...formData, infraestrutura_id: e.target.value})}>
                                        <option value="">Selecione uma infraestrutura...</option>
                                        {infrasFiltered.map(i => <option key={i.id} value={i.id.toString()}>{i.nome}</option>)}
                                    </select>
                                    {formData.empresa_id && infrasFiltered.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhuma infraestrutura cadastrada para esta empresa</p>}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Problemas / Opções</label>
                                <div className="flex gap-2 mb-3">
                                    <input type="text" placeholder="Digite um problema..."
                                        className="flex-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                        value={novaOpcao} onChange={e => setNovaOpcao(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddOpcao())} />
                                    <button type="button" onClick={handleAddOpcao}
                                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold">Adicionar</button>
                                </div>
                                <div className="space-y-2">
                                    {formData.opcoes.map((op, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <span className="text-sm font-medium text-gray-700">{op}</span>
                                            <button type="button" onClick={() => handleRemoveOpcao(idx)}
                                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-md"><X size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-6 border-t flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                                <button type="submit" className="px-12 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg">
                                    {isEditing ? 'Salvar Alterações' : 'Criar Formulário'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
