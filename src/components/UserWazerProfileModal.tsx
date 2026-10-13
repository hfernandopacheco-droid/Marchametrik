import React, { useState, useEffect, useRef } from 'react';
import {
  X, ArrowLeft, User, Award, Shield, Volume2, AlertTriangle, Fuel,
  Check, Sparkles, MapPin, Shuffle, Camera, Upload, Trash2, Car,
  Globe, Gauge, CheckCircle2, Lock, Key, Eye, EyeOff, ShieldCheck, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { DATA_PAIS, CountryCode, CarModelSpec } from '../utils/countryData';
import { getStoredActiveUser, updateActiveUserProfile, performChangePassword } from '../utils/firebaseAuth';
import { saveActiveVehicleState } from '../utils/vehicleCatalog';

interface UserWazerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalKmCalculated: number;
}

export const UserWazerProfileModal: React.FC<UserWazerProfileModalProps> = ({
  isOpen,
  onClose,
  totalKmCalculated,
}) => {
  const activeUser = getStoredActiveUser();
  const [nickname, setNickname] = useState(() => localStorage.getItem('wazer_nickname') || activeUser?.displayName || 'Conductor LitroMetrik');
  const [avatar, setAvatar] = useState(() => localStorage.getItem('wazer_avatar') || '🚗');
  const [photoURL, setPhotoURL] = useState<string | null>(() => localStorage.getItem('litrometrik_user_photo') || activeUser?.photoURL || null);
  
  // Country & Car Catalog
  const [country, setCountry] = useState<CountryCode>(() => {
    return (localStorage.getItem('litrometrik_user_country') || localStorage.getItem('litrometrik_jurisdiction_country') || 'PL') as CountryCode;
  });
  const [selectedCarId, setSelectedCarId] = useState<string>('custom');
  const [carModelName, setCarModelName] = useState(() => localStorage.getItem('litrometrik_user_vehicle_model') || 'Skoda Octavia 1.6 MPI (LPG)');
  const [vehicleType, setVehicleType] = useState(() => localStorage.getItem('litrometrik_user_vehicle') || 'sedan');
  const [engineSize, setEngineSize] = useState(() => localStorage.getItem('litrometrik_user_engine') || '1.6');
  const [fuelType, setFuelType] = useState(() => {
    const saved = localStorage.getItem('litrometrik_user_fuel');
    return saved === 'GLP' ? 'LPG' : (saved || 'LPG');
  });

  // Collapsible toggle to keep driver profile window neat and compact
  const [isVehicleConfigExpanded, setIsVehicleConfigExpanded] = useState(false);

  // Waze Navigation preferences
  const [defaultRouting, setDefaultRouting] = useState(() => localStorage.getItem('wazer_routing') || 'fastest');
  const [voiceAlerts, setVoiceAlerts] = useState(true);
  const [speedWarning, setSpeedWarning] = useState(true);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [geofenceGas, setGeofenceGas] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await performChangePassword(newPassword, activeUser?.email || undefined);
      setPasswordSuccess(res.message);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(null);
      }, 5000);
    } catch (err: any) {
      setPasswordError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const currentCountryInfo = DATA_PAIS[country] || DATA_PAIS.PL;
  const availableCars = currentCountryInfo.cars || [];

  const avatarsList = ['🚗', '🚙', '🏎️', '🚐', '⚡', '🦊', '🐼', '🦁', '🤖', '🚀', '⭐', '🔥'];

  const randomizeAvatar = () => {
    const random = avatarsList[Math.floor(Math.random() * avatarsList.length)];
    setAvatar(random);
  };

  const handleCountryChange = (newCountry: CountryCode) => {
    setCountry(newCountry);
    const countryInfo = DATA_PAIS[newCountry];
    if (countryInfo && countryInfo.cars && countryInfo.cars.length > 0) {
      const firstCar = countryInfo.cars[0];
      setSelectedCarId(firstCar.id);
      setCarModelName(firstCar.model);
      setVehicleType(firstCar.bodyType);
      setEngineSize(firstCar.displacementL);
      setFuelType(firstCar.defaultFuel);
    }
  };

  const handleCarModelSelect = (carId: string) => {
    setSelectedCarId(carId);
    if (carId === 'custom') return;
    const car = availableCars.find(c => c.id === carId);
    if (car) {
      setCarModelName(car.model);
      setVehicleType(car.bodyType);
      setEngineSize(car.displacementL);
      setFuelType(car.defaultFuel);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('La imagen debe ser menor a 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPhotoURL(base64);
      localStorage.setItem('litrometrik_user_photo', base64);
      updateActiveUserProfile({ photoURL: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoURL(null);
    localStorage.removeItem('litrometrik_user_photo');
    updateActiveUserProfile({ photoURL: '' });
  };

  const handleSave = () => {
    localStorage.setItem('wazer_nickname', nickname);
    localStorage.setItem('wazer_avatar', avatar);
    localStorage.setItem('wazer_routing', defaultRouting);
    localStorage.setItem('wazer_voice', JSON.stringify(voiceAlerts));
    localStorage.setItem('wazer_speed', JSON.stringify(speedWarning));
    localStorage.setItem('wazer_tolls', JSON.stringify(avoidTolls));
    localStorage.setItem('wazer_geofence', JSON.stringify(geofenceGas));

    localStorage.setItem('litrometrik_user_country', country);
    localStorage.setItem('litrometrik_jurisdiction_country', country);
    localStorage.setItem('litrometrik_selected_country', country);
    localStorage.setItem('litrometrik_user_vehicle_model', carModelName);
    localStorage.setItem('litrometrik_user_vehicle', vehicleType);
    localStorage.setItem('litrometrik_user_engine', engineSize);
    localStorage.setItem('litrometrik_user_fuel', fuelType);

    saveActiveVehicleState({
      vehicleModelName: carModelName,
      vehicleType: vehicleType as any,
      displacement: `${engineSize}L`,
      fuelType: fuelType,
    });

    updateActiveUserProfile({
      displayName: nickname,
      photoURL: photoURL || undefined
    });

    window.dispatchEvent(new Event('storage'));

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const getLevelInfo = (km: number) => {
    if (km < 100) return { title: 'Wazer Novato 🚗', color: 'from-blue-600 to-indigo-600' };
    if (km < 500) return { title: 'Wazer Explorador 🛣️', color: 'from-indigo-600 to-violet-600' };
    if (km < 1500) return { title: 'Wazer Avanzado ⚡', color: 'from-violet-600 to-emerald-600' };
    return { title: 'Wazer Maestro de la Ruta 👑', color: 'from-amber-500 to-emerald-500' };
  };

  const levelInfo = getLevelInfo(totalKmCalculated);

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0b12] overflow-y-auto overscroll-contain [touch-action:pan-y] [-webkit-overflow-scrolling:touch] animate-fadeIn pb-24 font-sans">
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#10121f]/95 backdrop-blur-xl border-b border-white/10 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition border border-white/10 shadow cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>← Volver</span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg text-white">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  Perfil de Conductor & Vehículo
                </h1>
                <p className="text-xs text-cyan-300 font-medium">LitroMetrik GPS & Waze Navigation</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-emerald-500 text-white font-black text-xs shadow-lg transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        
        {/* Wazer Badge & Photo Card */}
        <div className="p-6 rounded-[28px] bg-[#141628]/80 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <div className="relative group">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[2.5px] shadow-2xl shrink-0 overflow-hidden">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Perfil"
                    className="w-full h-full object-cover rounded-[22px]"
                  />
                ) : (
                  <div className="w-full h-full bg-[#101220] rounded-[22px] flex items-center justify-center text-4xl shadow-inner">
                    {avatar}
                  </div>
                )}
              </div>

              {/* Upload trigger button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition cursor-pointer text-white"
                title="Cambiar Foto"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>

            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rango de Conductor Wazer</div>
              <div className="text-xl font-black text-white">{levelInfo.title}</div>
              <div className="text-xs text-cyan-300 font-bold mt-1">{nickname} • {country}</div>
              
              <div className="flex items-center space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-sky-300 text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  title="Tomar foto con la cámara"
                >
                  <Camera className="w-3 h-3" />
                  <span>Cámara</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-300 text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer"
                  title="Subir foto desde la galería"
                >
                  <Upload className="w-3 h-3" />
                  <span>Galería</span>
                </button>
                {photoURL && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-2 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-[11px] font-bold flex items-center space-x-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Quitar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto text-right bg-black/40 p-4 rounded-2xl border border-white/10">
            <div className="text-[10px] uppercase font-bold text-slate-400">Puntos de Ruta GPS</div>
            <div className="text-2xl font-black text-emerald-400">{Math.round(totalKmCalculated * 12)} pts</div>
            <div className="text-[10px] text-cyan-300">Total: {totalKmCalculated} km calculados</div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>

        {/* Profile Settings */}
        <div className="p-6 rounded-[28px] bg-[#141628]/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
            <User className="w-4 h-4 text-cyan-400" />
            <span>Datos del Conductor</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1.5">Tu Apodo en el Mapa</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl text-white text-sm font-bold focus:outline-none focus:border-cyan-400 transition"
                style={{
                  backgroundColor: '#14141F',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
                placeholder="Ingresa tu apodo..."
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 font-bold block mb-1.5">Avatar Emoji Rápido</label>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-[#14141F] border border-white/15 flex items-center justify-center text-2xl shadow-inner">
                  {avatar}
                </div>
                <button
                  type="button"
                  onClick={randomizeAvatar}
                  className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Shuffle className="w-4 h-4 text-cyan-400" />
                  <span>Aleatorio</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vehicle Specification & Country Catalog - Reducido y desplegable bajo demanda */}
        <div className="p-6 rounded-[28px] bg-[#141628]/80 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
              <Car className="w-4 h-4 text-violet-400" />
              <span>Vehículo & Motor por País</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsVehicleConfigExpanded(!isVehicleConfigExpanded)}
              className="px-3 py-1.5 rounded-xl bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer"
            >
              <span>{isVehicleConfigExpanded ? 'Ocultar Opciones' : 'Configurar / Ver Opciones'}</span>
              {isVehicleConfigExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Ficha Resumen Compacta (Visible siempre para no alargar la ventana) */}
          <div className="p-3.5 rounded-2xl bg-[#0F111E] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center shrink-0 text-sm font-bold">
                🚗
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-white truncate">
                  {carModelName || 'Vehículo Activo'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {currentCountryInfo.nombre} • {vehicleType.toUpperCase()} • Motor {engineSize}L • {fuelType}
                </div>
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0 self-start sm:self-center">
              100% Sincronizado
            </span>
          </div>

          {/* Opciones Detalladas Desplegables al Tocar */}
          {isVehicleConfigExpanded && (
            <div className="space-y-4 pt-2 border-t border-white/10 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Country Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    País de Operación
                  </label>
                  <select
                    value={country}
                    onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
                    className="w-full px-4 py-3 rounded-2xl text-white text-xs font-bold focus:outline-none focus:border-violet-500 transition"
                    style={{
                      backgroundColor: '#14141F',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <option value="PL">🇵🇱 Polonia (PLN - Złoty)</option>
                    <option value="CO">🇨🇴 Colombia (COP - Peso)</option>
                    <option value="US">🇺🇸 Estados Unidos (USD - Dollar)</option>
                  </select>
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Tipo de Carrocería
                  </label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-white text-xs font-bold focus:outline-none focus:border-violet-500 transition"
                    style={{
                      backgroundColor: '#14141F',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <option value="compact">🚗 Compacto / Urbano (1.0-1.4L)</option>
                    <option value="sedan">🚘 Sedán / Berlina (1.4-2.0L)</option>
                    <option value="suv">🚙 SUV / Crossover (1.6-3.0L)</option>
                    <option value="pickup">🛻 Pickup / Camioneta 4x4 (2.4-4.0L)</option>
                    <option value="van">🚐 Furgoneta / Utilitario</option>
                  </select>
                </div>
              </div>

              {/* Car Catalog Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Modelos de Carros en {currentCountryInfo.nombre} con Cilindraje</span>
                  <span className="text-emerald-400 text-xs font-bold">{availableCars.length} autos en catálogo</span>
                </label>
                <select
                  value={selectedCarId}
                  onChange={(e) => handleCarModelSelect(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl text-white text-xs font-bold focus:outline-none focus:border-violet-500 transition"
                  style={{
                    backgroundColor: '#14141F',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <optgroup label={`Catálogo Popular en ${currentCountryInfo.nombre}`}>
                    {availableCars.map((car) => (
                      <option key={car.id} value={car.id}>
                        {car.brand} {car.model} — {car.engine} [{car.defaultFuel}]
                      </option>
                    ))}
                  </optgroup>
                  <option value="custom">✏️ Personalizado / Otro modelo...</option>
                </select>
              </div>

              {/* Custom Car Input when Personalizado / Otro is chosen */}
              {selectedCarId === 'custom' && (
                <div className="p-4 rounded-2xl bg-violet-950/40 border border-violet-500/40 space-y-2 animate-fadeIn">
                  <div className="text-xs font-black text-violet-300 flex items-center space-x-1.5">
                    <Car className="w-4 h-4 text-violet-400" />
                    <span>Agregar Carro Personalizado</span>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Escribe la Marca y Modelo de tu Vehículo
                    </label>
                    <input
                      type="text"
                      value={carModelName}
                      onChange={(e) => setCarModelName(e.target.value)}
                      placeholder="Ej: Mazda 6, BMW X5, Audi A4, Chevrolet Aveo..."
                      className="w-full px-4 py-2.5 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-violet-500 transition"
                      style={{ backgroundColor: '#14141F', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                    />
                  </div>
                </div>
              )}

              {/* Engine Size & Fuel Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Cilindraje de Motor
                  </label>
                  <select
                    value={engineSize}
                    onChange={(e) => setEngineSize(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-white text-xs font-bold focus:outline-none focus:border-violet-500 transition"
                    style={{
                      backgroundColor: '#14141F',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <option value="1.0">⚡ 1.0L Económico</option>
                    <option value="1.2">⚡ 1.2L Estándar</option>
                    <option value="1.4">⚙️ 1.4L Urbano</option>
                    <option value="1.6">⚙️ 1.6L Estándar</option>
                    <option value="1.8">🚀 1.8L Mediano</option>
                    <option value="2.0">🚀 2.0L Mediano</option>
                    <option value="2.2">🏎️ 2.2L Diésel</option>
                    <option value="2.5">🏎️ 2.5L Potente</option>
                    <option value="3.0">🏎️ 3.0L V6</option>
                    <option value="3.5">🔥 3.5L V6</option>
                    <option value="4.0">🔥 4.0L+ V8 Potencia Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Combustible Activo
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl text-white text-xs font-bold focus:outline-none focus:border-violet-500 transition"
                    style={{
                      backgroundColor: '#14141F',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  >
                    <option value="LPG">{country === 'CO' ? '🟢 Gas GLP' : '🟢 Gas LPG'}</option>
                    <option value="Gasolina">🔵 Gasolina 95 / Pb95</option>
                    <option value="Gasolina 98">⚡ Gasolina 98 Premium</option>
                    <option value="Diésel">🟡 Diésel / ACPM</option>
                    <option value="GNV">💨 Gas Natural GNV</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 5. SEGURIDAD & CONTRASEÑA */}
        <div
          className="p-5 rounded-3xl space-y-4"
          style={{
            backgroundColor: '#0F0F17',
            border: '1px solid rgba(255, 255, 255, 0.12)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Seguridad & Contraseña</h4>
                <p className="text-[11px] text-slate-400">Cambiar clave de acceso para iniciar sesión</p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Sincronizado
            </span>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
            {passwordError && (
              <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-3 pr-10 py-2.5 rounded-2xl text-white text-xs font-medium focus:outline-none focus:border-violet-500 transition"
                    style={{
                      backgroundColor: '#14141F',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full pl-3 pr-10 py-2.5 rounded-2xl text-white text-xs font-medium focus:outline-none focus:border-violet-500 transition"
                    style={{
                      backgroundColor: '#14141F',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading || !newPassword}
              className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer mt-1"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{passwordLoading ? 'Actualizando contraseña...' : 'Actualizar y Guardar Nueva Contraseña'}</span>
            </button>
          </form>
        </div>

        {/* Success Toast */}
        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold flex items-center justify-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>¡Perfil y configuración guardados con éxito!</span>
          </div>
        )}

        {/* Save CTA */}
        <button
          onClick={handleSave}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-emerald-500 hover:from-violet-500 hover:to-emerald-400 active:scale-[0.98] text-white font-black text-base shadow-[0_8px_30px_rgba(124,58,237,0.5)] transition flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Check className="w-5 h-5" />
          <span>Guardar Cambios de Perfil</span>
        </button>

      </div>
    </div>
  );
};
