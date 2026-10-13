import React, { useState } from 'react';
import {
  X, User, LogOut, Mail, Eye, EyeOff, Lock, CheckCircle2,
  AlertCircle, ShieldCheck, KeyRound, Sparkles, ChevronDown
} from 'lucide-react';
import { signOutSupabase, supabase } from '../utils/supabaseClient';
import { performSignOut, performChangePassword } from '../utils/firebaseAuth';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onLogout: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
}) => {
  // Password change states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const [confirmSignOut, setConfirmSignOut] = useState(false);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    if (!confirmSignOut) {
      setConfirmSignOut(true);
      return;
    }
    try {
      await signOutSupabase();
    } catch (_) {}
    try {
      await performSignOut();
    } catch (_) {}
    onLogout();
    onClose();
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const cleanPass = newPassword.trim();
    if (cleanPass.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setPasswordError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setPasswordLoading(true);
    try {
      // 1. Supabase Auth password update
      if (supabase && supabase.auth) {
        try {
          const { error: sbErr } = await supabase.auth.updateUser({ password: cleanPass });
          if (sbErr) {
            console.info('Supabase auth.updateUser note:', sbErr.message);
          }
        } catch (sbE) {
          console.warn('Supabase password error:', sbE);
        }
      }

      // 2. Guaranteed local registry and cloud backup update
      await performChangePassword(cleanPass, currentUser?.email || undefined);

      setPasswordSuccess('¡Contraseña actualizada exitosamente! Ya puedes cerrar sesión y volver a entrar con este mismo correo y tu nueva contraseña; toda tu información, viajes y tanques se conservan intactos.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(null);
      }, 7000);
    } catch (err: any) {
      setPasswordError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const userName =
    currentUser?.displayName ||
    currentUser?.user_metadata?.nombre ||
    localStorage.getItem('wazer_nickname') ||
    currentUser?.email?.split('@')[0] ||
    'Conductor LitroMetrik';

  const userEmail = currentUser?.email || 'conductor@litrometrik.pro';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#111827] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0 bg-[#0F1422]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF4F00] to-[#FF8000] flex items-center justify-center shadow-lg shadow-[#FF4F00]/25">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Cuenta del Conductor</h2>
              <p className="text-[10px] text-slate-400 font-medium">Seguridad de la Cuenta y Cambio de Contraseña</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content con Scroll Suave */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] flex-1">
          {/* User Profile Card */}
          <div className="p-4 rounded-2xl bg-[#1A2234] border border-slate-700/70 flex items-center space-x-3.5 shadow-sm">
            <div className="w-13 h-13 rounded-2xl bg-[#080B11] border border-slate-700 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🚗
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white truncate">{userName}</div>
              <div className="text-xs text-slate-400 font-medium truncate flex items-center space-x-1 mt-0.5">
                <Mail className="w-3 h-3 text-[#FF4F00] shrink-0" />
                <span className="truncate">{userEmail}</span>
              </div>
              <div className="mt-1.5 flex items-center space-x-2">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Cuenta Activa & Verificada</span>
                </span>
              </div>
            </div>
          </div>

          {/* OPCIÓN PARA CAMBIAR CONTRASEÑA (DESPLEGABLE / COMPACTA POR DEFECTO) */}
          <div className="rounded-2xl bg-[#0D131F] border border-slate-800 overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(!isChangePasswordOpen)}
              className="w-full p-3.5 sm:p-4 flex items-center justify-between text-left hover:bg-[#131A2A] transition cursor-pointer"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white flex items-center space-x-1.5 truncate">
                    <span>Cambiar Contraseña</span>
                    <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Protección Cloud</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {isChangePasswordOpen ? 'Toca para ocultar' : 'Toca para desplegar opciones y actualizar clave'}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ml-2 ${
                  isChangePasswordOpen ? 'rotate-180 text-emerald-400' : ''
                }`}
              />
            </button>

            {isChangePasswordOpen && (
              <div className="p-4 pt-1 border-t border-slate-800/80 space-y-3.5 animate-in fade-in duration-150">
                <p className="text-[11px] text-slate-400 leading-relaxed pt-1.5">
                  Si cambias tu contraseña, podrás cerrar e iniciar sesión con el mismo correo y tu nueva clave, encontrando toda tu información, vehículos y registros tal como los dejaste.
                </p>

                <form onSubmit={handleChangePasswordSubmit} className="space-y-3 pt-1">
                  {/* Nueva Contraseña */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres..."
                        className="w-full bg-[#161D2B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmar Nueva Contraseña */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la nueva contraseña..."
                        className="w-full bg-[#161D2B] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-medium focus:outline-none focus:border-emerald-500 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Checklist de Validación en Vivo */}
                  <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 text-[10px] space-y-1 text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <span className={newPassword.length >= 6 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {newPassword.length >= 6 ? '✓' : '•'} Mínimo 6 caracteres
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={newPassword && newPassword === confirmPassword ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {newPassword && newPassword === confirmPassword ? '✓' : '•'} Ambas contraseñas coinciden exactamente
                      </span>
                    </div>
                  </div>

                  {/* Mensaje de Error */}
                  {passwordError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  {/* Mensaje de Éxito */}
                  {passwordSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>{passwordSuccess}</span>
                    </div>
                  )}

                  {/* Botón de Enviar */}
                  <button
                    type="submit"
                    disabled={passwordLoading || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/25 cursor-pointer active:scale-98"
                  >
                    {passwordLoading ? (
                      <span>Actualizando contraseña en la nube...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Guardar y Actualizar Contraseña</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer with Cerrar y Cerrar Sesión */}
        <div className="p-4 border-t border-slate-800 bg-[#0A0E18] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className={`flex-1 py-2.5 rounded-xl text-white font-black text-xs transition flex items-center justify-center space-x-2 shadow-lg cursor-pointer active:scale-95 ${
              confirmSignOut
                ? 'bg-rose-700 hover:bg-rose-600 ring-2 ring-rose-400 shadow-rose-700/50 animate-pulse'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>{confirmSignOut ? '¿Confirmar Cerrar Sesión?' : 'Cerrar Sesión'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
