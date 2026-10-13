/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { CalcularView } from './components/CalcularView';
import { TripHistory } from './components/TripHistory';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { SidebarDrawer, ModuleKey } from './components/SidebarDrawer';
import { CategoryDetailView } from './components/ModuleViewModal';
import { FuelStatisticsModal } from './components/FuelStatisticsModal';
import { UserWazerProfileModal } from './components/UserWazerProfileModal';
import { BottomTabBar, MainAppTab } from './components/BottomTabBar';
import { ModoMarchaView } from './components/ModoMarchaView';
import { GarajeView } from './components/GarajeView';
import { NubeView } from './components/NubeView';
import { NativeStatusBar } from './components/NativeStatusBar';
import { AuthModal } from './components/AuthModal';
import { AuthGate } from './components/AuthGate';
import { SplashScreen } from './components/SplashScreen';
import { UpdateBanner } from './components/UpdateBanner';
import { CalculatorInputs, SavedTrip } from './types';
import { calculateTrip, getWeightedFuelPrice } from './utils/calculator';
import { detectDefaultCountry, DATA_PAIS, CountryCode } from './utils/countryData';
import { auth, subscribeToAuth, getStoredActiveUser } from './utils/firebaseAuth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  saveCloudRecord,
  deleteCloudRecord,
  subscribeToCloudCollection,
  fetchCloudRecords,
  getCloudVehicleConfig,
} from './utils/firestoreService';
import {
  subscribeToSupabaseAuth,
  getSupabaseProfile,
  getSupabaseFuelSettings,
  getSupabaseTrips,
  insertSupabaseTrip,
  deleteSupabaseTrip,
  clearSupabaseTrips,
  signOutSupabase,
} from './utils/supabaseClient';
import { getActiveVehicleState } from './utils/vehicleCatalog';

export default function App() {
  const initialCountry = detectDefaultCountry();
  const initialCountryData = DATA_PAIS[initialCountry] || DATA_PAIS.PL;

  const [currentUser, setCurrentUser] = useState<any>(() => {
    return getStoredActiveUser();
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [isDesktopFrame, setIsDesktopFrame] = useState(false);

  useEffect(() => {
    // 0. Initial check from stored session
    const stored = getStoredActiveUser();
    if (stored) {
      setCurrentUser((prev: any) => {
        if (prev?.uid === stored.uid && prev?.email === stored.email) return prev;
        return stored;
      });
    }

    // 1. Cloud Firestore / Firebase Auth listener
    const unsubFirebase = subscribeToAuth((fbUser) => {
      if (fbUser) {
        setCurrentUser((prev: any) => {
          if (prev?.uid === fbUser.uid && prev?.email === fbUser.email) return prev;
          return fbUser;
        });
      }
    });

    // 2. Supabase Auth Listener (if configured)
    const unsubSupabase = subscribeToSupabaseAuth(async (sbUser) => {
      if (sbUser) {
        const appUser = {
          uid: sbUser.id,
          id: sbUser.id,
          email: sbUser.email,
          displayName: sbUser.user_metadata?.nombre || sbUser.email?.split('@')[0] || 'Conductor',
        };
        setCurrentUser((prev: any) => {
          if (prev?.uid === appUser.uid && prev?.email === appUser.email) return prev;
          return appUser;
        });
        localStorage.setItem('litrometrik_active_user', JSON.stringify(appUser));
        localStorage.setItem('litrometrik_active_user_session', JSON.stringify(appUser));

        // Load profile from Supabase
        try {
          const profile = await getSupabaseProfile(sbUser.id);
          if (profile?.nombre) {
            localStorage.setItem('wazer_nickname', profile.nombre);
          }
        } catch (_) {}

        // Load fuel settings from Supabase
        try {
          const fuelConfig = await getSupabaseFuelSettings(sbUser.id);
          if (fuelConfig) {
            if (fuelConfig.saldo_tanque !== undefined && fuelConfig.saldo_tanque !== null) {
              localStorage.setItem('litrometrik_fuel_balance_pln', fuelConfig.saldo_tanque.toString());
            }
          }
        } catch (_) {}

        // Load trips from Supabase
        try {
          const cloudTrips = await getSupabaseTrips(sbUser.id);
          if (cloudTrips && cloudTrips.length > 0) {
            const mapped: SavedTrip[] = cloudTrips.map((ct: any) => ({
              id: ct.id,
              date: ct.fecha || new Date().toISOString().split('T')[0],
              routeName: ct.nombre_ruta || 'Viaje Registrado',
              country: (ct.pais as CountryCode) || 'PL',
              vehicleType: 'sedan',
              transmission: 'manual',
              fuelType: ct.combustible_usado || 'Gas LPG',
              routeType: 'mixto',
              distanceKm: Number(ct.distancia_km) || 0,
              isRoundTrip: false,
              isACActive: false,
              coldStartLpg: false,
              pricePerLiter: Number(ct.precio_por_litro) || 0,
              totalLiters: Number(ct.litros_consumidos) || 0,
              totalCostPLN: Number(ct.costo_total) || 0,
              costPerKm: ct.distancia_km ? Number(ct.costo_total) / Number(ct.distancia_km) : 0,
              savingsVsGasoline: 0,
            }));
            setSavedTrips((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(mapped)) return prev;
              return mapped;
            });
          }
        } catch (_) {}
      } else {
        // Fallback to local stored user only if different
        const localUser = getStoredActiveUser();
        if (localUser) {
          setCurrentUser((prev: any) => {
            if (prev?.uid === localUser.uid && prev?.email === localUser.email) return prev;
            return localUser;
          });
        }
      }
      setAuthLoading(false);
    });

    return () => {
      unsubSupabase();
      unsubFirebase();
    };
  }, []);

  // Inputs state - initialized with saved vehicle preset and active weighted fuel price
  const [inputs, setInputs] = useState<CalculatorInputs>(() => {
    const activeV = getActiveVehicleState();
    const storedActiveFuel = localStorage.getItem('litrometrik_active_fuel') || 'Gas LPG';
    const initialFuelType = (storedActiveFuel.includes('LPG') || storedActiveFuel.includes('GLP'))
      ? 'lpg'
      : (storedActiveFuel.includes('Diésel') || storedActiveFuel.includes('Diesel') || storedActiveFuel.includes('ON'))
      ? 'diesel'
      : 'gasolina';
    const initialWeightedPrice = getWeightedFuelPrice(initialFuelType, initialCountry);

    return {
      country: initialCountry,
      vehicleType: activeV.vehicleType || 'sedan',
      customBaseConsumption: activeV.baseL100 || initialCountryData.Sedan.base,
      transmission: activeV.transmission || 'manual',
      fuelType: initialFuelType,
      routeType: 'mixto',
      distanceKm: 150,
      isRoundTrip: false,
      isACActive: false,
      coldStartLpg: true,
      pricePerLiter: initialWeightedPrice,
      referenceGasolinePrice: getWeightedFuelPrice('gasolina', initialCountry),
      routeName: `Viaje Estándar (${initialCountryData.nombre})`,
    };
  });

  // Keep vehicle inputs synchronized across Modo Marcha, Calculadora, and Garaje
  useEffect(() => {
    const handleVehicleSync = (e: any) => {
      const v = e?.detail || getActiveVehicleState();
      if (v) {
        setInputs((prev) => ({
          ...prev,
          vehicleType: v.vehicleType || prev.vehicleType,
          customBaseConsumption: v.baseL100 || prev.customBaseConsumption,
          transmission: v.transmission || prev.transmission,
        }));
      }
    };
    window.addEventListener('litrometrik-vehicle-updated', handleVehicleSync);
    window.addEventListener('storage', handleVehicleSync);
    return () => {
      window.removeEventListener('litrometrik-vehicle-updated', handleVehicleSync);
      window.removeEventListener('storage', handleVehicleSync);
    };
  }, []);

  // Saved trips state (restored per user or global cache)
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>(() => {
    try {
      const activeU = getStoredActiveUser();
      if (activeU?.uid) {
        const userTrips = localStorage.getItem(`fuel_trips_pln_${activeU.uid}`);
        if (userTrips) return JSON.parse(userTrips);
      }
      const stored = localStorage.getItem('fuel_trips_pln');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading saved trips', e);
    }
    return [];
  });

  // Real-time Firestore sync for trips and vehicle config across devices
  useEffect(() => {
    if (!currentUser?.uid || currentUser.uid === 'guest' || currentUser.uid === 'guest_user') return;
    
    // 1. Instant recovery from local user-scoped cache
    try {
      const userLocalTripsRaw = localStorage.getItem(`fuel_trips_pln_${currentUser.uid}`);
      if (userLocalTripsRaw) {
        const parsed = JSON.parse(userLocalTripsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedTrips((prev) => {
            if (JSON.stringify(prev) === userLocalTripsRaw) return prev;
            return parsed;
          });
        }
      }
    } catch (_) {}

    // 2. Fetch from Cloud Firestore and merge safely
    fetchCloudRecords(currentUser.uid, 'viajes').then((cloudTrips) => {
      if (cloudTrips && cloudTrips.length > 0) {
        setSavedTrips((prev) => {
          const map = new Map<string, SavedTrip>();
          cloudTrips.forEach((t) => map.set(t.id, t));
          prev.forEach((t) => {
            if (!map.has(t.id)) map.set(t.id, t);
          });
          const merged = Array.from(map.values());
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
          try {
            localStorage.setItem(`fuel_trips_pln_${currentUser.uid}`, JSON.stringify(merged));
            localStorage.setItem('fuel_trips_pln', JSON.stringify(merged));
          } catch (_) {}
          return merged;
        });
      }
    });

    // Sync vehicle config and fuel balance from cloud
    getCloudVehicleConfig(currentUser.uid).then((vConfig) => {
      if (vConfig) {
        if (typeof vConfig.fuelBalance === 'number') {
          const currentBal = localStorage.getItem('litrometrik_fuel_balance_pln');
          if (currentBal !== vConfig.fuelBalance.toString()) {
            localStorage.setItem('litrometrik_fuel_balance_pln', vConfig.fuelBalance.toString());
          }
        }
      }
    });

    const unsub = subscribeToCloudCollection(currentUser.uid, 'viajes', (cloudTrips) => {
      if (cloudTrips && cloudTrips.length > 0) {
        setSavedTrips((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(cloudTrips)) return prev;
          try {
            localStorage.setItem(`fuel_trips_pln_${currentUser.uid}`, JSON.stringify(cloudTrips));
            localStorage.setItem('fuel_trips_pln', JSON.stringify(cloudTrips));
          } catch (_) {}
          return cloudTrips;
        });
      }
    });
    return () => {
      unsub && unsub();
    };
  }, [currentUser?.uid]);

  // Modals & View state
  const [currentTab, setCurrentTab] = useState<MainAppTab>('marcha');
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Save trips safely without wiping on user logout
  useEffect(() => {
    try {
      if (currentUser?.uid && currentUser.uid !== 'guest' && currentUser.uid !== 'guest_user') {
        localStorage.setItem(`fuel_trips_pln_${currentUser.uid}`, JSON.stringify(savedTrips));
        if (savedTrips.length > 0) {
          localStorage.setItem('fuel_trips_pln', JSON.stringify(savedTrips));
        }
      } else if (savedTrips.length > 0) {
        localStorage.setItem('fuel_trips_pln', JSON.stringify(savedTrips));
      }
    } catch (e) {
      console.error('Error saving trips', e);
    }
  }, [savedTrips, currentUser?.uid]);

  // Synchronize country change across all tabs in real-time
  useEffect(() => {
    const handleCountryEvt = (e: any) => {
      const c = e.detail?.country as CountryCode;
      if (c && DATA_PAIS[c]) {
        const nextCountryData = DATA_PAIS[c];
        setInputs((prev) => {
          if (prev.country === c) return prev;
          return {
            ...prev,
            country: c,
            pricePerLiter: nextCountryData.preciosDefecto[prev.fuelType === 'diesel' ? 'diesel' : prev.fuelType === 'lpg' || prev.fuelType === 'glp' ? 'lpg' : 'gasolina'],
            referenceGasolinePrice: nextCountryData.preciosDefecto.gasolina,
            routeName: `Viaje en ${nextCountryData.nombre}`,
          };
        });
      }
    };
    window.addEventListener('litrometrik-country-changed', handleCountryEvt);
    return () => window.removeEventListener('litrometrik-country-changed', handleCountryEvt);
  }, []);

  // Synchronize fuel price updates across all tabs in real-time
  useEffect(() => {
    const handlePriceEvt = (e: any) => {
      const { fuel, price } = e.detail || {};
      if (fuel && typeof price === 'number') {
        setInputs((prev) => {
          const isMatchingFuel =
            (prev.fuelType === 'gasolina' && fuel === 'Gasolina Pb95') ||
            (prev.fuelType === 'diesel' && fuel === 'Diésel ON') ||
            ((prev.fuelType === 'lpg' || prev.fuelType === 'glp') && (fuel === 'Gas LPG' || fuel === 'Gas GLP / LPG'));
          if (isMatchingFuel) {
            if (prev.pricePerLiter === price) return prev;
            return { ...prev, pricePerLiter: price };
          }
          return prev;
        });
      }
    };
    window.addEventListener('litrometrik-prices-updated', handlePriceEvt);
    return () => window.removeEventListener('litrometrik-prices-updated', handlePriceEvt);
  }, []);

  const handleInputsChange = (newInputs: Partial<CalculatorInputs>) => {
    if (newInputs.country && newInputs.country !== inputs.country) {
      const nextCountryData = DATA_PAIS[newInputs.country] || DATA_PAIS.PL;
      try {
        localStorage.setItem('litrometrik_selected_country', newInputs.country);
        localStorage.setItem('litrometrik_jurisdiction_country', newInputs.country);
      } catch (e) {}

      setInputs((prev) => ({
        ...prev,
        ...newInputs,
        country: newInputs.country!,
        pricePerLiter: nextCountryData.preciosDefecto[prev.fuelType === 'diesel' ? 'diesel' : prev.fuelType === 'lpg' || prev.fuelType === 'glp' ? 'lpg' : 'gasolina'],
        referenceGasolinePrice: nextCountryData.preciosDefecto.gasolina,
        routeName: `Viaje en ${nextCountryData.nombre}`,
      }));
      window.dispatchEvent(new CustomEvent('litrometrik-country-changed', { detail: { country: newInputs.country } }));
      return;
    }
    setInputs((prev) => ({ ...prev, ...newInputs }));
  };

  const handleSaveTrip = (newTrip: SavedTrip) => {
    setSavedTrips((prev) => [newTrip, ...prev]);

    // Persist to Supabase if user logged in
    if (currentUser?.uid && currentUser.uid !== 'guest' && currentUser.uid !== 'guest_user') {
      insertSupabaseTrip(currentUser.uid, {
        distancia_km: newTrip.distanceKm,
        litros_consumidos: newTrip.totalLiters,
        costo_total: newTrip.totalCostPLN,
        combustible_usado: newTrip.fuelType,
        precio_por_litro: newTrip.pricePerLiter,
        nombre_ruta: newTrip.routeName,
      }).catch((e) => console.warn('Supabase trip insert warning:', e));

      saveCloudRecord(currentUser.uid, 'viajes', newTrip);
    }
  };

  const handleDeleteTrip = (id: string) => {
    setSavedTrips((prev) => prev.filter((t) => t.id !== id));
    if (currentUser?.uid && currentUser.uid !== 'guest' && currentUser.uid !== 'guest_user') {
      deleteSupabaseTrip(id).catch((e) => console.warn('Supabase trip delete warning:', e));
      deleteCloudRecord(currentUser.uid, 'viajes', id);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar todo el historial de viajes?')) {
      if (currentUser?.uid && currentUser.uid !== 'guest' && currentUser.uid !== 'guest_user') {
        clearSupabaseTrips(currentUser.uid).catch((e) => console.warn('Supabase trips clear warning:', e));
        savedTrips.forEach((t) => deleteCloudRecord(currentUser.uid, 'viajes', t.id));
      }
      setSavedTrips([]);
    }
  };

  const handleLoadTrip = (trip: SavedTrip) => {
    setInputs({
      country: inputs.country,
      vehicleType: trip.vehicleType as any,
      customBaseConsumption: 8.0,
      transmission: trip.transmission as any,
      fuelType: trip.fuelType as any,
      routeType: trip.routeType as any,
      distanceKm: trip.isRoundTrip ? trip.distanceKm / 2 : trip.distanceKm,
      isRoundTrip: trip.isRoundTrip,
      isACActive: trip.isACActive,
      coldStartLpg: trip.coldStartLpg,
      pricePerLiter: trip.pricePerLiter,
      referenceGasolinePrice: inputs.referenceGasolinePrice,
      routeName: trip.routeName,
    });
    setIsHistoryOpen(false);
    setCurrentTab('calcular');
  };

  const handleReset = () => {
    const cData = DATA_PAIS[inputs.country] || DATA_PAIS.PL;
    setInputs({
      country: inputs.country,
      vehicleType: 'sedan',
      customBaseConsumption: cData.Sedan.base,
      transmission: 'manual',
      fuelType: 'gasolina',
      routeType: 'mixto',
      distanceKm: 150,
      isRoundTrip: false,
      isACActive: false,
      coldStartLpg: true,
      pricePerLiter: cData.preciosDefecto.gasolina,
      referenceGasolinePrice: cData.preciosDefecto.gasolina,
      routeName: `Nuevo Viaje (${cData.nombre})`,
    });
  };

  const totalKmCalculated = Math.round(savedTrips.reduce((acc, t) => acc + (t.distanceKm || 0), 0));

  // ---------------- AUTHENTICATION VIEW (IF NOT LOGGED IN) ----------------
  if (!currentUser) {
    return (
      <AuthGate
        onAuthSuccess={(user) => {
          setCurrentUser(user);
        }}
        onContinueAsGuest={() => {
          const guestUser = {
            uid: 'guest',
            email: 'invitado@litrometrik.pro',
            displayName: 'Conductor Invitado',
            photoURL: null,
            emailVerified: true,
            providerId: 'guest',
            isGuest: true,
          };
          localStorage.setItem('litrometrik_active_user', JSON.stringify(guestUser));
          localStorage.setItem('litrometrik_active_user_session', JSON.stringify(guestUser));
          setCurrentUser(guestUser);
        }}
      />
    );
  }

  // ---------------- MAIN APPLICATION VIEW ----------------
  const appContent = (
    <div className="min-h-screen bg-[#080B11] text-slate-100 font-sans antialiased selection:bg-[#FF4F00] selection:text-white pb-24 w-full overflow-x-hidden touch-pan-y relative">
      {/* Native Smartphone Top Status Bar (Only in Desktop Simulator Frame) */}
      {isDesktopFrame && (
        <NativeStatusBar
          isGPSActive={true}
          gpsAccuracy={3}
          isCloudConnected={Boolean(currentUser?.uid && currentUser.uid !== 'guest' && currentUser.uid !== 'guest_user')}
          isDesktopFrame={isDesktopFrame}
          onToggleFrame={() => setIsDesktopFrame(!isDesktopFrame)}
          onOpenCloud={() => {
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* Google Maps Quota Exhausted Banner */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* App Update Notification Banner */}
      <UpdateBanner />

      {/* ---------------- 1. SUB-VIEWS / DRILL-DOWN MODALS ---------------- */}
      {activeModule && activeModule !== 'stats' && activeModule !== 'wazerProfile' ? (
        <CategoryDetailView
          moduleKey={activeModule}
          onBack={() => setActiveModule(null)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          selectedCountry={inputs.country}
          onCountryChange={(c) => handleInputsChange({ country: c })}
          currentUser={currentUser}
        />
      ) : activeModule === 'stats' ? (
        <FuelStatisticsModal
          isOpen={true}
          onClose={() => setActiveModule(null)}
          onBackToCategories={() => setActiveModule(null)}
          selectedCountry={inputs.country}
          onCountryChange={(c) => handleInputsChange({ country: c })}
        />
      ) : activeModule === 'wazerProfile' ? (
        <UserWazerProfileModal
          isOpen={true}
          onClose={() => setActiveModule(null)}
          totalKmCalculated={totalKmCalculated}
        />
      ) : (
        /* ---------------- 2. MAIN 4 NATIVE MOBILE TABS (PERSISTENT MOUNTED IN BACKGROUND) ---------------- */
        <>
          <div className={currentTab === 'marcha' ? 'contents' : 'hidden'}>
            {/* TAB 1: MODO EN MARCHA (Tacómetro & Sensor GPS Real) */}
            <ModoMarchaView
              selectedCountry={inputs.country}
              onCountryChange={(c) => handleInputsChange({ country: c })}
              onOpenHistory={() => setIsHistoryOpen(true)}
              currentUser={currentUser}
              onLogout={() => {
                localStorage.removeItem('litrometrik_active_user');
                localStorage.removeItem('litrometrik_active_user_session');
                setCurrentUser(null);
              }}
            />
          </div>

          <div className={currentTab === 'calcular' ? 'contents' : 'hidden'}>
            {/* TAB 2: CALCULADORA NATIVA MÓVIL */}
            <CalcularView
              inputs={inputs}
              onChange={handleInputsChange}
              onSaveTrip={handleSaveTrip}
              onReset={handleReset}
              onOpenHistory={() => setIsHistoryOpen(true)}
              currentUser={currentUser}
            />
          </div>

          <div className={currentTab === 'bitacora' ? 'contents' : 'hidden'}>
            {/* TAB 3: BITÁCORA DE REPOSTAJE & CONSUMO */}
            <CategoryDetailView
              moduleKey="refuels"
              onBack={() => setCurrentTab('marcha')}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              selectedCountry={inputs.country}
              onCountryChange={(c) => handleInputsChange({ country: c })}
              currentUser={currentUser}
            />
          </div>

          <div className={currentTab === 'garaje' ? 'contents' : 'hidden'}>
            {/* TAB 4: MI GARAJE (Mantenimientos, Neumáticos, Trámites) */}
            <GarajeView
              selectedCountry={inputs.country}
              onCountryChange={(c) => handleInputsChange({ country: c })}
              currentUser={currentUser}
              onSelectCategory={(cat) => {
                const keyMap: Record<string, ModuleKey> = {
                  mantenimiento: 'maintenance',
                  neumaticos: 'tires',
                  tramites: 'legal',
                };
                setActiveModule(keyMap[cat] || 'maintenance');
              }}
            />
          </div>
        </>
      )}

      {/* ---------------- 3. FIXED BOTTOM TAB BAR (4 Tabs + Central Waze km/h Button) ---------------- */}
      <BottomTabBar
        activeTab={currentTab}
        onTabChange={(newTab) => {
          setActiveModule(null);
          setCurrentTab(newTab);
        }}
        onWazeCenterPress={() => {
          setActiveModule(null);
          if (currentTab !== 'marcha') {
            setCurrentTab('marcha');
          } else {
            window.dispatchEvent(new CustomEvent('litrometrik-toggle-marcha'));
          }
        }}
      />

      {/* Persistent Modals & Drawers */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
      />

      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />

      <TripHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        trips={savedTrips}
        onDeleteTrip={handleDeleteTrip}
        onClearHistory={handleClearHistory}
        onLoadTrip={handleLoadTrip}
      />

      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectModule={(key) => {
          if (key === 'stats') {
            setCurrentTab('marcha');
          } else if (key === 'refuels') {
            setCurrentTab('bitacora');
          } else if (key === 'wazerProfile') {
            setActiveModule('wazerProfile');
          } else {
            setCurrentTab('garaje');
            setActiveModule(key);
          }
        }}
      />
    </div>
  );

  // If desktop frame toggle is active on larger screens
  if (isDesktopFrame) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[430px] h-[92vh] max-h-[920px] bg-[#080B11] rounded-[52px] shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_0_12px_#1E293B,0_0_0_14px_#334155] overflow-hidden flex flex-col relative border-4 border-slate-700/60">
          {/* Hardware Camera Notch / Dynamic Island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 rounded-full bg-black z-50 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 ml-16" />
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {appContent}
          </div>
        </div>
      </div>
    );
  }

  return appContent;
}
