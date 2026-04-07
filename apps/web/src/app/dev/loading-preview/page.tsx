'use client';

import { useState } from 'react';
import { AgentProgress } from '@/components/processing/AgentProgress';

type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

const STATES: Record<string, Record<string, AgentStatus>> = {
  'All Waiting': {
    transcript_quality: 'pending',
    soap: 'pending',
    risk: 'pending',
    dsm: 'pending',
    plan: 'pending',
  },
  'In Progress': {
    transcript_quality: 'complete',
    soap: 'running',
    risk: 'pending',
    dsm: 'pending',
    plan: 'pending',
  },
  'Almost Done': {
    transcript_quality: 'complete',
    soap: 'complete',
    risk: 'complete',
    dsm: 'running',
    plan: 'pending',
  },
  'Error State': {
    transcript_quality: 'complete',
    soap: 'error',
    risk: 'pending',
    dsm: 'pending',
    plan: 'pending',
  },
  'All Done': {
    transcript_quality: 'complete',
    soap: 'complete',
    risk: 'complete',
    dsm: 'complete',
    plan: 'complete',
  },
};

export default function LoadingPreviewPage() {
  const [selected, setSelected] = useState<string>('In Progress');

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Component preview — AgentProgress renders its own navbar */}
      <div className="flex-1">
        <AgentProgress
          sessionId="preview-session"
          live={false}
          mockStatuses={STATES[selected]}
        />
      </div>

      {/* State switcher — pinned to bottom so it doesn't clash with the pill navbar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-lg rounded-full px-5 py-2.5 flex items-center gap-3">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mr-1">State:</span>
        {Object.keys(STATES).map((key) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={`text-[12px] font-semibold px-4 py-1.5 rounded-full transition-all ${
              selected === key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
