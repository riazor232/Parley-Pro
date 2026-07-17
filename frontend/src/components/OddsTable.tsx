"use client";

import { useState } from "react";
import { Fixture } from "../lib/api";

interface OddsTableProps {
  fixtures: Fixture[];
  selectedFixtureIds?: number[];
  onAddFixture?: (fixture: Fixture) => void;
}

export function OddsTable({ fixtures }: OddsTableProps) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("todos");
  const [leagueFilter, setLeagueFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("todos");
  const [sortConfig, setSortConfig] = useState<{ key: keyof Fixture; direction: "asc" | "desc" } | null>(null);

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMatchName, setAiMatchName] = useState<string>("");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const leagues = Array.from(new Set(fixtures.map((f) => f.league))).sort();

  const filteredFixtures = fixtures.filter((fixture) => {
    const matchesSearch =
      fixture.match_name.toLowerCase().includes(search.toLowerCase()) ||
      fixture.league.toLowerCase().includes(search.toLowerCase());
    const matchesRisk =
      riskFilter === "todos" || fixture.risk_level.toLowerCase() === riskFilter.toLowerCase();
    const matchesLeague = leagueFilter === "todos" || fixture.league === leagueFilter;

    let matchesDate = true;
    if (dateFilter !== "todos" && fixture.date_time && fixture.date_time !== "Por definir") {
      const datePart = fixture.date_time.split(" ")[0];
      const [year, month, day] = datePart.split("-").map(Number);
      const fixDate = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (dateFilter === "hoy") matchesDate = fixDate.getTime() === today.getTime();
      else if (dateFilter === "manana") matchesDate = fixDate.getTime() === tomorrow.getTime();
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
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const handleAnalyze = async (matchName: string) => {
    setAnalyzingId(matchName);
    setAiError(null);
    setAiAnalysis(null);
    setAiMatchName(matchName);
    setIsAiModalOpen(true);
    try {
      const { analyzeFixture } = await import("@/lib/api");
      const res = await analyzeFixture(matchName);
      setAiAnalysis(res.analysis);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setAiError(`No se pudo obtener el análisis de Groq. Verifica que el backend esté activo y la API Key esté configurada.\n\nDetalle: ${msg}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-800/80 overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#10b981] to-emerald-600 p-4 sm:p-5 text-white">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Partidos del Día
        </h2>
        <p className="text-green-50 text-xs sm:text-sm mt-1">
          {fixtures.length} partidos encontrados · Haz clic en ⚡ para análisis Groq
        </p>
      </div>

      {/* Filters */}
      <div className="p-3 sm:p-4 bg-gray-50/50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar partido o liga..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
          >
            <option value="todos">Todos los días</option>
            <option value="hoy">Hoy</option>
            <option value="manana">Mañana</option>
          </select>

          <select
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100 max-w-[160px] truncate"
          >
            <option value="todos">Todas las Ligas</option>
            {leagues.map((league) => (
              <option key={league} value={league}>{league}</option>
            ))}
          </select>

          <div className="flex bg-white dark:bg-zinc-800 p-1 rounded-lg border border-gray-200 dark:border-zinc-700/80">
            {["todos", "verde", "amarillo", "rojo"].map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-all ${
                  riskFilter === risk
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200"
                }`}
              >
                {risk === "todos" ? "Todos" : risk}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-gray-450 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Partido</th>
              <th
                className="p-4 font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors select-none"
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
              <th className="p-4 font-semibold">Sugerencia Gemini</th>
              <th className="p-4 font-semibold">Riesgo</th>
              <th className="p-4 font-semibold text-center">Análisis Groq</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
            {sortedFixtures.map((fixture) => (
              <tr key={fixture.id} className="hover:bg-green-50/20 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="p-4 font-semibold text-gray-900 dark:text-zinc-150 max-w-[200px]">
                  {fixture.match_name}
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400 text-sm whitespace-nowrap">
                  {fixture.date_time}
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400 text-sm">{fixture.league}</td>
                <td className="p-4 text-gray-700 dark:text-zinc-300 text-sm max-w-[180px]">
                  <span className="bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded text-xs leading-snug">
                    {fixture.market}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    fixture.risk_level.toLowerCase() === "verde"
                      ? "bg-green-100/80 dark:bg-green-950/20 text-green-700 dark:text-green-450 border-green-200 dark:border-green-900/50"
                      : fixture.risk_level.toLowerCase() === "amarillo"
                      ? "bg-yellow-100/80 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-450 border-yellow-200 dark:border-yellow-900/50"
                      : "bg-red-100/80 dark:bg-red-950/20 text-red-700 dark:text-red-450 border-red-200 dark:border-red-900/50"
                  }`}>
                    {fixture.risk_level}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleAnalyze(fixture.match_name)}
                    disabled={analyzingId === fixture.match_name}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer hover:scale-105 active:scale-95 shadow-sm transition-all"
                    title="Analizar con Groq"
                  >
                    {analyzingId === fixture.match_name ? (
                      <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    <span>Groq</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — mobile */}
      <div className="sm:hidden divide-y divide-gray-100 dark:divide-zinc-800">
        {sortedFixtures.map((fixture) => (
          <div key={fixture.id} className="p-4 space-y-2 hover:bg-green-50/20 dark:hover:bg-zinc-800/40 transition-colors">
            <div className="flex justify-between items-start gap-2">
              <p className="font-semibold text-gray-900 dark:text-zinc-100 text-sm leading-snug">{fixture.match_name}</p>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                fixture.risk_level.toLowerCase() === "verde"
                  ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                  : fixture.risk_level.toLowerCase() === "amarillo"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400"
              }`}>
                {fixture.risk_level}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{fixture.league} · {fixture.date_time}</p>
            <p className="text-xs text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 rounded px-2 py-1">{fixture.market}</p>
            <button
              onClick={() => handleAnalyze(fixture.match_name)}
              disabled={analyzingId === fixture.match_name}
              className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-all"
            >
              {analyzingId === fixture.match_name ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              Analizar con Groq
            </button>
          </div>
        ))}
      </div>

      {sortedFixtures.length === 0 && (
        <div className="p-10 text-center text-gray-500 dark:text-zinc-550">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 dark:text-zinc-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="font-semibold">No hay partidos disponibles</p>
          <p className="text-sm mt-1">Usa el botón <span className="text-purple-500 font-medium">Buscar con Gemini</span> para cargar los partidos de hoy.</p>
        </div>
      )}

      {/* AI Analysis Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-[95vw] sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
            {/* Modal header */}
            <div className="flex justify-between items-start p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
              <div>
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Análisis Groq IA
                </h3>
                {aiMatchName && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 ml-7 font-medium">{aiMatchName}</p>
                )}
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 sm:p-6 overflow-y-auto max-w-none text-xs sm:text-sm leading-relaxed flex-1">
              {aiError ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-red-600 dark:text-red-400">Error al conectar con Groq</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-sm whitespace-pre-wrap">{aiError}</p>
                </div>
              ) : aiAnalysis ? (
                <pre className="whitespace-pre-wrap font-[inherit] text-zinc-700 dark:text-zinc-300">{aiAnalysis}</pre>
              ) : (
                <div className="flex flex-col items-center gap-3 py-8">
                  <span className="animate-spin inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full" />
                  <p className="text-zinc-500 dark:text-zinc-400 text-xs animate-pulse">Generando análisis con Groq...</p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="p-3 sm:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex justify-end">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
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
