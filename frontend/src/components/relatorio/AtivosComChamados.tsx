import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface AtivoData {
  ativo_id: number;
  ativo_nome: string;
  empresa_nome: string;
  total_chamados: number;
  valor_ativo: number;
  custo_total_chamados: number;
  custo_medio_chamado: number;
}

interface AtivosComChamadosProps {
  data: AtivoData[];
}

export const AtivosComChamados: React.FC<AtivosComChamadosProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof AtivoData;
    direction: 'asc' | 'desc';
  }>({ key: 'total_chamados', direction: 'desc' });

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const sortedData = [...data].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  const handleSort = (key: keyof AtivoData) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const SortIcon = ({ column }: { column: keyof AtivoData }) => {
    if (sortConfig.key !== column) return <div className="w-4 h-4" />;
    return sortConfig.direction === 'desc' ? (
      <ChevronDown className="w-4 h-4" />
    ) : (
      <ChevronUp className="w-4 h-4" />
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getRiskLevel = (custo: number, valor: number) => {
    if (valor === 0) return { level: 'Crítico', color: 'bg-red-100 text-red-800' };
    const ratio = (custo / valor) * 100;
    if (ratio > 50) return { level: 'Crítico', color: 'bg-red-100 text-red-800' };
    if (ratio > 25) return { level: 'Alto', color: 'bg-orange-100 text-orange-800' };
    if (ratio > 10) return { level: 'Médio', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'Baixo', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Ativos com Chamados</h2>
        <p className="text-sm text-gray-600 mt-1">Análise de chamados por ativo e custos associados</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-6 py-3 text-left w-12"></th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('ativo_nome')}
                  className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                >
                  Ativo
                  <SortIcon column="ativo_nome" />
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('empresa_nome')}
                  className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                >
                  Empresa
                  <SortIcon column="empresa_nome" />
                </button>
              </th>
              <th className="px-6 py-3 text-center">
                <button
                  onClick={() => handleSort('total_chamados')}
                  className="flex items-center justify-center gap-2 font-semibold text-gray-700 hover:text-gray-900 w-full"
                >
                  Chamados
                  <SortIcon column="total_chamados" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('valor_ativo')}
                  className="flex items-center justify-end gap-2 font-semibold text-gray-700 hover:text-gray-900 w-full"
                >
                  Valor do Ativo
                  <SortIcon column="valor_ativo" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('custo_total_chamados')}
                  className="flex items-center justify-end gap-2 font-semibold text-gray-700 hover:text-gray-900 w-full"
                >
                  Custo Total
                  <SortIcon column="custo_total_chamados" />
                </button>
              </th>
              <th className="px-6 py-3 text-center">Risco</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((ativo) => {
              const risk = getRiskLevel(ativo.custo_total_chamados, ativo.valor_ativo);
              const isExpanded = expandedRows.has(ativo.ativo_id);

              return (
                <React.Fragment key={ativo.ativo_id}>
                  <tr className="border-b hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleRow(ativo.ativo_id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{ativo.ativo_nome}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{ativo.empresa_nome}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold text-sm">
                        {ativo.total_chamados}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(ativo.valor_ativo)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrency(ativo.custo_total_chamados)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${risk.color}`}>
                        {risk.level === 'Crítico' && <AlertTriangle size={14} />}
                        {risk.level}
                      </span>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white rounded p-4 border border-gray-200">
                            <p className="text-xs text-gray-600 font-semibold">CUSTO MÉDIO POR CHAMADO</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">
                              {formatCurrency(ativo.custo_medio_chamado)}
                            </p>
                          </div>
                          <div className="bg-white rounded p-4 border border-gray-200">
                            <p className="text-xs text-gray-600 font-semibold">PERCENTUAL DO VALOR</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">
                              {ativo.valor_ativo > 0 
                                ? ((ativo.custo_total_chamados / ativo.valor_ativo) * 100).toFixed(1)
                                : '0'
                              }%
                            </p>
                          </div>
                          <div className="bg-white rounded p-4 border border-gray-200">
                            <p className="text-xs text-gray-600 font-semibold">ANÁLISE</p>
                            <p className="text-sm text-gray-700 mt-2">
                              {ativo.total_chamados} chamados geraram custo de {formatCurrency(ativo.custo_total_chamados)}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          Nenhum dado disponível
        </div>
      )}
    </div>
  );
};
