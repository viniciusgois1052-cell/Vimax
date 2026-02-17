import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

interface MesData {
  mes: string;
  chamados_abertos: number;
  chamados_encerrados: number;
  taxa_conclusao: number;
}

interface ChamadosPorMesProps {
  data: MesData[];
}

export const ChamadosPorMes: React.FC<ChamadosPorMesProps> = ({ data }) => {
  const formatMes = (mes: string) => {
    const [ano, mês] = mes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mês) - 1]}/${ano}`;
  };

  const dataFormatada = data.map(item => ({
    ...item,
    mes_formatado: formatMes(item.mes),
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{payload[0].payload.mes_formatado}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalAbertos = data.reduce((sum, item) => sum + item.chamados_abertos, 0);
  const totalEncerrados = data.reduce((sum, item) => sum + item.chamados_encerrados, 0);
  const taxaMediaConclusao = data.length > 0 
    ? data.reduce((sum, item) => sum + item.taxa_conclusao, 0) / data.length 
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Chamados por Mês</h2>
        <p className="text-sm text-gray-600 mt-1">Análise temporal de chamados abertos e encerrados</p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={dataFormatada} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="mes_formatado" stroke="#6b7280" />
          <YAxis yAxisId="left" stroke="#6b7280" />
          <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Bar yAxisId="left" dataKey="chamados_abertos" fill="#3b82f6" name="Abertos" radius={[8, 8, 0, 0]} />
          <Bar yAxisId="left" dataKey="chamados_encerrados" fill="#10b981" name="Encerrados" radius={[8, 8, 0, 0]} />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="taxa_conclusao" 
            stroke="#f59e0b" 
            name="Taxa de Conclusão (%)"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <p className="text-sm text-blue-900 font-semibold">TOTAL ABERTO NO PERÍODO</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{totalAbertos}</p>
          <p className="text-xs text-blue-700 mt-2">
            Média: {(totalAbertos / data.length).toFixed(1)} por mês
          </p>
        </div>

        <div className="bg-green-50 rounded-lg p-6 border border-green-200">
          <p className="text-sm text-green-900 font-semibold">TOTAL ENCERRADO NO PERÍODO</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{totalEncerrados}</p>
          <p className="text-xs text-green-700 mt-2">
            Média: {(totalEncerrados / data.length).toFixed(1)} por mês
          </p>
        </div>

        <div className="bg-amber-50 rounded-lg p-6 border border-amber-200">
          <p className="text-sm text-amber-900 font-semibold">TAXA MÉDIA DE CONCLUSÃO</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{taxaMediaConclusao.toFixed(1)}%</p>
          <p className="text-xs text-amber-700 mt-2">
            Variação: {Math.min(...data.map(d => d.taxa_conclusao)).toFixed(1)}% - {Math.max(...data.map(d => d.taxa_conclusao)).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Detalhes por Mês</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Mês</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Abertos</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Encerrados</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-700">Taxa (%)</th>
              </tr>
            </thead>
            <tbody>
              {dataFormatada.map((item) => (
                <tr key={item.mes} className="border-b hover:bg-gray-100 transition">
                  <td className="px-4 py-2 font-medium text-gray-900">{item.mes_formatado}</td>
                  <td className="px-4 py-2 text-center text-blue-600 font-semibold">{item.chamados_abertos}</td>
                  <td className="px-4 py-2 text-center text-green-600 font-semibold">{item.chamados_encerrados}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      item.taxa_conclusao >= 80 ? 'bg-green-100 text-green-800' :
                      item.taxa_conclusao >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.taxa_conclusao.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
