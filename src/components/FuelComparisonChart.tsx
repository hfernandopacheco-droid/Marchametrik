import React from 'react';
import { CalculatorInputs } from '../types';
import { DATA_PAIS } from '../utils/countryData';
import { BarChart3, TrendingDown, Sparkles } from 'lucide-react';

interface FuelComparisonChartProps {
  inputs: CalculatorInputs;
}

export const FuelComparisonChart: React.FC<FuelComparisonChartProps> = ({ inputs }) => {
  const {
    country = 'PL',
    customBaseConsumption,
    vehicleType,
    transmission,
    routeType,
    distanceKm,
    isRoundTrip,
    isACActive,
    coldStartLpg,
  } = inputs;

  const countryConfig = DATA_PAIS[country] || DATA_PAIS.PL;
  const currency = countryConfig.moneda;

  // Base consumption
  let baseConsumption = 8.5;
  if (customBaseConsumption && customBaseConsumption > 0) {
    baseConsumption = customBaseConsumption;
  } else {
    switch (vehicleType) {
      case 'compact': baseConsumption = countryConfig.Compacto.base; break;
      case 'sedan': baseConsumption = countryConfig.Sedan.base; break;
      case 'suv': baseConsumption = countryConfig.SUV.base; break;
      case 'custom': baseConsumption = 8.0; break;
    }
  }

  const transmissionFactor = transmission === 'automatic' ? 1.08 : 1.0;
  let routeFactor = 1.0;
  if (routeType === 'carretera') routeFactor = 0.85;
  else if (routeType === 'mixto') routeFactor = 1.0;
  else if (routeType === 'ciudad') routeFactor = 1.25;

  const effectiveDistance = Math.max(0, distanceKm) * (isRoundTrip ? 2 : 1);
  const acAddon = isACActive ? 0.6 : 0.0;

  const priceGas = inputs.fuelType === 'gasolina' && inputs.pricePerLiter > 0
    ? inputs.pricePerLiter
    : (inputs.referenceGasolinePrice && inputs.referenceGasolinePrice > 0 ? inputs.referenceGasolinePrice : countryConfig.preciosDefecto.gasolina);
  
  const priceDiesel = inputs.fuelType === 'diesel' && inputs.pricePerLiter > 0
    ? inputs.pricePerLiter
    : countryConfig.preciosDefecto.diesel;

  const priceLpg = inputs.fuelType === 'lpg' && inputs.pricePerLiter > 0
    ? inputs.pricePerLiter
    : countryConfig.preciosDefecto.lpg;

  const l100Gas = (baseConsumption * 1.0 * transmissionFactor * routeFactor) + acAddon;
  const l100Diesel = (baseConsumption * 0.85 * transmissionFactor * routeFactor) + acAddon;
  const l100Lpg = (baseConsumption * 1.20 * transmissionFactor * routeFactor) + acAddon;

  const litersGas = (effectiveDistance / 100) * l100Gas;
  const litersDiesel = (effectiveDistance / 100) * l100Diesel;
  const litersLpg = (effectiveDistance / 100) * l100Lpg;

  const coldStartGasLiters = coldStartLpg ? 0.3 * (isRoundTrip ? 2 : 1) : 0;
  const coldStartCost = coldStartGasLiters * priceGas;

  const costGas = litersGas * priceGas;
  const costDiesel = litersDiesel * priceDiesel;
  const costLpg = (litersLpg * priceLpg) + coldStartCost;

  const maxCost = Math.max(costGas, costDiesel, costLpg, 1);

  let savingsText = '';
  if (inputs.fuelType === 'lpg') {
    const diff = costGas - costLpg;
    savingsText = diff > 0 
      ? `Con Autogás (LPG) ahorras aprox. ${diff.toFixed(2)} ${currency} frente a Gasolina en este viaje.`
      : `El costo es similar al de gasolina en esta distancia corta.`;
  } else if (inputs.fuelType === 'diesel') {
    const diff = costGas - costDiesel;
    savingsText = diff > 0
      ? `Con Diésel ahorras aprox. ${diff.toFixed(2)} ${currency} frente a Gasolina en este viaje.`
      : `El consumo es equivalente según los precios actuales.`;
  } else {
    const diffLpg = costGas - costLpg;
    savingsText = diffLpg > 0
      ? `Si usaras LPG podrías ahorrar hasta ${diffLpg.toFixed(2)} ${currency} en este mismo trayecto.`
      : `Gasolina es tu combustible seleccionado.`;
  }

  const items = [
    {
      id: 'gasolina',
      name: countryConfig.etiquetasCombustible.gasolina,
      cost: costGas,
      liters: litersGas,
      price: priceGas,
      detailText: `${litersGas.toFixed(2)}L x ${priceGas.toFixed(2)} ${currency}/L`,
      barColor: 'from-blue-500 to-indigo-600',
      isCurrent: inputs.fuelType === 'gasolina',
    },
    {
      id: 'diesel',
      name: countryConfig.etiquetasCombustible.diesel,
      cost: costDiesel,
      liters: litersDiesel,
      price: priceDiesel,
      detailText: `${litersDiesel.toFixed(2)}L x ${priceDiesel.toFixed(2)} ${currency}/L`,
      barColor: 'from-cyan-500 to-blue-600',
      isCurrent: inputs.fuelType === 'diesel',
    },
    {
      id: 'lpg',
      name: countryConfig.etiquetasCombustible.lpg,
      cost: costLpg,
      liters: litersLpg,
      price: priceLpg,
      detailText: coldStartLpg
        ? `${litersLpg.toFixed(2)}L LPG + ${coldStartGasLiters}L arranque`
        : `${litersLpg.toFixed(2)}L x ${priceLpg.toFixed(2)} ${currency}/L`,
      barColor: 'from-emerald-500 to-teal-600',
      isCurrent: inputs.fuelType === 'lpg',
    },
  ];

  return (
    <div className="glass-panel p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>Comparativa Avanzada de Costos</span>
              <Sparkles className="w-4 h-4 text-blue-600" />
            </h2>
            <p className="text-xs text-slate-500">
              Precios reales según combustible en {countryConfig.nombre} ({countryConfig.moneda})
            </p>
          </div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 bg-white border border-slate-200 rounded-full text-slate-700 shadow-sm">
          {countryConfig.bandera} {countryConfig.moneda}
        </span>
      </div>

      {/* Visual Bars Container */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 my-4 items-end pt-4 pb-2">
        {items.map((item) => {
          const heightPercent = Math.max(22, Math.round((item.cost / maxCost) * 100));

          return (
            <div key={item.id} className="flex flex-col items-center text-center">
              {/* Cost Above Bar */}
              <div className="mb-2">
                <span className="text-xs sm:text-sm font-black text-slate-900 block">
                  {item.cost.toFixed(2)} {currency}
                </span>
                {item.isCurrent && (
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full border border-blue-200 inline-block mt-0.5">
                    Tu elección
                  </span>
                )}
              </div>

              {/* Bar Container */}
              <div className="w-full bg-slate-100 rounded-2xl p-1.5 border border-slate-200 flex flex-col justify-end h-36 relative overflow-hidden shadow-inner">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full bg-gradient-to-t ${item.barColor} rounded-xl shadow-md transition-all duration-500`}
                />
              </div>

              {/* Liters x Price Underneath */}
              <div className="mt-2 text-center w-full">
                <div className="text-[11px] font-black text-slate-900 truncate">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5 leading-tight truncate" title={item.detailText}>
                  {item.detailText}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Savings Highlight Box */}
      <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center space-x-3 text-xs text-blue-950">
        <TrendingDown className="w-5 h-5 text-blue-600 shrink-0" />
        <span className="font-bold leading-relaxed">
          {savingsText}
        </span>
      </div>
    </div>
  );
};
