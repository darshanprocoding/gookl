import { DispatchUnitType } from '../components/DispatchUnitIcons';

function createSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString.trim())}`;
}

/**
 * Tactical C2 HUD Pin Markers matching tactical command-and-control military GIS displays:
 * - Rounded squircle badge with downward arrow pointer
 * - Glowing neon borders and dark tactical glass backdrops
 * - Unit callsign header pill (AMB-07, FE-02, UAV-02, RT-01, PV-08, HELI-01, BOAT-02)
 * - High-contrast neon vector glyph inside
 */
export const MAP_UNIT_ICONS: Record<DispatchUnitType, string> = {
  // 1. ALS Ambulance (AMB-07) - Neon Emerald / Cyan Glow
  ambulance: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" width="100" height="115">
      <defs>
        <filter id="glowAmb" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#10b981" flood-opacity="0.9"/>
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.95"/>
        </filter>
        <linearGradient id="gradAmb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#052e24"/>
          <stop offset="100%" stop-color="#061c16"/>
        </linearGradient>
      </defs>

      <!-- Callsign Pill Top Header -->
      <rect x="22" y="3" width="56" height="18" rx="9" fill="#061612" stroke="#10b981" stroke-width="1.8"/>
      <text x="50" y="16" fill="#6ee7b7" font-size="10.5" font-weight="900" font-family="ui-monospace, monospace, sans-serif" text-anchor="middle" letter-spacing="1">AMB-07</text>

      <!-- Main Squircle Badge with Downward Pin Pointer -->
      <path d="M 20 22 L 80 22 C 89 22 96 29 96 38 L 96 74 C 96 83 89 90 80 90 L 58 90 L 50 106 L 42 90 L 20 90 C 11 90 4 83 4 74 L 4 38 C 4 29 11 22 20 22 Z"
            fill="url(#gradAmb)"
            stroke="#10b981"
            stroke-width="3"
            filter="url(#glowAmb)"/>

      <!-- Ambulance Neon Vector Glyph -->
      <g stroke="#34d399" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Van Body -->
        <path d="M 22 72 L 22 46 C 22 43 24 41 27 41 L 62 41 L 76 51 L 82 53 C 84 55 84 58 84 66 L 84 72 Z" fill="#0b2820" fill-opacity="0.7"/>
        <!-- Window -->
        <path d="M 62 45 L 73 53 L 62 53 Z" fill="#10b981" fill-opacity="0.3"/>
        <!-- Medical Cross -->
        <path d="M 40 56 L 48 56 M 44 52 L 44 60" stroke="#a7f3d0" stroke-width="3.2"/>
        <!-- Roof Beacon -->
        <rect x="42" y="36" width="8" height="5" rx="2" fill="#ef4444" stroke="#f87171" stroke-width="1"/>
        <!-- Wheels -->
        <circle cx="34" cy="73" r="5.5" fill="#04120e" stroke="#6ee7b7" stroke-width="2.4"/>
        <circle cx="70" cy="73" r="5.5" fill="#04120e" stroke="#6ee7b7" stroke-width="2.4"/>
      </g>
    </svg>
  `),

  // 2. Fire Engine (FE-02) - Neon Red & Yellow Glow
  fireEngine: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" width="100" height="115">
      <defs>
        <filter id="glowFire" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#ef4444" flood-opacity="0.95"/>
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.95"/>
        </filter>
        <linearGradient id="gradFire" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3b0a0a"/>
          <stop offset="100%" stop-color="#1c0505"/>
        </linearGradient>
      </defs>

      <!-- Callsign Pill Top Header -->
      <rect x="24" y="3" width="52" height="18" rx="9" fill="#200505" stroke="#ef4444" stroke-width="1.8"/>
      <text x="50" y="16" fill="#fca5a5" font-size="10.5" font-weight="900" font-family="ui-monospace, monospace, sans-serif" text-anchor="middle" letter-spacing="1">FE-02</text>

      <!-- Main Squircle Badge with Downward Pin Pointer -->
      <path d="M 20 22 L 80 22 C 89 22 96 29 96 38 L 96 74 C 96 83 89 90 80 90 L 58 90 L 50 106 L 42 90 L 20 90 C 11 90 4 83 4 74 L 4 38 C 4 29 11 22 20 22 Z"
            fill="url(#gradFire)"
            stroke="#ef4444"
            stroke-width="3"
            filter="url(#glowFire)"/>

      <!-- Fire Truck High-Detail Vector (matching reference) -->
      <g>
        <!-- Ladder on Roof -->
        <rect x="30" y="36" width="38" height="5" rx="1" fill="#facc15" stroke="#78350f" stroke-width="1"/>
        <line x1="38" y1="36" x2="38" y2="41" stroke="#78350f" stroke-width="1.2"/>
        <line x1="46" y1="36" x2="46" y2="41" stroke="#78350f" stroke-width="1.2"/>
        <line x1="54" y1="36" x2="54" y2="41" stroke="#78350f" stroke-width="1.2"/>
        <line x1="62" y1="36" x2="62" y2="41" stroke="#78350f" stroke-width="1.2"/>
        <!-- Water Cannon Turret -->
        <line x1="64" y1="36" x2="72" y2="33" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Truck Body -->
        <path d="M 20 72 L 20 44 L 62 44 L 72 49 L 82 54 L 82 72 Z" fill="#dc2626" stroke="#fca5a5" stroke-width="1.5"/>
        <!-- Windshield -->
        <path d="M 64 47 L 74 51 L 74 57 L 64 57 Z" fill="#38bdf8"/>
        <!-- Side Hazard Stripe -->
        <rect x="22" y="58" width="40" height="4.5" fill="#facc15"/>
        <line x1="26" y1="58" x2="29" y2="62.5" stroke="#1c1917" stroke-width="2"/>
        <line x1="34" y1="58" x2="37" y2="62.5" stroke="#1c1917" stroke-width="2"/>
        <line x1="42" y1="58" x2="45" y2="62.5" stroke="#1c1917" stroke-width="2"/>
        <line x1="50" y1="58" x2="53" y2="62.5" stroke="#1c1917" stroke-width="2"/>
        <line x1="58" y1="58" x2="61" y2="62.5" stroke="#1c1917" stroke-width="2"/>

        <!-- Triple Chrome Wheels -->
        <circle cx="28" cy="73" r="5.5" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
        <circle cx="42" cy="73" r="5.5" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
        <circle cx="72" cy="73" r="5.5" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
      </g>
    </svg>
  `),

  // 3. Drone / UAV (UAV-02) - Neon Purple / Violet Glow
  reconDrone: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" width="100" height="115">
      <defs>
        <filter id="glowDrone" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#a855f7" flood-opacity="0.95"/>
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.95"/>
        </filter>
        <linearGradient id="gradDrone" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#240a3e"/>
          <stop offset="100%" stop-color="#120520"/>
        </linearGradient>
      </defs>

      <!-- Callsign Pill Top Header -->
      <rect x="22" y="3" width="56" height="18" rx="9" fill="#140624" stroke="#a855f7" stroke-width="1.8"/>
      <text x="50" y="16" fill="#e9d5ff" font-size="10.5" font-weight="900" font-family="ui-monospace, monospace, sans-serif" text-anchor="middle" letter-spacing="1">UAV-02</text>

      <!-- Main Squircle Badge with Downward Pin Pointer -->
      <path d="M 20 22 L 80 22 C 89 22 96 29 96 38 L 96 74 C 96 83 89 90 80 90 L 58 90 L 50 106 L 42 90 L 20 90 C 11 90 4 83 4 74 L 4 38 C 4 29 11 22 20 22 Z"
            fill="url(#gradDrone)"
            stroke="#a855f7"
            stroke-width="3"
            filter="url(#glowDrone)"/>

      <!-- Quadcopter Drone Vector (matching reference image) -->
      <g stroke="#c084fc" stroke-width="3" stroke-linecap="round" fill="none">
        <!-- X-Cross Arms -->
        <line x1="30" y1="38" x2="70" y2="74"/>
        <line x1="70" y1="38" x2="30" y2="74"/>
        
        <!-- 4 Rotor Circles -->
        <circle cx="30" cy="38" r="7" fill="#3b0764" stroke="#e9d5ff" stroke-width="2.5"/>
        <circle cx="70" cy="38" r="7" fill="#3b0764" stroke="#e9d5ff" stroke-width="2.5"/>
        <circle cx="30" cy="74" r="7" fill="#3b0764" stroke="#e9d5ff" stroke-width="2.5"/>
        <circle cx="70" cy="74" r="7" fill="#3b0764" stroke="#e9d5ff" stroke-width="2.5"/>

        <!-- Center Avionics Core -->
        <circle cx="50" cy="56" r="10" fill="#1e1035" stroke="#f3e8ff" stroke-width="3"/>
        <circle cx="50" cy="56" r="4.5" fill="#38bdf8" stroke="none"/>
      </g>
    </svg>
  `),

  // 4. Relief Logistics Truck / Cargo (RT-01) - Neon Orange / Amber Glow
  cargoTruck: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" width="100" height="115">
      <defs>
        <filter id="glowCargo" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#f97316" flood-opacity="0.95"/>
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.95"/>
        </filter>
        <linearGradient id="gradCargo" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#381504"/>
          <stop offset="100%" stop-color="#1c0a02"/>
        </linearGradient>
      </defs>

      <!-- Callsign Pill Top Header -->
      <rect x="25" y="3" width="50" height="18" rx="9" fill="#1f0a02" stroke="#f97316" stroke-width="1.8"/>
      <text x="50" y="16" fill="#fed7aa" font-size="10.5" font-weight="900" font-family="ui-monospace, monospace, sans-serif" text-anchor="middle" letter-spacing="1">RT-01</text>

      <!-- Main Squircle Badge with Downward Pin Pointer -->
      <path d="M 20 22 L 80 22 C 89 22 96 29 96 38 L 96 74 C 96 83 89 90 80 90 L 58 90 L 50 106 L 42 90 L 20 90 C 11 90 4 83 4 74 L 4 38 C 4 29 11 22 20 22 Z"
            fill="url(#gradCargo)"
            stroke="#f97316"
            stroke-width="3"
            filter="url(#glowCargo)"/>

      <!-- Supply Crate / Relief Cargo Carrier Glyph (matching reference) -->
      <g stroke="#fb923c" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <!-- Container Box -->
        <rect x="24" y="40" width="52" height="34" rx="4" fill="#2a1005" fill-opacity="0.8"/>
        <!-- Inner Struts -->
        <line x1="37" y1="40" x2="37" y2="74"/>
        <line x1="63" y1="40" x2="63" y2="74"/>
        <!-- Central Latch / Core Ring -->
        <circle cx="50" cy="57" r="6" fill="#f97316" stroke="#fed7aa" stroke-width="2"/>
        <circle cx="50" cy="57" r="2.2" fill="#ffffff" stroke="none"/>
        <!-- Top Handle -->
        <path d="M 40 40 L 40 34 C 40 32 44 32 50 32 C 56 32 60 32 60 34 L 60 40" stroke="#fdba74" stroke-width="2.5"/>
      </g>
    </svg>
  `),

  // 5. Police QRT Cruiser (PV-08) - Neon Electric Blue Glow
  policeUnit: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" width="100" height="115">
      <defs>
        <filter id="glowPolice" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#0284c7" flood-opacity="0.95"/>
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.95"/>
        </filter>
        <linearGradient id="gradPolice" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#082542"/>
          <stop offset="100%" stop-color="#031221"/>
        </linearGradient>
      </defs>

      <!-- Callsign Pill Top Header -->
      <rect x="25" y="3" width="50" height="18" rx="9" fill="#04182b" stroke="#0284c7" stroke-width="1.8"/>
      <text x="50" y="16" fill="#7dd3fc" font-size="10.5" font-weight="900" font-family="ui-monospace, monospace, sans-serif" text-anchor="middle" letter-spacing="1">PV-08</text>

      <!-- Main Squircle Badge with Downward Pin Pointer -->
      <path d="M 20 22 L 80 22 C 89 22 96 29 96 38 L 96 74 C 96 83 89 90 80 90 L 58 90 L 50 106 L 42 90 L 20 90 C 11 90 4 83 4 74 L 4 38 C 4 29 11 22 20 22 Z"
            fill="url(#gradPolice)"
            stroke="#0284c7"
            stroke-width="3"
            filter="url(#glowPolice)"/>

      <!-- Police Cruiser Vector (matching reference) -->
      <g stroke="#38bdf8" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Body Contour -->
        <path d="M 20 72 L 22 56 L 36 46 L 64 46 L 78 56 L 82 60 L 82 72 Z" fill="#0a2640" fill-opacity="0.8"/>
        <!-- Windows -->
        <path d="M 38 49 L 48 49 L 48 55 L 34 55 Z" fill="#0284c7" fill-opacity="0.5"/>
        <path d="M 52 49 L 62 49 L 66 55 L 52 55 Z" fill="#0284c7" fill-opacity="0.5"/>
        <!-- Siren Flasher Bar -->
        <rect x="44" y="41" width="5.5" height="4" rx="1" fill="#ef4444" stroke="#f87171" stroke-width="1"/>
        <rect x="50.5" y="41" width="5.5" height="4" rx="1" fill="#38bdf8" stroke="#7dd3fc" stroke-width="1"/>
        <!-- Police Shield Star Badge on Door -->
        <circle cx="50" cy="62" r="3.5" fill="#fef08a" stroke="none"/>
        <!-- Wheels -->
        <circle cx="32" cy="73" r="5.5" fill="#03101c" stroke="#bae6fd" stroke-width="2.4"/>
        <circle cx="70" cy="73" r="5.5" fill="#03101c" stroke="#bae6fd" stroke-width="2.4"/>
      </g>
    </svg>
  `),

  // 6. Military Tactical Helicopter (HELI-01) - Neon Sky Blue Glow
  militaryHelicopter: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" width="100" height="115">
      <defs>
        <filter id="glowHeli" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#38bdf8" flood-opacity="0.95"/>
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.95"/>
        </filter>
        <linearGradient id="gradHeli" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#032644"/>
          <stop offset="100%" stop-color="#021323"/>
        </linearGradient>
      </defs>

      <!-- Callsign Pill Top Header -->
      <rect x="22" y="3" width="56" height="18" rx="9" fill="#041b30" stroke="#38bdf8" stroke-width="1.8"/>
      <text x="50" y="16" fill="#bae6fd" font-size="10" font-weight="900" font-family="ui-monospace, monospace, sans-serif" text-anchor="middle" letter-spacing="1">HELI-01</text>

      <!-- Main Squircle Badge with Downward Pin Pointer -->
      <path d="M 20 22 L 80 22 C 89 22 96 29 96 38 L 96 74 C 96 83 89 90 80 90 L 58 90 L 50 106 L 42 90 L 20 90 C 11 90 4 83 4 74 L 4 38 C 4 29 11 22 20 22 Z"
            fill="url(#gradHeli)"
            stroke="#38bdf8"
            stroke-width="3"
            filter="url(#glowHeli)"/>

      <!-- Tactical Helicopter Silhouette Vector -->
      <g stroke="#7dd3fc" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Main Rotor Blades -->
        <line x1="20" y1="36" x2="80" y2="36" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="50" cy="36" r="2.5" fill="#38bdf8"/>
        <line x1="50" y1="36" x2="50" y2="44" stroke="#7dd3fc" stroke-width="2.5"/>

        <!-- Fuselage -->
        <path d="M 32 46 C 32 42 46 41 62 44 C 70 46 76 52 76 58 C 76 66 64 69 44 69 C 34 69 32 60 32 46 Z" fill="#082b49"/>
        <!-- Window -->
        <path d="M 58 46 C 65 48 70 51 70 56 L 58 56 Z" fill="#38bdf8"/>
        
        <!-- Tail Boom & Fin -->
        <path d="M 34 50 L 16 52 L 16 46 L 19 46 L 22 49 Z" fill="#7dd3fc"/>
        <line x1="16" y1="44" x2="16" y2="58" stroke="#38bdf8" stroke-width="2"/>

        <!-- Landing Skids -->
        <line x1="38" y1="76" x2="68" y2="76" stroke="#e0f2fe" stroke-width="2.8"/>
        <line x1="44" y1="69" x2="42" y2="76"/>
        <line x1="62" y1="69" x2="64" y2="76"/>
      </g>
    </svg>
  `),

  // 7. Motor Rescue Boat (BOAT-02) - Neon Teal / Aqua Glow
  motorBoat: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 115" width="100" height="115">
      <defs>
        <filter id="glowBoat" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#06b6d4" flood-opacity="0.95"/>
          <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000000" flood-opacity="0.95"/>
        </filter>
        <linearGradient id="gradBoat" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#042a30"/>
          <stop offset="100%" stop-color="#021417"/>
        </linearGradient>
      </defs>

      <!-- Callsign Pill Top Header -->
      <rect x="22" y="3" width="56" height="18" rx="9" fill="#041c20" stroke="#06b6d4" stroke-width="1.8"/>
      <text x="50" y="16" fill="#a5f3fc" font-size="9.5" font-weight="900" font-family="ui-monospace, monospace, sans-serif" text-anchor="middle" letter-spacing="1">BOAT-02</text>

      <!-- Main Squircle Badge with Downward Pin Pointer -->
      <path d="M 20 22 L 80 22 C 89 22 96 29 96 38 L 96 74 C 96 83 89 90 80 90 L 58 90 L 50 106 L 42 90 L 20 90 C 11 90 4 83 4 74 L 4 38 C 4 29 11 22 20 22 Z"
            fill="url(#gradBoat)"
            stroke="#06b6d4"
            stroke-width="3"
            filter="url(#glowBoat)"/>

      <!-- Inflatable Rescue Boat Vector -->
      <g stroke="#22d3ee" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Hull -->
        <path d="M 20 58 C 26 70 74 70 82 58 C 84 55 80 50 74 50 L 26 50 C 20 50 18 55 20 58 Z" fill="#083344"/>
        <!-- Orange Inflatable Sponson Tube -->
        <path d="M 24 53 C 34 48 68 48 76 53 C 72 57 28 57 24 53 Z" fill="#f97316" stroke="#fb923c" stroke-width="1.5"/>

        <!-- Outboard Motor -->
        <rect x="18" y="46" width="6" height="12" rx="2" fill="#0f172a" stroke="#67e8f9" stroke-width="1.5"/>
        <line x1="16" y1="58" x2="16" y2="64" stroke="#94a3b8" stroke-width="2.5"/>

        <!-- Water Ripples -->
        <path d="M 18 75 Q 34 70 50 75 T 82 75" stroke="#67e8f9" stroke-width="2.2"/>
        <path d="M 26 80 Q 42 76 58 80 T 74 80" stroke="#cffafe" stroke-width="1.6"/>
      </g>
    </svg>
  `),
};

export function getUnitMapIconUrl(unitType?: string): string {
  if (unitType && unitType in MAP_UNIT_ICONS) {
    return MAP_UNIT_ICONS[unitType as DispatchUnitType];
  }
  const lower = (unitType || '').toLowerCase();
  if (lower.includes('helico') || lower.includes('iaf') || lower.includes('airlift') || lower.includes('chopper')) {
    return MAP_UNIT_ICONS.militaryHelicopter;
  }
  if (lower.includes('boat') || lower.includes('water') || lower.includes('marine') || lower.includes('gemini') || lower.includes('clinic')) {
    return MAP_UNIT_ICONS.motorBoat;
  }
  if (lower.includes('ambu') || lower.includes('medic') || lower.includes('icu') || lower.includes('trauma')) {
    return MAP_UNIT_ICONS.ambulance;
  }
  if (lower.includes('fire') || lower.includes('tender') || lower.includes('ladder')) {
    return MAP_UNIT_ICONS.fireEngine;
  }
  if (lower.includes('police') || lower.includes('qrt') || lower.includes('security') || lower.includes('cordon') || lower.includes('patrol')) {
    return MAP_UNIT_ICONS.policeUnit;
  }
  if (lower.includes('drone') || lower.includes('recon') || lower.includes('aerial') || lower.includes('lidar')) {
    return MAP_UNIT_ICONS.reconDrone;
  }
  return MAP_UNIT_ICONS.cargoTruck;
}
