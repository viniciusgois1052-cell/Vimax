import { openSecureFile } from '../utils/openSecureFile';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FaPlus, FaEdit, FaTrashAlt, FaSearch, FaBuilding,
    FaTimes, FaInfoCircle, FaMapMarkerAlt, FaEnvelope, FaPhone, FaFileAlt,
    FaPaperclip, FaEye
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Empresas = () => {
    const { user, can } = useAuth();
    const [empresas, setEmpresas] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [empresaFilter, setEmpresaFilter] = useState('Todas');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEmpresa, setCurrentEmpresa] = useState(null);

    const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
    const [attachmentsToShow, setAttachmentsToShow] = useState([]);

    const [formData, setFormData] = useState({
        nome: '', cnpj: '', endereco: '', email: '', telefone: '', parent_id: '', anexos: []
    });

    const [uploading, setUploading] = useState(false);
    const API_URL = '/api';
    const BACKEND_URL = "";

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) headers['X-API-Token'] = user.api_token;
            const response = await fetch(`${API_URL}/empresas`, { headers });
            if (response.ok) setEmpresas(await response.json());
        } catch (error) { console.error("Erro ao carregar empresas:", error); }
    }, [user, API_URL]);

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
            setFormData({ nome: '', cnpj: '', endereco: '', email: '', telefone: '', parent_id: '', anexos: [] });
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
                const res = await fetch(`${API_URL}/upload`, { method: 'POST', body: data, headers: (()=>{const t=(()=>{try{return JSON.parse(localStorage.getItem('user'))?.api_token;}catch{return null;}})(); return t?{'X-API-Token':t}:{};})() });
                const result = await res.json();
                if (result.path || result.url) {
                    newAnexos.push({ name: file.name, path: result.path || result.url });
                } else if (result.filename) {
                    newAnexos.push({ name: file.name, path: result.filename });
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
                headers: { 'Content-Type': 'application/json', ...(user?.api_token ? { 'X-API-Token': user.api_token } : {}) },
                body: JSON.stringify(payload),
            });
            if (response.ok) { setIsModalOpen(false); fetchData(); }
            else { const data = await response.json(); alert("Erro: " + (data.error || "Verifique os dados")); }
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

    const handleOpenAttachmentsModal = (anexos = []) => {
        setAttachmentsToShow(anexos || []);
        setIsAttachmentsModalOpen(true);
    };

    const renderEmpresaOptions = () => {
        const buildTree = (parentId = null, level = 0) => {
            return empresas
                .filter(e => e.parent_id === parentId)
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

    const getAllSubCompanyIds = useCallback((parentId) => {
        const ids = [parseInt(parentId, 10)];
        const children = empresas.filter(e => e.parent_id === parseInt(parentId, 10));
        children.forEach(child => { ids.push(...getAllSubCompanyIds(child.id)); });
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
                    <FaBuilding className="text-black" /> Gestão de Empresas
                </h1>
                {can('empresas', 'criar') && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-black hover:bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                    >
                        <FaPlus /> Nova Empresa
                    </button>
                )}
            </div>

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

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase font-bold">
                            <th className="px-6 py-4">ID</th>
                            <th className="px-6 py-4">Empresa</th>
                            <th className="px-6 py-4">Contato</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredEmpresas.map(e => (
                            <tr key={e.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <span className="text-gray-600 font-mono text-sm font-bold">{e.id}</span>
                                </td>
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
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 items-center">
                                        {e.anexos && e.anexos.length > 0 && (
                                            <button
                                                onClick={() => handleOpenAttachmentsModal(e.anexos)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Ver Anexos"
                                            >
                                                <FaPaperclip />
                                            </button>
                                        )}
                                        {can('empresas', 'editar') && (
                                            <button onClick={() => handleOpenModal(e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                                <FaEdit />
                                            </button>
                                        )}
                                        {can('empresas', 'excluir') && (
                                            <button onClick={() => handleDelete(e.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                                                <FaTrashAlt />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
                                                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><FaFileAlt /></div>
                                                <span className="text-sm font-medium text-gray-700 truncate">{anexo.name || anexo.filename || 'Arquivo'}</span>
                                            </div>
                                            <button onClick={() => openSecureFile(anexo.path || anexo.url)} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors">
                                                <FaEye />
                                            </button>
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

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-black text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2"><FaBuilding /> {isEditing ? 'Editar Empresa' : 'Nova Empresa'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><FaTimes size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nome da Empresa *</label>
                                    <input type="text" required className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">CNPJ</label>
                                    <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">E-mail</label>
                                    <input type="email" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Telefone</label>
                                    <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Empresa Pai</label>
                                    <select className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.parent_id} onChange={e => setFormData({...formData, parent_id: e.target.value})}>
                                        <option value="">Nenhuma (Empresa Principal)</option>
                                        {renderEmpresaOptions()}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Endereço</label>
                                <input type="text" className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} />
                            </div>
                            <div className="pt-4 border-t">
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Anexos</label>
                                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-indigo-300 transition-colors relative">
                                    <input type="file" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} disabled={uploading} />
                                    <FaPaperclip className="mx-auto text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-500">{uploading ? 'Enviando...' : 'Clique ou arraste arquivos para anexar'}</p>
                                </div>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {formData.anexos.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg text-sm border">
                                            <span className="truncate max-w-[180px] font-medium">{file.name || 'Arquivo'}</span>
                                            <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => openSecureFile(file.path || file.url)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"><FaEye size={14} /></button>
                                                <button type="button" onClick={() => setFormData({...formData, anexos: formData.anexos.filter((_, i) => i !== idx)})} className="p-1 text-red-500 hover:text-red-700 rounded transition-colors"><FaTimes size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                                <button type="submit" className="px-10 py-2 bg-black hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">Salvar Empresa</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Empresas;
