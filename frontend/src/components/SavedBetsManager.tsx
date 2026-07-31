"use client";

import { useState, useMemo } from "react";
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

  // Rango de Fechas
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Determinar estado de la apuesta según fecha/hora en GMT-6 (Costa Rica) y resultado
  const getMatchState = (bet: SavedBet) => {
    if (bet.prediction_result && bet.prediction_result !== "Pendiente") {
      return bet.prediction_result; // "Acertada", "Fallada", "Nula"
    }

    if (!bet.date_time || bet.date_time === "Por definir") {
      return "Pendiente de resultado";
    }

    try {
      // Formato "YYYY-MM-DD HH:MM" en hora de Costa Rica (GMT-6)
      const [datePart, timePart] = bet.date_time.split(" ");
      if (!datePart || !timePart) return "Pendiente de resultado";

      const [year, month, day] = datePart.split("-").map(Number);
      const [hours, minutes] = timePart.split(":").map(Number);

      const matchDate = new Date(year, month - 1, day, hours, minutes);
      const now = new Date(); // Hora local (Costa Rica GMT-6)

      const diffMs = matchDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours > 0) {
        return "Por iniciar";
      } else if (diffHours >= -2.0) { // Partido en juego (aprox 2 horas de duración)
        return "En juego";
      } else {
        return "Pendiente de resultado";
      }
    } catch {
      return "Pendiente de resultado";
    }
  };

  // Filtrar por rango de fechas
  const filteredBets = useMemo(() => {
    return bets.filter((bet) => {
      if (!bet.created_at && !bet.date_time) return true;
      const betDateStr = (bet.created_at || bet.date_time).split(" ")[0];
      if (startDate && betDateStr < startDate) return false;
      if (endDate && betDateStr > endDate) return false;
      return true;
    });
  }, [bets, startDate, endDate]);

  // Estadísticas del rango seleccionado
  const stats = useMemo(() => {
    let acertadas = 0;
    let falladas = 0;
    let nulas = 0;
    let pendientes = 0;

    filteredBets.forEach((bet) => {
      const state = getMatchState(bet);
      if (state === "Acertada") acertadas++;
      else if (state === "Fallada") falladas++;
      else if (state === "Nula") nulas++;
      else pendientes++;
    });

    const totalEvaluadas = acertadas + falladas;
    const winRate = totalEvaluadas > 0 ? (acertadas / totalEvaluadas) * 100 : 0;

    return {
      total: filteredBets.length,
      acertadas,
      falladas,
      nulas,
      pendientes,
      winRate: winRate.toFixed(1),
    };
  }, [filteredBets]);

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
      alert("Por favor ingresa el resultado final (ej: Real Madrid 2 - 1 Barcelona / Córners: 11, Tarjetas: 5).");
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
      alert(`Error al realizar la validación de eficiencia: ${e.message || e}`);
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
    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-lg p-5 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 dark:border-zinc-850 pb-4">
        <div>
          <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Apuestas Guardadas y Rendimiento de Predicciones
          </h3>
          <p className="text-xs text-gray-400 dark:text-zinc-400 mt-0.5">
            Horarios sincronizados con zona horaria de Costa Rica (GMT-6)
          </p>
        </div>
      </div>

      {/* Date Range Filter & Stats Panel */}
      <div className="bg-gray-50 dark:bg-zinc-800/60 p-4 rounded-xl border border-gray-200/70 dark:border-zinc-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Filtrar por Rango de Fechas
          </h4>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-zinc-400">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 dark:text-zinc-400">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-lg text-gray-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); }}
                className="px-2.5 py-1 text-xs bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-zinc-200 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-gray-200/60 dark:border-zinc-800 text-center">
            <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500">Total Apuestas</p>
            <p className="text-xl font-extrabold text-gray-900 dark:text-zinc-100 mt-0.5">{stats.total}</p>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-900/40 text-center">
            <p className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Acertadas</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.acertadas}</p>
          </div>

          <div className="bg-red-50/60 dark:bg-red-950/20 p-3 rounded-lg border border-red-200/60 dark:border-red-900/40 text-center">
            <p className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400">Falladas</p>
            <p className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">{stats.falladas}</p>
          </div>

          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-center">
            <p className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Pendientes</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">{stats.pendientes}</p>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-purple-50/60 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200/60 dark:border-purple-900/40 text-center">
            <p className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">% Acierto (Win Rate)</p>
            <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">{stats.winRate}%</p>
          </div>
        </div>
      </div>

      {/* Bets Grid */}
      {filteredBets.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-550 text-center py-6">
          No hay apuestas registradas en el rango de fechas seleccionado.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-1">
          {filteredBets.map((bet) => {
            const state = getMatchState(bet);
            const badgeClass =
              state === "Acertada" ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300 border-green-300"
              : state === "Fallada" ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-300"
              : state === "Por iniciar" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-300"
              : state === "En juego" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 animate-pulse"
              : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300";

            return (
              <div
                key={bet.id}
                className="bg-gray-50/70 dark:bg-zinc-800/50 border border-gray-200/60 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-all"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-medium text-gray-400">
                      Guardado: {bet.created_at}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                      {state}
                    </span>
                  </div>

                  <h4 className="font-bold text-gray-900 dark:text-emerald-400 text-base mt-1">
                    {bet.match_name}
                  </h4>

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {bet.league} • <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bet.date_time} (Costa Rica)</span>
                  </p>

                  <div className="mt-3 p-2.5 bg-white dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 text-xs">
                    <p className="text-gray-500 dark:text-zinc-400">Mercado Apostado (Córners / Tarjetas):</p>
                    <p className="font-bold text-gray-800 dark:text-zinc-100 text-sm mt-0.5">
                      {bet.selected_market} <span className="text-emerald-600 dark:text-emerald-400">@ {bet.odds.toFixed(2)}</span>
                    </p>
                  </div>

                  {bet.final_result && (
                    <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded text-xs">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">Resultado Final Real: </span>
                      <span className="font-bold text-emerald-900 dark:text-emerald-200">{bet.final_result}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200/50 dark:border-zinc-800 flex flex-col gap-2">
                  {selectedBet?.id === bet.id && bet.status === "Pendiente" ? (
                    <div className="space-y-2 bg-zinc-100 dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 block">
                        Resultado Final del Partido (Goles, Córners y Tarjetas):
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Barcelona 2 - 1 Madrid (Córners: 11, Tarjetas: 5)"
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
                          ⚡ Validar Predicción con IA
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
            );
          })}
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
                  Auditoría de Eficiencia y Acierto IA (Córners &amp; Tarjetas)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 ml-7 font-medium">{modalMatchName}</p>
              </div>
              <button onClick={() => setEfficiencyModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto text-xs sm:text-sm leading-relaxed flex-1">
              {efficiencyAnalysisText ? (
                <pre className="whitespace-pre-wrap font-[inherit] text-zinc-700 dark:text-zinc-300">{efficiencyAnalysisText}</pre>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400">No hay reporte disponible.</p>
              )}
            </div>

            <div className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex justify-end">
              <button
                onClick={() => setEfficiencyModalOpen(false)}
                className="px-5 py-2 bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200 hover:bg-gray-300 dark:hover:bg-zinc-700 rounded-lg font-medium transition-colors text-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
