import React from 'react';
import { Fuel, Wrench, Disc, FileText, X, ChevronRight, Sparkles, TrendingUp, User } from 'lucide-react';

export type ModuleKey = 'refuels' | 'maintenance' | 'tires' | 'legal' | 'stats' | 'wazerProfile';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (moduleKey: ModuleKey) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  onSelectModule,
}) => {
  if (!isOpen) return null;

  const modules = [
    {
      key: 'refuels' as ModuleKey,
      title: 'Bitácora de Repostaje',
      subtitle: 'Cargas de LPG, Gasolina y Diésel',
      icon: Fuel,
      badge: 'Firestore',
    },
    {
      key: 'stats' as ModuleKey,
      title: 'Estadísticas de Combustible',
      subtitle: 'Tendencias mensuales, días peak y costos',
      icon: TrendingUp,
      badge: 'Análisis',
    },
    {
      key: 'maintenance' as ModuleKey,
      title: 'Mantenimiento Preventivo',
      subtitle: 'Aceite, bujías, filtros LPG y aire',
      icon: Wrench,
      badge: 'Gestión',
    },
    {
      key: 'tires' as ModuleKey,
      title: 'Control de Neumáticos',
      subtitle: 'Cambio invierno/verano, presión y rotación',
      icon: Disc,
      badge: 'Seguridad',
    },
    {
      key: 'legal' as ModuleKey,
      title: 'Trámites y Legalidad',
      subtitle: 'Przegląd, SOAT, ITV y seguros',
      icon: FileText,
      badge: 'Oficial',
    },
    {
      key: 'wazerProfile' as ModuleKey,
      title: 'Perfil y Preferencias',
      subtitle: 'Conductor, vehículo y navegación',
      icon: User,
      badge: 'Cuenta',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop overlay with blur */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sidebar Drawer (Solid clean panel with safe-area support) */}
      <div className="relative w-full max-w-md bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col z-10 text-slate-900 animate-in slide-in-from-right duration-300 overflow-hidden">
        
        {/* Drawer Header with Safe-Area Top Padding */}
        <div className="pt-[max(env(safe-area-inset-top,0px),22px)] px-6 pb-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-900 text-white shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center space-x-1.5">
                <span>LitroMetrik</span>
                <span className="text-[#00D4FF] font-black">PRO</span>
              </h2>
              <p className="text-xs text-slate-300">Módulos de Gestión Vehicular</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition border border-slate-700 button-hover-pro cursor-pointer"
            title="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content - Modules List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#F8FAFC]">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Módulos Disponibles
          </div>

          {modules.map((mod) => {
            const ModIcon = mod.icon;
            return (
              <button
                key={mod.key}
                onClick={() => {
                  onSelectModule(mod.key);
                  onClose();
                }}
                className="w-full p-4 rounded-2xl bg-white/80 border border-slate-200/80 hover:border-blue-400 hover:bg-white text-left transition flex items-center justify-between group shadow-sm button-hover-pro cursor-pointer"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-sm">
                    <ModIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                        {mod.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                        {mod.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {mod.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition transform group-hover:translate-x-1" />
              </button>
            );
          })}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200/80 bg-white/60 text-center text-[11px] text-slate-500">
          LitroMetrik PRO • Sincronización en la Nube
        </div>

      </div>
    </div>
  );
};
