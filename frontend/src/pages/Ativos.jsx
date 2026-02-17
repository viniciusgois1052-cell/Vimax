import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Plus, Trash2, Edit2, Box, MapPin, Building2, Zap, Hash, Calendar, 
    User, FileText, ShoppingCart, X, Search, Filter, Info, Paperclip, Eye, QrCode, Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
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
    
    const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
    const [qrCodeData, setQrCodeData] = useState(null);

    // BACKEND / API base resolution (Vite-friendly)
    const API_BASE = window.location.origin.includes('5173') 
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;

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
        if (path.startsWith('http://' ) || path.startsWith('https://' )) return path;
        if (path.startsWith('//')) return window.location.protocol + path;
        
        // Garante que o anexo aponte para o servidor (API_BASE) e não para o frontend
        let cleanPath = path;
        cleanPath = cleanPath.replace(/^\/+/, ''); // remove barras no início
        cleanPath = cleanPath.replace(/^static\/uploads\//, ''); // remove static/uploads/ se já existir
        cleanPath = cleanPath.replace(/^uploads\//, ''); // remove uploads/ se já existir
        
        return `${API_BASE}/static/uploads/${cleanPath}`;
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
        }
    }, [user, selectedEntity, API_PREFIX]);

    useEffect(() => { fetchData(); }, [fetchData]);

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
        if (isEditing && currentAtivoId) saveLocalAnexosForAtivo(currentAtivoId, newAnexos);
        else saveDraftAnexos(newAnexos);
        setUploading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            empresa_id: formData.empresa_id ? parseInt(formData.empresa_id) : null,
            localizacao_id: formData.localizacao_id === 'none' ? null : parseInt(formData.localizacao_id),
            fornecedor_id: formData.fornecedor_id === 'none' ? null : parseInt(formData.fornecedor_id),
            contrato_id: formData.contrato_id === 'none' ? null : parseInt(formData.contrato_id),
            orcamento_id: formData.orcamento_id === 'none' ? null : parseInt(formData.orcamento_id),
            anexos: formData.anexos // sending the list of {name, filename, path, url}
        };

        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;

        const urls = isEditing ? getItemUrls(currentAtivoId) : getCollectionUrls();
        const method = isEditing ? 'PUT' : 'POST';

        try {
            // try first URL variant
            let res = await fetch(urls[0], { method, headers, body: JSON.stringify(payload) });
            
            // if 405 or 404 on first variant, try second
            if (!res.ok && (res.status === 405 || res.status === 404)) {
                res = await fetch(urls[1], { method, headers, body: JSON.stringify(payload) });
            }

            if (res.ok) {
                if (isEditing && currentAtivoId) clearLocalAnexosForAtivo(currentAtivoId);
                else clearDraftAnexos();
                setIsModalOpen(false);
                fetchData();
            } else {
                // If backend refuses update but it's just a 405 (Method Not Allowed), 
                // we keep changes locally for this session.
                if (isEditing && res.status === 405) {
                    setIsModalOpen(false);
                }
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir este ativo?')) return;
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        const urls = getItemUrls(id);
        try {
            let res = await fetch(urls[0], { method: 'DELETE', headers });
            if (!res.ok && (res.status === 405 || res.status === 404)) {
                res = await fetch(urls[1], { method: 'DELETE', headers });
            }
            if (res.ok) {
                clearLocalAnexosForAtivo(id);
                fetchData();
            }
        } catch (error) { console.error("Erro ao excluir:", error); }
    };

    const handleOpenAttachments = (anexos) => {
        setAttachmentsToShow(anexos || []);
        setIsAttachmentsModalOpen(true);
    };

    const handleOpenQRCode = (ativo) => {
        const publicUrl = `${window.location.origin}/abrir-chamado/${ativo.id}`;
        setQrCodeData({
            url: publicUrl,
            nome: ativo.nome,
            sn: ativo.numero_serie,
            clinica: ativo.empresa_nome,
            local: ativo.localizacao_nome
        });
        setIsQRCodeModalOpen(true);
    };

    const handlePrintQRCode = () => {
        const printContent = document.getElementById('qrcode-print-area');
        const svgElement = printContent.querySelector('svg');
        
        // Clone the element to avoid modifying the UI
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Imprimir Etiqueta - ${qrCodeData.nome}</title>
                    <style>
                        body { 
                            font-family: 'Courier New', Courier, monospace; 
                            display: flex; 
                            flex-direction: column; 
                            align-items: center; 
                            justify-content: center; 
                            padding: 20px;
                            text-align: center;
                        }
                        .container { border: 1px solid #eee; padding: 20px; border-radius: 10px; }
                        h2 { margin: 10px 0; font-size: 18px; }
                        p { margin: 2px 0; font-size: 12px; color: #666; }
                        .qr-container { margin: 15px 0; }
                        @media print {
                            body { padding: 0; }
                            .container { border: none; }
                            button { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="qr-container">
                            ${svgElement.outerHTML}
                        </div>
                        <h2>${qrCodeData.nome}</h2>
                        <p>S/N: ${qrCodeData.sn || 'N/A'}</p>
                        <p><strong>${qrCodeData.clinica}</strong></p>
                        <p>${qrCodeData.local || 'N/A'}</p>
                    </div>
                    <script>
                        window.onload = () => {
                            window.print();
                            window.onafterprint = () => window.close();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredAtivos = useMemo(() => {
        return ativos.filter(a => {
            const matchesSearch = a.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (a.numero_serie && a.numero_serie.toLowerCase().includes(searchTerm.toLowerCase()));
            
            let matchesEmpresa = true;
            if (empresaFilter !== 'Todas') {
                matchesEmpresa = a.empresa_id === parseInt(empresaFilter);
            }
            
            let matchesLocal = true;
            if (localizacaoFilter !== 'Todas') {
                matchesLocal = a.localizacao_id === parseInt(localizacaoFilter);
            }
            
            return matchesSearch && matchesEmpresa && matchesLocal;
        });
    }, [ativos, searchTerm, empresaFilter, localizacaoFilter]);

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

            {/* Filtros */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por nome ou S/N..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={empresaFilter}
                    onChange={(e) => setEmpresaFilter(e.target.value)}
                >
                    <option value="Todas">Todas as Empresas</option>
                    {renderHierarchicalOptions(empresas)}
                </select>
                <select 
                    className="p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    value={localizacaoFilter}
                    onChange={(e) => setLocalizacaoFilter(e.target.value)}
                >
                    <option value="Todas">Todas as Localizações</option>
                    {renderGroupedLocalizacoes()}
                </select>
            </div>

            {/* Grid de Ativos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAtivos.map(a => (
                    <Card key={a.id} className="hover:shadow-md transition-shadow border-gray-200 group relative overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-5 border-b border-gray-100 bg-white">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                        <Box size={18} className="text-indigo-500" /> {a.nome}
                                    </h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => handleOpenQRCode(a)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="QR Code">
                                            <QrCode size={16} />
                                        </button>
                                        <button onClick={() => handleOpenModal(a)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(a.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-sm text-gray-600">
                                    <p className="flex items-center gap-2"><Hash size={14} className="text-gray-400" /> S/N: <span className="font-mono text-xs">{a.numero_serie || 'N/A'}</span></p>
                                    <p className="flex items-center gap-2"><Building2 size={14} className="text-gray-400" /> {a.empresa_nome}</p>
                                    <p className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {a.localizacao_nome || 'N/A'}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50/50 flex justify-between items-center">
                                <div className="flex gap-3">
                                    {a.voltagem_entrada && (
                                        <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                                            <Zap size={12} /> {a.voltagem_entrada}
                                        </span>
                                    )}
                                    {a.data_aquisicao && (
                                        <span className="flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                            <Calendar size={12} /> {new Date(a.data_aquisicao).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                
                                {a.anexos && a.anexos.length > 0 && (
                                    <button 
                                        onClick={() => handleOpenAttachments(a.anexos)}
                                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                                    >
                                        <Paperclip size={12} /> {a.anexos.length} Anexos
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
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h3 className="font-bold flex items-center gap-2"><Paperclip size={18} /> Anexos</h3>
                            <button onClick={() => setIsAttachmentsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                            {attachmentsToShow.map((anexo, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><FileText size={16} /></div>
                                        <span className="text-sm font-medium text-gray-700 truncate">{anexo.name || anexo.filename || 'Arquivo'}</span>
                                    </div>
                                    <button 
                                        onClick={() => window.open(getAnexoHref(anexo.path || anexo.url), '_blank')}
                                        className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
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

            {/* Modal de QR Code */}
            {isQRCodeModalOpen && qrCodeData && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-gray-800">Etiqueta do Ativo</h3>
                            <button onClick={() => setIsQRCodeModalOpen(false)} className="p-1 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        
                        <div id="qrcode-print-area" className="bg-white p-4 border rounded-xl inline-block">
                            <QRCodeSVG value={qrCodeData.url} size={180} />
                            <div className="mt-4 text-left">
                                <h4 className="font-bold text-gray-900 m-0">{qrCodeData.nome}</h4>
                                <p className="text-xs text-gray-500 m-0">S/N: {qrCodeData.sn || 'N/A'}</p>
                                <p className="text-xs font-bold text-gray-700 m-0 mt-1 uppercase">{qrCodeData.clinica}</p>
                                <p className="text-[10px] text-gray-400 m-0 italic">{qrCodeData.local || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handlePrintQRCode} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95">
                                <Printer size={18} /> Imprimir
                            </button>
                            <button onClick={() => setIsQRCodeModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 rounded-lg font-bold transition-all">
                                Fechar
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 break-all">{qrCodeData.url}</p>
                    </div>
                </div>
            )}

            {/* Modal de Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Box size={24} /> {isEditing ? 'Editar Ativo' : 'Novo Ativo'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={28} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Seção 1: Identificação */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Identificação</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nome do Ativo *</label>
                                        <input 
                                            type="text" required 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                            value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} 
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nº de Série</label>
                                            <input 
                                                type="text" 
                                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                                value={formData.numero_serie} onChange={e => setFormData({...formData, numero_serie: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Voltagem</label>
                                            <input 
                                                type="text" placeholder="ex: 220V"
                                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                                value={formData.voltagem_entrada} onChange={e => setFormData({...formData, voltagem_entrada: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Data Aquisição</label>
                                            <input 
                                                type="date" 
                                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                                value={formData.data_aquisicao} onChange={e => setFormData({...formData, data_aquisicao: e.target.value})} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Data Inativação</label>
                                            <input 
                                                type="date" 
                                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                                value={formData.data_inativacao} onChange={e => setFormData({...formData, data_inativacao: e.target.value})} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Seção 2: Vínculos */}
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Vínculos</h3>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Empresa / Clínica *</label>
                                        <select 
                                            required 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                            value={formData.empresa_id} onChange={e => setFormData({...formData, empresa_id: e.target.value})}
                                        >
                                            <option value="">Selecione...</option>
                                            {renderHierarchicalOptions(empresas)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Localização Interna</label>
                                        <select 
                                            className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                            value={formData.localizacao_id} onChange={e => setFormData({...formData, localizacao_id: e.target.value})}
                                        >
                                            <option value="none">Nenhuma</option>
                                            {renderGroupedLocalizacoes()}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Fornecedor</label>
                                            <select 
                                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                                                value={formData.fornecedor_id} onChange={e => setFormData({...formData, fornecedor_id: e.target.value})}
                                            >
                                                <option value="none">Nenhum</option>
                                                {fornecedores.map(f => <option key={f.id} value={f.id.toString()}>{f.nome}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Contrato</label>
                                            <select 
                                                className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" 
                                                value={formData.contrato_id} onChange={e => setFormData({...formData, contrato_id: e.target.value})}
                                            >
                                                <option value="none">Nenhum</option>
                                                {contratos.map(c => <option key={c.id} value={c.id.toString()}>#{c.numero}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Seção 3: Anexos */}
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Anexos e Documentos</h3>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors relative group">
                                    <input 
                                        type="file" multiple 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                    />
                                    <Paperclip className="mx-auto text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" size={24} />
                                    <p className="text-sm text-gray-500">{uploading ? 'Enviando arquivos...' : 'Clique ou arraste arquivos para anexar (Manuais, Fotos, Notas)'}</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {formData.anexos.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-500"><FileText size={14} /></div>
                                                <span className="text-sm font-medium text-gray-700 truncate">{file.name || file.filename}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button type="button" onClick={() => window.open(getAnexoHref(file.path || file.url), '_blank')} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"><Eye size={16} /></button>
                                                <button type="button" onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, i) => i !== idx)})} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"><X size={16} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
                                <button type="submit" disabled={uploading} className="px-12 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50">
                                    {isEditing ? 'Salvar Alterações' : 'Cadastrar Ativo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
