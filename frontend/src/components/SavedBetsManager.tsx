"use client";

import { useState } from "react";
import { SavedBet, deleteSavedBet, analyzeBetEfficiency } from "../lib/api";

interface SavedBetsManagerProps {
  bets: SavedBet[];
  onRefresh: () => void;
}

export function SavedBetsManager({ bets, onRefresh }: SavedBetsManagerProps) {
  const [selectedBet, setSelectedBet] = useState<SavedBet | null>(null);
  const [finalResultInput, setFinalResultInput] = useState("");
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  const [efficiencyModalOpen, setEfficiencyModalOpen] = useState(false);
  const [efficiencyAnalysisText, setEfficiencyAnalysisText] = useState<string | null>(null);
  const [modalMatchName, setModalMatchName] = useState<string>("");

  const handleOpenEfficiencyDialog = (bet: SavedBet) => {
    setSelectedBet(bet);
    setFinalResultInput(bet.final_result || "");
    if (bet.status === "Finalizado" && bet.efficiency_analysis) {
      setEfficiencyAnalysisText(bet.efficiency_analysis);
      setModalMatchName(bet.match_name);
      setEfficiencyModalOpen(true);
    }
  };

  const handleRunEfficiencyAnalysis = async (bet: SavedBet) => {
    if (!finalResultInput.trim()) {
      alert("Por favor ingresa el resultado final del partido (ej: Real Madrid 2 - 1 Barcelona).");
      return;
    }
    setAnalyzingId(bet.id);
    try {
      const res = await analyzeBetEfficiency(bet.id, finalResultInput);
      setEfficiencyAnalysisText(res.analysis);
      setModalMatchName(bet.match_name);
      setEfficiencyModalOpen(true);
      onRefresh();
    } catch (e: any) {
      alert(`Error al realizar el análisis de eficiencia: ${e.message || e}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta apuesta guardada?")) {
      try {
        await deleteSavedBet(id);
        onRefresh();
      } catch (e) {
        alert("Error al eliminar la apuesta.");
      }
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-lg p-5">
      <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-zinc-850 pb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Apuestas Guardadas y Análisis de Eficiencia ({bets.length})
      </h3>

      {bets.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-550 text-center py-6">
          No tienes apuestas guardadas individualmente. Haz clic en ⚡ Groq en la tabla de partidos para analizar y luego guardar tus apuestas.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
          {bets.map((bet) => (
            <div
              key={bet.id}
              className="bg-gray-50/70 dark:bg-zinc-800/50 border border-gray-200/60 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className="text-[11px] font-medium text-gray-400">
                    Guardado: {bet.created_at}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    bet.status === "Finalizado"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40"
                  }`}>
                    {bet.status}
                  </span>
                </div>

                <h4 className="font-bold text-gray-900 dark:text-emerald-400 text-base mt-1">
                  {bet.match_name}
                </h4>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {bet.league} • {bet.date_time}
                </p>

                <div className="mt-3 p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 text-xs">
                  <p className="text-gray-500 dark:text-zinc-400">Mercado Apostado:</p>
                  <p className="font-bold text-gray-800 dark:text-zinc-100 text-sm mt-0.5">
                    {bet.selected_market} <span className="text-emerald-600 dark:text-emerald-400">@ {bet.odds.toFixed(2)}</span>
                  </p>
                </div>

                {bet.final_result && (
                  <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded text-xs">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300">Resultado Final: </span>
                    <span className="font-bold text-emerald-900 dark:text-emerald-200">{bet.final_result}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-zinc-800 flex flex-col gap-2">
                {selectedBet?.id === bet.id && bet.status === "Pendiente" ? (
                  <div className="space-y-2 bg-zinc-100 dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 block">
                      Resultado Real/Final del Partido:
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Real Madrid 2 - 1 Barcelona"
                      value={finalResultInput}
                      onChange={(e) => setFinalResultInput(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRunEfficiencyAnalysis(bet)}
                        disabled={analyzingId === bet.id}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded transition-colors flex items-center justify-center gap-1"
                      >
                        {analyzingId === bet.id ? (
                          <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                        ) : "📊 Auditar Eficiencia con Groq"}
                      </button>
                      <button
                        onClick={() => setSelectedBet(null)}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs rounded"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-between items-center">
                    {bet.status === "Pendiente" ? (
                      <button
                        onClick={() => handleOpenEfficiencyDialog(bet)}
                        className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        ⚡ Analizar Eficiencia del Partido
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenEfficiencyDialog(bet)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        📋 Ver Informe de Eficiencia
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(bet.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Eliminar apuesta"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Auditoria de Eficiencia */}
      {efficiencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-start p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Auditoría de Eficiencia y Acierto IA
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 ml-7 font-medium">{modalMatchName}</p>
              </div>
              <button onClick={() => setEfficiencyModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-w-none text-xs sm:text-sm leading-relaxed flex-1">
              <pre className="whitespace-pre-wrap font-[inherit] text-zinc-700 dark:text-zinc-300">{efficiencyAnalysisText}</pre>
            </div>

            <div className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex justify-end">
              <button
                onClick={() => setEfficiencyModalOpen(false)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Cerrar Informe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
