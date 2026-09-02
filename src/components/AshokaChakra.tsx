import React from 'react';

interface AshokaChakraProps {
  size?: number;
  className?: string;
  animate?: boolean;
  color?: string;
}

/**
 * Mathematically precise 24-spoke Ashoka Chakra (Dharmachakra) SVG component.
 * Symbolism: The 24 spokes represent the 24 hours of ceaseless vigilance,
 * eternal law (Dharma), righteousness, and continuous motion (Charaiveti).
 */
export const AshokaChakra: React.FC<AshokaChakraProps> = ({
  size = 24,
  className = '',
  animate = false,
  color = '#1D4ED8', // Dharmachakra Navy
}) => {
  // Generate 24 spokes at 15-degree increments (360 / 24 = 15)
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animate ? 'animate-spin-slow' : ''} ${className}`}
      style={{
        transformOrigin: 'center',
        animationDuration: '24s',
      }}
      aria-label="Ashoka Chakra - 24 Spoke Wheel of Dharma & Vigilance"
    >
      {/* Outer Ring */}
      <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="3" fill="none" />
      <circle cx="50" cy="50" r="41" stroke={color} strokeWidth="1.2" strokeDasharray="1.5 2.5" fill="none" opacity="0.6" />

      {/* 24 Outer Rim Knobs / Lotus Beads (Rathachakra dots) */}
      {spokes.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx = 50 + 43.5 * Math.sin(rad);
        const cy = 50 - 43.5 * Math.cos(rad);
        return (
          <circle
            key={`dot-${deg}`}
            cx={cx}
            cy={cy}
            r="1.2"
            fill={color}
          />
        );
      })}

      {/* 24 Spokes radiating from the central hub */}
      {spokes.map((deg) => (
        <g key={`spoke-${deg}`} transform={`rotate(${deg} 50 50)`}>
          {/* Main Tapered Spoke */}
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="10"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Subtle spoke spine accent */}
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="18"
            stroke={color}
            strokeWidth="2.4"
            opacity="0.5"
          />
        </g>
      ))}

      {/* Inner Central Hub Hubcaps */}
      <circle cx="50" cy="50" r="10" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="5.5" fill={color} stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="50" cy="50" r="2" fill="#FFFFFF" />
    </svg>
  );
};

/**
 * Tiranga Ribbon Accent Strip
 * Saffron (#FF9933), Shwet White (#FFFFFF), and India Green (#138808)
 */
export const TirangaRibbon: React.FC<{ height?: string; className?: string }> = ({
  height = 'h-1',
  className = '',
}) => {
  return (
    <div className={`w-full ${height} grid grid-cols-3 ${className}`} aria-hidden="true">
      <div className="bg-[#FF9933]" title="Kesari (Saffron) - Strength & Courage" />
      <div className="bg-[#FFFFFF]" title="Shwet (White) - Peace & Truth" />
      <div className="bg-[#138808]" title="Hara (Green) - Fertility & Prosperity" />
    </div>
  );
};
