import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../apiFetch';
import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function CategoriasChamado() {
    const { user, can } = useAuth();
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editando, setEditando] = useState(null);
    const [formData, setFormData] = useState({ nome: '', descricao: '', ativo: true });
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    // Carregar categorias
    useEffect(() => {
        fetchCategorias();
    }, []);

    const fetchCategorias = async () => {
        setLoading(true);
        try {
            const response = await apiFetch('/api/categorias-chamado');
            if (response.ok) {
                setCategorias(await response.json());
            }
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            setErro('Erro ao carregar categorias');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');
        setSucesso('');

        if (!formData.nome.trim()) {
            setErro('Nome é obrigatório');
            return;
        }

        try {
            const url = editando ? `/api/categorias-chamado/${editando.id}` : '/api/categorias-chamado';
            const method = editando ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...(user?.api_token ? { 'X-API-Token': user.api_token } : {}) },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSucesso(editando ? 'Categoria atualizada!' : 'Categoria criada!');
                setFormData({ nome: '', descricao: '', ativo: true });
                setEditando(null);
                fetchCategorias();
            } else {
                const data = await response.json();
                setErro(data.erro || 'Erro ao salvar categoria');
            }
        } catch (error) {
            console.error('Erro:', error);
            setErro('Erro ao salvar categoria');
        }
    };

    const handleEdit = (categoria) => {
        setEditando(categoria);
        setFormData(categoria);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja deletar esta categoria?')) return;

        try {
            const response = await apiFetch(`/api/categorias-chamado/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setSucesso('Categoria deletada!');
                fetchCategorias();
            }
        } catch (error) {
            console.error('Erro:', error);
            setErro('Erro ao deletar categoria');
        }
    };

    const handleCancel = () => {
        setEditando(null);
        setFormData({ nome: '', descricao: '', ativo: true });
        setErro('');
    };

    return (
        <div className="space-y-6 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Categorias de Chamados</h1>
                <p className="text-muted-foreground">Gerencie as categorias de chamados do sistema</p>
            </div>

            {erro && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {erro}
                </div>
            )}

            {sucesso && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                    {sucesso}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{editando ? 'Editar Categoria' : 'Nova Categoria'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Nome *</label>
                            <input
                                type="text"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Ex: Manutenção Preventiva"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Descrição</label>
                            <textarea
                                value={formData.descricao || ''}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Descrição da categoria..."
                                rows="3"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="ativo"
                                checked={formData.ativo}
                                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                                className="w-4 h-4 rounded border-border"
                            />
                            <label htmlFor="ativo" className="text-sm font-medium text-foreground">
                                Ativo
                            </label>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
                            >
                                <Check className="w-4 h-4" />
                                {editando ? 'Atualizar' : 'Criar'}
                            </button>
                            {editando && (
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
                                >
                                    <X className="w-4 h-4" />
                                    Cancelar
                                </button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Categorias Cadastradas</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : categorias.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhuma categoria cadastrada</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="pb-3 font-medium">Nome</th>
                                        <th className="pb-3 font-medium">Descrição</th>
                                        <th className="pb-3 font-medium">Status</th>
                                        <th className="pb-3 font-medium text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categorias.map((categoria) => (
                                        <tr key={categoria.id} className="border-b hover:bg-slate-50">
                                            <td className="py-3 font-medium">{categoria.nome}</td>
                                            <td className="py-3 text-muted-foreground">{categoria.descricao || '-'}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    categoria.ativo 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {categoria.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    {can('chamados','editar') && (
                                                    <button
                                                        onClick={() => handleEdit(categoria)}
                                                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    )}
                                                    {can('chamados','excluir') && (
                                                    <button
                                                        onClick={() => handleDelete(categoria.id)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
