"use client";

import { Fixture } from "../lib/api";

interface StatsOverviewProps {
  fixtures: Fixture[];
}

export function StatsOverview({ fixtures }: StatsOverviewProps) {
  const total = fixtures.length;
  
  const avgOdds = total > 0 
    ? fixtures.reduce((acc, curr) => acc + curr.odds, 0) / total 
    : 0;

  const avgProb = total > 0 
    ? fixtures.reduce((acc, curr) => acc + curr.probability, 0) / total 
    : 0;

  const lowRiskCount = fixtures.filter(f => f.risk_level.toLowerCase() === 'verde').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Match Card */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Eventos Analizados</p>
            <h3 className="text-2xl font-bold mt-1 text-[#1e3932] dark:text-green-400">{total}</h3>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-green-600 dark:text-green-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Partidos en las ligas principales</p>
      </div>

      {/* Average Odds Card */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cuota Promedio</p>
            <h3 className="text-2xl font-bold mt-1 text-[#1e3932] dark:text-green-400">{avgOdds.toFixed(2)}</h3>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-emerald-600 dark:text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Multiplicador medio por partido</p>
      </div>

      {/* Probability Card */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Probabilidad Éxito</p>
            <h3 className="text-2xl font-bold mt-1 text-[#1e3932] dark:text-green-400">{(avgProb * 100).toFixed(0)}%</h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-blue-600 dark:text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Modelo predictivo probabilístico</p>
      </div>

      {/* Low Risk Card */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Riesgo Bajo (Verde)</p>
            <h3 className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{lowRiskCount}</h3>
          </div>
          <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-lg text-teal-600 dark:text-teal-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Partidos altamente seguros</p>
      </div>
    </div>
  );
}
