import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaBuilding, 
    FaTimes, FaInfoCircle, FaMapMarkerAlt, FaEnvelope, FaPhone, FaFileAlt,
    FaPaperclip, FaEye
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Empresas = () => {
    const { user } = useAuth();
    const [empresas, setEmpresas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEmpresa, setCurrentEmpresa] = useState(null);

    // New: attachments viewer modal state
    const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
    const [attachmentsToShow, setAttachmentsToShow] = useState([]);

    const [formData, setFormData] = useState({
        nome: '', cnpj: '', endereco: '', email: '', telefone: '', parent_id: '', anexos: []
    });

    const [uploading, setUploading] = useState(false);
    const API_URL = '/api';

    // BACKEND_ORIGIN resolution (Vite env support)
    const VITE_BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ? import.meta.env.VITE_BACKEND_URL : null;
    const VITE_BACKEND_PORT = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_PORT) ? import.meta.env.VITE_BACKEND_PORT : null;

    let BACKEND_ORIGIN = window.location.origin;
    if (VITE_BACKEND_URL) {
        BACKEND_ORIGIN = VITE_BACKEND_URL;
    } else if (VITE_BACKEND_PORT) {
        BACKEND_ORIGIN = `${window.location.protocol}//${window.location.hostname}:${VITE_BACKEND_PORT}`;
    } else {
        BACKEND_ORIGIN = `${window.location.protocol}//${window.location.hostname}:5002`;
    }

    const getAnexoHref = (path) => {
        if (!path) return '#';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        if (path.startsWith('//')) return window.location.protocol + path;
        if (path.startsWith('/')) return `${BACKEND_ORIGIN}${path}`;
        return `${BACKEND_ORIGIN}/${path.replace(/^\/+/, '')}`;
    };

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }
            const response = await fetch(`${API_URL}/empresas`, { headers });
            if (response.ok) setEmpresas(await response.json());
        } catch (error) { console.error("Erro ao carregar empresas:", error); }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (empresa = null) => {
        if (empresa) {
            setIsEditing(true);
            setCurrentEmpresa(empresa);
            setFormData({
                nome: empresa.nome || '',
                cnpj: empresa.cnpj || '',
                endereco: empresa.endereco || '',
                email: empresa.email || '',
                telefone: empresa.telefone || '',
                parent_id: empresa.parent_id ? empresa.parent_id.toString() : '',
                anexos: empresa.anexos || []
            });
        } else {
            setIsEditing(false);
            setCurrentEmpresa(null);
            setFormData({
                nome: '', cnpj: '', endereco: '', email: '', telefone: '', parent_id: '', anexos: []
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
            const data = new FormData();
            data.append('file', file);
            try {
                const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: data });
                const result = await res.json();
                // backend should return { path: '/static/uploads/..' } or full url
                if (result.path || result.url) {
                    const path = result.path || result.url;
                    newAnexos.push({ name: file.name, path });
                } else if (result.filename) {
                    newAnexos.push({ name: file.name, path: result.filename });
                } else {
                    console.warn('Upload retornou formato inesperado:', result);
                }
            } catch (err) { console.error('Erro upload:', err); }
        }
        setFormData({ ...formData, anexos: newAnexos });
        setUploading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...formData,
            parent_id: formData.parent_id ? parseInt(formData.parent_id, 10) : null,
            anexos: formData.anexos
        };

        const method = isEditing ? 'PUT' : 'POST';
        const url = isEditing ? `${API_URL}/empresas/${currentEmpresa.id}` : `${API_URL}/empresas`;

        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setIsModalOpen(false);
                fetchData();
            } else {
                const data = await response.json();
                alert("Erro: " + (data.error || "Verifique os dados"));
            }
        } catch (error) { alert("Erro ao salvar empresa"); }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Deseja excluir esta empresa? Isso pode afetar registros vinculados.')) {
            try {
                const response = await fetch(`${API_URL}/empresas/${id}`, { method: 'DELETE' });
                if (response.ok) fetchData();
            } catch (error) { console.error("Erro ao excluir:", error); }
        }
    };

    // New: open attachments viewer from table or modal without editing
    const handleOpenAttachmentsModal = (anexos = []) => {
        setAttachmentsToShow(anexos || []);
        setIsAttachmentsModalOpen(true);
    };

    // Função para renderizar as opções do select com indentação visual (Árvore)
    const renderEmpresaOptions = () => {
        const buildTree = (parentId = null, level = 0) => {
            return empresas
                .filter(e => e.parent_id === parentId)
                // Evitar que uma empresa seja pai de si mesma na edição
                .filter(e => !isEditing || e.id !== currentEmpresa?.id)
                .flatMap(empresa => [
                    <option key={empresa.id} value={empresa.id.toString()}>
                        {'\u00A0'.repeat(level * 4)}{level > 0 ? '└─ ' : ''}{empresa.nome}
                    </option>,
                    ...buildTree(empresa.id, level + 1)
                ]);
        };
        return buildTree();
    };

    // Função auxiliar para pegar todos os IDs de sub-empresas para o filtro
    const getAllSubCompanyIds = useCallback((parentId) => {
        const ids = [parseInt(parentId, 10)];
        const children = empresas.filter(e => e.parent_id === parseInt(parentId, 10));
        children.forEach(child => {
            ids.push(...getAllSubCompanyIds(child.id));
        });
        return ids;
    }, [empresas]);

    const filteredEmpresas = useMemo(() => {
        return empresas.filter(e => {
            const matchesSearch = e.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (e.cnpj && e.cnpj.includes(searchTerm));
            
            let matchesFilter = true;
            if (empresaFilter !== 'Todas') {
                const allowedIds = getAllSubCompanyIds(empresaFilter);
                matchesFilter = allowedIds.includes(e.id);
            }
            
            return matchesSearch && matchesFilter;
        });
    }, [empresas, searchTerm, empresaFilter, getAllSubCompanyIds]);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FaBuilding className="text-indigo-600" /> Gestão de Empresas
                </h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <FaPlus /> Nova Empresa
                </button>
            </div>

            {/* Filtros com Hierarquia */}
            <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Pesquisar por nome ou CNPJ..." 
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
                    <option value="Todas">Todas as Empresas (Filtro Hierárquico)</option>
                    {renderEmpresaOptions()}
                </select>
            </div>

            {/* Tabela de Empresas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4">Empresa</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4">Localização/CNPJ</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredEmpresas.map(e => (
                            <tr key={e.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-gray-800 font-semibold flex items-center gap-2">
                                            <FaBuilding className="text-indigo-400" /> {e.nome}
                                        </span>
                                        {e.parent_id && (
                                            <span className="text-xs text-gray-500 italic">
                                                Sub-empresa de: {empresas.find(p => p.id === e.parent_id)?.nome}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600 space-y-1">
                                        {e.email && <p className="flex items-center gap-2"><FaEnvelope className="text-gray-400" size={12}/> {e.email}</p>}
                                        {e.telefone && <p className="flex items-center gap-2"><FaPhone className="text-gray-400" size={12}/> {e.telefone}</p>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600 space-y-1">
                                        {e.cnpj && <p className="flex items-center gap-2"><FaFileAlt className="text-gray-400" size={12}/> {e.cnpj}</p>}
                                        {e.endereco && <p className="flex items-center gap-2"><FaMapMarkerAlt className="text-gray-400" size={12}/> {e.endereco}</p>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 items-center">
                                        {/* New: quick view attachments button (doesn't open edit) */}
                                        {e.anexos && e.anexos.length > 0 && (
                                            <button
                                                onClick={() => handleOpenAttachmentsModal(e.anexos)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Ver Anexos"
                                                aria-label={`Ver anexos de ${e.nome}`}
                                            >
                                                <FaPaperclip />
                                            </button>
                                        )}

                                        <button onClick={() => handleOpenModal(e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                            <FaEdit />
                                        </button>
                                        <button onClick={() => handleDelete(e.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                            <FaTrashAlt />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Attachments viewer modal (opened from table or modal) */}
            {isAttachmentsModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h3 className="font-bold flex items-center gap-2"><FaPaperclip /> Anexos</h3>
                            <button onClick={() => setIsAttachmentsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><FaTimes /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {attachmentsToShow.length > 0 ? (
                                <div className="space-y-3">
                                    {attachmentsToShow.map((anexo, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                                    <FaFileAlt />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 truncate">{anexo.name || anexo.filename || 'Arquivo'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => window.open(getAnexoHref(anexo.path || anexo.url || ''), '_blank', 'noopener,noreferrer')}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
                                                    title="Visualizar/Baixar"
                                                >
                                                    <FaEye />
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

            {/* Modal (create / edit) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FaBuilding /> {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <FaTimes size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Nome da Empresa *</label>
                                    <input type="text" required className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">CNPJ</label>
                                    <input type="text" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Telefone</label>
                                    <input type="text" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">E-mail</label>
                                    <input type="email" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Endereço</label>
                                    <input type="text" className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.endereco} onChange={(e) => setFormData({...formData, endereco: e.target.value})} />
                                </div>

                                {/* Empresa mãe */}
                                <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase flex items-center gap-2">
                                        <FaBuilding className="text-indigo-600" /> Empresa Mãe (Hierarquia)
                                    </label>
                                    <select 
                                        className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" 
                                        value={formData.parent_id} 
                                        onChange={(e) => setFormData({...formData, parent_id: e.target.value})}
                                    >
                                        <option value="">Nenhuma (Empresa Principal)</option>
                                        {renderEmpresaOptions()}
                                    </select>
                                    <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                                        <FaInfoCircle /> Defina se esta empresa é uma filial ou departamento de outra.
                                    </p>
                                </div>

                                {/* Anexos */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Anexos</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-indigo-300 transition-colors relative">
                                        <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                                        <FaPaperclip className="mx-auto text-gray-400 mb-2" />
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
                                                        onClick={() => {
                                                            const url = getAnexoHref(file.path || file.url || '');
                                                            window.open(url, '_blank', 'noopener,noreferrer');
                                                        }}
                                                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                        title="Visualizar anexo"
                                                        aria-label={`Visualizar anexo ${file.name || file.filename || ''}`}
                                                    >
                                                        <FaEye />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, i) => i !== idx)})}
                                                        className="p-1 text-red-500 hover:text-red-700 rounded transition-colors"
                                                        title="Remover anexo"
                                                        aria-label={`Remover anexo ${file.name || file.filename || ''}`}
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                <button type="submit" className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-all">{isEditing ? 'Salvar Alterações' : 'Criar Empresa'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Empresas;
