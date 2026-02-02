import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, DollarSign, Box, FileText, AlertTriangle } from 'lucide-react';
import { useEntity } from '../context/EntityContext';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
    const { selectedEntity } = useEntity();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {};
            const queryParams = selectedEntity !== 'all' ? `?empresa_id=${selectedEntity}` : '';
            const response = await fetch(`/api/relatorios/dashboard${queryParams}`, { headers });
            if (response.ok) setStats(await response.json());
        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedEntity, user]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
        <Card className="hover:shadow-lg transition-all duration-300 border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
                <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')} ${color}`}><Icon className="h-4 w-4" /></div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black">{value}</div>
                <p className="text-[10px] text-muted-foreground font-medium mt-1">{subtitle}</p>
            </CardContent>
        </Card>
    );

    if (loading) return <div className="flex flex-col items-center justify-center h-[60vh] space-y-4"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="text-muted-foreground font-medium animate-pulse">Carregando indicadores...</p></div>;

    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tight">Dashboard</h1>
                <p className="text-slate-500 font-medium mt-1">Bem-vindo ao Vimax CMMS. Resumo da sua operação.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Chamados Abertos" value={stats?.chamados_abertos || 0} icon={AlertCircle} color="text-red-600" subtitle="Aguardando atendimento" />
                <StatCard title="Ativos Gerenciados" value={stats?.total_ativos || 0} icon={Box} color="text-blue-600" subtitle="Equipamentos cadastrados" />
                <StatCard title="Investimento Total" value={`R$ ${(stats?.custo_total || 0).toLocaleString('pt-BR', {maximumFractionDigits: 0})}`} icon={DollarSign} color="text-green-600" subtitle="Custo total acumulado" />
                <StatCard title="Contratos Ativos" value={stats?.total_contratos || 0} icon={FileText} color="text-purple-600" subtitle="Vigentes no sistema" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-sm">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100"><CardTitle className="text-lg font-bold">Tendência de Chamados</CardTitle></CardHeader>
                    <CardContent className="p-6 h-64 flex items-end justify-between gap-2">
                        {stats?.tendencia_mensal?.map((t, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-full bg-primary/20 group-hover:bg-primary transition-all rounded-t-lg" style={{ height: `${(t.total / Math.max(...stats.tendencia_mensal.map(x => x.total), 1)) * 100}%` }}></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Mês {t.mes}</span>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <div className="space-y-6">
                    <Card className="border-none shadow-sm bg-orange-50/50 border-l-4 border-l-orange-500">
                        <CardHeader className="pb-2"><div className="flex items-center gap-2 text-orange-700"><AlertTriangle className="w-5 h-5" /><CardTitle className="text-sm font-bold uppercase">Contratos a Vencer</CardTitle></div></CardHeader>
                        <CardContent><div className="text-3xl font-black text-orange-800">{stats?.contratos_a_vencer || 0}</div><p className="text-xs font-medium text-orange-600 mt-1">Próximos 30 dias.</p></CardContent>
                    </Card>
                    <Card className="border-none shadow-sm bg-red-50/50 border-l-4 border-l-red-500">
                        <CardHeader className="pb-2"><div className="flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5" /><CardTitle className="text-sm font-bold uppercase">Ativos sem Contrato</CardTitle></div></CardHeader>
                        <CardContent><div className="text-3xl font-black text-red-800">{stats?.ativos_sem_contrato || 0}</div><p className="text-xs font-medium text-red-600 mt-1">Risco operacional detectado.</p></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
