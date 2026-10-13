import React from 'react';
import { Fuel } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[10000] w-screen h-screen flex flex-col items-center justify-center select-none bg-[#F5F7FF] text-slate-800 overflow-hidden">
      <div className="relative z-10 flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-bounce">
          <Fuel className="w-8 h-8 text-white" />
        </div>

        <div>
          <div className="flex items-center justify-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">LitroMetrik</h1>
            <span className="title-gradient-pro text-xs font-black uppercase">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">Cargando telemetría & Waze GPS...</p>
        </div>

        <div className="w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-blue-600 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
};
