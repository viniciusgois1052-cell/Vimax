import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, FileText, X } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';

export default function FormularioChamadoAdmin() {
    const { user } = useAuth();
    const [formularios, setFormularios] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [ativos, setAtivos] = useState([]);
    const [infraestruturas, setInfraestruturas] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentFormId, setCurrentFormId] = useState(null);
    
    const [formData, setFormData] = useState({
        nome: '',
        tipo: 'maquinario',
        empresa_id: '',
        ativo_id: '',
        infraestrutura_id: '',
        opcoes: []
    });
    
    const [novaOpcao, setNovaOpcao] = useState('');

    const API_BASE = window.location.origin.includes('5173') 
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;

    const API_PREFIX = `${API_BASE}/api`;

    const fetchData = useCallback(async () => {
        try {
            const headers = {};
            if (user?.api_token) {
                headers['X-API-Token'] = user.api_token;
            }

            const [resForm, resEmp, resAtivos, resInfras] = await Promise.all([
                fetch(`${API_PREFIX}/formularios-chamado/`, { headers }),
                fetch(`${API_PREFIX}/empresas/`, { headers }),
                fetch(`${API_PREFIX}/ativos/`, { headers }),
                fetch(`${API_PREFIX}/infraestruturas/`, { headers })
            ]);
            
            if (resForm.ok) setFormularios(await resForm.json());
            if (resEmp.ok) setEmpresas(await resEmp.json());
            if (resAtivos.ok) {
                const ativosData = await resAtivos.json();
                setAtivos(Array.isArray(ativosData) ? ativosData : []);
            }
            if (resInfras.ok) {
                const infrasData = await resInfras.json();
                setInfraestruturas(Array.isArray(infrasData.infraestruturas) ? infrasData.infraestruturas : (Array.isArray(infrasData) ? infrasData : []));
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }, [user, API_PREFIX]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenModal = (form = null) => {
        if (form) {
            setIsEditing(true);
            setCurrentFormId(form.id);
            setFormData({
                nome: form.nome,
                tipo: form.tipo,
                empresa_id: form.empresa_id.toString(),
                ativo_id: form.ativo_id ? form.ativo_id.toString() : '',
                infraestrutura_id: form.infraestrutura_id ? form.infraestrutura_id.toString() : '',
                opcoes: form.opcoes || []
            });
        } else {
            setIsEditing(false);
            setCurrentFormId(null);
            setFormData({
                nome: '',
                tipo: 'maquinario',
                empresa_id: '',
                ativo_id: '',
                infraestrutura_id: '',
                opcoes: []
            });
        }
        setNovaOpcao('');
        setIsModalOpen(true);
    };

    const handleAddOpcao = () => {
        if (novaOpcao.trim()) {
            setFormData({
                ...formData,
                opcoes: [...formData.opcoes, novaOpcao.trim()]
            });
            setNovaOpcao('');
        }
    };

    const handleRemoveOpcao = (idx) => {
        setFormData({
            ...formData,
            opcoes: formData.opcoes.filter((_, i) => i !== idx)
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validação: deve ter ativo_id se tipo for maquinario, ou infraestrutura_id se for infraestrutura
        if (formData.tipo === 'maquinario' && !formData.ativo_id) {
            alert('Selecione um Ativo para formulários de Maquinário');
            return;
        }
        if (formData.tipo === 'infraestrutura' && !formData.infraestrutura_id) {
            alert('Selecione uma Infraestrutura para formulários de Infraestrutura');
            return;
        }

        const payload = {
            nome: formData.nome,
            tipo: formData.tipo,
            empresa_id: parseInt(formData.empresa_id),
            ativo_id: formData.tipo === 'maquinario' && formData.ativo_id ? parseInt(formData.ativo_id) : null,
            infraestrutura_id: formData.tipo === 'infraestrutura' && formData.infraestrutura_id ? parseInt(formData.infraestrutura_id) : null,
            opcoes: formData.opcoes
        };

        const headers = { 'Content-Type': 'application/json' };
        if (user?.api_token) headers['X-API-Token'] = user.api_token;

        const url = isEditing 
            ? `${API_PREFIX}/formularios-chamado/${currentFormId}`
            : `${API_PREFIX}/formularios-chamado`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (res.ok) {
                setIsModalOpen(false);
                fetchData();
            } else {
                alert('Erro ao salvar formulário');
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
            alert('Erro ao salvar formulário');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Excluir este formulário?')) return;
        const headers = {};
        if (user?.api_token) headers['X-API-Token'] = user.api_token;
        
        try {
            const res = await fetch(`${API_PREFIX}/formularios-chamado/${id}`, { method: 'DELETE', headers });
            if (res.ok) {
                fetchData();
            }
        } catch (error) { console.error("Erro ao excluir:", error); }
    };

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

    // Filtrar ativos e infraestruturas por empresa selecionada
    const ativosFiltered = formData.empresa_id 
        ? ativos.filter(a => a.empresa_id.toString() === formData.empresa_id)
        : [];
    
    const infrasFiltered = formData.empresa_id 
        ? infraestruturas.filter(i => i.empresa_id.toString() === formData.empresa_id)
        : [];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-blue-600" /> Formulários de Chamado
                </h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                >
                    <Plus size={20} /> Novo Formulário
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {formularios.map(form => (
                    <Card key={form.id} className="hover:shadow-md transition-shadow border-gray-200">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{form.nome}</h3>
                                    <p className="text-xs text-gray-500 uppercase font-bold mt-1">
                                        {form.tipo === 'maquinario' ? '🔧 Maquinário' : '🏗️ Infraestrutura'}
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => handleOpenModal(form)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(form.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{form.empresa_nome}</p>
                            <p className="text-sm text-gray-600 mb-3">
                                {form.tipo === 'maquinario' 
                                    ? `🔧 ${form.ativo_nome || 'Ativo não especificado'}`
                                    : `🏗️ ${form.infraestrutura_nome || 'Infraestrutura não especificada'}`
                                }
                            </p>
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-500">Problemas:</p>
                                <div className="flex flex-wrap gap-2">
                                    {form.opcoes.map((op, idx) => (
                                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                            {op}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <FileText size={24} /> {isEditing ? 'Editar Formulário' : 'Novo Formulário'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full"><X size={28} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Nome do Formulário *</label>
                                <input 
                                    type="text" required 
                                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                    value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} 
                                    placeholder="Ex: Problemas da Máquina X"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Empresa *</label>
                                <select 
                                    required 
                                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                    value={formData.empresa_id} onChange={e => setFormData({...formData, empresa_id: e.target.value, ativo_id: '', infraestrutura_id: ''})}
                                >
                                    <option value="">Selecione...</option>
                                    {renderHierarchicalOptions(empresas)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Tipo *</label>
                                <select 
                                    required 
                                    className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                    value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value, ativo_id: '', infraestrutura_id: ''})}
                                >
                                    <option value="maquinario">🔧 Maquinário</option>
                                    <option value="infraestrutura">🏗️ Infraestrutura</option>
                                </select>
                            </div>

                            {/* ✅ NOVO: Seleção de Ativo ou Infraestrutura */}
                            {formData.tipo === 'maquinario' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Ativo / Máquina *</label>
                                    <select 
                                        required 
                                        className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                        value={formData.ativo_id} onChange={e => setFormData({...formData, ativo_id: e.target.value})}
                                    >
                                        <option value="">Selecione um ativo...</option>
                                        {ativosFiltered.map(ativo => (
                                            <option key={ativo.id} value={ativo.id.toString()}>
                                                {ativo.nome} ({ativo.numero_serie || 'S/N'})
                                            </option>
                                        ))}
                                    </select>
                                    {formData.empresa_id && ativosFiltered.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">Nenhum ativo cadastrado para esta empresa</p>
                                    )}
                                </div>
                            )}

                            {formData.tipo === 'infraestrutura' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Infraestrutura *</label>
                                    <select 
                                        required 
                                        className="w-full p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                        value={formData.infraestrutura_id} onChange={e => setFormData({...formData, infraestrutura_id: e.target.value})}
                                    >
                                        <option value="">Selecione uma infraestrutura...</option>
                                        {infrasFiltered.map(infra => (
                                            <option key={infra.id} value={infra.id.toString()}>
                                                {infra.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.empresa_id && infrasFiltered.length === 0 && (
                                        <p className="text-xs text-red-500 mt-1">Nenhuma infraestrutura cadastrada para esta empresa</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">Problemas / Opções</label>
                                <div className="flex gap-2 mb-3">
                                    <input 
                                        type="text" 
                                        placeholder="Digite um problema..." 
                                        className="flex-1 p-2.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                        value={novaOpcao} onChange={e => setNovaOpcao(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddOpcao()}
                                    />
                                    <button type="button" onClick={handleAddOpcao} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all">
                                        Adicionar
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {formData.opcoes.map((op, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            <span className="text-sm font-medium text-gray-700">{op}</span>
                                            <button type="button" onClick={() => handleRemoveOpcao(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all">Cancelar</button>
                                <button type="submit" className="px-12 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all active:scale-95">
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
