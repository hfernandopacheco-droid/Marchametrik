import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wrench,
  Disc,
  FileText,
  ChevronRight,
  ChevronDown,
  Gauge,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Car,
  Clock,
  Sparkles,
  Info,
  X,
  ShieldCheck,
  Activity,
  Calendar,
  CalendarDays,
  Bell,
  Trash2,
  Camera,
  Upload,
  Pencil,
} from 'lucide-react';
import { CountryCode, DATA_PAIS } from '../utils/countryData';
import { fetchCloudRecords } from '../utils/firestoreService';
import { getSupabaseGarageRecords, upsertCustomVehicleSupabase } from '../utils/supabaseClient';
import {
  getActiveVehicleState,
  saveActiveVehicleState,
  UNIFIED_VEHICLE_CATALOG,
  ActiveVehicleState,
  formatFuelEconomy,
} from '../utils/vehicleCatalog';
import { Sedan3D, Suv3D, Compacto3D, Pickup3D, Van3D, Custom3D } from './Vehicle3DIcons';

interface GarajeViewProps {
  onSelectCategory: (category: 'mantenimiento' | 'neumaticos' | 'tramites') => void;
  selectedCountry: CountryCode;
  onCountryChange: (country: CountryCode) => void;
  currentUser?: any;
}

export interface CategoryReminder {
  category: 'mantenimiento' | 'neumaticos' | 'tramites';
  title: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export const GarajeView: React.FC<GarajeViewProps> = ({
  onSelectCategory,
  selectedCountry,
  onCountryChange,
  currentUser,
}) => {
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [odometer, setOdometer] = useState<number>(() => {
    const stored = localStorage.getItem('litrometrik_user_odometer');
    return stored ? parseInt(stored, 10) : 0;
  });
  const [showOdoModal, setShowOdoModal] = useState(false);
  const [newOdoInput, setNewOdoInput] = useState('');
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);

  // Sincronización del vehículo y motor desde Modo de Marcha y Tablero
  const [activeVehicle, setActiveVehicle] = useState<ActiveVehicleState>(getActiveVehicleState);
  const [carPhoto, setCarPhoto] = useState<string | null>(() => activeVehicle.carPhotoUrl);
  const garageGalleryInputRef = useRef<HTMLInputElement>(null);
  const garageCameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleSyncVehicle = () => {
      const v = getActiveVehicleState();
      setActiveVehicle(v);
      setCarPhoto(v.carPhotoUrl);
    };
    window.addEventListener('litrometrik-vehicle-updated', handleSyncVehicle);
    window.addEventListener('storage', handleSyncVehicle);
    return () => {
      window.removeEventListener('litrometrik-vehicle-updated', handleSyncVehicle);
      window.removeEventListener('storage', handleSyncVehicle);
    };
  }, []);

  const handleGaragePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('La foto debe ser menor a 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCarPhoto(base64);
      saveActiveVehicleState({ carPhotoUrl: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleGarageRemovePhoto = () => {
    setCarPhoto(null);
    saveActiveVehicleState({ carPhotoUrl: null });
  };

  // Calendar reminder modal state
  const [editingCategoryReminder, setEditingCategoryReminder] = useState<'mantenimiento' | 'neumaticos' | 'tramites' | null>(null);
  const [reminderTitleInput, setReminderTitleInput] = useState('');
  const [reminderDateInput, setReminderDateInput] = useState('');
  const [reminderNotesInput, setReminderNotesInput] = useState('');

  // Modal para personalizar vehículo con el lápiz ✏️ y sincronización dual (Supabase + Local)
  const [showCustomVehicleModal, setShowCustomVehicleModal] = useState(false);
  const [customVehName, setCustomVehName] = useState('');
  const [customVehCategory, setCustomVehCategory] = useState<'sedan' | 'suv' | 'compact' | 'pickup' | 'van' | 'custom'>('sedan');
  const [customVehFuel, setCustomVehFuel] = useState<'Gasolina' | 'Diésel' | 'Gas GLP'>('Gasolina');
  const [customVehConsumptionInput, setCustomVehConsumptionInput] = useState('');
  const [customVehDisplacement, setCustomVehDisplacement] = useState('');
  const [isSavingCustomVehicle, setIsSavingCustomVehicle] = useState(false);

  const handleOpenCustomVehicleModal = () => {
    setCustomVehName(activeVehicle.vehicleModelName || 'Mi Auto Personalizado');
    setCustomVehCategory((activeVehicle.vehicleType as any) || 'sedan');
    const f = (activeVehicle.fuelType || '').toLowerCase();
    const resolvedFuel = (f.includes('glp') || f.includes('lpg') || f.includes('gas'))
      ? 'Gas GLP'
      : (f.includes('diesel') || f.includes('diésel') || f.includes('acpm'))
      ? 'Diésel'
      : 'Gasolina';
    setCustomVehFuel(resolvedFuel);

    // Formatear el consumo inicial según la unidad del país
    if (selectedCountry === 'US') {
      const mpg = activeVehicle.baseL100 > 0 ? 235.215 / activeVehicle.baseL100 : 32.0;
      setCustomVehConsumptionInput(mpg.toFixed(1));
    } else if (selectedCountry === 'CO') {
      const kmL = activeVehicle.baseL100 > 0 ? 100 / activeVehicle.baseL100 : 13.5;
      setCustomVehConsumptionInput(kmL.toFixed(1));
    } else {
      setCustomVehConsumptionInput(activeVehicle.baseL100.toFixed(1));
    }

    setCustomVehDisplacement(activeVehicle.displacement || '1.600 cc');
    setShowCustomVehicleModal(true);
  };

  const handleSaveCustomVehicle = async () => {
    if (!customVehName.trim()) return;
    setIsSavingCustomVehicle(true);

    const rawVal = parseFloat(customVehConsumptionInput.replace(',', '.')) || 7.5;
    let baseL100 = rawVal;
    if (selectedCountry === 'US') {
      baseL100 = rawVal > 0 ? 235.215 / rawVal : 7.5;
    } else if (selectedCountry === 'CO') {
      baseL100 = rawVal > 0 ? 100 / rawVal : 7.5;
    }

    // 1. ESTADO LOCAL INMEDIATO (Garaje, Modo Marcha y Calcular sincronizados de inmediato)
    const updatedState = saveActiveVehicleState({
      vehicleType: customVehCategory,
      vehicleModelName: customVehName.trim(),
      engineName: `${customVehName.trim()} (${customVehDisplacement || 'Custom'})`,
      displacement: customVehDisplacement || 'Motor Personalizado',
      baseL100: Math.round(baseL100 * 10) / 10,
      fuelType: customVehFuel,
      transmission: activeVehicle.transmission || 'manual',
    });

    setActiveVehicle(updatedState);

    // 2. SINCRONIZACIÓN CON SUPABASE (Directo a tabla vehicles con user_id)
    try {
      const targetUserId = currentUser?.uid || 'guest';
      await upsertCustomVehicleSupabase(targetUserId, {
        nombre: customVehName.trim(),
        categoria: customVehCategory,
        combustible: customVehFuel,
        consumoBaseL100: Math.round(baseL100 * 10) / 10,
        cilindrada: customVehDisplacement || '1.600 cc',
        transmision: activeVehicle.transmission || 'manual',
      });
    } catch (err) {
      console.warn('Error sincronizando con Supabase:', err);
    } finally {
      setIsSavingCustomVehicle(false);
      setShowCustomVehicleModal(false);
    }
  };

  const [recordsCount, setRecordsCount] = useState<{
    mantenimiento: number;
    neumaticos: number;
    tramites: number;
  }>({
    mantenimiento: 0,
    neumaticos: 0,
    tramites: 0,
  });

  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [tireRecords, setTireRecords] = useState<any[]>([]);
  const [legalRecords, setLegalRecords] = useState<any[]>([]);

  const uid = currentUser?.uid || 'guest';

  // Load category custom reminders from storage
  const [customReminders, setCustomReminders] = useState<Record<string, CategoryReminder>>(() => {
    try {
      const stored = localStorage.getItem(`litrometrik_${uid}_reminders`);
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return {};
  });

  // Load and synchronize records across storage and cloud
  const loadRecords = async () => {
    let mList: any[] = [];
    let tList: any[] = [];
    let lList: any[] = [];

    try {
      mList = JSON.parse(localStorage.getItem(`litrometrik_${uid}_mantenimientos`) || '[]');
      tList = JSON.parse(localStorage.getItem(`litrometrik_${uid}_neumaticos`) || '[]');
      lList = JSON.parse(localStorage.getItem(`litrometrik_${uid}_tramites`) || '[]');
    } catch (_) {}

    // Check cloud & Supabase if user signed in
    if (currentUser?.uid && currentUser.uid !== 'guest' && currentUser.uid !== 'guest_user') {
      try {
        const [cloudM, cloudT, cloudL, sbRecords] = await Promise.all([
          fetchCloudRecords(currentUser.uid, 'mantenimientos'),
          fetchCloudRecords(currentUser.uid, 'neumaticos'),
          fetchCloudRecords(currentUser.uid, 'tramites'),
          getSupabaseGarageRecords(currentUser.uid),
        ]);
        if (cloudM.length > 0) mList = cloudM.filter((r: any) => !r.pais || r.pais === selectedCountry);
        if (cloudT.length > 0) tList = cloudT.filter((r: any) => !r.pais || r.pais === selectedCountry);
        if (cloudL.length > 0) lList = cloudL.filter((r: any) => !r.pais || r.pais === selectedCountry);

        if (sbRecords && sbRecords.length > 0) {
          sbRecords.forEach((sr: any) => {
            const mapped = {
              id: sr.id,
              date: sr.fecha_registro,
              title: sr.titulo,
              cost: Number(sr.costo) || 0,
              odometer: Number(sr.odometro) || 0,
              notes: sr.notas,
              receiptUrl: sr.foto_comprobante,
              ...(sr.datos_extra || {}),
            };
            if (sr.categoria === 'mantenimiento') {
              if (!mList.some((x) => x.id === sr.id)) {
                mList.push({ ...mapped, nextServiceDate: sr.fecha_proxima, serviceType: sr.titulo });
              }
            } else if (sr.categoria === 'neumaticos') {
              if (!tList.some((x) => x.id === sr.id)) {
                tList.push({ ...mapped, nextCheckDate: sr.fecha_proxima, tireType: sr.titulo });
              }
            } else if (sr.categoria === 'tramites') {
              if (!lList.some((x) => x.id === sr.id)) {
                lList.push({ ...mapped, expiryDate: sr.fecha_proxima, tramiteType: sr.titulo });
              }
            }
          });
        }
      } catch (_) {}
    }

    // No seed mock data: New account must appear completely at 0 without fake records
    setMaintenanceRecords(mList);
    setTireRecords(tList);
    setLegalRecords(lList);
    setRecordsCount({
      mantenimiento: mList.length,
      neumaticos: tList.length,
      tramites: lList.length,
    });
  };

  useEffect(() => {
    loadRecords();
    window.addEventListener('storage', loadRecords);
    window.addEventListener('litrometrik-records-updated', loadRecords);
    return () => {
      window.removeEventListener('storage', loadRecords);
      window.removeEventListener('litrometrik-records-updated', loadRecords);
    };
  }, [currentUser, uid, selectedCountry]);

  // Handle Odometer Update
  const handleUpdateOdometer = () => {
    const val = parseInt(newOdoInput.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val >= 0) {
      setOdometer(val);
      localStorage.setItem('litrometrik_user_odometer', val.toString());
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('litrometrik-odometer-updated', { detail: { odometer: val } })
        );
      }
      setShowOdoModal(false);
      setNewOdoInput('');
    }
  };

  const handleQuickAddKm = (addKm: number) => {
    const nextVal = (parseInt(newOdoInput.replace(/\D/g, ''), 10) || odometer) + addKm;
    setNewOdoInput(nextVal.toString());
  };

  // ---------------- SAVE CATEGORY CALENDAR REMINDER ----------------
  const handleOpenReminderModal = (
    category: 'mantenimiento' | 'neumaticos' | 'tramites',
    defaultTitle: string,
    defaultDate: string
  ) => {
    const existing = customReminders[category];
    setEditingCategoryReminder(category);
    setReminderTitleInput(existing?.title || defaultTitle);
    setReminderDateInput(existing?.date || defaultDate);
    setReminderNotesInput(existing?.notes || '');
  };

  const handleSaveReminder = () => {
    if (!editingCategoryReminder || !reminderDateInput) return;

    const updated: Record<string, CategoryReminder> = {
      ...customReminders,
      [editingCategoryReminder]: {
        category: editingCategoryReminder,
        title: reminderTitleInput.trim() || 'Recordatorio programado',
        date: reminderDateInput,
        notes: reminderNotesInput.trim(),
      },
    };

    setCustomReminders(updated);
    try {
      localStorage.setItem(`litrometrik_${uid}_reminders`, JSON.stringify(updated));
    } catch (_) {}

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('litrometrik-records-updated'));

    setEditingCategoryReminder(null);
  };

  const handleDeleteReminder = (category: 'mantenimiento' | 'neumaticos' | 'tramites') => {
    const updated = { ...customReminders };
    delete updated[category];
    setCustomReminders(updated);
    try {
      localStorage.setItem(`litrometrik_${uid}_reminders`, JSON.stringify(updated));
    } catch (_) {}

    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('litrometrik-records-updated'));
    setEditingCategoryReminder(null);
  };

  // Quick preset helper
  const handleSetQuickPresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setReminderDateInput(d.toISOString().split('T')[0]);
  };

  // ---------------- 1. CALCULATE SYNCHRONIZED EXPIRATIONS & REMINDERS ----------------
  const categoryDeadlines = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const calcDays = (dateStr: string) => {
      if (!dateStr) return 999;
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    };

    const formatDateES = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      } catch (_) {
        return dateStr;
      }
    };

    // 1. Tramites (SOAT, ITV, Tecno, etc.)
    const tramitesCustom = customReminders.tramites;
    const tramitesTop = legalRecords[0];
    const hasTramites = Boolean(tramitesCustom || tramitesTop);
    const tramitesDate = tramitesCustom?.date || tramitesTop?.expiryDate || '';
    const tramitesTitle = tramitesCustom?.title || tramitesTop?.title || 'SOAT / Trámite';
    const tramitesDiff = tramitesDate ? calcDays(tramitesDate) : 999;

    // 2. Mantenimiento (Aceite, Filtros, Taller)
    const maintCustom = customReminders.mantenimiento;
    const maintTop = maintenanceRecords[0];
    const hasMaint = Boolean(maintCustom || maintTop);
    const maintDate = maintCustom?.date || maintTop?.nextServiceDate || '';
    const maintTitle = maintCustom?.title || maintTop?.serviceType || 'Cambio de Aceite';
    const maintDiff = maintDate ? calcDays(maintDate) : 999;

    // 3. Neumaticos (Rotación, Alineación, Presión)
    const tireCustom = customReminders.neumaticos;
    const tireTop = tireRecords[0];
    const hasTires = Boolean(tireCustom || tireTop);
    const tireDate = tireCustom?.date || tireTop?.nextCheckDate || '';
    const tireTitle = tireCustom?.title || 'Rotación de Neumáticos';
    const tireDiff = tireDate ? calcDays(tireDate) : 999;

    const list = [
      {
        category: 'tramites' as const,
        categoryLabel: 'Trámites y Legalidad',
        categoryTag: 'Trámites',
        title: tramitesTitle,
        date: tramitesDate,
        formattedDate: tramitesDate ? formatDateES(tramitesDate) : 'Sin recordatorio',
        diffDays: tramitesDiff,
        isCustom: !!tramitesCustom,
        hasActive: hasTramites && !!tramitesDate,
      },
      {
        category: 'mantenimiento' as const,
        categoryLabel: 'Mantenimiento Preventivo',
        categoryTag: 'Mantenimiento',
        title: maintTitle,
        date: maintDate,
        formattedDate: maintDate ? formatDateES(maintDate) : 'Sin recordatorio',
        diffDays: maintDiff,
        isCustom: !!maintCustom,
        hasActive: hasMaint && !!maintDate,
      },
      {
        category: 'neumaticos' as const,
        categoryLabel: 'Control de Neumáticos',
        categoryTag: 'Neumáticos',
        title: tireTitle,
        date: tireDate,
        formattedDate: tireDate ? formatDateES(tireDate) : 'Sin recordatorio',
        diffDays: tireDiff,
        isCustom: !!tireCustom,
        hasActive: hasTires && !!tireDate,
      },
    ];

    // Only active items with actual dates
    const activeItems = list.filter((i) => i.hasActive);
    const sorted = [...activeItems].sort((a, b) => a.diffDays - b.diffDays);
    const soonest = sorted.length > 0 ? sorted[0] : null;

    return {
      all: list,
      activeItems,
      sorted,
      soonest,
      tramites: list[0],
      mantenimiento: list[1],
      neumaticos: list[2],
    };
  }, [legalRecords, maintenanceRecords, tireRecords, customReminders]);

  // ---------------- 2. FUNCTIONAL MECHANICAL HEALTH COMPUTATION ----------------
  const mechanicalDiagnosis = useMemo(() => {
    let score = 100;
    const issues: {
      type: 'critical' | 'warning' | 'ok';
      category: 'mantenimiento' | 'neumaticos' | 'tramites';
      title: string;
      desc: string;
      actionText: string;
      expiryInfo?: string;
    }[] = [];

    // 1. Mantenimiento: solo evaluar si hay registros o recordatorio
    const hasMaintData = maintenanceRecords.length > 0 || !!customReminders.mantenimiento;
    const nextOilKm = maintenanceRecords[0]?.nextServiceKm;
    const kmUntilOil = nextOilKm ? nextOilKm - odometer : 0;
    const maintDeadline = categoryDeadlines.mantenimiento;

    if (hasMaintData && nextOilKm && kmUntilOil < 0) {
      score -= 35;
      issues.push({
        type: 'critical',
        category: 'mantenimiento',
        title: '¡Cambio de Aceite Vencido!',
        desc: `Excedido por ${Math.abs(kmUntilOil).toLocaleString('es-ES')} km (Límite: ${nextOilKm.toLocaleString('es-ES')} km). Requiere servicio de taller urgente.`,
        actionText: 'Agendar Taller',
        expiryInfo: `Fecha límite: ${maintDeadline.formattedDate}`,
      });
    } else if (hasMaintData && ((nextOilKm && kmUntilOil <= 2000) || (maintDeadline.hasActive && maintDeadline.diffDays <= 30))) {
      score -= 15;
      issues.push({
        type: 'warning',
        category: 'mantenimiento',
        title: 'Próximo Servicio de Mantenimiento',
        desc: nextOilKm ? `Faltan ${kmUntilOil.toLocaleString('es-ES')} km para el cambio de aceite programado.` : `Próximo mantenimiento programado.`,
        actionText: 'Ver Mantenimiento',
        expiryInfo: maintDeadline.date ? `Programado para el ${maintDeadline.formattedDate} (${maintDeadline.diffDays} días)` : undefined,
      });
    } else {
      issues.push({
        type: 'ok',
        category: 'mantenimiento',
        title: hasMaintData ? 'Aceite y Filtros en Rango' : 'Mantenimiento Preventivo',
        desc: hasMaintData ? 'Servicios al día.' : 'Sin revisiones pendientes registradas.',
        actionText: 'Ver Detalles',
        expiryInfo: maintDeadline.date ? `Fecha: ${maintDeadline.formattedDate}` : undefined,
      });
    }

    // 2. Neumáticos: solo evaluar si hay datos o recordatorio
    const hasTireData = tireRecords.length > 0 || !!customReminders.neumaticos;
    const tireDeadline = categoryDeadlines.neumaticos;

    if (hasTireData && tireDeadline.hasActive && tireDeadline.diffDays < 0) {
      score -= 20;
      issues.push({
        type: 'warning',
        category: 'neumaticos',
        title: 'Rotación de Neumáticos Requerida',
        desc: `Revisión de neumáticos vencida hace ${Math.abs(tireDeadline.diffDays)} días.`,
        actionText: 'Revisar Neumáticos',
        expiryInfo: `Recordatorio: ${tireDeadline.formattedDate}`,
      });
    } else if (hasTireData && tireDeadline.hasActive && tireDeadline.diffDays <= 30) {
      score -= 10;
      issues.push({
        type: 'warning',
        category: 'neumaticos',
        title: 'Rotación de Neumáticos Próxima',
        desc: `Revisión programada en ${tireDeadline.diffDays} días.`,
        actionText: 'Revisar Neumáticos',
        expiryInfo: `Fecha: ${tireDeadline.formattedDate} (${tireDeadline.diffDays} días)`,
      });
    } else {
      issues.push({
        type: 'ok',
        category: 'neumaticos',
        title: 'Control de Neumáticos',
        desc: hasTireData ? 'Presión y huella en orden.' : 'Sin revisiones pendientes.',
        actionText: 'Ver Neumáticos',
        expiryInfo: tireDeadline.date ? `Revisión: ${tireDeadline.formattedDate}` : undefined,
      });
    }

    // 3. Trámites: solo evaluar si hay datos o recordatorio
    const hasLegalData = legalRecords.length > 0 || !!customReminders.tramites;
    const tramitesDeadline = categoryDeadlines.tramites;

    if (hasLegalData && tramitesDeadline.hasActive && tramitesDeadline.diffDays < 0) {
      score -= 35;
      issues.push({
        type: 'critical',
        category: 'tramites',
        title: `¡${tramitesDeadline.title} VENCIDO!`,
        desc: `Caducó hace ${Math.abs(tramitesDeadline.diffDays)} días (${tramitesDeadline.formattedDate}).`,
        actionText: 'Renovar Trámite',
        expiryInfo: `Venció el ${tramitesDeadline.formattedDate}`,
      });
    } else if (hasLegalData && tramitesDeadline.hasActive && tramitesDeadline.diffDays <= 30) {
      score -= 15;
      issues.push({
        type: 'warning',
        category: 'tramites',
        title: `${tramitesDeadline.title} vence pronto`,
        desc: `Fecha de vencimiento: ${tramitesDeadline.formattedDate}. Quedan ${tramitesDeadline.diffDays} días.`,
        actionText: 'Gestionar Trámite',
        expiryInfo: `Caduca el ${tramitesDeadline.formattedDate} (${tramitesDeadline.diffDays} días)`,
      });
    } else {
      issues.push({
        type: 'ok',
        category: 'tramites',
        title: 'Trámites y Documentos',
        desc: hasLegalData ? 'Documentos al día.' : 'Sin trámites pendientes de renovación.',
        actionText: 'Ver Trámites',
        expiryInfo: tramitesDeadline.date ? `Vence: ${tramitesDeadline.formattedDate}` : undefined,
      });
    }

    const clampedScore = Math.max(20, Math.min(100, score));
    let statusLabel = 'Al Día (Como Nuevo)';
    let statusColor = 'text-emerald-400';
    let statusBg = 'bg-emerald-500/10 border-emerald-500/30';
    let statusIcon = CheckCircle2;

    if (clampedScore < 70) {
      statusLabel = 'Atención Crítica';
      statusColor = 'text-red-400';
      statusBg = 'bg-red-500/10 border-red-500/30';
      statusIcon = AlertOctagon;
    } else if (clampedScore < 90) {
      statusLabel = 'Revisión Pendiente';
      statusColor = 'text-amber-400';
      statusBg = 'bg-amber-500/10 border-amber-500/30';
      statusIcon = AlertTriangle;
    }

    const urgentIssue = issues.find((i) => i.type === 'critical') || issues.find((i) => i.type === 'warning');

    return {
      score: clampedScore,
      statusLabel,
      statusColor,
      statusBg,
      statusIcon,
      issues,
      urgentIssue,
      kmUntilOil,
    };
  }, [odometer, maintenanceRecords, tireRecords, legalRecords, categoryDeadlines, customReminders]);

  // Country labels without repeating letters
  const countries = [
    { code: 'PL' as CountryCode, label: 'Polonia', flag: '🇵🇱' },
    { code: 'CO' as CountryCode, label: 'Colombia', flag: '🇨🇴' },
    { code: 'US' as CountryCode, label: 'Estados Unidos', flag: '🇺🇸' },
  ];

  const currentCountry = countries.find((c) => c.code === selectedCountry) || countries[1];
  const activeCar = DATA_PAIS[selectedCountry]?.cars?.[0] || { brand: 'Renault', model: 'Duster 1.6' };

  const soonest = categoryDeadlines.soonest;

  return (
    <div className="min-h-screen bg-[#080B11] text-white pb-32 select-none font-sans antialiased">
      {/* ---------------- 1. NATIVE TOP HEADER (Clean single country name) ---------------- */}
      <header className="sticky top-0 z-30 bg-[#080B11] border-b border-slate-800 px-4 py-3 flex items-center justify-between pt-[max(env(safe-area-inset-top,0px),12px)] shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FF4F00] flex items-center justify-center shadow-lg shadow-[#FF4F00]/25 shrink-0">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center space-x-1.5 leading-none">
              <span>LitroMetrik</span>
              <span className="text-[#FF4F00]">PRO</span>
            </h1>
            <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mt-1">
              MI GARAJE
            </p>
          </div>
        </div>

        {/* Clean Single Country Selector (No repeating codes) */}
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
            <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-[#1A202C] border border-slate-700 shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              {countries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onCountryChange(c.code);
                    setShowCountryMenu(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs font-black transition flex items-center justify-between ${
                    selectedCountry === c.code
                      ? 'text-[#FF4F00] bg-white/5'
                      : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <span>{c.flag}</span>
                    <span>{c.label}</span>
                  </span>
                  {selectedCountry === c.code && <span className="w-1.5 h-1.5 rounded-full bg-[#FF4F00]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ---------------- 2. MAIN WORKSPACE ---------------- */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* CARD 0: VEHICLE STATUS, ODOMETER & SYNCHRONIZED EXPIRATION STATUS */}
        <div className="p-5 rounded-3xl bg-[#121620] border border-slate-800/80 shadow-2xl space-y-4 relative overflow-hidden">
          {/* Subtle top glow line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#FF4F00]/40 to-transparent pointer-events-none" />

          {/* Vehicle Header info: Synchronized with Modo de Marcha */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#FF4F00]/15 border border-[#FF4F00]/30 flex items-center justify-center text-[#FF4F00] shrink-0">
                <Car className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-black text-white truncate flex items-center space-x-1.5">
                  <span className="truncate">{activeVehicle.vehicleModelName || `${activeCar.brand} ${activeCar.model}`}</span>
                </h2>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {selectedCountry === 'CO' ? 'Placa: KLM-428 • Bogotá' : selectedCountry === 'US' ? 'Plate: 7XYZ89 • Florida' : 'Rejestracja: KR-5821P'}
                </p>
              </div>
            </div>

            {/* BOTÓN LÁPIZ (✏️): Personalizar Vehículo y Sincronizar con Supabase */}
            <button
              type="button"
              onClick={handleOpenCustomVehicleModal}
              className="p-2.5 rounded-2xl bg-[#1A2234] hover:bg-[#FF4F00]/20 border border-slate-700/80 hover:border-[#FF4F00]/50 text-slate-300 hover:text-[#FF4F00] transition cursor-pointer active:scale-95 shadow-md flex items-center space-x-1.5 shrink-0"
              title="Personalizar vehículo y guardar en Supabase"
            >
              <Pencil className="w-4 h-4 text-[#FF4F00]" />
              <span className="text-[11px] font-black hidden sm:inline text-white">Editar</span>
            </button>
          </div>

          {/* FOTO DEL CARRO O GRÁFICA 3D PROFESIONAL REAL CON OPCIÓN DE CÁMARA O GALERÍA */}
          <div className="p-3.5 rounded-2xl bg-[#080B11] border border-slate-800/90 relative overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {carPhoto ? 'Foto Real de tu Vehículo' : 'Vehículo Calibrado'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold">
                  {formatFuelEconomy(activeVehicle.baseL100, selectedCountry)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeVehicle.transmission === 'automatic' ? 'Transmisión Automática' : 'Transmisión Manual'}
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* Photo Frame or Professional 3D Vector Icon */}
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#121620] to-[#0D1017] border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                {carPhoto ? (
                  <img
                    src={carPhoto}
                    alt="Vehículo"
                    className="w-full h-full object-cover rounded-2xl hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="p-1 flex items-center justify-center">
                    {activeVehicle.vehicleType === 'sedan' && <Sedan3D size={76} />}
                    {activeVehicle.vehicleType === 'suv' && <Suv3D size={76} />}
                    {activeVehicle.vehicleType === 'compact' && <Compacto3D size={76} />}
                    {activeVehicle.vehicleType === 'pickup' && <Pickup3D size={76} />}
                    {activeVehicle.vehicleType === 'van' && <Van3D size={76} />}
                    {activeVehicle.vehicleType === 'custom' && <Custom3D size={76} />}
                  </div>
                )}
              </div>

              {/* Engine Details & Camera / Gallery Buttons */}
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <div className="text-xs font-black text-white truncate">
                    {activeVehicle.engineName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {activeVehicle.displacement || 'Motor estándar calibrado'}
                  </div>
                </div>

                {/* Upload Buttons */}
                <div className="flex items-center space-x-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => garageCameraInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                    title="Tomar foto con la cámara del dispositivo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Tomar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => garageGalleryInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 text-[11px] font-bold flex items-center space-x-1.5 transition cursor-pointer active:scale-95 shadow-sm"
                    title="Subir foto desde la galería"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Galería</span>
                  </button>

                  {carPhoto && (
                    <button
                      type="button"
                      onClick={handleGarageRemovePhoto}
                      className="p-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 transition cursor-pointer active:scale-95"
                      title="Eliminar foto personalizada y volver a la gráfica 3D"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Hidden Inputs for Camera and Gallery */}
            <input
              ref={garageGalleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGaragePhotoUpload}
            />
            <input
              ref={garageCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleGaragePhotoUpload}
            />
          </div>

          {/* 2 Interactive Boxes: ODÓMETRO TOTAL & ESTADO CON INFORMACIÓN DE CADUCIDAD */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
            {/* Box 1: ODÓMETRO TOTAL */}
            <div
              onClick={() => {
                setNewOdoInput(odometer.toString());
                setShowOdoModal(true);
              }}
              role="button"
              tabIndex={0}
              className="bg-[#080B11] hover:bg-[#0D121B] p-3.5 rounded-2xl border border-slate-800 hover:border-[#FF4F00]/60 transition-all duration-150 cursor-pointer group active:scale-[0.98] shadow-inner flex flex-col justify-between"
              title="Toca para ajustar el odómetro"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                    <Gauge className="w-3 h-3 text-[#FF4F00]" />
                    <span>ODÓMETRO</span>
                  </span>
                  <span className="text-[9px] font-bold text-[#FF4F00] opacity-80 group-hover:opacity-100 flex items-center space-x-0.5">
                    <span>Tocar</span>
                    <ChevronRight className="w-2.5 h-2.5" />
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-sans font-black text-white mt-1 tracking-tight flex items-baseline space-x-1">
                  <span>{odometer.toLocaleString('es-ES')}</span>
                  <span className="text-xs font-bold text-[#FF4F00]">km</span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 mt-2">
                {maintenanceRecords.length === 0 && !customReminders.mantenimiento
                  ? 'Vehículo al día • Sin revisiones pendientes'
                  : mechanicalDiagnosis.kmUntilOil > 0
                  ? `Faltan ${mechanicalDiagnosis.kmUntilOil.toLocaleString('es-ES')} km para cambio`
                  : `¡Cambio vencido por ${Math.abs(mechanicalDiagnosis.kmUntilOil).toLocaleString('es-ES')} km!`}
              </p>
            </div>

            {/* Box 2: ESTADO MECÁNICO Y RECORDATORIO DE CADUCIDAD SINCRONIZADO */}
            <div
              onClick={() => setShowDiagnosisModal(true)}
              role="button"
              tabIndex={0}
              className={`p-3.5 rounded-2xl border transition-all duration-150 cursor-pointer group active:scale-[0.98] shadow-inner flex flex-col justify-between ${mechanicalDiagnosis.statusBg}`}
              title="Toca para ver el diagnóstico y calendario de vencimientos"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    <span>ESTADO</span>
                  </span>
                  <span className="text-[10px] font-sans font-black text-white px-1.5 py-0.5 rounded bg-black/40 border border-white/10">
                    {mechanicalDiagnosis.score}%
                  </span>
                </div>

                <div className={`text-sm font-black mt-1 flex items-center space-x-1.5 ${mechanicalDiagnosis.statusColor}`}>
                  <mechanicalDiagnosis.statusIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{mechanicalDiagnosis.statusLabel}</span>
                </div>
              </div>

              {/* INFORMACIÓN DE FECHA DE CADUCIDAD / RECORDATORIO PRÓXIMO */}
              <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                {soonest ? (
                  <>
                    <div className="flex items-center space-x-1 text-[10px] font-black text-amber-300 truncate">
                      <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">{soonest.title}</span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-bold">
                      <span className="text-slate-300">{soonest.formattedDate}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          soonest.diffDays < 0
                            ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                            : soonest.diffDays <= 30
                            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                            : 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                        }`}
                      >
                        {soonest.diffDays < 0
                          ? `Vencido (${Math.abs(soonest.diffDays)}d)`
                          : `${soonest.diffDays} días`}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between text-[9px] font-bold text-emerald-300 py-0.5">
                    <span className="flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Sin revisiones pendientes</span>
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[8px] font-black text-emerald-400">
                      0 PENDIENTES
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---------------- BARRA DE ALERTA RÁPIDA SINCRONIZADA ---------------- */}
          {soonest && soonest.diffDays <= 30 ? (
            <div
              onClick={() => onSelectCategory(soonest.category)}
              role="button"
              tabIndex={0}
              className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition cursor-pointer active:scale-[0.99] shadow-md ${
                soonest.diffDays < 0
                  ? 'bg-red-500/15 border-red-500/40 text-red-200'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                {soonest.diffDays < 0 ? (
                  <AlertOctagon className="w-4.5 h-4.5 text-red-400 shrink-0 animate-pulse" />
                ) : (
                  <Calendar className="w-4.5 h-4.5 text-amber-400 shrink-0" />
                )}
                <div className="truncate">
                  <div className="font-black text-white text-xs truncate">
                    {soonest.diffDays < 0 ? `¡${soonest.title} Vencido!` : `Recordatorio: ${soonest.title}`}
                  </div>
                  <div className="text-[11px] opacity-85 truncate">
                    Fecha límite: {soonest.formattedDate} ({soonest.diffDays < 0 ? `venció hace ${Math.abs(soonest.diffDays)} días` : `quedan ${soonest.diffDays} días`})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCategory(soonest.category);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white text-slate-950 font-black text-[11px] shrink-0 active:scale-95 shadow-md flex items-center space-x-1"
              >
                <span>Ver {soonest.categoryTag}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : soonest ? (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Todo al día: {soonest.title} vigente hasta {soonest.formattedDate}.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnosisModal(true)}
                className="text-emerald-400 font-bold underline text-[11px] cursor-pointer shrink-0"
              >
                Calendario
              </button>
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Todo al día: 0 revisiones pendientes. Garaje nuevo y listo para registrar.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnosisModal(true)}
                className="text-emerald-400 font-bold underline text-[11px] cursor-pointer shrink-0"
              >
                Ver Estado
              </button>
            </div>
          )}
        </div>

        {/* ---------------- 3. INTERACTIVE CATEGORY CARDS WITH CALENDAR REMINDERS ---------------- */}
        
        {/* Card 1: Mantenimiento Preventivo */}
        <div
          onClick={() => onSelectCategory('mantenimiento')}
          role="button"
          tabIndex={0}
          className="relative rounded-3xl overflow-hidden border border-slate-800/80 shadow-xl cursor-pointer group active:scale-[0.98] transition-all duration-150"
        >
          <div
            className="h-32 sm:h-36 bg-cover bg-center relative"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/35" />

            {/* Badge */}
            <div className="absolute top-2.5 right-3.5 z-20">
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[9px] font-black text-amber-300 uppercase tracking-wider">
                <span>●</span>
                <span>Motor & Taller</span>
              </span>
            </div>

            <div className="relative h-full flex items-center justify-between px-5 z-10">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FF4F00] flex items-center justify-center shadow-lg shadow-[#FF4F00]/30 shrink-0">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                    Mantenimiento Preventivo
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {maintenanceRecords[0]?.nextServiceKm
                      ? `Próximo servicio a los ${maintenanceRecords[0].nextServiceKm.toLocaleString('es-ES')} km`
                      : 'Servicios de taller, cambio de aceite y filtros'}
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          {/* Sincronización Calendario Recordatorio Strip */}
          <div className="bg-[#0A0E18] px-4 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <CalendarDays className="w-3.5 h-3.5 text-[#FF4F00]" />
              <span className="font-bold text-[11px] text-white">
                📅 Próx. Servicio: {categoryDeadlines.mantenimiento.formattedDate}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                  categoryDeadlines.mantenimiento.diffDays < 0
                    ? 'bg-red-500/20 text-red-300'
                    : categoryDeadlines.mantenimiento.diffDays <= 30
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {categoryDeadlines.mantenimiento.diffDays < 0
                  ? 'Vencido'
                  : `${categoryDeadlines.mantenimiento.diffDays} días`}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReminderModal(
                  'mantenimiento',
                  categoryDeadlines.mantenimiento.title,
                  categoryDeadlines.mantenimiento.date
                );
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] font-black transition active:scale-95 flex items-center space-x-1"
            >
              <Calendar className="w-3 h-3 text-[#FF4F00]" />
              <span>Recordatorio</span>
            </button>
          </div>
        </div>

        {/* Card 2: Control de Neumáticos */}
        <div
          onClick={() => onSelectCategory('neumaticos')}
          role="button"
          tabIndex={0}
          className="relative rounded-3xl overflow-hidden border border-slate-800/80 shadow-xl cursor-pointer group active:scale-[0.98] transition-all duration-150"
        >
          <div
            className="h-32 sm:h-36 bg-cover bg-center relative"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=1200&q=80')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40" />

            <div className="relative h-full flex items-center justify-between px-5 z-10">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FF4F00] flex items-center justify-center shadow-lg shadow-[#FF4F00]/30 shrink-0">
                  <Disc className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                    Control de Neumáticos
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Presión sugerida 32-34 PSI • Rotación cada 10.000 km
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          {/* Sincronización Calendario Recordatorio Strip */}
          <div className="bg-[#0A0E18] px-4 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <CalendarDays className="w-3.5 h-3.5 text-[#FF4F00]" />
              <span className="font-bold text-[11px] text-white">
                📅 Revisión / Rotación: {categoryDeadlines.neumaticos.formattedDate}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                  categoryDeadlines.neumaticos.diffDays < 0
                    ? 'bg-red-500/20 text-red-300'
                    : categoryDeadlines.neumaticos.diffDays <= 30
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {categoryDeadlines.neumaticos.diffDays < 0
                  ? 'Vencido'
                  : `${categoryDeadlines.neumaticos.diffDays} días`}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReminderModal(
                  'neumaticos',
                  categoryDeadlines.neumaticos.title,
                  categoryDeadlines.neumaticos.date
                );
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] font-black transition active:scale-95 flex items-center space-x-1"
            >
              <Calendar className="w-3 h-3 text-[#FF4F00]" />
              <span>Recordatorio</span>
            </button>
          </div>
        </div>

        {/* Card 3: Trámites y Legalidad */}
        <div
          onClick={() => onSelectCategory('tramites')}
          role="button"
          tabIndex={0}
          className="relative rounded-3xl overflow-hidden border border-slate-800/80 shadow-xl cursor-pointer group active:scale-[0.98] transition-all duration-150"
        >
          <div
            className="h-32 sm:h-36 bg-cover bg-center relative"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80')`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40" />

            <div className="relative h-full flex items-center justify-between px-5 z-10">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FF4F00] flex items-center justify-center shadow-lg shadow-[#FF4F00]/30 shrink-0">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                    Trámites y Legalidad
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {categoryDeadlines.tramites.title} ({categoryDeadlines.tramites.formattedDate})
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          {/* Sincronización Calendario Recordatorio Strip */}
          <div className="bg-[#0A0E18] px-4 py-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <CalendarDays className="w-3.5 h-3.5 text-[#FF4F00]" />
              <span className="font-bold text-[11px] text-white">
                📅 Vencimiento: {categoryDeadlines.tramites.formattedDate}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                  categoryDeadlines.tramites.diffDays < 0
                    ? 'bg-red-500/20 text-red-300'
                    : categoryDeadlines.tramites.diffDays <= 30
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {categoryDeadlines.tramites.diffDays < 0
                  ? 'Vencido'
                  : `${categoryDeadlines.tramites.diffDays} días`}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenReminderModal(
                  'tramites',
                  categoryDeadlines.tramites.title,
                  categoryDeadlines.tramites.date
                );
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] font-black transition active:scale-95 flex items-center space-x-1"
            >
              <Calendar className="w-3 h-3 text-[#FF4F00]" />
              <span>Recordatorio</span>
            </button>
          </div>
        </div>
      </main>

      {/* ---------------- MODAL 1: ACTUALIZACIÓN RÁPIDA DE ODÓMETRO (AL TOCAR LA CAJA DE ODÓMETRO) ---------------- */}
      {showOdoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#121620] border border-slate-700 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-white font-black text-base">
                <Gauge className="w-5 h-5 text-[#FF4F00]" />
                <span>Actualizar Odómetro</span>
              </div>
              <button
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Ingresa el kilometraje actual del odómetro de tu vehículo para sincronizar automáticamente el estado mecánico.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-300">Kilometraje (km):</label>
              <input
                type="text"
                value={newOdoInput}
                onChange={(e) => setNewOdoInput(e.target.value.replace(/\D/g, ''))}
                placeholder={odometer.toString()}
                className="w-full px-4 py-3 rounded-2xl bg-[#080B11] border border-slate-700 text-white font-sans font-black text-xl focus:outline-none focus:border-[#FF4F00] shadow-inner"
              />
            </div>

            {/* Botones de incremento rápido */}
            <div className="grid grid-cols-3 gap-2">
              {[500, 1000, 5000].map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => handleQuickAddKm(km)}
                  className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-sans font-black transition active:scale-95 cursor-pointer border border-slate-700"
                >
                  +{km} km
                </button>
              ))}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOdoModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-300 text-xs font-black cursor-pointer hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUpdateOdometer}
                className="flex-1 py-3 rounded-2xl bg-[#FF4F00] text-white text-xs font-black cursor-pointer hover:bg-[#E04500] shadow-lg shadow-[#FF4F00]/30"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 2: DIAGNÓSTICO COMPLETO Y SINCRONIZACIÓN DE TODAS LAS CATEGORÍAS ---------------- */}
      {showDiagnosisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[#121620] border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header Fijo */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0 bg-[#121620]">
              <div className="flex items-center space-x-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mechanicalDiagnosis.statusBg}`}>
                  <Activity className={`w-5 h-5 ${mechanicalDiagnosis.statusColor}`} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Estado y Calendario de Caducidad</h3>
                  <p className="text-[10px] text-slate-400">
                    Sincronizado con odómetro ({odometer.toLocaleString('es-ES')} km) y categorías
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnosisModal(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Cuerpo con Scroll Suave e Independiente */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 [touch-action:pan-y] [-webkit-overflow-scrolling:touch]">

            {/* Score Ring / Summary Header */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${mechanicalDiagnosis.statusBg}`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                  Índice de Salud Vehicular
                </span>
                <div className={`text-xl font-black mt-0.5 ${mechanicalDiagnosis.statusColor}`}>
                  {mechanicalDiagnosis.statusLabel}
                </div>
              </div>
              <div className="text-3xl font-black font-sans text-white">
                {mechanicalDiagnosis.score}%
              </div>
            </div>

            {/* CALENDARIO RECORDATORIO SINCRONIZADO DE TODAS LAS CATEGORÍAS */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <CalendarDays className="w-4 h-4 text-[#FF4F00]" />
                <span>Fechas de Caducidad y Recordatorios</span>
              </h4>

              <div className="space-y-2">
                {categoryDeadlines.all.map((item) => (
                  <div
                    key={item.category}
                    className="p-3 rounded-2xl bg-[#080B11] border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-[#FF4F00] uppercase">
                          {item.categoryTag}
                        </span>
                        <span className="text-xs font-black text-white truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-2">
                        <span>📅 Fecha: {item.formattedDate}</span>
                        <span>•</span>
                        <span
                          className={
                            item.diffDays < 0
                              ? 'text-red-400 font-bold'
                              : item.diffDays <= 30
                              ? 'text-amber-400 font-bold'
                              : 'text-emerald-400 font-bold'
                          }
                        >
                          {item.diffDays < 0
                            ? `Vencido hace ${Math.abs(item.diffDays)} días`
                            : `Quedan ${item.diffDays} días`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {item.hasActive && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReminder(item.category)}
                          className="p-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 flex items-center justify-center transition active:scale-95 cursor-pointer"
                          title="Eliminar este recordatorio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowDiagnosisModal(false);
                          handleOpenReminderModal(item.category, item.title, item.date);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shrink-0 flex items-center space-x-1 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#FF4F00]" />
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Checklist de Diagnóstico Mecánico */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                Diagnóstico Detallado
              </h4>

              {mechanicalDiagnosis.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border space-y-2 ${
                    issue.type === 'critical'
                      ? 'bg-red-500/10 border-red-500/30'
                      : issue.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-[#080B11] border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      {issue.type === 'critical' ? (
                        <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      ) : issue.type === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <span className="font-black text-xs text-white">
                        {issue.title}
                      </span>
                    </div>

                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase shrink-0">
                      {issue.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 pl-6">
                    {issue.desc}
                  </p>

                  <div className="pl-6 pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDiagnosisModal(false);
                        onSelectCategory(issue.category);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center space-x-1 cursor-pointer transition active:scale-95"
                    >
                      <span>{issue.actionText}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#FF4F00]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            </div>

            {/* Modal Footer Fijo y Visible */}
            <div className="p-3.5 sm:p-4 border-t border-slate-800 bg-[#0C101A] shrink-0">
              <button
                type="button"
                onClick={() => setShowDiagnosisModal(false)}
                className="w-full py-3 rounded-2xl bg-[#FF4F00] hover:bg-[#FF621F] text-white font-black text-xs cursor-pointer shadow-lg shadow-[#FF4F00]/25 transition active:scale-98"
              >
                Cerrar Diagnóstico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL 3: CALENDARIO RECORDATORIO POR CATEGORÍA ---------------- */}
      {editingCategoryReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#121620] border border-slate-700 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-white font-black text-base">
                <CalendarDays className="w-5 h-5 text-[#FF4F00]" />
                <span>
                  Calendario:{' '}
                  {editingCategoryReminder === 'mantenimiento'
                    ? 'Mantenimiento'
                    : editingCategoryReminder === 'neumaticos'
                    ? 'Neumáticos'
                    : 'Trámites'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategoryReminder(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Configura o ajusta la fecha de caducidad o recordatorio para sincronizarla en tiempo real con el estado de tu vehículo.
            </p>

            <div className="space-y-3">
              {/* Título del recordatorio */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Concepto / Trámite:
                </label>
                <input
                  type="text"
                  value={reminderTitleInput}
                  onChange={(e) => setReminderTitleInput(e.target.value)}
                  placeholder="Ej. SOAT / Cambio de Aceite / Rotación"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#080B11] border border-slate-700 text-white font-sans font-bold text-sm focus:outline-none focus:border-[#FF4F00]"
                />
              </div>

              {/* Selector de Fecha Nativo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Fecha de vencimiento o cita:</span>
                  <span className="text-[10px] text-[#FF4F00]">Calendario</span>
                </label>
                <input
                  type="date"
                  value={reminderDateInput}
                  onChange={(e) => setReminderDateInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#080B11] border border-slate-700 text-white font-sans font-bold text-sm focus:outline-none focus:border-[#FF4F00]"
                />
              </div>

              {/* Presets rápidos */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400">
                  Acceso Rápido:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '+15 días', days: 15 },
                    { label: '+1 mes', days: 30 },
                    { label: '+3 meses', days: 90 },
                    { label: '+1 año', days: 365 },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => handleSetQuickPresetDays(p.days)}
                      className="py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700 active:scale-95"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas opcionales */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Notas adicionales (Opcional):
                </label>
                <input
                  type="text"
                  value={reminderNotesInput}
                  onChange={(e) => setReminderNotesInput(e.target.value)}
                  placeholder="Ej. Taller Autorizado / Aseguradora Suramericana"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#080B11] border border-slate-700 text-white font-sans text-xs focus:outline-none focus:border-[#FF4F00]"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              {editingCategoryReminder && customReminders[editingCategoryReminder] && (
                <button
                  type="button"
                  onClick={() => handleDeleteReminder(editingCategoryReminder)}
                  className="px-3.5 py-3 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-black cursor-pointer flex items-center justify-center space-x-1 transition active:scale-95"
                  title="Eliminar este recordatorio"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingCategoryReminder(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-300 text-xs font-black cursor-pointer hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReminder}
                className="flex-1 py-3 rounded-2xl bg-[#FF4F00] text-white text-xs font-black cursor-pointer hover:bg-[#E04500] shadow-lg shadow-[#FF4F00]/30"
              >
                Guardar Fecha
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ---------------- MODAL 4: PERSONALIZACIÓN CON ÍCONO DE LÁPIZ (✏️) Y SUPABASE ---------------- */}
      {showCustomVehicleModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-[#121620] border border-slate-700 w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-black text-sm">
                <span className="text-lg">✏️</span>
                <span>Personalizar Vehículo</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomVehicleModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Configura tu vehículo a medida. Al guardar, se sincronizará automáticamente con <span className="text-emerald-400 font-bold">Supabase</span> y se aplicará de inmediato en Modo Marcha y la Calculadora.
            </p>

            <div className="space-y-3">
              {/* 1. Nombre del Vehículo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Nombre del Vehículo:
                </label>
                <input
                  type="text"
                  value={customVehName}
                  onChange={(e) => setCustomVehName(e.target.value)}
                  placeholder="Ej. Chevrolet Spark GT / Toyota Prado TXL"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#080B11] border border-slate-700 text-white font-sans font-bold text-xs focus:outline-none focus:border-[#FF4F00]"
                />
              </div>

              {/* 2. Carrocería */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Carrocería:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['sedan', 'suv', 'compact', 'pickup', 'van', 'custom'] as const).map((catKey) => {
                    const isSel = customVehCategory === catKey;
                    const catLabels: Record<string, string> = {
                      sedan: 'Sedán',
                      suv: 'SUV',
                      compact: 'Hatchback',
                      pickup: 'Pickup',
                      van: 'Van',
                      custom: 'Custom',
                    };
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setCustomVehCategory(catKey)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                          isSel
                            ? 'bg-[#FF4F00]/20 border-[#FF4F00] text-white shadow-sm'
                            : 'bg-[#080B11] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {catLabels[catKey]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Tipo de Combustible */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Tipo de Combustible Activo:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Gasolina', 'Diésel', 'Gas GLP'] as const).map((fuelOpt) => {
                    const isSel = customVehFuel === fuelOpt;
                    const displayLabel =
                      fuelOpt === 'Gas GLP'
                        ? (selectedCountry === 'CO' ? '🔥 Gas GLP' : '🔥 LPG')
                        : fuelOpt === 'Diésel'
                        ? (selectedCountry === 'CO' ? '🛢️ Diésel' : selectedCountry === 'US' ? '🛢️ Diesel' : '🛢️ ON')
                        : (selectedCountry === 'US' ? '⛽ Gas' : '⛽ Gasolina');
                    return (
                      <button
                        key={fuelOpt}
                        type="button"
                        onClick={() => setCustomVehFuel(fuelOpt)}
                        className={`py-2 px-1.5 rounded-xl text-[11px] font-black border transition cursor-pointer active:scale-95 ${
                          isSel
                            ? 'bg-[#FF4F00]/20 border-[#FF4F00] text-white shadow-sm'
                            : 'bg-[#080B11] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {displayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Consumo Base Mixto */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                  <span>Consumo Base Mixto:</span>
                  <span className="text-[10px] text-[#FF4F00] font-mono">
                    {selectedCountry === 'US' ? 'MPG' : selectedCountry === 'CO' ? 'km/L' : 'L/100 km'}
                  </span>
                </label>
                <input
                  type="text"
                  value={customVehConsumptionInput}
                  onChange={(e) => setCustomVehConsumptionInput(e.target.value)}
                  placeholder={selectedCountry === 'US' ? '32.0' : selectedCountry === 'CO' ? '13.5' : '7.2'}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#080B11] border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:border-[#FF4F00]"
                />
              </div>

              {/* 5. Cilindrada / Motor */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-300">
                  Cilindrada aproximada (cc / L):
                </label>
                <input
                  type="text"
                  value={customVehDisplacement}
                  onChange={(e) => setCustomVehDisplacement(e.target.value)}
                  placeholder="Ej. 1.600 cc / 2.0L VVT-i"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#080B11] border border-slate-700 text-white font-sans font-bold text-xs focus:outline-none focus:border-[#FF4F00]"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCustomVehicleModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 text-slate-300 text-xs font-black cursor-pointer hover:bg-slate-700 active:scale-95 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCustomVehicle}
                disabled={isSavingCustomVehicle || !customVehName.trim()}
                className="flex-1 py-3 rounded-2xl bg-[#FF4F00] hover:bg-[#E04500] text-white text-xs font-black cursor-pointer shadow-lg shadow-[#FF4F00]/30 active:scale-95 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {isSavingCustomVehicle ? (
                  <span>Sincronizando...</span>
                ) : (
                  <>
                    <span>Guardar y Aplicar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
