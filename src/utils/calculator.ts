import { CalculatorInputs, CalculationResult, CountryCode } from '../types';
import { DATA_PAIS } from './countryData';

export interface FuelComparisonItem {
  key: 'gasolina' | 'diesel' | 'glp';
  label: string;
  subLabel: string;
  rateL100: number;
  totalLiters: number;
  pricePerLiter: number;
  totalCost: number;
  percent: number; // 0 - 100 relative to most expensive
  colorHex: string;
  glowClass: string;
  gradientClass: string;
}

export interface DetailedCalculations {
  effectiveDistance: number;
  activeBaseConsumption: number;
  transmissionFactor: number;
  fuelFactor: number;
  routeFactor: number;
  acAddon: number;
  finalConsumptionL100: number;
  totalLiters: number;
  fuelCost: number;
  coldStartCost: number;
  totalCostMoney: number;
  costPerKm: number;
  costPer10Km: number;
  garrafas20L: number;
  currency: string;
  comparativa: {
    gasolina: FuelComparisonItem;
    diesel: FuelComparisonItem;
    glp: FuelComparisonItem;
    maxCost: number;
    savingGlpVsGas: number;
    savingGlpVsDiesel: number;
    percentSavedVsGas: number;
  };
}

/**
 * Helper to obtain the active weighted average fuel price from tanks, custom prices, or defaults.
 */
export function getWeightedFuelPrice(fuelType: string, country: CountryCode = 'PL'): number {
  try {
    const norm = (fuelType || '').toLowerCase();
    const targetKey = (norm === 'lpg' || norm === 'glp')
      ? 'Gas LPG'
      : (norm === 'diesel' || norm === 'diésel')
      ? 'Diésel ON'
      : 'Gasolina Pb95';

    // 1. Check tank in localStorage
    const tanksRaw = localStorage.getItem(`litrometrik_tanks_${country}`);
    if (tanksRaw) {
      const tanks = JSON.parse(tanksRaw);
      const tank = tanks[targetKey];
      if (tank) {
        const bal = Number(tank.balance) || 0;
        const lit = Number(tank.liters) || 0;
        if (lit > 0 && bal > 0) {
          return Math.round((bal / lit) * 100) / 100;
        }
        if (typeof tank.weightedPrice === 'number' && tank.weightedPrice > 0) {
          return Math.round(tank.weightedPrice * 100) / 100;
        }
        if (typeof tank.lastRefuelPrice === 'number' && tank.lastRefuelPrice > 0) {
          return Math.round(tank.lastRefuelPrice * 100) / 100;
        }
      }
    }

    // 2. Check custom fuel prices
    const customRaw = localStorage.getItem('litrometrik_custom_fuel_prices');
    if (customRaw) {
      const custom = JSON.parse(customRaw);
      if (custom && typeof custom[targetKey] === 'number' && custom[targetKey] > 0) {
        return Math.round(custom[targetKey] * 100) / 100;
      }
    }

    // 3. Check active price if active fuel matches
    const activeFuel = localStorage.getItem('litrometrik_active_fuel') || '';
    if (activeFuel === targetKey) {
      const activeP = parseFloat(localStorage.getItem('fuel_price_per_liter') || '');
      if (!isNaN(activeP) && activeP > 0) return Math.round(activeP * 100) / 100;
    }
  } catch (_) {}

  // 4. Default fallback from DATA_PAIS
  const countryConfig = DATA_PAIS[country] || DATA_PAIS.PL;
  const norm = (fuelType || '').toLowerCase();
  if (norm === 'diesel' || norm === 'diésel') return countryConfig.preciosDefecto.diesel;
  if (norm === 'lpg' || norm === 'glp') return countryConfig.preciosDefecto.lpg;
  return countryConfig.preciosDefecto.gasolina;
}

/**
 * Pure reactive calculation engine.
 * Guarantees zero stale closures and immediate real-time sync across all inputs.
 */
export function calculateDetailedTrip(inputs: CalculatorInputs): DetailedCalculations {
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
  } = inputs;

  const countryConfig = DATA_PAIS[country] || DATA_PAIS.PL;
  const currency = countryConfig.moneda;

  // 1. Base consumption
  let activeBaseConsumption = 8.5;
  if (customBaseConsumption && customBaseConsumption > 0) {
    activeBaseConsumption = customBaseConsumption;
  } else {
    switch (vehicleType) {
      case 'compact':
        activeBaseConsumption = 6.0;
        break;
      case 'sedan':
        activeBaseConsumption = 8.5;
        break;
      case 'suv':
        activeBaseConsumption = 10.5;
        break;
      case 'van':
        activeBaseConsumption = 9.8;
        break;
      case 'pickup':
        activeBaseConsumption = 10.5;
        break;
      case 'custom':
        activeBaseConsumption = 8.0;
        break;
      default:
        activeBaseConsumption = 8.5;
        break;
    }
  }

  // 2. Multipliers
  const transmissionFactor = transmission === 'automatic' ? 1.08 : 1.0;

  let fuelFactor = 1.0;
  if (fuelType === 'diesel') fuelFactor = 0.85;
  else if (fuelType === 'lpg' || fuelType === 'glp') fuelFactor = 1.20;
  else if (fuelType === 'hibrido') fuelFactor = 0.75;
  else if (fuelType === 'gnc') fuelFactor = 0.90;
  else fuelFactor = 1.0;

  let routeFactor = 1.0;
  if (routeType === 'carretera') routeFactor = 0.85;
  else if (routeType === 'ciudad') routeFactor = 1.25;
  else routeFactor = 1.0;

  const acAddon = isACActive ? 0.6 : 0.0;

  // 3. Effective distance (Trip legs)
  const legs = isRoundTrip ? 2 : 1;
  const effectiveDistance = Math.max(0, distanceKm || 0) * legs;

  // 4. Final consumption for currently selected setup
  const finalConsumptionL100 = (activeBaseConsumption * transmissionFactor * fuelFactor * routeFactor) + acAddon;
  const totalLiters = (effectiveDistance * finalConsumptionL100) / 100;

  // Active price: uses pricePerLiter if specified > 0, else loads weighted price for current fuel
  const fallbackWeightedPrice = getWeightedFuelPrice(fuelType, country);
  const activePrice = pricePerLiter > 0 ? pricePerLiter : fallbackWeightedPrice;
  // Multiplicación directa de gasto de combustible
  const fuelCost = totalLiters * activePrice;

  // 5. Cold start for LPG (0.3L gasoline per leg)
  const isLpgSelected = fuelType === 'lpg' || fuelType === 'glp';
  const defaultGasPrice = getWeightedFuelPrice('gasolina', country);
  const gasPriceToUse = referenceGasolinePrice > 0 ? referenceGasolinePrice : defaultGasPrice;

  const coldStartCost = isLpgSelected && coldStartLpg ? 0.3 * gasPriceToUse * legs : 0;
  const totalCostMoney = fuelCost + coldStartCost;
  const costPerKm = effectiveDistance > 0 ? totalCostMoney / effectiveDistance : 0;
  const costPer10Km = costPerKm * 10;
  const garrafas20L = totalLiters / 20;

  // 6. LIVE COMPARISON ENGINE (Gasolina Pb95 vs Diésel ON vs Gas LPG)
  // For each fuel, determine realistic price:
  // If the user currently has this fuel selected, use strictly pricePerLiter (the input value!).
  // If not, use the fuel's active weighted average tank price.
  const isGasSelected = fuelType === 'gasolina';
  const isDieSelected = fuelType === 'diesel';

  const weightedGas = getWeightedFuelPrice('gasolina', country);
  const weightedDie = getWeightedFuelPrice('diesel', country);
  const weightedLpg = getWeightedFuelPrice('lpg', country);

  const priceGas = isGasSelected && pricePerLiter > 0 ? pricePerLiter : weightedGas;
  const priceDie = isDieSelected && pricePerLiter > 0 ? pricePerLiter : weightedDie;
  const priceGlp = isLpgSelected && pricePerLiter > 0 ? pricePerLiter : weightedLpg;

  // Fuel 1: Gasolina Pb95 (factor x1.0)
  const rateGas = (activeBaseConsumption * transmissionFactor * 1.0 * routeFactor) + acAddon;
  const litGas = (effectiveDistance * rateGas) / 100;
  // Multiplicación directa: costoEstimado = litrosTeoricosCalculados * precioPorLitroInput
  const costGas = litGas * priceGas;

  // Fuel 2: Diésel ON (factor x0.85)
  const rateDie = (activeBaseConsumption * transmissionFactor * 0.85 * routeFactor) + acAddon;
  const litDie = (effectiveDistance * rateDie) / 100;
  // Multiplicación directa: costoEstimado = litrosTeoricosCalculados * precioPorLitroInput
  const costDie = litDie * priceDie;

  // Fuel 3: Gas LPG (factor x1.20)
  const rateGlp = (activeBaseConsumption * transmissionFactor * 1.20 * routeFactor) + acAddon;
  const litGlp = (effectiveDistance * rateGlp) / 100;
  const coldStartGlp = coldStartLpg ? 0.3 * priceGas * legs : 0;
  // Multiplicación directa: costoEstimado = litrosTeoricosCalculados * precioPorLitroInput
  const costGlp = (litGlp * priceGlp) + coldStartGlp;

  // Maximum cost for scale
  const maxCost = Math.max(costGas, costDie, costGlp, 0.01);

  const pctGas = Math.min(100, Math.max(12, Math.round((costGas / maxCost) * 100)));
  const pctDie = Math.min(100, Math.max(12, Math.round((costDie / maxCost) * 100)));
  const pctGlp = Math.min(100, Math.max(12, Math.round((costGlp / maxCost) * 100)));

  const savingGlpVsGas = Math.max(0, costGas - costGlp);
  const savingGlpVsDiesel = Math.max(0, costDie - costGlp);
  const percentSavedVsGas = costGas > 0 ? Math.round((savingGlpVsGas / costGas) * 100) : 0;

  const itemGasolina: FuelComparisonItem = {
    key: 'gasolina',
    label: countryConfig.etiquetasCombustible?.gasolina || 'Gasolina Pb95',
    subLabel: 'Consumo Estándar x1.0',
    rateL100: rateGas,
    totalLiters: litGas,
    pricePerLiter: priceGas,
    totalCost: costGas,
    percent: pctGas,
    colorHex: '#FF6B00',
    glowClass: 'shadow-[0_0_15px_rgba(255,107,0,0.45)]',
    gradientClass: 'bg-gradient-to-r from-[#FF4F00] via-[#FF6B00] to-[#FFA000]',
  };

  const itemDiesel: FuelComparisonItem = {
    key: 'diesel',
    label: countryConfig.etiquetasCombustible?.diesel || 'Diésel ON',
    subLabel: '-15% Consumo en Ruta',
    rateL100: rateDie,
    totalLiters: litDie,
    pricePerLiter: priceDie,
    totalCost: costDie,
    percent: pctDie,
    colorHex: '#00B4D8',
    glowClass: 'shadow-[0_0_15px_rgba(0,180,216,0.45)]',
    gradientClass: 'bg-gradient-to-r from-[#0077B6] via-[#00B4D8] to-[#90E0EF]',
  };

  const itemGlp: FuelComparisonItem = {
    key: 'glp',
    label: countryConfig.etiquetasCombustible?.lpg || 'Gas LPG / Autogas',
    subLabel: 'Máximo Ahorro Económico',
    rateL100: rateGlp,
    totalLiters: litGlp,
    pricePerLiter: priceGlp,
    totalCost: costGlp,
    percent: pctGlp,
    colorHex: '#10B981',
    glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]',
    gradientClass: 'bg-gradient-to-r from-[#059669] via-[#10B981] to-[#34D399]',
  };

  return {
    effectiveDistance,
    activeBaseConsumption,
    transmissionFactor,
    fuelFactor,
    routeFactor,
    acAddon,
    finalConsumptionL100,
    totalLiters,
    fuelCost,
    coldStartCost,
    totalCostMoney,
    costPerKm,
    costPer10Km,
    garrafas20L,
    currency,
    comparativa: {
      gasolina: itemGasolina,
      diesel: itemDiesel,
      glp: itemGlp,
      maxCost,
      savingGlpVsGas,
      savingGlpVsDiesel,
      percentSavedVsGas,
    },
  };
}

/**
 * Backwards compatibility wrapper for calculateTrip
 */
export function calculateTrip(inputs: CalculatorInputs): CalculationResult {
  const d = calculateDetailedTrip(inputs);
  return {
    effectiveDistance: d.effectiveDistance,
    baseConsumption: d.activeBaseConsumption,
    finalConsumptionL100: d.finalConsumptionL100,
    totalLiters: d.totalLiters,
    fuelCost: d.fuelCost,
    coldStartCost: d.coldStartCost,
    totalCostPLN: d.totalCostMoney,
    costPerKm: d.costPerKm,
    referenceCostPLN: d.comparativa.gasolina.totalCost,
    savingsVsGasoline: d.comparativa.savingGlpVsGas,
    currency: d.currency,
  };
}

/**
 * Global regional currency formatter:
 * - Colombia (CO): Zero decimals, Math.round(), dot thousands separator, e.g. "$99.994 COP", "$120.000 COP", "$2.800 COP/L".
 * - Poland (PL): 2 decimals with comma, e.g. "93,82 PLN", "3,15 PLN/L".
 * - United States (US): 2 decimals with dot, e.g. "$3.50 USD", "$3.50 USD/gal".
 */
export function formatCurrency(
  amount: number,
  countryCode: CountryCode = 'PL',
  options?: {
    isPerUnit?: boolean;
    unit?: string;
  }
): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const isPerUnit = !!options?.isPerUnit;
  const defaultUnit = countryCode === 'US' ? 'gal' : 'L';
  const unitName = options?.unit || defaultUnit;
  const unitSuffix = isPerUnit ? `/${unitName}` : '';

  if (countryCode === 'CO') {
    const rounded = Math.round(num);
    const formatted = rounded.toLocaleString('es-CO', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).replace(/,/g, '.');
    return `$${formatted} COP${unitSuffix}`;
  }

  if (countryCode === 'US') {
    const formatted = num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `$${formatted} USD${unitSuffix}`;
  }

  // Poland (PL) default
  const formatted = num.toFixed(2).replace('.', ',');
  return `${formatted} PLN${unitSuffix}`;
}

/**
 * Regional number-only formatter for monetary amounts without currency symbols
 */
export function formatCurrencyNumber(
  amount: number,
  countryCode: CountryCode = 'PL'
): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  if (countryCode === 'CO') {
    return Math.round(num).toLocaleString('es-CO', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).replace(/,/g, '.');
  }
  if (countryCode === 'US') {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return num.toFixed(2).replace('.', ',');
}
