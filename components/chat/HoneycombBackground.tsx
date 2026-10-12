'use client';

import React from 'react';

interface HoneycombBackgroundProps {
  className?: string;
}

export const HoneycombBackground: React.FC<HoneycombBackgroundProps> = ({ className = '' }) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none select-none z-0 ${className}`}
      style={{
        backgroundColor: '#FFFFFF',
        backgroundImage: 'url(/wallpapers/sarissa-honeycomb.svg)',
        backgroundRepeat: 'repeat',
        backgroundSize: '115px auto',
        backgroundPosition: 'top center',
      }}
      aria-hidden="true"
    />
  );
};
