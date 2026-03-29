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
      ? { fill: '#10B981', label: 'text-[#10B981]' }
      : value >= 0.65
      ? { fill: '#F59E0B', label: 'text-[#F59E0B]' }
      : { fill: '#EF4444', label: 'text-[#EF4444]' };

  return (
    <div className="w-full">
      {/* Track */}
      <div
        className="relative h-1 w-full bg-[#E8E8E8] rounded-full overflow-hidden cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: mounted ? `${pct}%` : '0%',
            backgroundColor: color.fill,
          }}
        />
        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 pointer-events-none">
            <div className="bg-[#1A1A1A] text-white text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap shadow-lg">
              Based on transcript clarity and clinical completeness
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1A1A1A]" />
            </div>
          </div>
        )}
      </div>
      {showLabel && (
        <div className={`text-[12px] font-medium mt-1 text-right ${color.label}`}>
          Confidence: {pct}%
        </div>
      )}
    </div>
  );
}
