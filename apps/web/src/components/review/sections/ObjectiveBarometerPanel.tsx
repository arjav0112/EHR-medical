'use client';

import { useState } from 'react';
import type { ObjectiveBarometers, BarometerLevel, BarometerTrend } from '@/lib/types';

// ─── Config ──────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<BarometerLevel, { label: string; color: string; bg: string; border: string; dot: string }> = {
  normal:   { label: 'Normal',   color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200', dot: 'bg-emerald-500' },
  mild:     { label: 'Mild',     color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',   dot: 'bg-amber-400'   },
  moderate: { label: 'Moderate', color: 'text-orange-700',  bg: 'bg-orange-50',   border: 'border-orange-200',  dot: 'bg-orange-500'  },
  severe:   { label: 'Severe',   color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',     dot: 'bg-red-500'     },
};

const TREND_CONFIG: Record<BarometerTrend, { icon: string; label: string; color: string }> = {
  improved:      { icon: '↓', label: 'Improved',     color: 'text-emerald-600' },
  stable:        { icon: '→', label: 'Stable',        color: 'text-gray-500'   },
  worsened:      { icon: '↑', label: 'Worsened',      color: 'text-red-500'    },
  no_prior_data: { icon: '—', label: 'No prior data', color: 'text-gray-400'   },
};

// ─── Severity Pip Track ────────────────────────────────────────────────────────

function SeverityTrack({ level }: { level: BarometerLevel }) {
  const levels: BarometerLevel[] = ['normal', 'mild', 'moderate', 'severe'];
  const activeIdx = levels.indexOf(level);
  const pipColors: Record<BarometerLevel, string> = {
    normal:   'bg-emerald-500',
    mild:     'bg-amber-400',
    moderate: 'bg-orange-500',
    severe:   'bg-red-500',
  };

  return (
    <div className="flex items-center gap-1 mt-2">
      {levels.map((l, i) => (
        <div
          key={l}
          className={`h-1.5 flex-1 rounded-full transition-all ${
            i <= activeIdx ? pipColors[level] : 'bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Single Barometer Card ────────────────────────────────────────────────────

function BarometerCard({
  title,
  icon,
  level,
  description,
  trend,
  extras,
}: {
  title: string;
  icon: React.ReactNode;
  level: BarometerLevel;
  description: string;
  trend: BarometerTrend;
  extras?: React.ReactNode;
}) {
  const lvl = LEVEL_CONFIG[level];
  const trnd = TREND_CONFIG[trend];

  return (
    <div className={`flex-1 min-w-0 rounded-xl border ${lvl.border} ${lvl.bg} px-4 py-3`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500 text-[13px]">{icon}</span>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{title}</span>
        </div>
        <span className={`text-[11px] font-semibold ${trnd.color} flex items-center gap-0.5`}>
          <span>{trnd.icon}</span>
          <span>{trnd.label}</span>
        </span>
      </div>

      {/* Level badge */}
      <div className="flex items-center gap-2 mt-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${lvl.dot}`} />
        <span className={`text-[13px] font-bold ${lvl.color}`}>{lvl.label}</span>
      </div>

      {/* Pip track */}
      <SeverityTrack level={level} />

      {/* Description */}
      <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">{description}</p>

      {/* Extra content (vitals) */}
      {extras && <div className="mt-2 pt-2 border-t border-current/10">{extras}</div>}
    </div>
  );
}

// ─── Main Panel ────────────────────────────────────────────────────────────────

interface ObjectiveBarometerPanelProps {
  barometers: ObjectiveBarometers;
}

export function ObjectiveBarometerPanel({ barometers }: ObjectiveBarometerPanelProps) {
  const [open, setOpen] = useState(false);
  const { vitalSigns, psychomotor, speech } = barometers;

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-[12px] font-bold text-gray-700">MSE Barometers</span>
          {/* Quick badges */}
          <div className="flex items-center gap-1.5 ml-1">
            {[
              { key: 'psychomotor', val: psychomotor.level },
              { key: 'speech', val: speech.level },
              ...(vitalSigns ? [{ key: 'vitals', val: vitalSigns.level }] : []),
            ].map(({ key, val }) => {
              const cfg = LEVEL_CONFIG[val as BarometerLevel];
              return (
                <span key={key} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                  {key === 'psychomotor' ? 'Psychomotor' : key === 'speech' ? 'Speech' : 'Vitals'}: {cfg.label}
                </span>
              );
            })}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-5 pb-5 flex gap-3">
          {/* Psychomotor */}
          <BarometerCard
            title="Psychomotor"
            level={psychomotor.level}
            description={psychomotor.description}
            trend={psychomotor.trend}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          />

          {/* Speech */}
          <BarometerCard
            title="Speech"
            level={speech.level}
            description={speech.description}
            trend={speech.trend}
            icon={
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />

          {/* Vital Signs — only if recorded */}
          {vitalSigns && (
            <BarometerCard
              title="Vital Signs"
              level={vitalSigns.level}
              description="Clinician-recorded measurements"
              trend={vitalSigns.trend}
              icon={
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              }
              extras={
                <div className="flex flex-col gap-1">
                  {vitalSigns.bloodPressure && (
                    <span className="text-[11px] text-gray-600">
                      <span className="font-semibold text-gray-700">BP:</span> {vitalSigns.bloodPressure}
                    </span>
                  )}
                  {vitalSigns.heartRate && (
                    <span className="text-[11px] text-gray-600">
                      <span className="font-semibold text-gray-700">HR:</span> {vitalSigns.heartRate}
                    </span>
                  )}
                  {vitalSigns.weight && (
                    <span className="text-[11px] text-gray-600">
                      <span className="font-semibold text-gray-700">Wt:</span> {vitalSigns.weight}
                    </span>
                  )}
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
