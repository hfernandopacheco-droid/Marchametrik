import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Navigation, MapPin, Maximize2, Minimize2, RotateCcw, X, Layers, Sparkles } from 'lucide-react';
import { SavedTrip } from '../types';

interface MiniRouteMapViewProps {
  trip: SavedTrip;
  currency?: string;
  onClose?: () => void;
}

// Default center coordinates per country
const COUNTRY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  PL: { lat: 52.2297, lng: 21.0122, name: 'Varsovia' }, // Warsaw
  CO: { lat: 4.7110, lng: -74.0721, name: 'Bogotá' },
  US: { lat: 39.8283, lng: -98.5795, name: 'Estados Unidos' },
};

/**
 * Calculates a realistic destination coordinate based on distance and route bearing
 */
function computeRouteEndpoints(trip: SavedTrip, defaultCountry: string = 'PL') {
  if (trip.startCoords && trip.destCoords) {
    return {
      start: trip.startCoords,
      dest: trip.destCoords,
    };
  }

  const base = COUNTRY_COORDS[trip.country || defaultCountry] || COUNTRY_COORDS.PL;
  const dist = trip.distanceKm || 150;

  // Derive an angle and destination city offset based on distance
  // e.g. from Warsaw heading southwest toward Krakow / Wroclaw
  const angleRad = 4.1; // ~235 degrees (Southwest)
  const kmPerDegreeLat = 111.0;
  const kmPerDegreeLng = 111.0 * Math.cos((base.lat * Math.PI) / 180);

  const deltaLat = (dist * Math.cos(angleRad)) / kmPerDegreeLat;
  const deltaLng = (dist * Math.sin(angleRad)) / kmPerDegreeLng;

  const destLat = base.lat + deltaLat;
  const destLng = base.lng + deltaLng;

  // Determine nice labels
  let startLabel = base.name;
  let destLabel = 'Destino';

  if (trip.routeName && trip.routeName.includes(' a ')) {
    const parts = trip.routeName.split(' a ');
    startLabel = parts[0].trim();
    destLabel = parts[1].split('(')[0].trim();
  } else if (dist > 280) {
    destLabel = base.name === 'Varsovia' ? 'Cracovia' : 'Destino Regional';
  } else if (dist > 120) {
    destLabel = base.name === 'Varsovia' ? 'Łódź / Radom' : 'Destino Interurbano';
  }

  return {
    start: { lat: base.lat, lng: base.lng, label: startLabel },
    dest: { lat: destLat, lng: destLng, label: destLabel },
  };
}

/**
 * Generates an organic highway path with realistic curves between start and destination
 */
function generateCurvedPolyline(
  start: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): [number, number][] {
  const points: [number, number][] = [];
  const segments = 18;

  // Midpoint lateral offset to simulate highway routing
  const midLat = (start.lat + dest.lat) / 2;
  const midLng = (start.lng + dest.lng) / 2;
  const perpLat = -(dest.lng - start.lng) * 0.12;
  const perpLng = (dest.lat - start.lat) * 0.12;

  const controlLat = midLat + perpLat;
  const controlLng = midLng + perpLng;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Quadratic Bezier interpolation
    const lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * controlLat + t * t * dest.lat;
    const lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * controlLng + t * t * dest.lng;
    points.push([lng, lat]);
  }

  return points;
}

export const MiniRouteMapView: React.FC<MiniRouteMapViewProps> = ({
  trip,
  currency = 'PLN',
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const { start, dest } = computeRouteEndpoints(trip);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const LibMap = (window as any).maplibreGl || maplibregl;
    if (!LibMap) return;

    // Center between start and dest
    const centerLng = (start.lng + dest.lng) / 2;
    const centerLat = (start.lat + dest.lat) / 2;

    const map = new LibMap.Map({
      container: mapContainerRef.current,
      style: {
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
      },
      center: [centerLng, centerLat],
      zoom: 6.5,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      // 1. Add Highway Polyline Source & Layer
      const coordinates = generateCurvedPolyline(start, dest);

      map.addSource('route-line', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates,
          },
        },
      });

      // Outer Glow Polyline (Orange/Cyan Neon)
      map.addLayer({
        id: 'route-glow',
        type: 'line',
        source: 'route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FF6B00',
          'line-width': 8,
          'line-opacity': 0.35,
          'line-blur': 4,
        },
      });

      // Core Solid Route Line
      map.addLayer({
        id: 'route-core',
        type: 'line',
        source: 'route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#00D4FF',
          'line-width': 4.5,
          'line-opacity': 0.95,
        },
      });

      // 2. Custom DOM Marker for Point A (Start - Emerald)
      const elA = document.createElement('div');
      elA.className = 'w-7 h-7 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_14px_#10B981] flex items-center justify-center text-slate-950 font-black text-xs cursor-pointer animate-pulse';
      elA.innerText = 'A';
      new LibMap.Marker({ element: elA }).setLngLat([start.lng, start.lat]).addTo(map);

      // 3. Custom DOM Marker for Point B (Dest - Neon Orange)
      const elB = document.createElement('div');
      elB.className = 'w-7 h-7 rounded-full bg-[#FF4F00] border-2 border-white shadow-[0_0_14px_#FF4F00] flex items-center justify-center text-white font-black text-xs cursor-pointer';
      elB.innerText = 'B';
      new LibMap.Marker({ element: elB }).setLngLat([dest.lng, dest.lat]).addTo(map);

      // 4. Auto-Fit Bounds with padding
      const minLng = Math.min(start.lng, dest.lng);
      const maxLng = Math.max(start.lng, dest.lng);
      const minLat = Math.min(start.lat, dest.lat);
      const maxLat = Math.max(start.lat, dest.lat);

      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        {
          padding: { top: 40, bottom: 40, left: 40, right: 40 },
          maxZoom: 11,
          duration: 900,
        }
      );
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [trip.id, start.lat, start.lng, dest.lat, dest.lng]);

  const handleRecenter = () => {
    if (!mapInstanceRef.current) return;
    const minLng = Math.min(start.lng, dest.lng);
    const maxLng = Math.max(start.lng, dest.lng);
    const minLat = Math.min(start.lat, dest.lat);
    const maxLat = Math.max(start.lat, dest.lat);

    mapInstanceRef.current.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        padding: 40,
        maxZoom: 11,
        duration: 700,
      }
    );
  };

  return (
    <div className={`rounded-3xl border border-[#00D4FF]/40 bg-[#0B0F19] overflow-hidden shadow-2xl relative transition-all duration-300 ${isExpanded ? 'h-96' : 'h-64'}`}>
      {/* Top Floating Glass HUD */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="px-3 py-1.5 rounded-2xl bg-[#080B11]/85 backdrop-blur-md border border-slate-700/80 shadow-lg pointer-events-auto flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs font-black text-white flex items-center space-x-1.5">
            <span>{start.label || 'Origen'}</span>
            <span className="text-[#00D4FF]">➔</span>
            <span>{dest.label || 'Destino'}</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleRecenter}
            className="w-8 h-8 rounded-full bg-[#080B11]/85 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-md"
            title="Re-centrar trayecto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-full bg-[#080B11]/85 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-md"
            title={isExpanded ? 'Reducir mapa' : 'Expandir mapa'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#080B11]/85 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:scale-95 shadow-md"
              title="Cerrar vista mapa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* MapLibre DOM Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Bottom Floating Telemetry Overlay */}
      <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none">
        <div className="p-2.5 rounded-2xl bg-[#080B11]/90 backdrop-blur-md border border-slate-800 shadow-xl flex items-center justify-between text-xs pointer-events-auto">
          <div className="flex items-center space-x-3">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 block leading-none">Distancia</span>
              <span className="text-sm font-black text-white">{trip.distanceKm} km</span>
            </div>
            <div className="w-[1px] h-6 bg-slate-800" />
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 block leading-none">Combustible</span>
              <span className="text-sm font-black text-cyan-400">{trip.totalLiters.toFixed(1)} L</span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-black text-slate-400 block leading-none">Costo Total</span>
            <span className="text-sm font-black text-[#FF4F00]">{trip.totalCostPLN.toFixed(2)} {currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
