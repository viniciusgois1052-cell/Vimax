import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CriticidadeData {
  criticidade: string;
  informada: number;
  real: number;
  diferenca: number;
}

interface ComparativoCriticidadeProps {
  data: CriticidadeData[];
}

export const ComparativoCriticidade: React.FC<ComparativoCriticidadeProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{payload[0].payload.criticidade}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
          <p className="text-sm text-red-600 font-semibold mt-1">
            Diferença: {payload[0].payload.diferenca}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Comparativo: Criticidade Informada vs Real</h2>
        <p className="text-sm text-gray-600 mt-1">Análise de discrepâncias entre a criticidade informada e a real</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Nota:</span> A diferença entre criticidade informada e real pode indicar 
          problemas na avaliação inicial ou mudanças na situação do chamado.
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="criticidade" stroke="#6b7280" />
          <YAxis stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
          />
          <Bar dataKey="informada" fill="#3b82f6" name="Informada" radius={[8, 8, 0, 0]} />
          <Bar dataKey="real" fill="#ef4444" name="Real" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {data.map((item) => (
          <div key={item.criticidade} className="bg-gray-50 rounded p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-600">{item.criticidade}</p>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Informada:</span>
                <span className="font-semibold text-blue-600">{item.informada}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Real:</span>
                <span className="font-semibold text-red-600">{item.real}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-xs text-gray-600">Diferença:</span>
                <span className={`font-semibold ${item.diferenca > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {item.diferenca}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
