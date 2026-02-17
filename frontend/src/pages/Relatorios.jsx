import React, { useEffect, useState } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Box, 
  DollarSign, 
  AlertCircle, 
  Calendar,
  PieChart,
  Activity,
  Wrench,
  FileWarning,
  Download
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";

export default function Relatorios() {
  const { user } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = window.location.origin.includes('5173') 
      ? `${window.location.protocol}//${window.location.hostname}:5002`
      : window.location.origin;
  const API_URL = `${API_BASE}/api`;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = user?.api_token ? { 'X-API-Token': user.api_token } : {};
        const response = await fetch(`${API_URL}/relatorios/dashboard`, { headers });
        if (response.ok) {
          const data = await response.json();
          if (data.error) setError(data.error);
          else setDados(data);
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || `Erro HTTP: ${response.status}`);
        }
      } catch (error) {
        setError("Não foi possível conectar ao servidor.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, API_URL]);

  const handleExport = (endpoint) => {
    const token = user?.api_token;
    const url = `${API_URL}/relatorios/export/${endpoint}`;
    
    // Para garantir que o token seja enviado para download de arquivos
    // Criamos um link temporário e o clicamos programaticamente
    const link = document.createElement('a');
    link.href = token ? `${url}?token=${token}` : url; // Adiciona token como query param
    link.setAttribute('download', ''); // Força o download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-slate-500 font-medium">Carregando indicadores...</p>
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
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary text-white rounded-xl font-bold shadow-sm hover:bg-primary/90 transition-all">Tentar Novamente</button>
    </div>
  );

  if (!dados) return <div className="p-6 text-center text-slate-500">Nenhum dado disponível.</div>;

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <BarChart3 className="text-primary" /> Relatórios e Indicadores
          </h1>
          <p className="text-slate-500 mt-1">Visão geral de custos, ativos e chamados do sistema</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          <Calendar size={16} />
          {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">Orçamentos</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{formatCurrency(dados.resumo?.total_gasto_orcamentos)}</h2>
            <p className="text-[10px] text-slate-400 mt-1">Total aprovado</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wrench size={20} /></div>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Custo Chamados</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{formatCurrency(dados.resumo?.total_custo_chamados)}</h2>
            <p className="text-[10px] text-slate-400 mt-1">Manutenções realizadas</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><Box size={20} /></div>
              <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full uppercase">Ativos</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{dados.resumo?.total_ativos || 0}</h2>
            <p className="text-[10px] text-slate-400 mt-1">Equipamentos totais</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><FileWarning size={20} /></div>
              <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase">Sem Contrato</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{dados.resumo?.ativos_sem_contrato || 0}</h2>
            <p className="text-[10px] text-slate-400 mt-1">Ativos sem cobertura</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Activity size={20} /></div>
              <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">Chamados</span>
            </div>
            <h2 className="text-xl font-bold text-slate-800">{dados.resumo?.total_chamados || 0}</h2>
            <p className="text-[10px] text-slate-400 mt-1">Total de solicitações</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Custos de Chamados por Ativo */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Wrench size={20} className="text-emerald-500" /> Custos de Chamados por Ativo
            </CardTitle>
            <button onClick={() => handleExport('custos_ativos_chamados')} className="text-slate-400 hover:text-primary transition-colors">
              <Download size={20} />
            </button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {dados.custos_ativos_chamados?.map((a, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 truncate max-w-[70%]">{a[0]}</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(a[1])}</span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${(a[1] / (dados.custos_ativos_chamados[0][1] || 1)) * 100}%` }}></div>
                  </div>
                </div>
              ))}
              {(!dados.custos_ativos_chamados || dados.custos_ativos_chamados.length === 0) && <p className="text-center text-slate-400 text-sm py-4">Nenhum custo de chamado registrado.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Gastos de Orçamentos por Ativo */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <DollarSign size={20} className="text-blue-500" /> Gastos de Orçamentos por Ativo
            </CardTitle>
            <button onClick={() => handleExport('gastos_ativos_orcamentos')} className="text-slate-400 hover:text-primary transition-colors">
              <Download size={20} />
            </button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {dados.gastos_ativos_orcamentos?.map((a, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 truncate max-w-[70%]">{a[0]}</span>
                    <span className="font-bold text-blue-600">{formatCurrency(a[1])}</span>
                  </div>
                  <div className="w-full bg-slate-50 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${(a[1] / (dados.gastos_ativos_orcamentos[0][1] || 1)) * 100}%` }}></div>
                  </div>
                </div>
              ))}
              {(!dados.gastos_ativos_orcamentos || dados.gastos_ativos_orcamentos.length === 0) && <p className="text-center text-slate-400 text-sm py-4">Nenhum orçamento aprovado por ativo.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Chamados por Categoria */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PieChart size={20} className="text-primary" /> Chamados por Categoria
            </CardTitle>
            <button onClick={() => handleExport('chamados_por_categoria')} className="text-slate-400 hover:text-primary transition-colors">
              <Download size={20} />
            </button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {dados.chamados_por_categoria?.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <span className="text-sm font-medium text-slate-700">{c[0]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-white px-2 py-1 rounded-lg shadow-sm border border-primary/10">{c[1]}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Chamados</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Evolução de Chamados */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-primary" /> Evolução de Chamados
            </CardTitle>
            <button onClick={() => handleExport('chamados_por_mes')} className="text-slate-400 hover:text-primary transition-colors">
              <Download size={20} />
            </button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-end justify-between h-48 gap-2 pt-8">
              {dados.chamados_por_mes?.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full bg-primary/20 hover:bg-primary transition-all rounded-t-md relative group cursor-pointer" style={{ height: `${(m[1] / (Math.max(...dados.chamados_por_mes.map(x => x[1])) || 1)) * 100}%`, minHeight: '4px' }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">{m[1]} chamados</div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-2">{m[0]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Ativos e Gastos por Empresa */}
      <Card className="bg-white border-none shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users size={20} className="text-primary" /> Distribuição de Ativos e Custos por Empresa
          </CardTitle>
          <button onClick={() => handleExport('empresas_stats')} className="text-slate-400 hover:text-primary transition-colors">
            <Download size={20} />
          </button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Empresa</th>
                <th className="p-4">Qtd. Ativos</th>
                <th className="p-4">Sem Contrato</th>
                <th className="p-4">Custo Chamados</th>
                <th className="p-4">Gasto Orçamentos</th>
                <th className="p-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dados.empresas_stats?.map((e, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm font-semibold text-slate-700">{e.nome}</td>
                  <td className="p-4 text-sm text-slate-600">{e.ativos} ativos</td>
                  <td className="p-4 text-sm">
                    <span className={`font-bold ${e.ativos_sem_contrato > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                      {e.ativos_sem_contrato} sem contrato
                    </span>
                  </td>
                  <td className="p-4 text-sm font-bold text-emerald-600">{formatCurrency(e.custo_chamados)}</td>
                  <td className="p-4 text-sm font-bold text-blue-600">{formatCurrency(e.gasto_orcamentos)}</td>
                  <td className="p-4 text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border bg-green-50 text-green-600 border-green-100">Ativo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tabela de Ativos sem Contrato */}
      <Card className="bg-white border-none shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileWarning size={20} className="text-red-500" /> Ativos sem Contrato
          </CardTitle>
          <button onClick={() => handleExport('ativos_sem_contrato')} className="text-slate-400 hover:text-primary transition-colors">
            <Download size={20} />
          </button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4">Ativo</th>
                <th className="p-4">Empresa</th>
                <th className="p-4">Localização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dados.ativos_sem_contrato_detalhes?.map((a, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 text-sm font-semibold text-slate-700">{a[0]}</td>
                  <td className="p-4 text-sm text-slate-600">{a[1]}</td>
                  <td className="p-4 text-sm text-slate-600">{a[2]}</td>
                </tr>
              ))}
              {(!dados.ativos_sem_contrato_detalhes || dados.ativos_sem_contrato_detalhes.length === 0) && (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-slate-400 text-sm">Nenhum ativo sem contrato encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
