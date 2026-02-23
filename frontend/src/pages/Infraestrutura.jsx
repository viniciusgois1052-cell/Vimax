import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Plus, Trash2, Edit2, Wrench, MapPin, Building2, Calendar, 
    X, Search, FileText, Paperclip, Eye
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

    const [formData, setFormData] = useState({ 
        nome: '', descricao: '', 
        data_instalacao: '',
        empresa_id: '', localizacao_id: '', tipo_infraestrutura_id: '', 
        anexos: []
    });

    const [uploading, setUploading] = useState(false);
    const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
    const [attachmentsToShow, setAttachmentsToShow] = useState([]);

    // BACKEND / API base resolution (Vite-friendly)
    const API_BASE = window.location.origin.includes('5173') 
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;

    const API_PREFIX = `${API_BASE}/api`;
    const API_COLLECTION = `${API_PREFIX}/infraestruturas`;

    const getCollectionUrls = () => [API_COLLECTION, `${API_PREFIX}/infraestruturas/`];
    const getItemUrls = (id) => [
        `${API_PREFIX}/infraestruturas/${id}`,
        `${API_PREFIX}/infraestruturas/${id}/`
    ];

    const getAnexoHref = (path) => {
        if (!path) return '#';
        if (path.startsWith('http://' ) || path.startsWith('https://' )) return path;
        if (path.startsWith('//')) return window.location.protocol + path;
        
        let cleanPath = path;
        cleanPath = cleanPath.replace(/^\/+/, '');
        cleanPath = cleanPath.replace(/^static\/uploads\//, '');
        cleanPath = cleanPath.replace(/^uploads\//, '');
        
        return `${API_BASE}/static/uploads/${cleanPath}`;
    };

    // localStorage helpers
    const localKeyForInfra = (id) => `infraestrutura_anexos_${id}`;
    const localKeyDraft = 'infraestrutura_anexos_draft';

    const saveLocalAnexosForInfra = (id, anexos) => {
        try {
            localStorage.setItem(localKeyForInfra(id), JSON.stringify(anexos || []));
        } catch (e) { console.error('localStorage save error', e); }
    };
    const getLocalAnexosForInfra = (id) => {
        try {
            const v = localStorage.getItem(localKeyForInfra(id));
            return v ? JSON.parse(v) : [];
        } catch (e) { return []; }
    };
    const clearLocalAnexosForInfra = (id) => {
        try { localStorage.removeItem(localKeyForInfra(id)); } catch (e) {}
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

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';

            const [resInfra, resEmp, resLoc, resTipo] = await Promise.all([
                fetch(`${getCollectionUrls()[0]}${queryParams}`, { headers }),
                fetch(`${API_PREFIX}/empresas/`, { headers }),
                fetch(`${API_PREFIX}/localizacoes/${queryParams}`, { headers }),
                fetch(`${API_PREFIX}/tipos-infraestrutura/`, { headers })
            ]);
            
            let infraData = [];
            if (resInfra.ok) {
                const data = await resInfra.json();
                infraData = data.infraestruturas || data;
            }
            if (resEmp.ok) setEmpresas(await resEmp.json());
            if (resLoc.ok) setLocalizacoes(await resLoc.json());
            if (resTipo.ok) setTiposInfra(await resTipo.json());

            // Merge any locally stored attachments
            const merged = infraData.map(i => {
                const local = getLocalAnexosForInfra(i.id);
                if (!local || local.length === 0) return i;
                const serverAnexos = Array.isArray(i.anexos) ? i.anexos : [];
                const paths = new Set(serverAnexos.map(x => x.path));
                const toAdd = local.filter(x => !paths.has(x.path));
                return { ...i, anexos: [...serverAnexos, ...toAdd] };
            });
            setInfraestrutura(merged);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }, [user, selectedEntity, API_PREFIX]);

    useEffect(() => { fetchData(); }, [fetchData]);

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

    const handleOpenModal = (infra = null) => {
        if (infra) {
            setIsEditing(true);
            setCurrentInfraId(infra.id);
            const local = getLocalAnexosForInfra(infra.id);
            const serverAnexos = Array.isArray(infra.anexos) ? infra.anexos : [];
            const paths = new Set(serverAnexos.map(x => x.path));
            const merged = [...serverAnexos, ...local.filter(x => !paths.has(x.path))];

            setFormData({
                nome: infra.nome || '',
                descricao: infra.descricao || '',
                data_instalacao: infra.data_instalacao || '',
                empresa_id: infra.empresa_id?.toString() || '',
                localizacao_id: infra.localizacao_id?.toString() || 'none',
                tipo_infraestrutura_id: infra.tipo_infraestrutura_id?.toString() || '',
                anexos: merged
            });
        } else {
            setIsEditing(false);
            setCurrentInfraId(null);
            const draft = getDraftAnexos();
            setFormData({ 
                nome: '', descricao: '', 
                data_instalacao: '',
                empresa_id: '', localizacao_id: 'none', tipo_infraestrutura_id: '', 
                anexos: draft || []
            });
        }
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setUploading(true);
        const newAnexos = [...formData.anexos];
        for (const file of files) {
            const fData = new FormData();
            fData.append('file', file);
            try {
                const res = await fetch(`${API_BASE}/api/upload`, { 
                    method: 'POST', 
                    body: fData 
                });
                if (res.ok) {
                    const data = await res.json();
                    newAnexos.push({
                        name: file.name,
                        filename: data.filename,
                        path: data.path,
                        url: data.url
                    });
                }
            } catch (err) { console.error('Upload error', err); }
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
            
            if (!res.ok && (res.status === 405 || res.status === 404)) {
                res = await fetch(urls[1], { method, headers, body: JSON.stringify(payload) });
            }

            if (res.ok) {
                if (isEditing && currentInfraId) clearLocalAnexosForInfra(currentInfraId);
                else clearDraftAnexos();
                setIsModalOpen(false);
                fetchData();
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir esta infraestrutura?')) return;
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        const urls = getItemUrls(id);
        try {
            let res = await fetch(urls[0], { method: 'DELETE', headers });
            if (!res.ok && (res.status === 405 || res.status === 404)) {
                res = await fetch(urls[1], { method: 'DELETE', headers });
            }
            if (res.ok) {
                clearLocalAnexosForInfra(id);
                fetchData();
            }
        } catch (error) { console.error("Erro ao excluir:", error); }
    };

    const handleOpenAttachments = (anexos) => {
        setAttachmentsToShow(anexos || []);
        setIsAttachmentsModalOpen(true);
    };

    const filteredInfra = useMemo(() => {
        return infraestruturas.filter(i => {
            const matchesSearch = i.nome.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesEmpresa = true;
            if (empresaFilter !== 'Todas') {
                matchesEmpresa = i.empresa_id === parseInt(empresaFilter);
            }
            
            let matchesLocal = true;
            if (localizacaoFilter !== 'Todas') {
                matchesLocal = i.localizacao_id === parseInt(localizacaoFilter);
            }
            
            return matchesSearch && matchesEmpresa && matchesLocal;
        });
    }, [infraestruturas, searchTerm, empresaFilter, localizacaoFilter]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Wrench className="text-orange-600" /> Gestão de Infraestrutura
                </h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <Plus size={20} /> Nova Infraestrutura
                </button>
            </div>

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por nome..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    value={empresaFilter}
                    onChange={(e) => setEmpresaFilter(e.target.value)}
                >
                    <option value="Todas">Todas as Empresas</option>
                    {renderHierarchicalOptions(empresas)}
                </select>
                <select 
                    className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                    value={localizacaoFilter}
                    onChange={(e) => setLocalizacaoFilter(e.target.value)}
                >
                    <option value="Todas">Todas as Localizações</option>
                    {renderGroupedLocalizacoes()}
                </select>
            </div>

            {/* Grid de Infraestruturas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredInfra.map(i => (
                    <Card key={i.id} className="hover:shadow-md transition-shadow border-gray-200 group">
                        <CardContent className="p-0">
                            <div className="p-5 border-b border-gray-100 bg-white">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                        <Wrench size={18} className="text-orange-500" /> {i.nome}
                                    </h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleOpenModal(i)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(i.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-sm text-gray-600">
                                    {i.tipo_nome && <p className="flex items-center gap-2"><Wrench size={14} className="text-gray-400" /> Tipo: <span className="font-semibold text-orange-600">{i.tipo_nome}</span></p>}
                                    <p className="flex items-center gap-2"><Building2 size={14} className="text-gray-400" /> {i.empresa_nome}</p>
                                    <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {i.localizacao_nome || 'N/A'}</p>
                                    {i.descricao && <p className="text-xs italic text-gray-500">{i.descricao}</p>}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50/50 flex justify-between items-center">
                                <div className="flex gap-3">
                                    {i.data_instalacao && (
                                        <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                            <Calendar size={12} /> {new Date(i.data_instalacao).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                
                                {i.anexos && i.anexos.length > 0 && (
                                    <button 
                                        onClick={() => handleOpenAttachments(i.anexos)}
                                        className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
                                    >
                                        <Paperclip size={12} /> {i.anexos.length}
                                    </button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal de Anexos */}
            {isAttachmentsModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-orange-600 text-white">
                            <h3 className="font-bold flex items-center gap-2"><Paperclip size={18} /> Anexos</h3>
                            <button onClick={() => setIsAttachmentsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {attachmentsToShow.map((anexo, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-orange-200 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><FileText size={16} /></div>
                                        <span className="text-sm font-medium text-gray-700 truncate">{anexo.name || anexo.filename || 'Arquivo'}</span>
                                    </div>
                                    <button 
                                        onClick={() => window.open(getAnexoHref(anexo.path || anexo.url), '_blank')}
                                        className="p-2 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </div>
                            ))}
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-orange-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Wrench size={24} /> {isEditing ? 'Editar Infraestrutura' : 'Nova Infraestrutura'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Seção 1: Identificação */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Identificação</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nome da Infraestrutura *</label>
                                        <input 
                                            type="text" required 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" 
                                            value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Descrição</label>
                                        <textarea 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" 
                                            value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})}
                                            rows="3"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Data Instalação</label>
                                        <input 
                                            type="date" 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" 
                                            value={formData.data_instalacao} onChange={e => setFormData({...formData, data_instalacao: e.target.value})} 
                                        />
                                    </div>
                                </div>

                                {/* Seção 2: Vínculos */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Vínculos</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Tipo de Infraestrutura</label>
                                        <select 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" 
                                            value={formData.tipo_infraestrutura_id} onChange={e => setFormData({...formData, tipo_infraestrutura_id: e.target.value})}
                                        >
                                            <option value="">Selecione...</option>
                                            {tiposInfra.map(t => <option key={t.id} value={t.id.toString()}>{t.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Empresa / Clínica *</label>
                                        <select 
                                            required 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" 
                                            value={formData.empresa_id} onChange={e => setFormData({...formData, empresa_id: e.target.value})}
                                        >
                                            <option value="">Selecione...</option>
                                            {renderHierarchicalOptions(empresas)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Localização</label>
                                        <select 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-orange-500" 
                                            value={formData.localizacao_id} onChange={e => setFormData({...formData, localizacao_id: e.target.value})}
                                        >
                                            <option value="none">Nenhuma</option>
                                            {renderGroupedLocalizacoes()}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Seção 3: Anexos */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Anexos e Documentos</h3>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-300 transition-colors relative group">
                                    <input 
                                        type="file" multiple 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                    <Paperclip className="mx-auto text-gray-400 group-hover:text-orange-500 mb-2 transition-colors" size={24} />
                                    <p className="text-sm text-gray-500">{uploading ? 'Enviando arquivos...' : 'Clique ou arraste arquivos para anexar'}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {formData.anexos.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-white rounded-lg shadow-sm text-orange-500"><FileText size={14} /></div>
                                                <span className="text-sm font-medium text-gray-700 truncate">{file.name || file.filename}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button type="button" onClick={() => window.open(getAnexoHref(file.path || file.url), '_blank')} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"><Eye size={16} /></button>
                                                <button type="button" onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, i) => i !== idx)})} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
                                <button type="submit" disabled={uploading} className="px-12 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50">
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
