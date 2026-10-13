import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, BarChart3, TrendingUp, Calendar, DollarSign, Fuel,
  Sparkles, Award, Navigation,
  Clock, Gauge, ShieldCheck, CheckCircle2, ChevronDown, Layers,
  RotateCcw, Save, Car, Zap, Check, AlertCircle, Edit3, X, PlusCircle, Trash2, Plus
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { SupportedCountry } from './ModuleViewModal';
import { getStoredActiveUser, subscribeToAuth } from '../utils/firebaseAuth';

interface FuelStatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToCategories?: () => void;
  onBack?: () => void;
  selectedCountry?: SupportedCountry;
  onCountryChange?: (country: SupportedCountry) => void;
}

export interface ViajeHistorico {
  id: number | string;
  fecha?: string;
  timestamp: string; // Fecha y hora exacta ISO
  distanciaKm?: number;
  km: number;        // ej. 12.4
  litros: number;    // ej. 1.05
  costoPLN?: number;
  costo: number;     // ej. 3.94
  combustible: string; // ej. "LPG"
  precioLitro: number; // ej. 3.75
  durationSeconds?: number;
  avgSpeedKmh?: number;
  date?: string;
  dayOfWeek?: string;
}

export interface GpsTripSession {
  id: string;
  date: string;
  timestamp: number;
  dayOfWeek: string;
  vehicleType: string;
  engineSize: string;
  fuelType: string;
  distanceKm: number;
  durationSeconds: number;
  litersConsumed: number;
  cost: number;
  currency: string;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
}

export function obtenerViajesPorPeriodo(filtro: 'DIA' | 'SEMANA' | 'MES' | 'ANO' | 'day' | 'week' | 'month' | 'year' | string): ViajeHistorico[] {
  let historial: ViajeHistorico[] = [];
  try {
    const raw = localStorage.getItem('historial_viajes');
    if (raw) {
      historial = JSON.parse(raw);
    }
  } catch (_) {}

  const ahora = new Date();

  return historial.filter(viaje => {
    if (!viaje || !viaje.timestamp) return false;
    const fecha = new Date(viaje.timestamp);
    if (isNaN(fecha.getTime())) return false;

    const f = (filtro || '').toUpperCase();

    if (f === 'DIA' || f === 'DAY') {
      return fecha.toDateString() === ahora.toDateString();
    }
    if (f === 'SEMANA' || f === 'WEEK') {
      const hace7Dias = new Date();
      hace7Dias.setDate(ahora.getDate() - 7);
      return fecha >= hace7Dias;
    }
    if (f === 'MES' || f === 'MONTH') {
      return (
        fecha.getMonth() === ahora.getMonth() &&
        fecha.getFullYear() === ahora.getFullYear()
      );
    }
    if (f === 'ANO' || f === 'AÑO' || f === 'YEAR') {
      return fecha.getFullYear() === ahora.getFullYear();
    }
    return true;
  });
}

export const FuelStatisticsModal: React.FC<FuelStatisticsModalProps> = ({
  isOpen,
  onClose,
  onBackToCategories,
  onBack,
  selectedCountry: initialCountry,
  onCountryChange,
}) => {
  if (!isOpen) return null;

  const handleExit = onBack || onClose || onBackToCategories || (() => {});

  // Active user state
  const [currentUser, setCurrentUser] = useState<any>(() => getStoredActiveUser());
  useEffect(() => {
    const unsub = subscribeToAuth((user) => setCurrentUser(user));
    return () => unsub();
  }, []);

  // Time Range Tab: 'day' | 'week' | 'month' | 'year' (Default: 'day')
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('day');

  // Country & Currency (PLN, COP, EUR, MXN)
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(() => {
    return initialCountry ||
           (localStorage.getItem('litrometrik_user_country') as SupportedCountry) ||
           (localStorage.getItem('litrometrik_jurisdiction_country') as SupportedCountry) ||
           'PL';
  });

  useEffect(() => {
    if (initialCountry && initialCountry !== selectedCountry) {
      setSelectedCountry(initialCountry);
    }
  }, [initialCountry]);
  const currencySymbol = useMemo(() => {
    if (selectedCountry === 'PL') return 'PLN';
    if (selectedCountry === 'CO') return 'COP';
    if (selectedCountry === 'US') return 'USD';
    return 'PLN';
  }, [selectedCountry]);

  // ---------------- VEHICLE & ENGINE SPECIFICATION ----------------
  const [activeCarModel, setActiveCarModel] = useState<string>(() => {
    return localStorage.getItem('litrometrik_user_vehicle_model') || 'Skoda Octavia 1.6 MPI (LPG)';
  });
  const [vehicleType, setVehicleType] = useState<string>(() => {
    return localStorage.getItem('litrometrik_user_vehicle') || 'sedan';
  });
  const [engineSize, setEngineSize] = useState<string>(() => {
    return localStorage.getItem('litrometrik_user_engine') || '1.6';
  });

  // Sync profile when opened or storage changed
  useEffect(() => {
    const syncProfile = () => {
      const c = (localStorage.getItem('litrometrik_user_country') || localStorage.getItem('litrometrik_jurisdiction_country') || 'PL') as SupportedCountry;
      const v = localStorage.getItem('litrometrik_user_vehicle') || 'sedan';
      const e = localStorage.getItem('litrometrik_user_engine') || '1.6';
      const f = (localStorage.getItem('litrometrik_user_fuel') as any);
      const normalizedF = f === 'GLP' ? 'LPG' : (f || 'LPG');
      const m = localStorage.getItem('litrometrik_user_vehicle_model') || 'Skoda Octavia 1.6 MPI (LPG)';
      const d = parseFloat(localStorage.getItem('litrometrik_distancia_real_total') || localStorage.getItem('litrometrik_en_marcha_distancia') || '0') || 0;
      setSelectedCountry(c);
      setVehicleType(v);
      setEngineSize(e);
      if (normalizedF) setGpsFuelType(normalizedF);
      if (m) setActiveCarModel(m);
      if (d !== undefined && !isNaN(d)) setDistanciaRealTotal(d);
    };

    syncProfile();
    window.addEventListener('storage', syncProfile);
    window.addEventListener('litrometrik-fuel-updated', syncProfile as any);
    return () => {
      window.removeEventListener('storage', syncProfile);
      window.removeEventListener('litrometrik-fuel-updated', syncProfile as any);
    };
  }, [isOpen]);

  // ---------------- REAL-TIME GPS TRACKING ENGINE ----------------
  const [isGpsActive, setIsGpsActive] = useState<boolean>(() => {
    try {
      const activeState = localStorage.getItem('litrometrik_active_gps_state');
      return activeState ? JSON.parse(activeState).isGpsActive === true : false;
    } catch {
      return false;
    }
  });

  const [distanciaRealTotal, setDistanciaRealTotal] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('litrometrik_distancia_real_total');
      return saved ? parseFloat(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [gpsFuelType, setGpsFuelType] = useState<'LPG' | 'Gasolina' | 'Gasolina 98' | 'Diésel' | 'GNV'>('LPG');
  const [gpsCurrentSpeed, setGpsCurrentSpeed] = useState(0);
  const [gpsElapsedSeconds, setGpsElapsedSeconds] = useState<number>(() => {
    try {
      const start = localStorage.getItem('litrometrik_en_marcha_start_time');
      if (start) {
        return Math.floor((Date.now() - parseInt(start, 10)) / 1000);
      }
      return 0;
    } catch {
      return 0;
    }
  });
  const [isVehicleStopped, setIsVehicleStopped] = useState(true);
  const [gpsMaxSpeed, setGpsMaxSpeed] = useState(0);
  const [gpsSessionNotification, setGpsSessionNotification] = useState<string | null>(null);
  
  // Real GPS Geolocation & Telemetry Refs & States
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatusText, setGpsStatusText] = useState<string>('GPS Listo');
  const [gpsError, setGpsError] = useState<string | null>(null);
  
  const watchIdRef = React.useRef<number | null>(null);
  const lastPosRef = React.useRef<{ lat: number; lng: number; time: number } | null>(null);
  const lastMovementTimeRef = React.useRef<number>(Date.now());
  const startTimeRef = React.useRef<number>(Date.now());

  // High-precision geodesic distance calculation (Haversine formula in km)
  const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Price Per Liter for selected fuel and country
  const defaultFuelPricePerLiter = useMemo(() => {
    const isLpg = gpsFuelType === 'LPG' || (gpsFuelType as string) === 'GLP';
    if (selectedCountry === 'PL') {
      return isLpg ? 2.89 : gpsFuelType === 'Diésel' ? 6.15 : gpsFuelType === 'Gasolina 98' ? 6.95 : 6.45;
    } else if (selectedCountry === 'CO') {
      return isLpg ? 2400 : gpsFuelType === 'GNV' ? 2400 : gpsFuelType === 'Diésel' ? 4350 : 4200;
    } else {
      // Estados Unidos (US)
      return isLpg ? 0.95 : gpsFuelType === 'Diésel' ? 1.05 : 0.92;
    }
  }, [selectedCountry, gpsFuelType]);

  const [customFuelPrices, setCustomFuelPrices] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('litrometrik_custom_fuel_prices');
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return {
      LPG: 2.89,
      GLP: 2.89,
      Gasolina: 6.45,
      'Gasolina 95': 6.45,
      'Gasolina 98': 6.95,
      Diésel: 6.15,
      GNV: 3.50,
    };
  });

  const [isInlinePriceEditing, setIsInlinePriceEditing] = useState<boolean>(false);
  const [inlinePriceInput, setInlinePriceInput] = useState<string>('');

  const fuelPricePerLiter = useMemo(() => {
    if (customFuelPrices[gpsFuelType] !== undefined) {
      return customFuelPrices[gpsFuelType];
    }
    return defaultFuelPricePerLiter;
  }, [customFuelPrices, gpsFuelType, defaultFuelPricePerLiter]);

  const handleSaveInlinePrice = () => {
    const parsed = parseFloat(inlinePriceInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const updated = { ...customFuelPrices, [gpsFuelType]: parsed };
      setCustomFuelPrices(updated);
      try {
        localStorage.setItem('litrometrik_custom_fuel_prices', JSON.stringify(updated));
        localStorage.setItem('fuel_price_per_liter', parsed.toString());
        window.dispatchEvent(new Event('fuel-storage-updated'));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('litrometrik-fuel-updated', { detail: { price: parsed, fuelType: gpsFuelType } }));
      } catch (_) {}
      setGpsSessionNotification(`⛽ Precio de ${gpsFuelType} fijado a ${parsed.toFixed(2)} ${currencySymbol}/L`);
      setTimeout(() => setGpsSessionNotification(null), 3000);
    }
    setIsInlinePriceEditing(false);
  };

  const handleSelectFuel = (fuel: 'LPG' | 'Gasolina' | 'Diésel') => {
    setGpsFuelType(fuel);
    const isLpg = fuel === 'LPG';
    const price = customFuelPrices[fuel] || (selectedCountry === 'CO' ? (isLpg ? 2400 : fuel === 'Diésel' ? 4350 : 4200) : selectedCountry === 'US' ? (isLpg ? 0.95 : fuel === 'Diésel' ? 1.05 : 0.92) : (isLpg ? 2.89 : fuel === 'Diésel' ? 6.15 : 6.45));
    try {
      localStorage.setItem('litrometrik_active_fuel_type', fuel);
      localStorage.setItem('fuel_active_type', fuel);
      localStorage.setItem('litrometrik_user_fuel', fuel);
      localStorage.setItem('fuel_price_per_liter', price.toString());
      window.dispatchEvent(new Event('fuel-storage-updated'));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('litrometrik-fuel-updated', { detail: { fuelType: fuel, price } }));
    } catch (_) {}
  };

  // ---------------- GESTIÓN DE SALDO DE COMBUSTIBLE Y SINCRONIZACIÓN BIDIRECCIONAL ----------------
  const [fuelBalancePLN, setFuelBalancePLN] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('litrometrik_fuel_balance_pln') || localStorage.getItem('fuel_balance_pln') || localStorage.getItem('currentFuelBalancePLN');
      if (stored !== null) {
        const val = parseFloat(stored);
        if (!isNaN(val)) return val;
      }
    } catch (_) {}
    return selectedCountry === 'CO' ? 100000 : selectedCountry === 'US' ? 40 : 100;
  });

  // Modal 1: Registrar Tanqueo (Monto pagado + Precio/Litro -> Litros recargados)
  const [showRegisterRefuelModal, setShowRegisterRefuelModal] = useState<boolean>(false);
  const [refuelPaidAmount, setRefuelPaidAmount] = useState<string>('');
  const [refuelStationPrice, setRefuelStationPrice] = useState<string>('');

  // Modal 2: Ajustar Nivel (Manual volume correction)
  const [showAdjustLevelModal, setShowAdjustLevelModal] = useState<boolean>(false);
  const [adjustLitersInput, setAdjustLitersInput] = useState<string>('');
  const [adjustBalanceInput, setAdjustBalanceInput] = useState<string>('');

  const [activeTelemetryModal, setActiveTelemetryModal] = useState<{
    title: string;
    subtitle: string;
    description: string;
    iconType: 'speed' | 'distance' | 'liters' | 'cost';
  } | null>(null);

  // Escuchar eventos de almacenamiento y custom events de combustible en vivo
  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem('litrometrik_fuel_balance_pln') || localStorage.getItem('fuel_balance_pln') || localStorage.getItem('currentFuelBalancePLN');
        if (stored !== null) {
          const val = parseFloat(stored);
          if (!isNaN(val)) setFuelBalancePLN(val);
        }
        const storedDist = localStorage.getItem('litrometrik_distancia_real_total') || localStorage.getItem('litrometrik_en_marcha_distancia');
        if (storedDist !== null) {
          const val = parseFloat(storedDist);
          if (!isNaN(val)) setDistanciaRealTotal(val);
        }
        const storedFuelType = localStorage.getItem('litrometrik_active_fuel_type') || localStorage.getItem('fuel_active_type');
        const normalizedFuel = storedFuelType === 'GLP' ? 'LPG' : storedFuelType;
        if (normalizedFuel && (normalizedFuel === 'LPG' || normalizedFuel === 'Gasolina' || normalizedFuel === 'Diésel')) {
          setGpsFuelType(normalizedFuel as any);
        }
        const storedPrice = localStorage.getItem('fuel_price_per_liter');
        if (storedPrice !== null) {
          const parsed = parseFloat(storedPrice);
          if (!isNaN(parsed) && parsed > 0) {
            setCustomFuelPrices(prev => ({ ...prev, [normalizedFuel || 'LPG']: parsed }));
          }
        }
        const storedCustomPrices = localStorage.getItem('litrometrik_custom_fuel_prices');
        if (storedCustomPrices) {
          setCustomFuelPrices(JSON.parse(storedCustomPrices));
        }
      } catch (_) {}
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('fuel-storage-updated', handleSync);
    window.addEventListener('litrometrik-fuel-updated', handleSync as any);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('fuel-storage-updated', handleSync);
      window.removeEventListener('litrometrik-fuel-updated', handleSync as any);
    };
  }, []);

  // Base Consumption Engine
  const engineBaseCons = useMemo(() => {
    const disp = parseFloat(engineSize) || 1.6;
    let base = 5.5 + (disp - 1.0) * 2.2;
    if (vehicleType === 'suv') base += 1.2;
    else if (vehicleType === 'compact') base -= 0.6;

    const isLpg = gpsFuelType === 'LPG' || (gpsFuelType as string) === 'GLP';
    let fuelFactor = 1.0;
    if (isLpg) fuelFactor = 1.20;
    else if (gpsFuelType === 'Diésel') fuelFactor = 0.85;
    else if (gpsFuelType === 'Gasolina 98') fuelFactor = 0.97;

    return {
      rateL100: base * fuelFactor,
      idleLPerHour: Math.max(0.5, disp * 0.55 * (isLpg ? 1.2 : 1.0)),
    };
  }, [engineSize, vehicleType, gpsFuelType]);

  // Live Liters and Cost Calculation directly dependent on distanciaRealTotal:
  const consumoEnVivo = useMemo(() => {
    const isLpg = gpsFuelType === 'LPG' || (gpsFuelType as string) === 'GLP';
    const rate = isLpg ? 8.18 : (engineBaseCons.rateL100 || 8.18);
    const movingLiters = (distanciaRealTotal * rate) / 100;
    const idleHours = isVehicleStopped ? gpsElapsedSeconds / 3600 : 0;
    const idleLiters = idleHours * engineBaseCons.idleLPerHour;
    return Math.max(0, movingLiters + idleLiters);
  }, [distanciaRealTotal, gpsFuelType, engineBaseCons, isVehicleStopped, gpsElapsedSeconds]);

  const liveCost = useMemo(() => {
    return consumoEnVivo * fuelPricePerLiter;
  }, [consumoEnVivo, fuelPricePerLiter]);

  const remainingFuelBalance = Math.max(0, fuelBalancePLN - liveCost);
  const remainingLiters = fuelPricePerLiter > 0 ? (remainingFuelBalance / fuelPricePerLiter) : 0;
  const isCriticalReserve = remainingFuelBalance < 30.0;

  const handleRechargeFuel = (amount: number, stationPrice?: number) => {
    const activePrice = (stationPrice && stationPrice > 0) ? stationPrice : fuelPricePerLiter;
    const newBalance = Math.round(((remainingFuelBalance || 0) + amount) * 100) / 100;
    setFuelBalancePLN(newBalance);

    const defaultStation = selectedCountry === 'PL' ? 'Orlen' :
                           selectedCountry === 'CO' ? 'Terpel' : 'Chevron';
    const now = new Date();
    const calculatedLiters = activePrice > 0 ? Math.round((amount / activePrice) * 100) / 100 : 0;

    try {
      localStorage.setItem('litrometrik_fuel_balance_pln', newBalance.toString());
      localStorage.setItem('fuel_balance_pln', newBalance.toString());
      localStorage.setItem('currentFuelBalancePLN', newBalance.toString());

      if (stationPrice && stationPrice > 0) {
        localStorage.setItem('fuel_price_per_liter', stationPrice.toString());
        try {
          const storedPrices = localStorage.getItem('litrometrik_custom_fuel_prices');
          const pricesMap = storedPrices ? JSON.parse(storedPrices) : {};
          pricesMap[gpsFuelType] = stationPrice;
          localStorage.setItem('litrometrik_custom_fuel_prices', JSON.stringify(pricesMap));
        } catch (_) {}
      }

      // 1. Entrada en log de recargas
      const chargeEntry = {
        id: `charge_${Date.now()}`,
        date: now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        amountPLN: amount,
        fuelType: gpsFuelType,
        litersEquivalent: calculatedLiters,
        pricePerLiter: activePrice,
        note: `Recarga en Modo En Marcha (${defaultStation})`
      };
      const savedCharges = JSON.parse(localStorage.getItem('litrometrik_fuel_charges_log') || '[]');
      localStorage.setItem('litrometrik_fuel_charges_log', JSON.stringify([chargeEntry, ...savedCharges]));

      // 2. SINCRONIZACIÓN BIDIRECCIONAL: Entrada automática en "Bitácora de Repostaje"
      const uid = currentUser ? currentUser.uid : 'guest';
      const repostajesKey = `litrometrik_${uid}_repostajes`;
      const existingRefuels = JSON.parse(localStorage.getItem(repostajesKey) || '[]');
      const lastOdo = existingRefuels.length > 0 && Number(existingRefuels[0].odometer) > 0
        ? Number(existingRefuels[0].odometer) + Math.max(1, Math.round(distanciaRealTotal || 15))
        : 145500 + Math.round(distanciaRealTotal || 0);

      const refuelRecord = {
        id: `rec_refuel_${Date.now()}`,
        createdAt: now.toISOString(),
        categoria: 'bitacora',
        userId: uid,
        pais: selectedCountry,
        moneda: currencySymbol,
        odometer: lastOdo,
        cost: amount,
        title: `Repostaje ${defaultStation} (${gpsFuelType})`,
        notes: `Registrado automáticamente desde Modo En Marcha`,
        station: defaultStation,
        fuelType: gpsFuelType,
        liters: calculatedLiters,
        pricePerLiter: activePrice,
        kmSinceLastRefuel: Math.round(distanciaRealTotal || 350),
        consumptionL100: parseFloat(avgConsumptionL100) || 0,
        refuelDate: now.toISOString().split('T')[0],
      };
      existingRefuels.unshift(refuelRecord);
      localStorage.setItem(repostajesKey, JSON.stringify(existingRefuels));

      window.dispatchEvent(new Event('fuel-storage-updated'));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('litrometrik-records-updated'));
      window.dispatchEvent(new CustomEvent('litrometrik-fuel-updated', {
        detail: {
          balance: newBalance,
          charge: chargeEntry,
          refuelRecord,
          fuelType: gpsFuelType,
          price: activePrice
        }
      }));
    } catch (_) {}

    setGpsSessionNotification(`⛽ ¡Tanque recargado con +${amount} ${currencySymbol}! (~${calculatedLiters} L) Sincronizado con Bitácora`);
    setTimeout(() => setGpsSessionNotification(null), 3500);
  };

  const handleUpdateFuelBalanceDirect = (newBalance: number) => {
    const clamped = Math.max(0, Math.round(newBalance * 100) / 100);
    setFuelBalancePLN(clamped);
    try {
      localStorage.setItem('litrometrik_fuel_balance_pln', clamped.toString());
      localStorage.setItem('fuel_balance_pln', clamped.toString());
      localStorage.setItem('currentFuelBalancePLN', clamped.toString());
      window.dispatchEvent(new Event('fuel-storage-updated'));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('litrometrik-fuel-updated', { detail: { balance: clamped, fuelType: gpsFuelType, price: fuelPricePerLiter } }));
    } catch (_) {}
    setGpsSessionNotification(`⛽ Saldo fijado a ${clamped.toFixed(2)} ${currencySymbol}`);
    setTimeout(() => setGpsSessionNotification(null), 3000);
  };

  // Real-time GPS Geolocation Telemetry Engine
  useEffect(() => {
    if (!isGpsActive) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastPosRef.current = null;
      setGpsCurrentSpeed(0);
      setIsVehicleStopped(true);
      setGpsStatusText('Pausado');
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('La geolocalización GPS no está disponible en este dispositivo/navegador');
      setGpsStatusText('Sin soporte GPS');
      return;
    }

    setGpsError(null);
    setGpsStatusText('🛰️ Buscando señal GPS en vivo...');

    const storedStart = localStorage.getItem('litrometrik_en_marcha_start_time');
    if (!storedStart) {
      localStorage.setItem('litrometrik_en_marcha_start_time', String(Date.now()));
      startTimeRef.current = Date.now();
    } else {
      startTimeRef.current = parseInt(storedStart, 10);
    }

    // 1-second elapsed timer, calculation & persistence
    const timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setGpsElapsedSeconds(elapsed);

      // Save live session state to localStorage
      try {
        localStorage.setItem('litrometrik_en_marcha_elapsed', String(elapsed));
      } catch {}

      // Watchdog: If no physical movement update has arrived in 3.5s, drop speed to 0 and set stopped
      const timeSinceMove = Date.now() - lastMovementTimeRef.current;
      if (timeSinceMove > 3500) {
        setGpsCurrentSpeed(0);
        setIsVehicleStopped(true);
      }
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const accuracy = pos.coords.accuracy || 0;
        setGpsAccuracy(Math.round(accuracy));

        // Ignore poor accuracy readings (> 80m) to prevent fake GPS jumps
        if (accuracy > 80) {
          setGpsStatusText(`Señal GPS débil (±${Math.round(accuracy)}m)`);
          return;
        }

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const now = Date.now();

        let calculatedSpeedKmh = 0;

        if (lastPosRef.current) {
          const timeDeltaSec = (now - lastPosRef.current.time) / 1000;
          if (timeDeltaSec >= 0.25 && timeDeltaSec <= 30) {
            const deltaDistKm = calculateDistanceKm(lastPosRef.current.lat, lastPosRef.current.lng, lat, lng);
            const distMeters = deltaDistKm * 1000;

            // Strict distance accumulation: only sum if distance > 3 meters and < 80 meters to avoid jumps
            if (distMeters > 3 && distMeters < 80) {
              const speedFromDist = (deltaDistKm / (timeDeltaSec / 3600));
              if (speedFromDist < 260) {
                calculatedSpeedKmh = speedFromDist;
                setDistanciaRealTotal((prev) => {
                  const updated = prev + deltaDistKm;
                  try {
                    localStorage.setItem('litrometrik_distancia_real_total', updated.toString());
                  } catch {}
                  return updated;
                });
              }
            }
          }
        }

        // Speed calculation priority:
        let instantSpeedKmh = 0;
        if (typeof pos.coords.speed === 'number' && !isNaN(pos.coords.speed) && pos.coords.speed > 0) {
          instantSpeedKmh = pos.coords.speed * 3.6;
        } else if (calculatedSpeedKmh > 0) {
          instantSpeedKmh = calculatedSpeedKmh;
        }

        // Filter out stationary noise / walking jitter (< 2.2 km/h)
        if (instantSpeedKmh < 2.2) {
          instantSpeedKmh = 0;
          setIsVehicleStopped(true);
          setGpsStatusText(`🛑 Vehículo Detenido (±${Math.round(accuracy)}m)`);
        } else {
          setIsVehicleStopped(false);
          lastMovementTimeRef.current = now;
          setGpsStatusText(`🟢 En Marcha (±${Math.round(accuracy)}m)`);
        }

        // Smooth speed transition with Exponential Moving Average
        setGpsCurrentSpeed((prev) => {
          if (instantSpeedKmh === 0) return 0;
          const smoothed = prev === 0 ? instantSpeedKmh : prev * 0.3 + instantSpeedKmh * 0.7;
          return Math.round(smoothed);
        });

        if (instantSpeedKmh > 0) {
          setGpsMaxSpeed((prev) => Math.max(prev, Math.round(instantSpeedKmh)));
        }

        lastPosRef.current = { lat, lng, time: now };
      },
      (err) => {
        console.warn('GPS Telemetry error:', err);
        setGpsError('Acceso GPS no autorizado o sin señal. Por favor activa la ubicación.');
        setGpsStatusText('Sin señal GPS');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
    );

    return () => {
      clearInterval(timerInterval);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isGpsActive]);

  const toggleGpsSwitch = () => {
    const next = !isGpsActive;
    setIsGpsActive(next);
    try {
      localStorage.setItem('litrometrik_active_gps_state', JSON.stringify({ isGpsActive: next }));
      if (next && !localStorage.getItem('litrometrik_en_marcha_start_time')) {
        localStorage.setItem('litrometrik_en_marcha_start_time', String(Date.now()));
        startTimeRef.current = Date.now();
      }
    } catch {}
    if (next) {
      setGpsSessionNotification('🛰️ Seguimiento GPS en marcha iniciado');
    } else {
      setGpsSessionNotification('🛑 Seguimiento GPS pausado');
    }
    setTimeout(() => setGpsSessionNotification(null), 3000);
  };

  const handleResetMode = () => {
    setDistanciaRealTotal(0);
    setGpsElapsedSeconds(0);
    setGpsCurrentSpeed(0);
    setGpsMaxSpeed(0);
    setIsVehicleStopped(true);
    lastPosRef.current = null;
    startTimeRef.current = Date.now();
    try {
      localStorage.setItem('litrometrik_distancia_real_total', '0');
      localStorage.setItem('litrometrik_en_marcha_start_time', String(Date.now()));
      localStorage.removeItem('litrometrik_en_marcha_elapsed');
    } catch {}
    setGpsSessionNotification('🔄 Modo En Marcha restablecido a cero');
    setTimeout(() => setGpsSessionNotification(null), 3000);
  };

  // Stored Trips from 'historial_viajes' (starts clean empty [] for new users)
  const [historialViajes, setHistorialViajes] = useState<ViajeHistorico[]>(() => {
    try {
      const stored = localStorage.getItem('historial_viajes');
      if (stored) {
        return JSON.parse(stored);
      }
      // Migration from previous key if needed
      const uid = currentUser ? currentUser.uid : 'guest';
      const prevStored = localStorage.getItem(`litrometrik_${uid}_gps_sessions`);
      if (prevStored) {
        const parsed = JSON.parse(prevStored);
        const mapped: ViajeHistorico[] = parsed.map((s: any) => ({
          id: typeof s.id === 'number' ? s.id : (typeof s.timestamp === 'number' ? s.timestamp : Date.now()),
          timestamp: typeof s.timestamp === 'number' ? new Date(s.timestamp).toISOString() : (s.timestamp || new Date().toISOString()),
          km: s.distanceKm ?? s.km ?? 0,
          litros: s.litersConsumed ?? s.litros ?? 0,
          costo: s.cost ?? s.costo ?? 0,
          combustible: s.fuelType === 'GLP' ? 'LPG' : (s.fuelType || s.combustible || 'LPG'),
          precioLitro: s.pricePerLiter || s.precioLitro || 2.89,
          durationSeconds: s.durationSeconds || 0,
          avgSpeedKmh: s.avgSpeedKmh || 0,
          date: s.date,
          dayOfWeek: s.dayOfWeek,
        }));
        localStorage.setItem('historial_viajes', JSON.stringify(mapped));
        return mapped;
      }
    } catch (e) {}
    return [];
  });

  // Escuchar actualización de viajes
  useEffect(() => {
    const syncTrips = () => {
      try {
        const stored = localStorage.getItem('historial_viajes');
        if (stored) {
          setHistorialViajes(JSON.parse(stored));
        }
      } catch (_) {}
    };
    window.addEventListener('storage', syncTrips);
    window.addEventListener('fuel-storage-updated', syncTrips);
    return () => {
      window.removeEventListener('storage', syncTrips);
      window.removeEventListener('fuel-storage-updated', syncTrips);
    };
  }, []);

  // 1. Guardar en la lista histórica, 2. Reiniciar los contadores de la sesión activa, 3. Recalcular métricas
  const handleSaveCurrentTrip = () => {
    if (distanciaRealTotal <= 0 && consumoEnVivo <= 0.001) return;

    const distanciaActual = parseFloat(distanciaRealTotal.toFixed(2));
    const litrosConsumidos = parseFloat(consumoEnVivo.toFixed(2));
    const gastoActual = parseFloat(liveCost.toFixed(2));
    const now = new Date();
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    // a) Objeto de viaje según requerimiento exacto
    const viaje: ViajeHistorico = {
      id: Date.now(),
      fecha: now.toISOString(),
      timestamp: now.toISOString(),       // Fecha y hora exacta ISO
      distanciaKm: distanciaActual,
      km: distanciaActual,                 // ej. 12.4
      litros: litrosConsumidos,            // ej. 1.05
      costoPLN: gastoActual,
      costo: gastoActual,                  // ej. 3.94
      combustible: gpsFuelType,
      precioLitro: fuelPricePerLiter,
      durationSeconds: gpsElapsedSeconds,
      avgSpeedKmh: gpsElapsedSeconds > 0 ? Math.round((distanciaActual / (gpsElapsedSeconds / 3600))) : 0,
      date: now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      dayOfWeek: days[now.getDay()],
    };

    // b) Guardarlo en un array dentro de localStorage bajo la clave 'historial_viajes'
    const historial = JSON.parse(localStorage.getItem('historial_viajes') || '[]');
    historial.unshift(viaje);
    localStorage.setItem('historial_viajes', JSON.stringify(historial));

    // Descontar del saldo restante
    const updatedBalance = Math.max(0, Math.round((fuelBalancePLN - liveCost) * 100) / 100);
    setFuelBalancePLN(updatedBalance);

    try {
      const uid = currentUser ? currentUser.uid : 'guest';
      localStorage.setItem(`litrometrik_${uid}_gps_sessions`, JSON.stringify(historial));
      localStorage.setItem('litrometrik_fuel_balance_pln', updatedBalance.toString());
      localStorage.setItem('fuel_balance_pln', updatedBalance.toString());
      localStorage.setItem('currentFuelBalancePLN', updatedBalance.toString());

      // Guardar también en el registro histórico general de viajes
      const savedTrips = JSON.parse(localStorage.getItem('fuel_trips_pln') || '[]');
      const tripEntry = {
        id: `gps_${viaje.id}`,
        date: viaje.date,
        routeName: `Viaje GPS (${viaje.km} km)`,
        vehicleType: vehicleType,
        transmission: 'manual',
        fuelType: viaje.combustible.toLowerCase(),
        routeType: 'mixto',
        distanceKm: viaje.km,
        isRoundTrip: false,
        isACActive: false,
        coldStartLpg: true,
        pricePerLiter: viaje.precioLitro,
        totalLiters: viaje.litros,
        totalCostPLN: viaje.costo,
        costPerKm: viaje.km > 0 ? viaje.costo / viaje.km : 0,
        savingsVsGasoline: 0,
      };
      localStorage.setItem('fuel_trips_pln', JSON.stringify([tripEntry, ...savedTrips]));
    } catch (_) {}

    // e) Reiniciar el tramo en vivo actual a 0 manteniendo el saldo restante descontado
    handleResetMode();

    // c) Sumar automáticamente estos valores al bloque inferior y recalcular
    setHistorialViajes(historial);
    window.dispatchEvent(new Event('fuel-storage-updated'));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('litrometrik-fuel-updated', { detail: { balance: updatedBalance, viaje } }));

    // d) Notificar al usuario con un toast/alerta elegante
    setGpsSessionNotification(`✅ Viaje guardado exitosamente (${viaje.km.toFixed(2)} km • ${viaje.litros.toFixed(2)} L • ${viaje.costo.toFixed(2)} ${currencySymbol})`);
    setTimeout(() => setGpsSessionNotification(null), 3500);
  };

  // Viajes filtrados según el período activo (Día, Semana, Mes, Año)
  const viajesFiltrados = useMemo(() => {
    const ahora = new Date();
    return historialViajes.filter(viaje => {
      if (!viaje || !viaje.timestamp) return false;
      const fecha = new Date(viaje.timestamp);
      if (isNaN(fecha.getTime())) return false;

      if (timeRange === 'day') {
        return fecha.toDateString() === ahora.toDateString();
      }
      if (timeRange === 'week') {
        const hace7Dias = new Date();
        hace7Dias.setDate(ahora.getDate() - 7);
        return fecha >= hace7Dias;
      }
      if (timeRange === 'month') {
        return (
          fecha.getMonth() === ahora.getMonth() &&
          fecha.getFullYear() === ahora.getFullYear()
        );
      }
      if (timeRange === 'year') {
        return fecha.getFullYear() === ahora.getFullYear();
      }
      return true;
    });
  }, [historialViajes, timeRange]);

  // KPIs dinámicos calculados sobre el período filtrado
  const totalLiters = useMemo(() => {
    return viajesFiltrados.reduce((acc, s) => acc + (s.litros || 0), 0);
  }, [viajesFiltrados]);

  const totalCost = useMemo(() => {
    return viajesFiltrados.reduce((acc, s) => acc + (s.costo || 0), 0);
  }, [viajesFiltrados]);

  const totalKm = useMemo(() => {
    return Math.round(viajesFiltrados.reduce((acc, s) => acc + (s.km || 0), 0) * 10) / 10;
  }, [viajesFiltrados]);

  const avgConsumptionL100 = useMemo(() => {
    if (totalKm > 0 && totalLiters > 0) {
      return ((totalLiters / totalKm) * 100).toFixed(2);
    }
    return engineBaseCons.rateL100.toFixed(2);
  }, [totalKm, totalLiters, engineBaseCons]);

  const peakDay = useMemo(() => {
    if (viajesFiltrados.length === 0) return 'Sin datos';
    const dayCounts: Record<string, number> = {};
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    viajesFiltrados.forEach((s) => {
      const d = new Date(s.timestamp);
      const dayName = s.dayOfWeek || days[d.getDay()] || 'Viernes';
      dayCounts[dayName] = (dayCounts[dayName] || 0) + (s.litros || 0);
    });
    let maxDay = 'Viernes';
    let maxVal = 0;
    Object.entries(dayCounts).forEach(([day, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxDay = day;
      }
    });
    return maxDay;
  }, [viajesFiltrados]);

  // Dynamic Table Title and Period Label based on active filter
  const tablaTitulo = useMemo(() => {
    const count = viajesFiltrados.length;
    if (timeRange === 'day') return `Historial de Viajes (${count} hoy)`;
    if (timeRange === 'week') return `Historial de Viajes (${count} esta semana)`;
    if (timeRange === 'month') return `Historial de Viajes (${count} este mes)`;
    return `Historial de Viajes (${count} este año)`;
  }, [timeRange, viajesFiltrados.length]);

  const emptyPeriodoMessage = useMemo(() => {
    if (timeRange === 'day') return 'Aún no hay viajes registrados hoy';
    if (timeRange === 'week') return 'Aún no hay viajes registrados esta semana';
    if (timeRange === 'month') return 'Aún no hay viajes registrados este mes';
    return 'Aún no hay viajes registrados este año';
  }, [timeRange]);

  const periodoLabel = useMemo(() => {
    if (timeRange === 'day') return 'hoy';
    if (timeRange === 'week') return 'esta semana';
    if (timeRange === 'month') return 'este mes';
    return 'este año';
  }, [timeRange]);

  // Dynamic Bar Chart Data computed specifically per selected period (DIA, SEMANA, MES, AÑO)
  const barChartData = useMemo(() => {
    const ahora = new Date();

    if (timeRange === 'day') {
      const todayTrips = historialViajes.filter(v => {
        if (!v || !v.timestamp) return false;
        const d = new Date(v.timestamp);
        return !isNaN(d.getTime()) && d.toDateString() === ahora.toDateString();
      });

      if (todayTrips.length > 0) {
        const sorted = [...todayTrips].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        return sorted.map((v, idx) => {
          const d = new Date(v.timestamp);
          const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
          return {
            label: `${timeStr} (#${idx + 1})`,
            shortLabel: timeStr,
            liters: Math.round((v.litros || 0) * 100) / 100,
            cost: Math.round((v.costo || 0) * 100) / 100,
            km: Math.round((v.km || 0) * 10) / 10,
          };
        });
      } else {
        const slots = ['00-06h', '06-10h', '10-14h', '14-18h', '18-22h', '22-24h'];
        return slots.map(slot => ({
          label: slot,
          shortLabel: slot,
          liters: 0,
          cost: 0,
          km: 0,
        }));
      }
    }

    if (timeRange === 'week') {
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(ahora.getDate() - i);
        const dayKey = d.toDateString();
        const dayLabel = `${dayNames[d.getDay()]} ${d.getDate()}`;

        const dayTrips = historialViajes.filter(v => {
          if (!v || !v.timestamp) return false;
          const vt = new Date(v.timestamp);
          return !isNaN(vt.getTime()) && vt.toDateString() === dayKey;
        });

        const liters = dayTrips.reduce((acc, s) => acc + (s.litros || 0), 0);
        const cost = dayTrips.reduce((acc, s) => acc + (s.costo || 0), 0);
        const km = dayTrips.reduce((acc, s) => acc + (s.km || 0), 0);

        result.push({
          label: dayLabel,
          shortLabel: dayNames[d.getDay()],
          liters: Math.round(liters * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          km: Math.round(km * 10) / 10,
        });
      }
      return result;
    }

    if (timeRange === 'month') {
      const currentMonth = ahora.getMonth();
      const currentYear = ahora.getFullYear();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

      const result = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dayTrips = historialViajes.filter(v => {
          if (!v || !v.timestamp) return false;
          const vt = new Date(v.timestamp);
          return !isNaN(vt.getTime()) && vt.getFullYear() === currentYear && vt.getMonth() === currentMonth && vt.getDate() === day;
        });

        const liters = dayTrips.reduce((acc, s) => acc + (s.litros || 0), 0);
        const cost = dayTrips.reduce((acc, s) => acc + (s.costo || 0), 0);
        const km = dayTrips.reduce((acc, s) => acc + (s.km || 0), 0);

        result.push({
          label: `Día ${day}`,
          shortLabel: `${day}`,
          liters: Math.round(liters * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          km: Math.round(km * 10) / 10,
        });
      }
      return result;
    }

    // timeRange === 'year'
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentYear = ahora.getFullYear();
    return months.map((m, idx) => {
      const monthTrips = historialViajes.filter(v => {
        if (!v || !v.timestamp) return false;
        const vt = new Date(v.timestamp);
        return !isNaN(vt.getTime()) && vt.getFullYear() === currentYear && vt.getMonth() === idx;
      });

      const liters = monthTrips.reduce((acc, s) => acc + (s.litros || 0), 0);
      const cost = monthTrips.reduce((acc, s) => acc + (s.costo || 0), 0);
      const km = monthTrips.reduce((acc, s) => acc + (s.km || 0), 0);

      return {
        label: m,
        shortLabel: m,
        liters: Math.round(liters * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        km: Math.round(km * 10) / 10,
      };
    });
  }, [historialViajes, timeRange]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 w-full relative pb-24 selection:bg-blue-500 selection:text-white">
      
      {/* ---------------- 1. CLEAN TOP HEADER WITH VOLVER BUTTON (DARK SLATE) ---------------- */}
      <header
        style={{
          background: 'rgba(15, 23, 42, 0.96)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(51, 65, 85, 0.8)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        }}
        className="sticky top-0 z-40 px-4 sm:px-6 pb-3 text-white"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={handleExit}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-[#1E293B] hover:bg-[#334155] text-white font-black text-xs transition border border-slate-700 shadow-sm button-hover-pro cursor-pointer shrink-0 active:scale-95"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#00D4FF]" />
              <span>Volver</span>
            </button>

            <div className="truncate">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center space-x-2 truncate">
                <span className="truncate">Estadísticas de Combustible</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-semibold truncate hidden sm:block">
                Evolución de consumo, gasto en vivo y telemetría GPS
              </p>
            </div>
          </div>

        </div>
      </header>

      {/* ---------------- 2. MAIN WORKSPACE CONTAINER ---------------- */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* ---------------- A. REAL-TIME GPS TRACKER CARD (PANEL DE TELEMETRÍA Y COMBUSTIBLE EN MARCHA) ---------------- */}
        <div
          style={{
            background: '#1E293B',
            border: '1px solid rgba(51, 65, 85, 0.7)',
            borderRadius: '20px',
            padding: '20px',
          }}
          className="shadow-xl relative overflow-hidden space-y-4"
        >
          {/* 1. Cabecera, Selector de Combustible y Switch Principal */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shrink-0 ${
                isGpsActive ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50' : 'bg-blue-500/20 text-[#00D4FF] border border-cyan-400/30'
              }`}>
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Modo En Marcha (Seguimiento GPS)
                  </h2>
                  {isGpsActive ? (
                    <span className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                      isVehicleStopped
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${isVehicleStopped ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'}`} />
                      <span>{gpsStatusText}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      PAUSADO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Telemetría GPS en tiempo real • Medición de velocidad, distancia y descuento de tanque en vivo.
                </p>
              </div>
            </div>

            {/* Selector de Combustible (LPG, Gasolina 95, Diésel) y Toggle Switch */}
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
              {/* Selector interactivo de combustible */}
              <div className="inline-flex p-1 bg-[#0F172A] rounded-xl border border-slate-700 shadow-inner">
                {(['LPG', 'Gasolina', 'Diésel'] as const).map((fuel) => {
                  const isSelected = gpsFuelType === fuel;
                  const label = fuel === 'Gasolina' ? 'Gasolina 95' : fuel;
                  return (
                    <button
                      key={`fuel-tab-${fuel}`}
                      type="button"
                      disabled={isGpsActive}
                      onClick={() => handleSelectFuel(fuel)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer active:scale-95 disabled:opacity-75 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-500'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Precio editable con lápiz */}
              <div className="relative flex items-center">
                {isInlinePriceEditing ? (
                  <div className="flex items-center space-x-1 p-1 bg-[#0F172A] rounded-xl border border-blue-500/50 animate-fadeIn">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={inlinePriceInput}
                      onChange={(e) => setInlinePriceInput(e.target.value)}
                      placeholder="2.89"
                      className="w-20 px-2 py-1 rounded-lg bg-[#162032] border border-blue-400 font-sans text-xs font-bold text-white focus:outline-none text-right"
                      autoFocus
                    />
                    <span className="text-[10px] font-bold text-[#00D4FF] pr-1">{currencySymbol}/L</span>
                    <button
                      type="button"
                      onClick={handleSaveInlinePrice}
                      className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition active:scale-95 cursor-pointer"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInlinePriceEditing(false)}
                      className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setInlinePriceInput(fuelPricePerLiter.toFixed(2));
                      setIsInlinePriceEditing(true);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition active:scale-95 cursor-pointer shadow-sm text-xs font-black"
                    title="Toca para editar precio por litro"
                  >
                    <span>⛽ {fuelPricePerLiter.toFixed(2)} {currencySymbol}/L</span>
                    <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                )}
              </div>

              {/* Switch Principal: Iniciar Marcha / Pausar */}
              <button
                type="button"
                onClick={toggleGpsSwitch}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-black text-xs transition active:scale-95 cursor-pointer shadow-md ${
                  isGpsActive
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 ring-2 ring-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isGpsActive ? 'bg-white animate-ping' : 'bg-slate-400'}`} />
                <span>{isGpsActive ? 'Pausar Marcha' : 'Iniciar Marcha'}</span>
              </button>
            </div>
          </div>

          {/* GPS Error Alert if permission denied */}
          {gpsError && (
            <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* 2. Rejilla Principal de Telemetría GPS en Vivo (Dark Slate) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Bloque 1: Velocidad GPS */}
            <div
              onClick={() => setActiveTelemetryModal({
                title: 'VELOCIDAD GPS',
                subtitle: 'Telemetría Satelital',
                description: 'Velocidad actual calculada mediante geolocalización satelital y velocidad máxima alcanzada en este tramo.',
                iconType: 'speed',
              })}
              className="p-4 rounded-2xl bg-[#0F172A] hover:bg-slate-800/80 border border-slate-700/80 hover:border-blue-400 transition-all shadow-sm cursor-pointer active:scale-95 group relative"
              title="Toca para más información sobre Velocidad GPS"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-400 uppercase tracking-wider block transition-colors">Velocidad GPS</span>
                <Gauge className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white group-hover:text-cyan-300 mt-1.5 tracking-tight transition-colors">
                {gpsCurrentSpeed} <span className="text-xs text-slate-400 font-medium">km/h</span>
              </div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1 flex items-center justify-between">
                <span>Máx: {gpsMaxSpeed} km/h</span>
                <span className="text-[10px] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">ℹ️ Info</span>
              </div>
            </div>

            {/* Bloque 2: Distancia Recorrida */}
            <div
              onClick={() => setActiveTelemetryModal({
                title: 'DISTANCIA RECORRIDA',
                subtitle: 'Odómetro Satelital',
                description: 'Kilómetros acumulados en este trayecto y total de combustible estimado consumido por desplazamiento.',
                iconType: 'distance',
              })}
              className="p-4 rounded-2xl bg-[#0F172A] hover:bg-slate-800/80 border border-slate-700/80 hover:border-blue-400 transition-all shadow-sm cursor-pointer active:scale-95 group relative"
              title="Toca para más información sobre Distancia Recorrida"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-cyan-400 uppercase tracking-wider block transition-colors">Distancia Recorrida</span>
                <Navigation className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#00D4FF] mt-1.5 tracking-tight">
                {distanciaRealTotal.toFixed(2)}{' '}
                <span className="text-xs text-slate-400 font-medium">km</span>
              </div>
              <div className="text-[11px] text-cyan-300 font-semibold mt-1 flex items-center justify-between">
                <span>{consumoEnVivo.toFixed(2)} L consumidos</span>
                <span className="text-[10px] text-cyan-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">ℹ️ Info</span>
              </div>
            </div>

            {/* Bloque 3: Consumo en Vivo */}
            <div
              onClick={() => setActiveTelemetryModal({
                title: 'CONSUMO EN VIVO',
                subtitle: 'Litros en Tiempo Real',
                description: 'Volumen de combustible consumido (en litros) en tiempo real, combinando el movimiento por GPS y el motor en espera cuando el vehículo está detenido.',
                iconType: 'liters',
              })}
              className="p-4 rounded-2xl bg-[#0F172A] hover:bg-slate-800/80 border border-slate-700/80 hover:border-purple-400 transition-all shadow-sm cursor-pointer active:scale-95 group relative"
              title="Toca para más información sobre Consumo en Vivo"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-purple-400 uppercase tracking-wider block transition-colors">Consumo en Vivo</span>
                <Fuel className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-purple-300 mt-1.5 tracking-tight">
                {consumoEnVivo.toFixed(2)} <span className="text-xs text-slate-400 font-medium">L</span>
              </div>
              <div className="text-[11px] text-purple-300 font-semibold mt-1 flex items-center justify-between">
                <span>Tasa: {engineBaseCons.rateL100.toFixed(2)} L/100km</span>
                <span className="text-[10px] text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">ℹ️ Info</span>
              </div>
            </div>

            {/* Bloque 4: Gasto en Vivo + Tiempo */}
            <div
              onClick={() => setActiveTelemetryModal({
                title: 'GASTO EN VIVO',
                subtitle: 'Costo Financiero',
                description: 'Costo financiero en dinero (PLN) acumulado en el tramo actual según el precio por litro configurado.',
                iconType: 'cost',
              })}
              className="p-4 rounded-2xl bg-[#0F172A] hover:bg-slate-800/80 border border-slate-700/80 hover:border-emerald-400 transition-all shadow-sm cursor-pointer active:scale-95 group relative"
              title="Toca para más información sobre Gasto en Vivo"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 group-hover:text-emerald-400 uppercase tracking-wider block transition-colors">Gasto en Vivo</span>
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1.5 tracking-tight">
                {liveCost.toFixed(2)} <span className="text-xs font-medium text-slate-400">{currencySymbol}</span>
              </div>
              <div className="text-[11px] font-sans text-slate-400 font-bold mt-1 flex items-center justify-between">
                <span>⏱️ {formatTime(gpsElapsedSeconds)}</span>
                <span className="text-[10px] text-emerald-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">ℹ️ Info</span>
              </div>
            </div>
          </div>

          {/* 3. Módulo Integrado de Saldo de Tanque (Dark Slate) */}
          <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            isCriticalReserve
              ? 'bg-red-950/40 text-red-300 border-red-500/80 border-2 shadow-lg animate-pulse'
              : 'bg-[#0F172A] border-emerald-500/40 shadow-sm text-slate-200'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Información del Saldo */}
              <div className="flex items-center space-x-3.5 min-w-0">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  isCriticalReserve ? 'bg-red-600 text-white animate-bounce' : 'bg-emerald-600 text-white shadow-md'
                }`}>
                  <Fuel className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    {isCriticalReserve ? (
                      <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px] uppercase tracking-wider shadow-sm animate-pulse">
                        ⚠️ RESERVA: BUSCAR GASOLINERA
                      </span>
                    ) : (
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                        Saldo Restante en Tanque
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 font-sans font-bold text-slate-300 border border-slate-700">
                      {gpsFuelType} • {fuelPricePerLiter.toFixed(2)} {currencySymbol}/L
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-2 mt-1">
                    <span className={`text-2xl sm:text-3xl font-black font-sans tracking-tight ${isCriticalReserve ? 'text-red-400' : 'text-emerald-400'}`}>
                      {remainingFuelBalance.toFixed(2)} <span className="text-sm font-semibold">{currencySymbol}</span>
                    </span>
                    <span className={`text-xs sm:text-sm font-bold font-sans ${isCriticalReserve ? 'text-red-300' : 'text-slate-400'}`}>
                      (~{remainingLiters.toFixed(1)} L restantes)
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones Secundarios: Registrar Tanqueo, Ajustar Nivel, Reset */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRefuelPaidAmount('');
                    setRefuelStationPrice(fuelPricePerLiter.toFixed(2));
                    setShowRegisterRefuelModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition active:scale-95 cursor-pointer shadow-md shadow-emerald-600/30 flex items-center space-x-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>➕ Registrar Tanqueo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjustBalanceInput(remainingFuelBalance.toFixed(2));
                    setAdjustLitersInput(remainingLiters.toFixed(1));
                    setShowAdjustLevelModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs border border-slate-700 transition active:scale-95 cursor-pointer shadow-sm flex items-center space-x-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Ajustar Nivel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Seguro que deseas restablecer el saldo del tanque a 0?')) {
                      handleUpdateFuelBalanceDirect(0);
                    }
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 transition active:scale-95 cursor-pointer shadow-sm"
                  title="Restablecer saldo a 0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Barra de Acciones: Reiniciar Tramo & Guardar Viaje */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleResetMode}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 border border-slate-700 text-white text-xs font-bold transition flex items-center justify-center space-x-2 button-hover-pro cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Reiniciar Tramo Actual (Poner en 0)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveCurrentTrip}
              disabled={distanciaRealTotal <= 0 && consumoEnVivo <= 0.001}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-black transition flex items-center justify-center space-x-2 shadow-md shadow-blue-500/25 button-hover-pro cursor-pointer disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>
                Guardar Viaje en Historial ({distanciaRealTotal > 0 ? `${distanciaRealTotal.toFixed(2)} km` : `${consumoEnVivo.toFixed(2)} L`})
              </span>
            </button>
          </div>

          {/* Toast Notification */}
          {gpsSessionNotification && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{gpsSessionNotification}</span>
            </div>
          )}
        </div>

        {/* ---------------- B. THREE SYNCHRONIZED KPIS CARDS (DARK SLATE) ---------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            style={{
              background: '#1E293B',
              border: '1px solid rgba(51, 65, 85, 0.7)',
              borderRadius: '16px',
              padding: '16px',
            }}
            className="shadow-lg flex items-center space-x-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[#00D4FF] shrink-0">
              <Fuel className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">Consumo Acumulado</div>
              <div className="text-xl sm:text-2xl font-black text-white">{totalLiters.toFixed(2)} L</div>
              <div className="text-[10px] text-cyan-400 font-bold mt-0.5">
                {totalKm > 0 ? `Promedio: ${avgConsumptionL100} L/100km • ${totalKm} km` : '0.00 km registrados'}
              </div>
            </div>
          </div>

          <div
            style={{
              background: '#1E293B',
              border: '1px solid rgba(51, 65, 85, 0.7)',
              borderRadius: '16px',
              padding: '16px',
            }}
            className="shadow-lg flex items-center space-x-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">Gasto Total ({currencySymbol})</div>
              <div className="text-xl sm:text-2xl font-black text-[#00D4FF]">{totalCost.toFixed(2)} {currencySymbol}</div>
              <div className="text-[10px] text-emerald-400 font-bold mt-0.5">Sincronizado con viajes GPS</div>
            </div>
          </div>

          <div
            style={{
              background: '#1E293B',
              border: '1px solid rgba(51, 65, 85, 0.7)',
              borderRadius: '16px',
              padding: '16px',
            }}
            className="shadow-lg flex items-center space-x-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">Día Peak de Consumo</div>
              <div className="text-base sm:text-lg font-black text-white">{peakDay}</div>
              <div className="text-[10px] text-purple-400 font-bold mt-0.5">{viajesFiltrados.length} viajes en este período</div>
            </div>
          </div>
        </div>

        {/* ---------------- C. MAIN RECHARTS DYNAMIC BAR GRAPH WITH INTEGRATED TABS ---------------- */}
        <div
          style={{
            background: '#1E293B',
            border: '1px solid rgba(51, 65, 85, 0.7)',
            borderRadius: '16px',
            padding: '16px',
          }}
          className="shadow-xl relative overflow-hidden space-y-4"
        >
          {/* Card Header + Segmented Tabs Control */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/70 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-[#00D4FF] shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  Evolución de Consumo y Gasto en Barras
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {timeRange === 'day' && 'Viajes y actividad por hora del día de hoy'}
                  {timeRange === 'week' && 'Desglose por día de la última semana (7 días)'}
                  {timeRange === 'month' && 'Desglose por días del mes en curso'}
                  {timeRange === 'year' && 'Comparativa mensual del año en curso'}
                </p>
              </div>
            </div>

            {/* Selector de Períodos Integrado (DÍA | SEMANA | MES | AÑO) */}
            <div className="inline-flex p-1.5 bg-[#0F172A] rounded-2xl border border-slate-700 shadow-inner self-start sm:self-center gap-1">
              {[
                { key: 'day', label: 'Día' },
                { key: 'week', label: 'Semana' },
                { key: 'month', label: 'Mes' },
                { key: 'year', label: 'Año' }
              ].map((t) => {
                const isActive = timeRange === t.key;
                return (
                  <button
                    key={`chart-tab-${t.key}`}
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                        try { navigator.vibrate(12); } catch (_) {}
                      }
                      setTimeRange(t.key as any);
                    }}
                    className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-90 cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-500 scale-[1.02]'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span className="uppercase tracking-wider">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic Bar Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="shortLabel" stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} />
                <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#111827] p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1 text-white">
                          <div className="font-black text-white border-b border-slate-700 pb-1">{data.label}</div>
                          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                            <span>Gasto:</span>
                            <span className="font-sans font-black">{data.cost.toFixed(2)} {currencySymbol}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                            <span>Consumo:</span>
                            <span className="font-sans font-black">{data.liters.toFixed(2)} Litros</span>
                          </div>
                          {data.km > 0 && (
                            <div className="flex items-center space-x-2 text-slate-300 font-bold text-[11px]">
                              <span>Distancia:</span>
                              <span className="font-sans">{data.km.toFixed(1)} km</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="liters" name="Litros (L)" fill="#00D4FF" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="cost" name={`Gasto (${currencySymbol})`} fill="#A855F7" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ---------------- D. SESSIONS TABLE (DARK SLATE) ---------------- */}
        <div
          style={{
            background: '#1E293B',
            border: '1px solid rgba(51, 65, 85, 0.7)',
            borderRadius: '16px',
            padding: '16px',
          }}
          className="shadow-xl space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/70 pb-3">
            <div className="flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
              <h4 className="text-sm font-black text-white">
                {tablaTitulo}
              </h4>
            </div>
            {viajesFiltrados.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const confirmMsg = `¿Deseas eliminar los ${viajesFiltrados.length} viajes registrados en ${periodoLabel}? (Aceptar = Eliminar solo los viajes de ${periodoLabel} | Cancelar = Mantener registros)`;
                  if (window.confirm(confirmMsg)) {
                    const idsToRemove = new Set(viajesFiltrados.map((v) => v.id));
                    const remaining = historialViajes.filter((v) => !idsToRemove.has(v.id));
                    setHistorialViajes(remaining);
                    localStorage.setItem('historial_viajes', JSON.stringify(remaining));
                    const uid = currentUser ? currentUser.uid : 'guest';
                    localStorage.setItem(`litrometrik_${uid}_gps_sessions`, JSON.stringify(remaining));
                    window.dispatchEvent(new Event('fuel-storage-updated'));
                    window.dispatchEvent(new Event('storage'));
                    setGpsSessionNotification(`🗑️ Se eliminaron los viajes de ${periodoLabel}`);
                    setTimeout(() => setGpsSessionNotification(null), 3000);
                  }
                }}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold transition cursor-pointer self-start sm:self-auto"
              >
                Limpiar {periodoLabel} ({viajesFiltrados.length})
              </button>
            )}
          </div>

          {viajesFiltrados.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center text-slate-500">
                <Navigation className="w-5 h-5" />
              </div>
              <p className="font-bold text-white">{emptyPeriodoMessage}</p>
              <p className="text-[11px] text-slate-400">
                Enciende el switch "Modo En Marcha" arriba para comenzar a registrar tu recorrido.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-700/80 bg-[#121B2C] text-slate-300 font-black uppercase text-[10px]">
                    <th className="py-2.5 px-3">{timeRange === 'day' ? 'Hora' : 'Fecha'}</th>
                    <th className="py-2.5 px-3">Combustible</th>
                    <th className="py-2.5 px-3">Distancia</th>
                    <th className="py-2.5 px-3">Consumo</th>
                    <th className="py-2.5 px-3">Costo</th>
                    <th className="py-2.5 px-3">Duración</th>
                    <th className="py-2.5 px-3">Vel. Prom</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-slate-200">
                  {viajesFiltrados.map((s) => {
                    const d = new Date(s.timestamp);
                    const timeOnly = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    const formattedDate = timeRange === 'day'
                      ? `${timeOnly} hrs`
                      : (s.date || d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
                    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                    const dayLabel = s.dayOfWeek ? s.dayOfWeek.slice(0, 3) : days[d.getDay()];
                    return (
                      <tr key={s.id} className="hover:bg-slate-800/60 transition font-medium">
                        <td className="py-2.5 px-3 font-bold text-white">
                          {formattedDate} {timeRange !== 'day' && `(${dayLabel})`}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[#00D4FF] border border-blue-400/30 text-[10px] font-bold">
                            {s.combustible}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-black text-cyan-300">{(s.km || 0).toFixed(2)} km</td>
                        <td className="py-2.5 px-3 font-bold text-white">{(s.litros || 0).toFixed(2)} L</td>
                        <td className="py-2.5 px-3 font-black text-emerald-400">{(s.costo || 0).toFixed(2)} {currencySymbol}</td>
                        <td className="py-2.5 px-3 font-sans text-slate-400">{formatTime(s.durationSeconds || 0)}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{s.avgSpeedKmh || 0} km/h</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#121B2C] font-black text-white border-t-2 border-slate-700 text-xs">
                    <td className="py-2.5 px-3 text-slate-300 font-extrabold uppercase text-[10px]">
                      Subtotal {periodoLabel}:
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-400 font-bold">
                      {viajesFiltrados.length} {viajesFiltrados.length === 1 ? 'viaje' : 'viajes'}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-black">
                      {totalKm.toFixed(2)} km
                    </td>
                    <td className="py-2.5 px-3 text-white font-black">
                      {totalLiters.toFixed(2)} L
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-black">
                      {totalCost.toFixed(2)} {currencySymbol}
                    </td>
                    <td colSpan={2} className="py-2.5 px-3 text-[11px] text-slate-400 font-bold">
                      Prom: {avgConsumptionL100} L/100km
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* ---------------- MODAL 1: REGISTRAR TANQUEO (DARK SLATE) ---------------- */}
      {showRegisterRefuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#111827] rounded-2xl p-6 shadow-2xl border border-slate-700/80 space-y-5 animate-scaleUp text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-sm">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Registrar Tanqueo</h3>
                  <p className="text-xs text-slate-400 font-medium">Suma combustible al saldo de tu tanque</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterRefuelModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Inputs: Monto Pagado & Precio en Estación */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-1.5">
                  Monto Pagado ({currencySymbol})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder={`Ej. ${selectedCountry === 'CO' ? '50000' : '100'}`}
                    value={refuelPaidAmount}
                    onChange={(e) => setRefuelPaidAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f172a] border border-slate-700 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                    autoFocus
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">{currencySymbol}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-1.5">
                  Precio por Litro en Estación ({currencySymbol}/L)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={refuelStationPrice}
                    onChange={(e) => setRefuelStationPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f172a] border border-slate-700 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">{currencySymbol}/L</span>
                </div>
              </div>

              {/* Cálculo Automático de Litros Recargados */}
              {(() => {
                const paid = parseFloat(refuelPaidAmount.replace(',', '.'));
                const price = parseFloat(refuelStationPrice.replace(',', '.'));
                const valid = !isNaN(paid) && paid > 0 && !isNaN(price) && price > 0;
                const calculatedLiters = valid ? (paid / price) : 0;
                const newTotalBalance = valid ? ((remainingFuelBalance || 0) + paid) : (remainingFuelBalance || 0);
                const newTotalLiters = price > 0 ? (newTotalBalance / price) : 0;

                return (
                  <div className="p-3.5 rounded-2xl bg-[#1e293b] border border-emerald-500/30 text-xs text-slate-200 space-y-1.5">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-300">Litros a incorporar:</span>
                      <span className="font-sans text-emerald-400 font-black">+{calculatedLiters.toFixed(2)} L</span>
                    </div>
                    <div className="flex justify-between font-bold text-[11px] text-slate-400">
                      <span>Nuevo saldo estimado:</span>
                      <span className="font-sans font-black text-emerald-300">{newTotalBalance.toFixed(2)} {currencySymbol} (~{newTotalLiters.toFixed(1)} L)</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Actions */}
            <div className="flex space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowRegisterRefuelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const paid = parseFloat(refuelPaidAmount.replace(',', '.'));
                  const price = parseFloat(refuelStationPrice.replace(',', '.'));
                  if (isNaN(paid) || paid <= 0) {
                    alert('Por favor ingresa un monto válido');
                    return;
                  }
                  if (!isNaN(price) && price > 0) {
                    const updatedPrices = { ...customFuelPrices, [gpsFuelType]: price };
                    setCustomFuelPrices(updatedPrices);
                    try {
                      localStorage.setItem('litrometrik_custom_fuel_prices', JSON.stringify(updatedPrices));
                      localStorage.setItem('fuel_price_per_liter', price.toString());
                    } catch (_) {}
                  }
                  handleRechargeFuel(paid, !isNaN(price) && price > 0 ? price : fuelPricePerLiter);
                  setShowRegisterRefuelModal(false);
                  setRefuelPaidAmount('');
                }}
                disabled={!refuelPaidAmount || parseFloat(refuelPaidAmount) <= 0}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-xs transition cursor-pointer shadow-md shadow-emerald-600/25"
              >
                Guardar Tanqueo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: AJUSTAR NIVEL DE TANQUE (DARK SLATE) ---------------- */}
      {showAdjustLevelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#111827] rounded-2xl p-6 shadow-2xl border border-slate-700/80 space-y-5 animate-scaleUp text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-sm">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Ajustar Nivel del Tanque</h3>
                  <p className="text-xs text-slate-400 font-medium">Corrige manualmente el volumen real del tablero</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustLevelModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Inputs: Litros Actuales O Saldo en Moneda */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-1.5">
                  Litros Reales en Tanque (L)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Ej. 35.0"
                    value={adjustLitersInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdjustLitersInput(val);
                      const num = parseFloat(val.replace(',', '.'));
                      if (!isNaN(num) && num >= 0) {
                        setAdjustBalanceInput((num * fuelPricePerLiter).toFixed(2));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f172a] border border-slate-700 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">Litros</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-300 block mb-1.5">
                  O Saldo Equivalente ({currencySymbol})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ej. 100"
                    value={adjustBalanceInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdjustBalanceInput(val);
                      const num = parseFloat(val.replace(',', '.'));
                      if (!isNaN(num) && num >= 0 && fuelPricePerLiter > 0) {
                        setAdjustLitersInput((num / fuelPricePerLiter).toFixed(1));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0f172a] border border-slate-700 font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">{currencySymbol}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowAdjustLevelModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const bal = parseFloat(adjustBalanceInput.replace(',', '.'));
                  if (isNaN(bal) || bal < 0) {
                    alert('Por favor ingresa un valor válido');
                    return;
                  }
                  handleUpdateFuelBalanceDirect(bal);
                  setShowAdjustLevelModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition cursor-pointer shadow-md shadow-blue-600/25"
              >
                Fijar Nivel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- FLOATING MODAL: TOOLTIP / INFORMACIÓN DE MÉTRICA DE TELEMETRÍA (DARK SLATE) ---------------- */}
      {activeTelemetryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-sm bg-[#111827] rounded-2xl p-6 shadow-2xl border border-slate-700/80 space-y-4 animate-scaleUp text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${
                  activeTelemetryModal.iconType === 'speed' ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30' :
                  activeTelemetryModal.iconType === 'distance' ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' :
                  activeTelemetryModal.iconType === 'liters' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' :
                  'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {activeTelemetryModal.iconType === 'speed' && <Gauge className="w-5 h-5" />}
                  {activeTelemetryModal.iconType === 'distance' && <Navigation className="w-5 h-5" />}
                  {activeTelemetryModal.iconType === 'liters' && <Fuel className="w-5 h-5" />}
                  {activeTelemetryModal.iconType === 'cost' && <DollarSign className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white tracking-tight">{activeTelemetryModal.title}</h3>
                  <p className="text-[11px] text-slate-400 font-medium">{activeTelemetryModal.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTelemetryModal(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-700 text-xs leading-relaxed text-slate-300 font-medium">
              {activeTelemetryModal.description}
            </div>

            <button
              type="button"
              onClick={() => setActiveTelemetryModal(null)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition active:scale-95 cursor-pointer shadow-md"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
