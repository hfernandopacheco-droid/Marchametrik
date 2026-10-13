import React, { useState, useEffect } from 'react';
import { Gauge, Calculator, Fuel, Wrench, Navigation } from 'lucide-react';

export type MainAppTab = 'marcha' | 'calcular' | 'bitacora' | 'garaje';

interface BottomTabBarProps {
  activeTab: MainAppTab;
  onTabChange: (tab: MainAppTab) => void;
  pendingAlertsCount?: number;
  currentSpeed?: number;
  isGpsActive?: boolean;
  onWazeCenterPress?: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  pendingAlertsCount = 0,
  currentSpeed = 0,
  isGpsActive = false,
  onWazeCenterPress,
}) => {
  const [liveGpsSpeed, setLiveGpsSpeed] = useState<number>(currentSpeed);
  const [isTracking, setIsTracking] = useState<boolean>(isGpsActive);
  const [wazePulse, setWazePulse] = useState(false);

  // Synchronize live GPS speed and active driving mode from global events
  useEffect(() => {
    const handleSpeedEvent = (e: any) => {
      if (e && e.detail) {
        if (typeof e.detail.speed === 'number') {
          setLiveGpsSpeed(e.detail.speed);
        }
        if (typeof e.detail.isRunning === 'boolean') {
          setIsTracking(e.detail.isRunning);
        }
      }
    };

    window.addEventListener('litrometrik-speed-update', handleSpeedEvent);
    return () => {
      window.removeEventListener('litrometrik-speed-update', handleSpeedEvent);
    };
  }, []);

  useEffect(() => {
    setLiveGpsSpeed(currentSpeed);
  }, [currentSpeed]);

  useEffect(() => {
    setIsTracking(isGpsActive);
  }, [isGpsActive]);

  const handleTabPress = (tab: MainAppTab) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch (_) {}
    }
    onTabChange(tab);
  };

  const handleWazeButtonPress = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([25, 45]);
      } catch (_) {}
    }

    setWazePulse(true);
    setTimeout(() => setWazePulse(false), 500);

    if (onWazeCenterPress) {
      onWazeCenterPress();
    } else {
      onTabChange('marcha');
      window.dispatchEvent(new CustomEvent('litrometrik-toggle-marcha'));
    }
  };

  // 4 Main Options
  const leftTabs = [
    {
      key: 'marcha' as MainAppTab,
      label: 'Marcha',
      icon: Gauge,
    },
    {
      key: 'calcular' as MainAppTab,
      label: 'Calcular',
      icon: Calculator,
    },
  ];

  const rightTabs = [
    {
      key: 'bitacora' as MainAppTab,
      label: 'Bitácora',
      icon: Fuel,
    },
    {
      key: 'garaje' as MainAppTab,
      label: 'Garaje',
      icon: Wrench,
      badge: pendingAlertsCount > 0 ? pendingAlertsCount : undefined,
    },
  ];

  const speedToDisplay = Math.max(0, liveGpsSpeed);
  const miniArcCircumference = 163.36;
  const miniSpeedClamped = Math.min(speedToDisplay, 160);
  const miniDashOffset = miniArcCircumference - (miniSpeedClamped / 160) * miniArcCircumference;

  return (
    <nav
      role="navigation"
      aria-label="Navegación principal de LitroMetrik"
      className="fixed bottom-0 left-0 right-0 z-50 select-none w-full bg-[#080B13]/90 backdrop-blur-2xl border-t border-white/[0.09] shadow-[0_-8px_32px_rgba(0,0,0,0.85)] pb-[max(env(safe-area-inset-bottom,0px),8px)] pt-2"
    >
      {/* Container centrado ergonómico con puro estilo Glass */}
      <div className="relative max-w-lg mx-auto px-3">
        {/* Dock Layout: 2 Left Tabs | CENTRAL WAZE KM/H BUTTON | 2 Right Tabs */}
        <div className="relative flex items-center justify-between gap-1.5">
          {/* LEFT TABS (Marcha & Calcular) - Pure Frosted Glass */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            {leftTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabPress(tab.key)}
                  className={`relative flex flex-col items-center justify-center py-2.5 px-2 min-h-[58px] rounded-[22px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.90] cursor-pointer group select-none border backdrop-blur-xl ${
                    isActive
                      ? 'text-white border-white/[0.24] bg-white/[0.13] shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                      : 'text-slate-400 hover:text-slate-200 border-white/[0.05] bg-white/[0.03] hover:bg-white/[0.07]'
                  }`}
                >
                  {/* Active Frosted Crystal Subtle Pill Indicator */}
                  {isActive && (
                    <div className="absolute inset-x-3 -top-[1px] h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                  )}

                  {/* Icon with crisp glass highlight */}
                  <div className="relative z-10">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                        isActive
                          ? 'scale-110 stroke-[2.4] text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)] -translate-y-0.5'
                          : 'stroke-[2] text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                      }`}
                    />
                  </div>

                  <span
                    className={`text-[11px] mt-1 font-black tracking-tight transition-all duration-200 z-10 leading-tight ${
                      isActive ? 'text-white scale-105 drop-shadow-sm' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ---------------- CENTRAL INTERACTIVE WAZE-STYLE KM/H BUTTON (GLASS STYLE) ---------------- */}
          <div className="relative px-1 -my-4 z-30 flex flex-col items-center">
            {/* Pulsing beacon if active */}
            {isTracking && (
              <span className="absolute -inset-2 rounded-full bg-[#00D4FF]/30 animate-ping opacity-60 pointer-events-none" />
            )}

            <button
              type="button"
              onClick={handleWazeButtonPress}
              title="Velocímetro GPS Waze en tiempo real (Toca para iniciar/ver marcha)"
              className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-pointer shadow-[0_12px_28px_rgba(0,0,0,0.85)] active:scale-90 select-none backdrop-blur-2xl ${
                wazePulse ? 'scale-110' : ''
              } ${
                isTracking
                  ? 'bg-gradient-to-b from-[#10192A]/90 via-[#0B1321]/90 to-[#070C15]/90 border-2 border-[#00D4FF]/80 ring-2 ring-white/10 text-white shadow-[0_0_20px_rgba(0,212,255,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)]'
                  : 'bg-gradient-to-b from-white/[0.09] via-white/[0.05] to-black/40 border border-white/[0.18] hover:border-white/40 text-slate-200 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
              }`}
            >
              {/* Metallic Glass Highlight */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 via-transparent to-white/25 pointer-events-none" />

              {/* Mini Animated Speed Arc SVG Line inside Circle */}
              <svg className="absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] -rotate-90 pointer-events-none" viewBox="0 0 60 60">
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke={isTracking ? '#00D4FF' : 'rgba(255,255,255,0.3)'}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={miniArcCircumference}
                  strokeDashoffset={miniDashOffset}
                  style={{
                    transition: 'stroke-dashoffset 400ms cubic-bezier(0.2, 0.9, 0.3, 1), stroke 300ms ease',
                  }}
                />
              </svg>

              {/* Top GPS Indicator Dot */}
              <div className="flex items-center space-x-1 -mt-0.5 z-10">
                <Navigation
                  className={`w-3 h-3 ${
                    isTracking ? 'text-[#00D4FF] animate-pulse' : 'text-slate-400'
                  }`}
                />
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isTracking ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-slate-500'
                  }`}
                />
              </div>

              {/* Real-time GPS Speed Number */}
              <span className="text-lg font-black font-sans tracking-tight leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mt-0.5 z-10">
                {speedToDisplay}
              </span>

              {/* Unit label "km/h" */}
              <span className="text-[9px] font-black tracking-widest uppercase text-[#00D4FF] leading-none -mb-0.5 z-10">
                KM/H
              </span>
            </button>

            <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase mt-1 leading-none drop-shadow-sm">
              GPS
            </span>
          </div>

          {/* RIGHT TABS (Bitácora & Garaje) - Pure Frosted Glass */}
          <div className="flex-1 grid grid-cols-2 gap-2">
            {rightTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabPress(tab.key)}
                  className={`relative flex flex-col items-center justify-center py-2.5 px-2 min-h-[58px] rounded-[22px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.90] cursor-pointer group select-none border backdrop-blur-xl ${
                    isActive
                      ? 'text-white border-white/[0.24] bg-white/[0.13] shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)]'
                      : 'text-slate-400 hover:text-slate-200 border-white/[0.05] bg-white/[0.03] hover:bg-white/[0.07]'
                  }`}
                >
                  {/* Active Frosted Crystal Subtle Pill Indicator */}
                  {isActive && (
                    <div className="absolute inset-x-3 -top-[1px] h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
                  )}

                  {/* Icon with crisp glass highlight */}
                  <div className="relative z-10">
                    <Icon
                      className={`w-5 h-5 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                        isActive
                          ? 'scale-110 stroke-[2.4] text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)] -translate-y-0.5'
                          : 'stroke-[2] text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                      }`}
                    />

                    {/* Badge for Garaje (alerts) in sleek glass badge */}
                    {tab.badge && (
                      <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-500/90 text-white font-sans text-[9px] font-black flex items-center justify-center shadow-md animate-bounce border border-white/20">
                        {tab.badge}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] mt-1 font-black tracking-tight transition-all duration-200 z-10 leading-tight ${
                      isActive ? 'text-white scale-105 drop-shadow-sm' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
