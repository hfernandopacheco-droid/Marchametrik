import React, { useState, useEffect } from 'react';
import { Fuel, DollarSign, TrendingUp, Sparkles, BookmarkPlus, Check, Award, Flame, Settings, X } from 'lucide-react';
import { CalculationResult, CalculatorInputs } from '../types';
import { DATA_PAIS } from '../utils/countryData';

interface ResultsCardProps {
  result: CalculationResult;
  inputs: CalculatorInputs;
  onSaveTrip: () => void;
  isSaved: boolean;
}

export const ResultsCard: React.FC<ResultsCardProps> = ({
  result,
  inputs,
  onSaveTrip,
  isSaved,
}) => {
  const {
    effectiveDistance,
    baseConsumption,
    finalConsumptionL100,
    totalLiters,
    coldStartCost,
    totalCostPLN,
    costPerKm,
    savingsVsGasoline,
  } = result;

  const countryConfig = DATA_PAIS[inputs.country || 'PL'] || DATA_PAIS.PL;
  const currency = result.currency || countryConfig.moneda;

  // Refuel threshold state stored in localStorage
  const [refuelThreshold, setRefuelThreshold] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('litrometrik_refuel_threshold');
      if (stored) return parseFloat(stored);
    } catch (e) {}
    return inputs.country === 'CO' ? 120000 : (inputs.country === 'US' ? 35 : 120);
  });
  const [showThresholdSettings, setShowThresholdSettings] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('litrometrik_refuel_threshold', refuelThreshold.toString());
    } catch (e) {}
  }, [refuelThreshold]);

  const isHighCost = totalCostPLN > refuelThreshold;

  const computeGarrafasLabel = (liters: number) => {
    const garrafas = liters / 5;
    if (garrafas <= 0.4) return 'menos de media garrafa';
    if (garrafas <= 0.8) return 'casi 1 garrafa de 5L';
    if (garrafas <= 1.25) return '1 garrafa de 5L';
    if (garrafas <= 1.75) return '1 garrafa y media';
    if (garrafas <= 2.25) return '2 garrafas';
    if (garrafas <= 2.75) return '2 garrafas y media';
    if (garrafas <= 3.25) return '3 garrafas';
    if (garrafas <= 3.75) return '3 garrafas y media';
    const roundG = Math.round(garrafas * 2) / 2;
    return `${roundG} garrafas de 5L`;
  };

  const transLabel = inputs.transmission === 'automatic' ? 'Auto (1.08)' : 'Manual (1.0)';
  const routeLabel = inputs.routeType === 'carretera' ? 'Carretera (0.85)' : (inputs.routeType === 'ciudad' ? 'Ciudad (1.25)' : 'Mixto (1.0)');
  const acLabel = inputs.isACActive ? ' + A/C (0.6)' : '';
  const formulaText = `Base ${baseConsumption.toFixed(1)} x ${transLabel} x ${routeLabel}${acLabel} = ${finalConsumptionL100.toFixed(2)}`;

  return (
    <div className="glass-panel p-6 sm:p-8 sticky top-28 overflow-hidden text-slate-800 space-y-5">
      
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Resultados del Viaje</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowThresholdSettings(!showThresholdSettings)}
            className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 font-bold border border-slate-300 transition flex items-center space-x-1 button-hover-pro cursor-pointer"
            title="Ajustar límite de alerta de gasto"
          >
            <Settings className="w-3 h-3 text-blue-600" />
            <span>Alerta: {refuelThreshold} {currency}</span>
          </button>
          <span className="text-[10px] px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 font-bold border border-blue-200">
            {inputs.isRoundTrip ? 'Ida y Vuelta (x2)' : 'Trayecto Único'}
          </span>
        </div>
      </div>

      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
        Resumen de Gastos
      </h3>

      {/* Threshold settings drawer if toggled */}
      {showThresholdSettings && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs animate-in fade-in duration-200 space-y-2">
          <div className="flex items-center justify-between text-amber-900 font-bold">
            <span>Configurar Límite de Alerta de Costo</span>
            <button onClick={() => setShowThresholdSettings(false)}><X className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-[11px] text-amber-700">
            Si el costo total del viaje supera este valor, se activará la tarjeta de alerta.
          </p>
          <div className="flex items-center space-x-2 pt-1">
            <input
              type="number"
              value={refuelThreshold}
              onChange={(e) => setRefuelThreshold(parseFloat(e.target.value) || 100)}
              className="w-28 px-3 py-1.5 bg-white border border-amber-400 rounded-xl text-slate-900 font-bold text-center focus:outline-none text-xs"
            />
            <span className="text-amber-900 font-bold">{currency}</span>
          </div>
        </div>
      )}

      {/* Refuel Alert Card when cost exceeds threshold */}
      {isHighCost && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 relative overflow-hidden">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 border border-amber-300">
                <Fuel className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-900">
                  ⚠️ Alerta de Gasto
                </div>
                <div className="text-[11px] text-amber-800">
                  El costo del viaje ({totalCostPLN.toFixed(2)} {currency}) supera tu límite de {refuelThreshold} {currency}.
                </div>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-amber-800 mt-2 bg-white/70 p-2.5 rounded-xl border border-amber-200">
            💡 <strong>Recomendación:</strong> Puedes optimizar ruta o usar velocidad constante en carretera para reducir el gasto.
          </div>
        </div>
      )}

      {/* Big Total Cost Box with Gradient Text */}
      <div className="bg-white/80 border border-slate-200 rounded-2xl p-6 shadow-sm text-center">
        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">
          Dinero Total Estimado
        </div>
        <div className="text-4xl sm:text-5xl font-black title-gradient-pro tracking-tight my-2">
          {totalCostPLN.toFixed(2)} <span className="text-xl font-bold">{currency}</span>
        </div>
        <div className="text-xs text-slate-500 flex items-center justify-center space-x-1">
          <span>Para un recorrido total de</span>
          <strong className="text-slate-900">{effectiveDistance} km</strong>
        </div>
        {coldStartCost > 0 && (
          <div className="mt-2 text-[11px] text-amber-700 flex items-center justify-center space-x-1 font-semibold">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>Incluye arranque en frío (gasolina)</span>
          </div>
        )}
      </div>

      {/* Savings vs Gasoline Box */}
      {inputs.fuelType !== 'gasolina' && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${
          savingsVsGasoline >= 0
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              savingsVsGasoline >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-semibold opacity-80">
                {savingsVsGasoline >= 0 ? 'Ahorro vs Gasolina' : 'Diferencia vs Gasolina'}
              </div>
              <div className="text-base font-black">
                {savingsVsGasoline >= 0 ? `+${savingsVsGasoline.toFixed(2)} ${currency}` : `${savingsVsGasoline.toFixed(2)} ${currency}`}
              </div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-white/80 font-bold uppercase border border-slate-200">
            {savingsVsGasoline >= 0 ? 'Más Económico' : 'Más Costoso'}
          </span>
        </div>
      )}

      {/* 3 Detailed Metrics Cards */}
      <div className="space-y-3">
        {/* 1. Litros Requeridos con Garrafas */}
        <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500 font-semibold">Litros Requeridos</div>
              <div className="text-sm sm:text-base font-black text-slate-900 mt-0.5 leading-snug">
                Combustible a gastar: <span className="text-blue-600 font-sans font-bold">{totalLiters.toFixed(2)} Litros</span>
                <span className="text-xs font-semibold text-slate-500 block mt-0.5">
                  ({computeGarrafasLabel(totalLiters)})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Costo por Kilómetro */}
        <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500 font-semibold">Costo por Kilómetro</div>
              <div className="text-sm sm:text-base font-black text-blue-700 mt-0.5 leading-snug">
                Cada 1 km te cuesta: {costPerKm.toFixed(2)} {currency}
                <span className="text-xs font-bold text-slate-500 block mt-0.5">
                  Cada 10 km = {(costPerKm * 10).toFixed(2)} {currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Consumo Medio Estimado */}
        <div className="bg-white/80 border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-slate-500 font-semibold">Consumo Medio Estimado</div>
              <div className="text-sm sm:text-base font-black text-blue-800 mt-0.5">
                Tu consumo real con tus ajustes: {finalConsumptionL100.toFixed(2)} L/100km
              </div>
              <div className="text-[10px] text-slate-500 font-sans mt-1 pt-1 border-t border-slate-200">
                {formulaText}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Trip Button */}
      <button
        type="button"
        onClick={onSaveTrip}
        className={`w-full mt-4 py-3.5 rounded-2xl font-black text-xs transition flex items-center justify-center space-x-2 shadow-md button-hover-pro cursor-pointer ${
          isSaved
            ? 'bg-emerald-600 text-white shadow-emerald-500/30'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
        }`}
      >
        {isSaved ? (
          <>
            <Check className="w-4 h-4 text-white" />
            <span>¡Viaje Guardado en Historial!</span>
          </>
        ) : (
          <>
            <BookmarkPlus className="w-4 h-4" />
            <span>Guardar Registro (Cloud Firestore)</span>
          </>
        )}
      </button>

    </div>
  );
};
