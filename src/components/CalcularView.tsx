import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  MapPin,
  Wind,
  Repeat,
  Save,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  TrendingDown,
  Gauge,
  RefreshCw,
  Sliders,
  Flame,
  Zap,
  Map as MapIcon,
  X,
  Check,
  ChevronUp,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { CalculatorInputs, SavedTrip, CountryCode, VehicleType, TransmissionType } from '../types';
import { DATA_PAIS } from '../utils/countryData';
import { calculateDetailedTrip, getWeightedFuelPrice, formatCurrency } from '../utils/calculator';
import { saveCloudRecord } from '../utils/firestoreService';
import {
  Sedan3D,
  Suv3D,
  Compacto3D,
  Van3D,
  Pickup3D,
  Custom3D,
} from './Vehicle3DIcons';
import {
  getVehicleCatalogForCountry,
  UnifiedEngineSpec,
  UnifiedVehicleCategory,
  getActiveVehicleState,
  saveActiveVehicleState,
  formatFuelEconomy,
  getFuelDisplayName,
} from '../utils/vehicleCatalog';

interface CalcularViewProps {
  inputs: CalculatorInputs;
  onChange: (newInputs: Partial<CalculatorInputs>) => void;
  onSaveTrip: (trip: SavedTrip) => void;
  onReset: () => void;
  onOpenHistory: () => void;
  currentUser: any;
}

const renderVehicle3D = (type: string, size = 44) => {
  switch (type) {
    case 'compact':
      return <Compacto3D size={size} />;
    case 'suv':
      return <Suv3D size={size} />;
    case 'pickup':
      return <Pickup3D size={size} />;
    case 'van':
      return <Van3D size={size} />;
    case 'custom':
      return <Custom3D size={size} />;
    case 'sedan':
    default:
      return <Sedan3D size={size} />;
  }
};

export const CalcularView: React.FC<CalcularViewProps> = ({
  inputs,
  onChange,
  onSaveTrip,
  onReset,
  onOpenHistory,
  currentUser,
}) => {
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cloudSaving, setCloudSaving] = useState(false);
  const [isEngineModalOpen, setIsEngineModalOpen] = useState(false);
  const [selectedEngineForInfo, setSelectedEngineForInfo] = useState<UnifiedEngineSpec | null>(null);

  const vehicleCatalog = useMemo(
    () => getVehicleCatalogForCountry(inputs.country || 'PL'),
    [inputs.country]
  );
  const vehiclePresets = useMemo(() => Object.values(vehicleCatalog), [vehicleCatalog]);
  const activeVehiclePreset =
    vehiclePresets.find((v) => v.type === (inputs.vehicleType || 'sedan')) ||
    vehiclePresets[1] ||
    vehiclePresets[0];
  const activeVehicleState = getActiveVehicleState();

  const [modalTempVehicleType, setModalTempVehicleType] = useState<VehicleType>(
    (inputs.vehicleType as VehicleType) || 'sedan'
  );
  const [modalTempVehicleModelName, setModalTempVehicleModelName] = useState<string>(
    activeVehicleState.vehicleModelName || activeVehiclePreset.label
  );
  const [modalTempEngineName, setModalTempEngineName] = useState<string>(
    activeVehicleState.engineName || 'Motor 1.6L Estándar'
  );
  const [modalTempBaseL100, setModalTempBaseL100] = useState<number>(
    inputs.customBaseConsumption || activeVehicleState.baseL100 || 7.2
  );
  const [modalTempTransmission, setModalTempTransmission] = useState<TransmissionType>(
    inputs.transmission || 'manual'
  );

  const currentActiveEngine = useMemo(() => {
    const cat = vehicleCatalog[inputs.vehicleType || 'sedan'] || vehicleCatalog.sedan;
    if (!cat) return null;
    return (
      cat.engines.find((e) => e.nombreComun === modalTempEngineName || e.name === modalTempEngineName) ||
      cat.engines.find((e) => Math.abs(e.consumoBaseL100 - (inputs.customBaseConsumption || 7.2)) < 0.2) ||
      cat.engines[1] ||
      cat.engines[0]
    );
  }, [vehicleCatalog, inputs.vehicleType, modalTempEngineName, inputs.customBaseConsumption]);

  // Global vehicle sync listener (when updated from Modo Marcha or Garaje)
  useEffect(() => {
    const handleVehicleSync = (e: any) => {
      const v = e?.detail || getActiveVehicleState();
      if (v?.vehicleType) {
        setModalTempVehicleType(v.vehicleType);
        if (v.engineName) setModalTempEngineName(v.engineName);
        if (v.baseL100) setModalTempBaseL100(v.baseL100);
        if (v.transmission) setModalTempTransmission(v.transmission);
        if (v.vehicleModelName) setModalTempVehicleModelName(v.vehicleModelName);
        onChange({
          vehicleType: v.vehicleType,
          customBaseConsumption: v.baseL100,
          transmission: v.transmission,
        });
      }
    };
    window.addEventListener('litrometrik-vehicle-updated', handleVehicleSync);
    window.addEventListener('storage', handleVehicleSync);
    return () => {
      window.removeEventListener('litrometrik-vehicle-updated', handleVehicleSync);
      window.removeEventListener('storage', handleVehicleSync);
    };
  }, []);

  // When vehicle or country changes from outside, keep state synced
  useEffect(() => {
    const cat = vehicleCatalog[inputs.vehicleType || 'sedan'] || vehicleCatalog.sedan;
    if (cat) {
      setModalTempVehicleType((inputs.vehicleType as VehicleType) || 'sedan');
      const found =
        cat.engines.find((e) => Math.abs(e.consumoBaseL100 - inputs.customBaseConsumption) < 0.2) ||
        cat.engines[1] ||
        cat.engines[0];
      if (found) {
        setModalTempEngineName(found.nombreComun || found.name);
      }
    }
  }, [inputs.country, inputs.vehicleType]);

  // Inputs editable text states
  const [distanceInputText, setDistanceInputText] = useState<string>(() => (inputs.distanceKm ? inputs.distanceKm.toString() : ''));
  const [priceInputText, setPriceInputText] = useState<string>(() => (inputs.pricePerLiter ? inputs.pricePerLiter.toString() : ''));

  useEffect(() => {
    setDistanceInputText(inputs.distanceKm ? inputs.distanceKm.toString() : '');
  }, [inputs.distanceKm]);

  useEffect(() => {
    setPriceInputText(inputs.pricePerLiter ? inputs.pricePerLiter.toString() : '');
  }, [inputs.pricePerLiter]);

  // ---------------- REAL-TIME REACTIVE CALCULATION ENGINE ----------------
  const calc = useMemo(() => {
    return calculateDetailedTrip(inputs);
  }, [inputs]);

  const countryData = DATA_PAIS[inputs.country] || DATA_PAIS.PL;
  const currency = calc.currency;

  const countries = [
    { code: 'PL' as CountryCode, label: 'Polonia', flag: '🇵🇱' },
    { code: 'CO' as CountryCode, label: 'Colombia', flag: '🇨🇴' },
    { code: 'US' as CountryCode, label: 'Estados Unidos', flag: '🇺🇸' },
  ];
  const currentCountry = countries.find((c) => c.code === inputs.country) || countries[0];

  // Open modal with current vehicle configuration
  const handleOpenVehicleModal = () => {
    const curType = (inputs.vehicleType as VehicleType) || 'sedan';
    const curPreset = vehicleCatalog[curType] || vehicleCatalog.sedan;
    const curEngine =
      curPreset.engines.find((e) => e.nombreComun === modalTempEngineName || e.name === modalTempEngineName) ||
      curPreset.engines.find((e) => Math.abs(e.consumoBaseL100 - inputs.customBaseConsumption) < 0.2) ||
      curPreset.engines[1] ||
      curPreset.engines[0];
    const engineShort = (curEngine.name.match(/\d+\.\d+L/) || [])[0] || curEngine.name.split(' ')[0];
    setModalTempVehicleType(curType);
    setModalTempVehicleModelName(`${curPreset.shortLabel} (${engineShort})`);
    setModalTempEngineName(curEngine.nombreComun || curEngine.name);
    setModalTempBaseL100(inputs.customBaseConsumption || curEngine.consumoBaseL100);
    setModalTempTransmission(inputs.transmission || 'manual');
    setIsEngineModalOpen(true);
  };

  // Select category directly from quick buttons
  const handleSelectVehicleCategoryDirect = (preset: UnifiedVehicleCategory) => {
    const defEng = preset.engines[1] || preset.engines[0];
    const engineShort = (defEng.name.match(/\d+\.\d+L/) || [])[0] || defEng.name.split(' ')[0];
    const modelName = `${preset.shortLabel} (${engineShort})`;

    onChange({
      vehicleType: preset.type as any,
      customBaseConsumption: defEng.consumoBaseL100,
    });

    setModalTempVehicleType(preset.type);
    setModalTempEngineName(defEng.nombreComun || defEng.name);
    setModalTempBaseL100(defEng.consumoBaseL100);
    setModalTempVehicleModelName(modelName);

    saveActiveVehicleState({
      vehicleType: preset.type as any,
      engineName: defEng.nombreComun || defEng.name,
      baseL100: defEng.consumoBaseL100,
      transmission: inputs.transmission || 'manual',
      vehicleModelName: modelName,
    });
  };

  // Apply modal configuration
  const handleApplyVehicleModal = () => {
    onChange({
      vehicleType: modalTempVehicleType as any,
      customBaseConsumption: modalTempBaseL100,
      transmission: modalTempTransmission,
    });

    saveActiveVehicleState({
      vehicleType: modalTempVehicleType as any,
      engineName: modalTempEngineName,
      baseL100: modalTempBaseL100,
      transmission: modalTempTransmission,
      vehicleModelName: modalTempVehicleModelName,
    });

    setIsEngineModalOpen(false);
  };

  const handleCancelVehicleModal = () => {
    setIsEngineModalOpen(false);
  };

  // Synchronize with active weighted fuel price on initial load
  useEffect(() => {
    if (!inputs.pricePerLiter || inputs.pricePerLiter <= 0) {
      const defP = getWeightedFuelPrice(inputs.fuelType, inputs.country);
      onChange({ pricePerLiter: defP });
      setPriceInputText(defP.toString());
    }
  }, [inputs.fuelType, inputs.country]);

  // Synchronize with external refuels and weighted price updates in real-time
  useEffect(() => {
    const handleFuelUpdate = (e: any) => {
      const detailFuel = e?.detail?.fuelType || e?.detail?.fuel || '';
      const norm = (inputs.fuelType || '').toLowerCase();
      const isMatch =
        (detailFuel.includes('LPG') && (norm === 'lpg' || norm === 'glp')) ||
        (detailFuel.includes('Diésel') && norm === 'diesel') ||
        (detailFuel.includes('Gasolina') && norm === 'gasolina');

      if (isMatch && typeof e?.detail?.price === 'number') {
        onChange({ pricePerLiter: e.detail.price });
        setPriceInputText(e.detail.price.toString());
      }
    };
    window.addEventListener('litrometrik-fuel-updated', handleFuelUpdate);
    window.addEventListener('litrometrik-prices-updated', handleFuelUpdate);
    return () => {
      window.removeEventListener('litrometrik-fuel-updated', handleFuelUpdate);
      window.removeEventListener('litrometrik-prices-updated', handleFuelUpdate);
    };
  }, [inputs.fuelType, onChange]);

  // Reset to weighted average fuel price for current country & fuel type
  const handleResetOfficialPrice = () => {
    const weighted = getWeightedFuelPrice(inputs.fuelType, inputs.country);
    onChange({ pricePerLiter: weighted });
    setPriceInputText(weighted.toString());
  };

  // Save Trip Action
  const handleSave = async () => {
    const newTrip: SavedTrip = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      routeName: inputs.routeName.trim() || `Ruta ${inputs.distanceKm} km (${activeVehiclePreset.label})`,
      vehicleType: inputs.vehicleType,
      transmission: inputs.transmission,
      fuelType: inputs.fuelType,
      routeType: inputs.routeType,
      distanceKm: calc.effectiveDistance,
      isRoundTrip: inputs.isRoundTrip,
      isACActive: inputs.isACActive,
      coldStartLpg: inputs.coldStartLpg,
      pricePerLiter: inputs.pricePerLiter,
      totalLiters: parseFloat(calc.totalLiters.toFixed(2)),
      totalCostPLN: parseFloat(calc.totalCostMoney.toFixed(2)),
      costPerKm: parseFloat(calc.costPerKm.toFixed(2)),
      savingsVsGasoline: parseFloat(calc.comparativa.savingGlpVsGas.toFixed(2)),
      country: inputs.country,
    };

    onSaveTrip(newTrip);

    if (currentUser?.uid && currentUser.uid !== 'guest' && currentUser.uid !== 'guest_user') {
      setCloudSaving(true);
      await saveCloudRecord(currentUser.uid, 'viajes', newTrip);
      setCloudSaving(false);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  };

  const isCustomModeActive = (inputs.vehicleType || 'sedan') === 'custom';

  return (
    <div className="min-h-screen bg-[#080B11] text-white pb-36 select-none font-sans antialiased">
      {/* ---------------- 1. STICKY TOP HEADER (Solid, No Opacity Layer) ---------------- */}
      <header className="sticky top-0 z-30 bg-[#080B11] border-b border-slate-800 px-4 py-3 flex items-center justify-between pt-[max(env(safe-area-inset-top,0px),12px)] shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF4F00] to-[#FF8000] flex items-center justify-center shadow-lg shadow-[#FF4F00]/25 shrink-0">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center space-x-1.5 leading-none">
              <span>LitroMetrik</span>
              <span className="text-[#FF4F00]">PRO</span>
            </h1>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
              CALCULADORA DE RUTA EN TIEMPO REAL
            </p>
          </div>
        </div>

        {/* Country Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCountryMenu(!showCountryMenu)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#1A202C] hover:bg-[#2D3748] border border-slate-700/80 text-xs font-black text-slate-200 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <span>{currentCountry.flag}</span>
            <span>{currentCountry.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showCountryMenu && (
            <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-[#1A202C] border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {countries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    const nextCountryData = DATA_PAIS[c.code] || DATA_PAIS.PL;
                    try {
                      localStorage.setItem('litrometrik_selected_country', c.code);
                      localStorage.setItem('litrometrik_jurisdiction_country', c.code);
                    } catch (e) {}

                    const defaultPrice = getWeightedFuelPrice(inputs.fuelType, c.code);

                    onChange({
                      country: c.code,
                      pricePerLiter: defaultPrice,
                      referenceGasolinePrice: getWeightedFuelPrice('gasolina', c.code),
                      routeName: `Viaje en ${nextCountryData.nombre}`,
                    });
                    setPriceInputText(defaultPrice.toString());
                    setShowCountryMenu(false);
                    window.dispatchEvent(new CustomEvent('litrometrik-country-changed', { detail: { country: c.code } }));
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-black transition flex items-center justify-between ${
                    inputs.country === c.code ? 'text-[#FF4F00] bg-white/5' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>{c.flag}</span>
                    <span>{c.label}</span>
                  </span>
                  {inputs.country === c.code && <span className="w-1.5 h-1.5 rounded-full bg-[#FF4F00]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Floating Save Notification */}
      {saveSuccess && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="p-3.5 rounded-2xl bg-[#121620] border border-emerald-500/60 text-white text-xs font-bold flex items-center space-x-2 shadow-2xl animate-in slide-in-from-top duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {cloudSaving
                ? 'Sincronizando con Firestore...'
                : '✅ ¡Ruta calculada y guardada exitosamente en la nube!'}
            </span>
          </div>
        </div>
      )}

      {/* ---------------- 2. MAIN CONTAINER ---------------- */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* =========================================================================
            PASO 1: VEHÍCULO Y MOTORIZACIÓN (Idéntico a Modo Marcha)
           ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#FF4F00] text-white text-[11px] font-black flex items-center justify-center">
                1
              </span>
              <span className="text-xs font-black tracking-wider text-white uppercase">
                Vehículo y Motorización
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-[#FF4F00]/15 text-[#FF4F00] border border-[#FF4F00]/30 shadow-sm">
                Base: {formatFuelEconomy(inputs.customBaseConsumption || calc.activeBaseConsumption, inputs.country)}
              </span>
            </div>
          </div>

          {/* Tarjeta Unificada idéntica a Modo Marcha: Carrocería, Pastilla de Motor (?) y Consumo Base */}
          <div className="bg-[#0B0F19] border border-slate-800 rounded-2xl p-2.5 shadow-sm flex items-center justify-between">
            <button
              type="button"
              onClick={handleOpenVehicleModal}
              className="flex-1 flex items-center justify-between p-1 rounded-xl hover:bg-white/5 transition active:scale-[0.99] cursor-pointer text-left group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#121620] to-[#0D1017] border border-slate-700/80 flex items-center justify-center shrink-0 shadow-sm overflow-hidden p-1">
                  {renderVehicle3D(inputs.vehicleType || 'sedan', 36)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2 leading-tight">
                    {/* Categoría a la izquierda */}
                    <span className="text-xs font-black text-white truncate">
                      {activeVehiclePreset.label}
                    </span>
                    {/* Pastilla a la derecha: "Motor 1.6L Estándar (?)" */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentActiveEngine) {
                          setSelectedEngineForInfo(currentActiveEngine);
                        } else {
                          handleOpenVehicleModal();
                        }
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 font-bold border border-sky-500/30 flex items-center space-x-1 transition active:scale-95 cursor-pointer shrink-0"
                      title="Ver ficha técnica del motor"
                    >
                      <span className="truncate max-w-[130px] sm:max-w-none">
                        {currentActiveEngine?.nombreComun || currentActiveEngine?.name || modalTempEngineName || 'Motor Estándar'}
                      </span>
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-500/20 text-sky-300 font-black flex items-center justify-center text-[9px] ml-0.5">?</span>
                    </button>
                  </div>
                  {/* Debajo solo: consumo base y transmisión */}
                  <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                    {formatFuelEconomy(inputs.customBaseConsumption || calc.activeBaseConsumption, inputs.country)} base · {inputs.transmission === 'automatic' ? 'Automático' : 'Manual'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1.5 ml-2">
                <span className="text-[10px] font-bold text-sky-400 hidden sm:inline">Configurar</span>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-sky-400 transition" />
              </div>
            </button>
          </div>

          {/* Selector de 6 Categorías de Vehículos con Renders 3D Profesionales */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {vehiclePresets.map((preset) => {
              const isSelected = (inputs.vehicleType || 'sedan') === preset.type;
              return (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => handleSelectVehicleCategoryDirect(preset)}
                  className={`py-2 px-1.5 rounded-2xl text-center transition-all duration-200 cursor-pointer border flex flex-col items-center justify-between active:scale-95 relative overflow-hidden group ${
                    isSelected
                      ? 'border-sky-400 bg-gradient-to-b from-sky-500/25 via-sky-500/10 to-[#121620] text-white shadow-[0_0_16px_rgba(0,212,255,0.35)] scale-[1.02]'
                      : 'border-slate-800 bg-[#0B0F19] text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="h-10 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                    {renderVehicle3D(preset.type, 38)}
                  </div>

                  <span className="text-[11px] font-black leading-tight mt-1 truncate w-full">
                    {preset.shortLabel}
                  </span>

                  <span className="text-[9px] text-sky-400 font-mono font-bold mt-0.5">
                    {formatFuelEconomy(preset.defaultBaseL100, inputs.country)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            PASO 2: TRANSMISIÓN
           ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#FF4F00] text-white text-[11px] font-black flex items-center justify-center">
                2
              </span>
              <span className="text-xs font-black tracking-wider text-white uppercase">
                Transmisión
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Factor: x{calc.transmissionFactor.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onChange({ transmission: 'manual' })}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                inputs.transmission === 'manual'
                  ? 'border-[#FF4F00] bg-[#FF4F00]/15 text-white shadow-[0_0_12px_rgba(255,79,0,0.25)]'
                  : 'border-slate-800 bg-[#080B11] text-slate-400 hover:text-white'
              }`}
            >
              <div>
                <div className="text-xs font-black text-white">Manual</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Factor x1.0 (Estándar)</div>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  inputs.transmission === 'manual'
                    ? 'bg-[#FF4F00] text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                x1.0
              </span>
            </button>

            <button
              type="button"
              onClick={() => onChange({ transmission: 'automatic' })}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                inputs.transmission === 'automatic'
                  ? 'border-[#FF4F00] bg-[#FF4F00]/15 text-white shadow-[0_0_12px_rgba(255,79,0,0.25)]'
                  : 'border-slate-800 bg-[#080B11] text-slate-400 hover:text-white'
              }`}
            >
              <div>
                <div className="text-xs font-black text-white">Automática</div>
                <div className="text-[10px] text-slate-400 mt-0.5">+8% consumo estimado</div>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  inputs.transmission === 'automatic'
                    ? 'bg-[#FF4F00] text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                x1.08
              </span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PASO 3: TIPO DE COMBUSTIBLE PRINCIPAL
           ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#FF4F00] text-white text-[11px] font-black flex items-center justify-center">
                3
              </span>
              <span className="text-xs font-black tracking-wider text-white uppercase">
                Tipo de Combustible Principal
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Factor: x{calc.fuelFactor.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              {
                id: 'gasolina',
                name: inputs.country === 'PL' ? 'Benzyna Pb95' : inputs.country === 'CO' ? 'Gasolina Corriente / Extra' : 'Gasoline Regular / Premium',
                factorStr: 'x1.0',
                note: 'Consumo base 1.0',
                price: countryData.preciosDefecto.gasolina,
              },
              {
                id: 'diesel',
                name: inputs.country === 'PL' ? 'Diesel / ON' : inputs.country === 'CO' ? 'Diésel / ACPM' : 'Diesel Fuel',
                factorStr: 'x0.85',
                note: '-15% consumo',
                price: countryData.preciosDefecto.diesel,
              },
              {
                id: 'lpg',
                name: inputs.country === 'PL' ? 'LPG / Autogaz' : inputs.country === 'CO' ? 'Gas GLP / Vehicular' : 'LPG / Propane',
                factorStr: 'x1.20',
                note: '+15% a +20% consumo',
                price: countryData.preciosDefecto.lpg,
              },
              {
                id: 'hibrido',
                name: inputs.country === 'CO' ? 'Gas GNV / Híbrido' : 'Híbrido HEV / PHEV',
                factorStr: 'x0.75',
                note: '-25% consumo',
                price: countryData.preciosDefecto.gasolina,
              },
            ].map((f) => {
              const isSelected = inputs.fuelType === f.id || (f.id === 'lpg' && inputs.fuelType === 'glp');
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    const weighted = getWeightedFuelPrice(f.id, inputs.country);
                    onChange({
                      fuelType: f.id as any,
                      pricePerLiter: weighted,
                    });
                    setPriceInputText(weighted.toString());
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                    isSelected
                      ? 'border-[#FF4F00] bg-[#FF4F00]/15 text-white shadow-[0_0_12px_rgba(255,79,0,0.25)]'
                      : 'border-slate-800 bg-[#080B11] text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black text-white">{f.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{f.note}</div>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-[#FF4F00] text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {f.factorStr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            PASO 4: ESTILO DE CONDUCCIÓN / RUTA
           ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-[#FF4F00] text-white text-[11px] font-black flex items-center justify-center">
                4
              </span>
              <span className="text-xs font-black tracking-wider text-white uppercase">
                Estilo de Conducción / Ruta
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              Factor: x{calc.routeFactor.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'carretera', label: 'Carretera / Autopista', factor: 'x0.85', desc: '-15% vel. constante' },
              { id: 'mixto', label: 'Mixto / Combinado', factor: 'x1.0', desc: 'Ruta estándar' },
              { id: 'ciudad', label: 'Ciudad / Congestión', factor: 'x1.25', desc: '+25% arranques' },
            ].map((r) => {
              const isSelected = inputs.routeType === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onChange({ routeType: r.id as any })}
                  className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between active:scale-95 ${
                    isSelected
                      ? 'border-[#00D4FF] bg-[#00D4FF]/15 text-white shadow-[0_0_12px_rgba(0,212,255,0.25)]'
                      : 'border-slate-800 bg-[#080B11] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-black leading-tight text-white">{r.label}</span>
                  <span className="text-[9px] text-slate-400 mt-1">{r.desc}</span>
                  <span
                    className={`mt-2 text-[10px] font-black px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-[#00D4FF] text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {r.factor}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            PASO 5: FACTORES ESPECIALES (A/C & IDA Y VUELTA)
           ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-3">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-[#FF4F00] text-white text-[11px] font-black flex items-center justify-center">
              5
            </span>
            <span className="text-xs font-black tracking-wider text-white uppercase">
              Factores Especiales
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Switch Aire Acondicionado */}
            <button
              type="button"
              onClick={() => onChange({ isACActive: !inputs.isACActive })}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                inputs.isACActive
                  ? 'border-cyan-400 bg-cyan-400/15 text-white shadow-[0_0_14px_rgba(34,211,238,0.25)]'
                  : 'border-slate-800 bg-[#080B11] text-slate-400 hover:text-white'
              }`}
            >
              <div className="min-w-0 pr-1.5">
                <div className="text-xs font-black text-white flex items-center space-x-1.5">
                  <span className="truncate">Aire A/C</span>
                  <Wind className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">+0.6 L/100km directo</div>
              </div>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${
                  inputs.isACActive ? 'bg-cyan-400' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    inputs.isACActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Switch Ida y Vuelta */}
            <button
              type="button"
              onClick={() => onChange({ isRoundTrip: !inputs.isRoundTrip })}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between active:scale-95 ${
                inputs.isRoundTrip
                  ? 'border-[#FF4F00] bg-[#FF4F00]/15 text-white shadow-[0_0_14px_rgba(255,79,0,0.25)]'
                  : 'border-slate-800 bg-[#080B11] text-slate-400 hover:text-white'
              }`}
            >
              <div>
                <div className="text-xs font-black text-white flex items-center space-x-1">
                  <span>Ida y Vuelta</span>
                  <Repeat className="w-3.5 h-3.5 text-[#FF4F00]" />
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Distancia x 2</div>
              </div>
              <div
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  inputs.isRoundTrip ? 'bg-[#FF4F00]' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${
                    inputs.isRoundTrip ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* =========================================================================
            PARÁMETROS DE TRAYECTO (DISTANCIA, PRECIO POR LITRO Y ETIQUETA)
           ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FF4F00]" />
              <span>PARÁMETROS DE TRAYECTO</span>
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-[#FF4F00]">
                {calc.effectiveDistance} km efectivo
              </span>
            </div>
          </div>

          {/* Campo Nombre o Etiqueta del Viaje */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300">
              Nombre o Etiqueta del Viaje:
            </label>
            <input
              type="text"
              value={inputs.routeName}
              onChange={(e) => onChange({ routeName: e.target.value })}
              placeholder="Ej. Varsovia a Cracovia / Bogotá a Medellín"
              className="w-full px-4 py-2.5 rounded-2xl bg-[#080B11] border border-slate-700 text-white font-sans text-xs focus:outline-none focus:border-[#FF4F00] transition"
            />
          </div>

          {/* Input de Distancia con Slider y Botones Rápidos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300">
                Distancia en kilómetros:
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="1"
                  max="3500"
                  value={distanceInputText}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    setDistanceInputText(valStr);
                    if (valStr.trim() !== '') {
                      const num = parseFloat(valStr);
                      if (!isNaN(num) && num > 0) {
                        onChange({ distanceKm: num });
                      }
                    }
                  }}
                  onBlur={() => {
                    if (distanceInputText.trim() === '' || isNaN(parseFloat(distanceInputText))) {
                      setDistanceInputText(inputs.distanceKm.toString());
                    }
                  }}
                  placeholder="150"
                  className="w-24 px-2 py-1 rounded-xl bg-[#080B11] border border-slate-700 text-right font-sans font-black text-sm text-[#FF4F00] focus:outline-none focus:border-[#FF4F00]"
                />
                <span className="text-xs font-bold text-slate-400">km</span>
              </div>
            </div>

            <input
              type="range"
              min="5"
              max="1000"
              step="5"
              value={inputs.distanceKm}
              onChange={(e) => {
                const num = parseFloat(e.target.value) || 5;
                setDistanceInputText(num.toString());
                onChange({ distanceKm: num });
              }}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FF4F00]"
            />

            {/* Botones rápidos: 25 km, 60 km, 150 km, 300 km, 500 km */}
            <div className="flex justify-between gap-1 pt-1">
              {[25, 60, 150, 300, 500].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => {
                    setDistanceInputText(km.toString());
                    onChange({ distanceKm: km });
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-[10px] font-black border transition active:scale-95 cursor-pointer ${
                    inputs.distanceKm === km
                      ? 'border-[#FF4F00] text-[#FF4F00] bg-[#FF4F00]/15 shadow-sm'
                      : 'border-slate-800 bg-[#080B11] text-slate-400 hover:text-white'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>

          {/* Input de Precio por Litro con botón Restablecer Precio Oficial */}
          <div className="p-3.5 rounded-2xl bg-[#080B11] border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-black text-white">Precio por Litro</div>
              <button
                type="button"
                onClick={handleResetOfficialPrice}
                className="text-[10px] text-[#00D4FF] hover:underline flex items-center space-x-1 font-bold mt-0.5 cursor-pointer"
                title="Cargar el precio promedio ponderado activo de tu tanque"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Restablecer Precio Ponderado ({formatCurrency(getWeightedFuelPrice(inputs.fuelType, inputs.country), inputs.country, { isPerUnit: true })})</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.1"
                value={priceInputText}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const valStr = e.target.value;
                  setPriceInputText(valStr);
                  if (valStr.trim() !== '') {
                    const num = parseFloat(valStr);
                    if (!isNaN(num) && num >= 0) {
                      onChange({ pricePerLiter: num });
                    }
                  }
                }}
                onBlur={() => {
                  if (priceInputText.trim() === '' || isNaN(parseFloat(priceInputText))) {
                    setPriceInputText(inputs.pricePerLiter.toString());
                  }
                }}
                placeholder={inputs.pricePerLiter.toString()}
                className="w-32 px-3 py-2 rounded-xl bg-[#121620] border border-slate-700 text-white font-sans font-black text-right text-sm focus:outline-none focus:border-[#FF4F00]"
              />
              <span className="absolute left-2.5 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">
                {currency}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            COMPARATIVA AVANZADA DE COSTOS EN TIEMPO REAL
            (Reactividad pura con barras de progreso animadas, neon gradients y ahorro)
           ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-[#00D4FF] uppercase flex items-center space-x-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-[#00D4FF]" />
              <span>COMPARATIVA AVANZADA DE COSTOS</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              {calc.effectiveDistance} km en tiempo real
            </span>
          </div>

          {/* Gráfico Interactivo de 3 Barras con Gradientes Neon y Porcentajes Relativos */}
          <div className="space-y-4">
            {/* 1. Gasolina Pb95 (Naranja Neón #FF6B00) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FF6B00] shadow-[0_0_8px_#FF6B00]" />
                  <span className="text-white">{calc.comparativa.gasolina.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({formatCurrency(calc.comparativa.gasolina.pricePerLiter, inputs.country, { isPerUnit: true })})</span>
                </div>
                <div className="text-right">
                  <span className="text-[#FF6B00] font-black text-sm">
                    {formatCurrency(calc.comparativa.gasolina.totalCost, inputs.country)}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1.5">
                    ({calc.comparativa.gasolina.totalLiters.toFixed(1)} L)
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="h-5 w-full bg-slate-900/90 rounded-full p-0.5 border border-slate-800 relative overflow-hidden flex items-center shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#FF4F00] via-[#FF6B00] to-[#FFA000] shadow-[0_0_14px_rgba(255,107,0,0.45)] transition-[width] duration-500 ease-out flex items-center justify-end pr-2"
                  style={{ width: `${calc.comparativa.gasolina.percent}%` }}
                >
                  <span className="text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {calc.comparativa.gasolina.percent}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Consumo: {calc.comparativa.gasolina.rateL100.toFixed(2)} L/100km</span>
                <span className="text-slate-500">Base estándar x1.0</span>
              </div>
            </div>

            {/* 2. Diésel ON (Azul Eléctrico #00B4D8) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00B4D8] shadow-[0_0_8px_#00B4D8]" />
                  <span className="text-white">{calc.comparativa.diesel.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({formatCurrency(calc.comparativa.diesel.pricePerLiter, inputs.country, { isPerUnit: true })})</span>
                </div>
                <div className="text-right">
                  <span className="text-[#00B4D8] font-black text-sm">
                    {formatCurrency(calc.comparativa.diesel.totalCost, inputs.country)}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1.5">
                    ({calc.comparativa.diesel.totalLiters.toFixed(1)} L)
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="h-5 w-full bg-slate-900/90 rounded-full p-0.5 border border-slate-800 relative overflow-hidden flex items-center shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0077B6] via-[#00B4D8] to-[#90E0EF] shadow-[0_0_14px_rgba(0,180,216,0.45)] transition-[width] duration-500 ease-out flex items-center justify-end pr-2"
                  style={{ width: `${calc.comparativa.diesel.percent}%` }}
                >
                  <span className="text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {calc.comparativa.diesel.percent}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Consumo: {calc.comparativa.diesel.rateL100.toFixed(2)} L/100km</span>
                <span className="text-cyan-400">-15% consumo en ruta</span>
              </div>
            </div>

            {/* 3. Gas LPG (Verde Esmeralda #10B981) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-black">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
                  <span className="text-white">{calc.comparativa.glp.label}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({formatCurrency(calc.comparativa.glp.pricePerLiter, inputs.country, { isPerUnit: true })})</span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-400 font-black text-sm">
                    {formatCurrency(calc.comparativa.glp.totalCost, inputs.country)}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-1.5">
                    ({calc.comparativa.glp.totalLiters.toFixed(1)} L)
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="h-5 w-full bg-slate-900/90 rounded-full p-0.5 border border-slate-800 relative overflow-hidden flex items-center shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399] shadow-[0_0_16px_rgba(16,185,129,0.55)] transition-[width] duration-500 ease-out flex items-center justify-end pr-2"
                  style={{ width: `${calc.comparativa.glp.percent}%` }}
                >
                  <span className="text-[10px] font-black text-slate-950 font-sans drop-shadow-sm">
                    {calc.comparativa.glp.percent}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Consumo: {calc.comparativa.glp.rateL100.toFixed(2)} L/100km</span>
                <span className="text-emerald-400 font-bold">Máximo ahorro monetario</span>
              </div>
            </div>
          </div>

          {/* Tarjeta Destacada de Ahorro con LPG (Integrada debajo del gráfico) */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-emerald-900/50 to-teal-950/70 border border-emerald-500/40 flex items-start space-x-3.5 shadow-xl">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-slate-950 shrink-0 mt-0.5 shadow-md shadow-emerald-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black text-white">
                {calc.comparativa.savingGlpVsGas > 0 ? (
                  <span>
                    Si usaras LPG podrías ahorrar hasta{' '}
                    <span className="text-emerald-300 font-black text-sm">
                      {formatCurrency(calc.comparativa.savingGlpVsGas, inputs.country)}
                    </span>{' '}
                    ({calc.comparativa.percentSavedVsGas}% menos) en este trayecto.
                  </span>
                ) : (
                  <span>
                    Conduciendo con LPG disfrutas del costo más económico por kilómetro.
                  </span>
                )}
              </div>
              <p className="text-[10px] text-emerald-200/80 mt-1">
                Cálculo basado en {calc.effectiveDistance} km e incluye un arranque en frío con gasolina para proteger válvulas.
              </p>
            </div>
          </div>

          {/* Botón Reiniciar Todos los Valores */}
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onReset}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reiniciar Valores</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            TARJETA FINAL DE RESUMEN DE GASTOS
           ========================================================================= */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#1C2436] via-[#121620] to-[#0A0D14] border border-[#FF4F00]/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black tracking-widest text-[#FF4F00] uppercase flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4" />
              <span>RESUMEN FINAL DE GASTOS</span>
            </span>
            <span className="text-xs font-bold text-slate-300">
              {calc.effectiveDistance} km efectivo
            </span>
          </div>

          {/* Dinero Total Estimado en Grande */}
          <div className="border-b border-slate-800/80 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Dinero Total Estimado
            </span>
            <div className="text-4xl sm:text-5xl font-black font-sans text-white tracking-tight mt-0.5">
              {calc.totalCostMoney.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
              <span className="text-xl sm:text-2xl text-[#FF4F00] font-black">{currency}</span>
            </div>
          </div>

          {/* 3 Métricas Clave */}
          <div className="grid grid-cols-2 gap-3">
            {/* Combustible a gastar con equivalencia en garrafas */}
            <div className="p-3.5 rounded-2xl bg-[#080B11] border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Combustible a gastar
              </span>
              <div className="text-xl font-black text-white">
                {calc.totalLiters.toFixed(2).replace('.', ',')} <span className="text-xs text-slate-400">Litros</span>
              </div>
              <div className="text-[10px] text-cyan-300 font-bold">
                ≈ {calc.garrafas20L.toFixed(1)} garrafas (de 20L)
              </div>
            </div>

            {/* Costo por Kilómetro (1 km y 10 km) */}
            <div className="p-3.5 rounded-2xl bg-[#080B11] border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Costo por Kilómetro
              </span>
              <div className="text-xl font-black text-[#FF4F00]">
                {formatCurrency(calc.costPerKm, inputs.country, { isPerUnit: true, unit: 'km' })}
              </div>
              <div className="text-[10px] text-slate-300 font-bold">
                {formatCurrency(calc.costPer10Km, inputs.country)} cada 10 km
              </div>
            </div>
          </div>

          {/* Consumo Medio Estimado con la fórmula desglosada */}
          <div className="p-3.5 rounded-2xl bg-[#080B11] border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Consumo Medio Estimado
              </span>
              <span className="text-base font-black text-white">
                {calc.finalConsumptionL100.toFixed(2).replace('.', ',')} L/100km
              </span>
            </div>

            {/* Fórmula desglosada */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 font-medium leading-relaxed">
              <span className="text-[#FF4F00] font-black">Fórmula:</span> Base ({calc.activeBaseConsumption.toFixed(1)}) × Transmisión ({calc.transmissionFactor.toFixed(2)}) × Combustible ({calc.fuelFactor.toFixed(2)}) × Ruta ({calc.routeFactor.toFixed(2)}){inputs.isACActive ? ' + A/C (0.6)' : ''} = <span className="text-white font-black">{calc.finalConsumptionL100.toFixed(2)} L/100km</span>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              className="py-3.5 px-4 rounded-2xl bg-[#FF4F00] hover:bg-[#FF621F] text-white font-black text-xs transition active:scale-95 cursor-pointer shadow-lg shadow-[#FF4F00]/30 flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Registro</span>
            </button>

            <button
              type="button"
              onClick={onOpenHistory}
              className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs transition active:scale-95 cursor-pointer shadow-md flex items-center justify-center space-x-2"
            >
              <span>Ver Historial</span>
            </button>
          </div>
        </div>
      </main>

      {/* =========================================================================
          MODAL DE CONFIGURACIÓN TÉCNICA DE VEHÍCULO (Idéntico a Modo Marcha)
         ========================================================================= */}
      {isEngineModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-between sm:justify-center items-center p-3 sm:p-4 pb-20 sm:pb-6 bg-black/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0E131F] border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[calc(100dvh-5.5rem)] sm:max-h-[620px] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header Fijo */}
            <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-[#0E131F]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">
                    Configuración de Vehículo
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Elige tu carrocería, motorización real y transmisión
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelVehicleModal}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo con Scroll Suave e Independiente (con min-h-0 para garantizar que el footer permanezca fijo y visible) */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">
              {/* 1. Categoría de Vehículo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  1. Categoría de Carrocería
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {vehiclePresets.map((preset) => {
                    const isSel = modalTempVehicleType === preset.type;
                    return (
                      <button
                        key={preset.type}
                        type="button"
                        onClick={() => {
                          setModalTempVehicleType(preset.type);
                          const defEng = preset.engines[1] || preset.engines[0];
                          const engineShort = (defEng.name.match(/\d+\.\d+L/) || [])[0] || defEng.name.split(' ')[0];
                          setModalTempVehicleModelName(`${preset.shortLabel} (${engineShort})`);
                          setModalTempEngineName(defEng.name);
                          setModalTempBaseL100(defEng.baseL100);
                        }}
                        className={`p-2 rounded-2xl border text-center transition flex flex-col items-center justify-between cursor-pointer active:scale-95 ${
                          isSel
                            ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_15px_rgba(0,212,255,0.2)]'
                            : 'bg-[#182030] border-slate-700/80 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="w-12 h-10 flex items-center justify-center">
                          {renderVehicle3D(preset.type, 42)}
                        </div>
                        <div className="text-[11px] font-black truncate w-full mt-1">
                          {preset.shortLabel}
                        </div>
                        <div className="text-[9px] text-sky-400 font-mono font-bold">
                          {formatFuelEconomy(preset.defaultBaseL100, inputs.country)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Motorización Investigada para la categoría */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  2. Motor & Cilindrada
                </label>
                <div className="space-y-2">
                  {(
                    vehicleCatalog[modalTempVehicleType]?.engines ||
                    vehicleCatalog.sedan.engines
                  ).map((eng) => {
                    const isSel = modalTempEngineName === (eng.nombreComun || eng.name);
                    return (
                      <div
                        key={eng.key || eng.id}
                        onClick={() => {
                          setModalTempEngineName(eng.nombreComun || eng.name);
                          setModalTempBaseL100(eng.consumoBaseL100 || eng.baseL100);
                          const cat = vehicleCatalog[modalTempVehicleType] || vehicleCatalog.sedan;
                          setModalTempVehicleModelName(`${cat.shortLabel} (${eng.nombreComun || eng.name})`);
                        }}
                        className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between active:scale-[0.99] select-none ${
                          isSel
                            ? 'bg-gradient-to-r from-sky-500/20 to-blue-600/20 border-sky-400 text-white shadow-sm'
                            : 'bg-[#161D2B] border-slate-700/70 text-slate-300 hover:bg-[#1E2738]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="text-xs font-black truncate text-white">{eng.nombreComun || eng.name}</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">{eng.cc || eng.displacement} • {eng.cilindrosPotencia || eng.powerCV}</div>
                          <div className="text-[9px] text-slate-500 truncate mt-0.5">{eng.descripcionBreve || eng.description}</div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="text-right">
                            <span className="font-mono text-sky-400 font-black text-xs block">
                              {formatFuelEconomy(eng.consumoBaseL100 || eng.baseL100, inputs.country)}
                            </span>
                          </div>

                          {/* Botón de Información (?) con stopPropagation */}
                          {eng.detalleInfo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEngineForInfo(eng);
                              }}
                              className="w-6 h-6 rounded-full bg-slate-800 hover:bg-sky-500/30 border border-slate-700 hover:border-sky-400 text-slate-300 hover:text-sky-300 text-xs font-black flex items-center justify-center transition cursor-pointer shadow-sm active:scale-90"
                              title="Ver ficha técnica y detalles"
                            >
                              ?
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Transmisión */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  3. Transmisión
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalTempTransmission('manual')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-black transition cursor-pointer ${
                      modalTempTransmission === 'manual'
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-[#1A202C] border-slate-700/60 text-slate-400'
                    }`}
                  >
                    Manual (x1.0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalTempTransmission('automatic')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-black transition cursor-pointer ${
                      modalTempTransmission === 'automatic'
                        ? 'bg-sky-500/20 border-sky-400 text-white'
                        : 'bg-[#1A202C] border-slate-700/60 text-slate-400'
                    }`}
                  >
                    Automática (+8%)
                  </button>
                </div>
              </div>

              {/* Summary preview */}
              <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">Vehículo a sincronizar:</span>
                  <span className="font-bold text-white text-xs truncate">
                    {modalTempVehicleModelName || modalTempEngineName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Consumo calibrado:</span>
                  <span className="font-mono font-black text-sky-400 text-sm">
                    {(modalTempBaseL100 * (modalTempTransmission === 'automatic' ? 1.08 : 1.0)).toFixed(1)} L/100km
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Fijo y Permanente (Siempre visible para guardar) */}
            <div className="p-4 border-t border-slate-800 bg-[#0C101A] shrink-0 flex space-x-2.5 z-20 shadow-2xl">
              <button
                type="button"
                onClick={handleCancelVehicleModal}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 text-slate-200 hover:text-white font-bold text-xs hover:bg-slate-700 cursor-pointer active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyVehicleModal}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs shadow-lg shadow-sky-500/30 cursor-pointer active:scale-95 transition flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Informativo Detallado del Motor (?) con Portal en z-[90] */}
      {selectedEngineForInfo && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setSelectedEngineForInfo(null)}
          className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#131927] border border-slate-700/80 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Ficha Técnica de Motorización
                </span>
                <h3 className="text-base font-black text-white mt-1">
                  {selectedEngineForInfo.nombreComun || selectedEngineForInfo.name}
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {selectedEngineForInfo.cc || selectedEngineForInfo.displacement} • {selectedEngineForInfo.cilindrosPotencia || selectedEngineForInfo.powerCV}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEngineForInfo(null)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-400">Rendimiento Base Investigado:</div>
              <div className="text-sm font-black text-emerald-400">
                {formatFuelEconomy(selectedEngineForInfo.consumoBaseL100 || selectedEngineForInfo.baseL100, inputs.country)}
              </div>
              <p className="text-[11px] text-slate-300 mt-1">
                {selectedEngineForInfo.descripcionBreve || selectedEngineForInfo.description}
              </p>
            </div>

            {selectedEngineForInfo.detalleInfo && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-black text-sky-400 block mb-0.5">Tipo de manejo que cubre:</span>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedEngineForInfo.detalleInfo.tipoManejo}
                  </p>
                </div>

                <div>
                  <span className="font-black text-amber-400 block mb-1">Ejemplos de autos en el mercado:</span>
                  <ul className="space-y-1">
                    {selectedEngineForInfo.detalleInfo.ejemplosAutos.map((auto, idx) => (
                      <li key={idx} className="flex items-center space-x-1.5 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>{auto}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="font-black text-emerald-400 block mb-0.5">Rendimiento promedio y combustibles:</span>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedEngineForInfo.detalleInfo.rendimientoYCombustible}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedEngineForInfo(null)}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-xs shadow-md transition cursor-pointer active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
