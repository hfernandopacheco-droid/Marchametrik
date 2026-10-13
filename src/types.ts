export type VehicleType = 'compact' | 'sedan' | 'suv' | 'van' | 'pickup' | 'custom' | string;
export type TransmissionType = 'manual' | 'automatic';
export type FuelType = 'gasolina' | 'diesel' | 'lpg' | 'glp' | 'hibrido' | 'gnc' | string;
export type RouteType = 'carretera' | 'mixto' | 'ciudad';
export type CountryCode = 'PL' | 'CO' | 'US';

export interface CalculatorInputs {
  country: CountryCode;
  vehicleType: VehicleType;
  customBaseConsumption: number;
  transmission: TransmissionType;
  fuelType: FuelType;
  routeType: RouteType;
  distanceKm: number;
  isRoundTrip: boolean;
  isACActive: boolean;
  coldStartLpg: boolean;
  pricePerLiter: number;
  referenceGasolinePrice: number;
  routeName: string;
}

export interface CalculationResult {
  effectiveDistance: number;
  baseConsumption: number;
  finalConsumptionL100: number;
  totalLiters: number;
  fuelCost: number;
  coldStartCost: number;
  totalCostPLN: number;
  costPerKm: number;
  referenceCostPLN: number;
  savingsVsGasoline: number;
  currency: string;
}

export interface SavedTrip {
  id: string;
  date: string;
  routeName: string;
  vehicleType: string;
  transmission: string;
  fuelType: string;
  routeType: string;
  distanceKm: number;
  isRoundTrip: boolean;
  isACActive: boolean;
  coldStartLpg: boolean;
  pricePerLiter: number;
  totalLiters: number;
  totalCostPLN: number;
  costPerKm: number;
  savingsVsGasoline: number;
  startCoords?: { lat: number; lng: number; label?: string };
  destCoords?: { lat: number; lng: number; label?: string };
  country?: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}
