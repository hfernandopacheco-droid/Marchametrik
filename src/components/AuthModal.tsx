import React, { useState, useEffect, useRef } from 'react';
import {
  X, Mail, Lock, LogIn, UserPlus, KeyRound, CheckCircle2,
  AlertCircle, ArrowRight, Sparkles, LogOut, Eye, EyeOff,
  Fuel, User as UserIcon, Edit3, Save, Car, Check,
  Camera, Upload, Trash2, Globe
} from 'lucide-react';
import {
  performEmailRegister,
  performEmailLogin,
  performGoogleAuth,
  performAppleAuth,
  performPasswordReset,
  performSignOut,
  requestNotificationPermission,
  getStoredActiveUser,
  updateActiveUserProfile,
  performChangePassword
} from '../utils/firebaseAuth';
import { DATA_PAIS, CountryCode } from '../utils/countryData';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onAuthSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [registerName, setRegisterName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile Edit States when logged in
  const activeUser = currentUser || getStoredActiveUser();
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCustomId, setEditCustomId] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState<string | null>(null);
  
  // Country & Vehicle Selector with Catalog
  const [editCountry, setEditCountry] = useState<CountryCode>(() => {
    return (localStorage.getItem('litrometrik_user_country') || localStorage.getItem('litrometrik_jurisdiction_country') || 'PL') as CountryCode;
  });
  const [selectedCarId, setSelectedCarId] = useState<string>('custom');
  const [editCarModelName, setEditCarModelName] = useState('Skoda Octavia');
  const [editVehicleType, setEditVehicleType] = useState('sedan');
  const [editEngineSize, setEditEngineSize] = useState('1.6');
  const [editFuelType, setEditFuelType] = useState('LPG');
  const [editSavedToast, setEditSavedToast] = useState(false);

  // Password change state
  const [profileNewPass, setProfileNewPass] = useState('');
  const [profileConfirmPass, setProfileConfirmPass] = useState('');
  const [showProfileNewPass, setShowProfileNewPass] = useState(false);
  const [showProfileConfirmPass, setShowProfileConfirmPass] = useState(false);
  const [profilePassLoading, setProfilePassLoading] = useState(false);
  const [profilePassError, setProfilePassError] = useState<string | null>(null);
  const [profilePassSuccess, setProfilePassSuccess] = useState<string | null>(null);

  const handleProfileChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfilePassError(null);
    setProfilePassSuccess(null);

    if (profileNewPass.length < 6) {
      setProfilePassError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (profileNewPass !== profileConfirmPass) {
      setProfilePassError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setProfilePassLoading(true);
    try {
      const res = await performChangePassword(profileNewPass, editEmail || activeUser?.email || undefined);
      setProfilePassSuccess(res.message);
      setProfileNewPass('');
      setProfileConfirmPass('');
      setTimeout(() => setProfilePassSuccess(null), 5000);
    } catch (err: any) {
      setProfilePassError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setProfilePassLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentCountryInfo = DATA_PAIS[editCountry] || DATA_PAIS.PL;
  const availableCars = currentCountryInfo.cars || [];

  useEffect(() => {
    if (activeUser) {
      setEditDisplayName(activeUser.displayName || '');
      setEditCustomId(activeUser.uid || `USR-${Math.floor(100000 + Math.random() * 900000)}`);
      setEditEmail(activeUser.email || '');
      
      const storedPhoto = localStorage.getItem('litrometrik_user_photo') || activeUser.photoURL || null;
      setEditPhotoURL(storedPhoto);

      const savedCountry = (localStorage.getItem('litrometrik_user_country') || localStorage.getItem('litrometrik_jurisdiction_country') || 'PL') as CountryCode;
      setEditCountry(savedCountry);

      const savedCarModel = localStorage.getItem('litrometrik_user_vehicle_model') || 'Skoda Octavia 1.6 MPI (LPG)';
      setEditCarModelName(savedCarModel);

      const savedVehicle = localStorage.getItem('litrometrik_user_vehicle') || 'sedan';
      const savedEngine = localStorage.getItem('litrometrik_user_engine') || '1.6';
      const savedFuel = localStorage.getItem('litrometrik_user_fuel');
      const normalizedFuel = savedFuel === 'GLP' ? 'LPG' : (savedFuel || 'LPG');
      
      setEditVehicleType(savedVehicle);
      setEditEngineSize(savedEngine);
      setEditFuelType(normalizedFuel);

      const foundCar = DATA_PAIS[savedCountry]?.cars?.find(c => c.model === savedCarModel);
      if (foundCar) {
        setSelectedCarId(foundCar.id);
      } else {
        setSelectedCarId('custom');
      }
    }
  }, [activeUser, isOpen]);

  const handleCountryChange = (c: CountryCode) => {
    setEditCountry(c);
    const cars = DATA_PAIS[c]?.cars || [];
    if (cars.length > 0) {
      const firstCar = cars[0];
      setSelectedCarId(firstCar.id);
      setEditCarModelName(`${firstCar.brand} ${firstCar.model}`);
      setEditEngineSize(firstCar.displacementL ? String(firstCar.displacementL) : '1.6');
      const defF = firstCar.defaultFuel || 'LPG';
      setEditFuelType(defF);
    } else {
      setSelectedCarId('custom');
    }
  };

  const handleCarModelSelect = (carId: string) => {
    setSelectedCarId(carId);
    if (carId === 'custom') {
      setEditCarModelName('');
      return;
    }
    const foundCar = availableCars.find((c) => c.id === carId);
    if (foundCar) {
      setEditCarModelName(`${foundCar.brand} ${foundCar.model}`);
      setEditEngineSize(foundCar.displacementL ? String(foundCar.displacementL) : '1.6');
      const defF = foundCar.defaultFuel || 'LPG';
      setEditFuelType(defF);
      if (foundCar.bodyType) {
        setEditVehicleType(foundCar.bodyType);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setEditPhotoURL(base64);
        localStorage.setItem('litrometrik_user_photo', base64);
        updateActiveUserProfile({ photoURL: base64 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setEditPhotoURL(null);
    localStorage.removeItem('litrometrik_user_photo');
    updateActiveUserProfile({ photoURL: '' });
  };

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCustomId.trim()) {
      setErrorMsg('El ID de usuario no puede estar vacío.');
      return;
    }

    updateActiveUserProfile({
      displayName: editDisplayName.trim() || 'Conductor LitroMetrik',
      uid: editCustomId.trim(),
      email: editEmail.trim(),
      photoURL: editPhotoURL || undefined
    });

    localStorage.setItem('litrometrik_user_country', editCountry);
    localStorage.setItem('litrometrik_jurisdiction_country', editCountry);
    localStorage.setItem('litrometrik_selected_country', editCountry);
    localStorage.setItem('litrometrik_user_vehicle_model', editCarModelName);
    localStorage.setItem('litrometrik_user_vehicle', editVehicleType);
    localStorage.setItem('litrometrik_user_engine', editEngineSize);
    localStorage.setItem('litrometrik_user_fuel', editFuelType);
    localStorage.setItem('wazer_nickname', editDisplayName.trim() || 'Conductor LitroMetrik');
    if (editPhotoURL) {
      localStorage.setItem('litrometrik_user_photo', editPhotoURL);
    }

    window.dispatchEvent(new Event('storage'));

    setEditSavedToast(true);
    setTimeout(() => {
      setEditSavedToast(false);
    }, 2200);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
        await performEmailLogin(email.trim(), password);
        setSuccessMsg('¡Sesión iniciada exitosamente!');
        await requestNotificationPermission();
        setTimeout(() => {
          onClose();
          if (onAuthSuccess) onAuthSuccess();
        }, 500);
      } else if (tab === 'register') {
        await performEmailRegister(email.trim(), password, registerName.trim());
        setSuccessMsg('¡Cuenta creada exitosamente!');
        await requestNotificationPermission();
        setTimeout(() => {
          onClose();
          if (onAuthSuccess) onAuthSuccess();
        }, 500);
      } else if (tab === 'forgot') {
        await performPasswordReset(email.trim());
        setSuccessMsg(`Se ha enviado el enlace de recuperación a: ${email}`);
        setTimeout(() => setTab('login'), 2500);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err?.message || 'Error al autenticar. Por favor verifica tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await performGoogleAuth();
      setSuccessMsg('¡Conectado con Google exitosamente!');
      await requestNotificationPermission();
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      }, 500);
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await performAppleAuth();
      setSuccessMsg('¡Conectado con Apple exitosamente!');
      await requestNotificationPermission();
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      }, 500);
    } catch (err: any) {
      console.error('Apple Sign-in error:', err);
      setTimeout(() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      }, 500);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await performSignOut();
      onClose();
    } catch (err) {
      console.error('Sign out error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/25">
              {activeUser ? <UserIcon className="w-5 h-5 text-white" /> : <Fuel className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                {activeUser ? 'Perfil de Conductor & Auto' : (tab === 'register' ? 'Crear Cuenta PRO' : tab === 'login' ? 'Iniciar Sesión' : 'Recuperar Cuenta')}
              </h2>
              <p className="text-xs text-slate-400">
                {activeUser ? 'Datos guardados en Cloud Firestore' : 'LitroMetrik PRO'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition button-hover-pro cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-bold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Active User Profile Edit Form */}
        {activeUser ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            
            {/* Profile Photo */}
            <div className="p-4 rounded-2xl bg-[#1e293b] border border-slate-700/60 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-2xl bg-[#0f172a] border border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {editPhotoURL ? (
                    <img
                      src={editPhotoURL}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">🚗</span>
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Foto de Perfil</div>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center space-x-1 transition button-hover-pro cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Subir Foto</span>
                    </button>
                    {editPhotoURL && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-2 py-1 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-[11px] font-bold flex items-center space-x-1 transition button-hover-pro cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Quitar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Editable Profile Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Nombre de Conductor / Apodo
                </label>
                <input
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Tu Nombre o Apodo"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ID de Usuario
                </label>
                <input
                  type="text"
                  value={editCustomId}
                  onChange={(e) => setEditCustomId(e.target.value)}
                  placeholder="USR-123456"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-sans font-bold text-blue-400 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Vehicle Settings */}
            <div className="p-4 rounded-2xl bg-[#1e293b] border border-slate-700/60 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>Configuración de Vehículo & Motor</span>
                </span>
                <span className="text-[10px] text-blue-400 font-bold">Telemetría</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    País de Operación
                  </label>
                  <select
                    value={editCountry}
                    onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PL">🇵🇱 Polonia (PLN - Złoty)</option>
                    <option value="CO">🇨🇴 Colombia (COP - Peso)</option>
                    <option value="US">🇺🇸 Estados Unidos (USD - Dollar)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Tipo de Carrocería
                  </label>
                  <select
                    value={editVehicleType}
                    onChange={(e) => setEditVehicleType(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="compact">🚗 Compacto / Urbano (1.0-1.4L)</option>
                    <option value="sedan">🚘 Sedán / Berlina (1.4-2.0L)</option>
                    <option value="suv">🚙 SUV / Crossover (1.6-3.0L)</option>
                    <option value="pickup">🛻 Pickup / Camioneta 4x4 (2.4-4.0L)</option>
                    <option value="van">🚐 Furgoneta / Utilitario</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Catálogo de Autos en {currentCountryInfo.nombre}
                </label>
                <select
                  value={selectedCarId}
                  onChange={(e) => handleCarModelSelect(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <optgroup label={`Catálogo en ${currentCountryInfo.nombre}`}>
                    {availableCars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.brand} {car.model} — {car.engine} [{car.defaultFuel}]
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">✏️ Personalizado / Otro modelo...</option>
                </select>
              </div>

              {selectedCarId === 'custom' && (
                <div className="p-3 rounded-xl bg-[#0f172a] border border-slate-700 space-y-1">
                  <label className="block text-[10px] font-bold text-blue-400">
                    Marca y Modelo Personalizado
                  </label>
                  <input
                    type="text"
                    value={editCarModelName}
                    onChange={(e) => setEditCarModelName(e.target.value)}
                    placeholder="Ej: Mazda 3 1.6, Toyota Corolla..."
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Cilindraje Motor
                  </label>
                  <select
                    value={editEngineSize}
                    onChange={(e) => setEditEngineSize(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="1.0">⚡ 1.0L</option>
                    <option value="1.2">⚡ 1.2L</option>
                    <option value="1.4">⚙️ 1.4L</option>
                    <option value="1.5">⚙️ 1.5L</option>
                    <option value="1.6">⚙️ 1.6L</option>
                    <option value="1.8">🚀 1.8L</option>
                    <option value="2.0">🚀 2.0L</option>
                    <option value="2.2">🏎️ 2.2L</option>
                    <option value="2.5">🏎️ 2.5L</option>
                    <option value="3.0">🏎️ 3.0L</option>
                    <option value="3.5">🔥 3.5L</option>
                    <option value="4.0">🔥 4.0L+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Combustible
                  </label>
                  <select
                    value={editFuelType}
                    onChange={(e) => setEditFuelType(e.target.value)}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="LPG">🟢 Gas LPG / Autogás</option>
                    <option value="Gasolina">🔵 Gasolina 95</option>
                    <option value="Gasolina 98">⚡ Gasolina 98</option>
                    <option value="Diésel">🟡 Diésel</option>
                    <option value="GNV">💨 GNV</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Password Change Section */}
            <div className="p-4 rounded-2xl bg-[#1e293b] border border-slate-700/60 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <span>Seguridad • Cambiar Contraseña</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Sincronizado
                </span>
              </div>

              {profilePassError && (
                <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{profilePassError}</span>
                </div>
              )}

              {profilePassSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>{profilePassSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showProfileNewPass ? 'text' : 'password'}
                      value={profileNewPass}
                      onChange={(e) => setProfileNewPass(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfileNewPass(!showProfileNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showProfileNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showProfileConfirmPass ? 'text' : 'password'}
                      value={profileConfirmPass}
                      onChange={(e) => setProfileConfirmPass(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 pr-9 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowProfileConfirmPass(!showProfileConfirmPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showProfileConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProfileChangePassword}
                disabled={profilePassLoading || !profileNewPass}
                className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl transition button-hover-pro cursor-pointer flex items-center justify-center space-x-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{profilePassLoading ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
              </button>
            </div>

            {editSavedToast && (
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-bold flex items-center justify-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>¡Perfil y vehículo guardados con éxito!</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md button-hover-pro flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios de Perfil</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loading}
              className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 font-bold text-xs rounded-xl transition button-hover-pro cursor-pointer flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>

          </form>
        ) : (
          /* When opening login / register in modal */
          <div className="space-y-4">
            {tab !== 'forgot' && (
              <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-[#0f172a] border border-slate-800 mb-4">
                <button
                  type="button"
                  onClick={() => { setTab('register'); setErrorMsg(null); }}
                  className={`py-2 rounded-xl text-xs font-bold transition button-hover-pro cursor-pointer ${
                    tab === 'register' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Crear Cuenta
                </button>
                <button
                  type="button"
                  onClick={() => { setTab('login'); setErrorMsg(null); }}
                  className={`py-2 rounded-xl text-xs font-bold transition button-hover-pro cursor-pointer ${
                    tab === 'login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Iniciar Sesión
                </button>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nombre de Conductor</label>
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Tu nombre o apodo"
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {tab !== 'forgot' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {tab === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar Contraseña</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-md button-hover-pro cursor-pointer"
              >
                {tab === 'register' ? 'Crear Cuenta' : tab === 'login' ? 'Iniciar Sesión' : 'Enviar Enlace'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
