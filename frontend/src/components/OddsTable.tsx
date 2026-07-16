"use client";

import { useState } from "react";
import { Fixture } from "../lib/api";

interface OddsTableProps {
  fixtures: Fixture[];
  selectedFixtureIds: number[];
  onAddFixture: (fixture: Fixture) => void;
}

export function OddsTable({ fixtures, selectedFixtureIds, onAddFixture }: OddsTableProps) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("todos");
  const [leagueFilter, setLeagueFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("todos");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Fixture; direction: "asc" | "desc" } | null>(null);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Get unique leagues for filter dropdown
  const leagues = Array.from(new Set(fixtures.map((f) => f.league)));

  // Filter fixtures based on search, risk level, and league
  const filteredFixtures = fixtures.filter((fixture) => {
    const matchesSearch = fixture.match_name.toLowerCase().includes(search.toLowerCase()) || 
                          fixture.league.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = riskFilter === "todos" || fixture.risk_level.toLowerCase() === riskFilter.toLowerCase();
    const matchesLeague = leagueFilter === "todos" || fixture.league === leagueFilter;
    
    let matchesDate = true;
    if (dateFilter !== "todos" && fixture.date_time && fixture.date_time !== "Por definir") {
      // Create local date object by extracting just the YYYY-MM-DD
      const datePart = fixture.date_time.split(" ")[0];
      const [year, month, day] = datePart.split("-").map(Number);
      const fixDate = new Date(year, month - 1, day);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      if (dateFilter === "hoy") {
        matchesDate = fixDate.getTime() === today.getTime();
      } else if (dateFilter === "manana") {
        matchesDate = fixDate.getTime() === tomorrow.getTime();
      }
    }

    return matchesSearch && matchesRisk && matchesLeague && matchesDate;
  });

  const sortedFixtures = [...filteredFixtures].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
    if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Fixture) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800/80 overflow-hidden transition-all duration-300">
      <div className="bg-gradient-to-r from-[#10b981] to-emerald-600 p-5 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Pronósticos Recomendados
        </h2>
        <p className="text-green-50 text-sm mt-1">Mejores oportunidades calculadas probabilísticamente</p>
      </div>

      {/* Search and Filters Panel */}
      <div className="p-4 bg-gray-50/50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400 dark:text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar partido o liga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-zinc-100"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Date Dropdown */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
          >
            <option value="todos">Todos los días</option>
            <option value="hoy">Hoy</option>
            <option value="manana">Mañana</option>
          </select>

          {/* League Dropdown */}
          <select
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
          >
            <option value="todos">Todas las Ligas</option>
            {leagues.map((league) => (
              <option key={league} value={league}>
                {league}
              </option>
            ))}
          </select>

          {/* Risk Filters */}
          <div className="flex bg-gray-150 dark:bg-zinc-800 p-1 rounded-lg border border-gray-200 dark:border-zinc-700/80">
            {["todos", "verde", "amarillo", "rojo"].map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-all ${
                  riskFilter === risk
                    ? "bg-white dark:bg-zinc-700 text-green-700 dark:text-green-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
                }`}
              >
                {risk === "todos" ? "Todos" : risk}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Specific Match Search (API) */}
      <div className="p-4 bg-white dark:bg-zinc-800/80 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">¿No encuentras el partido?</p>
          <div className="flex items-center w-full sm:w-auto gap-2">
            <input
              type="text"
              id="specificSearchInput"
              placeholder="Ej. Real Madrid, Juventus..."
              className="w-full sm:w-64 px-3 py-1.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const val = e.currentTarget.value;
                  if (!val) return;
                  const btn = document.getElementById('searchSpecificBtn') as HTMLButtonElement;
                  if (btn) btn.click();
                }
              }}
            />
            <button
              id="searchSpecificBtn"
              className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={async (e) => {
                const input = document.getElementById('specificSearchInput') as HTMLInputElement;
                const query = input?.value;
                if (!query) return;
                
                const btn = e.currentTarget;
                btn.disabled = true;
                const originalText = btn.innerHTML;
                btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Buscando...';
                
                try {
                  const { searchFixtures } = await import('@/lib/api');
                  const newFixtures = await searchFixtures(query);
                  if (newFixtures.length > 0) {
                    alert(`¡Encontramos ${newFixtures.length} partido(s)! Recarga la vista local para verlos.`);
                    input.value = "";
                  } else {
                    alert("No se encontraron partidos para ese equipo en la API.");
                  }
                } catch (err) {
                  alert("Error al buscar el partido en la API.");
                } finally {
                  btn.innerHTML = originalText;
                  btn.disabled = false;
                }
              }}
            >
              Buscar en API
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-250 dark:border-zinc-800 text-gray-500 dark:text-gray-450 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Partido</th>
              <th 
                className="p-4 font-semibold cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors select-none"
                onClick={() => handleSort("date_time")}
              >
                <div className="flex items-center gap-1">
                  Fecha/Hora
                  <span className={`text-gray-400 ${sortConfig?.key === "date_time" ? "opacity-100" : "opacity-30"}`}>
                    {sortConfig?.key === "date_time" && sortConfig.direction === "desc" ? "↓" : "↑"}
                  </span>
                </div>
              </th>
              <th className="p-4 font-semibold">Liga</th>
              <th className="p-4 font-semibold">Mercado</th>
              <th className="p-4 font-semibold">Cuota</th>
              <th className="p-4 font-semibold">Probabilidad</th>
              <th className="p-4 font-semibold">Riesgo</th>
              <th className="p-4 font-semibold text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {sortedFixtures.map((fixture) => {
              const isSelected = selectedFixtureIds.includes(fixture.id);
              return (
                <tr key={fixture.id} className="hover:bg-green-50/20 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="p-4 font-semibold text-gray-900 dark:text-zinc-150">{fixture.match_name}</td>
                  <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{fixture.date_time}</td>
                  <td className="p-4 text-gray-500 dark:text-gray-400">{fixture.league}</td>
                  <td className="p-4 text-gray-750 dark:text-zinc-300 font-medium text-sm">
                    <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs">
                      {fixture.market}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-950 dark:text-zinc-50">{fixture.odds.toFixed(2)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-750 dark:text-zinc-350">{(fixture.probability * 100).toFixed(0)}%</span>
                      <div className="w-16 h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            fixture.probability >= 0.75
                              ? "bg-green-500"
                              : fixture.probability >= 0.6
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${fixture.probability * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                        fixture.risk_level.toLowerCase() === "verde"
                          ? "bg-green-100/80 dark:bg-green-950/20 text-green-700 dark:text-green-450 border-green-200 dark:border-green-900/50"
                          : fixture.risk_level.toLowerCase() === "amarillo"
                          ? "bg-yellow-100/80 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-450 border-yellow-200 dark:border-yellow-900/50"
                          : "bg-red-100/80 dark:bg-red-950/20 text-red-700 dark:text-red-450 border-red-200 dark:border-red-900/50"
                      }`}
                    >
                      {fixture.risk_level}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={async (e) => {
                          const btn = e.currentTarget;
                          const originalText = btn.innerHTML;
                          btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>';
                          btn.disabled = true;
                          try {
                            const { analyzeFixture } = await import('@/lib/api');
                            const res = await analyzeFixture(fixture.id);
                            setAiAnalysis(res.analysis);
                            setIsAiModalOpen(true);
                          } catch (err) {
                            alert("Error al analizar con IA");
                          } finally {
                            btn.innerHTML = originalText;
                            btn.disabled = false;
                          }
                        }}
                        className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-sm transition-all"
                        title="Analizar con IA"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onAddFixture(fixture)}
                        disabled={isSelected}
                        className={`inline-flex items-center justify-center p-2 rounded-lg transition-all ${
                          isSelected
                            ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-650 cursor-not-allowed border border-gray-200 dark:border-zinc-700"
                            : "bg-[#10b981] hover:bg-emerald-600 text-white cursor-pointer hover:scale-105 active:scale-95 shadow-sm shadow-green-150"
                        }`}
                        title={isSelected ? "Ya añadido al boleto" : "Añadir al boleto"}
                      >
                        {isSelected ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {sortedFixtures.length === 0 && (
        <div className="p-10 text-center text-gray-500 dark:text-zinc-550">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 dark:text-zinc-700 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          No hay partidos disponibles que coincidan con la búsqueda.
        </div>
      )}

      {/* AI Analysis Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
              <h3 className="text-xl font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Análisis Inteligente (Gemini)
              </h3>
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap leading-relaxed text-zinc-700 dark:text-zinc-300">
              {aiAnalysis || "Generando..."}
            </div>
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex justify-end">
              <button 
                onClick={() => setIsAiModalOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
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
