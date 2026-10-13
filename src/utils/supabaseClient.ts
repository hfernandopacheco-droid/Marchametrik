import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

// Get config from Vite environment variables or localStorage override
const getEnvOrStorage = (envKey: string, storageKey: string, fallback: string): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey);
    if (stored && stored.trim()) return stored.trim();
  }
  const envVal = (import.meta as any).env?.[envKey];
  if (envVal && typeof envVal === 'string' && envVal.trim()) {
    return envVal.trim();
  }
  return fallback;
};

// Safe defaults to avoid crash if environment variables have not been configured yet
const DEFAULT_SUPABASE_URL = 'https://xyzcompany.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key_for_initialization';

export const getSupabaseConfig = () => {
  const url = getEnvOrStorage('VITE_SUPABASE_URL', 'litrometrik_supabase_url', DEFAULT_SUPABASE_URL);
  const anonKey = getEnvOrStorage('VITE_SUPABASE_ANON_KEY', 'litrometrik_supabase_anon_key', DEFAULT_SUPABASE_ANON_KEY);
  return { url, anonKey };
};

const initialConfig = getSupabaseConfig();

export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseConfig();
  return (
    Boolean(url) &&
    url !== DEFAULT_SUPABASE_URL &&
    url.includes('supabase.co') &&
    Boolean(anonKey) &&
    anonKey !== DEFAULT_SUPABASE_ANON_KEY
  );
};

// Initialize Supabase Client
export const supabase: SupabaseClient = createClient(initialConfig.url, initialConfig.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Re-configure client dynamically if user changes credentials in UI
export const updateSupabaseCredentials = (newUrl: string, newAnonKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('litrometrik_supabase_url', newUrl.trim());
    localStorage.setItem('litrometrik_supabase_anon_key', newAnonKey.trim());
    window.location.reload();
  }
};

// ----------------- SQL SCHEMA SCRIPT -----------------
export const SUPABASE_SETUP_SQL = `-- ========================================================
-- LITROMETRIK PRO - ESQUEMA COMPLETO PARA SUPABASE
-- Con Row Level Security (RLS) y Vinculación a auth.users
-- ========================================================

-- Extensiones recomendadas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- 1. TABLA: profiles (Perfiles de usuarios / conductores)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nombre TEXT,
  moneda TEXT DEFAULT 'PLN',
  pais TEXT DEFAULT 'PL',
  odometro NUMERIC(10,2) DEFAULT 0,
  avatar TEXT DEFAULT '🚗',
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- --------------------------------------------------------
-- 2. TABLA: vehicles (Vehículos del usuario)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  alias TEXT,
  marca TEXT,
  modelo TEXT,
  anio INTEGER,
  matricula TEXT,
  tipo_vehiculo TEXT DEFAULT 'sedan',     -- 'compact', 'sedan', 'suv', 'van', 'pickup', 'custom'
  transmision TEXT DEFAULT 'manual',       -- 'manual', 'automatic'
  tipo_combustible TEXT DEFAULT 'glp',     -- 'gasolina', 'diesel', 'glp', 'hibrido', 'gnc'
  consumo_base NUMERIC(5,2) DEFAULT 8.50,  -- L/100km
  odometro_actual NUMERIC(10,2) DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON public.vehicles(user_id);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select_own" ON public.vehicles;
CREATE POLICY "vehicles_select_own" ON public.vehicles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vehicles_insert_own" ON public.vehicles;
CREATE POLICY "vehicles_insert_own" ON public.vehicles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "vehicles_update_own" ON public.vehicles;
CREATE POLICY "vehicles_update_own" ON public.vehicles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vehicles_delete_own" ON public.vehicles;
CREATE POLICY "vehicles_delete_own" ON public.vehicles
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- 3. TABLA: fuel_settings (Configuración y precios de combustible)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fuel_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  pb95 NUMERIC(6,2) DEFAULT 6.09,
  glp NUMERIC(6,2) DEFAULT 2.89,
  diesel NUMERIC(6,2) DEFAULT 6.19,
  combustible_activo TEXT DEFAULT 'Gas LPG',
  saldo_tanque NUMERIC(8,2) DEFAULT 0,
  pais TEXT DEFAULT 'PL',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_settings_user_id ON public.fuel_settings(user_id);

ALTER TABLE public.fuel_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_settings_select_own" ON public.fuel_settings;
CREATE POLICY "fuel_settings_select_own" ON public.fuel_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fuel_settings_insert_own" ON public.fuel_settings;
CREATE POLICY "fuel_settings_insert_own" ON public.fuel_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fuel_settings_update_own" ON public.fuel_settings;
CREATE POLICY "fuel_settings_update_own" ON public.fuel_settings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fuel_settings_delete_own" ON public.fuel_settings;
CREATE POLICY "fuel_settings_delete_own" ON public.fuel_settings
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- 4. TABLA: trips (Registros de viajes, telemetría y cálculos)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  distancia_km NUMERIC(8,2) NOT NULL,
  litros_consumidos NUMERIC(8,3) NOT NULL,
  costo_total NUMERIC(8,2) NOT NULL,
  combustible_usado TEXT NOT NULL,
  precio_por_litro NUMERIC(6,2),
  duracion TEXT,
  nombre_ruta TEXT,
  coordenadas JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON public.trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_fecha ON public.trips(fecha DESC);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select_own" ON public.trips;
CREATE POLICY "trips_select_own" ON public.trips
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_insert_own" ON public.trips;
CREATE POLICY "trips_insert_own" ON public.trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_update_own" ON public.trips;
CREATE POLICY "trips_update_own" ON public.trips
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trips_delete_own" ON public.trips;
CREATE POLICY "trips_delete_own" ON public.trips
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- 5. TABLA: refuels (Bitácora de tanqueos y repostajes)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.refuels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  estacion TEXT,
  litros NUMERIC(8,2) NOT NULL,
  precio_por_litro NUMERIC(6,2) NOT NULL,
  costo_total NUMERIC(8,2) NOT NULL,
  odometro NUMERIC(10,2),
  combustible TEXT,
  notas TEXT,
  foto_recibo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refuels_user_id ON public.refuels(user_id);
CREATE INDEX IF NOT EXISTS idx_refuels_fecha ON public.refuels(fecha DESC);

ALTER TABLE public.refuels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refuels_select_own" ON public.refuels;
CREATE POLICY "refuels_select_own" ON public.refuels
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "refuels_insert_own" ON public.refuels;
CREATE POLICY "refuels_insert_own" ON public.refuels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "refuels_update_own" ON public.refuels;
CREATE POLICY "refuels_update_own" ON public.refuels
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "refuels_delete_own" ON public.refuels;
CREATE POLICY "refuels_delete_own" ON public.refuels
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- 6. TABLA: garage_records (Mantenimiento, neumáticos y trámites)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.garage_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  categoria TEXT NOT NULL,                -- 'mantenimiento', 'neumaticos', 'tramites', 'bitacora'
  titulo TEXT NOT NULL,
  costo NUMERIC(10,2) DEFAULT 0,
  odometro NUMERIC(10,2) DEFAULT 0,
  fecha_registro TIMESTAMPTZ DEFAULT NOW(),
  fecha_proxima TIMESTAMPTZ,
  notas TEXT,
  foto_comprobante TEXT,
  datos_extra JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_garage_records_user_id ON public.garage_records(user_id);

ALTER TABLE public.garage_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "garage_records_select_own" ON public.garage_records;
CREATE POLICY "garage_records_select_own" ON public.garage_records
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "garage_records_insert_own" ON public.garage_records;
CREATE POLICY "garage_records_insert_own" ON public.garage_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "garage_records_update_own" ON public.garage_records;
CREATE POLICY "garage_records_update_own" ON public.garage_records
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "garage_records_delete_own" ON public.garage_records;
CREATE POLICY "garage_records_delete_own" ON public.garage_records
  FOR DELETE USING (auth.uid() = user_id);

-- --------------------------------------------------------
-- 7. TRIGGER: Creación automática de Perfil y Ajustes al registrarse
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear perfil inicial
  INSERT INTO public.profiles (id, email, nombre, moneda, pais)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'moneda', 'PLN'),
    'PL'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Crear configuración de combustible inicial
  INSERT INTO public.fuel_settings (user_id, pb95, glp, diesel, combustible_activo, saldo_tanque, pais)
  VALUES (
    NEW.id,
    6.09,
    2.89,
    6.19,
    'Gas LPG',
    0,
    'PL'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador activado al insertar en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
`;

// ----------------- AUTHENTICATION HELPERS -----------------

export interface SupabaseAuthResult {
  user: User | null;
  session: Session | null;
  error?: string;
}

export const signUpWithSupabase = async (
  email: string,
  pass: string,
  fullName: string,
  currency = 'PLN'
): Promise<SupabaseAuthResult> => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: pass,
    options: {
      data: {
        full_name: fullName,
        nombre: fullName,
        moneda: currency,
      },
    },
  });

  if (error) {
    throw new Error(error.message || 'Error al registrar usuario en Supabase');
  }

  const user = data.user;
  if (user) {
    // Create profile row in profiles table
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        nombre: fullName,
        moneda: currency,
        updated_at: new Date().toISOString(),
      });

      // Initialize empty/standard fuel settings
      await supabase.from('fuel_settings').upsert({
        user_id: user.id,
        pb95: 6.09,
        glp: 2.89,
        diesel: 6.19,
        combustible_activo: 'Gas LPG',
        saldo_tanque: 0,
        pais: 'PL',
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Initial profile seed error (may require table creation):', e);
    }
  }

  return { user: data.user, session: data.session };
};

export const signInWithSupabase = async (
  email: string,
  pass: string
): Promise<SupabaseAuthResult> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error) {
    // Strict restriction: throw specific error
    throw new Error(
      error.message === 'Invalid login credentials'
        ? 'Credenciales inválidas. Verifica tu correo y contraseña en Supabase.'
        : error.message || 'No fue posible iniciar sesión con Supabase.'
    );
  }

  return { user: data.user, session: data.session };
};

export const signOutSupabase = async () => {
  await supabase.auth.signOut();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('litrometrik_active_user');
    localStorage.removeItem('wazer_nickname');
    localStorage.removeItem('litrometrik_fuel_balance_pln');
    localStorage.removeItem('litrometrik_active_trip');
  }
};

export const subscribeToSupabaseAuth = (
  callback: (user: User | null, session: Session | null) => void
) => {
  if (!isSupabaseConfigured()) {
    const timer = setTimeout(() => callback(null, null), 0);
    return () => clearTimeout(timer);
  }

  let lastUserId: string | null | undefined = undefined;

  // Initial check
  supabase.auth.getSession().then(({ data: { session } }) => {
    const currentId = session?.user?.id || null;
    if (currentId !== lastUserId) {
      lastUserId = currentId;
      callback(session?.user || null, session || null);
    }
  }).catch(() => {
    if (lastUserId !== null) {
      lastUserId = null;
      callback(null, null);
    }
  });

  try {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentId = session?.user?.id || null;
      if (currentId !== lastUserId) {
        lastUserId = currentId;
        callback(session?.user || null, session || null);
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  } catch (_) {
    return () => {};
  }
};

// ----------------- DATA PERSISTENCE HELPERS -----------------

export const getSupabaseProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('getSupabaseProfile warning:', error.message);
    return null;
  }
  return data;
};

export const updateSupabaseProfile = async (userId: string, updates: Partial<{
  nombre: string;
  moneda: string;
  odometro: number;
  avatar: string;
  foto_url: string;
}>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.warn('updateSupabaseProfile warning:', error.message);
  }
  return data;
};

export const getSupabaseFuelSettings = async (userId: string) => {
  const { data, error } = await supabase
    .from('fuel_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.warn('getSupabaseFuelSettings warning:', error.message);
    return null;
  }
  return data;
};

export const saveSupabaseFuelSettings = async (userId: string, settings: {
  pb95?: number;
  glp?: number;
  diesel?: number;
  combustible_activo?: string;
  saldo_tanque?: number;
  pais?: string;
}) => {
  const { data, error } = await supabase
    .from('fuel_settings')
    .upsert({
      user_id: userId,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) {
    console.warn('saveSupabaseFuelSettings warning:', error.message);
  }
  return data;
};

export const getSupabaseTrips = async (userId: string) => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('fecha', { ascending: false });

  if (error) {
    console.warn('getSupabaseTrips warning:', error.message);
    return [];
  }
  return data || [];
};

export const insertSupabaseTrip = async (userId: string, trip: {
  distancia_km: number;
  litros_consumidos: number;
  costo_total: number;
  combustible_usado: string;
  precio_por_litro?: number;
  duracion?: string;
  nombre_ruta?: string;
  coordenadas?: any;
}) => {
  const { data, error } = await supabase
    .from('trips')
    .insert([{
      user_id: userId,
      fecha: new Date().toISOString(),
      ...trip,
    }])
    .select();

  if (error) {
    console.warn('insertSupabaseTrip warning:', error.message);
  }
  return data?.[0] || null;
};

export const deleteSupabaseTrip = async (tripId: string) => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) console.warn('deleteSupabaseTrip error:', error.message);
};

export const clearSupabaseTrips = async (userId: string) => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('user_id', userId);

  if (error) console.warn('clearSupabaseTrips error:', error.message);
};

export const getSupabaseRefuels = async (userId: string) => {
  const { data, error } = await supabase
    .from('refuels')
    .select('*')
    .eq('user_id', userId)
    .order('fecha', { ascending: false });

  if (error) {
    console.warn('getSupabaseRefuels warning:', error.message);
    return [];
  }
  return data || [];
};

export const insertSupabaseRefuel = async (userId: string, refuel: {
  estacion: string;
  litros: number;
  precio_por_litro: number;
  costo_total: number;
  odometro?: number;
  combustible?: string;
  notas?: string;
  foto_recibo?: string;
}) => {
  const { data, error } = await supabase
    .from('refuels')
    .insert([{
      user_id: userId,
      fecha: new Date().toISOString(),
      ...refuel,
    }])
    .select();

  if (error) console.warn('insertSupabaseRefuel error:', error.message);
  return data?.[0] || null;
};

export const deleteSupabaseRefuel = async (refuelId: string) => {
  const { error } = await supabase
    .from('refuels')
    .delete()
    .eq('id', refuelId);

  if (error) console.warn('deleteSupabaseRefuel error:', error.message);
};

// ----------------- VEHICLES HELPERS -----------------

export const getSupabaseVehicles = async (userId: string) => {
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('getSupabaseVehicles error:', error.message);
    return [];
  }
  return data || [];
};

export const insertSupabaseVehicle = async (userId: string, vehicle: {
  alias?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  matricula?: string;
  tipo_vehiculo?: string;
  transmision?: string;
  tipo_combustible?: string;
  consumo_base?: number;
  odometro_actual?: number;
  activo?: boolean;
}) => {
  const { data, error } = await supabase
    .from('vehicles')
    .insert([{
      user_id: userId,
      ...vehicle,
    }])
    .select();

  if (error) console.warn('insertSupabaseVehicle error:', error.message);
  return data?.[0] || null;
};

export const updateSupabaseVehicle = async (vehicleId: string, updates: any) => {
  const { data, error } = await supabase
    .from('vehicles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', vehicleId)
    .select();

  if (error) console.warn('updateSupabaseVehicle error:', error.message);
  return data?.[0] || null;
};

export const deleteSupabaseVehicle = async (vehicleId: string) => {
  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', vehicleId);

  if (error) console.warn('deleteSupabaseVehicle error:', error.message);
};

export const upsertCustomVehicleSupabase = async (
  userId: string,
  vehicle: {
    nombre: string;
    categoria: string;
    combustible: string;
    consumoBaseL100: number;
    cilindrada: string;
    transmision?: string;
  }
) => {
  const c = (vehicle.combustible || '').toLowerCase();
  const tipoCombustible = (c.includes('glp') || c.includes('lpg') || c.includes('gas') || c.includes('propane') || c.includes('autogaz'))
    ? 'glp'
    : (c.includes('diesel') || c.includes('diésel') || c.includes('acpm') || c.includes('on'))
    ? 'diesel'
    : 'gasolina';

  const payload: any = {
    alias: vehicle.nombre,
    marca: vehicle.nombre.split(' ')[0] || 'Personalizado',
    modelo: `${vehicle.nombre} (${vehicle.cilindrada || 'Custom'})`,
    tipo_vehiculo: vehicle.categoria || 'custom',
    transmision: vehicle.transmision || 'manual',
    tipo_combustible: tipoCombustible,
    consumo_base: vehicle.consumoBaseL100,
    activo: true,
    updated_at: new Date().toISOString(),
  };

  let effectiveUserId = (userId && userId !== 'guest' && userId !== 'guest_user') ? userId : null;
  if (!effectiveUserId) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) effectiveUserId = data.user.id;
    } catch (_) {}
  }

  if (effectiveUserId) {
    payload.user_id = effectiveUserId;
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert([payload])
        .select();

      if (error) {
        console.warn('Supabase upsertCustomVehicle error:', error.message);
      } else {
        console.log('Vehículo personalizado sincronizado con Supabase:', data);
        return data?.[0] || null;
      }
    } catch (err: any) {
      console.warn('Supabase upsertCustomVehicle exception:', err?.message);
    }
  }
  return null;
};

// ----------------- GARAGE RECORDS HELPERS -----------------

export const getSupabaseGarageRecords = async (userId: string, categoria?: string) => {
  let query = supabase
    .from('garage_records')
    .select('*')
    .eq('user_id', userId);

  if (categoria) {
    query = query.eq('categoria', categoria);
  }

  const { data, error } = await query.order('fecha_registro', { ascending: false });

  if (error) {
    console.warn('getSupabaseGarageRecords error:', error.message);
    return [];
  }
  return data || [];
};

export const insertSupabaseGarageRecord = async (userId: string, record: {
  categoria: string;
  titulo: string;
  costo?: number;
  odometro?: number;
  fecha_registro?: string;
  fecha_proxima?: string;
  notas?: string;
  foto_comprobante?: string;
  datos_extra?: any;
}) => {
  const { data, error } = await supabase
    .from('garage_records')
    .insert([{
      user_id: userId,
      ...record,
    }])
    .select();

  if (error) console.warn('insertSupabaseGarageRecord error:', error.message);
  return data?.[0] || null;
};

export const deleteSupabaseGarageRecord = async (recordId: string) => {
  const { error } = await supabase
    .from('garage_records')
    .delete()
    .eq('id', recordId);

  if (error) console.warn('deleteSupabaseGarageRecord error:', error.message);
};
