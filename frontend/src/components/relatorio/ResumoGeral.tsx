import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ResumoGeralProps {
  total_chamados: number;
  chamados_abertos: number;
  chamados_concluidos: number;
  chamados_em_andamento: number;
  custo_total: number;
  custo_medio: number;
  taxa_conclusao: number;
  tempo_medio_resolucao_dias: number;
}

export const ResumoGeral: React.FC<ResumoGeralProps> = ({
  total_chamados,
  chamados_abertos,
  chamados_concluidos,
  chamados_em_andamento,
  custo_total,
  custo_medio,
  taxa_conclusao,
  tempo_medio_resolucao_dias,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total de Chamados */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Total de Chamados</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{total_chamados}</p>
          </div>
          <AlertCircle className="w-12 h-12 text-blue-500 opacity-20" />
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
            Abertos: {chamados_abertos}
          </span>
          <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded">
            Concluídos: {chamados_concluidos}
          </span>
        </div>
      </div>

      {/* Chamados em Andamento */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Em Andamento</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{chamados_em_andamento}</p>
          </div>
          <Clock className="w-12 h-12 text-yellow-500 opacity-20" />
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <p>Tempo médio: {tempo_medio_resolucao_dias.toFixed(1)} dias</p>
        </div>
      </div>

      {/* Taxa de Conclusão */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Taxa de Conclusão</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatPercentage(taxa_conclusao)}</p>
          </div>
          <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <p>{chamados_concluidos} de {total_chamados} concluídos</p>
        </div>
      </div>

      {/* Custo Total */}
      <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm font-medium">Custo Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(custo_total)}</p>
          </div>
          <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
        </div>
        <div className="mt-4 text-xs text-gray-500">
          <p>Médio: {formatCurrency(custo_medio)}</p>
        </div>
      </div>
    </div>
  );
};
