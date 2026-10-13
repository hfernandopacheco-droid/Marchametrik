import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Plus,
  Calendar,
  DollarSign,
  Fuel,
  Wrench,
  Disc,
  FileText,
  Camera,
  CheckCircle2,
  Trash2,
  Search,
  ChevronDown,
  X,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Check,
} from 'lucide-react';
import {
  saveCloudRecord,
  deleteCloudRecord,
  subscribeToCloudCollection,
  CloudCollection,
} from '../utils/firestoreService';
import { getStoredActiveUser, subscribeToAuth } from '../utils/firebaseAuth';
import { DATA_PAIS, CountryCode } from '../utils/countryData';
import { processImageFile } from '../utils/imageUtils';
import { ImageViewerModal } from './ImageViewerModal';
import {
  insertSupabaseRefuel,
  deleteSupabaseRefuel,
  insertSupabaseGarageRecord,
  deleteSupabaseGarageRecord,
  getSupabaseRefuels,
  getSupabaseGarageRecords,
} from '../utils/supabaseClient';

export type SupportedCountry = CountryCode;
export type ModuleKey = 'refuels' | 'maintenance' | 'tires' | 'legal';
export type RecordCategory = 'bitacora' | 'mantenimiento' | 'neumaticos' | 'tramites';

export interface BaseRecord {
  id: string;
  createdAt: string;
  categoria: RecordCategory;
  userId?: string;
  pais: SupportedCountry;
  moneda: string;
  odometer: number;
  cost: number;
  title: string;
  notes?: string;
  receiptUrl?: string;
  receiptName?: string;
}

export interface RefuelRecord extends BaseRecord {
  categoria: 'bitacora';
  station: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  kmSinceLastRefuel?: number;
  consumptionL100?: number;
  refuelDate: string;
}

export interface MaintenanceRecord extends BaseRecord {
  categoria: 'mantenimiento';
  serviceType: string;
  productBrand?: string;
  workshop?: string;
  serviceDate: string;
  nextServiceKm?: number;
  nextServiceDate?: string;
}

export interface TireRecord extends BaseRecord {
  categoria: 'neumaticos';
  tireType: string;
  brandAndDot?: string;
  pressureFrontPsi: number;
  pressureRearPsi: number;
  installDate: string;
  nextCheckDate?: string;
  storageLocation?: string;
}

export interface LegalRecord extends BaseRecord {
  categoria: 'tramites';
  tramiteType: string;
  entity: string;
  startDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: 'vigente' | 'por_vencer' | 'vencido';
}

export type AnyRecord = RefuelRecord | MaintenanceRecord | TireRecord | LegalRecord;

export interface CategoryDetailProps {
  moduleKey: ModuleKey | null;
  onBack?: () => void;
  onClose?: () => void;
  onBackToCategories?: () => void;
  onOpenAuth?: () => void;
  selectedCountry?: SupportedCountry;
  onCountryChange?: (c: SupportedCountry) => void;
  currentUser?: any;
}

// Helper to determine collection and category
function getCollectionAndCategory(key: ModuleKey): { collection: string; categoria: RecordCategory } {
  switch (key) {
    case 'refuels':
      return { collection: 'repostajes', categoria: 'bitacora' };
    case 'maintenance':
      return { collection: 'mantenimientos', categoria: 'mantenimiento' };
    case 'tires':
      return { collection: 'neumaticos', categoria: 'neumaticos' };
    case 'legal':
    default:
      return { collection: 'tramites', categoria: 'tramites' };
  }
}

// Country metadata
const COUNTRY_INFO: Record<SupportedCountry, { name: string; flag: string; currency: string; currencySymbol: string }> = {
  CO: { name: 'Colombia', flag: '🇨🇴', currency: 'COP', currencySymbol: '$' },
  PL: { name: 'Polonia', flag: '🇵🇱', currency: 'PLN', currencySymbol: 'zł' },
  US: { name: 'Estados Unidos', flag: '🇺🇸', currency: 'USD', currencySymbol: '$' },
};

// Official Entities and Insurance Companies by Country
const COUNTRY_ENTITIES: Record<SupportedCountry, string[]> = {
  PL: [
    'Stacja Kontroli Pojazdów (SKP)',
    'Transportowy Dozór Techniczny (TDT)',
    'PZU Ubezpieczenia',
    'Warta Ubezpieczenia',
    'Ergo Hestia',
    'Generali Polska',
    'Allianz Polska',
    'Uniqa Ubezpieczenia',
    'Link4',
    'Wiener TU S.A.',
    'Wydział Komunikacji Urząd Miasta',
    'Compensa TU S.A.',
    'TÜV Rheinland Polska'
  ],
  CO: [
    'Seguros SURA',
    'Seguros Bolívar',
    'Seguros del Estado',
    'AXA Colpatria',
    'Mapfre Colombia',
    'La Previsora Seguros',
    'Equidad Seguros',
    'CDA Autorizado (RTM)',
    'Secretaría de Movilidad / RUNT',
    'Liberty Seguros',
    'Aseguradora Solidaria de Colombia',
    'Allianz Colombia'
  ],
  US: [
    'Department of Motor Vehicles (DMV)',
    'Geico Auto Insurance',
    'State Farm Insurance',
    'Progressive Auto Insurance',
    'Allstate Insurance',
    'USAA Casualty Insurance',
    'Liberty Mutual',
    'AAA Roadside & Insurance',
    'State Smog / Safety Inspection Station',
    'Jiffy Lube & Fleet Care',
    'Firestone Complete Auto Care'
  ],
};

function calculateDaysRemaining(expiryDateStr: string): number {
  if (!expiryDateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Default seed records across all categories & countries
const DEFAULT_SEED_RECORDS: AnyRecord[] = [
  // --- BITÁCORA ---
  {
    id: 'seed_refuel_1',
    createdAt: '2026-09-28T10:30:00Z',
    categoria: 'bitacora',
    pais: 'PL',
    moneda: 'PLN',
    odometer: 145500,
    cost: 101.15,
    title: 'Repostaje Orlen (Gas LPG)',
    station: 'Orlen Kraków',
    fuelType: 'LPG',
    liters: 35.0,
    pricePerLiter: 2.89,
    kmSinceLastRefuel: 380,
    consumptionL100: 9.21,
    refuelDate: '2026-09-28',
    notes: 'Tanque lleno con gas LPG. Rendimiento óptimo en autopista A4.',
    receiptUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=400&q=80',
    receiptName: 'ticket_orlen_lpg.jpg'
  },
  {
    id: 'seed_refuel_2',
    createdAt: '2026-09-20T14:15:00Z',
    categoria: 'bitacora',
    pais: 'PL',
    moneda: 'PLN',
    odometer: 145120,
    cost: 290.25,
    title: 'Repostaje BP (Gasolina 95)',
    station: 'BP Warszawa',
    fuelType: 'Gasolina 95',
    liters: 45.0,
    pricePerLiter: 6.45,
    kmSinceLastRefuel: 600,
    consumptionL100: 7.50,
    refuelDate: '2026-09-20',
    notes: 'Carga de gasolina 95 para arranque y viaje largo.',
    receiptUrl: 'https://images.unsplash.com/photo-1527018607636-231362e831ea?auto=format&fit=crop&w=400&q=80',
    receiptName: 'recibo_bp_95.jpg'
  },
  {
    id: 'seed_refuel_3',
    createdAt: '2026-09-25T09:00:00Z',
    categoria: 'bitacora',
    pais: 'CO',
    moneda: 'COP',
    odometer: 98500,
    cost: 165900,
    title: 'Repostaje Terpel (Corriente)',
    station: 'Terpel Bogotá',
    fuelType: 'Gasolina',
    liters: 39.7,
    pricePerLiter: 4180,
    kmSinceLastRefuel: 480,
    consumptionL100: 8.27,
    refuelDate: '2026-09-25',
    notes: 'Tanqueo completo estación Autopista Norte.',
    receiptUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=400&q=80',
    receiptName: 'terpel_factura.png'
  },
  {
    id: 'seed_refuel_4',
    createdAt: '2026-09-22T16:00:00Z',
    categoria: 'bitacora',
    pais: 'US',
    moneda: 'USD',
    odometer: 120400,
    cost: 38.64,
    title: 'Repostaje Chevron (Regular 87)',
    station: 'Chevron Miami',
    fuelType: 'Gasolina',
    liters: 42.0,
    pricePerLiter: 0.92,
    kmSinceLastRefuel: 430,
    consumptionL100: 9.76,
    refuelDate: '2026-09-22',
    notes: 'Tanque lleno en Biscayne Blvd para trayecto interestatal.',
  },

  // --- MANTENIMIENTO ---
  {
    id: 'seed_maint_1',
    createdAt: '2026-09-15T08:00:00Z',
    categoria: 'mantenimiento',
    pais: 'PL',
    moneda: 'PLN',
    odometer: 145000,
    cost: 320.00,
    title: 'Cambio de Aceite & Filtros - Motul 8100',
    serviceType: 'Aceite y Filtro',
    productBrand: 'Motul 8100 X-cess 5W40 + Mann Filter',
    workshop: 'AutoSerwis Kraków',
    serviceDate: '2026-09-15',
    nextServiceKm: 155000,
    nextServiceDate: '2027-09-15',
    notes: 'Cambio completo de aceite sintético, filtro de aceite y filtro de habitáculo.',
    receiptUrl: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=400&q=80',
    receiptName: 'factura_taller_motul.jpg'
  },
  {
    id: 'seed_maint_2',
    createdAt: '2026-08-10T12:00:00Z',
    categoria: 'mantenimiento',
    pais: 'PL',
    moneda: 'PLN',
    odometer: 140000,
    cost: 150.00,
    title: 'Filtro LPG / Gas - LPG Serwis Katowice',
    serviceType: 'Filtro LPG / Gas',
    productBrand: 'Certools F-779/D Bulpren + Czyszczenie',
    workshop: 'LPG Serwis Katowice',
    serviceDate: '2026-08-10',
    nextServiceKm: 150000,
    nextServiceDate: '2027-08-10',
    notes: 'Sustitución de filtros de fase líquida y gaseosa para instalación LPG.',
  },
  {
    id: 'seed_maint_3',
    createdAt: '2026-09-02T10:00:00Z',
    categoria: 'mantenimiento',
    pais: 'CO',
    moneda: 'COP',
    odometer: 98000,
    cost: 280000,
    title: 'Cambio de Aceite & Filtros - Serviteca Terpel',
    serviceType: 'Aceite y Filtro',
    productBrand: 'Mobil Super 2000 10W30',
    workshop: 'Serviteca Terpel Bogotá',
    serviceDate: '2026-09-02',
    nextServiceKm: 108000,
    nextServiceDate: '2027-09-02',
    notes: 'Mantenimiento preventivo de los 98.000 km.',
  },
  {
    id: 'seed_maint_4',
    createdAt: '2026-07-20T11:30:00Z',
    categoria: 'mantenimiento',
    pais: 'US',
    moneda: 'USD',
    odometer: 118000,
    cost: 115.00,
    title: 'Front Brake Pads & Fluid - Firestone Miami',
    serviceType: 'Frenos y Pastillas',
    productBrand: 'Wagner QuickStop Ceramic',
    workshop: 'Firestone Complete Auto Care',
    serviceDate: '2026-07-20',
    nextServiceKm: 160000,
    nextServiceDate: '2028-07-20',
    notes: 'Reemplazo de pastillas delanteras de freno y purga de líquido DOT4.',
  },

  // --- NEUMÁTICOS ---
  {
    id: 'seed_tire_1',
    createdAt: '2026-09-10T15:00:00Z',
    categoria: 'neumaticos',
    pais: 'PL',
    moneda: 'PLN',
    odometer: 144500,
    cost: 140.00,
    title: 'Montaje & Balanceo Neumáticos de Invierno',
    tireType: 'Invierno (Zimowe)',
    brandAndDot: 'Michelin Alpin 6 (205/55 R16) DOT 3823',
    pressureFrontPsi: 32.5,
    pressureRearPsi: 34.0,
    installDate: '2026-09-10',
    nextCheckDate: '2027-03-10',
    storageLocation: 'Hotel Opon Serwis Warszawa',
    notes: 'Neumáticos de invierno montados con balanceo dinámico y ajuste de presión.',
    receiptUrl: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=400&q=80',
    receiptName: 'recibo_opony_michelin.png'
  },
  {
    id: 'seed_tire_2',
    createdAt: '2026-08-05T09:00:00Z',
    categoria: 'neumaticos',
    pais: 'CO',
    moneda: 'COP',
    odometer: 96000,
    cost: 80000,
    title: 'Alineación 3D y Balanceo de Llantas',
    tireType: 'Todo Terreno / Mixtas',
    brandAndDot: 'Goodyear Assurance (205/60 R16) DOT 1224',
    pressureFrontPsi: 32.0,
    pressureRearPsi: 32.0,
    installDate: '2026-08-05',
    nextCheckDate: '2027-02-05',
    storageLocation: 'Serviteca Autorizada Medellín',
    notes: 'Alineación computarizada para evitar desgaste irregular en trocha.',
  },

  // --- TRÁMITES ---
  {
    id: 'seed_legal_1',
    createdAt: '2026-09-01T10:00:00Z',
    categoria: 'tramites',
    pais: 'PL',
    moneda: 'PLN',
    odometer: 144000,
    cost: 99.00,
    title: 'Przegląd Techniczny - SKP Kraków',
    tramiteType: 'Przegląd',
    entity: 'Stacja Kontroli Pojazdów (SKP)',
    startDate: '2026-09-01',
    expiryDate: '2027-09-01',
    daysRemaining: 335,
    status: 'vigente',
    notes: 'Inspección vehicular periódica aprobada sin fallas (incluye prueba de gas LPG).',
    receiptUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80',
    receiptName: 'przeglad_skp_cert.pdf'
  },
  {
    id: 'seed_legal_2',
    createdAt: '2026-08-15T12:00:00Z',
    categoria: 'tramites',
    pais: 'PL',
    moneda: 'PLN',
    odometer: 143500,
    cost: 850.00,
    title: 'Seguro Obligatorio OC / AC - PZU Ubezpieczenia',
    tramiteType: 'OC / AC',
    entity: 'PZU Ubezpieczenia',
    startDate: '2026-08-15',
    expiryDate: '2027-08-15',
    daysRemaining: 318,
    status: 'vigente',
    notes: 'Póliza de seguro anual con cobertura de asistencia en carretera y rescate.',
  },
  {
    id: 'seed_legal_3',
    createdAt: '2026-06-10T10:00:00Z',
    categoria: 'tramites',
    pais: 'CO',
    moneda: 'COP',
    odometer: 94000,
    cost: 650000,
    title: 'SOAT Seguro Obligatorio - Seguros SURA',
    tramiteType: 'SOAT',
    entity: 'Seguros SURA',
    startDate: '2025-10-26',
    expiryDate: '2026-10-26',
    daysRemaining: 18,
    status: 'por_vencer',
    notes: 'Póliza digital SOAT próxima a vencer en 18 días. Se debe renovar en el RUNT.',
  },
  {
    id: 'seed_legal_4',
    createdAt: '2026-05-18T11:00:00Z',
    categoria: 'tramites',
    pais: 'US',
    moneda: 'USD',
    odometer: 114000,
    cost: 35.00,
    title: 'Vehicle Safety & Smog Inspection - DMV',
    tramiteType: 'State Inspection',
    entity: 'Department of Highway Safety & Motor Vehicles (FL DMV)',
    startDate: '2026-05-18',
    expiryDate: '2027-05-18',
    daysRemaining: 229,
    status: 'vigente',
    notes: 'Inspección técnica anual aprobada y registro de sticker al día.',
  }
];

export const CategoryDetailView: React.FC<CategoryDetailProps> = ({
  moduleKey,
  onBack,
  onClose,
  onBackToCategories,
  selectedCountry: initialSelectedCountry,
  onCountryChange,
  currentUser: propCurrentUser,
}) => {
  const effectiveModuleKey = moduleKey || 'refuels';
  const handleExit = onBack || onClose || onBackToCategories || (() => {});

  // Local active module key allowing seamless category switching
  const [activeModuleState, setActiveModuleState] = useState<ModuleKey>(effectiveModuleKey);

  useEffect(() => {
    if (moduleKey) {
      setActiveModuleState(moduleKey);
    }
  }, [moduleKey]);

  const { collection: collectionName, categoria: categoriaActual } = getCollectionAndCategory(activeModuleState);

  // Active User state
  const [currentUser, setCurrentUser] = useState<any>(() => propCurrentUser || getStoredActiveUser());

  useEffect(() => {
    if (propCurrentUser) {
      setCurrentUser(propCurrentUser);
    }
  }, [propCurrentUser]);

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      if (user) setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Country Selection State - synchronized with app and props
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(() => {
    if (initialSelectedCountry && initialSelectedCountry in DATA_PAIS) {
      return initialSelectedCountry;
    }
    const stored = localStorage.getItem('litrometrik_selected_country') || localStorage.getItem('litrometrik_jurisdiction_country');
    return (stored as SupportedCountry) || 'PL';
  });

  // Sync when prop changes
  useEffect(() => {
    if (initialSelectedCountry && initialSelectedCountry in DATA_PAIS) {
      setSelectedCountry(initialSelectedCountry);
    }
  }, [initialSelectedCountry]);

  // Listen to global country events
  useEffect(() => {
    const handleCountryEvt = (e: any) => {
      const c = e.detail?.country as SupportedCountry;
      if (c && DATA_PAIS[c]) {
        setSelectedCountry(c);
      }
    };
    window.addEventListener('litrometrik-country-changed', handleCountryEvt);
    return () => window.removeEventListener('litrometrik-country-changed', handleCountryEvt);
  }, []);

  const handleCountryChange = (c: SupportedCountry) => {
    setSelectedCountry(c);
    try {
      localStorage.setItem('litrometrik_selected_country', c);
      localStorage.setItem('litrometrik_jurisdiction_country', c);
    } catch (_) {}

    if (onCountryChange) {
      onCountryChange(c);
    }
    window.dispatchEvent(new CustomEvent('litrometrik-country-changed', { detail: { country: c } }));
  };

  const activeCountryInfo = COUNTRY_INFO[selectedCountry] || COUNTRY_INFO.PL;
  const currentCountryData = DATA_PAIS[selectedCountry] || DATA_PAIS.PL;
  const currencySymbol = activeCountryInfo.currency;

  // Unified infallible record loader that reads user, guest, and global keys
  const getLoadedRecords = (): AnyRecord[] => {
    const collections = ['repostajes', 'mantenimientos', 'neumaticos', 'tramites'];
    const recordMap = new Map<string, AnyRecord>();
    const uid = currentUser?.uid || currentUser?.id || 'guest';

    try {
      collections.forEach((col) => {
        const keysToTry = [
          `litrometrik_${uid}_${col}`,
          `litrometrik_${col}`,
          `litrometrik_guest_${col}`,
        ];
        keysToTry.forEach((k) => {
          const stored = localStorage.getItem(k);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                parsed.forEach((r) => {
                  if (r && r.id && !recordMap.has(r.id)) {
                    recordMap.set(r.id, r);
                  }
                });
              }
            } catch (_) {}
          }
        });
      });
    } catch (e) {
      console.error('Error loading records:', e);
    }

    const loaded = Array.from(recordMap.values());
    const isRegistered = uid && uid !== 'guest_user' && uid !== 'guest';
    if (isRegistered) {
      return loaded;
    }
    if (loaded.length === 0) {
      return DEFAULT_SEED_RECORDS;
    }
    // Also merge seeds for categories that have no records yet
    DEFAULT_SEED_RECORDS.forEach((seed) => {
      const hasCat = loaded.some((r) => r.categoria === seed.categoria);
      if (!hasCat && !recordMap.has(seed.id)) {
        recordMap.set(seed.id, seed);
      }
    });
    return Array.from(recordMap.values());
  };

  // Load all records
  const [allRecords, setAllRecords] = useState<AnyRecord[]>(getLoadedRecords);

  // Re-sync all records when storage updates
  const reloadAllRecords = () => {
    setAllRecords(getLoadedRecords());
  };

  // Live Firestore & Supabase fetch when user is authenticated
  useEffect(() => {
    if (!currentUser?.uid || currentUser.uid === 'guest_user' || currentUser.uid === 'guest') return;
    const collections: CloudCollection[] = ['repostajes', 'mantenimientos', 'neumaticos', 'tramites'];
    const unsubs = collections.map((col) =>
      subscribeToCloudCollection(currentUser.uid, col, (cloudRecords) => {
        if (cloudRecords && cloudRecords.length > 0) {
          setAllRecords((prev) => {
            const targetCat = col === 'repostajes' ? 'bitacora' : col;
            const others = prev.filter((r) => r.categoria !== targetCat);
            return [...cloudRecords, ...others];
          });
        }
      })
    );

    // Also fetch records from Supabase
    Promise.all([
      getSupabaseRefuels(currentUser.uid),
      getSupabaseGarageRecords(currentUser.uid),
    ]).then(([sbRefuels, sbGarage]) => {
      const sbMapped: AnyRecord[] = [];
      if (sbRefuels && sbRefuels.length > 0) {
        sbRefuels.forEach((r: any) => {
          sbMapped.push({
            id: r.id,
            createdAt: r.fecha || r.created_at,
            categoria: 'bitacora',
            pais: (r.pais as SupportedCountry) || 'PL',
            moneda: 'PLN',
            odometer: Number(r.odometro) || 0,
            cost: Number(r.costo_total) || 0,
            title: `Repostaje ${r.estacion || 'Estación'}`,
            station: r.estacion || 'Estación de Servicio',
            fuelType: r.combustible || 'Gas LPG',
            liters: Number(r.litros) || 0,
            pricePerLiter: Number(r.precio_por_litro) || 0,
            refuelDate: r.fecha ? r.fecha.split('T')[0] : new Date().toISOString().split('T')[0],
            notes: r.notas,
            receiptUrl: r.foto_recibo,
          } as RefuelRecord);
        });
      }
      if (sbGarage && sbGarage.length > 0) {
        sbGarage.forEach((g: any) => {
          const base = {
            id: g.id,
            createdAt: g.fecha_registro || g.created_at,
            categoria: g.categoria as RecordCategory,
            pais: (g.pais as SupportedCountry) || 'PL',
            moneda: 'PLN',
            odometer: Number(g.odometro) || 0,
            cost: Number(g.costo) || 0,
            title: g.titulo,
            notes: g.notas,
            receiptUrl: g.foto_comprobante,
            ...(g.datos_extra || {}),
          };
          sbMapped.push(base as AnyRecord);
        });
      }
      if (sbMapped.length > 0) {
        setAllRecords((prev) => {
          const map = new Map<string, AnyRecord>();
          prev.forEach((item) => map.set(item.id, item));
          sbMapped.forEach((item) => map.set(item.id, item));
          return Array.from(map.values());
        });
      }
    }).catch(() => {});

    return () => {
      unsubs.forEach((u) => u && u());
    };
  }, [currentUser]);

  useEffect(() => {
    reloadAllRecords();
    const handleSync = () => reloadAllRecords();
    window.addEventListener('storage', handleSync);
    window.addEventListener('fuel-storage-updated', handleSync);
    window.addEventListener('litrometrik-records-updated', handleSync);
    window.addEventListener('litrometrik-fuel-updated', handleSync as any);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('fuel-storage-updated', handleSync);
      window.removeEventListener('litrometrik-records-updated', handleSync);
      window.removeEventListener('litrometrik-fuel-updated', handleSync as any);
    };
  }, [currentUser, collectionName]);

  // Active filter state from CHIP BAR
  const [chipCategoryFilter, setChipCategoryFilter] = useState<'all' | RecordCategory>(categoriaActual);
  const [chipCountryFilter, setChipCountryFilter] = useState<'all' | SupportedCountry>('all');

  // Sync category filter with active module
  useEffect(() => {
    setChipCategoryFilter(categoriaActual);
  }, [categoriaActual]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<AnyRecord | null>(null);

  // Table Search & Year Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');

  // Universal Photo Attachment State
  const [attachedPhoto, setAttachedPhoto] = useState<{ name: string; url: string } | null>(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState<{ url: string; title: string } | null>(null);

  // Form states per category - Free clean inputs without locked zeros
  // A) Bitácora
  const [refuelStation, setRefuelStation] = useState(() => currentCountryData.gasolineras[0] || 'Orlen');
  const [refuelFuelType, setRefuelFuelType] = useState('LPG');
  const [refuelLiters, setRefuelLiters] = useState<number | ''>('');
  const [refuelPricePerLiter, setRefuelPricePerLiter] = useState<number | ''>(() => currentCountryData.preciosDefecto.lpg);
  const [refuelCost, setRefuelCost] = useState<number | ''>('');
  const [refuelOdometer, setRefuelOdometer] = useState<number | ''>('');
  const [refuelKmSinceLast, setRefuelKmSinceLast] = useState<number | ''>('');
  const [refuelDate, setRefuelDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [refuelNotes, setRefuelNotes] = useState('');

  // Update default station and prices when country switches
  useEffect(() => {
    const cData = DATA_PAIS[selectedCountry] || DATA_PAIS.PL;
    if (cData.gasolineras.length > 0) {
      setRefuelStation(cData.gasolineras[0]);
    }
    if (refuelFuelType === 'LPG') {
      setRefuelPricePerLiter(cData.preciosDefecto.lpg);
    } else if (refuelFuelType.includes('Diésel')) {
      setRefuelPricePerLiter(cData.preciosDefecto.diesel);
    } else {
      setRefuelPricePerLiter(cData.preciosDefecto.gasolina);
    }
  }, [selectedCountry, refuelFuelType]);

  // Auto calculate total cost and consumption for Bitácora
  useEffect(() => {
    if (typeof refuelLiters === 'number' && typeof refuelPricePerLiter === 'number') {
      const total = Math.round(refuelLiters * refuelPricePerLiter * 100) / 100;
      setRefuelCost(total);
    }
  }, [refuelLiters, refuelPricePerLiter]);

  const liveConsumption = useMemo(() => {
    const l = Number(refuelLiters) || 0;
    const km = Number(refuelKmSinceLast) || 0;
    if (l > 0 && km > 0) {
      return Math.round((l / (km / 100)) * 100) / 100;
    }
    return 0;
  }, [refuelLiters, refuelKmSinceLast]);

  // B) Mantenimiento
  const [maintServiceType, setMaintServiceType] = useState('Aceite y Filtro');
  const [maintProductBrand, setMaintProductBrand] = useState('Motul 8100 5W30 + Mann Filter');
  const [maintWorkshop, setMaintWorkshop] = useState('Taller Especializado');
  const [maintCost, setMaintCost] = useState<number | ''>('');
  const [maintOdometer, setMaintOdometer] = useState<number | ''>('');
  const [maintServiceDate, setMaintServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [maintNextKm, setMaintNextKm] = useState<number | ''>('');
  const [maintNextDate, setMaintNextDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [maintNotes, setMaintNotes] = useState('');

  // C) Neumáticos
  const [tireType, setTireType] = useState('Invierno (Zimowe)');
  const [tireBrandAndDot, setTireBrandAndDot] = useState('Michelin Alpin 6 DOT 2423');
  const [tirePressureFront, setTirePressureFront] = useState<number | ''>('');
  const [tirePressureRear, setTirePressureRear] = useState<number | ''>('');
  const [tireOdometer, setTireOdometer] = useState<number | ''>('');
  const [tireCost, setTireCost] = useState<number | ''>('');
  const [tireInstallDate, setTireInstallDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tireNextCheckDate, setTireNextCheckDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [tireStorage, setTireStorage] = useState('Hotel de neumáticos / Garaje');
  const [tireNotes, setTireNotes] = useState('');

  // D) Trámites
  const [legalTramiteType, setLegalTramiteType] = useState(
    selectedCountry === 'PL' ? 'Przegląd' : selectedCountry === 'CO' ? 'SOAT' : 'State Inspection'
  );
  const [legalEntity, setLegalEntity] = useState(() => (COUNTRY_ENTITIES[selectedCountry]?.[0] || 'Entidad Oficial'));
  const [isCustomEntity, setIsCustomEntity] = useState(false);
  const [legalCustomEntity, setLegalCustomEntity] = useState('');
  const [legalCost, setLegalCost] = useState<number | ''>('');
  const [legalOdometer, setLegalOdometer] = useState<number | ''>('');
  const [legalStartDate, setLegalStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [legalExpiryDate, setLegalExpiryDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [legalNotes, setLegalNotes] = useState('');

  useEffect(() => {
    if (COUNTRY_ENTITIES[selectedCountry]) {
      setLegalEntity(COUNTRY_ENTITIES[selectedCountry][0]);
      setIsCustomEntity(false);
    }
  }, [selectedCountry]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const processed = await processImageFile(file);
        setAttachedPhoto({
          name: processed.name,
          url: processed.url,
        });
      } catch (err: any) {
        console.error('Error procesando foto:', err);
        alert(err?.message || 'Error al procesar la imagen seleccionada.');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const baseRecord: BaseRecord = {
      id: `rec_${Date.now()}`,
      createdAt: new Date().toISOString(),
      categoria: categoriaActual,
      userId: currentUser?.uid || 'guest',
      pais: selectedCountry,
      moneda: activeCountryInfo.currency,
      odometer: 0,
      cost: 0,
      title: '',
      notes: '',
      receiptUrl: attachedPhoto?.url,
      receiptName: attachedPhoto?.name,
    };

    let newRecord: AnyRecord;

    if (categoriaActual === 'bitacora') {
      newRecord = {
        ...baseRecord,
        categoria: 'bitacora',
        odometer: Number(refuelOdometer) || 0,
        cost: Number(refuelCost) || 0,
        title: `Repostaje ${refuelStation} (${refuelFuelType})`,
        notes: refuelNotes,
        station: refuelStation,
        fuelType: refuelFuelType,
        liters: Number(refuelLiters) || 0,
        pricePerLiter: Number(refuelPricePerLiter) || 0,
        kmSinceLastRefuel: Number(refuelKmSinceLast) || 0,
        consumptionL100: liveConsumption,
        refuelDate: refuelDate,
      };
    } else if (categoriaActual === 'mantenimiento') {
      newRecord = {
        ...baseRecord,
        categoria: 'mantenimiento',
        odometer: Number(maintOdometer) || 0,
        cost: Number(maintCost) || 0,
        title: `${maintServiceType} - ${maintWorkshop}`,
        notes: maintNotes,
        serviceType: maintServiceType,
        productBrand: maintProductBrand,
        workshop: maintWorkshop,
        serviceDate: maintServiceDate,
        nextServiceKm: Number(maintNextKm) || 0,
        nextServiceDate: maintNextDate,
      };
    } else if (categoriaActual === 'neumaticos') {
      newRecord = {
        ...baseRecord,
        categoria: 'neumaticos',
        odometer: Number(tireOdometer) || 0,
        cost: Number(tireCost) || 0,
        title: `${tireType} - ${tireBrandAndDot}`,
        notes: tireNotes,
        tireType: tireType,
        brandAndDot: tireBrandAndDot,
        pressureFrontPsi: Number(tirePressureFront) || 32,
        pressureRearPsi: Number(tirePressureRear) || 32,
        installDate: tireInstallDate,
        nextCheckDate: tireNextCheckDate,
        storageLocation: tireStorage,
      };
    } else {
      const finalEntity = (isCustomEntity || legalEntity === '__custom__')
        ? (legalCustomEntity.trim() || 'Entidad Personalizada')
        : legalEntity;
      const days = calculateDaysRemaining(legalExpiryDate);
      const status: 'vigente' | 'por_vencer' | 'vencido' = days < 0 ? 'vencido' : days <= 30 ? 'por_vencer' : 'vigente';

      newRecord = {
        ...baseRecord,
        categoria: 'tramites',
        odometer: Number(legalOdometer) || 0,
        cost: Number(legalCost) || 0,
        title: `${legalTramiteType} - ${finalEntity}`,
        notes: legalNotes,
        tramiteType: legalTramiteType,
        entity: finalEntity,
        startDate: legalStartDate,
        expiryDate: legalExpiryDate,
        daysRemaining: days,
        status: status,
      };
    }

    const uid = currentUser?.uid || currentUser?.id || 'guest';
    const key = `litrometrik_${uid}_${collectionName}`;
    try {
      const currentStored = localStorage.getItem(key);
      const list = currentStored ? JSON.parse(currentStored) : [];
      list.unshift(newRecord);
      localStorage.setItem(key, JSON.stringify(list));
      localStorage.setItem(`litrometrik_${collectionName}`, JSON.stringify(list));
      localStorage.setItem(`litrometrik_guest_${collectionName}`, JSON.stringify(list));

      // Persist to Firestore & Supabase
      if (uid && uid !== 'guest' && uid !== 'guest_user') {
        saveCloudRecord(uid, collectionName as CloudCollection, newRecord);

        if (categoriaActual === 'bitacora') {
          insertSupabaseRefuel(uid, {
            estacion: refuelStation,
            litros: Number(refuelLiters) || 0,
            precio_por_litro: Number(refuelPricePerLiter) || 0,
            costo_total: Number(refuelCost) || 0,
            odometro: Number(refuelOdometer) || 0,
            combustible: refuelFuelType,
            notas: refuelNotes,
            foto_recibo: attachedPhoto?.url,
          }).catch((err) => console.warn('Supabase refuel save warning:', err));
        } else {
          insertSupabaseGarageRecord(uid, {
            categoria: categoriaActual,
            titulo: newRecord.title || categoriaActual,
            costo: Number(newRecord.cost) || 0,
            odometro: Number(newRecord.odometer) || 0,
            fecha_registro: newRecord.createdAt || new Date().toISOString(),
            fecha_proxima: (newRecord as any).nextServiceDate || (newRecord as any).nextCheckDate || (newRecord as any).expiryDate || null,
            notas: newRecord.notes,
            foto_comprobante: attachedPhoto?.url,
            datos_extra: newRecord,
          }).catch((err) => console.warn('Supabase garage record save warning:', err));
        }
      }
    } catch (e) {
      console.error('Error saving record', e);
    }

    // SINCRONIZACIÓN BIDIRECCIONAL COMPLETA: Al registrar un repostaje desde Bitácora
    if (categoriaActual === 'bitacora') {
      try {
        const refuelPrice = Number(refuelPricePerLiter) || 0;
        const refuelLitersNum = Number(refuelLiters) || (refuelPrice > 0 ? (Number(refuelCost) || 0) / refuelPrice : 0);
        const addedCost = Number(refuelCost) || (refuelLitersNum * refuelPrice) || 0;

        // Determinar clave de tanque normalizada
        const targetFuelKey =
          refuelFuelType === 'Gas LPG' || refuelFuelType === 'LPG' || refuelFuelType.includes('GLP') || refuelFuelType.includes('LPG')
            ? 'Gas LPG'
            : refuelFuelType.includes('Diésel') || refuelFuelType.includes('Diesel') || refuelFuelType.includes('ON')
            ? 'Diésel ON'
            : 'Gasolina Pb95';

        // 1. FÓRMULA DE PROMEDIO PONDERADO AL REGISTRAR TANQUEO
        let nextTankBal = addedCost;
        let finalWeightedPrice = refuelPrice;
        try {
          const tanksRaw = localStorage.getItem(`litrometrik_tanks_${selectedCountry}`);
          const tanksMap = tanksRaw ? JSON.parse(tanksRaw) : {};
          const prevTank = tanksMap[targetFuelKey] || { balance: 0, liters: 0 };
          const volumenPrevio = Number(prevTank.liters) || 0;
          const saldoPrevio = Number(prevTank.balance) || 0;
          const litrosNuevos = refuelLitersNum;
          const dineroNuevo = addedCost;

          const nuevoVolumenTotal = Math.round((volumenPrevio + litrosNuevos) * 100) / 100;
          const nuevoSaldoTotal = Math.round((saldoPrevio + dineroNuevo) * 100) / 100;
          finalWeightedPrice = nuevoVolumenTotal > 0
            ? Math.round((nuevoSaldoTotal / nuevoVolumenTotal) * 100) / 100
            : (refuelPrice > 0 ? refuelPrice : 6.09);

          nextTankBal = nuevoSaldoTotal;

          tanksMap[targetFuelKey] = {
            ...prevTank,
            balance: nuevoSaldoTotal,
            liters: nuevoVolumenTotal,
            weightedPrice: finalWeightedPrice,
            lastRefuelAmount: dineroNuevo,
            lastRefuelPrice: finalWeightedPrice,
            lastRefuelDate: new Date().toISOString(),
          };
          localStorage.setItem(`litrometrik_tanks_${selectedCountry}`, JSON.stringify(tanksMap));
          localStorage.setItem('litrometrik_base_fuel_balance_pln', nuevoSaldoTotal.toString());
          localStorage.setItem('fuel_price_per_liter', finalWeightedPrice.toString());
          localStorage.setItem(`litrometrik_weighted_price_${targetFuelKey}`, finalWeightedPrice.toString());
        } catch (_) {}

        // 2. Guardar último tanqueo para el aviso de Saldo Restante y sincronizar con historial_viajes
        localStorage.setItem('litrometrik_ultimo_tanqueo', JSON.stringify(newRecord));
        localStorage.setItem('litrometrik_active_fuel', targetFuelKey);

        try {
          const viajeRefuelEntry = {
            id: newRecord.id,
            timestamp: newRecord.createdAt || new Date().toISOString(),
            date: (newRecord as any).refuelDate || new Date().toISOString().split('T')[0],
            km: 0,
            litros: refuelLitersNum,
            costo: addedCost,
            combustible: targetFuelKey,
            precioLitro: finalWeightedPrice,
            moneda: activeCountryInfo.currency,
            pais: selectedCountry,
            vehicleType: 'sedan',
            tipoRegistro: 'repostaje',
            estacion: refuelStation,
          };
          const currentTrips = JSON.parse(localStorage.getItem('historial_viajes') || '[]');
          const updatedTrips = [viajeRefuelEntry, ...currentTrips.filter((x: any) => x.id !== viajeRefuelEntry.id)];
          localStorage.setItem('historial_viajes', JSON.stringify(updatedTrips));
        } catch (_) {}

        // 3. Obtener saldo actual global y sumar el nuevo repostaje
        const currentBalanceStr = localStorage.getItem('litrometrik_fuel_balance_pln') ||
                                  localStorage.getItem('fuel_balance_pln') ||
                                  localStorage.getItem('currentFuelBalancePLN') || '0';
        const currentBalance = parseFloat(currentBalanceStr) || 0;
        const updatedBalance = Math.round((currentBalance + addedCost) * 100) / 100;

        localStorage.setItem('litrometrik_fuel_balance_pln', updatedBalance.toString());
        localStorage.setItem('fuel_balance_pln', updatedBalance.toString());
        localStorage.setItem('currentFuelBalancePLN', updatedBalance.toString());

        // 4. Actualizar precio de combustible con el precio ponderado
        if (finalWeightedPrice > 0) {
          localStorage.setItem('fuel_price_per_liter', finalWeightedPrice.toString());
          try {
            const storedPrices = localStorage.getItem('litrometrik_custom_fuel_prices');
            const pricesMap = storedPrices ? JSON.parse(storedPrices) : {};
            pricesMap[targetFuelKey] = finalWeightedPrice;
            localStorage.setItem('litrometrik_custom_fuel_prices', JSON.stringify(pricesMap));
          } catch (_) {}
        }

        // 5. Registrar en el log de recargas de telemetría
        const chargeEntry = {
          id: `charge_${Date.now()}`,
          date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          timestamp: Date.now(),
          amountPLN: addedCost,
          fuelType: targetFuelKey,
          litersEquivalent: refuelLitersNum,
          pricePerLiter: refuelPrice,
          note: `Repostaje en ${refuelStation}`
        };
        const savedCharges = JSON.parse(localStorage.getItem('litrometrik_fuel_charges_log') || '[]');
        localStorage.setItem('litrometrik_fuel_charges_log', JSON.stringify([chargeEntry, ...savedCharges]));

        // 6. Emitir eventos globales de sincronización
        window.dispatchEvent(new Event('fuel-storage-updated'));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('litrometrik-records-updated'));
        window.dispatchEvent(new CustomEvent('litrometrik-fuel-updated', {
          detail: {
            balance: nextTankBal,
            price: refuelPrice,
            fuelType: targetFuelKey,
            liters: refuelLitersNum,
            addedCost: addedCost,
          }
        }));
      } catch (err) {
        console.error('Error synchronizing fuel balance:', err);
      }
    }

    reloadAllRecords();
    setIsSubmitting(false);
    setSuccessToast(true);
    setAttachedPhoto(null);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Deseas eliminar este registro definitivamente?')) return;

    const collections = ['repostajes', 'mantenimientos', 'neumaticos', 'tramites'];
    const uid = currentUser ? currentUser.uid : 'guest';
    collections.forEach((col) => {
      const key = `litrometrik_${uid}_${col}`;
      try {
        const currentStored = localStorage.getItem(key);
        if (currentStored) {
          const list = JSON.parse(currentStored);
          const filtered = list.filter((r: AnyRecord) => r.id !== id);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch (err) {}
      if (uid && uid !== 'guest' && uid !== 'guest_user') {
        deleteCloudRecord(uid, col as CloudCollection, id);
        deleteSupabaseRefuel(id).catch(() => {});
        deleteSupabaseGarageRecord(id).catch(() => {});
      }
    });

    setAllRecords(prev => prev.filter(r => r.id !== id));
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      // 1. Category filter
      if (chipCategoryFilter !== 'all') {
        if (rec.categoria !== chipCategoryFilter) return false;
      }

      // 2. Country filter
      if (chipCountryFilter !== 'all' && rec.pais !== chipCountryFilter) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = rec.title?.toLowerCase().includes(query);
        const matchNotes = rec.notes?.toLowerCase().includes(query);
        const matchOdo = rec.odometer?.toString().includes(query);
        if (!matchTitle && !matchNotes && !matchOdo) return false;
      }

      // 4. Year filter
      if (yearFilter !== 'ALL') {
        const year = rec.createdAt?.split('-')[0];
        if (year !== yearFilter) return false;
      }

      return true;
    });
  }, [allRecords, chipCategoryFilter, chipCountryFilter, searchQuery, yearFilter]);

  // Receipts for carousel
  const receiptPhotos = useMemo(() => {
    return allRecords
      .filter((r) => r.receiptUrl && (chipCountryFilter === 'all' || r.pais === chipCountryFilter) && (chipCategoryFilter === 'all' || r.categoria === chipCategoryFilter))
      .map((r) => ({
        id: r.id,
        title: r.title,
        cost: r.cost,
        moneda: r.moneda,
        date: (r as any).refuelDate || (r as any).serviceDate || (r as any).installDate || (r as any).startDate || r.createdAt.split('T')[0],
        url: r.receiptUrl!,
        record: r,
      }));
  }, [allRecords, chipCountryFilter, chipCategoryFilter]);

  // KPIs
  const totalCostFiltered = filteredRecords.reduce((acc, r) => acc + (r.cost || 0), 0);
  const totalCount = filteredRecords.length;

  const kpis = [
    {
      label: 'Gasto Total Registrado',
      value: `${totalCostFiltered.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencySymbol}`,
      desc: `${totalCount} registros en el período`,
    },
    {
      label: 'Total de Registros',
      value: `${totalCount} registros`,
      desc: 'Historial sincronizado en la nube',
    },
    {
      label: 'Último Odómetro',
      value: filteredRecords.length > 0 ? `${Math.max(...filteredRecords.map(r => r.odometer || 0)).toLocaleString()} km` : '145,500 km',
      desc: 'Kilometraje más reciente',
    },
  ];

  const categoryMeta = {
    bitacora: {
      title: 'Bitácora de Repostaje',
      subtitle: 'Control de consumo real L/100km, tickets de combustible y costos por litro',
      icon: Fuel,
      badge: 'Cargas y Combustible',
    },
    mantenimiento: {
      title: 'Mantenimiento Preventivo',
      subtitle: 'Servicios de motor, aceites, bujías, filtros LPG y facturas de taller',
      icon: Wrench,
      badge: 'Taller y Servicios',
    },
    neumaticos: {
      title: 'Control de Neumáticos',
      subtitle: 'Cambio estacional invierno/verano, rotación, presión PSI y DOT',
      icon: Disc,
      badge: 'Llantas y Seguridad',
    },
    tramites: {
      title: 'Trámites & Legalidad',
      subtitle: 'Inspecciones técnicas, SOAT, seguros obligatorios, ITV y vencimientos',
      icon: FileText,
      badge: 'Documentos Oficiales',
    },
  }[categoriaActual];

  const filterChips = [
    { id: 'all_cat', type: 'category', value: 'all', label: 'Todos' },
    { id: 'cat_bitacora', type: 'category', value: 'bitacora', label: 'Bitácora' },
    { id: 'cat_maint', type: 'category', value: 'mantenimiento', label: 'Mantenimiento' },
    { id: 'cat_tires', type: 'category', value: 'neumaticos', label: 'Neumáticos' },
    { id: 'cat_legal', type: 'category', value: 'tramites', label: 'Trámites' },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 w-full relative pb-28 selection:bg-blue-500 selection:text-white">
      
      {/* Background Car/Road Texture with dark tone */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=2000&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.05,
        }}
      />

      {/* ---------------- 1. TOP HEADER WITH VOLVER BUTTON (DARK SLATE CONTRAST) ---------------- */}
      <header
        className="sticky top-0 z-40 px-4 sm:px-6 py-3.5 bg-[#0F172A]/95 backdrop-blur-xl border-b border-slate-700/80 shadow-[0_6px_24px_rgba(0,0,0,0.5)]"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          
          {/* Back button + Category Header */}
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <button
              onClick={handleExit}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-[#1E293B] hover:bg-[#334155] text-white font-black text-xs transition border border-slate-700 shadow-sm button-hover-pro cursor-pointer shrink-0"
              title="Volver al Dashboard Principal"
            >
              <ArrowLeft className="w-4 h-4 text-[#00D4FF]" />
              <span>Volver</span>
            </button>

            <div className="truncate min-w-0">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center space-x-2 truncate">
                <span className="truncate">{categoryMeta.title}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-[#00D4FF] font-black border border-cyan-400/40 hidden sm:inline-block shrink-0">
                  {categoryMeta.badge}
                </span>
              </h1>
              <p className="text-[11px] text-slate-300 font-medium truncate hidden sm:block">
                {categoryMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Country selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value as SupportedCountry)}
                className="appearance-none pl-3 pr-7 py-2 rounded-xl bg-[#1E293B] border border-slate-700 text-white text-xs font-black focus:outline-none focus:border-[#00D4FF] cursor-pointer shadow-sm"
              >
                <option value="PL">🇵🇱 Polonia</option>
                <option value="CO">🇨🇴 Colombia</option>
                <option value="US">🇺🇸 Estados Unidos</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </header>

      {/* ---------------- 2. MAIN WORKSPACE CONTAINER ---------------- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 relative z-10 space-y-6">
        
        {/* Module Switcher Tabs inside Modal (Dark Slate styling) */}
        <div className="slider flex gap-2 pb-2">
          {[
            { key: 'refuels' as ModuleKey, label: '⛽ Bitácora de Repostaje', cat: 'bitacora' as RecordCategory },
            { key: 'maintenance' as ModuleKey, label: '🔧 Mantenimiento Preventivo', cat: 'mantenimiento' as RecordCategory },
            { key: 'tires' as ModuleKey, label: '🛞 Control de Neumáticos', cat: 'neumaticos' as RecordCategory },
            { key: 'legal' as ModuleKey, label: '📋 Trámites & Legalidad', cat: 'tramites' as RecordCategory },
          ].map((tab) => {
            const isTabActive = activeModuleState === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveModuleState(tab.key);
                  setChipCategoryFilter(tab.cat);
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition flex items-center space-x-2 shrink-0 button-hover-pro cursor-pointer ${
                  isTabActive
                    ? 'bg-blue-600 text-white border-2 border-blue-400 shadow-lg shadow-blue-600/30 ring-2 ring-blue-500/20'
                    : 'bg-slate-800/80 text-slate-300 border border-slate-700/80 hover:bg-slate-700/60'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================= */}
          {/* LEFT COLUMN: FORMULARIO AGREGAR REGISTRO (DARK SLATE)     */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 sm:p-6 rounded-2xl bg-[#1E293B] border border-slate-700/60 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 border-b border-slate-700/70 pb-3">
                <div className="flex items-center space-x-2.5">
                  <button
                    type="button"
                    onClick={handleExit}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#00D4FF] hover:text-white flex items-center justify-center transition border border-slate-700/80 cursor-pointer button-hover-pro shadow-sm shrink-0"
                    title="Regresar atrás al Garaje"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h2 className="text-sm font-black text-white">
                    Nuevo {activeModuleState === 'refuels' ? 'Repostaje' : activeModuleState === 'maintenance' ? 'Mantenimiento' : activeModuleState === 'tires' ? 'Neumático' : 'Trámite Legal'}
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-[#00D4FF] border border-blue-400/30">
                  {activeCountryInfo.flag} {activeCountryInfo.name}
                </span>
              </div>

              {/* Automotive Maintenance Photo Banner */}
              {categoriaActual === 'mantenimiento' && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 mb-4 h-32 group shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1000&q=80"
                    alt="Taller de mantenimiento automotriz y motor real"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-black drop-shadow">Inspección de Taller & Motor Real</span>
                    </div>
                    <span className="text-[10px] bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full font-bold border border-white/20 text-amber-300">
                      📸 Imagen Real
                    </span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5 text-white">
                
                {/* ---------------- FORM A: BITÁCORA DE REPOSTAJE ---------------- */}
                {categoriaActual === 'bitacora' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Estación de Servicio</label>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {currentCountryData.gasolineras.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setRefuelStation(st)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition button-hover-pro cursor-pointer ${
                              refuelStation === st
                                ? 'bg-blue-600 text-white border border-blue-400 font-black shadow-sm'
                                : 'bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700/70'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        required
                        value={refuelStation}
                        onChange={(e) => setRefuelStation(e.target.value)}
                        placeholder="Nombre de la estación..."
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Tipo Combustible</label>
                        <select
                          value={refuelFuelType}
                          onChange={(e) => setRefuelFuelType(e.target.value)}
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="LPG">⛽ {currentCountryData.etiquetasCombustible.lpg}</option>
                          <option value="Gasolina">⛽ {currentCountryData.etiquetasCombustible.gasolina}</option>
                          <option value="Gasolina 98">⛽ Gasolina 98 / Premium</option>
                          <option value="Diésel">🛢️ {currentCountryData.etiquetasCombustible.diesel}</option>
                          <option value="GNV">💨 Gas Natural GNV</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Litros Repostados</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={refuelLiters}
                          onChange={(e) => setRefuelLiters(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="35.0"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Precio / Litro ({currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={refuelPricePerLiter}
                          onChange={(e) => setRefuelPricePerLiter(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="2.89"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Costo Total ({currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={refuelCost}
                          onChange={(e) => setRefuelCost(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="101.15"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black text-[#00D4FF] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Odómetro (km)</label>
                        <input
                          type="number"
                          required
                          value={refuelOdometer}
                          onChange={(e) => setRefuelOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="145500"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Km desde Último</label>
                        <input
                          type="number"
                          value={refuelKmSinceLast}
                          onChange={(e) => setRefuelKmSinceLast(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="380"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#0F172A] border border-slate-700/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Consumo calculado:</span>
                      <span className="font-black text-[#00D4FF]">
                        {liveConsumption > 0 ? `${liveConsumption.toFixed(2)} L/100km` : 'Ingresa litros y km'}
                      </span>
                    </div>
                  </>
                )}

                {/* ---------------- FORM B: MANTENIMIENTO ---------------- */}
                {categoriaActual === 'mantenimiento' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Tipo de Servicio</label>
                      <select
                        value={maintServiceType}
                        onChange={(e) => setMaintServiceType(e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Aceite y Filtro">🛢️ Cambio de Aceite y Filtro</option>
                        <option value="Frenos y Pastillas">🛑 Pastillas y Discos de Freno</option>
                        <option value="Bujías / Ignición">⚡ Bujías y Bobinas</option>
                        <option value="Filtro LPG / Gas">⛽ Filtro de Gas LPG Fase Líquida/Vapor</option>
                        <option value="Correa Distribución">⚙️ Kit de Distribución y Bomba</option>
                        <option value="Suspensión y Amortiguadores">🚗 Suspensión / Amortiguadores</option>
                        <option value="Batería">🔋 Batería / Alternador</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Marca de Repuesto / Producto</label>
                      <input
                        type="text"
                        value={maintProductBrand}
                        onChange={(e) => setMaintProductBrand(e.target.value)}
                        placeholder="Ej: Motul 8100 5W30 + Filtro Mann"
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Taller / Mecánico</label>
                        <input
                          type="text"
                          value={maintWorkshop}
                          onChange={(e) => setMaintWorkshop(e.target.value)}
                          placeholder="Nombre del taller"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Costo ({currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={maintCost}
                          onChange={(e) => setMaintCost(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="320.00"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black text-[#00D4FF] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Odómetro Servicio</label>
                        <input
                          type="number"
                          required
                          value={maintOdometer}
                          onChange={(e) => setMaintOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="145000"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Próximo Km</label>
                        <input
                          type="number"
                          value={maintNextKm}
                          onChange={(e) => setMaintNextKm(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="155000"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ---------------- FORM C: NEUMÁTICOS ---------------- */}
                {categoriaActual === 'neumaticos' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Tipo de Neumático</label>
                      <select
                        value={tireType}
                        onChange={(e) => setTireType(e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Invierno (Zimowe)">❄️ Invierno (Zimowe)</option>
                        <option value="Verano (Letnie)">☀️ Verano (Letnie)</option>
                        <option value="Todo Clima (Całoroczne)">🌦️ Todo Clima 4 Estaciones</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Marca, Medida y DOT</label>
                      <input
                        type="text"
                        value={tireBrandAndDot}
                        onChange={(e) => setTireBrandAndDot(e.target.value)}
                        placeholder="Ej: Michelin Alpin 6 (205/55 R16) DOT 2423"
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Presión Delantera (PSI)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={tirePressureFront}
                          onChange={(e) => setTirePressureFront(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="32.0"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Presión Trasera (PSI)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={tirePressureRear}
                          onChange={(e) => setTirePressureRear(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="32.0"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Odómetro (km)</label>
                        <input
                          type="number"
                          value={tireOdometer}
                          onChange={(e) => setTireOdometer(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="144500"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Costo ({currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={tireCost}
                          onChange={(e) => setTireCost(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="140.00"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black text-[#00D4FF] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ---------------- FORM D: TRÁMITES LEGALES ---------------- */}
                {categoriaActual === 'tramites' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-300">Tipo de Trámite</label>
                      <select
                        value={legalTramiteType}
                        onChange={(e) => setLegalTramiteType(e.target.value)}
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="Przegląd">📋 Inspección Técnica (Przegląd / ITV / RTM)</option>
                        <option value="SOAT">🛡️ Seguro Obligatorio (SOAT / OC)</option>
                        <option value="Todo Riesgo">💎 Seguro Todo Riesgo (AC / Autocasco)</option>
                        <option value="TDT LPG">⛽ Homologación TDT Cilindro LPG</option>
                        <option value="Verificación">🌿 Verificación Ambiental</option>
                        <option value="Impuestos">🏛️ Impuesto Vehicular / Tenencia</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300">Entidad / Aseguradora</label>
                        <button
                          type="button"
                          onClick={() => setIsCustomEntity(!isCustomEntity)}
                          className="text-[10px] text-cyan-400 font-bold hover:underline cursor-pointer"
                        >
                          {isCustomEntity ? 'Elegir de lista predefinida' : '+ Otra entidad'}
                        </button>
                      </div>

                      <select
                        value={isCustomEntity ? '__custom__' : legalEntity}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomEntity(true);
                          } else {
                            setIsCustomEntity(false);
                            setLegalEntity(e.target.value);
                          }
                        }}
                        className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        {(COUNTRY_ENTITIES[selectedCountry] || []).map((ent) => (
                          <option key={ent} value={ent}>{ent}</option>
                        ))}
                        <option value="__custom__">➕ Otra entidad (Personalizada)</option>
                      </select>

                      {isCustomEntity && (
                        <div className="pt-1.5 animate-fadeIn">
                          <input
                            type="text"
                            required
                            value={legalCustomEntity}
                            onChange={(e) => setLegalCustomEntity(e.target.value)}
                            placeholder="Ingresa el nombre de la entidad / aseguradora"
                            className="w-full bg-[#0F172A] border border-blue-400 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Fecha Vencimiento</label>
                        <input
                          type="date"
                          required
                          value={legalExpiryDate}
                          onChange={(e) => setLegalExpiryDate(e.target.value)}
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Costo ({currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={legalCost}
                          onChange={(e) => setLegalCost(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="99.00"
                          className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black text-[#00D4FF] placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Photo Upload Box (Dark Slate translucent dashed container) */}
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>Adjuntar Foto de Factura / Ticket</span>
                    <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  </label>
                  <div className="p-3 bg-[#0F172A]/70 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl flex items-center justify-between transition">
                    <div className="flex items-center space-x-2 truncate">
                      {attachedPhoto?.url ? (
                        <img src={attachedPhoto.url} alt="Comprobante" className="w-7 h-7 rounded object-cover border border-cyan-400 shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className="text-xs text-slate-300 truncate font-medium">
                        {attachedPhoto ? attachedPhoto.name : 'Sin foto adjunta'}
                      </span>
                    </div>
                    <label className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer transition button-hover-pro shrink-0">
                      Cargar
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">Notas / Detalles</label>
                  <input
                    type="text"
                    value={categoriaActual === 'bitacora' ? refuelNotes : categoriaActual === 'mantenimiento' ? maintNotes : categoriaActual === 'neumaticos' ? tireNotes : legalNotes}
                    onChange={(e) => {
                      if (categoriaActual === 'bitacora') setRefuelNotes(e.target.value);
                      else if (categoriaActual === 'mantenimiento') setMaintNotes(e.target.value);
                      else if (categoriaActual === 'neumaticos') setTireNotes(e.target.value);
                      else setLegalNotes(e.target.value);
                    }}
                    placeholder="Observaciones adicionales..."
                    className="w-full bg-[#0F172A] border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm tracking-wide transition shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 cursor-pointer button-hover-pro disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Guardando Registro...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Guardar Registro</span>
                      </>
                    )}
                  </button>
                </div>

                {successToast && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>¡Registro guardado exitosamente!</span>
                  </div>
                )}

              </form>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: KPIS + CHIPS + CAROUSEL + TABLE (DARK SLATE)*/}
          {/* ========================================================= */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top 3 KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {kpis.map((kpi, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#1E293B] border border-slate-700/60 shadow-lg relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">{kpi.label}</span>
                    <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-[#00D4FF] flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {kpi.value}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate font-medium">
                    {kpi.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* ----------------------------------------------------------- */}
            {/* CHIPS DE BÚSQUEDA Y FILTROS                                 */}
            {/* ----------------------------------------------------------- */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Filtros Rápidos</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">Desliza para ver más</span>
              </div>

              {/* CHIP BAR WITH SCROLL-SNAP */}
              <div className="slider flex gap-2 pb-1.5">
                {filterChips.map((chip) => {
                  const isActive =
                    chip.type === 'category'
                      ? chipCategoryFilter === chip.value
                      : chipCountryFilter === chip.value;

                  const handleClick = () => {
                    if (chip.type === 'category') {
                      if (chip.value === 'all') {
                        setChipCategoryFilter('all');
                      } else {
                        setChipCategoryFilter(chip.value as RecordCategory);
                        if (chip.value === 'bitacora') setActiveModuleState('refuels');
                        else if (chip.value === 'mantenimiento') setActiveModuleState('maintenance');
                        else if (chip.value === 'neumaticos') setActiveModuleState('tires');
                        else if (chip.value === 'tramites') setActiveModuleState('legal');
                      }
                    } else {
                      if (chipCountryFilter === chip.value) {
                        setChipCountryFilter('all');
                      } else {
                        setChipCountryFilter(chip.value as SupportedCountry);
                      }
                    }
                  };

                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={handleClick}
                      className={`px-4 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 shrink-0 button-hover-pro cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-black border border-blue-400 shadow-md shadow-blue-600/30'
                          : 'bg-slate-800/80 text-slate-300 font-bold border border-slate-700 hover:bg-slate-700/60'
                      }`}
                    >
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ----------------------------------------------------------- */}
            {/* CARRUSEL DE FOTOS DE COMPROBANTES (DARK SLATE)              */}
            {/* ----------------------------------------------------------- */}
            {receiptPhotos.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#1E293B] border border-slate-700/60 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Comprobantes y Fotos ({receiptPhotos.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">Desliza horizontalmente</span>
                </div>

                <div className="slider flex gap-3 pb-1">
                  {receiptPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setFullscreenPhoto({ url: photo.url, title: photo.title })}
                      className="w-40 sm:w-44 bg-[#162032] rounded-2xl p-2.5 border border-slate-700 shadow-sm shrink-0 cursor-pointer button-hover-pro flex flex-col justify-between"
                      title="Toca para ver la foto en pantalla completa"
                    >
                      <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-900 mb-2 relative">
                        <img
                          src={photo.url}
                          alt={photo.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-black/85 text-white backdrop-blur-sm">
                          {photo.cost.toFixed(2)} {photo.moneda}
                        </span>
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{photo.title}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{photo.date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ----------------------------------------------------------- */}
            {/* HISTORIAL EXCLUSIVO TABLE (DARK SLATE)                      */}
            {/* ----------------------------------------------------------- */}
            <div className="rounded-2xl bg-[#1E293B] border border-slate-700/60 shadow-xl overflow-hidden flex flex-col">
              
              {/* Controls Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-700/70 bg-[#162032] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-white flex items-center space-x-2">
                    <span>HISTORIAL EXCLUSIVO ({categoriaActual.toUpperCase()})</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-[#00D4FF] font-black border border-blue-400/30">
                      {filteredRecords.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {chipCountryFilter !== 'all' ? COUNTRY_INFO[chipCountryFilter]?.name : activeCountryInfo.name} • {currencySymbol}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar concepto o km..."
                      className="bg-[#0F172A] border border-slate-700 text-white placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 w-44"
                    />
                  </div>

                  <select
                    value={yearFilter}
                    onChange={(e) => setYearFilter(e.target.value)}
                    className="bg-[#0F172A] border border-slate-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="ALL">Todos los años</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                </div>
              </div>

              {/* Table View */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-700/80 bg-[#121B2C] text-slate-300 font-black uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Foto</th>
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Odómetro</th>
                      <th className="py-3 px-4">Concepto / Detalle</th>
                      <th className="py-3 px-4">Costo</th>
                      <th className="py-3 px-4">Métrica</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-slate-200">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-500" />
                          <span className="font-bold">No hay registros para los filtros seleccionados.</span>
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec) => {
                        const recDate =
                          (rec as any).refuelDate ||
                          (rec as any).serviceDate ||
                          (rec as any).installDate ||
                          (rec as any).startDate ||
                          rec.createdAt.split('T')[0];

                        return (
                          <tr
                            key={rec.id}
                            onClick={() => setSelectedRecordForDetail(rec)}
                            className="hover:bg-slate-800/70 transition cursor-pointer group"
                          >
                            <td className="py-3 px-4">
                              {rec.receiptUrl ? (
                                <img
                                  src={rec.receiptUrl}
                                  alt="Ticket"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFullscreenPhoto({ url: rec.receiptUrl!, title: rec.title });
                                  }}
                                  className="w-10 h-10 rounded-xl object-cover border border-blue-400 shadow-sm cursor-zoom-in hover:scale-110 transition-transform"
                                  title="Toca para ver la foto en pantalla completa"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500">
                                  <ImageIcon className="w-4 h-4" />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-white">
                              <div className="flex items-center space-x-1.5">
                                <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                <span>{recDate}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-black text-white">
                              {rec.odometer.toLocaleString()} km
                            </td>
                            <td className="py-3 px-4 max-w-[200px] truncate">
                              <div className="font-black text-white truncate group-hover:text-cyan-400 transition">
                                {rec.title}
                              </div>
                              {rec.notes && (
                                <div className="text-[11px] text-slate-400 font-medium truncate">
                                  {rec.notes}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-black text-[#00D4FF]">
                              {rec.cost.toFixed(2)} {rec.moneda}
                            </td>
                            <td className="py-3 px-4">
                              {rec.categoria === 'bitacora' && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 text-[#00D4FF] border border-blue-400/30 font-bold text-[11px]">
                                  {(rec as RefuelRecord).consumptionL100 ? `${(rec as RefuelRecord).consumptionL100?.toFixed(2)} L/100km` : `${(rec as RefuelRecord).liters} L`}
                                </span>
                              )}
                              {rec.categoria === 'mantenimiento' && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold text-[11px]">
                                  {(rec as MaintenanceRecord).serviceType}
                                </span>
                              )}
                              {rec.categoria === 'neumaticos' && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold text-[11px]">
                                  {(rec as TireRecord).pressureFrontPsi} PSI
                                </span>
                              )}
                              {rec.categoria === 'tramites' && (
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                                  (rec as LegalRecord).status === 'vigente'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                                    : (rec as LegalRecord).status === 'por_vencer'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
                                }`}>
                                  {(rec as LegalRecord).status === 'vigente' ? 'Vigente' : (rec as LegalRecord).status === 'por_vencer' ? 'Por Vencer' : 'Vencido'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => handleDeleteRecord(rec.id, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition button-hover-pro cursor-pointer"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* ---------------- 3. RECORD DETAIL MODAL (DARK SLATE) ---------------- */}
      {selectedRecordForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="rounded-2xl w-full max-w-lg shadow-2xl relative text-white overflow-hidden bg-[#111827] border border-slate-700/80">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-black text-white">Detalles del Registro</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-[#00D4FF] border border-blue-400/30">
                  {selectedRecordForDetail.categoria.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => setSelectedRecordForDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition button-hover-pro cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {selectedRecordForDetail.receiptUrl && (
                <div
                  onClick={() => setFullscreenPhoto({
                    url: selectedRecordForDetail.receiptUrl!,
                    title: selectedRecordForDetail.title,
                  })}
                  className="rounded-2xl overflow-hidden border border-slate-700 hover:border-cyan-400 shadow bg-slate-900 flex flex-col items-center justify-center cursor-zoom-in group transition-all"
                  title="Toca para ver la foto completa sin recortes"
                >
                  <img
                    src={selectedRecordForDetail.receiptUrl}
                    alt="Comprobante Adjunto"
                    className="w-full h-auto max-h-[55vh] object-contain"
                  />
                  <div className="w-full py-1.5 text-center bg-black/70 text-[11px] font-bold text-cyan-400 border-t border-slate-800 flex items-center justify-center space-x-1">
                    <span>🔍 Toca para ampliar y ver foto completa (100%)</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#1E293B] border border-slate-700/60 shadow-sm">
                  <span className="text-slate-400 block font-bold">Concepto</span>
                  <span className="font-black text-white text-sm">{selectedRecordForDetail.title}</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1E293B] border border-slate-700/60 shadow-sm">
                  <span className="text-slate-400 block font-bold">Costo Total</span>
                  <span className="font-black text-[#00D4FF] text-sm">
                    {selectedRecordForDetail.cost.toFixed(2)} {selectedRecordForDetail.moneda}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#1E293B] border border-slate-700/60 shadow-sm">
                  <span className="text-slate-400 block font-bold">Odómetro</span>
                  <span className="font-black text-white">{selectedRecordForDetail.odometer.toLocaleString()} km</span>
                </div>

                <div className="p-3 rounded-xl bg-[#1E293B] border border-slate-700/60 shadow-sm">
                  <span className="text-slate-400 block font-bold">País</span>
                  <span className="font-black text-white">
                    {COUNTRY_INFO[selectedRecordForDetail.pais]?.flag} {COUNTRY_INFO[selectedRecordForDetail.pais]?.name}
                  </span>
                </div>
              </div>

              {selectedRecordForDetail.notes && (
                <div className="p-3 rounded-xl bg-[#1E293B] border border-slate-700/60 shadow-sm text-xs">
                  <span className="text-slate-400 block mb-1 font-bold">Notas / Observaciones</span>
                  <p className="text-slate-200 font-semibold">{selectedRecordForDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700 bg-[#0F172A] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecordForDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs button-hover-pro cursor-pointer border border-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visor de Fotos en Pantalla Completa (Sin Recortes) */}
      <ImageViewerModal
        isOpen={Boolean(fullscreenPhoto)}
        imageUrl={fullscreenPhoto?.url || null}
        title={fullscreenPhoto?.title}
        onClose={() => setFullscreenPhoto(null)}
      />

    </div>
  );
};

// Also export as ModuleViewModal for backwards compatibility
export const ModuleViewModal = CategoryDetailView;
