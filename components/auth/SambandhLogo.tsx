import React, { useState } from 'react';

interface SambandhLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
}

/**
 * Highly realistic 3D formatted letter "S" logo icon for Sarissa.
 * Uses the authentic high-resolution 3D rendered asset with glowing cyan bevel,
 * volumetric depth, and gradient reflections, with crisp SVG fallback.
 */
export const SambandhLogoIcon: React.FC<{ 
  className?: string; 
  size?: number;
  variant?: 'ribbon' | '3d' | 'green' | 'blue';
}> = ({ 
  className = 'w-8 h-8', 
  size = 32,
  variant = 'green'
}) => {
  const [imgError, setImgError] = useState(false);
  const isBlue = variant === 'blue';
  const logoSrc = isBlue ? '/sambandh-logo-3d-clean.png' : '/sambandh-logo-3d-green.png';
  const isGreen = !isBlue;

  if (!imgError) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      >
        {/* Subtle glow behind the logo */}
        <div 
          className={`absolute inset-0 rounded-full blur-xs pointer-events-none scale-95 ${
            isGreen ? 'bg-[#52B788]/25' : 'bg-[#3B82F6]/25'
          }`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="Sarissa Logo S"
          width={size}
          height={size}
          onError={() => setImgError(true)}
          className={`w-full h-full object-contain relative z-10 select-none pointer-events-none ${
            isGreen
              ? 'drop-shadow-[0_2px_8px_rgba(47,73,54,0.35)]'
              : 'drop-shadow-[0_2px_8px_rgba(59,130,246,0.35)]'
          }`}
        />
      </div>
    );
  }

  // High-fidelity 3D-effect SVG fallback
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sb-face-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isGreen ? "#52B788" : "#4378FF"} />
          <stop offset="50%" stopColor={isGreen ? "#3D8A65" : "#5E58FC"} />
          <stop offset="100%" stopColor={isGreen ? "#2D6A4F" : "#8A52FC"} />
        </linearGradient>
        <linearGradient id="sb-bevel-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isGreen ? "#95D5B2" : "#38BDF8"} />
          <stop offset="40%" stopColor={isGreen ? "#74C69D" : "#818CF8"} />
          <stop offset="100%" stopColor={isGreen ? "#52B788" : "#C084FC"} />
        </linearGradient>
        <filter id="sb-drop" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor={isGreen ? "#0F1D15" : "#071A3D"} floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#sb-drop)">
        {/* 3D Extrusion Side Shadows */}
        <path 
          d="M 27 19 L 21 13 C 17.5 9.5 11.5 9.5 8 13 C 4.5 16.5 4.5 22.5 8 26 L 14 32" 
          stroke={isGreen ? "#0F1D15" : "#0F1F4D"} 
          strokeWidth="7" 
          strokeLinecap="round" 
        />
        <path 
          d="M 21 33 L 27 39 C 30.5 42.5 36.5 42.5 40 39 C 43.5 35.5 43.5 29.5 40 26 L 34 20" 
          stroke={isGreen ? "#0F1D15" : "#0F1F4D"} 
          strokeWidth="7" 
          strokeLinecap="round" 
        />

        {/* 3D Top Bevel Glowing Edges */}
        <path 
          d="M 27 17 L 21 11 C 17.5 7.5 11.5 7.5 8 11 C 4.5 14.5 4.5 20.5 8 24 L 14 30" 
          stroke="url(#sb-bevel-glow)" 
          strokeWidth="6.8" 
          strokeLinecap="round" 
        />
        <path 
          d="M 21 31 L 27 37 C 30.5 40.5 36.5 40.5 40 37 C 43.5 33.5 43.5 27.5 40 24 L 34 18" 
          stroke="url(#sb-bevel-glow)" 
          strokeWidth="6.8" 
          strokeLinecap="round" 
        />

        {/* 3D Front Face Ribbon */}
        <path 
          d="M 27 17 L 21 11 C 17.5 7.5 11.5 7.5 8 11 C 4.5 14.5 4.5 20.5 8 24 L 14 30" 
          stroke="url(#sb-face-grad)" 
          strokeWidth="5.5" 
          strokeLinecap="round" 
        />
        <path 
          d="M 21 31 L 27 37 C 30.5 40.5 36.5 40.5 40 37 C 43.5 33.5 43.5 27.5 40 24 L 34 18" 
          stroke="url(#sb-face-grad)" 
          strokeWidth="5.5" 
          strokeLinecap="round" 
        />
      </g>
    </svg>
  );
};

export const SambandhWatermark: React.FC<{ className?: string }> = ({ 
  className = 'w-72 h-72' 
}) => {
  return (
    <div className={`relative inline-flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/sambandh-logo-3d-green.png"
        alt=""
        className="w-full h-full object-contain filter drop-shadow-[0_0_40px_rgba(82,183,136,0.45)] brightness-90 contrast-110"
      />
    </div>
  );
};

export const SambandhBrandLogo: React.FC<SambandhLogoProps> = ({
  className = '',
  size = 34,
  showText = true,
  textColor = 'text-white'
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <SambandhLogoIcon size={size} />
      {showText && (
        <span className={`text-xl sm:text-[23px] font-bold tracking-tight lowercase ${textColor}`}>
          sarissa
        </span>
      )}
    </div>
  );
};

/**
 * Full-width Top Forest/Sage Green Header Section above the "Welcome back!" form.
 * Harmonizes with the new theme with rich deep forest background,
 * glowing sage/emerald 3D Sarissa emblem, and authentic typography.
 */
export const SambandhHeaderSection: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <header 
      className={`w-full bg-[#0F1D15] text-white px-6 sm:px-10 lg:px-11 xl:px-12 py-5 sm:py-6 flex items-center justify-center select-none border-b border-[#1C2C20] ${className}`}
    >
      <div className="w-full max-w-[420px] flex items-center gap-4 sm:gap-4.5">
        <div className="flex-shrink-0 relative">
          <SambandhLogoIcon size={60} variant="green" className="w-14 h-14 sm:w-15 sm:h-15" />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <div className="text-2xl sm:text-[29px] font-extrabold tracking-tight text-white leading-tight lowercase">
            sarissa
          </div>
          <p className="text-[12px] sm:text-xs text-[#E5EFE5]/85 font-normal mt-0.5 tracking-tight line-clamp-1">
            Where conversations become <span className="text-[#84CCA0] font-medium">connections.</span>
          </p>
        </div>
      </div>
    </header>
  );
};

/**
 * Top Pill Banner Card matching the authentic reference image.
 * Features the deep forest rounded pill container (#0F1D15),
 * the glowing sage 3D "S" logo, and the bold "sarissa" title + slogan.
 */
export const SambandhHeaderCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div 
      className={`w-full bg-[#0F1D15] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 md:p-4.5 flex items-center gap-3.5 sm:gap-4 shadow-md select-none border border-[#1C2C20] ${className}`}
    >
      <div className="flex-shrink-0 relative">
        <SambandhLogoIcon size={48} variant="green" className="sm:w-13 sm:h-13" />
      </div>
      <div className="flex flex-col justify-center min-w-0">
        <div className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white leading-tight lowercase">
          sarissa
        </div>
        <p className="text-[12px] sm:text-xs text-[#E5EFE5]/85 font-normal mt-0.5 tracking-tight line-clamp-1">
          Where conversations become <span className="text-[#84CCA0] font-medium">connections.</span>
        </p>
      </div>
    </div>
  );
};

// Sarissa aliases for seamless forward compatibility
export const SarissaLogoIcon = SambandhLogoIcon;
export const SarissaWatermark = SambandhWatermark;
export const SarissaBrandLogo = SambandhBrandLogo;
export const SarissaHeaderSection = SambandhHeaderSection;
export const SarissaHeaderCard = SambandhHeaderCard;

