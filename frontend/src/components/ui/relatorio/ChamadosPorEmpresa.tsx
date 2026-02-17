import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EmpresaChamadoData {
  empresa_id: number;
  empresa_nome: string;
  total_chamados: number;
  custo_total: number;
  custo_medio: number;
}

interface ChamadosPorEmpresaProps {
  data: EmpresaChamadoData[];
}

export const ChamadosPorEmpresa: React.FC<ChamadosPorEmpresaProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof EmpresaChamadoData;
    direction: 'asc' | 'desc';
  }>({ key: 'total_chamados', direction: 'desc' });

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

  const handleSort = (key: keyof EmpresaChamadoData) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const SortIcon = ({ column }: { column: keyof EmpresaChamadoData }) => {
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

  const totalChamados = data.reduce((sum, item) => sum + item.total_chamados, 0);
  const totalCusto = data.reduce((sum, item) => sum + item.custo_total, 0);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{data.empresa_nome}</p>
          <p className="text-sm text-gray-600">Chamados: {data.total_chamados}</p>
          <p className="text-sm font-semibold text-blue-600">Custo: {formatCurrency(data.custo_total)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Chamados por Empresa</h2>
        <p className="text-sm text-gray-600 mt-1">Distribuição de chamados e custos por empresa</p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={sortedData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="empresa_nome" 
            angle={-45}
            textAnchor="end"
            height={100}
            stroke="#6b7280"
          />
          <YAxis stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar dataKey="total_chamados" fill="#3b82f6" name="Total de Chamados" radius={[8, 8, 0, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <p className="text-sm text-blue-900 font-semibold">TOTAL DE CHAMADOS</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{totalChamados}</p>
          <p className="text-xs text-blue-700 mt-2">
            Média: {(totalChamados / data.length).toFixed(1)} por empresa
          </p>
        </div>

        <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
          <p className="text-sm text-purple-900 font-semibold">CUSTO TOTAL</p>
          <p className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(totalCusto)}</p>
          <p className="text-xs text-purple-700 mt-2">
            Média: {formatCurrency(totalCusto / data.length)}
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <p className="text-sm text-green-900 font-semibold">CUSTO MÉDIO POR CHAMADO</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {formatCurrency(totalChamados > 0 ? totalCusto / totalChamados : 0)}
          </p>
          <p className="text-xs text-green-700 mt-2">
            Geral
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
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
                  onClick={() => handleSort('custo_total')}
                  className="flex items-center justify-end gap-2 font-semibold text-gray-700 hover:text-gray-900 w-full"
                >
                  Custo Total
                  <SortIcon column="custo_total" />
                </button>
              </th>
              <th className="px-6 py-3 text-right">
                <button
                  onClick={() => handleSort('custo_medio')}
                  className="flex items-center justify-end gap-2 font-semibold text-gray-700 hover:text-gray-900 w-full"
                >
                  Custo Médio
                  <SortIcon column="custo_medio" />
                </button>
              </th>
              <th className="px-6 py-3 text-center">% do Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((empresa, index) => (
              <tr key={empresa.empresa_id} className="border-b hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-gray-900">{empresa.empresa_nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                    {empresa.total_chamados}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  {formatCurrency(empresa.custo_total)}
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  {formatCurrency(empresa.custo_medio)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {((empresa.total_chamados / totalChamados) * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
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
