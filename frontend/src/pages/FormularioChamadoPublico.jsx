import React, { useState, useEffect } from 'react';
import { X, Camera, AlertCircle, ChevronRight } from 'lucide-react';
import { useParams } from 'react-router-dom';

export default function FormularioChamadoPublico() {
    const { id } = useParams();
    const [formulario, setFormulario] = useState(null);
    const [empresa, setEmpresa] = useState(null);
    const [ativos, setAtivos] = useState([]);
    const [infraestruturas, setInfraestruturas] = useState([]);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        problema: '',
        descricao: '',
        item_id: '',
        fotos: [],
        opcoes_selecionadas: []
    });

    const API_BASE = "";

    const API_PREFIX = `${API_BASE}/api`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const resForm = await fetch(`${API_PREFIX}/formularios-chamado/${id}`);
                if (resForm.ok) {
                    const form = await resForm.json();
                    setFormulario(form);

                    const resEmp = await fetch(`${API_PREFIX}/empresas/${form.empresa_id}`);
                    if (resEmp.ok) {
                        const emp = await resEmp.json();
                        setEmpresa(emp);

                        if (form.tipo === 'maquinario') {
                            const resAtivos = await fetch(`${API_PREFIX}/ativos?empresa_id=${emp.id}`);
                            if (resAtivos.ok) {
                                const data = await resAtivos.json();
                                setAtivos(data.length ? data : data.ativos || []);
                            }
                        } else {
                            const resInfra = await fetch(`${API_PREFIX}/infraestruturas?empresa_id=${emp.id}`);
                            if (resInfra.ok) {
                                const data = await resInfra.json();
                                setInfraestruturas(data.length ? data : data.infraestruturas || []);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar dados:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id, API_PREFIX]);

    const handleAddFoto = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData(prev => ({
                    ...prev,
                    fotos: [...prev.fotos, event.target.result]
                }));
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveFoto = (idx) => {
        setFormData(prev => ({
            ...prev,
            fotos: prev.fotos.filter((_, i) => i !== idx)
        }));
    };

    const handleToggleOpcao = (opcao) => {
        setFormData(prev => ({
            ...prev,
            opcoes_selecionadas: prev.opcoes_selecionadas.includes(opcao)
                ? prev.opcoes_selecionadas.filter(o => o !== opcao)
                : [...prev.opcoes_selecionadas, opcao]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            titulo: formData.problema,
            descricao: formData.descricao,
            status: 'aberto',
            empresa_id: empresa.id,
            ativo_id: formulario.tipo === 'maquinario' ? parseInt(formData.item_id) : null,
            categoria_id: null,
            prioridade: 'normal',
            opcoes_selecionadas: formData.opcoes_selecionadas,
            fotos: formData.fotos
        };

        try {
            const res = await fetch(`${API_PREFIX}/chamados`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Chamado aberto com sucesso!');
                setFormData({
                    problema: '',
                    descricao: '',
                    item_id: '',
                    fotos: [],
                    opcoes_selecionadas: []
                });
            }
        } catch (error) {
            console.error("Erro ao abrir chamado:", error);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando...</p>
            </div>
        </div>
    );

    if (!formulario || !empresa) return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                <AlertCircle className="mx-auto text-red-600 mb-4" size={48} />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Acesso Inválido</h2>
                <p className="text-gray-600">Este formulário não foi encontrado ou expirou.</p>
            </div>
        </div>
    );

    const items = formulario.tipo === 'maquinario' ? ativos : infraestruturas;
    const itemLabel = formulario.tipo === 'maquinario' ? 'Maquinário' : 'Infraestrutura';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <h1 className="text-3xl font-bold mb-2">{formulario.nome}</h1>
                        <p className="text-blue-100">{empresa?.nome}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {/* Problema */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Qual é o problema? *</label>
                            <input 
                                type="text" required 
                                placeholder="Descreva o problema resumidamente" 
                                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                value={formData.problema} onChange={e => setFormData({...formData, problema: e.target.value})} 
                            />
                        </div>

                        {/* Item */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{itemLabel} *</label>
                            <select 
                                required 
                                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                value={formData.item_id} onChange={e => setFormData({...formData, item_id: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {items.map(item => (
                                    <option key={item.id} value={item.id.toString()}>
                                        {item.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Opções do Formulário */}
                        {formulario.opcoes.length > 0 && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">Selecione o(s) problema(s):</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {formulario.opcoes.map((opcao, idx) => (
                                        <label key={idx} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.opcoes_selecionadas.includes(opcao)}
                                                onChange={() => handleToggleOpcao(opcao)}
                                                className="w-4 h-4 text-blue-600 rounded"
                                            />
                                            <span className="ml-2 text-sm text-gray-700">{opcao}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Descrição */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Descrição adicional</label>
                            <textarea 
                                placeholder="Forneça mais detalhes sobre o problema..." 
                                rows="4"
                                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                                value={formData.descricao} onChange={e => setFormData({...formData, descricao: e.target.value})} 
                            />
                        </div>

                        {/* Fotos */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">Fotos do problema</label>
                            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors relative group">
                                <input 
                                    type="file" multiple accept="image/*" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                    onChange={handleAddFoto}
                                />
                                <Camera className="mx-auto text-blue-400 mb-2" size={32} />
                                <p className="text-sm text-gray-600">Clique ou arraste fotos aqui</p>
                            </div>

                            {formData.fotos.length > 0 && (
                                <div className="grid grid-cols-3 gap-4 mt-4">
                                    {formData.fotos.map((foto, idx) => (
                                        <div key={idx} className="relative group">
                                            <img src={foto} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveFoto(idx)}
                                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold shadow-lg transition-all active:scale-95">
                            Abrir Chamado
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
