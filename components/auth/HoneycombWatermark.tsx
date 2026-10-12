import React from 'react';

/**
 * Honeycomb hexagonal watermark pattern replicating the soft pink
 * grid aesthetic in the corners of the login/registration card.
 */
export const HoneycombTopRight: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 160 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none ${className}`}
    aria-hidden="true"
  >
    <g stroke="#F472B6" strokeWidth="1.2" strokeOpacity="0.4" fill="#FDF2F8" fillOpacity="0.35">
      {/* Cluster of interlocking hexagons in the top right */}
      <polygon points="120,4 136,13.2 136,31.8 120,41 104,31.8 104,13.2" />
      <polygon points="144,18 160,27.2 160,45.8 144,55 128,45.8 128,27.2" />
      <polygon points="96,18 112,27.2 112,45.8 96,55 80,45.8 80,27.2" />
      <polygon points="120,46 136,55.2 136,73.8 120,83 104,73.8 104,55.2" />
      <polygon points="144,60 160,69.2 160,87.8 144,97 128,87.8 128,69.2" />
      <polygon points="96,60 112,69.2 112,87.8 96,97 80,87.8 80,69.2" />
      <polygon points="120,88 136,97.2 136,115.8 120,125 104,115.8 104,97.2" />
      <polygon points="144,102 160,111.2 160,129.8 144,139 128,129.8 128,111.2" />
    </g>
  </svg>
);

export const HoneycombBottomLeft: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 160 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none ${className}`}
    aria-hidden="true"
  >
    <g stroke="#F472B6" strokeWidth="1.2" strokeOpacity="0.4" fill="#FDF2F8" fillOpacity="0.35">
      {/* Cluster of interlocking hexagons in the bottom left */}
      <polygon points="36,4 52,13.2 52,31.8 36,41 20,31.8 20,13.2" />
      <polygon points="60,18 76,27.2 76,45.8 60,55 44,45.8 44,27.2" />
      <polygon points="12,18 28,27.2 28,45.8 12,55 -4,45.8 -4,27.2" />
      <polygon points="36,46 52,55.2 52,73.8 36,83 20,73.8 20,55.2" />
      <polygon points="60,60 76,69.2 76,87.8 60,97 44,87.8 44,69.2" />
      <polygon points="12,60 28,69.2 28,87.8 12,97 -4,87.8 -4,69.2" />
      <polygon points="36,88 52,97.2 52,115.8 36,125 20,115.8 20,97.2" />
      <polygon points="60,102 76,111.2 76,129.8 60,139 44,129.8 44,111.2" />
    </g>
  </svg>
);
