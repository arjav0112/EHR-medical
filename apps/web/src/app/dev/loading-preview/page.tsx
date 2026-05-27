'use client';

import { useState, useEffect, useRef } from 'react';
import { AgentProgress } from '@/components/processing/AgentProgress';

type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

// Each frame represents one tick of the animation
const ANIMATION_FRAMES: Record<string, AgentStatus>[] = [
  // Frame 0: All waiting
  { transcript_quality: 'pending', soap: 'pending', risk: 'pending', dsm: 'pending', plan: 'pending', hallucination_guard: 'pending' },
  // Frame 1: Transcript running
  { transcript_quality: 'running', soap: 'pending', risk: 'pending', dsm: 'pending', plan: 'pending', hallucination_guard: 'pending' },
  // Frame 2: Transcript done, SOAP running
  { transcript_quality: 'complete', soap: 'running', risk: 'pending', dsm: 'pending', plan: 'pending', hallucination_guard: 'pending' },
  // Frame 3: SOAP done, Risk running
  { transcript_quality: 'complete', soap: 'complete', risk: 'running', dsm: 'pending', plan: 'pending', hallucination_guard: 'pending' },
  // Frame 4: Risk done, DSM running
  { transcript_quality: 'complete', soap: 'complete', risk: 'complete', dsm: 'running', plan: 'pending', hallucination_guard: 'pending' },
  // Frame 5: DSM done, Plan running
  { transcript_quality: 'complete', soap: 'complete', risk: 'complete', dsm: 'complete', plan: 'running', hallucination_guard: 'pending' },
  // Frame 6: Plan done, Hallucination Guard running
  { transcript_quality: 'complete', soap: 'complete', risk: 'complete', dsm: 'complete', plan: 'complete', hallucination_guard: 'running' },
  // Frame 7: All done
  { transcript_quality: 'complete', soap: 'complete', risk: 'complete', dsm: 'complete', plan: 'complete', hallucination_guard: 'complete' },
];

export default function LoadingPreviewPage() {
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Force grey bg on html and body so no white viewport background bleeds through zoom boundaries
  useEffect(() => {
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#f8faf8';
    document.body.style.backgroundColor = '#f8faf8';
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

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
    <div className="min-h-screen overflow-y-auto" style={{ background: '#f8faf8' }}>
      {/* Component preview — AgentProgress renders its own navbar */}
      <AgentProgress
        sessionId="preview-session"
        live={false}
        mockStatuses={currentStatuses}
      />
    </div>
  );
}
