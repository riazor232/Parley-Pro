"use client";

import { useEffect, useState, useCallback } from "react";
import { getFixtures, getServerStatus, Fixture } from "@/lib/api";
import { OddsTable } from "@/components/OddsTable";
import { StatsOverview } from "@/components/StatsOverview";
import { LoginScreen } from "@/components/LoginScreen";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [geminiSearching, setGeminiSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<string>("Cargando...");

  // Check auth on mount
  useEffect(() => {
    const auth = sessionStorage.getItem("parleypro_auth");
    setIsAuthenticated(auth === "1");
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("parleypro_auth");
    setIsAuthenticated(false);
  };

  const fetchData = useCallback(async () => {
    try {
      const [fixturesData, statusData] = await Promise.all([
        getFixtures(),
        getServerStatus(),
      ]);
      setFixtures(fixturesData);
      setServerStatus(statusData.data_source);
      setError(null);
    } catch (err: unknown) {
      console.error(err);
      setError("No se pudo conectar con el servidor backend.");
    }
  }, []);

  const handleGeminiDiscover = useCallback(async (silent = false) => {
    try {
      setGeminiSearching(true);
      const res = await fetch(`${API_URL}/api/fixtures/gemini-discover`, { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        await fetchData();
        if (!silent) alert(`✅ ${data.message}`);
      } else {
        if (!silent) alert(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      if (!silent) alert("Error al buscar partidos con Gemini");
    } finally {
      setGeminiSearching(false);
    }
  }, [fetchData]);

  // On auth confirmed: load data
  useEffect(() => {
    if (!isAuthenticated) return;
    const init = async () => {
      setLoading(true);
      try {
        const [fixturesData, statusData] = await Promise.all([
          getFixtures(),
          getServerStatus(),
        ]);
        setFixtures(fixturesData);
        setServerStatus(statusData.data_source);
        setError(null);
      } catch {
        setError("No se pudo conectar con el servidor backend.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [isAuthenticated]);

  // While checking auth (null = not yet determined)
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-[#061009] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-900 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  // Not logged in → show login screen
  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  // Loading fixtures
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b15] text-zinc-100 flex flex-col items-center justify-center font-[family-name:var(--font-geist-sans)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-950"></div>
            <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm font-semibold tracking-wider text-green-400 uppercase animate-pulse">
            Buscando partidos del día...
          </p>
        </div>
      </div>
    );
  }

  const statusColor = {
    bg: serverStatus === "Gemini Search" ? "bg-purple-950/40 border-purple-800/40"
       : serverStatus === "API Real" ? "bg-green-950/40 border-green-900/30"
       : "bg-gray-950/40 border-gray-900/30",
    dot: serverStatus === "Gemini Search" ? "bg-purple-500"
       : serverStatus === "API Real" ? "bg-green-500" : "bg-gray-500",
    ping: serverStatus === "Gemini Search" ? "bg-purple-400"
        : serverStatus === "API Real" ? "bg-green-400" : "bg-gray-400",
    text: serverStatus === "Gemini Search" ? "text-purple-300"
        : serverStatus === "API Real" ? "text-green-300" : "text-gray-300",
    label: serverStatus === "Gemini Search" ? "✦ Gemini Search"
         : serverStatus === "API Real" ? "API Conectada" : serverStatus,
  };

  return (
    <div className="min-h-screen bg-[#f4fdf8] dark:bg-[#0b130f] text-gray-900 dark:text-zinc-100 font-[family-name:var(--font-geist-sans)] transition-colors duration-300">
      {/* Header */}
      <header className="bg-[#1e3932] dark:bg-[#070e0a] text-white border-b border-green-900/10 dark:border-zinc-900/60 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Logo */}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#10b981] rounded-lg text-white font-black text-sm tracking-tighter">PP</span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Parley<span className="text-[#10b981]">Pro</span>
              </h1>
            </div>
            <p className="text-xs text-green-200/70 mt-0.5 hidden sm:block">Plataforma Predictiva de Inteligencia Deportiva</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            {/* Status pill */}
            <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs ${statusColor.bg}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusColor.ping}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${statusColor.dot}`}></span>
              </span>
              <span className={`font-semibold ${statusColor.text}`}>{statusColor.label}</span>
            </div>

            {/* Gemini Search button */}
            <button
              onClick={() => handleGeminiDiscover(false)}
              disabled={geminiSearching}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all border ${
                geminiSearching
                  ? "bg-purple-900/50 text-purple-300 border-purple-800 cursor-wait"
                  : "bg-purple-600 hover:bg-purple-500 text-white border-transparent shadow-sm"
              }`}
              title="Buscar todos los partidos de hoy con Gemini"
            >
              {geminiSearching ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L9.09 8.26L2 9.27L7 14.14L5.82 21.02L12 17.77L18.18 21.02L17 14.14L22 9.27L14.91 8.26L12 2Z"/>
                  </svg>
                  <span className="hidden sm:inline">Buscar con Gemini</span>
                  <span className="sm:hidden">Gemini</span>
                </>
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => fetchData()}
              className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-green-900/20 transition-all border border-green-900/30"
              title="Refrescar vista"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.88M3 9h9v9" />
              </svg>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-950/20 transition-all border border-transparent hover:border-red-900/30"
              title="Cerrar sesión"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {error ? (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-6 rounded-xl text-center shadow-lg my-12 max-w-2xl mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-bold text-lg">Error de Conexión</h3>
            <p className="text-sm mt-2">{error}</p>
            <button
              onClick={() => fetchData()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <StatsOverview fixtures={fixtures} />
            <OddsTable fixtures={fixtures} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#070e0a] border-t border-green-900/10 dark:border-zinc-900/60 mt-16 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">
            ParleyPro &copy; {new Date().getFullYear()} — Análisis Estadístico con IA
          </p>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
            Probabilidades estimadas por Gemini · Análisis profundo por Groq · Solo con fines informativos.
          </p>
        </div>
      </footer>
    </div>
  );
}
