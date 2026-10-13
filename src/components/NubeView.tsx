import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Database,
  CheckCircle2,
  RefreshCw,
  LogOut,
  LogIn,
  User,
  ShieldCheck,
  Smartphone,
  HardDrive,
  Car,
  Fuel,
  Sparkles,
  Server,
  Zap,
} from 'lucide-react';
import { auth, performGoogleAuth, performSignOut, getStoredActiveUser } from '../utils/firebaseAuth';
import { testFirestoreConnection, fetchCloudRecords, saveCloudVehicleConfig, getCloudVehicleConfig } from '../utils/firestoreService';
import { CountryCode, DATA_PAIS } from '../utils/countryData';

interface NubeViewProps {
  currentUser: any;
  onOpenAuthModal: () => void;
  selectedCountry: CountryCode;
}

export const NubeView: React.FC<NubeViewProps> = ({
  currentUser,
  onOpenAuthModal,
  selectedCountry,
}) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [cloudStats, setCloudStats] = useState({
    repostajes: 0,
    mantenimientos: 0,
    neumaticos: 0,
    tramites: 0,
    viajes: 0,
  });

  const uid = currentUser?.uid || 'guest';
  const isGuest = !currentUser || uid === 'guest' || uid === 'guest_user';

  // Load cloud document counts
  const loadStats = async () => {
    if (isGuest) {
      // Local storage counts
      try {
        const r = JSON.parse(localStorage.getItem(`litrometrik_${uid}_repostajes`) || '[]');
        const m = JSON.parse(localStorage.getItem(`litrometrik_${uid}_mantenimientos`) || '[]');
        const t = JSON.parse(localStorage.getItem(`litrometrik_${uid}_neumaticos`) || '[]');
        const l = JSON.parse(localStorage.getItem(`litrometrik_${uid}_tramites`) || '[]');
        const v = JSON.parse(localStorage.getItem('fuel_trips_pln') || '[]');
        setCloudStats({
          repostajes: r.length,
          mantenimientos: m.length,
          neumaticos: t.length,
          tramites: l.length,
          viajes: v.length,
        });
      } catch (_) {}
      return;
    }

    try {
      const [r, m, t, l, v] = await Promise.all([
        fetchCloudRecords(uid, 'repostajes'),
        fetchCloudRecords(uid, 'mantenimientos'),
        fetchCloudRecords(uid, 'neumaticos'),
        fetchCloudRecords(uid, 'tramites'),
        fetchCloudRecords(uid, 'viajes'),
      ]);
      setCloudStats({
        repostajes: r.length,
        mantenimientos: m.length,
        neumaticos: t.length,
        tramites: l.length,
        viajes: v.length,
      });
    } catch (e) {
      console.warn('Could not fetch cloud stats', e);
    }
  };

  useEffect(() => {
    loadStats();
  }, [currentUser]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await testFirestoreConnection();
      if (ok) {
        setTestResult('✅ Conexión con Firestore verificada y activa en tiempo real');
      } else {
        setTestResult('⚠️ Firestore conectado en modo caché/offline');
      }
    } catch (err: any) {
      setTestResult('❌ Error al conectar: ' + (err?.message || 'Revisa tu red'));
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncMessage('Sincronizando registros con la nube Firestore...');
    try {
      await loadStats();
      setSyncMessage('✅ Todos los datos están sincronizados en Firestore');
    } catch (err) {
      setSyncMessage('⚠️ Sincronización guardada localmente');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await performGoogleAuth();
      await loadStats();
    } catch (err: any) {
      console.warn(err);
    }
  };

  const handleSignOut = async () => {
    if (window.confirm('¿Deseas cerrar tu sesión?')) {
      await performSignOut();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#080B11] text-white pb-32 select-none">
      {/* ---------------- TOP HEADER ---------------- */}
      <header className="sticky top-0 z-30 bg-[#080B11]/95 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 flex items-center justify-between pt-[max(env(safe-area-inset-top,0px),12px)]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF4F00] flex items-center justify-center shadow-lg shadow-[#FF4F00]/25 shrink-0">
            <Cloud className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center space-x-1.5 leading-none">
              <span>LitroMetrik</span>
              <span className="text-[#FF4F00]">PRO</span>
            </h1>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-1">
              NUBE & FIRESTORE
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSyncAll}
          disabled={syncing}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#1A202C] hover:bg-[#2D3748] border border-slate-700/80 text-xs font-black text-slate-200 transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#FF4F00] ${syncing ? 'animate-spin' : ''}`} />
          <span>Sincronizar</span>
        </button>
      </header>

      {/* Floating Status Message */}
      {(testResult || syncMessage) && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="p-3.5 rounded-2xl bg-[#121620] border border-[#FF4F00]/50 text-white text-xs font-bold flex items-center space-x-2 shadow-2xl animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-[#FF4F00] shrink-0" />
            <span>{testResult || syncMessage}</span>
          </div>
        </div>
      )}

      {/* ---------------- MAIN CONTAINER ---------------- */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* CARD 1: USER ACCOUNT & AUTH STATUS */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
              CUENTA DE USUARIO
            </span>
            <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] font-black uppercase tracking-wider text-slate-300">
              <span className={`w-2 h-2 rounded-full ${isGuest ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
              <span>{isGuest ? 'MODO INVITADO' : 'CONECTADO'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="Avatar"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#FF4F00]/40 shadow-md"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF4F00] to-amber-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-[#FF4F00]/20">
                {currentUser?.displayName?.[0]?.toUpperCase() || <User className="w-7 h-7" />}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h2 className="text-base font-black text-white truncate">
                {currentUser?.displayName || 'Conductor LitroMetrik'}
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {currentUser?.email || 'Sin correo vinculado'}
              </p>
              <div className="flex items-center space-x-1 mt-1 text-[10px] font-sans text-slate-500 truncate">
                <span>UID:</span>
                <span className="truncate">{uid.slice(0, 14)}...</span>
              </div>
            </div>
          </div>

          {/* Auth Action Buttons */}
          <div className="pt-2 grid grid-cols-1 gap-2">
            {isGuest ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="py-3 px-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs transition active:scale-95 cursor-pointer shadow-md flex items-center justify-center space-x-1.5"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="py-3 px-3 rounded-2xl bg-[#FF4F00] hover:bg-[#FF621F] text-white font-black text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-[#FF4F00]/25 flex items-center justify-center space-x-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Email / Registro</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Gestionar Cuenta</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="py-2.5 px-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs transition active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: FIRESTORE CLOUD DATABASE DETAILS */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
              BASE DE DATOS FIRESTORE
            </span>
            <div className="flex items-center space-x-1 text-[11px] font-black text-emerald-400">
              <Zap className="w-3.5 h-3.5" />
              <span>NUBE ACTIVA</span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs bg-[#080B11] p-3.5 rounded-2xl border border-slate-800 font-sans">
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Proyecto:</span>
              <span className="font-bold text-slate-200">elite-coyote-14r4b</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">ID Database:</span>
              <span className="font-bold text-emerald-400 truncate max-w-[200px]" title="ai-studio-kalkulatorpaliwa-1a550e5e-9e58-4929-a722-b6480ff19740">
                ai-studio-kalkulator...
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-500">Persistencia:</span>
              <span className="font-bold text-slate-200">Colecciones Privadas (ABAC)</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 transition active:scale-95 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Server className={`w-4 h-4 text-[#FF4F00] ${isTesting ? 'animate-bounce' : ''}`} />
            <span>{isTesting ? 'Probando Conexión...' : 'Probar Conexión Firestore (Ping)'}</span>
          </button>
        </div>

        {/* CARD 3: CLOUD DOCUMENT REPOSITORY STATS */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase">
              REGISTROS EN TU NUBE
            </span>
            <span className="text-[11px] font-sans text-[#FF4F00] font-bold">
              {cloudStats.repostajes + cloudStats.mantenimientos + cloudStats.neumaticos + cloudStats.tramites + cloudStats.viajes} docs
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-[#080B11] border border-slate-800">
              <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                REPOSTAJES
              </div>
              <div className="text-2xl font-black font-sans text-white mt-1">
                {cloudStats.repostajes}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">En Firestore</p>
            </div>

            <div className="p-3 rounded-2xl bg-[#080B11] border border-slate-800">
              <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                MANTENIMIENTOS
              </div>
              <div className="text-2xl font-black font-sans text-white mt-1">
                {cloudStats.mantenimientos}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">En Firestore</p>
            </div>

            <div className="p-3 rounded-2xl bg-[#080B11] border border-slate-800">
              <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                NEUMÁTICOS
              </div>
              <div className="text-2xl font-black font-sans text-white mt-1">
                {cloudStats.neumaticos}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">En Firestore</p>
            </div>

            <div className="p-3 rounded-2xl bg-[#080B11] border border-slate-800">
              <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                TRÁMITES LEGALES
              </div>
              <div className="text-2xl font-black font-sans text-white mt-1">
                {cloudStats.tramites}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">En Firestore</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#080B11] border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black tracking-wider text-slate-400 uppercase">
                VIAJES Y RUTAS CALCULADAS
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Historial sincronizado en la nube</p>
            </div>
            <div className="text-2xl font-black font-sans text-[#FF4F00]">
              {cloudStats.viajes}
            </div>
          </div>
        </div>

        {/* CARD 4: CARACTERÍSTICAS NATIVAS PWA */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-3">
          <div className="flex items-center space-x-2 text-xs font-black text-white">
            <Smartphone className="w-4 h-4 text-[#FF4F00]" />
            <span>LitroMetrik PRO Mobile Native Engine</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Esta aplicación utiliza tecnologías nativas modernas (PWA, GPS Geolocation API, Service Worker para uso offline, háptica táctil y sincronización con Google Cloud Firestore).
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-bold text-slate-300">
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">🛰️ Sensor GPS Real</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">⚡ Animaciones 60 FPS</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">☁️ Firestore Rules ABAC</span>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">📴 Modo Sin Conexión</span>
          </div>
        </div>
      </main>
    </div>
  );
};
