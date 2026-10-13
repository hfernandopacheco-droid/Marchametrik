import { CountryCode } from './countryData';

export interface UnifiedEngineSpec {
  id: string;
  key: string; // alias to id
  nombreComun: string;
  name: string; // alias to nombreComun
  cc: string;
  displacement: string; // alias to cc
  cilindrosPotencia: string;
  powerCV: string; // alias to cilindrosPotencia
  descripcionBreve: string;
  description: string; // alias to descripcionBreve
  detalleInfo: {
    tipoManejo: string;
    ejemplosAutos: string[];
    rendimientoYCombustible: string;
  };
  consumoBaseL100: number;
  baseL100: number; // alias to consumoBaseL100
  fuelRecommendation?: string;
}

export interface UnifiedVehicleCategory {
  type: 'compact' | 'sedan' | 'suv' | 'pickup' | 'van' | 'custom';
  label: string;
  shortLabel: string;
  defaultBaseL100: number;
  icon: string;
  engines: UnifiedEngineSpec[];
  description: string;
}

/**
 * Función auxiliar para formatear la economía de combustible según el país.
 * - Polonia (PL): 'X,X L/100 km'
 * - Colombia (CO): 'X,X km/L' (100 / L_100km)
 * - Estados Unidos (US): 'X.X MPG' (235.215 / L_100km)
 */
export function formatFuelEconomy(l100km: number, countryCode: CountryCode | string = 'PL'): string {
  if (isNaN(l100km) || l100km <= 0) {
    if (countryCode === 'US') return '0.0 MPG';
    if (countryCode === 'CO') return '0,0 km/L';
    return '0,0 L/100 km';
  }
  if (countryCode === 'US') {
    const mpg = 235.215 / l100km;
    return `${mpg.toFixed(1)} MPG`;
  }
  if (countryCode === 'CO') {
    const kmL = 100 / l100km;
    return `${kmL.toFixed(1).replace('.', ',')} km/L`;
  }
  return `${l100km.toFixed(1).replace('.', ',')} L/100 km`;
}

/**
 * Adapta el nombre del combustible principal según el país.
 * - Polonia (PL): 'LPG / Autogaz', 'Benzyna / Gasolina', 'Diesel / ON'
 * - Colombia (CO): 'Gas GLP / Gas Vehicular', 'Gasolina Corriente / Extra', 'Diésel / ACPM'
 * - Estados Unidos (US): 'LPG / Propane', 'Gasoline (Regular / Premium)', 'Diesel'
 */
export function getFuelDisplayName(fuel: string, countryCode: CountryCode | string = 'PL'): string {
  const f = (fuel || '').toLowerCase();
  if (f.includes('lpg') || f.includes('glp') || f.includes('gas') || f.includes('autogaz') || f.includes('propane')) {
    if (countryCode === 'CO') return 'Gas GLP / Gas Vehicular';
    if (countryCode === 'US') return 'LPG / Propane';
    return 'LPG / Autogaz';
  }
  if (f.includes('diesel') || f.includes('diésel') || f.includes('on') || f.includes('acpm')) {
    if (countryCode === 'CO') return 'Diésel / ACPM';
    if (countryCode === 'US') return 'Diesel';
    return 'Diesel / ON';
  }
  if (countryCode === 'CO') return 'Gasolina Corriente / Extra';
  if (countryCode === 'US') return 'Gasoline (Regular / Premium)';
  return 'Benzyna / Gasolina';
}

export function getFuelShortLabel(fuel: string, countryCode: CountryCode | string = 'PL'): string {
  const f = (fuel || '').toLowerCase();
  if (f.includes('lpg') || f.includes('glp') || f.includes('gas') || f.includes('autogaz') || f.includes('propane')) {
    if (countryCode === 'CO') return 'Gas GLP';
    if (countryCode === 'US') return 'LPG / Propane';
    return 'LPG';
  }
  if (f.includes('diesel') || f.includes('diésel') || f.includes('on') || f.includes('acpm')) {
    if (countryCode === 'CO') return 'Diésel';
    if (countryCode === 'US') return 'Diesel';
    return 'Diesel';
  }
  if (countryCode === 'CO') return 'Gasolina';
  if (countryCode === 'US') return 'Gasoline';
  return 'Benzyna';
}

/**
 * Ejemplos de autos para los 3 combustibles disponibles según país
 */
export function getCountryFuelExamples(countryCode: CountryCode | string = 'PL'): {
  gasolinaNombre: string;
  lpgNombre: string;
  dieselNombre: string;
  gasolinaAutos: string[];
  lpgAutos: string[];
  dieselAutos: string[];
} {
  if (countryCode === 'CO') {
    return {
      gasolinaNombre: 'Gasolina Corriente / Extra',
      lpgNombre: 'Gas GLP / Gas Vehicular',
      dieselNombre: 'Diésel / ACPM',
      gasolinaAutos: ['Renault Logan / Sandero 1.6', 'Chevrolet Spark GT / Onix Turbo', 'Kia Picanto 1.25', 'Mazda 2 / Mazda 3', 'Toyota Corolla 2.0'],
      lpgAutos: ['Renault Logan / Sandero a Gas GLP', 'Chevrolet Spark / Aveo Gas GLP', 'Taxis e utilitarios convertidos', 'Conversión vehicular GLP con tanque toroidal'],
      dieselAutos: ['Toyota Hilux / Prado Diésel', 'Renault Duster 1.5 dCi Diésel', 'Chevrolet D-Max 2.5 / 3.0 TD', 'Vans de reparto Diésel / ACPM'],
    };
  }
  if (countryCode === 'US') {
    return {
      gasolinaNombre: 'Gasoline (Regular / Premium)',
      lpgNombre: 'LPG / Propane',
      dieselNombre: 'Diesel',
      gasolinaAutos: ['Ford F-150 EcoBoost / 5.0L V8', 'Toyota Camry / RAV4', 'Honda Civic / Accord Turbo', 'Chevy Silverado 5.3L V8'],
      lpgAutos: ['Ford F-Series Bi-Fuel (Propane)', 'Chevrolet Express LPG Fleet Vans', 'Blue Bird Propane Autogas', 'Flotas comerciales e institucionales'],
      dieselAutos: ['RAM 1500 EcoDiesel 3.0L', 'Ford Super Duty PowerStroke 6.7L', 'Chevy Silverado Duramax 3.0L / 6.6L', 'GMC Sierra Turbo-Diesel'],
    };
  }
  // Poland (PL)
  return {
    gasolinaNombre: 'Benzyna / Gasolina (Pb95/Pb98)',
    lpgNombre: 'LPG / Autogaz',
    dieselNombre: 'Diesel / ON',
    gasolinaAutos: ['Škoda Octavia 1.6 MPI / 1.4 TSI', 'Opel Astra 1.4T / 1.6', 'Volkswagen Golf 1.4 / 1.6 / 2.0', 'Toyota Yaris / Corolla'],
    lpgAutos: ['Škoda Octavia 1.6 MPI (LPG)', 'Dacia Duster 1.0 ECO-G LPG', 'Opel Astra 1.4 Turbo LPG', 'Fiat Tipo 1.4 T-Jet LPG de fábrica'],
    dieselAutos: ['Volkswagen Passat 2.0 TDI', 'Ford Focus 1.6 / 2.0 TDCi', 'Audi A4 2.0 TDI', 'BMW 320d / Škoda Superb 2.0 TDI'],
  };
}

/**
 * CATÁLOGO ESTANDARIZADO DE VEHÍCULOS Y MOTORES
 * Definición centralizada sin tecnicismos mecánicos complejos.
 * Fuente única de verdad sincronizada para:
 * 1. Modo de Marcha (Panel de Conducción y Dashboard)
 * 2. Calculadora de Combustible y Rutas
 * 3. Garaje y Diagnóstico
 * 4. Perfil de Conductor y Telemetría
 */
export function getVehicleCatalogForCountry(countryCode: CountryCode | string = 'PL'): Record<string, UnifiedVehicleCategory> {
  if (countryCode === 'CO') {
    return {
      compact: {
        type: 'compact',
        label: 'Hatchback',
        shortLabel: 'Hatchback',
        icon: '🚗',
        defaultBaseL100: 5.4,
        description: 'Carros pequeños y ágiles para trancones de Bogotá, Medellín y Cali',
        engines: [
          {
            id: 'co_comp_10_eco',
            key: 'co_comp_10_eco',
            nombreComun: '1.0L - 1.2L Económico',
            name: '1.0L - 1.2L Económico',
            cc: '999 - 1.199 cc',
            displacement: '999 - 1.199 cc',
            cilindrosPotencia: '3 o 4 Cilindros · 75 - 90 HP',
            powerCV: '75 - 90 HP',
            descripcionBreve: 'Motor de bajo cilindraje ahorrador en ciudad y fácil de tanquear.',
            description: 'Motor de bajo cilindraje ahorrador en ciudad y fácil de tanquear.',
            detalleInfo: {
              tipoManejo: 'Manejo urbano diario en ciudad con mínimo consumo.',
              ejemplosAutos: ['Renault Kwid 1.0', 'Kia Picanto 1.0-1.25', 'Chevrolet Spark GT 1.2'],
              rendimientoYCombustible: 'Rendimiento mixto ~18,5 km/L (5,4 L/100 km). Gasolina Corriente y Gas GLP.',
            },
            consumoBaseL100: 5.4,
            baseL100: 5.4,
            fuelRecommendation: 'Gasolina / Gas GLP',
          },
          {
            id: 'co_comp_16_std',
            key: 'co_comp_16_std',
            nombreComun: '1.6L Estándar',
            name: '1.6L Estándar',
            cc: '1.598 cc',
            displacement: '1.598 cc',
            cilindrosPotencia: '4 Cilindros · 105 - 115 HP',
            powerCV: '105 - 115 HP',
            descripcionBreve: 'Motor probado con buena fuerza para subidas y sobrepasos.',
            description: 'Motor probado con buena fuerza para subidas y sobrepasos.',
            detalleInfo: {
              tipoManejo: 'Uso mixto ciudad y carretera de montaña.',
              ejemplosAutos: ['Chevrolet Onix 1.4', 'Renault Sandero 1.6', 'Volkswagen Gol 1.6'],
              rendimientoYCombustible: 'Rendimiento promedio ~16,1 km/L (6,2 L/100 km).',
            },
            consumoBaseL100: 6.2,
            baseL100: 6.2,
            fuelRecommendation: 'Gasolina / Gas GLP',
          },
          {
            id: 'co_comp_diesel',
            key: 'co_comp_diesel',
            nombreComun: 'Diésel Turbo',
            name: 'Diésel Turbo',
            cc: '1.461 cc',
            displacement: '1.461 cc',
            cilindrosPotencia: '4 Cilindros Turbodiésel · 90 - 110 HP',
            powerCV: '90 - 110 HP',
            descripcionBreve: 'Motor turbodiésel de alto rendimiento y torque para carretera.',
            description: 'Motor turbodiésel de alto rendimiento y torque para carretera.',
            detalleInfo: {
              tipoManejo: 'Carretera y recorridos largos de bajo costo por kilómetro.',
              ejemplosAutos: ['Renault Sandero Stepway dCi', 'Peugeot 208 HDi'],
              rendimientoYCombustible: 'Rendimiento promedio ~19,2 km/L (5,2 L/100 km). Diésel / ACPM.',
            },
            consumoBaseL100: 5.2,
            baseL100: 5.2,
            fuelRecommendation: 'Diésel / ACPM',
          },
          {
            id: 'co_comp_custom',
            key: 'co_comp_custom',
            nombreComun: 'Personalizado de Tablero',
            name: 'Personalizado de Tablero',
            cc: 'Ajuste manual',
            displacement: 'Ajuste manual',
            cilindrosPotencia: 'Calibración de usuario',
            powerCV: 'Calibración de usuario',
            descripcionBreve: 'Consumo calibrado en computador de a bordo.',
            description: 'Consumo calibrado en computador de a bordo.',
            detalleInfo: {
              tipoManejo: 'Personalizado para tu vehículo.',
              ejemplosAutos: ['Cualquier hatchback'],
              rendimientoYCombustible: 'Configuración directa.',
            },
            consumoBaseL100: 5.8,
            baseL100: 5.8,
          },
        ],
      },
      sedan: {
        type: 'sedan',
        label: 'Sedán',
        shortLabel: 'Sedán',
        icon: '🚘',
        defaultBaseL100: 7.2,
        description: 'Carros familiares para ciudad, autopistas y subidas de cordillera',
        engines: [
          {
            id: 'co_sedan_16_std',
            key: 'co_sedan_16_std',
            nombreComun: '1.6L Estándar',
            name: '1.6L Estándar',
            cc: '1.598 cc',
            displacement: '1.598 cc',
            cilindrosPotencia: '4 Cilindros · 106 - 118 HP',
            powerCV: '106 - 118 HP',
            descripcionBreve: 'Motor familiar confiable, repuestos económicos y compatible con gas GLP.',
            description: 'Motor familiar confiable, repuestos económicos y compatible con gas GLP.',
            detalleInfo: {
              tipoManejo: 'Uso diario familiar y viajes por carretera.',
              ejemplosAutos: ['Nissan Versa 1.6', 'Renault Logan 1.6', 'Chevrolet Aveo / Sail 1.5'],
              rendimientoYCombustible: 'Consumo promedio ~13,9 km/L (7,2 L/100 km). Gasolina y Gas GLP.',
            },
            consumoBaseL100: 7.2,
            baseL100: 7.2,
            fuelRecommendation: 'Gasolina / Gas GLP',
          },
          {
            id: 'co_sedan_20_med',
            key: 'co_sedan_20_med',
            nombreComun: '2.0L Mediano',
            name: '2.0L Mediano',
            cc: '1.998 cc',
            displacement: '1.998 cc',
            cilindrosPotencia: '4 Cilindros · 150 - 165 HP',
            powerCV: '150 - 165 HP',
            descripcionBreve: 'Marcha suave con excelente respuesta para ascensos y adelantamientos.',
            description: 'Marcha suave con excelente respuesta para ascensos y adelantamientos.',
            detalleInfo: {
              tipoManejo: 'Viajes intermunicipales con maletero lleno y confort.',
              ejemplosAutos: ['Mazda 3 2.0', 'Toyota Corolla 2.0', 'Volkswagen Jetta 2.0'],
              rendimientoYCombustible: 'Consumo promedio ~12,2 km/L (8,2 L/100 km).',
            },
            consumoBaseL100: 8.2,
            baseL100: 8.2,
            fuelRecommendation: 'Gasolina / Gas GLP',
          },
          {
            id: 'co_sedan_25_pot',
            key: 'co_sedan_25_pot',
            nombreComun: '2.5L+ Potente',
            name: '2.5L+ Potente',
            cc: '2.488 cc',
            displacement: '2.488 cc',
            cilindrosPotencia: '4 o 6 Cilindros · 185 - 250 HP',
            powerCV: '185 - 250 HP',
            descripcionBreve: 'Alta cilindrada y aceleración para sedanes de representación.',
            description: 'Alta cilindrada y aceleración para sedanes de representación.',
            detalleInfo: {
              tipoManejo: 'Autopistas y velocidad sostenida.',
              ejemplosAutos: ['Toyota Camry 2.5', 'Mazda 6 2.5', 'Ford Fusion 2.0-2.5'],
              rendimientoYCombustible: 'Consumo promedio ~10,2 km/L (9,8 L/100 km).',
            },
            consumoBaseL100: 9.8,
            baseL100: 9.8,
            fuelRecommendation: 'Gasolina',
          },
          {
            id: 'co_sedan_diesel',
            key: 'co_sedan_diesel',
            nombreComun: 'Diésel Turbo',
            name: 'Diésel Turbo',
            cc: '1.968 cc',
            displacement: '1.968 cc',
            cilindrosPotencia: '4 Cilindros Turbodiésel · 140 - 150 HP',
            powerCV: '140 - 150 HP',
            descripcionBreve: 'Motor diésel con alto torque a bajas revoluciones para montaña.',
            description: 'Motor diésel con alto torque a bajas revoluciones para montaña.',
            detalleInfo: {
              tipoManejo: 'Rutas largas y autopistas con gran ahorro.',
              ejemplosAutos: ['Volkswagen Bora / Jetta TDI', 'BMW 320d'],
              rendimientoYCombustible: 'Consumo promedio ~16,7 km/L (6,0 L/100 km).',
            },
            consumoBaseL100: 6.0,
            baseL100: 6.0,
            fuelRecommendation: 'Diésel / ACPM',
          },
          {
            id: 'co_sedan_custom',
            key: 'co_sedan_custom',
            nombreComun: 'Personalizado de Tablero',
            name: 'Personalizado de Tablero',
            cc: 'Ajuste manual',
            displacement: 'Ajuste manual',
            cilindrosPotencia: 'Calibración de usuario',
            powerCV: 'Calibración de usuario',
            descripcionBreve: 'Consumo calibrado.',
            description: 'Consumo calibrado.',
            detalleInfo: {
              tipoManejo: 'Personalizado.',
              ejemplosAutos: ['Cualquier sedán'],
              rendimientoYCombustible: 'Configuración directa.',
            },
            consumoBaseL100: 7.5,
            baseL100: 7.5,
          },
        ],
      },
      suv: {
        type: 'suv',
        label: 'Camioneta / SUV',
        shortLabel: 'Camioneta',
        icon: '🚙',
        defaultBaseL100: 8.8,
        description: 'Camionetas altas familiares, trocha y carretera de montaña',
        engines: [
          {
            id: 'co_suv_16_std',
            key: 'co_suv_16_std',
            nombreComun: '1.6L Estándar',
            name: '1.6L Estándar',
            cc: '1.598 cc',
            displacement: '1.598 cc',
            cilindrosPotencia: '4 Cilindros · 115 - 130 HP',
            powerCV: '115 - 130 HP',
            descripcionBreve: 'Camioneta ligera con consumo moderado para ciudad y paseos.',
            description: 'Camioneta ligera con consumo moderado para ciudad y paseos.',
            detalleInfo: {
              tipoManejo: 'Uso urbano y viajes familiares ligeros.',
              ejemplosAutos: ['Renault Duster 1.6', 'Chevrolet Tracker 1.2 Turbo', 'Suzuki Vitara 1.6'],
              rendimientoYCombustible: 'Consumo mixto ~12,5 km/L (8,0 L/100 km). Gasolina y Gas GLP.',
            },
            consumoBaseL100: 8.0,
            baseL100: 8.0,
            fuelRecommendation: 'Gasolina / Gas GLP',
          },
          {
            id: 'co_suv_20_med',
            key: 'co_suv_20_med',
            nombreComun: '2.0L Mediano',
            name: '2.0L Mediano',
            cc: '1.998 cc',
            displacement: '1.998 cc',
            cilindrosPotencia: '4 Cilindros · 150 - 170 HP',
            powerCV: '150 - 170 HP',
            descripcionBreve: 'Equilibrio de fuerza y durabilidad para camionetas familiares.',
            description: 'Equilibrio de fuerza y durabilidad para camionetas familiares.',
            detalleInfo: {
              tipoManejo: 'Viajes familiares con cupo completo y maletas.',
              ejemplosAutos: ['Mazda CX-30 / CX-5 2.0', 'Kia Sportage 2.0', 'Hyundai Tucson 2.0'],
              rendimientoYCombustible: 'Consumo promedio ~11,4 km/L (8,8 L/100 km).',
            },
            consumoBaseL100: 8.8,
            baseL100: 8.8,
            fuelRecommendation: 'Gasolina / Gas GLP',
          },
          {
            id: 'co_suv_25_pot',
            key: 'co_suv_25_pot',
            nombreComun: '2.5L+ Potente',
            name: '2.5L+ Potente',
            cc: '2.488 - 3.956 cc',
            displacement: '2.488 - 3.956 cc',
            cilindrosPotencia: '4 o 6 Cilindros · 180 - 275 HP',
            powerCV: '180 - 275 HP',
            descripcionBreve: 'Gran cilindrada para camionetas 4x4 pesadas y 7 puestos.',
            description: 'Gran cilindrada para camionetas 4x4 pesadas y 7 puestos.',
            detalleInfo: {
              tipoManejo: 'Trocha, 7 pasajeros y arrastre.',
              ejemplosAutos: ['Toyota Fortuner Gasolina 2.7', 'Toyota Prado TXL 4.0 V6', 'Ford Explorer 3.5 V6'],
              rendimientoYCombustible: 'Consumo promedio ~9,1 km/L (11,0 L/100 km).',
            },
            consumoBaseL100: 11.0,
            baseL100: 11.0,
            fuelRecommendation: 'Gasolina',
          },
          {
            id: 'co_suv_diesel',
            key: 'co_suv_diesel',
            nombreComun: 'Diésel Turbo',
            name: 'Diésel Turbo',
            cc: '2.393 - 2.755 cc',
            displacement: '2.393 - 2.755 cc',
            cilindrosPotencia: '4 Cilindros Turbodiésel · 150 - 204 HP',
            powerCV: '150 - 204 HP',
            descripcionBreve: 'Potente torque diésel para trocha difícil y montaña empinada.',
            description: 'Potente torque diésel para trocha difícil y montaña empinada.',
            detalleInfo: {
              tipoManejo: 'Carreteras destapadas, fincas y viajes largos de bajo costo.',
              ejemplosAutos: ['Toyota Fortuner 2.8 D-4D', 'Toyota Hilux SW4', 'Chevrolet Trailblazer 2.8'],
              rendimientoYCombustible: 'Consumo promedio ~11,1 km/L (9,0 L/100 km). Diésel / ACPM.',
            },
            consumoBaseL100: 9.0,
            baseL100: 9.0,
            fuelRecommendation: 'Diésel / ACPM',
          },
          {
            id: 'co_suv_custom',
            key: 'co_suv_custom',
            nombreComun: 'Personalizado de Tablero',
            name: 'Personalizado de Tablero',
            cc: 'Ajuste manual',
            displacement: 'Ajuste manual',
            cilindrosPotencia: 'Calibración de usuario',
            powerCV: 'Calibración de usuario',
            descripcionBreve: 'Consumo calibrado.',
            description: 'Consumo calibrado.',
            detalleInfo: {
              tipoManejo: 'Personalizado.',
              ejemplosAutos: ['Cualquier SUV'],
              rendimientoYCombustible: 'Configuración directa.',
            },
            consumoBaseL100: 9.0,
            baseL100: 9.0,
          },
        ],
      },
      pickup: {
        type: 'pickup',
        label: 'Platón / Pickup',
        shortLabel: 'Platón',
        icon: '🛻',
        defaultBaseL100: 9.8,
        description: 'Camionetas con platón para trabajo pesado y fincas',
        engines: [
          {
            id: 'co_pick_diesel',
            key: 'co_pick_diesel',
            nombreComun: 'Diésel Turbo',
            name: 'Diésel Turbo',
            cc: '2.393 - 2.755 cc',
            displacement: '2.393 - 2.755 cc',
            cilindrosPotencia: '4 Cilindros Turbodiésel · 150 - 204 HP',
            powerCV: '150 - 204 HP',
            descripcionBreve: 'La motorización reina de trabajo en Colombia con fuerza y economía.',
            description: 'La motorización reina de trabajo en Colombia con fuerza y economía.',
            detalleInfo: {
              tipoManejo: 'Carga de 1 tonelada, trochas, fincas y transporte intermunicipal.',
              ejemplosAutos: ['Toyota Hilux 2.4/2.8 Diésel', 'Nissan Frontier 2.5 Diésel', 'Chevrolet D-Max 3.0'],
              rendimientoYCombustible: 'Consumo promedio ~10,9 km/L (9,2 L/100 km). Diésel / ACPM.',
            },
            consumoBaseL100: 9.2,
            baseL100: 9.2,
            fuelRecommendation: 'Diésel / ACPM',
          },
          {
            id: 'co_pick_25_pot',
            key: 'co_pick_25_pot',
            nombreComun: '2.5L+ Potente',
            name: '2.5L+ Potente',
            cc: '2.494 - 3.956 cc',
            displacement: '2.494 - 3.956 cc',
            cilindrosPotencia: '4 o 6 Cilindros · 165 - 240 HP',
            powerCV: '165 - 240 HP',
            descripcionBreve: 'Motor a gasolina con arranque rápido y fuerza constante.',
            description: 'Motor a gasolina con arranque rápido y fuerza constante.',
            detalleInfo: {
              tipoManejo: 'Uso comercial y particular mixto.',
              ejemplosAutos: ['Toyota Hilux 2.7 Gasolina', 'Nissan NP300 Gasolina', 'Ford Ranger 2.5'],
              rendimientoYCombustible: 'Consumo promedio ~8,0 km/L (12,5 L/100 km). Gasolina.',
            },
            consumoBaseL100: 12.5,
            baseL100: 12.5,
            fuelRecommendation: 'Gasolina',
          },
          {
            id: 'co_pick_custom',
            key: 'co_pick_custom',
            nombreComun: 'Personalizado de Tablero',
            name: 'Personalizado de Tablero',
            cc: 'Ajuste manual',
            displacement: 'Ajuste manual',
            cilindrosPotencia: 'Calibración de usuario',
            powerCV: 'Calibración de usuario',
            descripcionBreve: 'Consumo calibrado.',
            description: 'Consumo calibrado.',
            detalleInfo: {
              tipoManejo: 'Personalizado.',
              ejemplosAutos: ['Cualquier pickup'],
              rendimientoYCombustible: 'Configuración directa.',
            },
            consumoBaseL100: 10.0,
            baseL100: 10.0,
          },
        ],
      },
      van: {
        type: 'van',
        label: 'Furgoneta / Van',
        shortLabel: 'Furgoneta',
        icon: '🚐',
        defaultBaseL100: 8.6,
        description: 'Vehículos utilitarios de carga urbana y pasajeros',
        engines: [
          {
            id: 'co_van_10_12_eco',
            key: 'co_van_10_12_eco',
            nombreComun: '1.0L - 1.2L Económico',
            name: '1.0L - 1.2L Económico',
            cc: '1.199 cc',
            displacement: '1.199 cc',
            cilindrosPotencia: '4 Cilindros · 80 - 85 HP',
            powerCV: '80 - 85 HP',
            descripcionBreve: 'Furgón pequeño rendidor para logística urbana y reparto.',
            description: 'Furgón pequeño rendidor para logística urbana y reparto.',
            detalleInfo: {
              tipoManejo: 'Reparto y mensajería en ciudad.',
              ejemplosAutos: ['Chevrolet N300', 'DFSK Van', 'Suzuki Super Carry'],
              rendimientoYCombustible: 'Consumo mixto ~15,4 km/L (6,5 L/100 km). Gasolina y Gas GLP.',
            },
            consumoBaseL100: 6.5,
            baseL100: 6.5,
            fuelRecommendation: 'Gasolina / Gas GLP',
          },
          {
            id: 'co_van_16_std',
            key: 'co_van_16_std',
            nombreComun: '1.6L Estándar',
            name: '1.6L Estándar',
            cc: '1.598 cc',
            displacement: '1.598 cc',
            cilindrosPotencia: '4 Cilindros · 95 - 110 HP',
            powerCV: '95 - 110 HP',
            descripcionBreve: 'Utilitario versátil para carga y servicios técnicos.',
            description: 'Utilitario versátil para carga y servicios técnicos.',
            detalleInfo: {
              tipoManejo: 'Rutas urbanas y de periferia.',
              ejemplosAutos: ['Renault Kangoo', 'Peugeot Partner', 'Fiat Fiorino'],
              rendimientoYCombustible: 'Consumo promedio ~12,8 km/L (7,8 L/100 km).',
            },
            consumoBaseL100: 7.8,
            baseL100: 7.8,
            fuelRecommendation: 'Gasolina / Gas GLP',
          },
          {
            id: 'co_van_diesel',
            key: 'co_van_diesel',
            nombreComun: 'Diésel Turbo',
            name: 'Diésel Turbo',
            cc: '2.298 cc',
            displacement: '2.298 cc',
            cilindrosPotencia: '4 Cilindros Turbodiésel · 130 - 150 HP',
            powerCV: '130 - 150 HP',
            descripcionBreve: 'Furgón mediano para transporte interurbano y volumen cerrado.',
            description: 'Furgón mediano para transporte interurbano y volumen cerrado.',
            detalleInfo: {
              tipoManejo: 'Rutas intermunicipales y transporte de carga.',
              ejemplosAutos: ['Renault Master', 'Nissan Urvan', 'Toyota Hiace'],
              rendimientoYCombustible: 'Consumo promedio ~11,6 km/L (8,6 L/100 km). Diésel / ACPM.',
            },
            consumoBaseL100: 8.6,
            baseL100: 8.6,
            fuelRecommendation: 'Diésel / ACPM',
          },
          {
            id: 'co_van_custom',
            key: 'co_van_custom',
            nombreComun: 'Personalizado de Tablero',
            name: 'Personalizado de Tablero',
            cc: 'Ajuste manual',
            displacement: 'Ajuste manual',
            cilindrosPotencia: 'Calibración de usuario',
            powerCV: 'Calibración de usuario',
            descripcionBreve: 'Consumo calibrado.',
            description: 'Consumo calibrado.',
            detalleInfo: {
              tipoManejo: 'Personalizado.',
              ejemplosAutos: ['Cualquier furgón'],
              rendimientoYCombustible: 'Configuración directa.',
            },
            consumoBaseL100: 8.6,
            baseL100: 8.6,
          },
        ],
      },
      custom: {
        type: 'custom',
        label: 'Personalizado',
        shortLabel: 'Personalizado',
        icon: '⚡',
        defaultBaseL100: 8.0,
        description: 'Vehículo configurado manualmente con consumo y cilindrada libre',
        engines: [
          {
            id: 'co_custom_direct',
            key: 'co_custom_direct',
            nombreComun: 'Calibración Libre de Odómetro',
            name: 'Calibración Libre de Odómetro',
            cc: 'Ajuste manual directo',
            displacement: 'Ajuste manual directo',
            cilindrosPotencia: 'Calibración libre de usuario',
            powerCV: 'Calibración libre de usuario',
            descripcionBreve: 'Calibra el consumo base exacto según el computador de a bordo.',
            description: 'Calibra el consumo base exacto según el computador de a bordo.',
            detalleInfo: {
              tipoManejo: 'Cualquier configuración vehicular personalizada.',
              ejemplosAutos: ['Vehículo personalizado'],
              rendimientoYCombustible: 'Configuración libre en km/L o L/100 km.',
            },
            consumoBaseL100: 8.0,
            baseL100: 8.0,
          },
        ],
      },
    };
  }

  if (countryCode === 'US') {
    return {
      compact: {
        type: 'compact',
        label: 'Compact / Hatchback',
        shortLabel: 'Compact',
        icon: '🚗',
        defaultBaseL100: 6.5,
        description: 'Agile daily commuters for metro traffic and highway commutes',
        engines: [
          {
            id: 'us_comp_20_4cyl',
            key: 'us_comp_20_4cyl',
            nombreComun: '2.0L 4-Cyl',
            name: '2.0L 4-Cyl',
            cc: '1.998 cc',
            displacement: '1.998 cc',
            cilindrosPotencia: '4 Cylinders · 150 - 170 HP',
            powerCV: '150 - 170 HP',
            descripcionBreve: 'Efficient 4-cylinder engine for city driving and highway cruising.',
            description: 'Efficient 4-cylinder engine for city driving and highway cruising.',
            detalleInfo: {
              tipoManejo: 'Daily metro commute and highway travel with high MPG.',
              ejemplosAutos: ['Honda Civic 2.0', 'Toyota Corolla 2.0', 'Hyundai Elantra 2.0'],
              rendimientoYCombustible: 'Average ~36.2 MPG (6.5 L/100 km). Regular Unleaded 87.',
            },
            consumoBaseL100: 6.5,
            baseL100: 6.5,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_comp_v6',
            key: 'us_comp_v6',
            nombreComun: '2.5L - 3.5L V6',
            name: '2.5L - 3.5L V6',
            cc: '2.498 - 3.498 cc',
            displacement: '2.498 - 3.498 cc',
            cilindrosPotencia: '6 Cylinders · 250 - 300 HP',
            powerCV: '250 - 300 HP',
            descripcionBreve: 'Strong sporty acceleration and highway passing power.',
            description: 'Strong sporty acceleration and highway passing power.',
            detalleInfo: {
              tipoManejo: 'Fast highway cruising and dynamic driving.',
              ejemplosAutos: ['Ford Mustang V6', 'Chevrolet Camaro V6', 'Nissan 370Z'],
              rendimientoYCombustible: 'Average ~27.7 MPG (8.5 L/100 km). Premium Unleaded.',
            },
            consumoBaseL100: 8.5,
            baseL100: 8.5,
            fuelRecommendation: 'Gasolina Premium',
          },
          {
            id: 'us_comp_diesel',
            key: 'us_comp_diesel',
            nombreComun: 'Turbo Diesel',
            name: 'Turbo Diesel',
            cc: '1.968 cc',
            displacement: '1.968 cc',
            cilindrosPotencia: '4 Cylinders Turbo Diesel · 140 - 150 HP',
            powerCV: '140 - 150 HP',
            descripcionBreve: 'Long-range highway commuter with high fuel economy.',
            description: 'Long-range highway commuter with high fuel economy.',
            detalleInfo: {
              tipoManejo: 'Long distance interstate commuting.',
              ejemplosAutos: ['Volkswagen Golf TDI', 'Chevrolet Cruze Diesel'],
              rendimientoYCombustible: 'Average ~39.2 MPG (6.0 L/100 km). Ultra-Low Sulfur Diesel.',
            },
            consumoBaseL100: 6.0,
            baseL100: 6.0,
            fuelRecommendation: 'Diésel',
          },
          {
            id: 'us_comp_custom',
            key: 'us_comp_custom',
            nombreComun: 'Custom Dashboard',
            name: 'Custom Dashboard',
            cc: 'Manual calibration',
            displacement: 'Manual calibration',
            cilindrosPotencia: 'User calibration',
            powerCV: 'User calibration',
            descripcionBreve: 'Custom MPG rating based on your dashboard odometer.',
            description: 'Custom MPG rating based on your dashboard odometer.',
            detalleInfo: {
              tipoManejo: 'Custom calibrated vehicle.',
              ejemplosAutos: ['Any compact model'],
              rendimientoYCombustible: 'Direct user input.',
            },
            consumoBaseL100: 6.5,
            baseL100: 6.5,
          },
        ],
      },
      sedan: {
        type: 'sedan',
        label: 'Sedan',
        shortLabel: 'Sedan',
        icon: '🚘',
        defaultBaseL100: 7.5,
        description: 'Comfortable family sedans for interstate highways',
        engines: [
          {
            id: 'us_sedan_20_4cyl',
            key: 'us_sedan_20_4cyl',
            nombreComun: '2.0L 4-Cyl',
            name: '2.0L 4-Cyl',
            cc: '1.998 - 2.488 cc',
            displacement: '1.998 - 2.488 cc',
            cilindrosPotencia: '4 Cylinders · 180 - 203 HP',
            powerCV: '180 - 203 HP',
            descripcionBreve: 'Standard dependable 4-cylinder sedan engine for everyday family driving.',
            description: 'Standard dependable 4-cylinder sedan engine for everyday family driving.',
            detalleInfo: {
              tipoManejo: 'Daily commuting, family road trips, and interstate routes.',
              ejemplosAutos: ['Toyota Camry 2.5', 'Honda Accord 2.0T / 1.5T', 'Nissan Altima 2.5'],
              rendimientoYCombustible: 'Average ~32.7 MPG (7.2 L/100 km). Regular Unleaded 87.',
            },
            consumoBaseL100: 7.2,
            baseL100: 7.2,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_sedan_v6',
            key: 'us_sedan_v6',
            nombreComun: '2.5L - 3.5L V6',
            name: '2.5L - 3.5L V6',
            cc: '3.498 cc',
            displacement: '3.498 cc',
            cilindrosPotencia: '6 Cylinders · 270 - 301 HP',
            powerCV: '270 - 301 HP',
            descripcionBreve: 'Silky smooth V6 power with confident highway merging and passing.',
            description: 'Silky smooth V6 power with confident highway merging and passing.',
            detalleInfo: {
              tipoManejo: 'High-speed interstate travel, overtaking, and premium comfort.',
              ejemplosAutos: ['Toyota Camry 3.5 V6', 'Honda Accord V6', 'Dodge Charger 3.6 V6'],
              rendimientoYCombustible: 'Average ~26.7 MPG (8.8 L/100 km). Regular / Premium.',
            },
            consumoBaseL100: 8.8,
            baseL100: 8.8,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_sedan_v8',
            key: 'us_sedan_v8',
            nombreComun: '5.0L+ V8',
            name: '5.0L+ V8',
            cc: '4.951 - 5.654 cc',
            displacement: '4.951 - 5.654 cc',
            cilindrosPotencia: '8 Cylinders · 370 - 450 HP',
            powerCV: '370 - 450 HP',
            descripcionBreve: 'American classic V8 muscle with deep torque and roar.',
            description: 'American classic V8 muscle with deep torque and roar.',
            detalleInfo: {
              tipoManejo: 'Muscle car performance and effortless highway speed.',
              ejemplosAutos: ['Ford Mustang GT 5.0 V8', 'Chrysler 300 5.7 HEMI', 'Dodge Charger R/T 5.7 HEMI'],
              rendimientoYCombustible: 'Average ~20.5 MPG (11.5 L/100 km). Premium Unleaded.',
            },
            consumoBaseL100: 11.5,
            baseL100: 11.5,
            fuelRecommendation: 'Gasolina Premium',
          },
          {
            id: 'us_sedan_diesel',
            key: 'us_sedan_diesel',
            nombreComun: 'Turbo Diesel',
            name: 'Turbo Diesel',
            cc: '1.995 cc',
            displacement: '1.995 cc',
            cilindrosPotencia: '4 Cylinders Turbo Diesel · 180 HP',
            powerCV: '180 HP',
            descripcionBreve: 'High-torque executive highway cruiser.',
            description: 'High-torque executive highway cruiser.',
            detalleInfo: {
              tipoManejo: 'High-mileage highway journeys.',
              ejemplosAutos: ['BMW 328d', 'Mercedes-Benz E250 Bluetec'],
              rendimientoYCombustible: 'Average ~34.6 MPG (6.8 L/100 km). Ultra-Low Sulfur Diesel.',
            },
            consumoBaseL100: 6.8,
            baseL100: 6.8,
            fuelRecommendation: 'Diésel',
          },
          {
            id: 'us_sedan_custom',
            key: 'us_sedan_custom',
            nombreComun: 'Custom Dashboard',
            name: 'Custom Dashboard',
            cc: 'Manual calibration',
            displacement: 'Manual calibration',
            cilindrosPotencia: 'User calibration',
            powerCV: 'User calibration',
            descripcionBreve: 'Custom MPG rating based on dashboard.',
            description: 'Custom MPG rating based on dashboard.',
            detalleInfo: {
              tipoManejo: 'Custom sedan.',
              ejemplosAutos: ['Any sedan'],
              rendimientoYCombustible: 'Direct user input.',
            },
            consumoBaseL100: 7.5,
            baseL100: 7.5,
          },
        ],
      },
      suv: {
        type: 'suv',
        label: 'SUV / Crossover',
        shortLabel: 'SUV',
        icon: '🚙',
        defaultBaseL100: 9.8,
        description: 'Spacious AWD/4WD family haulers and road trippers',
        engines: [
          {
            id: 'us_suv_20_4cyl',
            key: 'us_suv_20_4cyl',
            nombreComun: '2.0L 4-Cyl',
            name: '2.0L 4-Cyl',
            cc: '1.498 - 2.488 cc',
            displacement: '1.498 - 2.488 cc',
            cilindrosPotencia: '4 Cylinders · 180 - 203 HP',
            powerCV: '180 - 203 HP',
            descripcionBreve: 'Compact crossover 4-cylinder engine with practical balance of MPG and space.',
            description: 'Compact crossover 4-cylinder engine with practical balance of MPG and space.',
            detalleInfo: {
              tipoManejo: 'Daily errands, school runs, and family getaways.',
              ejemplosAutos: ['Toyota RAV4 2.5', 'Honda CR-V 1.5 Turbo', 'Ford Escape 2.0'],
              rendimientoYCombustible: 'Average ~28.7 MPG (8.2 L/100 km). Regular Unleaded 87.',
            },
            consumoBaseL100: 8.2,
            baseL100: 8.2,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_suv_v6',
            key: 'us_suv_v6',
            nombreComun: '2.5L - 3.5L V6',
            name: '2.5L - 3.5L V6',
            cc: '3.498 - 3.604 cc',
            displacement: '3.498 - 3.604 cc',
            cilindrosPotencia: '6 Cylinders · 280 - 310 HP',
            powerCV: '280 - 310 HP',
            descripcionBreve: 'Midsize 3-row family SUV engine with solid towing and passing power.',
            description: 'Midsize 3-row family SUV engine with solid towing and passing power.',
            detalleInfo: {
              tipoManejo: 'Family road trips with full luggage and trailer towing.',
              ejemplosAutos: ['Ford Explorer 3.5 V6', 'Jeep Grand Cherokee 3.6 V6', 'Chevrolet Traverse 3.6'],
              rendimientoYCombustible: 'Average ~22.4 MPG (10.5 L/100 km). Regular Unleaded.',
            },
            consumoBaseL100: 10.5,
            baseL100: 10.5,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_suv_v8',
            key: 'us_suv_v8',
            nombreComun: '5.0L+ V8',
            name: '5.0L+ V8',
            cc: '5.328 - 6.162 cc',
            displacement: '5.328 - 6.162 cc',
            cilindrosPotencia: '8 Cylinders · 355 - 420 HP',
            powerCV: '355 - 420 HP',
            descripcionBreve: 'Full-size American SUV engine with maximum towing and 8-passenger capacity.',
            description: 'Full-size American SUV engine with maximum towing and 8-passenger capacity.',
            detalleInfo: {
              tipoManejo: 'Heavy towing, boat trailering, and large family expeditions.',
              ejemplosAutos: ['Chevrolet Tahoe 5.3 V8', 'GMC Yukon 6.2 V8', 'Ford Expedition 3.5/5.0 V8'],
              rendimientoYCombustible: 'Average ~17.4 MPG (13.5 L/100 km). Regular Unleaded.',
            },
            consumoBaseL100: 13.5,
            baseL100: 13.5,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_suv_diesel',
            key: 'us_suv_diesel',
            nombreComun: 'Turbo Diesel',
            name: 'Turbo Diesel',
            cc: '2.993 cc',
            displacement: '2.993 cc',
            cilindrosPotencia: '6 Cylinders Turbo Diesel · 240 - 277 HP',
            powerCV: '240 - 277 HP',
            descripcionBreve: 'Long-range diesel torque for towing trailers with high highway MPG.',
            description: 'Long-range diesel torque for towing trailers with high highway MPG.',
            detalleInfo: {
              tipoManejo: 'Long distance travel with heavy trailers or boats.',
              ejemplosAutos: ['Jeep Grand Cherokee EcoDiesel', 'Chevrolet Tahoe 3.0 Duramax Diesel'],
              rendimientoYCombustible: 'Average ~24.8 MPG (9.5 L/100 km). Ultra-Low Sulfur Diesel.',
            },
            consumoBaseL100: 9.5,
            baseL100: 9.5,
            fuelRecommendation: 'Diésel',
          },
          {
            id: 'us_suv_custom',
            key: 'us_suv_custom',
            nombreComun: 'Custom Dashboard',
            name: 'Custom Dashboard',
            cc: 'Manual calibration',
            displacement: 'Manual calibration',
            cilindrosPotencia: 'User calibration',
            powerCV: 'User calibration',
            descripcionBreve: 'Custom MPG rating based on dashboard.',
            description: 'Custom MPG rating based on dashboard.',
            detalleInfo: {
              tipoManejo: 'Custom SUV.',
              ejemplosAutos: ['Any SUV'],
              rendimientoYCombustible: 'Direct user input.',
            },
            consumoBaseL100: 9.8,
            baseL100: 9.8,
          },
        ],
      },
      pickup: {
        type: 'pickup',
        label: 'Truck / Pickup',
        shortLabel: 'Truck',
        icon: '🛻',
        defaultBaseL100: 11.2,
        description: 'Heavy hauling, towing, and payload work trucks',
        engines: [
          {
            id: 'us_truck_v6',
            key: 'us_truck_v6',
            nombreComun: '2.5L - 3.5L V6',
            name: '2.5L - 3.5L V6',
            cc: '3.498 cc',
            displacement: '3.498 cc',
            cilindrosPotencia: '6 Cylinders Twin-Turbo · 325 - 400 HP',
            powerCV: '325 - 400 HP',
            descripcionBreve: 'Twin-turbo EcoBoost or V6 power for modern versatile trucks.',
            description: 'Twin-turbo EcoBoost or V6 power for modern versatile trucks.',
            detalleInfo: {
              tipoManejo: 'Everyday driving, job site hauling, and midsize towing.',
              ejemplosAutos: ['Ford F-150 3.5 EcoBoost', 'Toyota Tacoma 3.5 V6', 'Chevrolet Colorado 2.7 Turbo'],
              rendimientoYCombustible: 'Average ~21.0 MPG (11.2 L/100 km). Regular Unleaded.',
            },
            consumoBaseL100: 11.2,
            baseL100: 11.2,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_truck_v8',
            key: 'us_truck_v8',
            nombreComun: '5.0L+ V8',
            name: '5.0L+ V8',
            cc: '4.951 - 5.654 cc',
            displacement: '4.951 - 5.654 cc',
            cilindrosPotencia: '8 Cylinders · 385 - 400 HP',
            powerCV: '385 - 400 HP',
            descripcionBreve: 'Legendary full-size truck V8 power for heavy payloads and towing.',
            description: 'Legendary full-size truck V8 power for heavy payloads and towing.',
            detalleInfo: {
              tipoManejo: 'Heavy construction hauling, horse trailers, and highway towing.',
              ejemplosAutos: ['Ford F-150 5.0 V8', 'Chevrolet Silverado 1500 5.3/6.2 V8', 'RAM 1500 5.7 HEMI'],
              rendimientoYCombustible: 'Average ~16.8 MPG (14.0 L/100 km). Regular Unleaded.',
            },
            consumoBaseL100: 14.0,
            baseL100: 14.0,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_truck_diesel',
            key: 'us_truck_diesel',
            nombreComun: 'Turbo Diesel',
            name: 'Turbo Diesel',
            cc: '2.993 - 6.690 cc',
            displacement: '2.993 - 6.690 cc',
            cilindrosPotencia: '6 Cylinders Turbo Diesel · 305 - 475 HP',
            powerCV: '305 - 475 HP',
            descripcionBreve: 'Maximum heavy-duty pulling power and torque.',
            description: 'Maximum heavy-duty pulling power and torque.',
            detalleInfo: {
              tipoManejo: 'Commercial hauling, gooseneck trailers, and heavy machinery transport.',
              ejemplosAutos: ['RAM 2500 Cummins Turbo Diesel', 'Ford F-250 PowerStroke', 'Silverado 2500 Duramax'],
              rendimientoYCombustible: 'Average ~22.4 MPG (10.5 L/100 km). Ultra-Low Sulfur Diesel.',
            },
            consumoBaseL100: 10.5,
            baseL100: 10.5,
            fuelRecommendation: 'Diésel',
          },
          {
            id: 'us_truck_custom',
            key: 'us_truck_custom',
            nombreComun: 'Custom Dashboard',
            name: 'Custom Dashboard',
            cc: 'Manual calibration',
            displacement: 'Manual calibration',
            cilindrosPotencia: 'User calibration',
            powerCV: 'User calibration',
            descripcionBreve: 'Custom MPG rating based on dashboard.',
            description: 'Custom MPG rating based on dashboard.',
            detalleInfo: {
              tipoManejo: 'Custom truck.',
              ejemplosAutos: ['Any pickup truck'],
              rendimientoYCombustible: 'Direct user input.',
            },
            consumoBaseL100: 11.0,
            baseL100: 11.0,
          },
        ],
      },
      van: {
        type: 'van',
        label: 'Cargo Van',
        shortLabel: 'Van',
        icon: '🚐',
        defaultBaseL100: 10.2,
        description: 'Cargo and passenger family haulers',
        engines: [
          {
            id: 'us_van_v6',
            key: 'us_van_v6',
            nombreComun: '2.5L - 3.5L V6',
            name: '2.5L - 3.5L V6',
            cc: '3.498 cc',
            displacement: '3.498 cc',
            cilindrosPotencia: '6 Cylinders · 280 - 296 HP',
            powerCV: '280 - 296 HP',
            descripcionBreve: 'Reliable family minivan engine with high utility and smooth comfort.',
            description: 'Reliable family minivan engine with high utility and smooth comfort.',
            detalleInfo: {
              tipoManejo: 'Family cross-country road trips and school carpools.',
              ejemplosAutos: ['Honda Odyssey 3.5 V6', 'Toyota Sienna 3.5 V6', 'Chrysler Pacifica 3.6 V6'],
              rendimientoYCombustible: 'Average ~23.1 MPG (10.2 L/100 km). Regular Unleaded.',
            },
            consumoBaseL100: 10.2,
            baseL100: 10.2,
            fuelRecommendation: 'Gasolina Regular',
          },
          {
            id: 'us_van_diesel',
            key: 'us_van_diesel',
            nombreComun: 'Turbo Diesel',
            name: 'Turbo Diesel',
            cc: '1.995 - 2.993 cc',
            displacement: '1.995 - 2.993 cc',
            cilindrosPotencia: '4 or 6 Cylinders Turbo Diesel · 170 - 210 HP',
            powerCV: '170 - 210 HP',
            descripcionBreve: 'Heavy duty commercial delivery van engine with high fuel efficiency.',
            description: 'Heavy duty commercial delivery van engine with high fuel efficiency.',
            detalleInfo: {
              tipoManejo: 'Package delivery, logistics, and camper conversion road travel.',
              ejemplosAutos: ['Mercedes-Benz Sprinter 2500 Diesel', 'Ford Transit EcoBlue Diesel'],
              rendimientoYCombustible: 'Average ~21.0 MPG (11.2 L/100 km). Ultra-Low Sulfur Diesel.',
            },
            consumoBaseL100: 11.2,
            baseL100: 11.2,
            fuelRecommendation: 'Diésel',
          },
          {
            id: 'us_van_custom',
            key: 'us_van_custom',
            nombreComun: 'Custom Dashboard',
            name: 'Custom Dashboard',
            cc: 'Manual calibration',
            displacement: 'Manual calibration',
            cilindrosPotencia: 'User calibration',
            powerCV: 'User calibration',
            descripcionBreve: 'Custom MPG rating based on dashboard.',
            description: 'Custom MPG rating based on dashboard.',
            detalleInfo: {
              tipoManejo: 'Custom van.',
              ejemplosAutos: ['Any van or minivan'],
              rendimientoYCombustible: 'Direct user input.',
            },
            consumoBaseL100: 10.0,
            baseL100: 10.0,
          },
        ],
      },
      custom: {
        type: 'custom',
        label: 'Custom',
        shortLabel: 'Custom',
        icon: '⚡',
        defaultBaseL100: 8.0,
        description: 'Custom vehicle dashboard calibration',
        engines: [
          {
            id: 'us_custom_direct',
            key: 'us_custom_direct',
            nombreComun: 'Free Odometer Calibration',
            name: 'Free Odometer Calibration',
            cc: 'Manual calibration',
            displacement: 'Manual calibration',
            cilindrosPotencia: 'User calibration',
            powerCV: 'User calibration',
            descripcionBreve: 'Custom fuel consumption based on your car trip computer.',
            description: 'Custom fuel consumption based on your car trip computer.',
            detalleInfo: {
              tipoManejo: 'Custom calibrated vehicle.',
              ejemplosAutos: ['Custom vehicle'],
              rendimientoYCombustible: 'Direct user input in MPG or L/100 km.',
            },
            consumoBaseL100: 8.0,
            baseL100: 8.0,
          },
        ],
      },
    };
  }

  // Default: Poland (PL)
  return {
    compact: {
      type: 'compact',
      label: 'Hatchback / Kompakt',
      shortLabel: 'Kompakt',
      icon: '🚗',
      defaultBaseL100: 5.4,
      description: 'Hatchbacks y autos urbanos ágiles en Varsovia y Cracovia',
      engines: [
        {
          id: 'pl_comp_10_12_eco',
          key: 'pl_comp_10_12_eco',
          nombreComun: '1.0L - 1.2L Eco',
          name: '1.0L - 1.2L Eco',
          cc: '999 - 1.199 cc',
          displacement: '999 - 1.199 cc',
          cilindrosPotencia: '3 o 4 Cilindros · 75 - 110 CV',
          powerCV: '75 - 110 CV',
          descripcionBreve: 'Motor compacto económico de bajo consumo para ciudad.',
          description: 'Motor compacto económico de bajo consumo para ciudad.',
          detalleInfo: {
            tipoManejo: 'Manejo urbano diario y traslados cortos.',
            ejemplosAutos: ['Skoda Fabia 1.0', 'Toyota Yaris 1.2', 'Fiat 500 1.2'],
            rendimientoYCombustible: 'Rendimiento mixto ~5,4 L/100 km. Gasolina Pb95 y LPG.',
          },
          consumoBaseL100: 5.4,
          baseL100: 5.4,
          fuelRecommendation: 'Gasolina Pb95 / LPG',
        },
        {
          id: 'pl_comp_16_std',
          key: 'pl_comp_16_std',
          nombreComun: '1.6L Standard',
          name: '1.6L Standard',
          cc: '1.598 cc',
          displacement: '1.598 cc',
          cilindrosPotencia: '4 Cilindros · 105 - 115 CV',
          powerCV: '105 - 115 CV',
          descripcionBreve: 'Mecánica clásica confiable con buena fuerza para autopista.',
          description: 'Mecánica clásica confiable con buena fuerza para autopista.',
          detalleInfo: {
            tipoManejo: 'Uso mixto ciudad y vías rápidas.',
            ejemplosAutos: ['Opel Astra 1.6', 'Ford Focus 1.6', 'Seat Ibiza 1.6'],
            rendimientoYCombustible: 'Rendimiento promedio ~6,2 L/100 km. Gasolina Pb95 y LPG.',
          },
          consumoBaseL100: 6.2,
          baseL100: 6.2,
          fuelRecommendation: 'Gasolina Pb95 / LPG',
        },
        {
          id: 'pl_comp_tdi',
          key: 'pl_comp_tdi',
          nombreComun: '1.9L - 2.0L TDI / Diésel',
          name: '1.9L - 2.0L TDI / Diésel',
          cc: '1.896 - 1.968 cc',
          displacement: '1.896 - 1.968 cc',
          cilindrosPotencia: '4 Cilindros TDI · 105 - 150 CV',
          powerCV: '105 - 150 CV',
          descripcionBreve: 'Legendario motor TDI de bajo consumo para largos viajes.',
          description: 'Legendario motor TDI de bajo consumo para largos viajes.',
          detalleInfo: {
            tipoManejo: 'Autopistas y rutas interurbanas de bajo costo por km.',
            ejemplosAutos: ['Volkswagen Golf 1.9/2.0 TDI', 'Skoda Octavia TDI'],
            rendimientoYCombustible: 'Rendimiento promedio ~5,2 L/100 km. Diésel ON.',
          },
          consumoBaseL100: 5.2,
          baseL100: 5.2,
          fuelRecommendation: 'Diésel ON',
        },
        {
          id: 'pl_comp_custom',
          key: 'pl_comp_custom',
          nombreComun: 'Personalizado de Tablero',
          name: 'Personalizado de Tablero',
          cc: 'Ajuste manual',
          displacement: 'Ajuste manual',
          cilindrosPotencia: 'Calibración de usuario',
          powerCV: 'Calibración de usuario',
          descripcionBreve: 'Consumo medido en el odómetro de tu auto.',
          description: 'Consumo medido en el odómetro de tu auto.',
          detalleInfo: {
            tipoManejo: 'Personalizado para tu auto.',
            ejemplosAutos: ['Cualquier compacto'],
            rendimientoYCombustible: 'Configuración libre.',
          },
          consumoBaseL100: 5.8,
          baseL100: 5.8,
        },
      ],
    },
    sedan: {
      type: 'sedan',
      label: 'Sedán / Berlina',
      shortLabel: 'Sedán',
      icon: '🚘',
      defaultBaseL100: 7.2,
      description: 'Sedanes familiares y berlinas para autopistas A4/A1',
      engines: [
        {
          id: 'pl_sedan_16_std',
          key: 'pl_sedan_16_std',
          nombreComun: '1.6L Standard',
          name: '1.6L Standard',
          cc: '1.598 cc',
          displacement: '1.598 cc',
          cilindrosPotencia: '4 Cilindros · 102 - 115 CV',
          powerCV: '102 - 115 CV',
          descripcionBreve: 'Motor atmosférico de alta durabilidad, líder en conversiones a LPG.',
          description: 'Motor atmosférico de alta durabilidad, líder en conversiones a LPG.',
          detalleInfo: {
            tipoManejo: 'Uso diario familiar y viajes por autopistas A4/A1.',
            ejemplosAutos: ['Skoda Octavia 1.6 MPI LPG', 'Opel Astra Sedan 1.6', 'Renault Megane 1.6'],
            rendimientoYCombustible: 'Consumo mixto ~7,2 L/100 km. Compatible con LPG y Gasolina Pb95.',
          },
          consumoBaseL100: 7.2,
          baseL100: 7.2,
          fuelRecommendation: 'LPG / Gasolina Pb95',
        },
        {
          id: 'pl_sedan_18_20_sred',
          key: 'pl_sedan_18_20_sred',
          nombreComun: '1.8L - 2.0L Średni',
          name: '1.8L - 2.0L Średni',
          cc: '1.798 - 1.998 cc',
          displacement: '1.798 - 1.998 cc',
          cilindrosPotencia: '4 Cilindros · 140 - 165 CV',
          powerCV: '140 - 165 CV',
          descripcionBreve: 'Motor equilibrado para autopistas con marcha suave y silenciosa.',
          description: 'Motor equilibrado para autopistas con marcha suave y silenciosa.',
          detalleInfo: {
            tipoManejo: 'Viajes interurbanos de confort y vacaciones.',
            ejemplosAutos: ['Toyota Corolla 1.8 Híbrido', 'Volkswagen Passat 2.0', 'Mazda 6 2.0'],
            rendimientoYCombustible: 'Consumo promedio ~8,2 L/100 km. Gasolina Pb95 y LPG.',
          },
          consumoBaseL100: 8.2,
          baseL100: 8.2,
          fuelRecommendation: 'Gasolina Pb95 / LPG',
        },
        {
          id: 'pl_sedan_25_mocny',
          key: 'pl_sedan_25_mocny',
          nombreComun: '2.5L+ Mocny / V6',
          name: '2.5L+ Mocny / V6',
          cc: '2.488 - 2.998 cc',
          displacement: '2.488 - 2.998 cc',
          cilindrosPotencia: '6 Cilindros · 190 - 250 CV',
          powerCV: '190 - 250 CV',
          descripcionBreve: 'Gran potencia y elasticidad para berlinas premium en autopista.',
          description: 'Gran potencia y elasticidad para berlinas premium en autopista.',
          detalleInfo: {
            tipoManejo: 'Altas velocidades de crucero con máxima insonorización.',
            ejemplosAutos: ['Audi A6 2.8/3.0', 'BMW Serie 5 2.5/3.0', 'Mercedes-Benz Clase E'],
            rendimientoYCombustible: 'Consumo promedio ~9,8 L/100 km. Gasolina Pb98 / Pb95.',
          },
          consumoBaseL100: 9.8,
          baseL100: 9.8,
          fuelRecommendation: 'Gasolina Pb95 / Pb98',
        },
        {
          id: 'pl_sedan_tdi',
          key: 'pl_sedan_tdi',
          nombreComun: '1.9L - 2.0L TDI / Diésel',
          name: '1.9L - 2.0L TDI / Diésel',
          cc: '1.968 cc',
          displacement: '1.968 cc',
          cilindrosPotencia: '4 Cilindros TDI · 140 - 190 CV',
          powerCV: '140 - 190 CV',
          descripcionBreve: 'Motor diésel común de bajas revoluciones y gran autonomía.',
          description: 'Motor diésel común de bajas revoluciones y gran autonomía.',
          detalleInfo: {
            tipoManejo: 'Flotas, empresas y traslados continuos por carretera.',
            ejemplosAutos: ['Volkswagen Passat 2.0 TDI', 'Skoda Superb 2.0 TDI', 'Ford Mondeo 2.0 TDCi'],
            rendimientoYCombustible: 'Consumo promedio ~6,0 L/100 km. Diésel ON.',
          },
          consumoBaseL100: 6.0,
          baseL100: 6.0,
          fuelRecommendation: 'Diésel ON',
        },
        {
          id: 'pl_sedan_custom',
          key: 'pl_sedan_custom',
          nombreComun: 'Personalizado de Tablero',
          name: 'Personalizado de Tablero',
          cc: 'Ajuste manual',
          displacement: 'Ajuste manual',
          cilindrosPotencia: 'Calibración de usuario',
          powerCV: 'Calibración de usuario',
          descripcionBreve: 'Consumo medido según computador.',
          description: 'Consumo medido según computador.',
          detalleInfo: {
            tipoManejo: 'Personalizado.',
            ejemplosAutos: ['Cualquier sedán'],
            rendimientoYCombustible: 'Configuración libre.',
          },
          consumoBaseL100: 7.5,
          baseL100: 7.5,
        },
      ],
    },
    suv: {
      type: 'suv',
      label: 'SUV',
      shortLabel: 'SUV',
      icon: '🚙',
      defaultBaseL100: 8.8,
      description: 'Camionetas familiares elevadas y todoterreno',
      engines: [
        {
          id: 'pl_suv_10_12_eco',
          key: 'pl_suv_10_12_eco',
          nombreComun: '1.0L - 1.2L Eco',
          name: '1.0L - 1.2L Eco',
          cc: '999 - 1.199 cc',
          displacement: '999 - 1.199 cc',
          cilindrosPotencia: '3 Cilindros Turbo · 100 CV',
          powerCV: '100 CV',
          descripcionBreve: 'Bajo consumo para SUV compacto, líder con instalación de gas de fábrica.',
          description: 'Bajo consumo para SUV compacto, líder con instalación de gas de fábrica.',
          detalleInfo: {
            tipoManejo: 'Ciudad y viajes ligeros de fin de semana.',
            ejemplosAutos: ['Dacia Duster 1.0 ECO-G LPG', 'Renault Captur TCe'],
            rendimientoYCombustible: 'Consumo mixto ~6,8 L/100 km. LPG y Gasolina Pb95.',
          },
          consumoBaseL100: 6.8,
          baseL100: 6.8,
          fuelRecommendation: 'LPG / Gasolina Pb95',
        },
        {
          id: 'pl_suv_16_std',
          key: 'pl_suv_16_std',
          nombreComun: '1.6L Standard',
          name: '1.6L Standard',
          cc: '1.598 cc',
          displacement: '1.598 cc',
          cilindrosPotencia: '4 Cilindros · 117 CV',
          powerCV: '117 CV',
          descripcionBreve: 'Motor probado para camionetas familiares medianas.',
          description: 'Motor probado para camionetas familiares medianas.',
          detalleInfo: {
            tipoManejo: 'Uso familiar regular en ciudad y carreteras nacionales.',
            ejemplosAutos: ['Nissan Qashqai 1.6', 'Dacia Duster 1.6 SCe'],
            rendimientoYCombustible: 'Consumo promedio ~8,2 L/100 km. Gasolina Pb95 y LPG.',
          },
          consumoBaseL100: 8.2,
          baseL100: 8.2,
          fuelRecommendation: 'Gasolina Pb95 / LPG',
        },
        {
          id: 'pl_suv_18_20_sred',
          key: 'pl_suv_18_20_sred',
          nombreComun: '1.8L - 2.0L Średni',
          name: '1.8L - 2.0L Średni',
          cc: '1.998 cc',
          displacement: '1.998 cc',
          cilindrosPotencia: '4 Cilindros · 150 - 177 CV',
          powerCV: '150 - 177 CV',
          descripcionBreve: 'Fuerza balanceada para SUVs populares con tracción 4x2 o AWD.',
          description: 'Fuerza balanceada para SUVs populares con tracción 4x2 o AWD.',
          detalleInfo: {
            tipoManejo: 'Viajes familiares con maletero y clima de nieve o lluvia.',
            ejemplosAutos: ['Kia Sportage 1.6 T-GDI / 2.0', 'Hyundai Tucson 2.0', 'Toyota RAV4 2.0'],
            rendimientoYCombustible: 'Consumo promedio ~8,8 L/100 km. Gasolina Pb95 y LPG.',
          },
          consumoBaseL100: 8.8,
          baseL100: 8.8,
          fuelRecommendation: 'Gasolina Pb95 / LPG',
        },
        {
          id: 'pl_suv_25_mocny',
          key: 'pl_suv_25_mocny',
          nombreComun: '2.5L+ Mocny / V6',
          name: '2.5L+ Mocny / V6',
          cc: '2.498 - 3.498 cc',
          displacement: '2.498 - 3.498 cc',
          cilindrosPotencia: '6 Cilindros · 220 - 300 CV',
          powerCV: '220 - 300 CV',
          descripcionBreve: 'Gran cilindrada para camionetas 4x4 pesadas y capacidad de remolque.',
          description: 'Gran cilindrada para camionetas 4x4 pesadas y capacidad de remolque.',
          detalleInfo: {
            tipoManejo: 'Expediciones, invierno duro y arrastre.',
            ejemplosAutos: ['BMW X5 3.0', 'Audi Q7 3.0', 'Toyota RAV4 2.5 AWD'],
            rendimientoYCombustible: 'Consumo promedio ~11,5 L/100 km.',
          },
          consumoBaseL100: 11.5,
          baseL100: 11.5,
          fuelRecommendation: 'Gasolina Pb95 / Pb98',
        },
        {
          id: 'pl_suv_tdi',
          key: 'pl_suv_tdi',
          nombreComun: '1.9L - 2.0L TDI / Diésel',
          name: '1.9L - 2.0L TDI / Diésel',
          cc: '1.968 cc',
          displacement: '1.968 cc',
          cilindrosPotencia: '4 Cilindros TDI · 150 - 190 CV',
          powerCV: '150 - 190 CV',
          descripcionBreve: 'El motor diésel favorito para SUVs en Europa por torque y autonomía.',
          description: 'El motor diésel favorito para SUVs en Europa por torque y autonomía.',
          detalleInfo: {
            tipoManejo: 'Autopistas y viajes de montaña en invierno.',
            ejemplosAutos: ['Volkswagen Tiguan 2.0 TDI', 'Volvo XC60 D4', 'Kia Sportage 2.0 CRDi'],
            rendimientoYCombustible: 'Consumo promedio ~7,5 L/100 km. Diésel ON.',
          },
          consumoBaseL100: 7.5,
          baseL100: 7.5,
          fuelRecommendation: 'Diésel ON',
        },
        {
          id: 'pl_suv_custom',
          key: 'pl_suv_custom',
          nombreComun: 'Personalizado de Tablero',
          name: 'Personalizado de Tablero',
          cc: 'Ajuste manual',
          displacement: 'Ajuste manual',
          cilindrosPotencia: 'Calibración de usuario',
          powerCV: 'Calibración de usuario',
          descripcionBreve: 'Consumo medido según computador.',
          description: 'Consumo medido según computador.',
          detalleInfo: {
            tipoManejo: 'Personalizado.',
            ejemplosAutos: ['Cualquier SUV'],
            rendimientoYCombustible: 'Configuración libre.',
          },
          consumoBaseL100: 9.0,
          baseL100: 9.0,
        },
      ],
    },
    pickup: {
      type: 'pickup',
      label: 'Pickup',
      shortLabel: 'Pickup',
      icon: '🛻',
      defaultBaseL100: 9.8,
      description: 'Camionetas con platón de trabajo y tracción 4x4',
      engines: [
        {
          id: 'pl_pick_tdi',
          key: 'pl_pick_tdi',
          nombreComun: '1.9L - 2.0L TDI / Diésel',
          name: '1.9L - 2.0L TDI / Diésel',
          cc: '1.968 cc',
          displacement: '1.968 cc',
          cilindrosPotencia: '4 Cilindros BiTDI · 163 - 204 CV',
          powerCV: '163 - 204 CV',
          descripcionBreve: 'Motor turbodiésel de trabajo continuo y bajo consumo.',
          description: 'Motor turbodiésel de trabajo continuo y bajo consumo.',
          detalleInfo: {
            tipoManejo: 'Trabajo agrícola, forestal, obras y tracción en nieve.',
            ejemplosAutos: ['Volkswagen Amarok 2.0 TDI', 'Ford Ranger 2.0 EcoBlue', 'Mitsubishi L200 2.2 DI-D'],
            rendimientoYCombustible: 'Consumo promedio ~8,8 L/100 km. Diésel ON.',
          },
          consumoBaseL100: 8.8,
          baseL100: 8.8,
          fuelRecommendation: 'Diésel ON',
        },
        {
          id: 'pl_pick_25_mocny',
          key: 'pl_pick_25_mocny',
          nombreComun: '2.5L+ Mocny / V6',
          name: '2.5L+ Mocny / V6',
          cc: '2.755 - 2.998 cc',
          displacement: '2.755 - 2.998 cc',
          cilindrosPotencia: '4 o 6 Cilindros · 204 - 258 CV',
          powerCV: '204 - 258 CV',
          descripcionBreve: 'Máximo torque para remolques pesados y terrenos complicados.',
          description: 'Máximo torque para remolques pesados y terrenos complicados.',
          detalleInfo: {
            tipoManejo: 'Arrastre pesado de hasta 3,5 toneladas.',
            ejemplosAutos: ['Toyota Hilux 2.8 D-4D', 'Volkswagen Amarok 3.0 V6 TDI', 'Isuzu D-Max 3.0'],
            rendimientoYCombustible: 'Consumo promedio ~11,0 L/100 km. Diésel ON.',
          },
          consumoBaseL100: 11.0,
          baseL100: 11.0,
          fuelRecommendation: 'Diésel ON',
        },
        {
          id: 'pl_pick_custom',
          key: 'pl_pick_custom',
          nombreComun: 'Personalizado de Tablero',
          name: 'Personalizado de Tablero',
          cc: 'Ajuste manual',
          displacement: 'Ajuste manual',
          cilindrosPotencia: 'Calibración de usuario',
          powerCV: 'Calibración de usuario',
          descripcionBreve: 'Consumo medido según computador.',
          description: 'Consumo medido según computador.',
          detalleInfo: {
            tipoManejo: 'Personalizado.',
            ejemplosAutos: ['Cualquier pickup'],
            rendimientoYCombustible: 'Configuración libre.',
          },
          consumoBaseL100: 10.0,
          baseL100: 10.0,
        },
      ],
    },
    van: {
      type: 'van',
      label: 'Furgon / Dostawczy',
      shortLabel: 'Furgon',
      icon: '🚐',
      defaultBaseL100: 8.6,
      description: 'Vehículos de reparto y transporte de mercancías',
      engines: [
        {
          id: 'pl_van_15_16_eco',
          key: 'pl_van_15_16_eco',
          nombreComun: '1.5L - 1.6L Eco Diésel',
          name: '1.5L - 1.6L Eco Diésel',
          cc: '1.499 - 1.598 cc',
          displacement: '1.499 - 1.598 cc',
          cilindrosPotencia: '4 Cilindros · 95 - 120 CV',
          powerCV: '95 - 120 CV',
          descripcionBreve: 'Furgoneta ligera para mensajería y reparto urbano con gasto mínimo.',
          description: 'Furgoneta ligera para mensajería y reparto urbano con gasto mínimo.',
          detalleInfo: {
            tipoManejo: 'Distribución urbana de última milla y paquetería.',
            ejemplosAutos: ['Renault Kangoo dCi', 'Peugeot Partner BlueHDi', 'Citroën Berlingo'],
            rendimientoYCombustible: 'Consumo mixto ~6,2 L/100 km. Diésel ON.',
          },
          consumoBaseL100: 6.2,
          baseL100: 6.2,
          fuelRecommendation: 'Diésel ON',
        },
        {
          id: 'pl_van_tdi',
          key: 'pl_van_tdi',
          nombreComun: '1.9L - 2.0L TDI / Diésel',
          name: '1.9L - 2.0L TDI / Diésel',
          cc: '1.968 cc',
          displacement: '1.968 cc',
          cilindrosPotencia: '4 Cilindros TDI · 130 - 150 CV',
          powerCV: '130 - 150 CV',
          descripcionBreve: 'Furgón mediano para rutas comerciales de volumen cerrado.',
          description: 'Furgón mediano para rutas comerciales de volumen cerrado.',
          detalleInfo: {
            tipoManejo: 'Rutas entre ciudades polacas y logística de mercancías.',
            ejemplosAutos: ['Volkswagen Transporter T6 TDI', 'Renault Trafic dCi', 'Ford Transit Custom'],
            rendimientoYCombustible: 'Consumo promedio ~8,6 L/100 km. Diésel ON.',
          },
          consumoBaseL100: 8.6,
          baseL100: 8.6,
          fuelRecommendation: 'Diésel ON',
        },
        {
          id: 'pl_van_25_mocny',
          key: 'pl_van_25_mocny',
          nombreComun: '2.5L+ Mocny / V6',
          name: '2.5L+ Mocny / V6',
          cc: '2.998 cc',
          displacement: '2.998 cc',
          cilindrosPotencia: '4 Cilindros · 170 - 190 CV',
          powerCV: '170 - 190 CV',
          descripcionBreve: 'Chasis reforzado para transporte de hasta 3,5 toneladas de carga.',
          description: 'Chasis reforzado para transporte de hasta 3,5 toneladas de carga.',
          detalleInfo: {
            tipoManejo: 'Carga industrial pesada en carreteras nacionales.',
            ejemplosAutos: ['Iveco Daily 3.0', 'Mercedes-Benz Sprinter 3.0', 'Fiat Ducato Maxi'],
            rendimientoYCombustible: 'Consumo promedio ~11,2 L/100 km. Diésel ON.',
          },
          consumoBaseL100: 11.2,
          baseL100: 11.2,
          fuelRecommendation: 'Diésel ON',
        },
        {
          id: 'pl_van_custom',
          key: 'pl_van_custom',
          nombreComun: 'Personalizado de Tablero',
          name: 'Personalizado de Tablero',
          cc: 'Ajuste manual',
          displacement: 'Ajuste manual',
          cilindrosPotencia: 'Calibración de usuario',
          powerCV: 'Calibración de usuario',
          descripcionBreve: 'Consumo medido según computador.',
          description: 'Consumo medido según computador.',
          detalleInfo: {
            tipoManejo: 'Personalizado.',
            ejemplosAutos: ['Cualquier furgón'],
            rendimientoYCombustible: 'Configuración libre.',
          },
          consumoBaseL100: 8.6,
          baseL100: 8.6,
        },
      ],
    },
    custom: {
      type: 'custom',
      label: 'Personalizado',
      shortLabel: 'Personalizado',
      icon: '⚡',
      defaultBaseL100: 8.0,
      description: 'Vehículo configurado libremente con consumo y cilindrada directa',
      engines: [
        {
          id: 'pl_custom_direct',
          key: 'pl_custom_direct',
          nombreComun: 'Calibración Libre de Odómetro',
          name: 'Calibración Libre de Odómetro',
          cc: 'Ajuste manual directo',
          displacement: 'Ajuste manual directo',
          cilindrosPotencia: 'Calibración libre de usuario',
          powerCV: 'Calibración libre de usuario',
          descripcionBreve: 'Calibra el consumo base exacto según los registros de tu computador de a bordo.',
          description: 'Calibra el consumo base exacto según los registros de tu computador de a bordo.',
          detalleInfo: {
            tipoManejo: 'Cualquier configuración vehicular personalizada.',
            ejemplosAutos: ['Vehículo personalizado con computador de a bordo'],
            rendimientoYCombustible: 'Configuración libre en litros por 100 km.',
          },
          consumoBaseL100: 8.0,
          baseL100: 8.0,
        },
      ],
    },
  };
}

export const UNIFIED_VEHICLE_CATALOG: Record<string, UnifiedVehicleCategory> = getVehicleCatalogForCountry('PL');

export interface ActiveVehicleState {
  vehicleType: 'compact' | 'sedan' | 'suv' | 'pickup' | 'van' | 'custom';
  engineKey: string;
  engineName: string;
  displacement: string;
  baseL100: number;
  transmission: 'manual' | 'automatic';
  vehicleModelName: string;
  carPhotoUrl: string | null;
  fuelType: string;
}

/**
 * Obtiene el estado actual sincronizado del vehículo desde localStorage
 */
export function getActiveVehicleState(): ActiveVehicleState {
  try {
    const vType = (localStorage.getItem('litrometrik_active_vehicle_type') ||
      localStorage.getItem('litrometrik_user_vehicle') ||
      'sedan') as ActiveVehicleState['vehicleType'];

    const category = UNIFIED_VEHICLE_CATALOG[vType] || UNIFIED_VEHICLE_CATALOG.sedan;
    const defaultEng = category.engines[0];

    const engineKey = localStorage.getItem('litrometrik_active_engine_key') || defaultEng.key;
    const engineName = localStorage.getItem('litrometrik_active_engine_name');

    // Buscar motor concordante por nombre o key
    const foundEng =
      (engineName ? category.engines.find((e) => e.nombreComun === engineName || e.name === engineName) : null) ||
      category.engines.find((e) => e.key === engineKey || e.id === engineKey) ||
      defaultEng;

    const storedBase = parseFloat(localStorage.getItem('litrometrik_active_base_l100') || '');
    const baseL100 = !isNaN(storedBase) && storedBase > 0 ? storedBase : foundEng.consumoBaseL100;

    const storedEngineName = localStorage.getItem('litrometrik_active_engine_name');
    const resolvedEngineName = storedEngineName || foundEng.nombreComun || foundEng.name;
    const storedDisplacement = localStorage.getItem('litrometrik_active_displacement');
    const resolvedDisplacement = storedDisplacement || foundEng.cc || foundEng.displacement;
    const transmission = (localStorage.getItem('litrometrik_active_transmission') || 'manual') as 'manual' | 'automatic';

    const rawVehicleModelName =
      localStorage.getItem('litrometrik_user_vehicle_model') ||
      localStorage.getItem('litrometrik_active_vehicle_model');

    const defaultModelName = `${category.shortLabel} (${resolvedEngineName})`;
    const vehicleModelName = rawVehicleModelName || defaultModelName;

    const carPhotoUrl =
      localStorage.getItem('litrometrik_car_photo') ||
      localStorage.getItem('litrometrik_user_car_photo') ||
      null;

    const fuelType =
      localStorage.getItem('litrometrik_active_fuel') ||
      localStorage.getItem('litrometrik_user_fuel') ||
      'Gasolina';

    return {
      vehicleType: vType,
      engineKey: foundEng.key,
      engineName: resolvedEngineName,
      displacement: resolvedDisplacement,
      baseL100,
      transmission,
      vehicleModelName,
      carPhotoUrl,
      fuelType,
    };
  } catch (_) {
    return {
      vehicleType: 'sedan',
      engineKey: 'sedan_16_std',
      engineName: 'Motor 1.6L Estándar',
      displacement: '1.598 cc',
      baseL100: 7.2,
      transmission: 'manual',
      vehicleModelName: 'Sedán (Motor 1.6L Estándar)',
      carPhotoUrl: null,
      fuelType: 'Gasolina',
    };
  }
}

/**
 * Guarda y propaga la calibración del vehículo para que Garaje, Modo Marcha y Calculadora
 * permanezcan 100% idénticos y en tiempo real.
 */
export function saveActiveVehicleState(partial: Partial<ActiveVehicleState>): ActiveVehicleState {
  const current = getActiveVehicleState();
  const next: ActiveVehicleState = { ...current, ...partial };

  const category = UNIFIED_VEHICLE_CATALOG[next.vehicleType] || UNIFIED_VEHICLE_CATALOG.sedan;
  const matchEng =
    category.engines.find((e) => e.nombreComun === next.engineName || e.name === next.engineName) ||
    category.engines.find((e) => e.key === next.engineKey || e.id === next.engineKey);

  if (matchEng) {
    next.engineKey = matchEng.key;
    if (!partial.displacement) next.displacement = matchEng.cc;
    if (!partial.baseL100) next.baseL100 = matchEng.consumoBaseL100;
  }

  if (partial.vehicleModelName) {
    next.vehicleModelName = partial.vehicleModelName;
  } else if (!next.vehicleModelName) {
    next.vehicleModelName = `${category.shortLabel} (${next.engineName})`;
  }

  try {
    localStorage.setItem('litrometrik_active_vehicle_type', next.vehicleType);
    localStorage.setItem('litrometrik_user_vehicle', next.vehicleType);
    localStorage.setItem('litrometrik_active_engine_key', next.engineKey);
    localStorage.setItem('litrometrik_active_engine_name', next.engineName);
    localStorage.setItem('litrometrik_active_base_l100', next.baseL100.toString());
    localStorage.setItem('litrometrik_active_transmission', next.transmission);
    localStorage.setItem('litrometrik_user_vehicle_model', next.vehicleModelName);
    localStorage.setItem('litrometrik_active_vehicle_model', next.vehicleModelName);
    if (next.displacement) {
      localStorage.setItem('litrometrik_active_displacement', next.displacement);
    }

    if (next.carPhotoUrl) {
      localStorage.setItem('litrometrik_car_photo', next.carPhotoUrl);
      localStorage.setItem('litrometrik_user_car_photo', next.carPhotoUrl);
    } else if (partial.carPhotoUrl === null) {
      localStorage.removeItem('litrometrik_car_photo');
      localStorage.removeItem('litrometrik_user_car_photo');
    }

    if (next.fuelType) {
      localStorage.setItem('litrometrik_active_fuel', next.fuelType);
      localStorage.setItem('litrometrik_user_fuel', next.fuelType);
    }

    // Emit global sync events across the entire application
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('litrometrik-vehicle-updated', { detail: next }));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (err) {
    console.warn('Error saving vehicle state:', err);
  }

  return next;
}
