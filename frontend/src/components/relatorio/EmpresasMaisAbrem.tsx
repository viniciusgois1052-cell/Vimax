import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface EmpresaData {
  empresa_id: number;
  empresa_nome: string;
  total_chamados: number;
  chamados_abertos: number;
  chamados_concluidos: number;
  percentual_conclusao: number;
}

interface EmpresasMaisAbremProps {
  data: EmpresaData[];
}

export const EmpresasMaisAbrem: React.FC<EmpresasMaisAbremProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof EmpresaData;
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

  const handleSort = (key: keyof EmpresaData) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const SortIcon = ({ column }: { column: keyof EmpresaData }) => {
    if (sortConfig.key !== column) return <div className="w-4 h-4" />;
    return sortConfig.direction === 'desc' ? (
      <ChevronDown className="w-4 h-4" />
    ) : (
      <ChevronUp className="w-4 h-4" />
    );
  };

  const getStatusColor = (percentual: number) => {
    if (percentual >= 80) return 'bg-green-100 text-green-800';
    if (percentual >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Empresas que Mais Abrem Chamados</h2>
        <p className="text-sm text-gray-600 mt-1">Ranking de empresas por volume de chamados</p>
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
                  Total
                  <SortIcon column="total_chamados" />
                </button>
              </th>
              <th className="px-6 py-3 text-center">
                <button
                  onClick={() => handleSort('chamados_abertos')}
                  className="flex items-center justify-center gap-2 font-semibold text-gray-700 hover:text-gray-900 w-full"
                >
                  Abertos
                  <SortIcon column="chamados_abertos" />
                </button>
              </th>
              <th className="px-6 py-3 text-center">
                <button
                  onClick={() => handleSort('chamados_concluidos')}
                  className="flex items-center justify-center gap-2 font-semibold text-gray-700 hover:text-gray-900 w-full"
                >
                  Concluídos
                  <SortIcon column="chamados_concluidos" />
                </button>
              </th>
              <th className="px-6 py-3 text-center">
                <button
                  onClick={() => handleSort('percentual_conclusao')}
                  className="flex items-center justify-center gap-2 font-semibold text-gray-700 hover:text-gray-900 w-full"
                >
                  Taxa
                  <SortIcon column="percentual_conclusao" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((empresa, index) => (
              <tr key={empresa.empresa_id} className="border-b hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{empresa.empresa_nome}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                    {empresa.total_chamados}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-orange-600 font-medium">{empresa.chamados_abertos}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-green-600 font-medium">{empresa.chamados_concluidos}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(empresa.percentual_conclusao)}`}>
                    {empresa.percentual_conclusao.toFixed(1)}%
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
