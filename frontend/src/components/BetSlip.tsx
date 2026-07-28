"use client";

import { useState } from "react";
import { Fixture, saveParley, SavedParleyCreate } from "../lib/api";

interface BetSlipProps {
  selectedFixtures: Fixture[];
  onRemoveFixture: (id: number) => void;
  onParleySaved: () => void;
  onClearSlip: () => void;
}

export function BetSlip({
  selectedFixtures,
  onRemoveFixture,
  onParleySaved,
  onClearSlip,
}: BetSlipProps) {
  const [stake, setStake] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Calculate cumulative odds
  const totalOdds = selectedFixtures.reduce((acc, curr) => acc * curr.odds, 1);
  const potentialPayout = stake * totalOdds;
  const potentialProfit = potentialPayout - stake;

  // Determine global risk level
  const getGlobalRisk = () => {
    if (selectedFixtures.length === 0) return { label: "N/A", color: "text-gray-400 border-gray-200" };
    const hasRed = selectedFixtures.some((f) => f.risk_level.toLowerCase() === "rojo");
    const allGreen = selectedFixtures.every((f) => f.risk_level.toLowerCase() === "verde");

    if (hasRed) {
      return { label: "Riesgo Alto", color: "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/40" };
    }
    if (allGreen) {
      return { label: "Riesgo Bajo", color: "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/40" };
    }
    return { label: "Riesgo Medio", color: "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/40" };
  };

  const globalRisk = getGlobalRisk();

  const handleSave = async () => {
    if (selectedFixtures.length === 0 || stake <= 0) return;

    setSaving(true);
    setMessage(null);

    // Format items as a simple JSON string array of match names and odds
    const itemsData = selectedFixtures.map((f) => ({
      match_name: f.match_name,
      odds: f.odds,
      market: f.market,
      league: f.league,
    }));

    const newParley: SavedParleyCreate = {
      stake: parseFloat(stake.toFixed(2)),
      total_odds: parseFloat(totalOdds.toFixed(2)),
      potential_payout: parseFloat(potentialPayout.toFixed(2)),
      created_at: new Date().toLocaleString("es-ES", { timeZone: "America/Mexico_City" }),
      items: JSON.stringify(itemsData),
    };

    try {
      await saveParley(newParley);
      setMessage({ type: "success", text: "¡Parley guardado con éxito!" });
      onClearSlip();
      onParleySaved();
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar el Parley" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden transition-all">
      <div className="bg-[#1e3932] dark:bg-zinc-950 p-4 text-white flex justify-between items-center border-b border-green-800/10">
        <h3 className="font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-450" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          Boleto de Apuestas
          <span className="bg-green-600 text-xs px-2 py-0.5 rounded-full ml-1 font-semibold">
            {selectedFixtures.length}
          </span>
        </h3>
        {selectedFixtures.length > 0 && (
          <button
            onClick={onClearSlip}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors border border-zinc-700 px-2 py-1 rounded"
          >
            Limpiar Todo
          </button>
        )}
      </div>

      {message && (
        <div
          className={`p-3 text-sm text-center font-semibold border-b ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900"
              : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900"
          }`}
        >
          {message.text}
        </div>
      )}

      {selectedFixtures.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 dark:text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-gray-700 dark:text-zinc-300 text-sm">Boleto Vacío</p>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Añade pronósticos desde la tabla haciendo clic en el botón (+)</p>
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Selected Bets List */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {selectedFixtures.map((fixture) => (
              <div
                key={fixture.id}
                className="flex items-center justify-between p-2.5 bg-gray-55/70 dark:bg-zinc-800/60 rounded-lg border border-gray-150 dark:border-zinc-800/80 group hover:border-green-200 dark:hover:border-green-900/50 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-gray-900 dark:text-emerald-400 truncate" title={fixture.match_name}>
                      {fixture.match_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                    <span className="font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded">
                      {fixture.market}
                    </span>
                    <span>•</span>
                    <span className="truncate">{fixture.league}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 dark:text-zinc-50 text-sm">
                    {fixture.odds.toFixed(2)}
                  </span>
                  <button
                    onClick={() => onRemoveFixture(fixture.id)}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    title="Eliminar de boleto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <hr className="border-gray-100 dark:border-zinc-800" />

          {/* Calculator Info */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Cuota Acumulada:</span>
              <span className="font-bold text-base text-gray-950 dark:text-zinc-50">
                {totalOdds.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-t border-dotted border-gray-200 dark:border-zinc-800 pt-2">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Riesgo Combinado:</span>
              <span className={`text-xs font-bold px-2 py-0.5 border rounded-full ${globalRisk.color}`}>
                {globalRisk.label}
              </span>
            </div>

            {/* Stake Input */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Monto de Apuesta ($ USD)
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400 font-semibold text-sm">
                  $
                </div>
                <input
                  type="number"
                  min="1"
                  value={stake}
                  onChange={(e) => setStake(Math.max(1, parseFloat(e.target.value) || 1))}
                  className="w-full pl-7 pr-3 py-2 bg-gray-50/50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 rounded-lg text-sm font-semibold text-gray-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Potential Results */}
            <div className="bg-green-50/40 dark:bg-green-950/10 p-3 rounded-lg border border-green-100/50 dark:border-green-900/30 space-y-1.5 mt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 dark:text-gray-400">Retorno Total:</span>
                <span className="font-bold text-gray-900 dark:text-zinc-150">
                  ${potentialPayout.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold border-t border-green-100 dark:border-green-900/20 pt-1.5">
                <span className="text-[#1e3932] dark:text-green-450">Ganancia Neta:</span>
                <span className="text-green-700 dark:text-green-400">
                  +${potentialProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleSave}
            disabled={saving || selectedFixtures.length === 0}
            className="w-full bg-[#10b981] hover:bg-emerald-600 active:scale-[0.98] disabled:bg-gray-250 dark:disabled:bg-zinc-850 disabled:text-gray-400 dark:disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2"
          >
            {saving ? (
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            Guardar Parley Simulado
          </button>
        </div>
      )}
    </div>
  );
}
