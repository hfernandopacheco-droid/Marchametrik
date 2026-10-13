import React from 'react';
import { Fuel, History, Layers } from 'lucide-react';

interface HeaderProps {
  onOpenFirebaseModal: () => void;
  onOpenHistory: () => void;
  onOpenSidebar: () => void;
  onOpenAuth: () => void;
  savedTripsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHistory,
  onOpenSidebar,
  savedTripsCount,
}) => {
  return (
    <header
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
      }}
      className="sticky top-0 z-40 w-full bg-[#080B11] border-b border-slate-800 shadow-md text-white transition-all"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        
        {/* Clean Logo & Title without Subtitle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenSidebar}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/25 button-hover-pro cursor-pointer group shrink-0 border border-white/10 active:scale-95"
            title="Abrir menú de módulos"
          >
            <Fuel className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
          </button>
          
          <div className="flex items-center space-x-1.5">
            <span className="text-lg sm:text-xl font-black tracking-tight text-white">LitroMetrik</span>
            <span className="text-xs sm:text-sm font-black px-2 py-0.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 shadow-sm uppercase tracking-wider">
              PRO
            </span>
          </div>
        </div>

        {/* 2 Action Buttons (Módulos/Categorías, Historial) evenly aligned */}
        <div className="flex items-center gap-2">
          {/* 1. Módulos / Categorías */}
          <button
            onClick={onOpenSidebar}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-200 hover:text-white text-xs font-bold transition button-hover-pro cursor-pointer shadow-sm active:scale-95"
            title="Ver módulos de gestión vehicular"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Módulos</span>
          </button>

          {/* 2. Historial */}
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black transition shadow-md shadow-blue-500/25 button-hover-pro cursor-pointer border border-white/10 active:scale-95"
            title="Ver historial de viajes"
          >
            <History className="w-4 h-4 text-white" />
            <span className="hidden sm:inline">Historial</span>
            {savedTripsCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white text-blue-900 font-black text-[10px] flex items-center justify-center shadow">
                {savedTripsCount}
              </span>
            )}
          </button>
        </div>

      </div>
    </header>
  );
};
