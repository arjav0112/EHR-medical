'use client';

import { useEffect, useState } from 'react';

interface ConfidenceBarProps {
  value: number; // 0-1
  showLabel?: boolean;
}

export function ConfidenceBar({ value, showLabel = true }: ConfidenceBarProps) {
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Delay so CSS transition plays on mount
    const t = setTimeout(() => setMounted(true), 40);
    return () => clearTimeout(t);
  }, []);

  const pct = Math.round(value * 100);

  const color =
    value >= 0.85
      ? { fill: '#BEF264', label: 'text-neon-400', glow: 'shadow-[0_0_15px_rgba(190,242,100,0.3)]' }
      : value >= 0.65
      ? { fill: '#F59E0B', label: 'text-amber-400', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]' }
      : { fill: '#EF4444', label: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]' };

  return (
    <div className="w-full">
      {/* Track */}
      <div
        className="relative h-1.5 w-full bg-navy-950/50 rounded-full overflow-hidden cursor-help border border-white/[0.05] backdrop-blur-sm"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Fill */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out z-10 ${color.glow}`}
          style={{
            width: mounted ? `${pct}%` : '0%',
            backgroundColor: color.fill,
          }}
        />
        {/* Subtle background segments */}
        <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
           {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="w-[1px] h-full bg-white/40" />
           ))}
        </div>
        
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-navy-900 border border-white/10 text-white text-[10px] px-3 py-1.5 rounded-lg whitespace-nowrap shadow-2xl font-bold uppercase tracking-wider">
              Confidence Index: {pct}%
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-navy-900" />
            </div>
          </div>
        )}
      </div>
      {showLabel && (
        <div className={`text-[10px] font-bold mt-1.5 text-right uppercase tracking-[0.2em] opacity-80 ${color.label}`}>
          Neural Confidence: {pct}%
        </div>
      )}
    </div>
  );
}
