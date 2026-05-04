import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    BarChart3, TrendingUp, Users, Box, DollarSign, AlertCircle,
    Calendar, PieChart, Activity, Wrench, FileWarning, Download,
    Building2, Clock, Filter, ChevronDown, ChevronUp, FileSpreadsheet,
    ArrowDownToLine, X, Search, RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";

const COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316","#84CC16","#EC4899","#14B8A6"];

// ── Sub-componentes ───────────────────────────────────────────────────────────

function KPI({ icon: Icon, label, value, color, sub }) {
    return (
        <Card className="bg-white border-none shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${color.bg}`}><Icon size={20} className={color.text} /></div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${color.bg} ${color.text}`}>{label}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">{value}</h2>
                {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
            </CardContent>
        </Card>
    );
}

function BarList({ data, color = "#3B82F6", formatValue = v => v, emptyText = "Sem dados" }) {
    const max = data?.length > 0 ? Math.max(...data.map(d => d[1])) : 1;
    if (!data || data.length === 0) return <p className="text-center text-slate-400 text-sm py-6">{emptyText}</p>;
    return (
        <div className="space-y-3">
            {data.map((item, i) => (
                <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 truncate max-w-[65%]" title={item[0]}>{item[0]}</span>
                        <span className="font-bold" style={{ color }}>{formatValue(item[1])}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${(item[1] / max) * 100}%`, backgroundColor: color }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function PieList({ data, emptyText = "Sem dados" }) {
    const total = data?.reduce((s, d) => s + d[1], 0) || 1;
    if (!data || data.length === 0) return <p className="text-center text-slate-400 text-sm py-6">{emptyText}</p>;
    return (
        <div className="space-y-2">
            {data.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm font-medium text-slate-700">{item[0]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">{Math.round((item[1] / total) * 100)}%</span>
                        <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">{item[1]}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SectionCard({ title, icon: Icon, iconColor, onExport, exportLabel, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <Card className="bg-white border-none shadow-sm overflow-hidden">
            <CardHeader className="border-b border-slate-100 py-3 px-5">
                <div className="flex items-center justify-between">
                    <button onClick={() => setOpen(o => !o)}
                        className="flex items-center gap-2 text-slate-800 font-bold text-base hover:text-blue-600 transition-colors">
                        <Icon size={18} className={iconColor} />
                        {title}
                        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>
                    {onExport && (
                        <button onClick={onExport}
                            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
                            <Download size={14} /> {exportLabel || "Exportar"}
                        </button>
                    )}
                </div>
            </CardHeader>
            {open && <CardContent className="p-5">{children}</CardContent>}
        </Card>
    );
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function Relatorios() {
    const { user } = useAuth();
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [exportando, setExportando] = useState(null);

    // Filtros globais (data)
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim]       = useState('');
    const [filtroAtivo, setFiltroAtivo] = useState(false);

    // Filtros locais
    const [filtroEmpresa, setFiltroEmpresa] = useState('');

    const API_BASE = window.location.origin.includes('5173')
        ? `${window.location.protocol}//${window.location.hostname}:5002`
        : window.location.origin;
    const API_URL = `${API_BASE}/api`;

    const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
    const formatNum      = (v) => new Intl.NumberFormat('pt-BR').format(v || 0);

    const fetchData = useCallback(async (inicio, fim) => {
        setLoading(true); setError(null);
        try {
            const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {};
            const params  = new URLSearchParams();
            if (inicio) params.append('data_inicio', inicio);
            if (fim)    params.append('data_fim', fim);
            const qs  = params.toString() ? `?${params.toString()}` : '';
            const res = await fetch(`${API_URL}/relatorios/dashboard${qs}`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data.error) setError(data.error);
                else setDados(data);
            } else {
                const err = await res.json().catch(() => ({}));
                setError(err.error || `Erro HTTP: ${res.status}`);
            }
        } catch (e) { setError("Não foi possível conectar ao servidor."); }
        finally { setLoading(false); }
    }, [user, API_URL]);

    useEffect(() => { fetchData('', ''); }, [fetchData]);

    const handleAplicarFiltro = () => {
        setFiltroAtivo(!!(dataInicio || dataFim));
        fetchData(dataInicio, dataFim);
    };

    const handleLimparFiltro = () => {
        setDataInicio('');
        setDataFim('');
        setFiltroAtivo(false);
        fetchData('', '');
    };

    // Atalhos de período
    const aplicarPeriodo = (tipo) => {
        const h = new Date();
        let ini = '', fim = h.toISOString().slice(0, 10);
        if (tipo === 'hoje') {
            ini = fim;
        } else if (tipo === '7d') {
            const d = new Date(h); d.setDate(d.getDate() - 7);
            ini = d.toISOString().slice(0, 10);
        } else if (tipo === '30d') {
            const d = new Date(h); d.setDate(d.getDate() - 30);
            ini = d.toISOString().slice(0, 10);
        } else if (tipo === 'mes') {
            ini = new Date(h.getFullYear(), h.getMonth(), 1).toISOString().slice(0, 10);
        } else if (tipo === 'ano') {
            ini = `${h.getFullYear()}-01-01`;
        }
        setDataInicio(ini);
        setDataFim(fim);
        setFiltroAtivo(true);
        fetchData(ini, fim);
    };

    const handleExport = async (endpoint, filename) => {
        setExportando(endpoint);
        try {
            const token  = user?.api_token;
            const params = new URLSearchParams();
            if (token)     params.append('token', token);
            if (dataInicio && filtroAtivo) params.append('data_inicio', dataInicio);
            if (dataFim    && filtroAtivo) params.append('data_fim',    dataFim);
            const url = `${API_URL}/relatorios/export/${endpoint}?${params.toString()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Erro ao exportar');
            const blob = await res.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename || `${endpoint}.xlsx`;
            link.click();
            URL.revokeObjectURL(link.href);
        } catch (e) { alert('Erro ao exportar planilha.'); }
        finally { setExportando(null); }
    };

    const empresasDisponiveis = useMemo(() => {
        if (!dados?.empresas_stats) return [];
        return dados.empresas_stats.map(e => e.nome);
    }, [dados]);

    const chamadosPorEmpresaFiltrado = useMemo(() => {
        if (!dados?.chamados_por_empresa) return [];
        if (!filtroEmpresa) return dados.chamados_por_empresa;
        return dados.chamados_por_empresa.filter(d => d[0] === filtroEmpresa);
    }, [dados, filtroEmpresa]);

    // ── Estados de carregamento / erro ────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                <p className="text-slate-500 font-medium">Carregando relatórios...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="p-8 text-center max-w-md mx-auto space-y-4">
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <h3 className="font-bold">Erro ao carregar relatório</h3>
                <p className="text-sm opacity-80">{error}</p>
            </div>
            <button onClick={() => fetchData(dataInicio, dataFim)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-all">
                Tentar Novamente
            </button>
        </div>
    );

    if (!dados) return <div className="p-6 text-center text-slate-500">Nenhum dado disponível.</div>;

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">

            {/* ── HEADER ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <BarChart3 className="text-blue-600" /> Relatórios e Indicadores
                    </h1>
                    <p className="text-slate-500 mt-1">Visão completa de chamados, ativos e custos</p>
                </div>
                <button
                    onClick={() => handleExport('tudo', `relatorio_completo_${new Date().toISOString().slice(0,10)}.xlsx`)}
                    disabled={exportando === 'tudo'}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all disabled:opacity-60">
                    <ArrowDownToLine size={18} />
                    {exportando === 'tudo' ? 'Exportando...' : 'Exportar Tudo'}
                </button>
            </div>

            {/* ── FILTRO DE DATA ── */}
            <Card className="bg-white border-none shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-end gap-4">

                        {/* Inputs de data */}
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Data Início</label>
                                <input
                                    type="date"
                                    value={dataInicio}
                                    onChange={e => setDataInicio(e.target.value)}
                                    className="text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                                />
                            </div>
                            <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase">Data Fim</label>
                                <input
                                    type="date"
                                    value={dataFim}
                                    onChange={e => setDataFim(e.target.value)}
                                    className="text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                                />
                            </div>
                        </div>

                        {/* Botões de ação */}
                        <div className="flex items-center gap-2">
                            <button onClick={handleAplicarFiltro}
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm">
                                <Search size={15} /> Filtrar
                            </button>
                            {filtroAtivo && (
                                <button onClick={handleLimparFiltro}
                                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-sm transition-all">
                                    <X size={15} /> Limpar
                                </button>
                            )}
                            <button onClick={() => fetchData(dataInicio, dataFim)}
                                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm transition-all" title="Atualizar">
                                <RefreshCw size={15} />
                            </button>
                        </div>

                        {/* Atalhos de período */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                                { label: 'Hoje',    tipo: 'hoje' },
                                { label: '7 dias',  tipo: '7d'   },
                                { label: '30 dias', tipo: '30d'  },
                                { label: 'Este mês',tipo: 'mes'  },
                                { label: 'Este ano',tipo: 'ano'  },
                            ].map(({ label, tipo }) => (
                                <button key={tipo} onClick={() => aplicarPeriodo(tipo)}
                                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-slate-500">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Badge de filtro ativo */}
                    {filtroAtivo && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
                                <Filter size={11} />
                                Filtrando: {dataInicio && dataInicio} {dataInicio && dataFim && '→'} {dataFim && dataFim}
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <KPI icon={Activity}    label="Chamados"      value={formatNum(dados.resumo?.total_chamados)}          color={{ bg: 'bg-blue-50',    text: 'text-blue-600'    }} sub={filtroAtivo ? 'No período' : 'Total de solicitações'} />
                <KPI icon={Box}         label="Ativos"         value={formatNum(dados.resumo?.total_ativos)}            color={{ bg: 'bg-purple-50',  text: 'text-purple-600'  }} sub="Equipamentos cadastrados" />
                <KPI icon={Wrench}      label="Infraestruturas"value={formatNum(dados.resumo?.total_infraestruturas)}   color={{ bg: 'bg-orange-50',  text: 'text-orange-600'  }} sub="Itens ativos" />
                <KPI icon={FileWarning} label="Sem Contrato"   value={formatNum(dados.resumo?.ativos_sem_contrato)}     color={{ bg: 'bg-red-50',     text: 'text-red-600'     }} sub="Ativos sem cobertura" />
                <KPI icon={DollarSign}  label="Custo Chamados" value={formatCurrency(dados.resumo?.total_custo_chamados)} color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} sub={filtroAtivo ? 'No período' : 'Manutenções realizadas'} />
                <KPI icon={TrendingUp}  label="Orçamentos"     value={formatCurrency(dados.resumo?.total_gasto_orcamentos)} color={{ bg: 'bg-amber-50',text: 'text-amber-600'  }} sub="Total aprovado" />
            </div>

            {/* ── Tipo + Status ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SectionCard title="Chamados por Tipo" icon={PieChart} iconColor="text-blue-500"
                    onExport={() => handleExport('chamados_completo', 'chamados_completo.xlsx')}
                    exportLabel={exportando === 'chamados_completo' ? 'Exportando...' : 'Exportar Completo'}>
                    <PieList data={dados.chamados_por_tipo} emptyText="Nenhum chamado por tipo" />
                </SectionCard>
                <SectionCard title="Chamados por Status" icon={Activity} iconColor="text-emerald-500"
                    onExport={() => handleExport('chamados_por_status', 'chamados_por_status.xlsx')}
                    exportLabel={exportando === 'chamados_por_status' ? 'Exportando...' : 'Exportar'}>
                    <PieList data={dados.chamados_por_status} emptyText="Nenhum chamado por status" />
                </SectionCard>
            </div>

            {/* ── Prioridade + Categoria ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SectionCard title="Chamados por Prioridade" icon={AlertCircle} iconColor="text-amber-500"
                    onExport={() => handleExport('chamados_por_prioridade', 'chamados_por_prioridade.xlsx')}
                    exportLabel={exportando === 'chamados_por_prioridade' ? 'Exportando...' : 'Exportar'}>
                    <PieList data={dados.chamados_por_prioridade} emptyText="Nenhum dado de prioridade" />
                </SectionCard>
                <SectionCard title="Chamados por Categoria" icon={Filter} iconColor="text-violet-500"
                    onExport={() => handleExport('chamados_por_categoria', 'chamados_por_categoria.xlsx')}
                    exportLabel={exportando === 'chamados_por_categoria' ? 'Exportando...' : 'Exportar'}>
                    <PieList data={dados.chamados_por_categoria} emptyText="Nenhum chamado por categoria" />
                </SectionCard>
            </div>

            {/* ── Maquinário ── */}
            <SectionCard title="Chamados por Maquinário" icon={Wrench} iconColor="text-blue-500"
                onExport={() => handleExport('chamados_por_maquinario', 'chamados_por_maquinario.xlsx')}
                exportLabel={exportando === 'chamados_por_maquinario' ? 'Exportando...' : 'Exportar'}>
                <div className="flex justify-end mb-4">
                    <button onClick={() => handleExport('chamados_por_maquinario_categoria', 'chamados_maquinario_categoria.xlsx')}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                        <FileSpreadsheet size={14} /> Exportar por Categoria
                    </button>
                </div>
                <BarList data={dados.chamados_por_maquinario} color="#3B82F6" emptyText="Nenhum chamado de maquinário" />
            </SectionCard>

            {/* ── Infraestrutura ── */}
            <SectionCard title="Chamados por Infraestrutura" icon={Building2} iconColor="text-orange-500"
                onExport={() => handleExport('chamados_por_infraestrutura', 'chamados_por_infraestrutura.xlsx')}
                exportLabel={exportando === 'chamados_por_infraestrutura' ? 'Exportando...' : 'Exportar'}>
                <BarList data={dados.chamados_por_infraestrutura} color="#F97316" emptyText="Nenhum chamado de infraestrutura" />
            </SectionCard>

            {/* ── Empresa ── */}
            <SectionCard title="Chamados por Empresa / Clínica" icon={Users} iconColor="text-indigo-500"
                onExport={() => handleExport('chamados_por_empresa', 'chamados_por_empresa.xlsx')}
                exportLabel={exportando === 'chamados_por_empresa' ? 'Exportando...' : 'Exportar'}>
                {empresasDisponiveis.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                        <Filter size={14} className="text-slate-400" />
                        <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
                            className="text-sm p-1.5 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400">
                            <option value="">Todas as empresas</option>
                            {empresasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        {filtroEmpresa && (
                            <button onClick={() => setFiltroEmpresa('')} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                )}
                <BarList data={chamadosPorEmpresaFiltrado} color="#6366F1" emptyText="Nenhum chamado por empresa" />
            </SectionCard>

            {/* ── Custos ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SectionCard title="Custo de Chamados por Ativo" icon={DollarSign} iconColor="text-emerald-500"
                    onExport={() => handleExport('custos_ativos_chamados', 'custos_ativos_chamados.xlsx')}
                    exportLabel={exportando === 'custos_ativos_chamados' ? 'Exportando...' : 'Exportar'}>
                    <BarList data={dados.custos_ativos_chamados} color="#10B981" formatValue={formatCurrency} emptyText="Nenhum custo registrado" />
                </SectionCard>
                <SectionCard title="Gastos de Orçamentos por Ativo" icon={TrendingUp} iconColor="text-blue-500"
                    onExport={() => handleExport('gastos_ativos_orcamentos', 'gastos_ativos_orcamentos.xlsx')}
                    exportLabel={exportando === 'gastos_ativos_orcamentos' ? 'Exportando...' : 'Exportar'}>
                    <BarList data={dados.gastos_ativos_orcamentos} color="#3B82F6" formatValue={formatCurrency} emptyText="Nenhum orçamento registrado" />
                </SectionCard>
            </div>

            {/* ── Tempo Médio ── */}
            <SectionCard title="Tempo Médio de Solução por Empresa (dias)" icon={Clock} iconColor="text-cyan-500"
                onExport={() => handleExport('tempo_solucao', 'tempo_solucao.xlsx')}
                exportLabel={exportando === 'tempo_solucao' ? 'Exportando...' : 'Exportar'}>
                <BarList data={dados.tempo_medio_solucao} color="#06B6D4" formatValue={v => `${v} dias`} emptyText="Nenhum chamado solucionado ainda" />
            </SectionCard>

            {/* ── Evolução Mensal ── */}
            <SectionCard title="Evolução Mensal de Chamados" icon={TrendingUp} iconColor="text-blue-500"
                onExport={() => handleExport('chamados_por_mes', 'chamados_por_mes.xlsx')}
                exportLabel={exportando === 'chamados_por_mes' ? 'Exportando...' : 'Exportar'}>
                {dados.chamados_por_mes?.length > 0 ? (
                    <div className="flex items-end justify-between h-48 gap-1.5 pt-8">
                        {dados.chamados_por_mes.map((m, i) => {
                            const max = Math.max(...dados.chamados_por_mes.map(x => x[1])) || 1;
                            const pct = (m[1] / max) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                                    <span className="text-[10px] font-bold text-slate-500">{m[1]}</span>
                                    <div className="w-full bg-blue-500 hover:bg-blue-600 rounded-t-md transition-all cursor-pointer relative group"
                                        style={{ height: `${Math.max(pct, 4)}%` }}>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {m[1]} chamados
                                        </div>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{m[0]}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-slate-400 text-sm py-6">Nenhum dado de evolução mensal</p>
                )}
            </SectionCard>

            {/* ── Estatísticas por Empresa ── */}
            <SectionCard title="Estatísticas por Empresa" icon={Users} iconColor="text-indigo-500"
                onExport={() => handleExport('empresas_stats', 'empresas_stats.xlsx')}
                exportLabel={exportando === 'empresas_stats' ? 'Exportando...' : 'Exportar'}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                                <th className="p-3">Empresa</th>
                                <th className="p-3 text-center">Ativos</th>
                                <th className="p-3 text-center">Sem Contrato</th>
                                <th className="p-3 text-right">Custo Chamados</th>
                                <th className="p-3 text-right">Gasto Orçamentos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {dados.empresas_stats?.map((e, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-semibold text-slate-700">{e.nome}</td>
                                    <td className="p-3 text-center text-slate-600">{e.ativos}</td>
                                    <td className="p-3 text-center">
                                        <span className={`font-bold ${e.ativos_sem_contrato > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                            {e.ativos_sem_contrato}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right font-bold text-emerald-600">{formatCurrency(e.custo_chamados)}</td>
                                    <td className="p-3 text-right font-bold text-blue-600">{formatCurrency(e.gasto_orcamentos)}</td>
                                </tr>
                            ))}
                            {(!dados.empresas_stats || dados.empresas_stats.length === 0) && (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-400">Nenhuma empresa encontrada</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

            {/* ── Ativos sem Contrato ── */}
            <SectionCard title="Ativos sem Contrato" icon={FileWarning} iconColor="text-red-500"
                onExport={() => handleExport('ativos_sem_contrato', 'ativos_sem_contrato.xlsx')}
                exportLabel={exportando === 'ativos_sem_contrato' ? 'Exportando...' : 'Exportar'}
                defaultOpen={false}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                                <th className="p-3">Ativo</th>
                                <th className="p-3">Empresa</th>
                                <th className="p-3">Localização</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {dados.ativos_sem_contrato_detalhes?.map((a, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 font-semibold text-slate-700">{a[0]}</td>
                                    <td className="p-3 text-slate-600">{a[1]}</td>
                                    <td className="p-3 text-slate-600">{a[2]}</td>
                                </tr>
                            ))}
                            {(!dados.ativos_sem_contrato_detalhes || dados.ativos_sem_contrato_detalhes.length === 0) && (
                                <tr><td colSpan={3} className="p-4 text-center text-slate-400">Todos os ativos possuem contrato ✅</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </SectionCard>

        </div>
    );
}
