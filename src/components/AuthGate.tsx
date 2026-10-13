import React, { useState } from 'react';
import {
  Mail, Lock, LogIn, UserPlus, AlertCircle, Fuel, ArrowRight,
  Eye, EyeOff, Globe, Check, Sparkles, X, CheckCircle2, Database
} from 'lucide-react';
import {
  performEmailRegister,
  performEmailLogin,
  performPasswordReset,
  getStoredActiveUser,
  hashPassword,
  saveAccountToRegistry
} from '../utils/firebaseAuth';
import {
  signUpWithSupabase,
  signInWithSupabase,
  supabase,
  isSupabaseConfigured,
} from '../utils/supabaseClient';
import { DATA_PAIS, CountryCode } from '../utils/countryData';

interface AuthGateProps {
  onContinueAsGuest?: () => void;
  onAuthSuccess: (user?: any) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onContinueAsGuest,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'register' | 'login' | 'forgot'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(() => {
    return (localStorage.getItem('litrometrik_jurisdiction_country') as CountryCode) || 'PL';
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCountryChange = (c: CountryCode) => {
    setSelectedCountry(c);
    localStorage.setItem('litrometrik_jurisdiction_country', c);
    localStorage.setItem('litrometrik_selected_country', c);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (tab === 'register' && !name.trim()) {
      setErrorMsg('Por favor ingresa tu nombre de conductor.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    if (tab !== 'forgot' && (!password || password.length < 6)) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (tab === 'register' && password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      if (tab === 'login') {
        let loggedInUser: any = null;

        // 1. Try Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const sbResult = await signInWithSupabase(email.trim(), password);
            if (sbResult?.user) {
              loggedInUser = {
                uid: sbResult.user.id,
                id: sbResult.user.id,
                email: sbResult.user.email,
                displayName: sbResult.user.user_metadata?.nombre || name.trim() || email.split('@')[0],
              };
            }
          } catch (sbErr: any) {
            console.info('Supabase login check:', sbErr?.message);
          }
        }

        // 2. Try Firestore / Firebase Cloud Account
        if (!loggedInUser) {
          try {
            loggedInUser = await performEmailLogin(email.trim(), password);
          } catch (fireErr: any) {
            if (!loggedInUser) {
              throw new Error(fireErr?.message || 'Credenciales incorrectas. Verifica tu correo y contraseña.');
            }
          }
        }

        if (loggedInUser) {
          localStorage.setItem('litrometrik_active_user', JSON.stringify(loggedInUser));
          localStorage.setItem('litrometrik_active_user_session', JSON.stringify(loggedInUser));
          if (loggedInUser.displayName) {
            localStorage.setItem('wazer_nickname', loggedInUser.displayName);
            localStorage.setItem('litrometrik_user_name', loggedInUser.displayName);
          }
          setSuccessMsg('¡Sesión iniciada exitosamente! Bienvenido a LitroMetrik PRO.');
          setTimeout(() => onAuthSuccess(loggedInUser), 300);
        } else {
          throw new Error('No se pudo verificar la cuenta. Por favor verifica tus credenciales.');
        }
      } else if (tab === 'register') {
        let createdUser: any = null;

        // 1. Register in Cloud Firestore & Auth (persistent cloud storage)
        try {
          createdUser = await performEmailRegister(email.trim(), password, name.trim());
        } catch (fireErr: any) {
          if (fireErr?.message?.includes('Ya existe una cuenta')) {
            throw fireErr;
          }
          console.warn('Cloud account registration notice:', fireErr);
        }

        // 2. Also register in Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            const sbRes = await signUpWithSupabase(email.trim(), password, name.trim(), 'PLN');
            if (sbRes?.user && !createdUser) {
              createdUser = {
                uid: sbRes.user.id,
                id: sbRes.user.id,
                email: sbRes.user.email,
                displayName: name.trim(),
              };
            }
          } catch (sbErr: any) {
            console.warn('Supabase sign-up background notice:', sbErr?.message || sbErr);
            if (!createdUser && sbErr?.message?.includes('User already registered')) {
              throw new Error('Ya existe una cuenta registrada con este correo. Por favor selecciona "Iniciar Sesión".');
            }
          }
        }

        // Fallback user session if network was strictly offline
        if (!createdUser) {
          const cleanEmail = email.trim().toLowerCase();
          const pHash = await hashPassword(password);
          const fallbackUser = {
            uid: 'usr_' + btoa(encodeURIComponent(cleanEmail)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
            id: 'usr_' + btoa(encodeURIComponent(cleanEmail)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
            email: cleanEmail,
            displayName: name.trim() || cleanEmail.split('@')[0],
          };
          saveAccountToRegistry({
            uid: fallbackUser.uid,
            email: cleanEmail,
            displayName: fallbackUser.displayName,
            passwordHash: pHash,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          createdUser = fallbackUser;
        }

        localStorage.setItem('litrometrik_active_user', JSON.stringify(createdUser));
        localStorage.setItem('litrometrik_active_user_session', JSON.stringify(createdUser));
        localStorage.setItem('wazer_nickname', name.trim());
        localStorage.setItem('litrometrik_user_name', name.trim());

        setSuccessMsg('¡Cuenta registrada exitosamente! Bienvenido a LitroMetrik PRO.');
        setTimeout(() => onAuthSuccess(createdUser), 300);
      } else if (tab === 'forgot') {
        try {
          await performPasswordReset(email.trim());
        } catch (_) {}
        if (isSupabaseConfigured()) {
          try {
            await supabase.auth.resetPasswordForEmail(email.trim());
          } catch (_) {}
        }
        setSuccessMsg(`Se ha enviado la solicitud de recuperación a: ${email}`);
        setTimeout(() => setTab('login'), 2500);
      }
    } catch (err: any) {
      console.error('Auth handler error:', err);
      setErrorMsg(
        err?.message ||
        'Error al procesar la autenticación. Verifica tus datos o intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0F172A] text-white flex flex-col items-center justify-center p-4 py-8 sm:p-6 sm:py-12 relative font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Top Header Branding & Country */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Fuel className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-lg font-black text-white tracking-tight">LitroMetrik</span>
              <span className="title-gradient-pro text-sm font-black uppercase text-cyan-400">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Navegación Waze & Gestión de Combustible</p>
          </div>
        </div>

        {/* Country Selector */}
        <div className="flex items-center space-x-1 bg-[#111827] border border-slate-800 rounded-2xl p-1 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
          {(['PL', 'CO', 'US'] as CountryCode[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleCountryChange(c)}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition button-hover-pro cursor-pointer ${
                selectedCountry === c
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {DATA_PAIS[c]?.bandera}
            </button>
          ))}
        </div>
      </div>

      {/* Main Glassmorphism Card */}
      <div className="w-full max-w-md mx-auto">
        <div
          className="p-6 sm:p-8 bg-[#111827]/95 border border-slate-800 rounded-[28px] shadow-2xl text-white backdrop-blur-xl"
        >
          {/* Card Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {tab === 'register' ? 'Crear Cuenta PRO' : tab === 'login' ? 'Iniciar Sesión' : 'Recuperar Cuenta'}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">
              {tab === 'register'
                ? 'Sincroniza tus registros, GPS en tiempo real y estadísticas en la nube.'
                : tab === 'login'
                ? 'Accede a tu historial de viajes, bitácora y telemetría.'
                : 'Ingresa tu correo para recibir las instrucciones de acceso.'}
            </p>
          </div>

          {/* Segmented Tabs: Crear Cuenta vs Iniciar Sesión */}
          {tab !== 'forgot' && (
            <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#0b0f19] border border-slate-800 mb-6">
              <button
                type="button"
                onClick={() => { setTab('register'); setErrorMsg(null); }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center space-x-2 button-hover-pro cursor-pointer ${
                  tab === 'register'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Crear Cuenta</span>
              </button>

              <button
                type="button"
                onClick={() => { setTab('login'); setErrorMsg(null); }}
                className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center space-x-2 button-hover-pro cursor-pointer ${
                  tab === 'login'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nombre de Conductor</label>
                <div className="relative">
                  <UserPlus className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre o apodo"
                    className="w-full bg-[#1c2436] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.correo@ejemplo.com"
                  className="w-full bg-[#1c2436] border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {tab !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Contraseña</label>
                  {tab === 'login' && (
                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#1c2436] border border-slate-700 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {tab === 'register' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Confirmar Contraseña</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full bg-[#1c2436] border border-slate-700 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center space-x-2 button-hover-pro cursor-pointer mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {tab === 'register' ? 'Crear Cuenta PRO' : tab === 'login' ? 'Iniciar Sesión con Correo' : 'Enviar Enlace de Recuperación'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Opción Continuar como Invitado */}
          {onContinueAsGuest && (
            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="w-full py-3 bg-[#172033] hover:bg-[#1E293B] text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700/80 transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98 shadow-sm"
              >
                <span>🚗 Continuar como Invitado (Sin Registro)</span>
              </button>
            </div>
          )}

          {/* Información de estado de Supabase / Nube */}
          {!isSupabaseConfigured() && (
            <div className="mt-4 p-3 rounded-xl bg-blue-950/40 border border-blue-900/60 text-[11px] text-blue-300/90 leading-relaxed flex items-start space-x-2">
              <Database className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">Modo Nube Directa & Local Activo</span>
                <span>Las variables de Supabase están en modo respaldo. Puedes crear tu cuenta o iniciar sesión; tus datos y viajes se guardarán seguros en la nube y en tu dispositivo.</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto text-center text-[11px] text-slate-500 pt-6">
        LitroMetrik PRO • Supabase Backend & Persistencia en la Nube
      </div>

    </div>
  );
};
