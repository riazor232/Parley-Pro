"use client";

import { SavedParley } from "../lib/api";

interface SavedParleysProps {
  parleys: SavedParley[];
  onDelete: (id: number) => Promise<void>;
}

export function SavedParleys({ parleys, onDelete }: SavedParleysProps) {
  const parseItems = (itemsStr: string) => {
    try {
      return JSON.parse(itemsStr) as Array<{
        match_name: string;
        odds: number;
        market: string;
        league: string;
      }>;
    } catch (e) {
      return [];
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-lg p-5">
      <h3 className="font-bold text-lg text-gray-900 dark:text-zinc-100 flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-zinc-850 pb-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Parlays Guardados ({parleys.length})
      </h3>

      {parleys.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-550 text-center py-6">
          No hay parlays simulados guardados. ¡Crea uno en el boleto de apuestas superior!
        </p>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {parleys.map((parley) => {
            const items = parseItems(parley.items);
            return (
              <div
                key={parley.id}
                className="bg-gray-50/50 dark:bg-zinc-850/40 border border-gray-200/60 dark:border-zinc-800 rounded-lg p-4 relative group hover:shadow-md transition-all duration-300"
              >
                {/* Header info */}
                <div className="flex justify-between items-start mb-2 pr-6">
                  <div>
                    <span className="text-[11px] font-medium text-gray-400">
                      {parley.created_at}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-[#e6fbf3] dark:bg-green-950/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-bold">
                        Cuota: {parley.total_odds.toFixed(2)}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-zinc-850 text-gray-700 dark:text-zinc-350 px-2 py-0.5 rounded-full font-semibold">
                        Apuesta: ${parley.stake.toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Retorno Est.</p>
                    <p className="text-sm font-extrabold text-green-600 dark:text-green-450">
                      ${parley.potential_payout.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Items list */}
                <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-zinc-800 space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-gray-900 dark:text-emerald-400 truncate" title={item.match_name}>
                          {item.match_name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {item.league} • <span className="text-green-700 dark:text-green-550">{item.market}</span>
                        </p>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-zinc-50 shrink-0">
                        {item.odds.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Delete button absolute */}
                <button
                  onClick={() => onDelete(parley.id)}
                  className="absolute top-3 right-3 text-gray-300 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Eliminar parlay"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
