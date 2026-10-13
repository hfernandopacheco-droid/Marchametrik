import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';

interface UpdateBannerProps {
  onUpdate?: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({ onUpdate }) => {
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    let refreshing = false;

    // 1. Single reload guard on controller change
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

      // 2. Check current registration for waiting service worker
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;

        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setHasUpdate(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setHasUpdate(true);
              }
            });
          }
        });
      }).catch(() => {});

      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, []);

  const handleApplyUpdate = async () => {
    // Hide banner immediately to avoid multiple clicks
    setHasUpdate(false);
    setIsUpdating(true);

    try {
      if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
    } catch (_) {}

    try {
      // Send SKIP_WAITING to waiting worker
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      } else if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } else {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const r of registrations) {
            if (r.waiting) {
              r.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        }
      }

      // Clear cached responses
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch (_) {}

    if (onUpdate) onUpdate();

    // Fallback: If controllerchange did not trigger reload within 700ms
    setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Simply hide the banner without reloading
    setHasUpdate(false);
  };

  if (!hasUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9999] animate-bounce-short">
      <div
        onClick={handleApplyUpdate}
        className="bg-[#0A0F1E]/95 border-2 border-cyan-400/90 rounded-2xl p-3.5 shadow-2xl text-white flex items-center justify-between gap-3 backdrop-blur-xl ring-4 ring-cyan-500/20 cursor-pointer hover:bg-[#111827] transition group"
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-[#00D4FF] shrink-0 group-hover:scale-110 transition-transform">
            <Sparkles className="w-5 h-5 text-[#00D4FF]" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-white flex items-center space-x-1.5">
              <span>Nueva actualización instalada</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
            </div>
            <div className="text-[11px] text-cyan-200 truncate font-semibold mt-0.5">
              Tocando aquí se refresca la app.
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleApplyUpdate();
            }}
            disabled={isUpdating}
            className="px-3 py-1.5 rounded-xl bg-[#00D4FF] hover:bg-cyan-300 text-slate-950 font-black text-xs flex items-center space-x-1 shadow-md transition active:scale-95 cursor-pointer disabled:opacity-75"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? '...' : 'Refrescar'}</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
