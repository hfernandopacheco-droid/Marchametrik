export type CountryCode = 'PL' | 'CO' | 'US';

export interface VehicleCategoryData {
  ejemplos: string;
  motor: string;
  consumo: string;
  base: number;
  min: number;
  max: number;
  queEs?: string;
}

export interface CarModelSpec {
  id: string;
  brand: string;
  model: string;
  engine: string;
  displacementL: string;
  bodyType: 'compact' | 'sedan' | 'suv' | 'van' | 'pickup';
  defaultFuel: 'LPG' | 'Gasolina' | 'Gasolina 98' | 'Diésel' | 'GNV';
  badge?: string;
}

export interface CountryLegalTramite {
  id: string;
  title: string;
  tramiteType: string;
  entity: string;
  frequency: string;
  defaultCost: number;
  description: string;
}

export interface CountryMaintenanceTemplate {
  id: string;
  serviceType: string;
  productBrand: string;
  workshop: string;
  intervalKm: number;
  defaultCost: number;
  notes: string;
}

export interface CountryTireInfo {
  tipoPredeterminado: string;
  marcasPopulares: string[];
  presionDelanteraPsi: number;
  presionTraseraPsi: number;
  almacenajeOTaller: string;
}

export interface CountryInfo {
  codigo: CountryCode;
  nombre: string;
  bandera: string;
  moneda: string;
  unidadPrecio: string;
  unidadConsumo: string;
  gasolineras: string[];
  preciosDefecto: {
    gasolina: number;
    diesel: number;
    lpg: number;
  };
  etiquetasCombustible: {
    gasolina: string;
    diesel: string;
    lpg: string;
  };
  Compacto: VehicleCategoryData;
  Sedan: VehicleCategoryData;
  SUV: VehicleCategoryData;
  cars: CarModelSpec[];
  tramitesLegales: CountryLegalTramite[];
  mantenimientosTipicos: CountryMaintenanceTemplate[];
  neumaticosInfo: CountryTireInfo;
  ciudadesRutasEjemplo: string[];
}

export const DATA_PAIS: Record<CountryCode, CountryInfo> = {
  // =========================================================================
  // 1. POLONIA 🇵🇱
  // =========================================================================
  PL: {
    codigo: 'PL',
    nombre: 'Polonia',
    bandera: '🇵🇱',
    moneda: 'PLN',
    unidadPrecio: 'PLN/L',
    unidadConsumo: 'L/100km',
    gasolineras: ['Orlen', 'BP Polska', 'Shell Polska', 'Circle K', 'Moya', 'Lotos', 'Amic Energy', 'Avia'],
    preciosDefecto: { gasolina: 6.09, diesel: 6.15, lpg: 2.89 },
    etiquetasCombustible: { lpg: 'LPG / Autogaz', gasolina: 'Benzyna / Gasolina', diesel: 'Diesel / ON' },
    ciudadesRutasEjemplo: ['Varsovia a Cracovia (A4)', 'Gdansk a Varsovia (S7)', 'Wrocław a Poznań (S5)'],
    Compacto: {
      ejemplos: "Toyota Yaris, Fiat 500, Skoda Fabia",
      motor: "1.0-1.4L",
      consumo: "5.5-7.0",
      base: 6.0,
      min: 4.8,
      max: 7.5,
      queEs: "Compacto / Urbano: Auto pequeño, ágil en ciudad y muy fácil de parquear"
    },
    Sedan: {
      ejemplos: "Skoda Octavia, Toyota Corolla, VW Passat",
      motor: "1.5-2.0L",
      consumo: "7.5-9.0",
      base: 8.5,
      min: 6.5,
      max: 10.0,
      queEs: "Sedán / Mediano: Auto familiar estándar, cómodo para viajes largos y autopistas A4/A1"
    },
    SUV: {
      ejemplos: "Dacia Duster, Toyota RAV4, Kia Sportage, Hyundai Tucson",
      motor: "1.6-3.0L",
      consumo: "9.5-11.0",
      base: 10.5,
      min: 8.5,
      max: 13.5,
      queEs: "Grande / SUV / Camioneta Alta: Carro alto, familiar, 4x4, baúl grande"
    },
    cars: [
      { id: 'pl-mazda-3-16-glp', brand: 'Mazda', model: 'Mazda 3 1.6 MPI (LPG)', engine: '1.6L MZR 105 CV Gas LPG / PB', displacementL: '1.6', bodyType: 'sedan', defaultFuel: 'LPG', badge: 'Mazda 1.6 LPG' },
      { id: 'pl-skoda-octavia-glp', brand: 'Skoda', model: 'Octavia 1.6 MPI (LPG)', engine: '1.6L MPI 102 CV Gas LPG', displacementL: '1.6', bodyType: 'sedan', defaultFuel: 'LPG', badge: 'Top Ventas LPG' },
      { id: 'pl-toyota-corolla-hybrid', brand: 'Toyota', model: 'Corolla 1.8 Hybrid', engine: '1.8L Hybrid 140 CV', displacementL: '1.8', bodyType: 'sedan', defaultFuel: 'Gasolina', badge: 'Híbrido Ahorro' },
      { id: 'pl-dacia-duster-glp', brand: 'Dacia', model: 'Duster 1.0 ECO-G (LPG)', engine: '1.0L TCe ECO-G 100 CV Bi-Fuel LPG', displacementL: '1.0', bodyType: 'suv', defaultFuel: 'LPG', badge: 'LPG Original' },
      { id: 'pl-vw-golf-tdi', brand: 'Volkswagen', model: 'Golf 2.0 TDI', engine: '2.0L TDI 150 CV', displacementL: '2.0', bodyType: 'compact', defaultFuel: 'Diésel' },
      { id: 'pl-kia-sportage', brand: 'Kia', model: 'Sportage 1.6 T-GDI', engine: '1.6L Turbo T-GDI 150 CV', displacementL: '1.6', bodyType: 'suv', defaultFuel: 'Gasolina' }
    ],
    tramitesLegales: [
      {
        id: 'pl_badanie_skp',
        title: 'Badanie Techniczne (Przegląd SKP)',
        tramiteType: 'Przegląd',
        entity: 'Stacja Kontroli Pojazdów (SKP)',
        frequency: 'Anual (12 meses)',
        defaultCost: 99.00,
        description: 'Inspección técnica anual obligatoria en Polonia. Incluye revisión de frenos, gases y prueba de estanqueidad para instalación LPG.'
      },
      {
        id: 'pl_ubezpieczenie_oc',
        title: 'Ubezpieczenie Komunikacyjne OC / AC',
        tramiteType: 'OC / AC',
        entity: 'PZU Ubezpieczenia / Warta',
        frequency: 'Anual (12 meses)',
        defaultCost: 780.00,
        description: 'Seguro de responsabilidad civil automotriz obligatorio (Odpowiedzialność Cywilna) con opción de AutoCasco y asistencia.'
      },
      {
        id: 'pl_dozor_tdt_lpg',
        title: 'Dozór Techniczny Zbiornika LPG (TDT)',
        tramiteType: 'Homologación Gas',
        entity: 'Transportowy Dozór Techniczny (TDT)',
        frequency: 'Cada 10 años',
        defaultCost: 250.00,
        description: 'Certificación oficial de legalidad y prueba de presión del tanque de gas LPG / Autogaz.'
      },
      {
        id: 'pl_dowod_rejestracyjny',
        title: 'Dowód Rejestracyjny & Tablice',
        tramiteType: 'Registro Vehicular',
        entity: 'Wydział Komunikacji Urząd Miasta',
        frequency: 'Permanente',
        defaultCost: 161.50,
        description: 'Tarjeta de circulación y permiso administrativo de circulación oficial polaco.'
      }
    ],
    mantenimientosTipicos: [
      {
        id: 'pl_maint_aceite',
        serviceType: 'Cambio de Aceite & Filtros',
        productBrand: 'Motul 8100 X-cess 5W40 + Mann Filter',
        workshop: 'AutoSerwis Kraków',
        intervalKm: 12000,
        defaultCost: 320.00,
        notes: 'Aceite sintético de alto rendimiento para clima frío de Europa Central y autopista.'
      },
      {
        id: 'pl_maint_glp',
        serviceType: 'Filtros y Calibración LPG',
        productBrand: 'Certools F-779/D Bulpren + KME Diego',
        workshop: 'LPG Serwis Katowice',
        intervalKm: 15000,
        defaultCost: 150.00,
        notes: 'Sustitución de filtros de fase líquida y gaseosa para instalación de Autogaz.'
      },
      {
        id: 'pl_maint_frenos',
        serviceType: 'Frenos y Pastillas Delanteras',
        productBrand: 'Brembo Prime / ATE Ceramic',
        workshop: 'Norauto Warszawa',
        intervalKm: 35000,
        defaultCost: 280.00,
        notes: 'Pastillas y revisión de líquido de frenos DOT4 para frenadas seguras en lluvia o nieve.'
      }
    ],
    neumaticosInfo: {
      tipoPredeterminado: 'Invierno (Zimowe) / Całoroczne',
      marcasPopulares: ['Michelin Alpin 6', 'Dębica Frigo HP2', 'Nokian WR Snowproof', 'Goodyear Vector 4Seasons'],
      presionDelanteraPsi: 32,
      presionTraseraPsi: 34,
      almacenajeOTaller: 'Hotel Opon Serwis Warszawa'
    }
  },

  // =========================================================================
  // 2. COLOMBIA 🇨🇴
  // =========================================================================
  CO: {
    codigo: 'CO',
    nombre: 'Colombia',
    bandera: '🇨🇴',
    moneda: 'COP',
    unidadPrecio: 'COP/L',
    unidadConsumo: 'km/L',
    gasolineras: ['Terpel', 'Primax', 'Texaco', 'Biomax', 'Petromil', 'Mobil Colombia', 'Esso', 'Brio'],
    preciosDefecto: { gasolina: 4200, diesel: 4350, lpg: 2400 },
    etiquetasCombustible: { lpg: 'Gas GLP / Gas Vehicular', gasolina: 'Gasolina Corriente / Extra', diesel: 'Diésel / ACPM' },
    ciudadesRutasEjemplo: ['Bogotá a Medellín (Autopista Medellín)', 'Cali a Buenaventura', 'Barranquilla a Cartagena (Vía al Mar)'],
    Compacto: {
      ejemplos: "Renault Kwid, Kia Picanto, Chevrolet Spark GT",
      motor: "1.0-1.4L",
      consumo: "5.8-7.0",
      base: 6.2,
      min: 5.0,
      max: 7.8,
      queEs: "Compacto / Urbano: Carro pequeño rendidor para trancones de Bogotá, Medellín y Cali"
    },
    Sedan: {
      ejemplos: "Mazda 3, Chevrolet Onix Turbo, Renault Logan, Toyota Corolla",
      motor: "1.6-2.5L",
      consumo: "7.8-9.2",
      base: 8.2,
      min: 6.8,
      max: 10.5,
      queEs: "Sedán / Mediano: Carro espacioso para la familia, autopistas y subidas de cordillera"
    },
    SUV: {
      ejemplos: "Renault Duster, Toyota Hilux, Fortuner, Tracker, Mazda CX-30",
      motor: "1.6-4.0L Diésel/Gasolina",
      consumo: "9.5-12.5",
      base: 11.0,
      min: 8.5,
      max: 14.5,
      queEs: "Grande / SUV / Camioneta: Carro alto familiar, 4x4, apto para trocha y carretera de montaña"
    },
    cars: [
      { id: 'co-renault-duster-16', brand: 'Renault', model: 'Duster 1.6 16V', engine: '1.6L 16V 115 HP Gasolina', displacementL: '1.6', bodyType: 'suv', defaultFuel: 'Gasolina', badge: 'Camioneta #1' },
      { id: 'co-mazda-cx30-20', brand: 'Mazda', model: 'Mazda CX-30 2.0L MHEV', engine: '2.0L Skyactiv-G Híbrido Ligero', displacementL: '2.0', bodyType: 'suv', defaultFuel: 'Gasolina', badge: 'Líder en Ventas' },
      { id: 'co-toyota-hilux-diesel', brand: 'Toyota', model: 'Hilux 2.4 / 2.8 D-4D', engine: '2.8L Turbo Diésel 201 HP', displacementL: '2.8', bodyType: 'pickup', defaultFuel: 'Diésel', badge: 'Trabajo Pesado' },
      { id: 'co-chevrolet-onix-turbo', brand: 'Chevrolet', model: 'Onix Turbo 1.0L', engine: '1.0L Turbo 3-Cilindros 115 HP', displacementL: '1.0', bodyType: 'sedan', defaultFuel: 'Gasolina' },
      { id: 'co-kia-picanto-125', brand: 'Kia', model: 'Picanto 1.25 X-Line', engine: '1.25L CVVT 84 HP', displacementL: '1.2', bodyType: 'compact', defaultFuel: 'Gasolina' },
      { id: 'co-toyota-corolla-cross', brand: 'Toyota', model: 'Corolla Cross 1.8 Híbrido', engine: '1.8L Híbrido 122 HP Sin Pico y Placa', displacementL: '1.8', bodyType: 'suv', defaultFuel: 'Gasolina', badge: 'Exento Pico y Placa' }
    ],
    tramitesLegales: [
      {
        id: 'co_soat_sura',
        title: 'SOAT Seguro Obligatorio (RUNT)',
        tramiteType: 'SOAT',
        entity: 'Seguros SURA / RUNT',
        frequency: 'Anual (12 meses)',
        defaultCost: 650000,
        description: 'Seguro Obligatorio de Accidentes de Tránsito reglamentario en Colombia, registrado en el RUNT.'
      },
      {
        id: 'co_tecnomecanica_cda',
        title: 'Revisión Técnico-Mecánica y Emisiones (RTM)',
        tramiteType: 'Tecnomecánica',
        entity: 'CDA Autorizado Ministerio de Transporte',
        frequency: 'Anual (autos particulares > 5 años)',
        defaultCost: 310000,
        description: 'Inspección técnico-mecánica y de gases contaminantes en Centros de Diagnóstico Automotor (CDA).'
      },
      {
        id: 'co_impuesto_vehicular',
        title: 'Impuesto de Vehículos Automotores',
        tramiteType: 'Impuestos',
        entity: 'Gobernación / Secretaría de Hacienda',
        frequency: 'Anual',
        defaultCost: 450000,
        description: 'Impuesto departamental y distrital sobre vehículos según avalúo comercial del Ministerio de Transporte.'
      },
      {
        id: 'co_certificacion_gas',
        title: 'Certificación Anual Kit Gas GNV/LPG',
        tramiteType: 'Certificación Gas',
        entity: 'Organismo de Certificación Acreditado (ONAC)',
        frequency: 'Anual',
        defaultCost: 120000,
        description: 'Revisión anual obligatoria de fugas, válvula y cilindro para vehículos a gas vehicular en Colombia.'
      }
    ],
    mantenimientosTipicos: [
      {
        id: 'co_maint_aceite',
        serviceType: 'Cambio de Aceite & Filtros',
        productBrand: 'Mobil Super 2000 10W30 / Terpel Oiltec',
        workshop: 'Serviteca Terpel / Coéxito Bogotá',
        intervalKm: 8000,
        defaultCost: 280000,
        notes: 'Cambio preventivo de aceite para tráfico pesado y pendientes colombianas.'
      },
      {
        id: 'co_maint_sincronizacion',
        serviceType: 'Sincronización & Limpieza Inyectores',
        productBrand: 'Bujías NGK Láser + Limpiador Inyección',
        workshop: 'Taller Especializado El Campín',
        intervalKm: 25000,
        defaultCost: 350000,
        notes: 'Limpieza con ultrasonido y ajuste de ralentí para altitud (2.600 msnm).'
      },
      {
        id: 'co_maint_frenos_susp',
        serviceType: 'Pastillas de Freno & Suspensión',
        productBrand: 'Incolbest Cerámica / Amortiguadores Gabriel',
        workshop: 'Serviteca Goodyear Calle 80',
        intervalKm: 30000,
        defaultCost: 420000,
        notes: 'Cambio de pastillas y alineación 3D para resistir baches e irregularidades viales.'
      }
    ],
    neumaticosInfo: {
      tipoPredeterminado: 'Todo Terreno / Mixtas All-Terrain',
      marcasPopulares: ['Goodyear Assurance MaxGuard', 'Michelin Primacy 4', 'Pirelli Scorpion', 'Hankook Dynapro'],
      presionDelanteraPsi: 32,
      presionTraseraPsi: 32,
      almacenajeOTaller: 'Serviteca Autorizada Medellín'
    }
  },

  // =========================================================================
  // 3. ESTADOS UNIDOS 🇺🇸
  // =========================================================================
  US: {
    codigo: 'US',
    nombre: 'Estados Unidos',
    bandera: '🇺🇸',
    moneda: 'USD',
    unidadPrecio: 'USD/L',
    unidadConsumo: 'MPG',
    gasolineras: ['Chevron', 'Shell US', 'ExxonMobil', 'BP America', 'Costco Gas', 'Texaco', 'Marathon', 'Sunoco'],
    preciosDefecto: { gasolina: 0.95, diesel: 1.05, lpg: 0.70 },
    etiquetasCombustible: { gasolina: 'Gasoline (Regular / Premium)', diesel: 'Diesel', lpg: 'LPG / Propane' },
    ciudadesRutasEjemplo: ['New York a Boston (I-95)', 'Miami a Orlando (Turnpike)', 'Dallas a Houston (I-45)'],
    Compacto: {
      ejemplos: "Honda Civic, Toyota Corolla, Mini Cooper, Chevy Bolt",
      motor: "1.5-2.0L 4-Cyl",
      consumo: "32-38 MPG (~6.5 L/100km)",
      base: 6.5,
      min: 5.0,
      max: 8.0,
      queEs: "Compact / Coupe: Auto ágil y eficiente para desplazamientos metropolitanos y bajo consumo"
    },
    Sedan: {
      ejemplos: "Toyota Camry, Honda Accord, Tesla Model 3, Hyundai Sonata",
      motor: "2.0-2.5L 4-Cyl / V6",
      consumo: "28-34 MPG (~7.5 L/100km)",
      base: 7.5,
      min: 6.2,
      max: 9.5,
      queEs: "Sedan: Vehículo familiar estándar y confortable para autopistas interestatales (Interstate)"
    },
    SUV: {
      ejemplos: "Ford Explorer, Jeep Grand Cherokee, Toyota RAV4, Chevy Tahoe",
      motor: "2.5-3.5L V6 / 5.0L+ V8",
      consumo: "20-26 MPG (~9.8 L/100km)",
      base: 9.8,
      min: 7.5,
      max: 13.5,
      queEs: "SUV / Crossover: Camioneta espaciosa con tracción AWD/4WD y gran capacidad para viajes largos"
    },
    cars: [
      { id: 'us-toyota-camry-25', brand: 'Toyota', model: 'Camry 2.5L', engine: '2.5L 4-Cyl 203 HP', displacementL: '2.5', bodyType: 'sedan', defaultFuel: 'Gasolina', badge: 'Top Seller USA' },
      { id: 'us-ford-f150-v6', brand: 'Ford', model: 'F-150 3.5L EcoBoost', engine: '3.5L V6 Twin-Turbo 400 HP', displacementL: '3.5', bodyType: 'pickup', defaultFuel: 'Gasolina', badge: 'Best Selling Truck' },
      { id: 'us-honda-crv-15', brand: 'Honda', model: 'CR-V 1.5L Turbo', engine: '1.5L 4-Cyl Turbo 190 HP', displacementL: '1.5', bodyType: 'suv', defaultFuel: 'Gasolina', badge: 'Family SUV' },
      { id: 'us-jeep-cherokee-v6', brand: 'Jeep', model: 'Grand Cherokee 3.6L V6', engine: '3.6L Pentastar V6 293 HP', displacementL: '3.6', bodyType: 'suv', defaultFuel: 'Gasolina' },
      { id: 'us-chevy-silverado-v8', brand: 'Chevrolet', model: 'Silverado 1500 5.3L V8', engine: '5.3L EcoTec3 V8 355 HP', displacementL: '5.3', bodyType: 'pickup', defaultFuel: 'Gasolina' },
      { id: 'us-ram-diesel', brand: 'RAM', model: 'RAM 2500 Heavy Duty Diesel', engine: '6.7L Cummins Turbo Diesel 370 HP', displacementL: '6.7', bodyType: 'pickup', defaultFuel: 'Diésel', badge: 'Heavy Duty' }
    ],
    tramitesLegales: [
      {
        id: 'us_dmv_registration',
        title: 'DMV Annual Vehicle Registration',
        tramiteType: 'Registration',
        entity: 'Department of Motor Vehicles (DMV)',
        frequency: 'Anual (12 meses)',
        defaultCost: 150.00,
        description: 'Renovación anual del registro estatal y sticker de la matrícula (license plate tags).'
      },
      {
        id: 'us_smog_inspection',
        title: 'State Safety & Smog Check Inspection',
        tramiteType: 'Inspection',
        entity: 'State Certified Inspection Station',
        frequency: 'Cada 1 a 2 años según el estado',
        defaultCost: 55.00,
        description: 'Inspección técnica estatal obligatoria de seguridad mecánica y control de emisiones contaminantes.'
      },
      {
        id: 'us_auto_insurance',
        title: 'Auto Insurance (Full Coverage / Liability)',
        tramiteType: 'Insurance',
        entity: 'Geico / Progressive / State Farm',
        frequency: 'Semestral / Anual',
        defaultCost: 720.00,
        description: 'Póliza de seguro automotor reglamentaria obligatoria de responsabilidad civil con cobertura integral.'
      },
      {
        id: 'us_toll_pass',
        title: 'Electronic Toll Pass (E-ZPass / SunPass)',
        tramiteType: 'Peajes',
        entity: 'State Highway Toll Authority',
        frequency: 'Prepago recargable',
        defaultCost: 35.00,
        description: 'Transpondedor electrónico para pago automático de peajes en autopistas, puentes y túneles.'
      }
    ],
    mantenimientosTipicos: [
      {
        id: 'us_maint_oil',
        serviceType: 'Full Synthetic Oil Change & Filter',
        productBrand: 'Mobil 1 Full Synthetic 0W-20 / Pennzoil Platinum',
        workshop: 'Jiffy Lube / Valvoline Instant Oil Change',
        intervalKm: 12000,
        defaultCost: 85.00,
        notes: 'Cambio de aceite 100% sintético y filtro OEM para clima variado y viajes interestatales.'
      },
      {
        id: 'us_maint_brakes',
        serviceType: 'Front Brake Pads & Rotors Service',
        productBrand: 'Wagner OEx Ceramic / Bosch QuietCast',
        workshop: 'Firestone Complete Auto Care',
        intervalKm: 40000,
        defaultCost: 260.00,
        notes: 'Pastillas cerámicas y rectificado o reemplazo de rotores para frenado seguro en autopista.'
      },
      {
        id: 'us_maint_rotation',
        serviceType: 'Tire Rotation & Balance + Alignment',
        productBrand: 'Hunter Road Force Balance',
        workshop: 'Discount Tire / Goodyear Auto Service',
        intervalKm: 15000,
        defaultCost: 75.00,
        notes: 'Rotación periódica para desgaste parejo de neumáticos en recorridos de alta velocidad.'
      }
    ],
    neumaticosInfo: {
      tipoPredeterminado: 'All-Season / Highway Terrain',
      marcasPopulares: ['Goodyear Assurance', 'Michelin Defender 2', 'Bridgestone Dueler', 'Continental TrueContact'],
      presionDelanteraPsi: 34,
      presionTraseraPsi: 34,
      almacenajeOTaller: 'Discount Tire / Firestone Auto Care'
    }
  },

};

export function detectDefaultCountry(): CountryCode {
  try {
    const saved = localStorage.getItem('litrometrik_selected_country');
    if (saved && (saved in DATA_PAIS)) {
      return saved as CountryCode;
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Bogota') || tz.includes('Colombia')) return 'CO';
    if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles') || tz.includes('Denver') || tz.includes('Phoenix') || tz.includes('America') || tz.includes('US')) return 'US';
    if (tz.includes('Warsaw') || tz.includes('Poland')) return 'PL';
  } catch (e) {}
  return 'PL';
}
