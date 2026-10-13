import React from 'react';

interface Vehicle3DProps {
  className?: string;
  size?: number;
}

/**
 * 1. SEDÁN PROFESIONAL:
 * Sedán deportivo ejecutivo de alta gama con silueta aerodinámica, faros LED afilados,
 * rines deportivos de aleación, reflejos en cristales panorámicos y sombras de chasis realistas.
 */
export const Sedan3D: React.FC<Vehicle3DProps> = ({ className = '', size = 56 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] ${className}`}
  >
    <defs>
      <radialGradient id="sedanShadowPro" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
        <stop offset="60%" stopColor="#000000" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="sedanPaint" x1="8" y1="18" x2="88" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="25%" stopColor="#38BDF8" />
        <stop offset="65%" stopColor="#0369A1" />
        <stop offset="100%" stopColor="#082F49" />
      </linearGradient>
      <linearGradient id="sedanRoof" x1="28" y1="12" x2="68" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#BAE6FD" />
        <stop offset="45%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#075985" />
      </linearGradient>
      <linearGradient id="sedanGlass" x1="30" y1="14" x2="66" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0F172A" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#1E293B" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
      </linearGradient>
      <linearGradient id="rimAlloy" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F8FAFC" />
        <stop offset="50%" stopColor="#94A3B8" />
        <stop offset="100%" stopColor="#334155" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="48" cy="52" rx="42" ry="7.5" fill="url(#sedanShadowPro)" />

    {/* Rear Wheel (Left) */}
    <g transform="translate(24, 43)">
      <circle cx="0" cy="0" r="8.5" fill="#090D16" />
      <circle cx="0" cy="0" r="6.2" fill="url(#rimAlloy)" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3.2" fill="#0F172A" />
      {/* 5-spoke sport rim */}
      <path d="M0 -5.5 L0 5.5 M-5.2 -1.8 L5.2 1.8 M-3.2 4.5 L3.2 -4.5" stroke="#F1F5F9" strokeWidth="0.9" />
      <circle cx="0" cy="0" r="1.3" fill="#38BDF8" />
      {/* Brake Caliper */}
      <path d="M-4 -2 A5 5 0 0 1 -2 -5" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" />
    </g>

    {/* Front Wheel (Right) */}
    <g transform="translate(72, 43)">
      <circle cx="0" cy="0" r="8.5" fill="#090D16" />
      <circle cx="0" cy="0" r="6.2" fill="url(#rimAlloy)" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3.2" fill="#0F172A" />
      <path d="M0 -5.5 L0 5.5 M-5.2 -1.8 L5.2 1.8 M-3.2 4.5 L3.2 -4.5" stroke="#F1F5F9" strokeWidth="0.9" />
      <circle cx="0" cy="0" r="1.3" fill="#38BDF8" />
      <path d="M-4 -2 A5 5 0 0 1 -2 -5" stroke="#EF4444" strokeWidth="1.6" strokeLinecap="round" />
    </g>

    {/* Chassis Underbody */}
    <path
      d="M10 42 C12 44, 16 45, 17 45 C18 36, 30 36, 31 45 L65 45 C66 36, 78 36, 79 45 L85 43 C87 41, 88 39, 87 36 L10 39 Z"
      fill="#0B132B"
    />

    {/* Main Sedan Car Body (Executive Sculpted Curves) */}
    <path
      d="M8 38 C8 34, 12 30, 18 29 C24 28, 29 27, 33 22 C37 17, 43 14, 52 14 C62 14, 69 17, 74 23 C79 28, 83 29, 86 31 C89 33, 90 36, 88 40 C85 43, 82 44, 78 44 C76 37, 68 37, 66 44 L32 44 C30 37, 22 37, 20 44 C15 44, 10 42, 8 38 Z"
      fill="url(#sedanPaint)"
    />

    {/* Dynamic Shoulder Crease & Specular Highlight */}
    <path
      d="M14 31 C22 30, 36 29, 52 28 C68 27, 80 29, 87 32"
      stroke="#BAE6FD"
      strokeWidth="1.2"
      strokeLinecap="round"
      fill="none"
      opacity="0.85"
    />

    {/* Panoramic Glass Cabin / Greenhouse */}
    <path
      d="M32 23 C35 18, 41 15, 51 15 C60 15, 66 18, 71 23 C73 25, 71 27, 69 27 L33 27 C31 27, 30 25, 32 23 Z"
      fill="url(#sedanGlass)"
      stroke="#0284C7"
      strokeWidth="0.8"
    />

    {/* B-Pillar */}
    <line x1="51" y1="15" x2="51" y2="27" stroke="#0F172A" strokeWidth="2.2" />

    {/* Windshield Reflection Slits */}
    <path d="M54 16 L65 17 L62 26 L53 26 Z" fill="#FFFFFF" fillOpacity="0.22" />
    <path d="M37 18 L46 17 L44 26 L36 26 Z" fill="#FFFFFF" fillOpacity="0.15" />

    {/* Sleek Aerodynamic Fastback Roofline */}
    <path
      d="M33 22 C38 16, 45 13.5, 53 13.5 C62 13.5, 68 16.5, 72 22"
      stroke="url(#sedanRoof)"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />

    {/* Headlights (Sharp Angel LED) */}
    <path d="M84 32 C88 33, 90 35, 87 37 L82 36 Z" fill="#F0F9FF" />
    <circle cx="85" cy="34" r="1.3" fill="#38BDF8" className="drop-shadow-[0_0_4px_#38BDF8]" />

    {/* Tail Lights (LED Red Lightbar) */}
    <path d="M9 34 C8 36, 9 38, 12 38 L12 34 Z" fill="#EF4444" className="drop-shadow-[0_0_5px_#EF4444]" />

    {/* Door Handles & Chrome Accent Line */}
    <rect x="38" y="30" width="4.5" height="1.2" rx="0.6" fill="#F8FAFC" />
    <rect x="58" y="30" width="4.5" height="1.2" rx="0.6" fill="#F8FAFC" />
    <path d="M32 40 L66 40" stroke="#0284C7" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
  </svg>
);

/**
 * 2. SUV PROFESIONAL:
 * Crossover SUV moderno con postura elevada, protecciones inferiores oscuras,
 * barras de techo de aluminio, líneas musculosas y gran presencia en carretera.
 */
export const Suv3D: React.FC<Vehicle3DProps> = ({ className = '', size = 56 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] ${className}`}
  >
    <defs>
      <radialGradient id="suvShadowPro" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
        <stop offset="60%" stopColor="#000000" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="suvPaint" x1="10" y1="12" x2="86" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#EA580C" />
        <stop offset="30%" stopColor="#F97316" />
        <stop offset="70%" stopColor="#C2410C" />
        <stop offset="100%" stopColor="#7C2D12" />
      </linearGradient>
      <linearGradient id="suvGlass" x1="26" y1="10" x2="68" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#090D16" stopOpacity="0.95" />
        <stop offset="50%" stopColor="#1E293B" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#090D16" stopOpacity="0.95" />
      </linearGradient>
      <linearGradient id="suvTrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#334155" />
        <stop offset="100%" stopColor="#0F172A" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="48" cy="53" rx="43" ry="7.5" fill="url(#suvShadowPro)" />

    {/* Large Rugged SUV Wheels */}
    <g transform="translate(24, 43)">
      <circle cx="0" cy="0" r="9.2" fill="#090D16" />
      <circle cx="0" cy="0" r="6.8" fill="#475569" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3.5" fill="#1E293B" />
      <path d="M0 -6 L0 6 M-5.5 -2.5 L5.5 2.5 M-4 4.5 L4 -4.5" stroke="#E2E8F0" strokeWidth="1.1" />
      <circle cx="0" cy="0" r="1.4" fill="#FB923C" />
    </g>

    <g transform="translate(72, 43)">
      <circle cx="0" cy="0" r="9.2" fill="#090D16" />
      <circle cx="0" cy="0" r="6.8" fill="#475569" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3.5" fill="#1E293B" />
      <path d="M0 -6 L0 6 M-5.5 -2.5 L5.5 2.5 M-4 4.5 L4 -4.5" stroke="#E2E8F0" strokeWidth="1.1" />
      <circle cx="0" cy="0" r="1.4" fill="#FB923C" />
    </g>

    {/* Rugged Bottom Cladding & Wheel Arches */}
    <path
      d="M8 38 C9 41, 14 43, 17 43 C18 34, 30 34, 31 43 L65 43 C66 34, 78 34, 79 43 L85 41 C88 39, 89 36, 88 33 L8 36 Z"
      fill="url(#suvTrim)"
    />

    {/* Main Muscular SUV Body */}
    <path
      d="M7 36 C7 31, 11 26, 17 25 C21 24, 25 21, 29 16 C33 11, 40 9, 52 9 C64 9, 70 12, 75 19 C80 25, 84 26, 87 29 C90 32, 90 36, 87 39 C84 41, 80 42, 77 42 C75 35, 68 35, 66 42 L32 42 C30 35, 23 35, 21 42 C15 42, 10 40, 7 36 Z"
      fill="url(#suvPaint)"
    />

    {/* Prominent High Beltline Specular */}
    <path
      d="M13 27 C24 26, 44 24, 60 23 C74 23, 82 25, 88 29"
      stroke="#FED7AA"
      strokeWidth="1.3"
      strokeLinecap="round"
      fill="none"
      opacity="0.9"
    />

    {/* Elevated Tinted Cabin */}
    <path
      d="M28 17 C31 12, 38 10, 52 10 C62 10, 68 13, 73 19 C74 21, 72 23, 70 23 L29 23 C27 23, 26 20, 28 17 Z"
      fill="url(#suvGlass)"
      stroke="#EA580C"
      strokeWidth="0.8"
    />

    {/* Double Pillars */}
    <line x1="46" y1="10" x2="46" y2="23" stroke="#090D16" strokeWidth="2.5" />
    <line x1="62" y1="11" x2="62" y2="23" stroke="#090D16" strokeWidth="2.5" />

    {/* Metallic Roof Rails */}
    <path d="M28 7.5 L67 7.5" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" />
    <line x1="32" y1="7.5" x2="33" y2="10" stroke="#94A3B8" strokeWidth="1.4" />
    <line x1="63" y1="7.5" x2="62" y2="10" stroke="#94A3B8" strokeWidth="1.4" />

    {/* Aggressive Headlights */}
    <path d="M85 30 C89 31, 91 33, 88 35 L83 34 Z" fill="#FFF7ED" />
    <circle cx="86" cy="32" r="1.4" fill="#FB923C" className="drop-shadow-[0_0_5px_#FB923C]" />

    {/* Rear Tail Lamp */}
    <path d="M8 30 C7 32, 8 34, 11 34 L11 30 Z" fill="#EF4444" className="drop-shadow-[0_0_6px_#EF4444]" />

    {/* Handles */}
    <rect x="37" y="26" width="4.5" height="1.3" rx="0.6" fill="#F8FAFC" />
    <rect x="54" y="26" width="4.5" height="1.3" rx="0.6" fill="#F8FAFC" />
  </svg>
);

/**
 * 3. COMPACTO / HATCHBACK PROFESIONAL:
 * Hot hatch dinámico y deportivo, postura ágil, spoiler trasero aerodinámico,
 * difusor deportivo y acento esmeralda de alta eficiencia.
 */
export const Compacto3D: React.FC<Vehicle3DProps> = ({ className = '', size = 56 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] ${className}`}
  >
    <defs>
      <radialGradient id="compactShadowPro" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.8" />
        <stop offset="60%" stopColor="#000000" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="compactPaint" x1="12" y1="16" x2="86" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="35%" stopColor="#34D399" />
        <stop offset="75%" stopColor="#059669" />
        <stop offset="100%" stopColor="#064E3B" />
      </linearGradient>
      <linearGradient id="compactGlass" x1="28" y1="14" x2="64" y2="27" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#064E3B" stopOpacity="0.95" />
        <stop offset="60%" stopColor="#0F172A" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#022C22" stopOpacity="0.95" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="48" cy="51" rx="39" ry="7" fill="url(#compactShadowPro)" />

    {/* Wheels (Sporty Low-Profile) */}
    <g transform="translate(25, 43)">
      <circle cx="0" cy="0" r="8.2" fill="#090D16" />
      <circle cx="0" cy="0" r="6" fill="#334155" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3" fill="#0F172A" />
      <path d="M0 -5 L0 5 M-4.5 -2 L4.5 2 M-3 4 L3 -4" stroke="#A7F3D0" strokeWidth="0.9" />
      <circle cx="0" cy="0" r="1.2" fill="#10B981" />
    </g>

    <g transform="translate(71, 43)">
      <circle cx="0" cy="0" r="8.2" fill="#090D16" />
      <circle cx="0" cy="0" r="6" fill="#334155" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3" fill="#0F172A" />
      <path d="M0 -5 L0 5 M-4.5 -2 L4.5 2 M-3 4 L3 -4" stroke="#A7F3D0" strokeWidth="0.9" />
      <circle cx="0" cy="0" r="1.2" fill="#10B981" />
    </g>

    {/* Hot Hatch Body */}
    <path
      d="M12 37 C12 32, 17 26, 21 24 C26 23, 29 18, 35 15 C41 12, 50 12, 57 12 C64 12, 70 17, 74 23 C78 28, 81 29, 85 32 C88 35, 87 38, 85 41 C82 43, 78 43, 76 43 C74 36, 67 36, 65 43 L33 43 C31 36, 24 36, 22 43 C18 43, 14 41, 12 37 Z"
      fill="url(#compactPaint)"
    />

    {/* Aerodynamic Roof Spoiler */}
    <path
      d="M20 16 C22 13, 27 12, 33 12 L22 14 Z"
      fill="#064E3B"
      stroke="#34D399"
      strokeWidth="0.8"
    />

    {/* Cabin Windows */}
    <path
      d="M24 23 C27 17, 33 14, 42 13 C50 13, 56 16, 63 22 C64 24, 63 26, 60 26 L26 26 C24 26, 23 25, 24 23 Z"
      fill="url(#compactGlass)"
      stroke="#10B981"
      strokeWidth="0.8"
    />

    {/* B-Pillar */}
    <line x1="45" y1="13" x2="45" y2="26" stroke="#064E3B" strokeWidth="2.2" />

    {/* Body Crease */}
    <path
      d="M18 30 C28 29, 48 27, 70 28 C78 29, 83 31, 85 33"
      stroke="#A7F3D0"
      strokeWidth="1.1"
      strokeLinecap="round"
      fill="none"
      opacity="0.8"
    />

    {/* Sporty Headlamp */}
    <path d="M82 32 C85 33, 87 35, 84 37 L80 36 Z" fill="#F0FDF4" />
    <circle cx="83" cy="34" r="1.3" fill="#34D399" className="drop-shadow-[0_0_4px_#34D399]" />

    {/* Tail Light */}
    <path d="M13 32 C12 34, 13 36, 16 36 L16 32 Z" fill="#EF4444" className="drop-shadow-[0_0_5px_#EF4444]" />

    {/* Handle */}
    <rect x="36" y="29" width="4.5" height="1.2" rx="0.6" fill="#F8FAFC" />
  </svg>
);

/**
 * 4. FURGÓN / VAN COMERCIAL PROFESIONAL:
 * Utilitario de transporte moderno de techo alto, puerta lateral corrediza,
 * chasis resistente y acabado profesional índigo.
 */
export const Van3D: React.FC<Vehicle3DProps> = ({ className = '', size = 56 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] ${className}`}
  >
    <defs>
      <radialGradient id="vanShadowPro" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
        <stop offset="60%" stopColor="#000000" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="vanPaint" x1="8" y1="10" x2="88" y2="46" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="30%" stopColor="#818CF8" />
        <stop offset="70%" stopColor="#4F46E5" />
        <stop offset="100%" stopColor="#312E81" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="48" cy="53" rx="43" ry="7.5" fill="url(#vanShadowPro)" />

    {/* Heavy-Duty Wheels */}
    <g transform="translate(24, 43)">
      <circle cx="0" cy="0" r="9" fill="#090D16" />
      <circle cx="0" cy="0" r="6.5" fill="#334155" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3.2" fill="#1E293B" />
      <circle cx="0" cy="0" r="1.3" fill="#818CF8" />
    </g>

    <g transform="translate(72, 43)">
      <circle cx="0" cy="0" r="9" fill="#090D16" />
      <circle cx="0" cy="0" r="6.5" fill="#334155" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3.2" fill="#1E293B" />
      <circle cx="0" cy="0" r="1.3" fill="#818CF8" />
    </g>

    {/* High-Roof Commercial Van Body */}
    <path
      d="M8 38 C8 24, 10 11, 15 11 L62 11 C68 11, 74 15, 78 22 C82 28, 86 31, 88 34 C89 37, 88 40, 85 42 C82 43, 78 43, 76 43 C74 35, 67 35, 65 43 L33 43 C31 35, 24 35, 22 43 C16 43, 10 41, 8 38 Z"
      fill="url(#vanPaint)"
    />

    {/* Front Cabin Windshield & Side Glass */}
    <path
      d="M58 20 C62 13, 67 12, 73 14 C77 18, 81 25, 83 29 C83 31, 81 32, 79 32 L59 32 C57 32, 57 26, 58 20 Z"
      fill="#0F172A"
      stroke="#818CF8"
      strokeWidth="0.8"
    />

    {/* Sliding Door Seam */}
    <line x1="42" y1="12" x2="42" y2="42" stroke="#312E81" strokeWidth="1.2" strokeDasharray="2 1" />
    <rect x="37" y="27" width="4" height="1.4" rx="0.7" fill="#F8FAFC" />

    {/* High Aerodynamic Ribs on Roof */}
    <line x1="18" y1="10" x2="58" y2="10" stroke="#C7D2FE" strokeWidth="1.2" opacity="0.6" />

    {/* Headlamp */}
    <path d="M85 33 C88 34, 90 36, 87 38 L83 37 Z" fill="#EEF2FF" />
    <circle cx="86" cy="35" r="1.3" fill="#818CF8" className="drop-shadow-[0_0_4px_#818CF8]" />

    {/* Tail Vertical Lightbar */}
    <rect x="8" y="26" width="3" height="10" rx="1.5" fill="#EF4444" className="drop-shadow-[0_0_5px_#EF4444]" />
  </svg>
);

/**
 * 5. PICKUP 4X4 PROFESIONAL:
 * Camioneta doble cabina de trabajo pesado y aventura, platón de carga trasero,
 * barra antivuelco cromada, suspensión alta y presencia robusta.
 */
export const Pickup3D: React.FC<Vehicle3DProps> = ({ className = '', size = 56 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)] ${className}`}
  >
    <defs>
      <radialGradient id="pickupShadowPro" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.85" />
        <stop offset="60%" stopColor="#000000" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="pickupPaint" x1="10" y1="12" x2="86" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#F59E0B" />
        <stop offset="35%" stopColor="#FBBF24" />
        <stop offset="70%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
    </defs>

    {/* Ground Shadow */}
    <ellipse cx="48" cy="53" rx="43" ry="7.5" fill="url(#pickupShadowPro)" />

    {/* Huge Knobby 4x4 Off-Road Tires */}
    <g transform="translate(24, 43)">
      <circle cx="0" cy="0" r="9.5" fill="#090D16" />
      <circle cx="0" cy="0" r="7" fill="#1E293B" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3.5" fill="#0F172A" />
      <path d="M0 -6 L0 6 M-5.5 -2.5 L5.5 2.5 M-4 4.5 L4 -4.5" stroke="#FDE68A" strokeWidth="1.1" />
      <circle cx="0" cy="0" r="1.4" fill="#F59E0B" />
    </g>

    <g transform="translate(72, 43)">
      <circle cx="0" cy="0" r="9.5" fill="#090D16" />
      <circle cx="0" cy="0" r="7" fill="#1E293B" stroke="#0F172A" strokeWidth="0.8" />
      <circle cx="0" cy="0" r="3.5" fill="#0F172A" />
      <path d="M0 -6 L0 6 M-5.5 -2.5 L5.5 2.5 M-4 4.5 L4 -4.5" stroke="#FDE68A" strokeWidth="1.1" />
      <circle cx="0" cy="0" r="1.4" fill="#F59E0B" />
    </g>

    {/* Open Rear Cargo Bed (Platón) */}
    <path
      d="M7 36 C7 30, 9 24, 12 24 L38 24 L38 42 C30 42, 23 35, 21 42 C16 42, 10 40, 7 36 Z"
      fill="#451A03"
      stroke="#78350F"
      strokeWidth="1"
    />
    {/* Inner Cargo Liner */}
    <path d="M10 26 L36 26 L36 38 L10 38 Z" fill="#1C1917" />

    {/* Chrome Roll Bar in Bed */}
    <path d="M37 24 L38 13 L40 13 L40 24" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" />

    {/* Cabin (Double Cab) & Front Hood */}
    <path
      d="M38 38 L38 22 C39 16, 44 11, 54 11 C64 11, 70 14, 75 21 C80 27, 85 28, 88 31 C91 34, 90 38, 87 40 C84 42, 80 43, 77 43 C75 35, 68 35, 66 43 L38 43 Z"
      fill="url(#pickupPaint)"
    />

    {/* Cabin Windows */}
    <path
      d="M40 22 C43 14, 49 13, 56 13 C63 13, 68 16, 73 22 C74 24, 72 26, 69 26 L42 26 C40 26, 39 24, 40 22 Z"
      fill="#0F172A"
      stroke="#FBBF24"
      strokeWidth="0.8"
    />

    {/* Robust Bull Bar Grille & Headlamp */}
    <path d="M86 31 C89 32, 91 34, 88 36 L83 35 Z" fill="#FFFBEB" />
    <circle cx="87" cy="33" r="1.4" fill="#F59E0B" className="drop-shadow-[0_0_5px_#F59E0B]" />

    {/* Tail Lamp */}
    <path d="M7 26 C6 28, 7 30, 9 30 L9 26 Z" fill="#EF4444" className="drop-shadow-[0_0_5px_#EF4444]" />
  </svg>
);

/**
 * 6. PERSONALIZADO / TUNING DEPORTIVO PROFESIONAL:
 * Auto deportivo estilizado de alta precisión con perfil aerodinámico de carreras,
 * alerón GT, neón cibernético y ajuste micrométrico.
 */
export const Custom3D: React.FC<Vehicle3DProps> = ({ className = '', size = 56 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 96 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-[0_8px_16px_rgba(0,212,255,0.4)] ${className}`}
  >
    <defs>
      <radialGradient id="customShadowPro" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#00D4FF" stopOpacity="0.5" />
        <stop offset="60%" stopColor="#000000" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="customPaint" x1="10" y1="16" x2="88" y2="44" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00D4FF" />
        <stop offset="40%" stopColor="#0284C7" />
        <stop offset="80%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#4338CA" />
      </linearGradient>
    </defs>

    {/* Ground Neon Underglow */}
    <ellipse cx="48" cy="51" rx="42" ry="7.5" fill="url(#customShadowPro)" />

    {/* Racing Wheels */}
    <g transform="translate(24, 43)">
      <circle cx="0" cy="0" r="8.2" fill="#090D16" />
      <circle cx="0" cy="0" r="6" fill="#0284C7" stroke="#00D4FF" strokeWidth="1" />
      <circle cx="0" cy="0" r="3" fill="#090D16" />
      <circle cx="0" cy="0" r="1.3" fill="#00D4FF" />
    </g>

    <g transform="translate(72, 43)">
      <circle cx="0" cy="0" r="8.2" fill="#090D16" />
      <circle cx="0" cy="0" r="6" fill="#0284C7" stroke="#00D4FF" strokeWidth="1" />
      <circle cx="0" cy="0" r="3" fill="#090D16" />
      <circle cx="0" cy="0" r="1.3" fill="#00D4FF" />
    </g>

    {/* Supercar Low-Slung Body */}
    <path
      d="M8 38 C9 33, 14 27, 20 25 C26 24, 32 18, 42 15 C52 13, 62 14, 68 18 C74 23, 80 27, 85 29 C89 31, 91 34, 88 38 C85 41, 80 43, 77 43 C75 36, 68 36, 66 43 L32 43 C30 36, 23 36, 21 43 C15 43, 10 41, 8 38 Z"
      fill="url(#customPaint)"
    />

    {/* Carbon Fiber Racing GT Wing */}
    <path d="M12 25 L14 16 L22 16 L20 25" stroke="#00D4FF" strokeWidth="1.6" fill="none" />
    <path d="M10 16 L25 15" stroke="#F8FAFC" strokeWidth="2.5" strokeLinecap="round" />

    {/* Jet Fighter Cockpit Canopy */}
    <path
      d="M32 23 C37 17, 44 14, 54 14 C63 14, 68 18, 72 23 C73 25, 71 26, 68 26 L34 26 C31 26, 30 25, 32 23 Z"
      fill="#0F172A"
      stroke="#00D4FF"
      strokeWidth="1"
    />

    {/* Futuristic Cyber Slits & Tuning Stripes */}
    <path d="M35 29 L75 29" stroke="#00D4FF" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
    <path d="M42 33 L68 33" stroke="#818CF8" strokeWidth="1" strokeLinecap="round" opacity="0.7" />

    {/* Cyber Laser Headlight */}
    <path d="M84 31 L89 33 L85 35 Z" fill="#E0F2FE" />
    <circle cx="86" cy="33" r="1.5" fill="#00D4FF" className="drop-shadow-[0_0_6px_#00D4FF]" />

    {/* Neon Tail Exhaust Fire */}
    <circle cx="8" cy="35" r="2" fill="#00D4FF" className="drop-shadow-[0_0_8px_#00D4FF]" />
  </svg>
);

export const VehicleIcon3D: React.FC<{ type: string; size?: number; className?: string }> = ({
  type,
  size = 56,
  className = '',
}) => {
  switch (type.toLowerCase()) {
    case 'sedan':
      return <Sedan3D size={size} className={className} />;
    case 'suv':
      return <Suv3D size={size} className={className} />;
    case 'compact':
    case 'compacto':
      return <Compacto3D size={size} className={className} />;
    case 'van':
    case 'furgon':
      return <Van3D size={size} className={className} />;
    case 'pickup':
      return <Pickup3D size={size} className={className} />;
    case 'custom':
    case 'personalizado':
    default:
      return <Custom3D size={size} className={className} />;
  }
};
