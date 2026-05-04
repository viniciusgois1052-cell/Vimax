import React from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

const ContractAlertsModal = ({ alertas, onClose }) => {
  if (!alertas || alertas.length === 0) {
    return null;
  }

  const alertasVencidos = alertas.filter(a => a.status === 'VENCIDO');
  const alertasProximos = alertas.filter(a => a.status === 'PROXIMO');

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-red-500 to-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Atenção: Contratos que Requerem Ação</h2>
              <p className="text-red-100 text-sm mt-1">
                Existem {alertas.length} contrato(s) que precisam de sua atenção imediata.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-all"
            title="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {/* Contratos Vencidos */}
          {alertasVencidos.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-red-600 rounded-full"></div>
                <h3 className="text-lg font-bold text-red-600">
                  Contratos Vencidos ({alertasVencidos.length})
                </h3>
              </div>
              <div className="space-y-3">
                {alertasVencidos.map((alerta, idx) => (
                  <div
                    key={`vencido-${idx}`}
                    className="p-4 bg-red-50 rounded-2xl border-l-4 border-red-500 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                            VENCIDO
                          </span>
                          <p className="font-bold text-red-800">Contrato #{alerta.numero}</p>
                        </div>
                        <p className="text-sm text-red-700 mb-2">
                          <strong>Fornecedor:</strong> {alerta.fornecedor_nome}
                        </p>
                        <p className="text-sm text-red-700 mb-2">
                          <strong>Data de Vencimento:</strong>{' '}
                          {new Date(alerta.data_fim).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-red-600 font-bold">
                          ⚠️ Vencido há {Math.abs(alerta.dias_restantes)} dia(s)
                        </p>
                        {alerta.observacao && (
                          <p className="text-xs text-red-600 mt-2 italic">
                            <strong>Obs:</strong> {alerta.observacao}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divisor */}
          {alertasVencidos.length > 0 && alertasProximos.length > 0 && (
            <div className="border-t border-slate-200 my-6"></div>
          )}

          {/* Contratos Próximos */}
          {alertasProximos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                <h3 className="text-lg font-bold text-amber-600">
                  Contratos Próximos do Vencimento ({alertasProximos.length})
                </h3>
              </div>
              <div className="space-y-3">
                {alertasProximos.map((alerta, idx) => (
                  <div
                    key={`proximo-${idx}`}
                    className="p-4 bg-amber-50 rounded-2xl border-l-4 border-amber-500 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle size={18} className="text-amber-600" />
                          <p className="font-bold text-amber-800">Contrato #{alerta.numero}</p>
                        </div>
                        <p className="text-sm text-amber-700 mb-2">
                          <strong>Fornecedor:</strong> {alerta.fornecedor_nome}
                        </p>
                        <p className="text-sm text-amber-700 mb-2">
                          <strong>Data de Vencimento:</strong>{' '}
                          {new Date(alerta.data_fim).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-amber-600 font-bold">
                          📅 Vence em {alerta.dias_restantes} dia(s)
                        </p>
                        {alerta.observacao && (
                          <p className="text-xs text-amber-600 mt-2 italic">
                            <strong>Obs:</strong> {alerta.observacao}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all active:scale-95"
          >
            Entendi, Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContractAlertsModal;
