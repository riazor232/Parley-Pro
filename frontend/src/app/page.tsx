"use client";

import { useEffect, useState } from "react";
import { getFixtures, getSavedParleys, deleteParley, getServerStatus, Fixture, SavedParley } from "@/lib/api";
import { OddsTable } from "@/components/OddsTable";
import { StatsOverview } from "@/components/StatsOverview";
import { BetSlip } from "@/components/BetSlip";
import { SavedParleys } from "@/components/SavedParleys";

export default function Home() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [parleys, setParleys] = useState<SavedParley[]>([]);
  const [selectedFixtures, setSelectedFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<string>("Cargando...");

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [fixturesData, parleysData, statusData] = await Promise.all([
        getFixtures(),
        getSavedParleys(),
        getServerStatus(),
      ]);
      setFixtures(fixturesData);
      setParleys(parleysData);
      setServerStatus(statusData.data_source);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("No se pudo conectar con el servidor backend. Asegúrate de que esté corriendo en el puerto 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const { syncFixtures } = await import("@/lib/api");
      await syncFixtures();
      await fetchData();
    } catch (err) {
      console.error(err);
      alert("Error al sincronizar datos");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFixture = (fixture: Fixture) => {
    if (!selectedFixtures.some((f) => f.id === fixture.id)) {
      setSelectedFixtures([...selectedFixtures, fixture]);
    }
  };

  const handleRemoveFixture = (id: number) => {
    setSelectedFixtures(selectedFixtures.filter((f) => f.id !== id));
  };

  const handleClearSlip = () => {
    setSelectedFixtures([]);
  };

  const handleParleySaved = async () => {
    try {
      const parleysData = await getSavedParleys();
      setParleys(parleysData);
    } catch (err) {
      console.error("Error updating parleys:", err);
    }
  };

  const handleDeleteParley = async (id: number) => {
    try {
      await deleteParley(id);
      setParleys(parleys.filter((p) => p.id !== id));
    } catch (err) {
      alert("No se pudo eliminar el parlay");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1b15] text-zinc-150 flex flex-col items-center justify-center font-[family-name:var(--font-geist-sans)]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-emerald-950"></div>
            <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm font-semibold tracking-wider text-green-450 uppercase animate-pulse">
            Iniciando ParleyPro...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4fdf8] dark:bg-[#0b130f] text-gray-900 dark:text-zinc-100 font-[family-name:var(--font-geist-sans)] transition-colors duration-300">
      <header className="bg-[#1e3932] dark:bg-[#070e0a] text-white border-b border-green-900/10 dark:border-zinc-900/60 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-[#10b981] rounded-lg text-white font-black text-sm tracking-tighter">
                PP
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                Parley<span className="text-[#10b981]">Pro</span>
              </h1>
            </div>
            <p className="text-xs text-green-200/70 mt-0.5 hidden sm:block">Plataforma Predictiva de Inteligencia Deportiva</p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
            <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-full text-xs ${serverStatus === 'API Real' ? 'bg-green-950/40 border-green-900/30' : serverStatus === 'Cargando...' ? 'bg-gray-950/40 border-gray-900/30' : 'bg-yellow-950/40 border-yellow-900/30'}`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${serverStatus === 'API Real' ? 'bg-green-400' : serverStatus === 'Cargando...' ? 'bg-gray-400' : 'bg-yellow-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${serverStatus === 'API Real' ? 'bg-green-500' : serverStatus === 'Cargando...' ? 'bg-gray-500' : 'bg-yellow-500'}`}></span>
              </span>
              <span className={`font-semibold ${serverStatus === 'API Real' ? 'text-green-300' : serverStatus === 'Cargando...' ? 'text-gray-300' : 'text-yellow-300'}`}>
                {serverStatus === 'API Real' ? 'API Conectada' : serverStatus === 'Cargando...' ? 'Conectando...' : 'Modo Simulación'}
              </span>
            </div>
            <button 
              onClick={() => handleSync()}
              disabled={syncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all border ${
                syncing
                  ? "bg-emerald-900/50 text-emerald-400 border-emerald-800 cursor-wait"
                  : "bg-[#10b981] hover:bg-emerald-600 text-white border-transparent shadow-sm"
              }`}
              title="Descargar datos frescos de la API"
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="hidden sm:inline">Actualizando...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.88M3 9h9v9" />
                  </svg>
                  <span className="hidden sm:inline">Actualizar Datos</span>
                  <span className="sm:hidden">Sync</span>
                </>
              )}
            </button>
            <button 
              onClick={() => fetchData()}
              className="p-2 text-gray-300 hover:text-white rounded-lg hover:bg-green-900/20 transition-all border border-green-900/30 cursor-pointer"
              title="Refrescar vista local"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6.88M3 9h9v9" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {error ? (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-750 dark:text-red-400 p-6 rounded-xl text-center shadow-lg my-12 max-w-2xl mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 dark:text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="font-bold text-lg">Error de Conexión</h3>
            <p className="text-sm mt-2">{error}</p>
            <button 
              onClick={() => fetchData()}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all"
            >
              Reintentar Conexión
            </button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Overview */}
            <StatsOverview fixtures={fixtures} />

            {/* Layout Grid — stacks on mobile, 3 cols on desktop */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-8 items-start">
              {/* Odds Table (full width on mobile, 2/3 on desktop) */}
              <div className="w-full lg:col-span-2 space-y-4 sm:space-y-6">
                <OddsTable
                  fixtures={fixtures}
                  selectedFixtureIds={selectedFixtures.map((f) => f.id)}
                  onAddFixture={handleAddFixture}
                />
              </div>

              {/* BetSlip & SavedParleys (full width on mobile, 1/3 on desktop) */}
              <div className="w-full space-y-4 sm:space-y-6">
                <BetSlip
                  selectedFixtures={selectedFixtures}
                  onRemoveFixture={handleRemoveFixture}
                  onParleySaved={handleParleySaved}
                  onClearSlip={handleClearSlip}
                />

                <SavedParleys
                  parleys={parleys}
                  onDelete={handleDeleteParley}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white dark:bg-[#070e0a] border-t border-green-900/10 dark:border-zinc-900/60 mt-20 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm font-semibold text-gray-500 dark:text-zinc-400">
            ParleyPro &copy; {new Date().getFullYear()} — Plataforma de Simulación y Análisis Estadístico.
          </p>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
            Este software es una simulación matemática y estadística de probabilidades y cuotas deportivas para fines educativos y de demostración.
          </p>
        </div>
      </footer>
    </div>
  );
}
