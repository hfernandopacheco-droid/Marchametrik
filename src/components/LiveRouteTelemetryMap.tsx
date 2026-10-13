import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import {
  Navigation,
  MapPin,
  Layers,
  Compass,
  Sparkles,
  Maximize2,
  Minimize2,
  Fuel,
  Clock,
  Gauge,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  History,
  CheckCircle2,
  Info,
  Car,
  TrendingDown,
  Globe,
  Map as MapIcon
} from 'lucide-react';
import { CountryCode } from '../utils/countryData';

export interface RouteWaypoint {
  id: number;
  lat: number;
  lng: number;
  distanceKm: number;
  burnedLiters: number;
  cost: number;
  speed: number;
  elapsedSeconds: number;
  timestamp: string;
  address?: string;
}

interface LiveRouteTelemetryMapProps {
  country: CountryCode;
  currency: string;
  isRunning: boolean;
  currentSpeed: number;
  distanceKm: number;
  liveLiters: number;
  liveCost: number;
  elapsedSeconds: number;
  currentLocation?: { lat: number; lng: number } | null;
  savedTrips?: any[];
}

// Default regional capital centers
const CAPITAL_CENTERS: Record<CountryCode, { lat: number; lng: number; city: string; startLabel: string }> = {
  PL: { lat: 52.2297, lng: 21.0122, city: 'Varsovia', startLabel: 'Varsovia Centro' },
  CO: { lat: 4.7110, lng: -74.0721, city: 'Bogotá', startLabel: 'Bogotá (Calle 26)' },
  US: { lat: 40.7128, lng: -74.0060, city: 'Nueva York', startLabel: 'New York (Broadway / Manhattan)' },
};

/**
 * Reverse geocode via Google Maps API or OpenStreetMap to get human-readable street/city
 */
async function reverseGeocodeLocation(lat: number, lng: number): Promise<string> {
  try {
    const gmaps = (window as any).google?.maps;
    if (gmaps?.Geocoder) {
      const geocoder = new gmaps.Geocoder();
      const response = await new Promise<any>((resolve) => {
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            resolve(null);
          }
        });
      });
      if (response) {
        // Return clean short address (e.g. street + city)
        const parts = response.split(',');
        return parts.slice(0, 2).join(', ').trim();
      }
    }
  } catch (_) {}

  // Fallback to nominatim or lat/lng coords
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const parts = data.display_name.split(',');
        return parts.slice(0, 2).join(', ').trim();
      }
    }
  } catch (_) {}

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Generates smooth trajectory path coordinates connecting waypoints
 */
function generateTrajectoryPolyline(waypoints: RouteWaypoint[]): [number, number][] {
  if (waypoints.length === 0) return [];
  if (waypoints.length === 1) return [[waypoints[0].lng, waypoints[0].lat]];

  const coords: [number, number][] = [];
  for (let i = 0; i < waypoints.length; i++) {
    coords.push([waypoints[i].lng, waypoints[i].lat]);
  }
  return coords;
}

export const LiveRouteTelemetryMap: React.FC<LiveRouteTelemetryMapProps> = ({
  country,
  currency,
  isRunning,
  currentSpeed,
  distanceKm,
  liveLiters,
  liveCost,
  elapsedSeconds,
  currentLocation,
  savedTrips = [],
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const vehicleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const startMarkerRef = useRef<maplibregl.Marker | null>(null);
  const waypointMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyleType, setMapStyleType] = useState<'dark' | 'satellite'>('dark');
  const [selectedWaypoint, setSelectedWaypoint] = useState<RouteWaypoint | null>(null);
  const [activeViewingTripId, setActiveViewingTripId] = useState<string | 'live'>('live');
  const [startAddress, setStartAddress] = useState<string>('Punto de Partida');
  const [currentAddress, setCurrentAddress] = useState<string>('En trayectoria');

  // Base capital reference for initial position
  const baseCenter = CAPITAL_CENTERS[country] || CAPITAL_CENTERS.PL;

  // Track recorded trajectory waypoints
  const [recordedWaypoints, setRecordedWaypoints] = useState<RouteWaypoint[]>(() => {
    const startLat = currentLocation?.lat || baseCenter.lat;
    const startLng = currentLocation?.lng || baseCenter.lng;
    return [
      {
        id: 0,
        lat: startLat,
        lng: startLng,
        distanceKm: 0,
        burnedLiters: 0,
        cost: 0,
        speed: 0,
        elapsedSeconds: 0,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        address: baseCenter.startLabel,
      },
    ];
  });

  // Reverse geocode initial start point
  useEffect(() => {
    const pt = recordedWaypoints[0];
    if (pt) {
      reverseGeocodeLocation(pt.lat, pt.lng).then((addr) => {
        if (addr) setStartAddress(addr);
      });
    }
  }, [recordedWaypoints[0]?.lat, recordedWaypoints[0]?.lng]);

  // Format MM:SS for Waypoint inspection
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Record points dynamically as distance increases during driving
  const lastRecordedKmRef = useRef<number>(0);
  useEffect(() => {
    if (!isRunning) return;

    const diff = distanceKm - lastRecordedKmRef.current;
    // Add waypoint every ~0.35 km of displacement
    if (diff >= 0.35 || (distanceKm > 0.05 && recordedWaypoints.length === 1)) {
      lastRecordedKmRef.current = distanceKm;

      const prevPt = recordedWaypoints[recordedWaypoints.length - 1];
      // Heading displacement along highway
      const headingRad = 2.15;
      const kmPerDeg = 111.0;
      const stepKm = diff > 0 ? diff : 0.35;
      const newLat = prevPt.lat + (stepKm * Math.cos(headingRad)) / kmPerDeg;
      const newLng = prevPt.lng + (stepKm * Math.sin(headingRad)) / (kmPerDeg * Math.cos((prevPt.lat * Math.PI) / 180));

      const actualLat = currentLocation?.lat || newLat;
      const actualLng = currentLocation?.lng || newLng;

      const newPt: RouteWaypoint = {
        id: recordedWaypoints.length,
        lat: actualLat,
        lng: actualLng,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        burnedLiters: parseFloat(liveLiters.toFixed(2)),
        cost: parseFloat(liveCost.toFixed(2)),
        speed: currentSpeed || 65,
        elapsedSeconds,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      };

      // Resolve address in background
      reverseGeocodeLocation(actualLat, actualLng).then((addr) => {
        newPt.address = addr;
        setCurrentAddress(addr);
      });

      setRecordedWaypoints((prev) => [...prev, newPt]);
    }
  }, [distanceKm, isRunning, liveLiters, liveCost, currentSpeed, elapsedSeconds, currentLocation]);

  // Current active waypoints to show on map (live or from selected saved trip)
  const displayWaypoints = useMemo<RouteWaypoint[]>(() => {
    if (activeViewingTripId === 'live' || !savedTrips.length) {
      return recordedWaypoints;
    }
    const trip = savedTrips.find((t) => String(t.id) === String(activeViewingTripId));
    if (!trip) return recordedWaypoints;

    // Generate waypoints along the saved trip path
    const dist = trip.distanceKm || 120;
    const count = Math.max(3, Math.min(10, Math.round(dist / 20)));
    const pts: RouteWaypoint[] = [];
    const base = CAPITAL_CENTERS[trip.country as CountryCode] || baseCenter;

    for (let i = 0; i <= count; i++) {
      const ratio = i / count;
      const pDist = dist * ratio;
      const pLit = (trip.totalLiters || dist * 0.078) * ratio;
      const pCost = (trip.totalCostPLN || pLit * (trip.pricePerLiter || 6.09)) * ratio;

      const angle = 2.15;
      const kmPerDeg = 111.0;
      const lat = base.lat + (pDist * Math.cos(angle)) / kmPerDeg;
      const lng = base.lng + (pDist * Math.sin(angle)) / (kmPerDeg * Math.cos((base.lat * Math.PI) / 180));

      pts.push({
        id: i,
        lat,
        lng,
        distanceKm: parseFloat(pDist.toFixed(1)),
        burnedLiters: parseFloat(pLit.toFixed(2)),
        cost: parseFloat(pCost.toFixed(2)),
        speed: i === 0 ? 0 : 70 + (i % 3) * 10,
        elapsedSeconds: Math.round((pDist / 70) * 3600),
        timestamp: `Km ${pDist.toFixed(0)}`,
        address: i === 0 ? `${base.city} (Origen)` : `${base.city} (Tramo ${pDist.toFixed(0)} km)`,
      });
    }
    return pts;
  }, [activeViewingTripId, recordedWaypoints, savedTrips, baseCenter]);

  // 1. Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const LibMap = (window as any).maplibreGl || maplibregl;
    if (!LibMap) return;

    const centerLat = displayWaypoints[0]?.lat || baseCenter.lat;
    const centerLng = displayWaypoints[0]?.lng || baseCenter.lng;

    const darkStyle = {
      version: 8,
      sources: {
        'carto-dark': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution: '© CARTO, © OpenStreetMap',
        },
      },
      layers: [
        {
          id: 'carto-dark-layer',
          type: 'raster',
          source: 'carto-dark',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    };

    const map = new LibMap.Map({
      container: mapContainerRef.current,
      style: darkStyle,
      center: [centerLng, centerLat],
      zoom: 11.8,
      pitch: 35, // 3D Perspective angle
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      // Highway polyline line source
      const polylineCoords = generateTrajectoryPolyline(displayWaypoints);
      map.addSource('trajectory-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: polylineCoords,
          },
        },
      });

      // Outer glow neon polyline (Orange Glow)
      map.addLayer({
        id: 'trajectory-glow',
        type: 'line',
        source: 'trajectory-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FF4F00',
          'line-width': 10,
          'line-opacity': 0.5,
          'line-blur': 4,
        },
      });

      // Core crisp neon route line (Electric Cyan)
      map.addLayer({
        id: 'trajectory-core',
        type: 'line',
        source: 'trajectory-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#00D4FF',
          'line-width': 5,
          'line-opacity': 0.95,
        },
      });
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Synchronize polyline & markers when waypoints update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const LibMap = (window as any).maplibreGl || maplibregl;
    if (!LibMap) return;

    // A) Update GeoJSON polyline source if layer is loaded
    const source = map.getSource('trajectory-line') as maplibregl.GeoJSONSource;
    if (source) {
      const polylineCoords = generateTrajectoryPolyline(displayWaypoints);
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: polylineCoords,
        },
      });
    }

    // B) Start Point A Marker (Emerald Neon Pin)
    if (displayWaypoints.length > 0 && !startMarkerRef.current) {
      const first = displayWaypoints[0];
      const elA = document.createElement('div');
      elA.className = 'custom-start-marker';
      elA.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="width: 30px; height: 30px; border-radius: 9999px; background: #10B981; border: 2.5px solid #FFFFFF; box-shadow: 0 0 16px rgba(16,185,129,0.9); display: flex; align-items: center; justify-content: center; color: #000; font-weight: 900; font-size: 12px;">
            A
          </div>
          <div style="background: rgba(8,11,17,0.9); color: #10B981; border: 1px solid rgba(16,185,129,0.6); font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 8px; margin-top: 3px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.8);">
            INICIO MARCHA
          </div>
        </div>
      `;
      elA.onclick = () => setSelectedWaypoint(first);

      startMarkerRef.current = new LibMap.Marker({ element: elA, anchor: 'center' })
        .setLngLat([first.lng, first.lat])
        .addTo(map);
    }

    // C) Interactive Waypoint Markers along the path (Clickable Waypoints)
    waypointMarkersRef.current.forEach((m) => m.remove());
    waypointMarkersRef.current = [];

    // Render middle interactive waypoints
    displayWaypoints.slice(1, -1).forEach((pt, index) => {
      const elW = document.createElement('div');
      const isSelected = selectedWaypoint?.id === pt.id;
      elW.className = 'custom-waypoint-marker';
      elW.innerHTML = `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: ${isSelected ? 'scale(1.5)' : 'scale(1)'}; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);">
          <div style="width: 16px; height: 16px; border-radius: 9999px; background: ${isSelected ? '#FF4F00' : '#00D4FF'}; border: 2px solid #FFFFFF; box-shadow: 0 0 12px ${isSelected ? 'rgba(255,79,0,0.95)' : 'rgba(0,212,255,0.75)'}; display: flex; align-items: center; justify-content: center; color: #000; font-size: 9px; font-weight: 900;">
            ${index + 1}
          </div>
        </div>
      `;
      elW.onclick = (e) => {
        e.stopPropagation();
        setSelectedWaypoint(pt);
      };

      const marker = new LibMap.Marker({ element: elW, anchor: 'center' })
        .setLngLat([pt.lng, pt.lat])
        .addTo(map);

      waypointMarkersRef.current.push(marker);
    });

    // D) Vehicle Current Position Marker (3D Car Icon with Pulse)
    const latestPt = displayWaypoints[displayWaypoints.length - 1];
    if (latestPt) {
      if (!vehicleMarkerRef.current) {
        const elV = document.createElement('div');
        elV.className = 'custom-vehicle-marker';
        elV.innerHTML = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="position: absolute; inset: -10px; border-radius: 9999px; background: rgba(0,212,255,0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite; pointer-events: none;"></div>
            <div style="width: 34px; height: 34px; border-radius: 9999px; background: linear-gradient(135deg, #00D4FF, #0077FF); border: 2.5px solid #FFFFFF; box-shadow: 0 0 20px rgba(0,212,255,0.95); display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            <div style="background: rgba(8,11,17,0.92); color: #00D4FF; border: 1px solid rgba(0,212,255,0.6); font-size: 9px; font-weight: 900; padding: 2px 8px; border-radius: 8px; margin-top: 4px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.9);">
              ${currentSpeed} KM/H
            </div>
          </div>
        `;
        elV.onclick = () => setSelectedWaypoint(latestPt);

        vehicleMarkerRef.current = new LibMap.Marker({ element: elV, anchor: 'center' })
          .setLngLat([latestPt.lng, latestPt.lat])
          .addTo(map);
      } else {
        vehicleMarkerRef.current.setLngLat([latestPt.lng, latestPt.lat]);
      }

      // Smooth camera pan to follow vehicle if in live driving mode
      if (isRunning && activeViewingTripId === 'live') {
        map.easeTo({
          center: [latestPt.lng, latestPt.lat],
          duration: 700,
        });
      }
    }
  }, [displayWaypoints, isRunning, currentSpeed, selectedWaypoint, activeViewingTripId]);

  // Recenter map on vehicle
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const latestPt = displayWaypoints[displayWaypoints.length - 1];
    if (latestPt) {
      map.flyTo({
        center: [latestPt.lng, latestPt.lat],
        zoom: 13.5,
        pitch: 45,
        essential: true,
      });
    }
  };

  // Toggle Satellite vs Dark Carto Style
  const handleToggleStyle = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const nextStyle = mapStyleType === 'dark' ? 'satellite' : 'dark';
    setMapStyleType(nextStyle);

    if (nextStyle === 'satellite') {
      map.setStyle({
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: 'Esri, Maxar, Earthstar Geographics',
          },
        },
        layers: [
          {
            id: 'esri-satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      });
    } else {
      map.setStyle({
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            ],
            tileSize: 256,
            attribution: '© CARTO, © OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      });
    }
  };

  // Waypoint cycle navigation (Prev / Next)
  const handlePrevWaypoint = () => {
    if (!selectedWaypoint) {
      setSelectedWaypoint(displayWaypoints[0] || null);
      return;
    }
    const idx = displayWaypoints.findIndex((w) => w.id === selectedWaypoint.id);
    if (idx > 0) {
      setSelectedWaypoint(displayWaypoints[idx - 1]);
    }
  };

  const handleNextWaypoint = () => {
    if (!selectedWaypoint) {
      setSelectedWaypoint(displayWaypoints[1] || displayWaypoints[0] || null);
      return;
    }
    const idx = displayWaypoints.findIndex((w) => w.id === selectedWaypoint.id);
    if (idx < displayWaypoints.length - 1) {
      setSelectedWaypoint(displayWaypoints[idx + 1]);
    }
  };

  return (
    <div
      className={`relative rounded-[28px] overflow-hidden border border-slate-800 bg-[#0B0F19] shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'fixed inset-2 z-50 rounded-2xl h-[calc(100vh-16px)]' : 'w-full'
      }`}
    >
      {/* ---------------- MAP TOP BAR CONTROLS ---------------- */}
      <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Mode Badge & GPS Live Status */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="px-3.5 py-1.5 rounded-full bg-[#080B11]/90 backdrop-blur-md border border-slate-700/80 shadow-lg flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRunning ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]' : 'bg-amber-400'
              }`}
            />
            <span className="text-[11px] font-black text-white uppercase tracking-wider">
              {activeViewingTripId === 'live'
                ? isRunning
                  ? 'Trayectoria GPS 100% en Vivo'
                  : 'Marcha en Pausa'
                : 'Historial de Ruta'}
            </span>
          </div>

          {/* Quick Saved Trips Selector */}
          {savedTrips.length > 0 && (
            <select
              value={activeViewingTripId}
              onChange={(e) => {
                setActiveViewingTripId(e.target.value);
                setSelectedWaypoint(null);
              }}
              className="px-2.5 py-1.5 rounded-full bg-[#121620]/95 backdrop-blur-md border border-slate-700 text-xs font-bold text-slate-200 focus:outline-none cursor-pointer shadow-lg"
            >
              <option value="live">📡 Marcha en Vivo</option>
              {savedTrips.slice(0, 6).map((t) => (
                <option key={t.id} value={t.id}>
                  🗺️ {t.routeName || `Viaje ${t.distanceKm} km`} ({t.distanceKm} km)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Quick Map Action Buttons */}
        <div className="flex items-center space-x-1.5 pointer-events-auto">
          {/* Recenter on vehicle */}
          <button
            type="button"
            onClick={handleRecenter}
            title="Centrar en vehículo"
            className="w-9 h-9 rounded-full bg-[#080B11]/90 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#00D4FF]" />
          </button>

          {/* Toggle Layer Style */}
          <button
            type="button"
            onClick={handleToggleStyle}
            title={mapStyleType === 'dark' ? 'Vista Satelital HD' : 'Vista Nocturna'}
            className="w-9 h-9 rounded-full bg-[#080B11]/90 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer"
          >
            <Layers className="w-4 h-4 text-amber-400" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Reducir' : 'Pantalla Completa'}
            className="w-9 h-9 rounded-full bg-[#080B11]/90 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ---------------- MAP CANVAS CONTAINER ---------------- */}
      <div
        ref={mapContainerRef}
        className={`w-full transition-all duration-200 ${
          isFullscreen ? 'h-full' : 'h-[320px] sm:h-[380px]'
        }`}
      />

      {/* ---------------- INTERACTIVE WAYPOINT TELEMETRY CARD (Tocar Cualquier Punto) ---------------- */}
      {selectedWaypoint ? (
        <div className="absolute bottom-3 inset-x-3 z-30 animate-in slide-in-from-bottom duration-200">
          <div className="p-4 rounded-2xl bg-[#0E131F]/95 backdrop-blur-xl border border-[#00D4FF]/40 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-full bg-[#00D4FF] text-slate-950 text-xs font-black flex items-center justify-center shadow-md">
                  {selectedWaypoint.id === 0 ? 'A' : selectedWaypoint.id}
                </span>
                <div>
                  <h4 className="text-xs font-black text-white flex items-center space-x-1.5">
                    <span>Hito de Ruta #{selectedWaypoint.id}</span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      • {selectedWaypoint.timestamp}
                    </span>
                  </h4>
                  <p className="text-[10px] text-cyan-300 font-medium">
                    {selectedWaypoint.address || `Coordenadas: ${selectedWaypoint.lat.toFixed(4)}, ${selectedWaypoint.lng.toFixed(4)}`}
                  </p>
                </div>
              </div>

              {/* Prev / Next Point Navigation Buttons */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handlePrevWaypoint}
                  disabled={selectedWaypoint.id === 0}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition active:scale-90 cursor-pointer"
                  title="Punto anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextWaypoint}
                  disabled={selectedWaypoint.id === displayWaypoints[displayWaypoints.length - 1]?.id}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center transition active:scale-90 cursor-pointer"
                  title="Punto siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWaypoint(null)}
                  className="text-slate-400 hover:text-white px-1.5 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 4 Interactive Telemetry Metrics for this exact Waypoint */}
            <div className="grid grid-cols-4 gap-2">
              {/* Distance */}
              <div className="p-2.5 rounded-xl bg-[#080B11] border border-slate-800 text-center">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                  Distancia
                </span>
                <span className="text-xs sm:text-sm font-black text-white font-sans mt-0.5 block">
                  {selectedWaypoint.distanceKm.toFixed(2)} km
                </span>
              </div>

              {/* Fuel Burned */}
              <div className="p-2.5 rounded-xl bg-[#080B11] border border-slate-800 text-center">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                  Gastó
                </span>
                <span className="text-xs sm:text-sm font-black text-cyan-300 font-sans mt-0.5 block">
                  {selectedWaypoint.burnedLiters.toFixed(2)} L
                </span>
              </div>

              {/* Money Spent */}
              <div className="p-2.5 rounded-xl bg-[#080B11] border border-slate-800 text-center">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                  Costo
                </span>
                <span className="text-xs sm:text-sm font-black text-[#FF4F00] font-sans mt-0.5 block">
                  {selectedWaypoint.cost.toFixed(2)} {currency}
                </span>
              </div>

              {/* Speed */}
              <div className="p-2.5 rounded-xl bg-[#080B11] border border-slate-800 text-center">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                  Velocidad
                </span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 font-sans mt-0.5 block">
                  {selectedWaypoint.speed} km/h
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Bottom floating quick status hint */
        <div className="absolute bottom-2.5 left-3 right-3 z-10 flex items-center justify-between text-[11px] font-bold text-slate-300 pointer-events-none">
          <div className="px-3.5 py-1.5 rounded-full bg-[#080B11]/90 backdrop-blur-md border border-slate-800 shadow-md flex items-center space-x-1.5 pointer-events-auto">
            <Info className="w-3.5 h-3.5 text-[#00D4FF]" />
            <span>Toca cualquier punto del trayecto para ver distancia, litros y gasto</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[#080B11]/90 backdrop-blur-md border border-slate-800 text-cyan-400 pointer-events-auto font-sans font-bold text-[10px]">
            {displayWaypoints.length} puntos marcados
          </div>
        </div>
      )}
    </div>
  );
};
