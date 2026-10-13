import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Radio, Cloud, Smartphone, Monitor } from 'lucide-react';

interface NativeStatusBarProps {
  isGPSActive?: boolean;
  gpsAccuracy?: number | null;
  isCloudConnected?: boolean;
  isDesktopFrame?: boolean;
  onToggleFrame?: () => void;
  onOpenCloud?: () => void;
}

export const NativeStatusBar: React.FC<NativeStatusBarProps> = ({
  isGPSActive = true,
  gpsAccuracy = 3,
  isCloudConnected = true,
  isDesktopFrame = false,
  onToggleFrame,
  onOpenCloud,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [batteryLevel, setBatteryLevel] = useState<number>(94);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);

    // Try reading device battery if supported
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsCharging(battery.charging);
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
        });
      }).catch(() => {});
    }

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#080B11] px-5 pt-2 pb-1.5 flex items-center justify-between text-xs text-slate-300 border-b border-slate-900 select-none z-40 transition-all">
      {/* Left: Time & GPS sensor badge */}
      <div className="flex items-center space-x-2.5">
        <span className="font-sans font-black text-slate-100 text-[13px] tracking-tight">
          {timeStr || '12:00'}
        </span>
        <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isGPSActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>GPS {gpsAccuracy ? `±${Math.round(gpsAccuracy)}m` : 'ON'}</span>
        </div>
      </div>

      {/* Center: Dynamic Island / Phone pill indicator */}
      <div className="hidden sm:flex items-center space-x-2 px-3 py-0.5 rounded-full bg-[#121620] border border-slate-800/80 shadow-inner">
        <span className="w-2 h-2 rounded-full bg-[#FF4F00] shadow-[0_0_8px_#FF4F00]" />
        <span className="text-[10px] font-black tracking-wider text-slate-200">
          LitroMetrik <span className="text-[#FF4F00]">PRO</span>
        </span>
      </div>

      {/* Right: WiFi, Battery & Frame Toggle */}
      <div className="flex items-center space-x-2">
        {/* WiFi */}
        <Wifi className="w-3.5 h-3.5 text-slate-300" />

        {/* Battery */}
        <div className="flex items-center space-x-1">
          <span className="font-sans text-[10px] font-bold text-slate-300">{batteryLevel}%</span>
          <div className="relative w-5 h-2.5 rounded-sm border border-slate-400 p-0.5 flex items-center">
            <div
              className={`h-full rounded-2xs ${
                batteryLevel < 20 ? 'bg-red-500' : isCharging ? 'bg-emerald-400' : 'bg-slate-100'
              }`}
              style={{ width: `${Math.max(10, Math.min(100, batteryLevel))}%` }}
            />
            <div className="absolute -right-1 top-0.5 w-0.5 h-1.5 bg-slate-400 rounded-r-xs" />
          </div>
        </div>

        {/* Desktop Device Frame Switcher (Only visible on medium/wide screens) */}
        {onToggleFrame && (
          <button
            type="button"
            onClick={onToggleFrame}
            title={isDesktopFrame ? 'Expandir a Pantalla Completa' : 'Ver en Marco de Teléfono'}
            className="hidden md:flex items-center justify-center p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            {isDesktopFrame ? (
              <Monitor className="w-3.5 h-3.5 text-slate-300" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-[#FF4F00]" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};
