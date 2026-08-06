import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface FornecedorData {
  fornecedor_id: number;
  fornecedor_nome: string;
  total_chamados: number;
  custo_total: number;
  custo_medio: number;
}

interface CustoPorFornecedorProps {
  data: FornecedorData[];
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'
];

export const CustoPorFornecedor: React.FC<CustoPorFornecedorProps> = ({ data }) => {
  const [viewType, setViewType] = useState<'pie' | 'bar'>('pie');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{data.fornecedor_nome}</p>
          <p className="text-sm text-gray-600">Chamados: {data.total_chamados}</p>
          <p className="text-sm font-semibold text-blue-600">Custo: {formatCurrency(data.custo_total)}</p>
        </div>
      );
    }
    return null;
  };

  const totalCusto = data.reduce((sum, item) => sum + item.custo_total, 0);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Custo por Fornecedor</h2>
          <p className="text-sm text-gray-600 mt-1">Distribuição de custos e chamados entre fornecedores</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewType('pie')}
            className={`px-4 py-2 rounded font-medium transition ${
              viewType === 'pie'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pizza
          </button>
          <button
            onClick={() => setViewType('bar')}
            className={`px-4 py-2 rounded font-medium transition ${
              viewType === 'bar'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Barras
          </button>
        </div>
      </div>

      {viewType === 'pie' ? (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={data}
              dataKey="custo_total"
              nameKey="fornecedor_nome"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ fornecedor_nome, percent }) => `${fornecedor_nome} (${(percent * 100).toFixed(0)}%)`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="fornecedor_nome" 
              angle={-45}
              textAnchor="end"
              height={100}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="custo_total" fill="#3b82f6" name="Custo Total" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Resumo por Fornecedor</h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {data
              .sort((a, b) => b.custo_total - a.custo_total)
              .map((item, index) => (
                <div key={item.fornecedor_id} className="flex items-center justify-between pb-3 border-b last:border-b-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium text-gray-900">{item.fornecedor_nome}</p>
                      <p className="text-xs text-gray-600">{item.total_chamados} chamados</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(item.custo_total)}</p>
                    <p className="text-xs text-gray-600">{((item.custo_total / totalCusto) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <p className="text-sm text-blue-900 font-semibold">CUSTO TOTAL COM FORNECEDORES</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{formatCurrency(totalCusto)}</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <p className="text-sm text-purple-900 font-semibold">CUSTO MÉDIO POR FORNECEDOR</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {formatCurrency(data.length > 0 ? totalCusto / data.length : 0)}
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <p className="text-sm text-green-900 font-semibold">TOTAL DE CHAMADOS</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {data.reduce((sum, item) => sum + item.total_chamados, 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
