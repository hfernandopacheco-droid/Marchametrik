import React from 'react';
import { X, Trash2, RotateCcw, History, Calendar, MapPin } from 'lucide-react';
import { SavedTrip } from '../types';

interface TripHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  trips: SavedTrip[];
  onDeleteTrip: (id: string) => void;
  onClearHistory: () => void;
  onLoadTrip: (trip: SavedTrip) => void;
}

export const TripHistory: React.FC<TripHistoryProps> = ({
  isOpen,
  onClose,
  trips,
  onDeleteTrip,
  onClearHistory,
  onLoadTrip,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-white max-h-[85vh] flex flex-col">
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition button-hover-pro cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[#00D4FF]">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Historial de Viajes</h2>
            <p className="text-xs text-slate-400">Sincronizado con Cloud Firestore y LocalStorage</p>
          </div>
        </div>

        {trips.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <History className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">No hay viajes guardados todavía.</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Realiza un cálculo y haz clic en "Guardar Registro" para registrar tus trayectos y consultar su historial en cualquier momento.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] space-y-3 pr-2">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Total de registros: <strong className="text-white font-bold">{trips.length}</strong></span>
              <button
                onClick={onClearHistory}
                className="text-rose-400 hover:text-rose-300 font-bold flex items-center space-x-1 transition button-hover-pro cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar historial</span>
              </button>
            </div>

            {trips.map((trip) => (
              <div
                key={trip.id}
                className="bg-[#1E293B] border border-slate-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-500 shadow-sm transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white">{trip.routeName}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-[#00D4FF] border border-blue-400/30 font-bold uppercase">
                      {trip.fuelType}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{trip.date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{trip.distanceKm} km</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-700/50">
                  <div className="text-right">
                    <div className="text-lg font-black text-[#00D4FF]">{trip.totalCostPLN.toFixed(2)} PLN</div>
                    <div className="text-[10px] text-slate-400">{trip.costPerKm.toFixed(2)} PLN/km</div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        onLoadTrip(trip);
                        onClose();
                      }}
                      title="Cargar en la calculadora"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#00D4FF] border border-slate-700 transition button-hover-pro cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTrip(trip.id)}
                      title="Eliminar viaje"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-rose-400 border border-slate-700 transition button-hover-pro cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-700/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition button-hover-pro cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
