import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Plus, Trash2, Edit2, Wrench, MapPin, Building2, Calendar,
    X, Search, FileText, Paperclip, Eye, Copy, ArrowRightLeft,
    CheckSquare, Square, ChevronDown
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

export default function Infraestrutura() {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [infraestruturas, setInfraestrutura] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [tiposInfra, setTiposInfra] = useState([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    const [localizacaoFilter, setLocalizacaoFilter] = useState('Todas');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentInfraId, setCurrentInfraId] = useState(null);

    // ── Seleção múltipla ───────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkMenuOpen, setIsBulkMenuOpen] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    // ── Modal duplicar ─────────────────────────────────────────────────────────
    const [isDupModalOpen, setIsDupModalOpen] = useState(false);
    const [dupQuantidade, setDupQuantidade] = useState(1);
    const [dupTargetIds, setDupTargetIds] = useState([]);

    // ── Modal transferir ───────────────────────────────────────────────────────
    const [isTransModalOpen, setIsTransModalOpen] = useState(false);
    const [transTargetIds, setTransTargetIds] = useState([]);
    const [transEmpresaId, setTransEmpresaId] = useState('');

    const [formData, setFormData] = useState({
        nome: '', descricao: '', data_instalacao: '',
        empresa_id: '', localizacao_id: '', tipo_infraestrutura_id: '',
        anexos: []
    });

    const [uploading, setUploading] = useState(false);
    const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
    const [attachmentsToShow, setAttachmentsToShow] = useState([]);

    const API_BASE = window.location.origin.includes('5173')
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;
    const API_PREFIX = `${API_BASE}/api`;
    const API_COLLECTION = `${API_PREFIX}/infraestruturas`;

    const getCollectionUrls = () => [API_COLLECTION, `${API_PREFIX}/infraestruturas/`];
    const getItemUrls = (id) => [`${API_PREFIX}/infraestruturas/${id}`, `${API_PREFIX}/infraestruturas/${id}/`];

    const getAnexoHref = (path) => {
        if (!path) return '#';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        if (path.startsWith('//')) return window.location.protocol + path;
        let cleanPath = path.replace(/^\/+/, '').replace(/^static\/uploads\//, '').replace(/^uploads\//, '');
        return `${API_BASE}/static/uploads/${cleanPath}`;
    };

    const localKeyForInfra = (id) => `infraestrutura_anexos_${id}`;
    const localKeyDraft = 'infraestrutura_anexos_draft';
    const saveLocalAnexosForInfra = (id, a) => { try { localStorage.setItem(localKeyForInfra(id), JSON.stringify(a || [])); } catch (e) {} };
    const getLocalAnexosForInfra = (id) => { try { const v = localStorage.getItem(localKeyForInfra(id)); return v ? JSON.parse(v) : []; } catch (e) { return []; } };
    const clearLocalAnexosForInfra = (id) => { try { localStorage.removeItem(localKeyForInfra(id)); } catch (e) {} };
    const saveDraftAnexos = (a) => { try { localStorage.setItem(localKeyDraft, JSON.stringify(a || [])); } catch (e) {} };
    const getDraftAnexos = () => { try { const v = localStorage.getItem(localKeyDraft); return v ? JSON.parse(v) : []; } catch (e) { return []; } };
    const clearDraftAnexos = () => { try { localStorage.removeItem(localKeyDraft); } catch (e) {} };

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) headers['X-API-Token'] = user.api_token;
            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';
            const [resInfra, resEmp, resLoc, resTipo] = await Promise.all([
                fetch(`${API_COLLECTION}${queryParams}`, { headers }),
                fetch(`${API_PREFIX}/empresas/`, { headers }),
                fetch(`${API_PREFIX}/localizacoes/${queryParams}`, { headers }),
                fetch(`${API_PREFIX}/tipos-infraestrutura/`, { headers })
            ]);
            let infraData = [];
            if (resInfra.ok) { const data = await resInfra.json(); infraData = data.infraestruturas || data; }
            if (resEmp.ok) setEmpresas(await resEmp.json());
            if (resLoc.ok) setLocalizacoes(await resLoc.json());
            if (resTipo.ok) setTiposInfra(await resTipo.json());
            const merged = infraData.map(i => {
                const local = getLocalAnexosForInfra(i.id);
                if (!local || local.length === 0) return i;
                const serverAnexos = Array.isArray(i.anexos) ? i.anexos : [];
                const paths = new Set(serverAnexos.map(x => x.path));
                return { ...i, anexos: [...serverAnexos, ...local.filter(x => !paths.has(x.path))] };
            });
            setInfraestrutura(merged);
            setSelectedIds([]);
        } catch (error) { console.error("Erro ao carregar dados:", error); }
    }, [user, selectedEntity, API_PREFIX]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const renderHierarchicalOptions = (items, parentId = null, level = 0) => {
        return items.filter(item => item.parent_id === parentId).map(item => (
            <React.Fragment key={item.id}>
                <option value={item.id.toString()}>{'\u00A0'.repeat(level * 4)}{level > 0 ? '↳ ' : ''}{item.nome}</option>
                {renderHierarchicalOptions(items, item.id, level + 1)}
            </React.Fragment>
        ));
    };

    const renderGroupedLocalizacoes = () => {
        return empresas.map(empresa => {
            const locs = localizacoes.filter(l => l.empresa_id === empresa.id);
            if (!locs.length) return null;
            return (
                <optgroup key={empresa.id} label={empresa.nome.toUpperCase()}>
                    {locs.map(l => <option key={l.id} value={l.id.toString()}>- {l.nome}</option>)}
                </optgroup>
            );
        });
    };

    // ── Seleção ────────────────────────────────────────────────────────────────
    const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleSelectAll = () => {
        if (selectedIds.length === filteredInfra.length) setSelectedIds([]);
        else setSelectedIds(filteredInfra.map(i => i.id));
    };
    const clearSelection = () => { setSelectedIds([]); setIsBulkMenuOpen(false); };

    // ── Ações em lote ──────────────────────────────────────────────────────────
    const handleBulkDelete = async () => {
        if (!window.confirm(`Excluir ${selectedIds.length} item(s)?`)) return;
        setBulkLoading(true);
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        for (const id of selectedIds) {
            try {
                let res = await fetch(getItemUrls(id)[0], { method: 'DELETE', headers });
                if (!res.ok) res = await fetch(getItemUrls(id)[1], { method: 'DELETE', headers });
                if (res.ok) clearLocalAnexosForInfra(id);
            } catch (e) { console.error(e); }
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
            const original = infraestruturas.find(i => i.id === id);
            if (!original) continue;
            for (let n = 1; n <= dupQuantidade; n++) {
                const payload = {
                    nome: dupQuantidade > 1 ? `${original.nome} (cópia ${n})` : `${original.nome} (cópia)`,
                    descricao: original.descricao || '',
                    data_instalacao: original.data_instalacao || null,
                    empresa_id: original.empresa_id || null,
                    localizacao_id: original.localizacao_id || null,
                    tipo_infraestrutura_id: original.tipo_infraestrutura_id || null,
                    anexos: []
                };
                try {
                    let res = await fetch(getCollectionUrls()[0], { method: 'POST', headers, body: JSON.stringify(payload) });
                    if (!res.ok) await fetch(getCollectionUrls()[1], { method: 'POST', headers, body: JSON.stringify(payload) });
                } catch (e) { console.error(e); }
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
            const original = infraestruturas.find(i => i.id === id);
            if (!original) continue;
            const payload = {
                nome: original.nome, descricao: original.descricao || '',
                data_instalacao: original.data_instalacao || null,
                tipo_infraestrutura_id: original.tipo_infraestrutura_id || null,
                empresa_id: parseInt(transEmpresaId),
                localizacao_id: null, anexos: original.anexos || []
            };
            try {
                let res = await fetch(getItemUrls(id)[0], { method: 'PUT', headers, body: JSON.stringify(payload) });
                if (!res.ok) await fetch(getItemUrls(id)[1], { method: 'PUT', headers, body: JSON.stringify(payload) });
            } catch (e) { console.error(e); }
        }
        setBulkLoading(false);
        setTransTargetIds([]);
        setSelectedIds([]);
        fetchData();
    };

    // ── CRUD ───────────────────────────────────────────────────────────────────
    const handleOpenModal = (infra = null) => {
        if (infra) {
            setIsEditing(true); setCurrentInfraId(infra.id);
            const local = getLocalAnexosForInfra(infra.id);
            const serverAnexos = Array.isArray(infra.anexos) ? infra.anexos : [];
            const paths = new Set(serverAnexos.map(x => x.path));
            setFormData({
                nome: infra.nome || '', descricao: infra.descricao || '',
                data_instalacao: infra.data_instalacao || '',
                empresa_id: infra.empresa_id?.toString() || '',
                localizacao_id: infra.localizacao_id?.toString() || 'none',
                tipo_infraestrutura_id: infra.tipo_infraestrutura_id?.toString() || '',
                anexos: [...serverAnexos, ...local.filter(x => !paths.has(x.path))]
            });
        } else {
            setIsEditing(false); setCurrentInfraId(null);
            setFormData({ nome: '', descricao: '', data_instalacao: '', empresa_id: '', localizacao_id: 'none', tipo_infraestrutura_id: '', anexos: getDraftAnexos() || [] });
        }
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setUploading(true);
        const newAnexos = [...formData.anexos];
        for (const file of files) {
            const fData = new FormData(); fData.append('file', file);
            try {
                const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: fData });
                if (res.ok) { const data = await res.json(); newAnexos.push({ name: file.name, filename: data.filename, path: data.path, url: data.url }); }
            } catch (err) { console.error(err); }
        }
        setFormData({ ...formData, anexos: newAnexos });
        if (isEditing && currentInfraId) saveLocalAnexosForInfra(currentInfraId, newAnexos);
        else saveDraftAnexos(newAnexos);
        setUploading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
            localizacao_id: formData.localizacao_id === 'none' ? null : parseInt(formData.localizacao_id),
            tipo_infraestrutura_id: formData.tipo_infraestrutura_id ? parseInt(formData.tipo_infraestrutura_id) : null,
            anexos: formData.anexos
        };
        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        const urls = isEditing ? getItemUrls(currentInfraId) : getCollectionUrls();
        const method = isEditing ? 'PUT' : 'POST';
        try {
            let res = await fetch(urls[0], { method, headers, body: JSON.stringify(payload) });
            if (!res.ok && (res.status === 405 || res.status === 404)) res = await fetch(urls[1], { method, headers, body: JSON.stringify(payload) });
            if (res.ok) {
                if (isEditing && currentInfraId) clearLocalAnexosForInfra(currentInfraId);
                else clearDraftAnexos();
                setIsModalOpen(false); fetchData();
            }
        } catch (error) { console.error("Erro ao salvar:", error); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir esta infraestrutura?')) return;
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        const urls = getItemUrls(id);
        try {
            let res = await fetch(urls[0], { method: 'DELETE', headers });
            if (!res.ok) res = await fetch(urls[1], { method: 'DELETE', headers });
            if (res.ok) { clearLocalAnexosForInfra(id); fetchData(); }
        } catch (error) { console.error(error); }
    };

    const filteredInfra = useMemo(() => infraestruturas.filter(i => {
        const matchesSearch = i.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesEmpresa = empresaFilter === 'Todas' || i.empresa_id === parseInt(empresaFilter);
        const matchesLocal = localizacaoFilter === 'Todas' || i.localizacao_id === parseInt(localizacaoFilter);
        return matchesSearch && matchesEmpresa && matchesLocal;
    }), [infraestruturas, searchTerm, empresaFilter, localizacaoFilter]);

    const allSelected = filteredInfra.length > 0 && selectedIds.length === filteredInfra.length;
    const someSelected = selectedIds.length > 0;
    const empresaDestinoNome = empresas.find(e => e.id.toString() === transEmpresaId)?.nome || '';

    return (
        <div className="p-6 bg-gray-50 min-h-screen">

            {/* ── Header ── */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Wrench className="text-orange-600" /> Gestão de Infraestrutura
                </h1>
                <button onClick={() => handleOpenModal()}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg">
                    <Plus size={20} /> Nova Infraestrutura
                </button>
            </div>

            {/* ── Filtros ── */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input type="text" placeholder="Pesquisar por nome..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <select className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    value={empresaFilter} onChange={(e) => setEmpresaFilter(e.target.value)}>
                    <option value="Todas">Todas as Empresas</option>
                    {renderHierarchicalOptions(empresas)}
                </select>
                <select className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    value={localizacaoFilter} onChange={(e) => setLocalizacaoFilter(e.target.value)}>
                    <option value="Todas">Todas as Localizações</option>
                    {renderGroupedLocalizacoes()}
                </select>
            </div>

            {/* ── Barra de seleção em lote ── */}
            <div className={`mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${someSelected ? 'bg-orange-50 border-orange-200 shadow-sm' : 'bg-white border-gray-200'}`}>
                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-orange-600 transition-colors">
                    {allSelected
                        ? <CheckSquare size={20} className="text-orange-600" />
                        : someSelected
                            ? <CheckSquare size={20} className="text-orange-400" />
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
                    <span className="text-xs text-gray-400 ml-2">{filteredInfra.length} item(s) encontrado(s)</span>
                )}
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInfra.map(i => {
                    const isSelected = selectedIds.includes(i.id);
                    return (
                        <Card key={i.id}
                            className={`transition-all border-2 group relative overflow-hidden ${isSelected ? 'border-orange-400 shadow-md ring-2 ring-orange-200' : 'border-gray-200 hover:shadow-md'}`}>
                            <CardContent className="p-0">
                                <div className="p-5 border-b border-gray-100 bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        {/* Checkbox + título */}
                                        <div className="flex items-start gap-2 flex-1 min-w-0">
                                            <button onClick={() => toggleSelect(i.id)} className="mt-0.5 shrink-0">
                                                {isSelected
                                                    ? <CheckSquare size={18} className="text-orange-600" />
                                                    : <Square size={18} className="text-gray-300 hover:text-orange-400" />}
                                            </button>
                                            <h3 className="font-bold text-gray-800 text-base flex items-center gap-1.5 truncate">
                                                <Wrench size={15} className="text-orange-500 shrink-0" /> {i.nome}
                                            </h3>
                                        </div>
                                        {/* Ações individuais */}
                                        <div className="flex gap-1 shrink-0 ml-1">
                                            <button onClick={() => abrirModalDuplicar([i.id])}
                                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Duplicar">
                                                <Copy size={15} />
                                            </button>
                                            <button onClick={() => abrirModalTransferir([i.id])}
                                                className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-md transition-colors" title="Transferir">
                                                <ArrowRightLeft size={15} />
                                            </button>
                                            <button onClick={() => handleOpenModal(i)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                                                <Edit2 size={15} />
                                            </button>
                                            <button onClick={() => handleDelete(i.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 text-sm text-gray-600 pl-6">
                                        {i.tipo_nome && <p className="flex items-center gap-2"><Wrench size={13} className="text-gray-400" /> Tipo: <span className="font-semibold text-orange-600">{i.tipo_nome}</span></p>}
                                        <p className="flex items-center gap-2"><Building2 size={13} className="text-gray-400" /> {i.empresa_nome}</p>
                                        <p className="flex items-center gap-2"><MapPin size={13} className="text-gray-400" /> {i.localizacao_nome || 'N/A'}</p>
                                        {i.descricao && <p className="text-xs italic text-gray-500">{i.descricao}</p>}
                                    </div>
                                </div>
                                <div className={`p-4 flex justify-between items-center transition-colors ${isSelected ? 'bg-orange-50/60' : 'bg-gray-50/50'}`}>
                                    <div className="flex gap-2 flex-wrap">
                                        {i.data_instalacao && (
                                            <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                                <Calendar size={11} /> {new Date(i.data_instalacao).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                    {i.anexos && i.anexos.length > 0 && (
                                        <button onClick={() => { setAttachmentsToShow(i.anexos); setIsAttachmentsModalOpen(true); }}
                                            className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline">
                                            <Paperclip size={11} /> {i.anexos.length} Anexos
                                        </button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
                {filteredInfra.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-gray-400 text-sm">Nenhuma infraestrutura encontrada.</div>
                )}
            </div>

            {/* ── Modal Duplicar ── */}
            {isDupModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-5 bg-emerald-600 text-white flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl"><Copy size={22} /></div>
                            <div>
                                <h2 className="text-lg font-bold">Duplicar Infraestrutura</h2>
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
                                Serão criadas <strong>{dupQuantidade * dupTargetIds.length}</strong> cópia(s) no total.
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
                                <h2 className="text-lg font-bold">Transferir Infraestrutura</h2>
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
                                        <p className="text-xs text-amber-600 mt-1">O vínculo de <strong>Localização</strong> será removido pois pertence à empresa atual.</p>
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

            {/* ── Modal Anexos ── */}
            {isAttachmentsModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-orange-600 text-white">
                            <h3 className="font-bold flex items-center gap-2"><Paperclip size={18} /> Anexos</h3>
                            <button onClick={() => setIsAttachmentsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {attachmentsToShow.map((anexo, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-200">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><FileText size={16} /></div>
                                        <span className="text-sm font-medium text-gray-700 truncate">{anexo.name || anexo.filename || 'Arquivo'}</span>
                                    </div>
                                    <button onClick={() => window.open(getAnexoHref(anexo.path || anexo.url), '_blank')}
                                        className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg"><Eye size={18} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button onClick={() => setIsAttachmentsModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 font-semibold">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Cadastro/Edição ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-orange-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Wrench size={24} /> {isEditing ? 'Editar Infraestrutura' : 'Nova Infraestrutura'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><X size={28} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Identificação</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nome *</label>
                                        <input type="text" required className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                            value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Descrição</label>
                                        <textarea className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                            value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} rows="3" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Data Instalação</label>
                                        <input type="date" className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                            value={formData.data_instalacao} onChange={e => setFormData({...formData, data_instalacao: e.target.value})} />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Vínculos</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Tipo de Infraestrutura</label>
                                        <select className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                            value={formData.tipo_infraestrutura_id} onChange={e => setFormData({...formData, tipo_infraestrutura_id: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {tiposInfra.map(t => <option key={t.id} value={t.id.toString()}>{t.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Empresa *</label>
                                        <select required className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                            value={formData.empresa_id} onChange={e => setFormData({...formData, empresa_id: e.target.value})}>
                                            <option value="">Selecione...</option>
                                            {renderHierarchicalOptions(empresas)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Localização</label>
                                        <select className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                                            value={formData.localizacao_id} onChange={e => setFormData({...formData, localizacao_id: e.target.value})}>
                                            <option value="none">Nenhuma</option>
                                            {renderGroupedLocalizacoes()}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Anexos</h3>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-300 transition-colors relative group">
                                    <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} disabled={uploading} />
                                    <Paperclip className="mx-auto text-gray-400 group-hover:text-orange-500 mb-2" size={24} />
                                    <p className="text-sm text-gray-500">{uploading ? 'Enviando...' : 'Clique ou arraste arquivos'}</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {formData.anexos.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-white rounded-lg shadow-sm text-orange-500"><FileText size={14} /></div>
                                                <span className="text-sm font-medium text-gray-700 truncate">{file.name || file.filename}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button type="button" onClick={() => window.open(getAnexoHref(file.path || file.url), '_blank')} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md"><Eye size={16} /></button>
                                                <button type="button" onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, i) => i !== idx)})} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="pt-6 border-t flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                                <button type="submit" disabled={uploading} className="px-12 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg disabled:opacity-50">
                                    {isEditing ? 'Salvar Alterações' : 'Cadastrar Infraestrutura'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
