import React, { useState, useEffect, useCallback } from 'react';
import { 
    BarChart, PieChart, LineChart, Calendar, Building2, Box, 
    FileText, Users, DollarSign, Download, Printer, Filter,
    ChevronDown, ChevronRight, AlertTriangle, TrendingUp,
    CheckCircle2, Clock, Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';
import { format, subMonths } from 'date-fns';

export default function Relatorios() {
    const { selectedEntity, treeEntities } = useEntity();
    const { user } = useAuth();
    
    const [filters, setFilters] = useState({
        dataInicio: format(subMonths(new Date(), 1), 'yyyy-MM-dd'),
        dataFim: format(new Date(), 'yyyy-MM-dd'),
        empresaId: selectedEntity
    });

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                empresa_id: filters.empresaId,
                data_inicio: filters.dataInicio,
                data_fim: filters.dataFim
            });

            const response = await fetch(`/api/relatorios/geral?${queryParams}`, {
                headers: { 'X-API-Token': user?.api_token }
            });
            
            if (response.ok) setData(await response.json());
        } catch (error) {
            console.error("Erro ao buscar dados:", error);
        } finally {
            setLoading(false);
        }
    }, [filters, user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Relatórios e Indicadores</h1>
                    <p className="text-muted-foreground">Análise completa da gestão de manutenção</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"><Download className="w-4 h-4" /> PDF</button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"><Download className="w-4 h-4" /> Excel</button>
                </div>
            </div>

            <Card className="bg-slate-50/50 border-dashed">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Período</label>
                            <div className="flex gap-2">
                                <input type="date" value={filters.dataInicio} onChange={(e) => setFilters({...filters, dataInicio: e.target.value})} className="w-full text-xs p-2 rounded border bg-white" />
                                <input type="date" value={filters.dataFim} onChange={(e) => setFilters({...filters, dataFim: e.target.value})} className="w-full text-xs p-2 rounded border bg-white" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><Building2 className="w-3 h-3" /> Empresa</label>
                            <select value={filters.empresaId} onChange={(e) => setFilters({...filters, empresaId: e.target.value})} className="w-full text-xs p-2 rounded border bg-white">
                                <option value="all">Todas as Empresas</option>
                                {treeEntities.map(e => <option key={e.id} value={e.id}>{'\u00A0'.repeat(e.level * 2)}{e.nome}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button onClick={fetchData} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold"><Filter className="w-4 h-4" /> Aplicar Filtros</button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2 border-b border-border pb-px">
                {[
                    { id: 'dashboard', label: 'Dashboard / KPIs', icon: TrendingUp },
                    { id: 'empresas', label: 'Empresas', icon: Building2 },
                    { id: 'ativos', label: 'Ativos', icon: Box },
                    { id: 'alertas', label: 'Alertas', icon: AlertTriangle },
                ].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'}`}>
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground animate-pulse">Processando indicadores...</p>
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {activeTab === 'dashboard' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <StatCard title="Total de Chamados" value={data.ativos.reduce((acc, curr) => acc + curr.total_chamados, 0)} icon={Clock} color="text-blue-600" subtitle="No período" />
                                    <StatCard title="Custo Médio" value={`R$ ${data.resumo_financeiro.media_por_chamado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon={DollarSign} color="text-green-600" subtitle="Por chamado" />
                                    <StatCard title="Total Gasto" value={`R$ ${data.resumo_financeiro.total_gasto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`} icon={TrendingUp} color="text-red-600" subtitle="Investimento total" />
                                    <StatCard title="Contratos a Vencer" value={data.contratos.a_vencer_30} icon={AlertTriangle} color="text-orange-600" subtitle="Próximos 30 dias" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader><CardTitle className="text-lg">Empresas com mais Chamados</CardTitle></CardHeader>
                                        <CardContent>
                                            <div className="space-y-4">
                                                {data.empresas.slice(0, 5).map((emp, i) => (
                                                    <div key={emp.id} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-full text-xs font-bold">{i+1}</span>
                                                            <span className="text-sm font-medium">{emp.nome}</span>
                                                        </div>
                                                        <span className="text-sm font-bold">{emp.total_chamados}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader><CardTitle className="text-lg">Status dos Chamados</CardTitle></CardHeader>
                                        <CardContent className="grid grid-cols-2 gap-4">
                                            {Object.entries(data.chamados_status).map(([status, count]) => (
                                                <div key={status} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                    <p className="text-xs text-muted-foreground uppercase font-bold">{status}</p>
                                                    <p className="text-2xl font-black text-primary">{count}</p>
                                                </div>
                                            ))}
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}
                        {activeTab === 'ativos' && (
                            <Card>
                                <CardHeader><CardTitle>Relatório de Ativos</CardTitle></CardHeader>
                                <CardContent>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left text-muted-foreground">
                                                <th className="pb-2">Ativo</th>
                                                <th className="pb-2">Tag</th>
                                                <th className="pb-2">Chamados</th>
                                                <th className="pb-2">Custo Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.ativos.map(at => (
                                                <tr key={at.id} className="border-b hover:bg-slate-50">
                                                    <td className="py-3 font-medium">{at.nome}</td>
                                                    <td className="py-3 text-xs font-mono">{at.tag}</td>
                                                    <td className="py-3">{at.total_chamados}</td>
                                                    <td className="py-3">R$ {at.total_gasto.toLocaleString('pt-BR')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        )}
                        {activeTab === 'alertas' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="border-red-200 bg-red-50/30">
                                    <CardHeader className="flex flex-row items-center gap-2"><AlertTriangle className="text-red-600 w-5 h-5" /><CardTitle className="text-red-800">Ativos Críticos (Sem Contrato)</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        {data.ativos.filter(a => !a.tem_contrato && a.total_chamados > 0).map(a => (
                                            <div key={a.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-red-100 shadow-sm">
                                                <div><p className="text-sm font-bold">{a.nome}</p><p className="text-xs text-muted-foreground">{a.total_chamados} chamados</p></div>
                                                <span className="text-xs font-bold text-red-600">ALTA MANUTENÇÃO</span>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                                <Card className="border-orange-200 bg-orange-50/30">
                                    <CardHeader className="flex flex-row items-center gap-2"><Clock className="text-orange-600 w-5 h-5" /><CardTitle className="text-orange-800">Contratos Próximos do Vencimento</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white rounded-xl border border-orange-100 text-center"><p className="text-xs text-muted-foreground uppercase font-bold">30 dias</p><p className="text-3xl font-black text-orange-600">{data.contratos.a_vencer_30}</p></div>
                                        <div className="p-4 bg-white rounded-xl border border-orange-100 text-center"><p className="text-xs text-muted-foreground uppercase font-bold">60 dias</p><p className="text-3xl font-black text-orange-600">{data.contratos.a_vencer_60}</p></div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
                        <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">Nenhum dado encontrado.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
