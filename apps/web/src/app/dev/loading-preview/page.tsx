'use client';

import { useState, useEffect, useRef } from 'react';
import { AgentProgress } from '@/components/processing/AgentProgress';

type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

// Each frame represents one tick of the animation
const ANIMATION_FRAMES: Record<string, AgentStatus>[] = [
  // Frame 0: All waiting
  { transcript_quality: 'pending', soap: 'pending', risk: 'pending', dsm: 'pending', plan: 'pending' },
  // Frame 1: Transcript running
  { transcript_quality: 'running', soap: 'pending', risk: 'pending', dsm: 'pending', plan: 'pending' },
  // Frame 2: Transcript done, SOAP running
  { transcript_quality: 'complete', soap: 'running', risk: 'pending', dsm: 'pending', plan: 'pending' },
  // Frame 3: SOAP done, Risk running
  { transcript_quality: 'complete', soap: 'complete', risk: 'running', dsm: 'pending', plan: 'pending' },
  // Frame 4: Risk done, DSM running
  { transcript_quality: 'complete', soap: 'complete', risk: 'complete', dsm: 'running', plan: 'pending' },
  // Frame 5: DSM done, Plan running
  { transcript_quality: 'complete', soap: 'complete', risk: 'complete', dsm: 'complete', plan: 'running' },
  // Frame 6: All done
  { transcript_quality: 'complete', soap: 'complete', risk: 'complete', dsm: 'complete', plan: 'complete' },
];

export default function LoadingPreviewPage() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= ANIMATION_FRAMES.length - 1) {
          // Reset after a longer pause at the end
          return 0;
        }
        return prev + 1;
      });
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused]);

  const currentStatuses = ANIMATION_FRAMES[frameIndex];

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      {/* Component preview — AgentProgress renders its own navbar */}
      <div className="flex-1">
        <AgentProgress
          sessionId="preview-session"
          live={false}
          mockStatuses={currentStatuses}
        />
      </div>

      {/* Controls bar — pinned to bottom */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-200 shadow-lg rounded-full px-5 py-2.5 flex items-center gap-4">
        {/* Frame indicator */}
        <div className="flex items-center gap-1.5">
          {ANIMATION_FRAMES.map((_, i) => (
            <button
              key={i}
              onClick={() => setFrameIndex(i)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === frameIndex
                  ? 'bg-green-600 w-5'
                  : i < frameIndex
                  ? 'bg-green-300'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200" />

        {/* Play/Pause */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
        >
          {isPaused ? (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              Play
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
              Pause
            </>
          )}
        </button>

        {/* Reset */}
        <button
          onClick={() => { setFrameIndex(0); setIsPaused(false); }}
          className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Reset
        </button>

        {/* Step label */}
        <span className="text-[11px] font-mono text-gray-400">
          {frameIndex + 1}/{ANIMATION_FRAMES.length}
        </span>
      </div>
    </div>
  );
}
