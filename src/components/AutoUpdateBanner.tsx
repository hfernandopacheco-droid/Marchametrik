import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X, ArrowUpCircle } from 'lucide-react';

interface VersionInfo {
  version: string;
  buildTime: number;
  description?: string;
}

export const AutoUpdateBanner: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>(() => {
    return sessionStorage.getItem('app_loaded_version') || localStorage.getItem('app_loaded_version') || '';
  });
  const [newVersion, setNewVersion] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Check version from version.json
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (!res.ok) return;
        const data: VersionInfo = await res.json();
        if (!data || !data.version) return;

        const storedVer = sessionStorage.getItem('app_loaded_version') || localStorage.getItem('app_loaded_version');

        if (!storedVer) {
          // First time this session opened: record baseline version
          sessionStorage.setItem('app_loaded_version', data.version);
          localStorage.setItem('app_loaded_version', data.version);
          if (isMounted) setCurrentVersion(data.version);
        } else if (data.version !== storedVer) {
          // A new version was republished!
          if (isMounted) {
            setNewVersion(data.version);
            setHasUpdate(true);
          }
        }
      } catch (e) {
        // Network hiccup - ignore silently
      }
    };

    // Initial check
    checkVersion();

    // Check periodically every 6 seconds
    const interval = setInterval(checkVersion, 6000);

    // Also check when tab becomes active / gains focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkVersion);

    // Also listen for Service Worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (isMounted) setHasUpdate(true);
              }
            });
          }
        });
      }).catch(() => {});
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkVersion);
    };
  }, []);

  const handleApplyUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    // Disappear immediately as requested
    setDismissed(true);
    setHasUpdate(false);

    try {
      if (newVersion) {
        sessionStorage.setItem('app_loaded_version', newVersion);
        localStorage.setItem('app_loaded_version', newVersion);
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
    // Hard reload to immediately load the new version
    window.location.reload();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    setHasUpdate(false);
    if (newVersion) {
      sessionStorage.setItem('app_loaded_version', newVersion);
      localStorage.setItem('app_loaded_version', newVersion);
    }
  };

  if (!hasUpdate || dismissed) return null;

  return (
    <div 
      style={{
        top: 'max(env(safe-area-inset-top, 0px), 12px)',
        zIndex: 99999
      }}
      className="fixed left-1/2 transform -translate-x-1/2 w-[95%] max-w-lg animate-fadeIn select-none pointer-events-auto"
      title="Toca para actualizar la app"
    >
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white p-3.5 sm:p-4 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_20px_rgba(0,212,255,0.4)] border-2 border-cyan-400 flex items-center justify-between gap-3 backdrop-blur-2xl">
        
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/20 flex items-center justify-center shrink-0 border border-cyan-300/40 shadow-inner">
            <ArrowUpCircle className="w-6 h-6 text-cyan-300 animate-bounce" />
          </div>
          <div className="min-w-0 text-left">
            <div className="text-xs sm:text-sm font-black tracking-wide flex items-center space-x-1.5 truncate text-white">
              <span>¡Nueva versión disponible!</span>
              {newVersion && (
                <span className="text-[10px] bg-black/40 px-1.5 py-0.5 rounded font-sans font-bold text-cyan-200">
                  v{newVersion}
                </span>
              )}
            </div>
            <div className="text-[11px] text-cyan-100 font-medium truncate mt-0.5 flex items-center space-x-1">
              <span>Hay mejoras y correcciones listas</span>
              <Sparkles className="w-3 h-3 text-amber-300 inline shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={isUpdating}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-[#00D4FF] hover:bg-cyan-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-cyan-400/40 transition flex items-center space-x-1.5 active:scale-95 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-950 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Actualizando...' : 'Actualizar nueva versión'}</span>
          </button>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="Cerrar banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
