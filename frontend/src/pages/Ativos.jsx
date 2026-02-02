import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Plus, Trash2, Edit2, Box, MapPin, Building2, Zap, Hash, Calendar, 
    User, FileText, ShoppingCart, X, Search, Filter, Info, Paperclip, Eye
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

/*
  Ativos.jsx
  - Keeps no blocking pop-ups (no alert/toast)
  - Persists newly-uploaded anexos to localStorage so they survive page reloads
  - Attempts to attach uploaded files to backend (if backend supports it)
  - If backend refuses update (405), changes are merged locally and not POSTed to collection (prevents duplication)
*/

export default function Ativos() {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [ativos, setAtivos] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [localizacoes, setLocalizacoes] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [contratos, setContratos] = useState([]);
    const [orcamentos, setOrcamentos] = useState([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    const [localizacaoFilter, setLocalizacaoFilter] = useState('Todas');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAtivoId, setCurrentAtivoId] = useState(null);

    // attachments state inside the form/modal
    const [formData, setFormData] = useState({ 
        nome: '', numero_serie: '', voltagem_entrada: '', 
        data_aquisicao: '', data_inativacao: '',
        empresa_id: '', localizacao_id: '', fornecedor_id: '', 
        contrato_id: '', orcamento_id: '', anexos: []
    });

    const [uploading, setUploading] = useState(false);

    // attachments viewer modal (open without editing)
    const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
    const [attachmentsToShow, setAttachmentsToShow] = useState([]);

    // BACKEND / API base resolution (Vite-friendly)
    const VITE_BACKEND_URL = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL
        ? import.meta.env.VITE_BACKEND_URL
        : null;
    const VITE_BACKEND_PORT = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_PORT
        ? import.meta.env.VITE_BACKEND_PORT
        : null;

    let API_BASE = window.location.origin;
    if (VITE_BACKEND_URL) {
        API_BASE = VITE_BACKEND_URL;
    } else if (VITE_BACKEND_PORT) {
        API_BASE = `${window.location.protocol}//${window.location.hostname}:${VITE_BACKEND_PORT}`;
    } else {
        API_BASE = `${window.location.protocol}//${window.location.hostname}:5002`;
    }

    const API_PREFIX = `${API_BASE}/api`;
    const API_COLLECTION_NO_SLASH = `${API_PREFIX}/ativos`;
    const API_COLLECTION = `${API_PREFIX}/ativos/`; // trailing slash

    const getCollectionUrls = () => [API_COLLECTION, API_COLLECTION_NO_SLASH];
    const getItemUrls = (id) => [
        `${API_PREFIX}/ativos/${id}`,
        `${API_PREFIX}/ativos/${id}/`
    ];

    const getAnexoHref = (path) => {
        if (!path) return '#';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        if (path.startsWith('//')) return window.location.protocol + path;
        if (path.startsWith('/')) return `${API_BASE}${path}`;
        return `${API_BASE}/${path.replace(/^\/+/, '')}`;
    };

    // --- localStorage helpers to persist anexos client-side ---
    const localKeyForAtivo = (id) => `ativos_anexos_${id}`;
    const localKeyDraft = 'ativos_anexos_draft';

    const saveLocalAnexosForAtivo = (id, anexos) => {
        try {
            localStorage.setItem(localKeyForAtivo(id), JSON.stringify(anexos || []));
        } catch (e) { console.error('localStorage save error', e); }
    };
    const getLocalAnexosForAtivo = (id) => {
        try {
            const v = localStorage.getItem(localKeyForAtivo(id));
            return v ? JSON.parse(v) : [];
        } catch (e) { return []; }
    };
    const clearLocalAnexosForAtivo = (id) => {
        try { localStorage.removeItem(localKeyForAtivo(id)); } catch (e) {}
    };

    const saveDraftAnexos = (anexos) => {
        try { localStorage.setItem(localKeyDraft, JSON.stringify(anexos || [])); } catch (e) {}
    };
    const getDraftAnexos = () => {
        try {
            const v = localStorage.getItem(localKeyDraft);
            return v ? JSON.parse(v) : [];
        } catch (e) { return []; }
    };
    const clearDraftAnexos = () => {
        try { localStorage.removeItem(localKeyDraft); } catch (e) {}
    };
    // --- end localStorage helpers ---

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';

            const [resAtivos, resEmp, resLoc, resFor, resCon, resOrc] = await Promise.all([
                fetch(`${getCollectionUrls()[0]}${queryParams}`, { headers }),
                fetch(`${API_PREFIX}/empresas/`, { headers }),
                fetch(`${API_PREFIX}/localizacoes/${queryParams}`, { headers }),
                fetch(`${API_PREFIX}/fornecedores/${queryParams}`, { headers }),
                fetch(`${API_PREFIX}/contratos/${queryParams}`, { headers }),
                fetch(`${API_PREFIX}/orcamentos/${queryParams}`, { headers })
            ]);
            
            let ativosData = [];
            if (resAtivos.ok) ativosData = await resAtivos.json();
            if (resEmp.ok) setEmpresas(await resEmp.json());
            if (resLoc.ok) setLocalizacoes(await resLoc.json());
            if (resFor.ok) setFornecedores(await resFor.json());
            if (resCon.ok) setContratos(await resCon.json());
            if (resOrc.ok) setOrcamentos(await resOrc.json());

            // Merge any locally stored attachments for each ativo (so they survive refresh)
            const merged = ativosData.map(a => {
                const local = getLocalAnexosForAtivo(a.id);
                if (!local || local.length === 0) return a;
                const serverAnexos = Array.isArray(a.anexos) ? a.anexos : [];
                // avoid duplicates by path
                const paths = new Set(serverAnexos.map(x => x.path));
                const toAdd = local.filter(x => !paths.has(x.path));
                return { ...a, anexos: [...serverAnexos, ...toAdd] };
            });
            setAtivos(merged);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            // silent (no pop-up)
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData, selectedEntity]);

    // Helpers for selects and filters
    const renderHierarchicalOptions = (items, parentId = null, level = 0) => {
        return items
            .filter(item => item.parent_id === parentId)
            .map(item => (
                <React.Fragment key={item.id}>
                    <option value={item.id.toString()}>
                        {'\u00A0'.repeat(level * 4)}{level > 0 ? '↳ ' : ''}{item.nome}
                    </option>
                    {renderHierarchicalOptions(items, item.id, level + 1)}
                </React.Fragment>
            ));
    };

    const renderGroupedLocalizacoes = () => {
        return empresas.map(empresa => {
            const locsDaEmpresa = localizacoes.filter(l => l.empresa_id === empresa.id);
            if (locsDaEmpresa.length === 0) return null;
            return (
                <optgroup key={empresa.id} label={empresa.nome.toUpperCase()}>
                    {locsDaEmpresa.map(l => (
                        <option key={l.id} value={l.id.toString()}>
                            - {l.nome}
                        </option>
                    ))}
                </optgroup>
            );
        });
    };

    const handleOpenModal = (ativo = null) => {
        if (ativo) {
            setIsEditing(true);
            setCurrentAtivoId(ativo.id);
            // merge any local anexos into form
            const local = getLocalAnexosForAtivo(ativo.id);
            const serverAnexos = Array.isArray(ativo.anexos) ? ativo.anexos : [];
            const paths = new Set(serverAnexos.map(x => x.path));
            const merged = [...serverAnexos, ...local.filter(x => !paths.has(x.path))];

            setFormData({
                nome: ativo.nome || '',
                numero_serie: ativo.numero_serie || '',
                voltagem_entrada: ativo.voltagem_entrada || '',
                data_aquisicao: ativo.data_aquisicao || '',
                data_inativacao: ativo.data_inativacao || '',
                empresa_id: ativo.empresa_id?.toString() || '',
                localizacao_id: ativo.localizacao_id?.toString() || 'none',
                fornecedor_id: ativo.fornecedor_id?.toString() || 'none',
                contrato_id: ativo.contrato_id?.toString() || 'none',
                orcamento_id: ativo.orcamento_id?.toString() || 'none',
                anexos: merged
            });
        } else {
            setIsEditing(false);
            setCurrentAtivoId(null);
            // load draft anexos (for new ativo)
            const draft = getDraftAnexos();
            setFormData({ 
                nome: '', numero_serie: '', voltagem_entrada: '', 
                data_aquisicao: '', data_inativacao: '',
                empresa_id: '', localizacao_id: 'none', fornecedor_id: 'none', 
                contrato_id: 'none', orcamento_id: 'none', anexos: draft || []
            });
        }
        setIsModalOpen(true);
    };

    // Try to attach an uploaded file to an existing ativo by calling likely endpoints.
    // Returns true if server accepted the association.
    const attachAnexoToAtivo = async (ativoId, anexo) => {
        const candidatePaths = [
            `${API_PREFIX}/ativos/${ativoId}/anexos`,
            `${API_PREFIX}/ativos/${ativoId}/attachments`,
            `${API_PREFIX}/ativos/${ativoId}/upload`,
            `${API_PREFIX}/ativos/${ativoId}/files`,
            `${API_PREFIX}/ativos/${ativoId}/anexo`
        ];

        // Try JSON POST { name, path }
        for (const url of candidatePaths) {
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: anexo.name, path: anexo.path })
                });
                if (res.ok) return true;
            } catch (err) {
                // ignore
            }
        }

        // Try multipart/form-data POST (name + path)
        for (const url of candidatePaths) {
            try {
                const fd = new FormData();
                fd.append('path', anexo.path || '');
                fd.append('name', anexo.name || '');
                const res = await fetch(url, { method: 'POST', body: fd });
                if (res.ok) return true;
            } catch (err) {
                // ignore
            }
        }

        return false;
    };

    // Robust file upload handler with immediate attach attempt if editing
    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        setUploading(true);
        const newAnexos = [...formData.anexos];

        for (const file of files) {
            const fd = new FormData();
            fd.append('file', file); // field name expected by backend

            try {
                console.log('Enviando upload para backend...', file.name);
                const res = await fetch(`${API_PREFIX}/upload`, {
                    method: 'POST',
                    body: fd,
                });

                const text = await res.text();
                let result = null;
                try { result = JSON.parse(text); } catch (_) { result = null; }

                if (!res.ok) {
                    console.error('Upload falhou', res.status, text);
                    // silent
                    continue;
                }

                let path = '';
                if (result) {
                    path = result.path || result.url || result.filename || result.filepath || '';
                } else {
                    path = text && text.trim() ? text.trim() : '';
                }

                if (!path) {
                    console.warn('Upload retornou sem path/url conhecido. Resultado bruto:', result || text);
                    newAnexos.push({ name: file.name, path: '' });
                } else {
                    const anexo = { name: file.name, path };
                    newAnexos.push(anexo);
                    console.log('Upload OK, path:', path);

                    // Persist locally immediately
                    if (isEditing && currentAtivoId) {
                        const local = getLocalAnexosForAtivo(currentAtivoId) || [];
                        // avoid duplicate paths
                        const paths = new Set(local.map(x => x.path));
                        if (!paths.has(path)) {
                            const updatedLocal = [...local, anexo];
                            saveLocalAnexosForAtivo(currentAtivoId, updatedLocal);
                        }
                    } else {
                        // draft
                        const draft = getDraftAnexos() || [];
                        const paths = new Set(draft.map(x => x.path));
                        if (!paths.has(path)) {
                            const updatedDraft = [...draft, anexo];
                            saveDraftAnexos(updatedDraft);
                        }
                    }

                    // If editing an existing ativo, try to attach immediately on server (best-effort)
                    if (isEditing && currentAtivoId) {
                        const attached = await attachAnexoToAtivo(currentAtivoId, anexo);
                        if (attached) {
                            // clear local stored anexos for this path (server persisted it)
                            const local = getLocalAnexosForAtivo(currentAtivoId).filter(a => a.path !== path);
                            saveLocalAnexosForAtivo(currentAtivoId, local);
                            // refresh server data
                            fetchData();
                        } else {
                            // keep local copy (so survives reload)
                            // no popup per user request
                        }
                    }
                }
            } catch (err) {
                console.error('Erro no upload do arquivo', file.name, err);
                // silent
            }
        }

        setFormData(prev => {
            const merged = [...prev.anexos];
            // merge without duplicates by path
            const existingPaths = new Set(merged.map(x => x.path));
            const toAdd = newAnexos.filter(x => !existingPaths.has(x.path));
            const result = { ...prev, anexos: [...merged, ...toAdd] };

            // persist draft or local after updating formData
            if (isEditing && currentAtivoId) {
                // save local copy for this ativo
                saveLocalAnexosForAtivo(currentAtivoId, result.anexos);
            } else {
                saveDraftAnexos(result.anexos);
            }

            return result;
        });

        setUploading(false);
    };

    // Merge local ativo to avoid duplication when backend doesn't allow update
    const mergeLocalAtivo = (id, newData) => {
        setAtivos(prev => prev.map(a => a.id === id ? { ...a, ...newData } : a));
    };

    // Try many permutations to save/update (but never POST to collection when editing)
    const trySave = async (payload) => {
        if (!isEditing) {
            // Creation: try collection urls with POST
            const collectionUrls = getCollectionUrls();
            for (const url of collectionUrls) {
                try {
                    console.log('Tentando criar (POST) em', url);
                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        // created successfully -> clear draft anexos
                        clearDraftAnexos();
                        return { ok: true, res };
                    }
                    console.warn('POST falhou em', url, 'status', res.status);
                } catch (err) {
                    console.error('Erro POST criar em', url, err);
                }
            }
            return { ok: false, message: 'Criação falhou em todos os endpoints testados' };
        }

        // Editing: try item urls and methods only (no POST to collection)
        const itemUrls = getItemUrls(currentAtivoId);

        // Try OPTIONS for debugging/allowed methods (best-effort)
        for (const url of itemUrls) {
            try {
                const opt = await fetch(url, { method: 'OPTIONS' });
                console.log('OPTIONS', url, 'status', opt.status, 'Allow:', opt.headers.get('allow') || opt.headers.get('Allow'));
            } catch (err) {
                // ignore
            }
        }

        const attempts = [];

        // Prefer PATCH then PUT on item urls
        for (const url of itemUrls) attempts.push({ url, method: 'PATCH' });
        for (const url of itemUrls) attempts.push({ url, method: 'PUT' });

        // Try POST with override header to item urls (not to collection)
        for (const url of itemUrls) {
            attempts.push({ url, method: 'POST-OVERRIDE', override: 'PATCH' });
            attempts.push({ url, method: 'POST-OVERRIDE', override: 'PUT' });
        }

        for (const att of attempts) {
            try {
                let options;
                if (att.method === 'POST-OVERRIDE') {
                    options = {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-HTTP-Method-Override': att.override },
                        body: JSON.stringify(payload)
                    };
                } else {
                    options = {
                        method: att.method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    };
                }

                console.log('Tentativa:', options.method, '=>', att.url, att.override ? `(override: ${att.override})` : '');
                const res = await fetch(att.url, options);
                console.log('Resposta', res.status, 'para', att.url);
                if (res.ok) {
                    // successful update: clear local stored anexos for this ativo (they were saved to server)
                    clearLocalAnexosForAtivo(currentAtivoId);
                    return { ok: true, res };
                }
                if (res.status === 405) {
                    console.warn('405 em', att.url, att.method);
                    continue;
                }
                const text = await res.text();
                return { ok: false, res, detail: text };
            } catch (err) {
                console.error('Erro em tentativa', att, err);
            }
        }

        // All attempts failed for update: signal special message so caller can fallback
        return { ok: false, message: 'update_not_allowed' };
    };

    // Form submit wrapper
    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            ...formData,
            empresa_id: formData.empresa_id === 'none' || formData.empresa_id === '' ? null : parseInt(formData.empresa_id),
            localizacao_id: formData.localizacao_id === 'none' ? null : parseInt(formData.localizacao_id),
            fornecedor_id: formData.fornecedor_id === 'none' ? null : parseInt(formData.fornecedor_id),
            contrato_id: formData.contrato_id === 'none' ? null : parseInt(formData.contrato_id),
            orcamento_id: formData.orcamento_id === 'none' ? null : parseInt(formData.orcamento_id),
            anexos: formData.anexos
        };

        console.log('handleSubmit payload', payload, 'isEditing:', isEditing);

        const result = await trySave(payload);

        if (result.ok) {
            console.log('Salvo com sucesso (servidor respondeu ok)');
            setIsModalOpen(false);
            fetchData();
            return;
        }

        // If backend disallowed update (405 for all), try to attach any uploaded files directly (we already attempted in upload), then merge locally
        if (result.message === 'update_not_allowed' && isEditing) {
            console.warn('Backend não permite update via HTTP; aplicando patch localmente para evitar duplicação.');
            // try to attach remaining anexos (best-effort)
            if (formData.anexos && formData.anexos.length > 0 && currentAtivoId) {
                for (const anexo of formData.anexos) {
                    try {
                        const ok = await attachAnexoToAtivo(currentAtivoId, anexo);
                        console.log('attachAnexoToAtivo result', ok);
                        if (ok) {
                            // if attached successfully, remove from local storage
                            const local = getLocalAnexosForAtivo(currentAtivoId).filter(a => a.path !== anexo.path);
                            saveLocalAnexosForAtivo(currentAtivoId, local);
                        }
                    } catch (err) {
                        console.warn('Erro attachAnexoToAtivo:', err);
                    }
                }
            }
            mergeLocalAtivo(currentAtivoId, payload);
            setIsModalOpen(false);
            // silent per user request
            return;
        }

        console.error('Falha ao salvar:', result);
        // silent per user request
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Deseja excluir este ativo?')) return;
        const itemUrls = getItemUrls(id);
        for (const url of itemUrls) {
            try {
                const res = await fetch(url, { method: 'DELETE' });
                if (res.ok) {
                    fetchData();
                    return;
                }
                console.warn('DELETE falhou em', url, 'status', res.status);
            } catch (err) {
                console.error('Erro DELETE em', url, err);
            }
        }
        // silent per user request
    };

    const filteredAtivos = useMemo(() => {
        return ativos.filter(a => {
            const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (a.numero_serie && a.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesEmpresa = empresaFilter === 'Todas' || a.empresa_id?.toString() === empresaFilter;
            const matchesLocalizacao = localizacaoFilter === 'Todas' || a.localizacao_id?.toString() === localizacaoFilter;
            return matchesSearch && matchesEmpresa && matchesLocalizacao;
        });
    }, [ativos, searchTerm, empresaFilter, localizacaoFilter]);

    const openAttachmentsViewer = (anexos = []) => {
        setAttachmentsToShow(anexos || []);
        setIsAttachmentsModalOpen(true);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Box className="text-indigo-600" /> Gestão de Ativos
                </h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <Plus size={20} /> Novo Ativo
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar nome ou série..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 min-w-[200px]">
                    <Filter className="text-gray-400 w-4 h-4" />
                    <select 
                        className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                        value={empresaFilter}
                        onChange={(e) => setEmpresaFilter(e.target.value)}
                    >
                        <option value="Todas">Todas as Empresas</option>
                        {renderHierarchicalOptions(empresas)}
                    </select>
                </div>
                <div className="flex items-center gap-2 min-w-[200px]">
                    <MapPin className="text-gray-400 w-4 h-4" />
                    <select 
                        className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-sm"
                        value={localizacaoFilter}
                        onChange={(e) => setLocalizacaoFilter(e.target.value)}
                    >
                        <option value="Todas">Todas as Localizações</option>
                        {renderGroupedLocalizacoes()}
                    </select>
                </div>
                <div className="text-sm text-gray-500 font-medium ml-auto">
                    {filteredAtivos.length} ativos encontrados
                </div>
            </div>

            {/* Grid de Ativos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAtivos.map(a => (
                    <Card key={a.id} className="hover:shadow-xl transition-all border-l-4 border-l-indigo-500 bg-white">
                        <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                        <Box className="w-5 h-5 text-indigo-600" /> {a.nome}
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono mt-1">S/N: {a.numero_serie || 'N/A'}</p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {a.anexos && a.anexos.length > 0 && (
                                        <button
                                            onClick={() => openAttachmentsViewer(a.anexos)}
                                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Ver Anexos"
                                        >
                                            <Paperclip className="w-4 h-4" />
                                        </button>
                                    )}
                                    <Edit2 className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-600" onClick={() => handleOpenModal(a)} />
                                    <Trash2 className="w-4 h-4 cursor-pointer text-gray-400 hover:text-red-600" onClick={() => handleDelete(a.id)} />
                                </div>
                            </div>

                            <div className="space-y-3 mt-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <Building2 className="w-4 h-4 text-indigo-400" />
                                    <span className="font-medium">{a.empresa_nome || 'Sem Empresa'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">
                                    <MapPin className="w-4 h-4 text-red-400" />
                                    <span>{a.localizacao_nome || 'Sem Localização'}</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">Aquisição</div>
                                    <div className="text-[10px] text-gray-400 uppercase font-bold">Voltagem</div>
                                    <div className="text-xs text-gray-700 flex items-center gap-1"><Calendar className="w-3 h-3" /> {a.data_aquisicao || '-'}</div>
                                    <div className="text-xs text-gray-700 flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-500" /> {a.voltagem_entrada || '-'}</div>
                                </div>

                                <div className="pt-3 border-t border-gray-100 grid grid-cols-1 gap-y-1">
                                    {a.fornecedor_nome && (
                                        <div className="text-[10px] flex items-center gap-1 text-gray-500"><User className="w-3 h-3" /> Fornecedor: {a.fornecedor_nome}</div>
                                    )}
                                    {a.contrato_numero && (
                                        <div className="text-[10px] flex items-center gap-1 text-blue-600"><FileText className="w-3 h-3" /> Contrato: {a.contrato_numero}</div>
                                    )}
                                    {a.orcamento_numero && (
                                        <div className="text-[10px] flex items-center gap-1 text-green-600"><ShoppingCart className="w-3 h-3" /> Orçamento: {a.orcamento_numero}</div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Attachments viewer modal */}
            {isAttachmentsModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h3 className="font-bold flex items-center gap-2"><Paperclip /> Anexos</h3>
                            <button onClick={() => setIsAttachmentsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><X /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {attachmentsToShow.length > 0 ? (
                                <div className="space-y-3">
                                    {attachmentsToShow.map((anexo, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                                    <FileText />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 truncate">{anexo.name || anexo.filename || 'Arquivo'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => window.open(getAnexoHref(anexo.path || anexo.url || ''), '_blank', 'noopener,noreferrer')}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    title="Visualizar/Baixar"
                                                >
                                                    <Eye />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-4">Nenhum anexo encontrado.</p>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button onClick={() => setIsAttachmentsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 font-semibold transition-colors">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Box /> {isEditing ? 'Editar Ativo' : 'Novo Ativo'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Dados Técnicos</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nome do Ativo *</label>
                                        <input type="text" required className="w-full p-2 border rounded-lg outline-none" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Número de Série</label>
                                        <input type="text" className="w-full p-2 border rounded-lg outline-none" value={formData.numero_serie} onChange={(e) => setFormData({...formData, numero_serie: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Voltagem</label>
                                        <input type="text" className="w-full p-2 border rounded-lg outline-none" value={formData.voltagem_entrada} onChange={(e) => setFormData({...formData, voltagem_entrada: e.target.value})} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Vínculos Principais</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Empresa *</label>
                                        <select required className="w-full p-2 border rounded-lg outline-none" value={formData.empresa_id} onChange={(e) => setFormData({...formData, empresa_id: e.target.value})}>
                                            <option value="">Selecione a Empresa</option>
                                            {renderHierarchicalOptions(empresas)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Localização</label>
                                        <select className="w-full p-2 border rounded-lg outline-none" value={formData.localizacao_id} onChange={(e) => setFormData({...formData, localizacao_id: e.target.value})}>
                                            <option value="none">Nenhuma</option>
                                            {renderGroupedLocalizacoes()}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Fornecedor</label>
                                        <select className="w-full p-2 border rounded-lg outline-none" value={formData.fornecedor_id} onChange={(e) => setFormData({...formData, fornecedor_id: e.target.value})}>
                                            <option value="none">Nenhum</option>
                                            {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b pb-2">Datas e Documentos</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Data de Aquisição</label>
                                        <input type="date" className="w-full p-2 border rounded-lg outline-none" value={formData.data_aquisicao} onChange={(e) => setFormData({...formData, data_aquisicao: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Contrato</label>
                                        <select className="w-full p-2 border rounded-lg outline-none" value={formData.contrato_id} onChange={(e) => setFormData({...formData, contrato_id: e.target.value})}>
                                            <option value="none">Nenhum</option>
                                            {contratos.map(c => <option key={c.id} value={c.id.toString()}>{c.numero}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Orçamento</label>
                                        <select className="w-full p-2 border rounded-lg outline-none" value={formData.orcamento_id} onChange={(e) => setFormData({...formData, orcamento_id: e.target.value})}>
                                            <option value="none">Nenhum</option>
                                            {orcamentos.map(o => <option key={o.id} value={o.id.toString()}>{o.numero}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* Anexos area */}
                                <div className="md:col-span-3">
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Anexos</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-indigo-300 transition-colors relative">
                                        <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                                        <Paperclip className="mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-500">{uploading ? 'Enviando...' : 'Clique ou arraste arquivos para anexar'}</p>
                                    </div>

                                    <div className="mt-3 space-y-2">
                                        {formData.anexos && formData.anexos.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="truncate max-w-[220px]">{file.name || file.filename || file.originalname || 'Arquivo'}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => window.open(getAnexoHref(file.path || file.url || ''), '_blank', 'noopener,noreferrer')}
                                                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                        title="Visualizar anexo"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = formData.anexos.filter((_, i) => i !== idx);
                                                            setFormData({...formData, anexos: updated});
                                                            // update local storage
                                                            if (isEditing && currentAtivoId) saveLocalAnexosForAtivo(currentAtivoId, updated);
                                                            else saveDraftAnexos(updated);
                                                        }}
                                                        className="p-1 text-red-500 hover:text-red-700 rounded transition-colors"
                                                        title="Remover anexo"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    type="submit"
                                    className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all"
                                >
                                    {isEditing ? 'Salvar Alterações' : 'Criar Ativo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
