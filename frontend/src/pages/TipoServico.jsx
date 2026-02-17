import React, { useState, useEffect } from 'react';
import { Trash2, Edit2, Plus, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TiposServico() {
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editando, setEditando] = useState(null);
    const [formData, setFormData] = useState({ nome: '', descricao: '', ativo: true });
    const [erro, setErro] = useState('');
    const [sucesso, setSucesso] = useState('');

    // Carregar tipos de serviço
    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/tipos-servico');
            if (response.ok) {
                setTipos(await response.json());
            }
        } catch (error) {
            console.error('Erro ao buscar tipos:', error);
            setErro('Erro ao carregar tipos de serviço');
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
            const url = editando ? `/api/tipos-servico/${editando.id}` : '/api/tipos-servico';
            const method = editando ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSucesso(editando ? 'Tipo de serviço atualizado!' : 'Tipo de serviço criado!');
                setFormData({ nome: '', descricao: '', ativo: true });
                setEditando(null);
                fetchTipos();
            } else {
                const data = await response.json();
                setErro(data.erro || 'Erro ao salvar tipo de serviço');
            }
        } catch (error) {
            console.error('Erro:', error);
            setErro('Erro ao salvar tipo de serviço');
        }
    };

    const handleEdit = (tipo) => {
        setEditando(tipo);
        setFormData(tipo);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Tem certeza que deseja deletar este tipo de serviço?')) return;

        try {
            const response = await fetch(`/api/tipos-servico/${id}`, { method: 'DELETE' });
            if (response.ok) {
                setSucesso('Tipo de serviço deletado!');
                fetchTipos();
            }
        } catch (error) {
            console.error('Erro:', error);
            setErro('Erro ao deletar tipo de serviço');
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
                <h1 className="text-3xl font-bold text-foreground">Tipos de Serviço</h1>
                <p className="text-muted-foreground">Gerencie os tipos de serviço oferecidos pelos fornecedores</p>
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
                    <CardTitle>{editando ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}</CardTitle>
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
                                placeholder="Ex: Manutenção Elétrica"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Descrição</label>
                            <textarea
                                value={formData.descricao || ''}
                                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Descrição do tipo de serviço..."
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
                    <CardTitle>Tipos de Serviço Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : tipos.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum tipo de serviço cadastrado</p>
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
                                    {tipos.map((tipo) => (
                                        <tr key={tipo.id} className="border-b hover:bg-slate-50">
                                            <td className="py-3 font-medium">{tipo.nome}</td>
                                            <td className="py-3 text-muted-foreground">{tipo.descricao || '-'}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    tipo.ativo 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {tipo.ativo ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => handleEdit(tipo)}
                                                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(tipo.id)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
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
