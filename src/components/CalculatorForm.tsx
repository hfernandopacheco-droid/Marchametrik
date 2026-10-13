import React, { useState } from 'react';
import {
  Car, Settings, Fuel, Navigation, Zap, Snowflake, ArrowLeftRight, Flame, Tag,
  Globe, X, Sliders, CheckCircle2, ChevronDown, HelpCircle, Edit3, Check
} from 'lucide-react';
import { VehicleType, TransmissionType, FuelType, RouteType, CalculatorInputs, CountryCode } from '../types';
import { DATA_PAIS } from '../utils/countryData';

interface CalculatorFormProps {
  inputs: CalculatorInputs;
  onChange: (newInputs: Partial<CalculatorInputs>) => void;
  onOpenMap?: () => void;
}

export const CalculatorForm: React.FC<CalculatorFormProps> = ({ inputs, onChange, onOpenMap }) => {
  const {
    country = 'PL',
    vehicleType,
    customBaseConsumption,
    transmission,
    fuelType,
    routeType,
    distanceKm,
    isRoundTrip,
    isACActive,
    coldStartLpg,
    pricePerLiter,
    referenceGasolinePrice,
    routeName,
  } = inputs;

  const currentCountryData = DATA_PAIS[country] || DATA_PAIS.PL;

  // Bottom Sheet state for vehicle selection & technical specs
  const [selectedVehicleForSheet, setSelectedVehicleForSheet] = useState<VehicleType | null>(null);
  const [tempConsumption, setTempConsumption] = useState<number>(customBaseConsumption || 8.5);
  const [customEngineVal, setCustomEngineVal] = useState<string>('');

  const getFuelDefaultPrice = (cData: typeof currentCountryData, fType: string) => {
    if (fType === 'diesel') return cData.preciosDefecto.diesel;
    if (fType === 'lpg' || fType === 'glp') return cData.preciosDefecto.lpg;
    return cData.preciosDefecto.gasolina;
  };

  const handleCountryChange = (newCountry: CountryCode) => {
    try {
      localStorage.setItem('litrometrik_selected_country', newCountry);
      localStorage.setItem('litrometrik_jurisdiction_country', newCountry);
    } catch (e) {}

    const newCountryData = DATA_PAIS[newCountry];
    const newPrice = getFuelDefaultPrice(newCountryData, fuelType);
    const newRefPrice = newCountryData.preciosDefecto.gasolina;

    let newBase = customBaseConsumption;
    if (vehicleType === 'compact') newBase = newCountryData.Compacto.base;
    else if (vehicleType === 'sedan') newBase = newCountryData.Sedan.base;
    else if (vehicleType === 'suv') newBase = newCountryData.SUV.base;

    onChange({
      country: newCountry,
      pricePerLiter: newPrice,
      referenceGasolinePrice: newRefPrice,
      customBaseConsumption: newBase,
    });
  };

  const handleOpenVehicleSheet = (type: VehicleType) => {
    setSelectedVehicleForSheet(type);
    if (type === 'compact') {
      setTempConsumption(customBaseConsumption > 0 ? customBaseConsumption : currentCountryData.Compacto.base);
    } else if (type === 'sedan') {
      setTempConsumption(customBaseConsumption > 0 ? customBaseConsumption : currentCountryData.Sedan.base);
    } else if (type === 'suv') {
      setTempConsumption(customBaseConsumption > 0 ? customBaseConsumption : currentCountryData.SUV.base);
    } else {
      setTempConsumption(customBaseConsumption > 0 ? customBaseConsumption : 8.0);
    }
    setCustomEngineVal('');
  };

  const handleApplyVehicleSheet = () => {
    if (!selectedVehicleForSheet) return;
    onChange({
      vehicleType: selectedVehicleForSheet,
      customBaseConsumption: parseFloat(tempConsumption.toFixed(1)),
    });
    setSelectedVehicleForSheet(null);
  };

  const getSheetInfo = () => {
    if (!selectedVehicleForSheet) return null;
    if (selectedVehicleForSheet === 'compact') return currentCountryData.Compacto;
    if (selectedVehicleForSheet === 'sedan') return currentCountryData.Sedan;
    if (selectedVehicleForSheet === 'suv') return currentCountryData.SUV;
    return null;
  };

  const sheetData = getSheetInfo();

  const handleEngineChange = (val: string) => {
    setCustomEngineVal(val);
    if (!sheetData) return;

    const numMatch = val.match(/([0-9]+[.,]?[0-9]*)/);
    if (numMatch) {
      const parsedLitres = parseFloat(numMatch[1].replace(',', '.'));
      if (!isNaN(parsedLitres) && parsedLitres >= 0.8 && parsedLitres <= 7.0) {
        let estimatedBase = 5.5 + (parsedLitres - 1.0) * 2.2;
        if (selectedVehicleForSheet === 'suv') estimatedBase += 1.2;
        estimatedBase = Math.min(sheetData.max + 4.0, Math.max(sheetData.min - 1.0, estimatedBase));
        setTempConsumption(parseFloat(estimatedBase.toFixed(1)));
      }
    }
  };

  const countries: { id: CountryCode; label: string; flag: string; currency: string }[] = [
    { id: 'PL', label: 'Polonia', flag: '🇵🇱', currency: 'PLN' },
    { id: 'CO', label: 'Colombia', flag: '🇨🇴', currency: 'COP' },
    { id: 'US', label: 'Estados Unidos', flag: '🇺🇸', currency: 'USD' },
  ];

  return (
    <div className="space-y-6">
      {/* 0. Country Selector Bar */}
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              País y Moneda
            </span>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            {currentCountryData.nombre} ({currentCountryData.moneda})
          </span>
        </div>

        <div className="slider flex gap-2 pb-1">
          {countries.map((c) => {
            const isSelected = country === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCountryChange(c.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center space-x-2 shrink-0 button-hover-pro cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-100/90 via-sky-50/90 to-blue-100/90 text-blue-950 border-2 border-blue-500 shadow-md shadow-blue-500/20 ring-2 ring-blue-400/20'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                }`}
              >
                <span className="text-base">{c.flag}</span>
                <span className={isSelected ? 'text-blue-950 font-black' : 'text-slate-900 font-bold'}>{c.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                  {c.currency}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Vehicle Type & Consumption Profile */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">1. Tipo de Vehículo</h2>
              <p className="text-xs text-slate-500 font-medium">
                Selecciona tu categoría o personaliza tu consumo
              </p>
            </div>
          </div>

          <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
            {customBaseConsumption} L/100km
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'compact' as VehicleType, title: 'Compacto / Urbano', desc: `${currentCountryData.Compacto.motor} (${currentCountryData.Compacto.consumo} L/100km)` },
            { id: 'sedan' as VehicleType, title: 'Sedán / Mediano', desc: `${currentCountryData.Sedan.motor} (${currentCountryData.Sedan.consumo} L/100km)` },
            { id: 'suv' as VehicleType, title: 'Grande / SUV', desc: `${currentCountryData.SUV.motor} (${currentCountryData.SUV.consumo} L/100km)` },
            { id: 'custom' as VehicleType, title: 'Personalizado', desc: 'Ingresa tu propio L/100km de tablero' },
          ].map((v) => {
            const isSelected = vehicleType === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handleOpenVehicleSheet(v.id)}
                className={`text-left p-4 rounded-2xl border-2 transition flex flex-col justify-between group button-hover-pro cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-50/95 via-sky-50/90 to-indigo-50/85 backdrop-blur-md border-2 border-blue-500 text-slate-900 shadow-md shadow-blue-500/15 ring-2 ring-blue-400/20'
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-sm ${isSelected ? 'font-black text-blue-950' : 'font-bold text-slate-900'}`}>{v.title}</span>
                  <Sliders className={`w-4 h-4 transition ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                </div>
                <span className={`text-xs mt-1.5 ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-500 font-medium'}`}>
                  {v.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Transmission */}
      <div className="glass-panel p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-slate-900">2. Transmisión</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'manual' as TransmissionType, title: 'Manual', desc: 'Gasta lo normal (Factor 1.0)' },
            { id: 'automatic' as TransmissionType, title: 'Automática', desc: 'Gasta 8% más (Factor 1.08)' },
          ].map((t) => {
            const isSelected = transmission === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange({ transmission: t.id })}
                className={`p-3.5 rounded-2xl border-2 text-left transition button-hover-pro cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-50/95 via-sky-50/90 to-indigo-50/85 backdrop-blur-md border-2 border-blue-500 text-slate-900 shadow-md shadow-blue-500/15 ring-2 ring-blue-400/20'
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-blue-300'
                }`}
              >
                <div className={`text-sm ${isSelected ? 'font-black text-blue-950' : 'font-bold text-slate-900'}`}>{t.title}</div>
                <div className={`text-[11px] mt-1 ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-500 font-medium'}`}>
                  {t.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Fuel Type */}
      <div className="glass-panel p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Fuel className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-slate-900">3. Tipo de Combustible Principal</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'gasolina' as FuelType, label: currentCountryData.etiquetasCombustible.gasolina, factor: 'x1.0', price: currentCountryData.preciosDefecto.gasolina },
            { id: 'diesel' as FuelType, label: currentCountryData.etiquetasCombustible.diesel, factor: 'x0.85', price: currentCountryData.preciosDefecto.diesel },
            { id: 'lpg' as FuelType, label: currentCountryData.etiquetasCombustible.lpg, factor: 'x1.20', price: currentCountryData.preciosDefecto.lpg },
          ].map((f) => {
            const isSelected = fuelType === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onChange({
                    fuelType: f.id,
                    pricePerLiter: f.price,
                  });
                }}
                className={`p-3.5 rounded-2xl border-2 text-center transition button-hover-pro cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-50/95 via-sky-50/90 to-indigo-50/85 backdrop-blur-md border-2 border-blue-500 text-slate-900 shadow-md shadow-blue-500/15 ring-2 ring-blue-400/20'
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-blue-300'
                }`}
              >
                <div className={`text-xs sm:text-sm truncate ${isSelected ? 'font-black text-blue-950' : 'font-bold text-slate-900'}`}>{f.label}</div>
                <div className={`text-[11px] mt-1 ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-500 font-medium'}`}>
                  {f.factor}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Driving Style / Route */}
      <div className="glass-panel p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Navigation className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-slate-900">4. Estilo de Conducción / Ruta</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'carretera' as RouteType, label: 'Carretera / Autopista', desc: 'Gasta 15% menos - velocidad constante' },
            { id: 'mixto' as RouteType, label: 'Mixto / Combinado', desc: 'Consumo base' },
            { id: 'ciudad' as RouteType, label: 'Ciudad / Tráfico', desc: 'Gasta 25% más - tráfico frecuente' },
          ].map((r) => {
            const isSelected = routeType === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onChange({ routeType: r.id })}
                className={`p-3.5 rounded-2xl border-2 text-left transition button-hover-pro cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-blue-50/95 via-sky-50/90 to-indigo-50/85 backdrop-blur-md border-2 border-blue-500 text-slate-900 shadow-md shadow-blue-500/15 ring-2 ring-blue-400/20'
                    : 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-blue-300'
                }`}
              >
                <div className={`text-xs sm:text-sm ${isSelected ? 'font-black text-blue-950' : 'font-bold text-slate-900'}`}>{r.label}</div>
                <div className={`text-[11px] mt-1 ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-500 font-medium'}`}>
                  {r.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Special Adjustments & Switches */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h2 className="text-base font-black text-slate-900">5. Ajustes y Factores Especiales</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* A/C Switch */}
          <button
            type="button"
            onClick={() => onChange({ isACActive: !isACActive })}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition button-hover-pro cursor-pointer ${
              isACActive
                ? 'bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 border-blue-500 text-blue-950 shadow-sm ring-2 ring-blue-400/20'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Snowflake className={`w-5 h-5 ${isACActive ? 'text-blue-600 animate-spin' : 'text-slate-400'}`} />
              <div className="text-left">
                <div className="font-bold text-xs text-slate-900">Aire Acondicionado (A/C)</div>
                <div className="text-[10px] text-slate-600 font-medium">+0.6 L/100km por encendido</div>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${isACActive ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'}`}>
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </div>
          </button>

          {/* Round Trip Switch */}
          <button
            type="button"
            onClick={() => onChange({ isRoundTrip: !isRoundTrip })}
            className={`p-4 rounded-2xl border-2 flex items-center justify-between transition button-hover-pro cursor-pointer ${
              isRoundTrip
                ? 'bg-gradient-to-r from-blue-50 via-sky-50 to-blue-50 border-blue-500 text-blue-950 shadow-sm ring-2 ring-blue-400/20'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <ArrowLeftRight className={`w-5 h-5 ${isRoundTrip ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="text-left">
                <div className="font-bold text-xs text-slate-900">Ida y Vuelta (x2)</div>
                <div className="text-[10px] text-slate-600 font-medium">Duplica la distancia del viaje</div>
              </div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${isRoundTrip ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'}`}>
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </div>
          </button>
        </div>

        {/* Cold start LPG switch */}
        {fuelType === 'lpg' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Flame className="w-5 h-5 text-amber-600 animate-pulse" />
              <div>
                <div className="font-bold text-xs text-amber-950">Arranque en frío (Gasolina inicial para LPG)</div>
                <div className="text-[10px] text-amber-800 font-medium">Agrega 0.3L fijos de gasolina para encendido</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onChange({ coldStartLpg: !coldStartLpg })}
              className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${coldStartLpg ? 'bg-amber-600 justify-end' : 'bg-slate-300 justify-start'}`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        )}
      </div>

      {/* 6. Distance & Price Inputs */}
      <div id="seccion-distancia" className="glass-panel p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 scroll-mt-24">
        {/* Kilometers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              Distancia a Recorrer (km)
            </label>
          </div>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Ingresa los kilómetros"
              value={distanceKm === 0 ? '' : distanceKm}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onChange({ distanceKm: 0 });
                } else {
                  const parsed = parseFloat(val);
                  onChange({ distanceKm: isNaN(parsed) ? 0 : parsed });
                }
              }}
              className="w-full glass-input px-4 py-3 text-lg font-black text-slate-900 focus:outline-none placeholder-slate-400"
            />
            <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-bold">km</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[-10, 10, 50, 100].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onChange({ distanceKm: Math.max(0, (distanceKm || 0) + num) })}
                className="py-1.5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 text-xs font-bold text-slate-800 transition button-hover-pro cursor-pointer shadow-sm"
              >
                {num > 0 ? `+${num}` : num}
              </button>
            ))}
          </div>
        </div>

        {/* Price per Liter */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">
              Precio por Litro ({currentCountryData.moneda})
            </label>
            <span className="text-[10px] text-slate-500 font-bold">
              Defecto: {getFuelDefaultPrice(currentCountryData, fuelType)} {currentCountryData.moneda}/L
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Precio del combustible"
              value={pricePerLiter === 0 ? '' : pricePerLiter}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  onChange({ pricePerLiter: 0 });
                } else {
                  const parsed = parseFloat(val);
                  onChange({ pricePerLiter: isNaN(parsed) ? 0 : parsed });
                }
              }}
              className="w-full glass-input px-4 py-3 text-lg font-black text-slate-900 focus:outline-none placeholder-slate-400"
            />
            <span className="absolute right-4 top-3.5 text-xs text-slate-500 font-bold">
              {currentCountryData.moneda}/L
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChange({ pricePerLiter: getFuelDefaultPrice(currentCountryData, fuelType) })}
              className="py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold transition button-hover-pro cursor-pointer shadow-sm"
            >
              Restablecer Precio Oficial
            </button>
            <div className="flex items-center justify-center text-xs text-slate-500 font-medium">
              Ref. Gasolina: {referenceGasolinePrice} {currentCountryData.moneda}
            </div>
          </div>
        </div>
      </div>

      {/* 7. Route Name / Note */}
      <div className="glass-panel p-4 flex items-center space-x-3">
        <Edit3 className="w-5 h-5 text-blue-600 shrink-0" />
        <div className="flex-1">
          <label className="block text-[11px] font-bold text-slate-600">Nombre o Etiqueta del Viaje</label>
          <input
            type="text"
            value={routeName}
            onChange={(e) => onChange({ routeName: e.target.value })}
            placeholder="Ej. Ruta diaria trabajo, Viaje a la playa..."
            className="w-full bg-transparent border-b border-slate-300 focus:border-blue-600 text-xs font-bold text-slate-900 focus:outline-none py-1"
          />
        </div>
      </div>

      {/* Bottom Sheet Modal for Vehicle Configuration */}
      {selectedVehicleForSheet && sheetData && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedVehicleForSheet(null)}
          />

          <div className="relative z-10 w-full max-w-lg glass-modal p-6 shadow-2xl space-y-6 text-slate-900 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {sheetData.motor}
                  </h3>
                  <p className="text-xs text-slate-500">Personalizar consumo y cilindrada</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVehicleForSheet(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Consumption Slider */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Consumo Mixto Base</span>
                <span className="text-base font-black text-blue-600 font-sans">
                  {tempConsumption.toFixed(1)} L/100km
                </span>
              </div>
              <input
                type="range"
                min={sheetData.min - 1.5}
                max={sheetData.max + 3.0}
                step="0.1"
                value={tempConsumption}
                onChange={(e) => setTempConsumption(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>Mín: {(sheetData.min - 1.5).toFixed(1)} L</span>
                <span>Promedio: {sheetData.base} L</span>
                <span>Máx: {(sheetData.max + 3.0).toFixed(1)} L</span>
              </div>
            </div>

            {/* Custom Engine Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                O ingresa la cilindrada de tu motor (ej. 1.6, 2.0, 3.0)
              </label>
              <input
                type="text"
                value={customEngineVal}
                onChange={(e) => handleEngineChange(e.target.value)}
                placeholder="Ej. 1.8 Litros"
                className="w-full glass-input px-4 py-2.5 text-sm font-bold text-slate-900 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedVehicleForSheet(null)}
                className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyVehicleSheet}
                className="py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs transition cursor-pointer shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar a Calculadora</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
