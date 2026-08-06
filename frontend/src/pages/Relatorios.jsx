import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    BarChart3, TrendingUp, Users, Box, DollarSign, AlertCircle,
    Calendar, PieChart, Activity, Wrench, FileWarning, Download,
    Building2, Clock, Filter, ChevronDown, ChevronUp, FileSpreadsheet,
    ArrowDownToLine, X, Search, RefreshCw, Globe, RotateCcw
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

// ── Componente Custos de Contratos ───────────────────────────────────────────
function CustosContratos({ API_URL, user, exportando, setExportando, handleExport }) {
    const [dados, setDados] = React.useState(null);
    const [loading, setLoading] = React.useState(false);
    const [abertosEmp, setAbertosEmp] = React.useState({});
    const [abertosMaq, setAbertosMaq] = React.useState({});
    const [aba, setAba] = React.useState('empresa');

    const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

    const fetchCustos = React.useCallback(async () => {
        setLoading(true);
        try {
            const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {};
            const r = await fetch(`${API_URL}/relatorios/custos_contratos`, { headers });
            if (r.ok) setDados(await r.json());
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [API_URL, user]);

    React.useEffect(() => { fetchCustos(); }, [fetchCustos]);

    const toggleEmp = (id) => setAbertosEmp(p => ({ ...p, [id]: !p[id] }));
    const toggleMaq = (k)  => setAbertosMaq(p => ({ ...p, [k]:  !p[k]  }));

    return (
        <SectionCard
            title="Custos de Contratos"
            icon={DollarSign}
            iconColor="text-indigo-500"
            onExport={() => handleExport('custos_contratos', `custos_contratos_${new Date().toISOString().slice(0,10)}.xlsx`)}
            exportLabel={exportando === 'custos_contratos' ? 'Exportando...' : 'Exportar Excel'}
            defaultOpen={false}
        >
            {loading && (
                <div className="flex items-center justify-center py-10 gap-3 text-indigo-600">
                    <RotateCcw size={20} className="animate-spin" />
                    <span className="font-bold">Calculando custos...</span>
                </div>
            )}

            {!loading && dados && (
                <>
                    {/* KPIs topo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <div className="bg-indigo-600 text-white rounded-2xl p-4 text-center shadow">
                            <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Total Mensal</p>
                            <p className="text-2xl font-black">{fmt(dados.total_mensal)}</p>
                        </div>
                        <div className="bg-emerald-600 text-white rounded-2xl p-4 text-center shadow">
                            <p className="text-[10px] font-bold uppercase opacity-70 mb-1">Acumulado {dados.mes_referencia} ({dados.meses_acumulados} meses)</p>
                            <p className="text-2xl font-black">{fmt(dados.total_anual)}</p>
                        </div>
                        <div className="bg-amber-500 text-white rounded-2xl p-4 flex items-center justify-between shadow">
                            <div>
                                <p className="text-[10px] font-bold uppercase opacity-70 mb-1 flex items-center gap-1">
                                    <Globe size={11} /> Cotação USD
                                </p>
                                <p className="text-2xl font-black">{fmt(dados.cotacao_usd)}</p>
                            </div>
                            <button onClick={fetchCustos} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all" title="Atualizar">
                                <RotateCcw size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Abas Por Empresa / Por Maquinário */}
                    <div className="flex gap-2 border-b border-slate-200 mb-5">
                        <button
                            onClick={() => setAba('empresa')}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${aba === 'empresa' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Building2 size={14} className="inline mr-1" /> Por Empresa
                        </button>
                        <button
                            onClick={() => setAba('maquinario')}
                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${aba === 'maquinario' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            <Wrench size={14} className="inline mr-1" /> Por Maquinário
                        </button>
                    </div>

                    {/* ── ABA EMPRESA ── */}
                    {aba === 'empresa' && (
                        <div className="space-y-3">
                            {dados.por_empresa.map((emp) => (
                                <div key={emp.empresa_id} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleEmp(emp.empresa_id)}
                                        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            {abertosEmp[emp.empresa_id] ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronUp size={15} className="text-slate-400" />}
                                            <Building2 size={14} className="text-indigo-400" />
                                            <span className="font-bold text-slate-700 text-sm">{emp.empresa_nome}</span>
                                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{emp.contratos.length} contrato(s)</span>
                                        </div>
                                        <div className="flex gap-6 text-right">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Mensal</p>
                                                <p className="font-black text-indigo-700 text-sm">{fmt(emp.total_mensal)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Acumulado</p>
                                                <p className="font-black text-emerald-700 text-sm">{fmt(emp.total_anual)}</p>
                                            </div>
                                        </div>
                                    </button>
                                    {abertosEmp[emp.empresa_id] && (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-100 text-slate-500 text-xs uppercase">
                                                    <th className="px-5 py-2 text-left">Contrato</th>
                                                    <th className="px-4 py-2 text-left">Fornecedor</th>
                                                    <th className="px-4 py-2 text-center">Ativos</th>
                                                    <th className="px-4 py-2 text-center">Moeda</th>
                                                    <th className="px-4 py-2 text-right">Valor Original</th>
                                                    <th className="px-4 py-2 text-right">Mensal BRL</th>
                                                    <th className="px-4 py-2 text-right">Acumulado BRL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {emp.contratos.map((c, i) => (
                                                    <tr key={i} className="hover:bg-indigo-50/20 transition-colors">
                                                        <td className="px-5 py-2 font-medium text-slate-700">
                                                            {c.contrato_numero}
                                                            {c.is_mensal && <span className="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">MENSAL</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-slate-600">
                                                            {c.fornecedor_nome || 'Não informado'}
                                                        </td>
                                                        <td className="px-4 py-2 text-center font-bold text-slate-600">
                                                            {c.ativos_quantidade || 0}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.moeda === 'USD' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{c.moeda}</span>
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-slate-500">{c.moeda === 'USD' ? '$ ' : 'R$ '}{Number(c.valor_original).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-indigo-700">{fmt(c.valor_mensal_brl)}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-emerald-700">{fmt(c.valor_anual_brl)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── ABA MAQUINÁRIO ── */}
                    {aba === 'maquinario' && (
                        <div className="space-y-3">
                            {dados.por_maquinario.map((maq, idx) => (
                                <div key={maq.chave || maq.maquinario || idx} className="border border-slate-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => toggleMaq(maq.chave || maq.maquinario)}
                                        className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            {abertosMaq[maq.chave || maq.maquinario] ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronUp size={15} className="text-slate-400" />}
                                            <Wrench size={14} className="shrink-0 text-indigo-400" />
                                            <div className="min-w-0 text-left">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-bold text-slate-700 text-sm">
                                                        {maq.maquinario}
                                                    </span>
                                                    {maq.maquinario_id && (
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            ID #{maq.maquinario_id}
                                                        </span>
                                                    )}
                                                    <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                                                        {maq.contratos.length} contrato(s)
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                                                    {maq.numero_serie && <span>S/N: {maq.numero_serie}</span>}
                                                    {maq.empresa_nome && <span>{maq.empresa_nome}</span>}
                                                    {maq.fornecedores_nomes?.length > 0 && (
                                                        <span title={maq.fornecedores_nomes.join(', ')}>
                                                            Forn.: {maq.fornecedores_nomes.join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-6 text-right">
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Mensal</p>
                                                <p className="font-black text-indigo-700 text-sm">{fmt(maq.total_mensal)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Acumulado</p>
                                                <p className="font-black text-emerald-700 text-sm">{fmt(maq.total_anual)}</p>
                                            </div>
                                        </div>
                                    </button>
                                    {abertosMaq[maq.chave || maq.maquinario] && (
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-100 text-slate-500 text-xs uppercase">
                                                    <th className="px-5 py-2 text-left">Contrato</th>
                                                    <th className="px-5 py-2 text-left">Fornecedor</th>
                                                    <th className="px-5 py-2 text-left">Empresa</th>
                                                    <th className="px-4 py-2 text-center">Moeda</th>
                                                    <th className="px-4 py-2 text-right">Valor Original</th>
                                                    <th className="px-4 py-2 text-right">Mensal BRL</th>
                                                    <th className="px-4 py-2 text-right">Acumulado BRL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {maq.contratos.map((c, i) => (
                                                    <tr key={i} className="hover:bg-indigo-50/20 transition-colors">
                                                        <td className="px-5 py-2 font-medium text-slate-700">{c.contrato_numero}</td>
                                                        <td className="px-5 py-2 text-slate-500">
                                                            {c.fornecedor_nome || 'Não informado'}
                                                        </td>
                                                        <td className="px-5 py-2 text-slate-500">{c.empresa_nome}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.moeda === 'USD' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{c.moeda}</span>
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-slate-500">{c.moeda === 'USD' ? '$ ' : 'R$ '}{Number(c.valor_original).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-indigo-700">{fmt(c.valor_mensal_brl)}</td>
                                                        <td className="px-4 py-2 text-right font-bold text-emerald-700">{fmt(c.valor_anual_brl)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ))}                        </div>
                    )}

                    {/* Total Geral */}
                    <div className="mt-5 bg-slate-800 text-white rounded-xl p-4 flex items-center justify-between">
                        <span className="font-black uppercase tracking-wide text-sm">Total Geral de Contratos</span>
                        <div className="flex gap-8 text-right">
                            <div>
                                <p className="text-[10px] opacity-60 uppercase font-bold">Mensal</p>
                                <p className="text-xl font-black">{fmt(dados.total_mensal)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] opacity-60 uppercase font-bold">Acumulado {dados.mes_referencia}</p>
                                <p className="text-xl font-black text-emerald-400">{fmt(dados.total_anual)}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </SectionCard>
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

    const API_BASE = "";
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
            if (dataInicio && filtroAtivo) params.append('data_inicio', dataInicio);
            if (dataFim    && filtroAtivo) params.append('data_fim',    dataFim);
            const url = `${API_URL}/relatorios/export/${endpoint}?${params.toString()}`;
            const res = await fetch(url, { headers: token ? {'X-API-Token': token} : {} });
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
                        <BarChart3 className="text-black" /> Relatórios e Indicadores
                    </h1>
                    <p className="text-slate-500 mt-1">Visão completa de chamados, ativos e custos</p>
                </div>
                <button
                    onClick={() => handleExport('tudo', `relatorio_completo_${new Date().toISOString().slice(0,10)}.xlsx`)}
                    disabled={exportando === 'tudo'}
                    className="flex items-center gap-2 bg-black hover:bg-black text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all disabled:opacity-60">
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
                                    type="date"                                    value={dataFim}
                                    onChange={e => setDataFim(e.target.value)}
                                    className="text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-400 bg-slate-50"
                                />
                            </div>
                        </div>

                        {/* Botões de ação */}
                        <div className="flex items-center gap-2">
                            <button onClick={handleAplicarFiltro}
                                className="flex items-center gap-2 bg-black hover:bg-black text-white px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm">
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
                                    className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all text-slate-500">
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Badge de filtro ativo */}
                    {filtroAtivo && (
                        <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 text-xs font-bold px-3 py-1 rounded-full border border-gray-200">
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

            {/* ── Custo por Fornecedor ── */}
            <SectionCard
                title="Custo por Fornecedor"
                icon={Users}
                iconColor="text-rose-500"
                onExport={() => handleExport('custo_por_fornecedor', 'custo_por_fornecedor.xlsx')}
                exportLabel={exportando === 'custo_por_fornecedor' ? 'Exportando...' : 'Exportar'}>
                {(!dados.custo_por_fornecedor || dados.custo_por_fornecedor.length === 0) ? (
                    <p className="text-center text-slate-400 text-sm py-6">Nenhum orçamento registrado por fornecedor</p>
                ) : (() => {
                    const fdata = dados.custo_por_fornecedor;
                    const totalGeral    = fdata.reduce((s, f) => s + f.custo_total, 0);
                    const totalAprov    = fdata.reduce((s, f) => s + f.custo_aprovado, 0);
                    const totalPend     = fdata.reduce((s, f) => s + f.custo_pendente, 0);
                    const totalOrcamentos = fdata.reduce((s, f) => s + f.total_orcamentos, 0);
                    const maxVal        = Math.max(...fdata.map(f => f.custo_total)) || 1;
                    return (
                        <>
                            {/* KPIs resumo */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-center">
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-1">Total Orçado</p>
                                    <p className="text-xl font-extrabold text-rose-700">{formatCurrency(totalGeral)}</p>
                                    <p className="text-xs text-rose-400 mt-1">{totalOrcamentos} orçamento{totalOrcamentos !== 1 ? 's' : ''} · {fdata.length} fornecedor{fdata.length !== 1 ? 'es' : ''}</p>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Aprovado</p>
                                    <p className="text-xl font-extrabold text-emerald-700">{formatCurrency(totalAprov)}</p>
                                    <p className="text-xs text-emerald-400 mt-1">{totalGeral > 0 ? ((totalAprov/totalGeral)*100).toFixed(1) : 0}% do total</p>
                                </div>
                                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-center">
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Pendente</p>
                                    <p className="text-xl font-extrabold text-amber-700">{formatCurrency(totalPend)}</p>
                                    <p className="text-xs text-amber-400 mt-1">{totalGeral > 0 ? ((totalPend/totalGeral)*100).toFixed(1) : 0}% do total</p>
                                </div>
                            </div>

                            {/* Barras por fornecedor */}
                            <div className="space-y-4 mb-6">
                                {fdata.map((f) => (
                                    <div key={f.fornecedor_id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-semibold text-slate-700 truncate max-w-[55%]" title={f.fornecedor_nome}>{f.fornecedor_nome}</span>
                                            <span className="font-bold text-rose-600">{formatCurrency(f.custo_total)}</span>
                                        </div>
                                        {/* barra empilhada: aprovado + pendente + outros */}
                                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-emerald-400 transition-all duration-500"
                                                style={{ width: `${(f.custo_aprovado / maxVal) * 100}%` }}
                                                title={`Aprovado: ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(f.custo_aprovado)}`} />
                                            <div className="h-full bg-amber-400 transition-all duration-500"
                                                style={{ width: `${(f.custo_pendente / maxVal) * 100}%` }}
                                                title={`Pendente: ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(f.custo_pendente)}`} />
                                            <div className="h-full bg-slate-300 transition-all duration-500"
                                                style={{ width: `${(f.custo_outros / maxVal) * 100}%` }}
                                                title={`Outros: ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(f.custo_outros)}`} />
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-1 text-[10px] text-slate-400">
                                            <span>📋 {f.total_orcamentos} orç.</span>
                                            <span className="text-emerald-600 font-bold">✅ Aprov: {formatCurrency(f.custo_aprovado)}</span>
                                            {f.custo_pendente > 0 && <span className="text-amber-600 font-bold">⏳ Pend: {formatCurrency(f.custo_pendente)}</span>}
                                            {f.custo_outros > 0 && <span>Outros: {formatCurrency(f.custo_outros)}</span>}
                                            <span className="ml-auto font-bold text-slate-500">{((f.custo_total / totalGeral) * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Legenda */}
                            <div className="flex items-center gap-4 text-xs text-slate-500 border-t pt-3">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Aprovado</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Pendente</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-300 inline-block" /> Outros</span>
                            </div>
                        </>
                    );
                })()}
            </SectionCard>

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
                                            {m[1]} chamados                                        </div>
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

            {/* ── CUSTOS DE CONTRATOS ── */}
            <CustosContratos API_URL={API_URL} user={user} exportando={exportando} setExportando={setExportando} handleExport={handleExport} />

        </div>
    );
}
