'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = 'pending' | 'running' | 'complete' | 'error';

interface AgentNode {
  key: string;
  label: string;
  sublabel: string;
  statusLabel: { pending: string; running: string; complete: string; error: string };
}

interface AgentProgressProps {
  sessionId: string;
  live?: boolean;
  mockStatuses?: Record<string, AgentStatus>;
  onComplete?: () => void;
}

// ─── Agent definitions ────────────────────────────────────────────────────────

const AGENTS: AgentNode[] = [
  {
    key: 'transcript_quality',
    label: 'Transcript quality',
    sublabel: 'Scoring clarity & completeness',
    statusLabel: { pending: 'Queued', running: 'Analyzing transcript…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'soap',
    label: 'SOAP note',
    sublabel: 'Drafting clinical documentation',
    statusLabel: { pending: 'Queued', running: 'Writing note…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'risk',
    label: 'Risk analysis',
    sublabel: 'Detecting safety concerns',
    statusLabel: { pending: 'Queued', running: 'Scanning flags…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'dsm',
    label: 'DSM-5 diagnosis',
    sublabel: 'Matching diagnostic criteria',
    statusLabel: { pending: 'Queued', running: 'Classifying…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'plan',
    label: 'Treatment plan',
    sublabel: 'Building care recommendations',
    statusLabel: { pending: 'Queued', running: 'Planning…', complete: 'Complete', error: 'Failed' },
  },
  {
    key: 'hallucination_guard',
    label: 'Hallucination guard',
    sublabel: 'Auditing AI outputs against transcript',
    statusLabel: { pending: 'Queued', running: 'Verifying grounding…', complete: 'Verified', error: 'Failed' },
  },
];

// Synthetic audio generator using Web Audio API for highly premium sound feedback
function playAudioTone(type: 'attach' | 'coin' | 'break' | 'fail' | 'launch') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'attach') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'launch') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.06); // E6
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'break') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (e) {
    // blocked by browser autoplay policy or unsupported
  }
}

// ─── Pipeline step ───────────────────────────────────────────────────────────

function PipelineStep({
  agent,
  status,
  isLast,
  index,
}: {
  agent: AgentNode;
  status: AgentStatus;
  isLast: boolean;
  index: number;
}) {
  const isDone = status === 'complete';
  const isRunning = status === 'running';
  const isError = status === 'error';

  return (
    <div
      className="flex gap-4 animate-in fade-in slide-in-from-left-4"
      style={{ animationDelay: `${index * 60}ms`, animationDuration: '450ms', animationFillMode: 'both' }}
    >
      {/* Pipe column */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        {/* Node dot */}
        <div
          className={`relative w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 border ${isDone
            ? 'bg-green-650 border-green-650'
            : isRunning
              ? 'bg-green-50 border-green-300'
              : isError
                ? 'bg-red-50 border-red-300'
                : 'bg-slate-50 border-slate-200'
            }`}
        >
          {isDone && (
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          {isRunning && (
            <>
              <div className="absolute inset-0 rounded-xl bg-green-300 animate-ping opacity-25" />
              <div className="w-2 h-2 rounded-full bg-green-650 animate-pulse" />
            </>
          )}
          {isError && <span className="text-red-500 text-[12px] font-black">!</span>}
          {status === 'pending' && <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
        </div>

        {/* Connector */}
        {!isLast && (
          <div className="relative w-[1.5px] flex-1 min-h-[22px] overflow-hidden rounded-full bg-slate-100 my-1">
            <div
              className="absolute top-0 left-0 right-0 rounded-full transition-all duration-500 ease-in-out"
              style={{
                height: isDone ? '100%' : '0%',
                background: isDone ? '#158a7c' : 'transparent',
              }}
            />
            {isRunning && (
              <div
                className="absolute inset-0 rounded-full animate-[pulse_1.5s_infinite]"
                style={{
                  background: 'linear-gradient(to bottom, transparent, #158a7c 40%, #158a7c 60%, transparent)',
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={`pb-4.5 ${isLast ? 'pb-0' : ''} pt-0.5`}>
        <p className={`text-[13px] font-bold leading-tight transition-colors duration-300 ${isDone ? 'text-slate-700' : isRunning ? 'text-slate-900' : 'text-slate-400'}`}>
          {agent.label}
        </p>
        <p className={`text-[11.5px] mt-0.5 transition-colors duration-300 ${isDone ? 'text-green-600' : isRunning ? 'text-green-600' : isError ? 'text-red-500' : 'text-slate-400'}`}>
          {agent.statusLabel[status]}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AgentProgress({ sessionId, live = true, mockStatuses, onComplete }: AgentProgressProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States for Sidebar
  const [statuses, setStatuses] = useState<Record<string, AgentStatus>>(
    mockStatuses ?? Object.fromEntries(AGENTS.map((a) => [a.key, 'pending']))
  );
  const [hasError, setHasError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectedRef = useRef(false);

  // 5 Minute Countdown Timer State
  const [secondsRemaining, setSecondsRemaining] = useState(300); // 5 minutes = 300 seconds

  // Game States
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [themeOverride, setThemeOverride] = useState<'auto' | 'castle' | 'ninja' | 'space'>('auto');

  // Sync mockStatuses when preview state changes
  useEffect(() => {
    if (!live && mockStatuses) setStatuses(mockStatuses);
  }, [live, mockStatuses]);

  // 5 Minute Countdown Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format timer into MM:SS
  const formatTimer = () => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pipeline Auto-animation in mock/preview modes
  useEffect(() => {
    if (live || mockStatuses) return;

    const agentKeys = AGENTS.map((a) => a.key);
    let step = 0;

    const tick = () => {
      step++;
      setStatuses(() => {
        const next: Record<string, AgentStatus> = {};
        agentKeys.forEach((key, i) => {
          if (step > i + 1) next[key] = 'complete';
          else if (step === i + 1) next[key] = 'running';
          else next[key] = 'pending';
        });
        return next;
      });

      if (step > agentKeys.length + 1) {
        step = 0;
        setStatuses(Object.fromEntries(agentKeys.map((k) => [k, 'pending'])));
      }
    };

    const id = setInterval(tick, 2500);
    tick();
    return () => clearInterval(id);
  }, [live, mockStatuses]);

  // Live status polling from Firebase/API
  useEffect(() => {
    if (!live) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/session/${sessionId}/status`);
        if (!res.ok) return;
        const data = await res.json() as {
          agentStatuses: Record<string, AgentStatus>;
          complete: boolean;
          error?: string;
        };

        setStatuses(data.agentStatuses);

        if (data.error) {
          setHasError(true);
          clearInterval(intervalRef.current!);
        }

        if (data.complete && !redirectedRef.current) {
          redirectedRef.current = true;
          clearInterval(intervalRef.current!);
          setTimeout(() => {
            onComplete?.();
            router.push(`/session/${sessionId}/review`);
          }, 1000);
        }
      } catch {
        // network issue
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 2000);
    return () => clearInterval(intervalRef.current!);
  }, [sessionId, live, router, onComplete]);

  const completedCount = AGENTS.filter((a) => statuses[a.key] === 'complete').length;
  const allDone = completedCount === AGENTS.length && !hasError;
  const progressPct = Math.round((completedCount / AGENTS.length) * 100);

  // ─── HTML5 CANVAS "GO UP" GAME GAMEPLAY CODE ─────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enlarge internal canvas resolution to match high-resolution larger mockup aspect ratio perfectly
    canvas.width = 500;
    canvas.height = 720;

    // Physics constants
    const GRAVITY = 0.44;
    const DRAG_LAUNCH_LIMIT = 110;
    const LAUNCH_FORCE_COEFF = 0.23;

    // Game Variables
    let tom = {
      x: 250,
      y: 540,
      vx: 0,
      vy: 0,
      radius: 19,
      isGrabbed: false,
      attachedPegId: null as number | null,
    };

    interface Peg {
      id: number;
      x: number;
      y: number;
      type: 'blue' | 'red';
      radius: 17;
      timer: number; // For red pegs, count down from 1.5
      isGrabbed: boolean;
      state: 'stable' | 'active' | 'broken';
      isSlider?: boolean;
      isVerticalSlider?: boolean;
      trackWidth?: number;
      trackHeight?: number;
      sliderSpeed?: number;
      sliderDirection?: number;
      minX?: number;
      maxX?: number;
      minY?: number;
      maxY?: number;
    }

    interface Obstacle {
      x: number;
      y: number;
      vx: number;
      radius: 14;
      angle: number;
    }

    interface Coin {
      x: number;
      y: number;
      radius: 11;
      collected: boolean;
      animOffset: number;
      parentPegId?: number;
      offsetX?: number;
    }

    interface CollectionParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number;
    }

    interface FloatingScore {
      x: number;
      y: number;
      text: string;
      life: number;
    }

    let pegs: Peg[] = [];
    let obstacles: Obstacle[] = [];
    let coins: Coin[] = [];
    let particles: CollectionParticle[] = [];
    let floatingScores: FloatingScore[] = [];
    let pegIdCounter = 0;
    let cameraY = 0;
    let cameraYTarget = 0;
    let highestGeneratedY = 560;
    let gameScore = 0;

    // Slingshot drag state
    let dragStart = { x: 0, y: 0 };
    let dragCurrent = { x: 0, y: 0 };
    let isDragging = false;

    // Parallax background tiles
    const generateStaticBricks = () => {
      const b = [];
      for (let i = -1000; i < 1000; i += 80) {
        b.push({
          x: Math.random() * 380 + 40,
          y: i,
          w: Math.random() * 70 + 40,
          h: 20,
        });
      }
      return b;
    };
    const bricks = generateStaticBricks();

    // Alternating side memory to create a zig-zag climbing path
    let lastPegWasLeft = Math.random() < 0.5;

    // Helper to spawn game assets with progressive difficulty scaling
    const generateLevelAssets = (startY: number, rangeHeight: number) => {
      // Spawn pegs in intervals of ~135px
      for (let y = startY; y > startY - rangeHeight; y -= 135) {
        // Alternate peg horizontal placement between left and right halves to prevent overlaps and guarantee zig-zag pathing
        let x;
        if (lastPegWasLeft) {
          x = Math.random() * 120 + 260; // Right side: 260 to 380
          lastPegWasLeft = false;
        } else {
          x = Math.random() * 120 + 120; // Left side: 120 to 240
          lastPegWasLeft = true;
        }

        const type = Math.random() < 0.35 ? 'red' : 'blue';

        // 1. Difficulty Scaling Factors based on height y (y gets more negative as we climb)
        const climbHeight = Math.max(0, 540 - y); // 0 at start, grows positive

        // Probability of spawning a moving slider grows from 0% at start to 38% at height 2000
        const sliderProbability = Math.min(0.38, (climbHeight / 2000) * 0.38);
        const isSlider = climbHeight > 200 && Math.random() < sliderProbability;
        const sliderType = isSlider ? (Math.random() < 0.45 ? 'vertical' : 'horizontal') : 'none';

        const isHorizontalSlider = sliderType === 'horizontal';
        const isVerticalSlider = sliderType === 'vertical';

        const trackWidth = Math.random() * 80 + 120; // 120px to 200px track range
        const minX = Math.max(32 + 17 + 10, x - trackWidth / 2);
        const maxX = Math.min(canvas.width - 32 - 17 - 10, x + trackWidth / 2);

        // Vertical slider limits
        const trackHeight = Math.random() * 80 + 100; // 100px to 180px vertical track range
        const minY = y - trackHeight / 2;
        const maxY = y + trackHeight / 2;

        // Slider speed grows from 0.8 at start to 2.5 at height 3000
        const maxSpeed = Math.min(2.5, 0.8 + (climbHeight / 3000) * 1.7);
        const sliderSpeed = Math.random() * (maxSpeed - 0.6) + 0.6;
        const sliderDirection = Math.random() < 0.5 ? 1 : -1;

        pegs.push({
          id: pegIdCounter++,
          x,
          y,
          type,
          radius: 17,
          timer: 3.0,
          isGrabbed: false,
          state: 'stable',
          isSlider: isHorizontalSlider,
          isVerticalSlider,
          trackWidth,
          trackHeight,
          sliderSpeed,
          sliderDirection,
          minX,
          maxX,
          minY,
          maxY,
        });

        // Spawn a coin above stable blue pegs
        const hasCoin = type === 'blue' && Math.random() < 0.6;
        const coinOffsetX = Math.random() * 40 - 20;
        const coinX = x + coinOffsetX;
        if (hasCoin) {
          coins.push({
            x: coinX,
            y: y - 55,
            radius: 11,
            collected: false,
            animOffset: Math.random() * 100,
            parentPegId: pegs[pegs.length - 1].id,
            offsetX: coinOffsetX,
          });
        }

        // 2. Spiked obstacle spawn scaling:
        // Spawn probability grows from 10% at start to 45% at height 2000
        const obstacleProbability = Math.min(0.45, 0.10 + (climbHeight / 2000) * 0.35);

        if (climbHeight > 150 && Math.random() < obstacleProbability) {
          let obsX = Math.random() * 340 + 80;
          let attempts = 0;

          while (attempts < 10) {
            let isSafe = true;

            // Safe distance from current peg
            if (Math.hypot(obsX - x, 70) < 95) isSafe = false;

            // Safe distance from coin if spawned
            if (hasCoin && Math.hypot(obsX - coinX, 15) < 85) isSafe = false;

            if (isSafe) break;
            obsX = Math.random() * 340 + 80;
            attempts++;
          }

          // Obstacle horizontal speed grows from 0.8 at start to 2.5 at height 3000
          const maxObsSpeed = Math.min(2.5, 0.8 + (climbHeight / 3000) * 1.7);
          const obsSpeed = (Math.random() * (maxObsSpeed - 0.6) + 0.6) * (Math.random() < 0.5 ? 1 : -1);

          obstacles.push({
            x: obsX,
            y: y - 70,
            vx: obsSpeed,
            radius: 14,
            angle: Math.random() * Math.PI * 2,
          });
        }

        // Track the absolute highest generated Y coordinate (most negative/climbing up)
        if (y < highestGeneratedY) {
          highestGeneratedY = y;
        }
      }
    };

    // Initialize Game objects
    const initGame = () => {
      tom = {
        x: 250,
        y: 540,
        vx: 0,
        vy: 0,
        radius: 19,
        isGrabbed: false,
        attachedPegId: null,
      };

      pegs = [
        { id: pegIdCounter++, x: 250, y: 560, type: 'blue', radius: 17, timer: 3.0, isGrabbed: false, state: 'stable' },
      ];
      obstacles = [];
      coins = [];
      cameraY = 0;
      cameraYTarget = 0;
      highestGeneratedY = 560; // will be updated dynamically inside generateLevelAssets
      gameScore = 0;
      setScore(0);

      // Attach Tom to the starting peg
      tom.attachedPegId = pegs[0].id;
      tom.x = pegs[0].x;
      tom.y = pegs[0].y - 20;

      generateLevelAssets(560 - 135, 1200);
    };

    initGame();

    // ── Mouse / Touch Listeners with robust screen/window mapping ──
    const getCanvasMousePos = (event: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX = 0;
      let clientY = 0;

      if ('touches' in event) {
        if (event.touches && event.touches.length > 0) {
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
        } else if (event.changedTouches && event.changedTouches.length > 0) {
          clientX = event.changedTouches[0].clientX;
          clientY = event.changedTouches[0].clientY;
        }
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      // Scale to internal resolution
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const handleMouseDown = (event: MouseEvent | TouchEvent) => {
      if (gameState !== 'playing') return;

      // Fully block browser page scrolling during active flings to avoid losing touch pointer registration
      if (event.cancelable) event.preventDefault();

      const mouse = getCanvasMousePos(event);

      // Touch anywhere on the screen when Tom is attached triggers the slingshot
      if (tom.attachedPegId !== null) {
        isDragging = true;
        dragStart = { x: mouse.x, y: mouse.y };
        dragCurrent = mouse;

        const anchor = pegs.find((p) => p.id === tom.attachedPegId);
        if (anchor) {
          tom.x = anchor.x;
          tom.y = anchor.y;
        }
      }
    };

    const handleMouseMove = (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      if (event.cancelable) event.preventDefault();

      const mouse = getCanvasMousePos(event);
      dragCurrent = mouse;

      // Calculate slingshot pull relative to dragStart
      if (tom.attachedPegId !== null) {
        const anchor = pegs.find((p) => p.id === tom.attachedPegId);
        if (anchor) {
          const dx = mouse.x - dragStart.x;
          const dy = mouse.y - dragStart.y;
          const dist = Math.hypot(dx, dy);

          if (dist > DRAG_LAUNCH_LIMIT) {
            const angle = Math.atan2(dy, dx);
            tom.x = anchor.x + Math.cos(angle) * DRAG_LAUNCH_LIMIT;
            tom.y = anchor.y + Math.sin(angle) * DRAG_LAUNCH_LIMIT;
          } else {
            tom.x = anchor.x + dx;
            tom.y = anchor.y + dy;
          }
        }
      }
    };

    const handleMouseUp = (event: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      isDragging = false;

      if (tom.attachedPegId !== null) {
        const anchor = pegs.find((p) => p.id === tom.attachedPegId);
        if (anchor) {
          // Launch Tom in opposite direction of drag (elastic snap!)
          const dx = tom.x - anchor.x;
          const dy = tom.y - anchor.y;

          tom.attachedPegId = null;
          tom.vx = -dx * LAUNCH_FORCE_COEFF;
          tom.vy = -dy * LAUNCH_FORCE_COEFF;

          playAudioTone('launch');
        }
      }
    };

    // Use passive: false to enable preventDefault touch event cancellation.
    // Bind move and end listeners to window so that stretch registration is perfectly maintained even when dragging outside canvas boundaries.
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleMouseDown, { passive: false });
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp, { passive: false });
    window.addEventListener('touchcancel', handleMouseUp, { passive: false });

    // ── MAIN GAME LOOP ──
    let animationId: number;
    const render = () => {
      if (gameState === 'playing') {
        // ── Physics Updates ──

        // A) Update moving slider pegs side-to-side and up-and-down
        for (const peg of pegs) {
          if (peg.state !== 'broken') {
            if (peg.isSlider) {
              peg.x += peg.sliderSpeed! * peg.sliderDirection!;
              if (peg.x > peg.maxX! || peg.x < peg.minX!) {
                peg.sliderDirection = -peg.sliderDirection!;
                peg.x = Math.max(peg.minX!, Math.min(peg.maxX!, peg.x));
              }
            } else if (peg.isVerticalSlider) {
              peg.y += peg.sliderSpeed! * peg.sliderDirection!;
              if (peg.y > peg.maxY! || peg.y < peg.minY!) {
                peg.sliderDirection = -peg.sliderDirection!;
                peg.y = Math.max(peg.minY!, Math.min(peg.maxY!, peg.y));
              }
            }
          }
        }

        // B) Update coin positions for coins bound to moving slider pegs
        for (const coin of coins) {
          if (!coin.collected && coin.parentPegId !== undefined) {
            const parent = pegs.find((p) => p.id === coin.parentPegId);
            if (parent && parent.state !== 'broken') {
              if (parent.isSlider) {
                coin.x = parent.x + coin.offsetX!;
              } else if (parent.isVerticalSlider) {
                coin.y = parent.y - 55;
              }
            }
          }
        }

        // C) Update Tom physics and attachments
        if (tom.attachedPegId === null) {
          // Gravity pull
          tom.vy += GRAVITY;
          tom.x += tom.vx;
          tom.y += tom.vy;

          // Wall bounces (stay inside stone pillars)
          if (tom.x - tom.radius < 32) {
            tom.x = 32 + tom.radius;
            tom.vx = -tom.vx * 0.6;
          }
          if (tom.x + tom.radius > canvas.width - 32) {
            tom.x = canvas.width - 32 - tom.radius;
            tom.vx = -tom.vx * 0.6;
          }

          // Trigger screen/camera scroll when Tom goes upwards
          if (tom.y - cameraY < 280) {
            cameraYTarget = tom.y - 280;
          }
        } else {
          // Attached state — align exactly with peg
          const anchor = pegs.find((p) => p.id === tom.attachedPegId);
          if (anchor) {
            if (!isDragging) {
              // rest hanging slightly below peg
              tom.x = anchor.x;
              tom.y = anchor.y + 12;
              tom.vx = 0;
              tom.vy = 0;
            } else {
              // Slingshot drag position relative to the moving peg anchor, based on dragStart offset!
              const dx = dragCurrent.x - dragStart.x;
              const dy = dragCurrent.y - dragStart.y;
              const dist = Math.hypot(dx, dy);
              if (dist > DRAG_LAUNCH_LIMIT) {
                const angle = Math.atan2(dy, dx);
                tom.x = anchor.x + Math.cos(angle) * DRAG_LAUNCH_LIMIT;
                tom.y = anchor.y + Math.sin(angle) * DRAG_LAUNCH_LIMIT;
              } else {
                tom.x = anchor.x + dx;
                tom.y = anchor.y + dy;
              }
            }

            // Red Timered Peg countdown
            if (anchor.type === 'red') {
              anchor.state = 'active';
              anchor.timer -= 0.016; // tick at ~60fps
              if (anchor.timer <= 0) {
                // Peg breaks!
                anchor.state = 'broken';
                tom.attachedPegId = null;
                tom.vy = 2; // slip fall
                playAudioTone('break');
              }
            }
          }
        }

        // Camera follow interpolation
        cameraY += (cameraYTarget - cameraY) * 0.085;

        // Score update based on max height reached
        const climbScore = Math.floor(Math.max(0, (540 - tom.y) / 8));
        if (climbScore > gameScore) {
          gameScore = climbScore;
          setScore(climbScore);
        }

        // ── Peg generation triggers ──
        if (cameraYTarget < highestGeneratedY + 300) {
          generateLevelAssets(highestGeneratedY - 135, 1000);
        }

        // ── Collision Checks ──
        
        // A) Peg attachment check (only when Tom is in flight!)
        if (tom.attachedPegId === null) {
          if (tom.vy > -5.0) {
            for (const peg of pegs) {
              if (peg.state !== 'broken') {
                const dist = Math.hypot(tom.x - peg.x, tom.y - peg.y);
                if (dist < peg.radius + tom.radius + 24) {
                  // SNAP ATTACH!
                  tom.attachedPegId = peg.id;
                  tom.vx = 0;
                  tom.vy = 0;
                  playAudioTone('attach');
                  break;
                }
              }
            }
          }
        }

        // B) Coin collection check (Checked ALWAYS, including while resting or stretching!)
        for (const coin of coins) {
          if (!coin.collected) {
            const dist = Math.hypot(tom.x - coin.x, tom.y - coin.y);
            if (dist < coin.radius + tom.radius) {
              coin.collected = true;
              gameScore += 100;
              setScore((prev) => prev + 100);
              playAudioTone('coin');

              // Spawn golden stars burst particles
              for (let p = 0; p < 12; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 3 + 2.5;
                particles.push({
                  x: coin.x,
                  y: coin.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed - 1.2, // bias upwards
                  size: Math.random() * 4 + 3.5,
                  color: Math.random() < 0.65 ? '#facc15' : '#ffffff',
                  life: 1.0,
                });
              }

              // Spawn floating "+100" score text
              floatingScores.push({
                x: coin.x,
                y: coin.y - 10,
                text: '+100',
                life: 1.0,
              });
            }
          }
        }

        // C) Obstacle collision check (Checked ALWAYS, including while resting or stretching!)
        for (const obs of obstacles) {
          const dist = Math.hypot(tom.x - obs.x, tom.y - obs.y);
          if (dist < obs.radius + tom.radius - 2) {
            // Game Over! Tom dies
            setGameState('gameover');
            playAudioTone('fail');
          }
        }

        // Update spiked obstacles movement side-to-side
        for (const obs of obstacles) {
          obs.x += obs.vx;
          obs.angle += 0.04;
          if (obs.x - obs.radius < 32 || obs.x + obs.radius > canvas.width - 32) {
            obs.vx = -obs.vx;
          }
        }

        // D) Update animated collection particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.08; // subtle gravity pull on sparkles
          p.life -= 0.028; // fades out
          if (p.life <= 0) {
            particles.splice(i, 1);
          }
        }

        // E) Update animated floating score popups
        for (let i = floatingScores.length - 1; i >= 0; i--) {
          const f = floatingScores[i];
          f.y -= 0.85; // float upwards gently
          f.life -= 0.022; // fades out
          if (f.life <= 0) {
            floatingScores.splice(i, 1);
          }
        }

        // Falling past screen bottom kills Tom
        if (tom.y - cameraY > canvas.height + 150) {
          setGameState('gameover');
          playAudioTone('fail');
        }
      }

      // ── RENDERING / DRAWING ENGINE ──
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Translate camera
      ctx.save();
      ctx.translate(0, -cameraY);

      // 1. Determine active theme based on height climbed (-cameraY) or developer preview override
      let currentTheme: 'castle' | 'ninja' | 'space' = 'castle';
      if (themeOverride !== 'auto') {
        currentTheme = themeOverride;
      } else {
        const heightClimbed = -cameraY;
        if (heightClimbed < 800) {
          currentTheme = 'castle';
        } else if (heightClimbed < 1800) {
          currentTheme = 'ninja';
        } else {
          currentTheme = 'space';
        }
      }

      // 2. Draw background based on active theme
      if (currentTheme === 'castle') {
        ctx.fillStyle = '#f6ede0';
        ctx.fillRect(0, cameraY, canvas.width, canvas.height);

        ctx.fillStyle = '#eddcc4';
        for (const b of bricks) {
          if (b.y > cameraY - 100 && b.y < cameraY + canvas.height + 100) {
            ctx.fillRect(b.x, b.y, b.w, b.h);
          }
        }
      } else if (currentTheme === 'ninja') {
        ctx.fillStyle = '#e2ecdb';
        ctx.fillRect(0, cameraY, canvas.width, canvas.height);

        // Bamboo background stalks silhouette
        ctx.fillStyle = '#cfdfc7';
        for (let i = 0; i < 5; i++) {
          const bx = (i * 100) + 50;
          ctx.fillRect(bx, cameraY, 12, canvas.height);
          // Bamboo nodes/segments
          for (let by = Math.floor(cameraY / 120) * 120 - 120; by < cameraY + canvas.height + 120; by += 120) {
            ctx.fillRect(bx - 2, by, 16, 4);
          }
        }
      } else {
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, cameraY, canvas.width, canvas.height);

        // Twinkling stars in deep space
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        for (let i = 0; i < 20; i++) {
          const starX = (i * 27) % canvas.width;
          const starY = (Math.floor(cameraY / 20) * 20 + (i * 41)) % (canvas.height + 200) + cameraY - 100;
          ctx.beginPath();
          ctx.arc(starX, starY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Cyber grids
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.lineWidth = 1;
        for (let x = 40; x < canvas.width - 40; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, cameraY);
          ctx.lineTo(x, cameraY + canvas.height);
          ctx.stroke();
        }
      }

      // 3. Draw pegs/tiles with theme variants
      for (const peg of pegs) {
        if (peg.y > cameraY - 100 && peg.y < cameraY + canvas.height + 100) {
          if (peg.state === 'broken') continue;

          // If the peg is a slider, draw the wood slot track behind it first
          if (peg.isSlider) {
            // Shadow behind the track
            ctx.beginPath();
            ctx.moveTo(peg.minX!, peg.y + 1.5);
            ctx.lineTo(peg.maxX!, peg.y + 1.5);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Elegant wood slider bar slot
            ctx.beginPath();
            ctx.moveTo(peg.minX!, peg.y);
            ctx.lineTo(peg.maxX!, peg.y);
            ctx.strokeStyle = '#8a6e54'; // warm wood track
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Inner dark slot groove line
            ctx.beginPath();
            ctx.moveTo(peg.minX!, peg.y);
            ctx.lineTo(peg.maxX!, peg.y);
            ctx.strokeStyle = '#5c4632'; // dark slot groove
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Wood end blocks stops
            ctx.fillStyle = '#5c3a21';
            ctx.fillRect(peg.minX! - 4, peg.y - 7, 4, 14);
            ctx.fillRect(peg.maxX!, peg.y - 7, 4, 14);

            // Light metallic bracket details on end stops
            ctx.fillStyle = '#d1d5db';
            ctx.fillRect(peg.minX! - 3, peg.y - 4, 2, 8);
            ctx.fillRect(peg.maxX! + 1, peg.y - 4, 2, 8);
          } else if (peg.isVerticalSlider) {
            // If the peg is a vertical slider, draw the vertical slot pole behind it first
            // Shadow behind the pole
            ctx.beginPath();
            ctx.moveTo(peg.x + 1.5, peg.minY!);
            ctx.lineTo(peg.x + 1.5, peg.maxY!);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Elegant wood vertical slot pole (bamboo-like or metal-like based on theme)
            ctx.beginPath();
            ctx.moveTo(peg.x, peg.minY!);
            ctx.lineTo(peg.x, peg.maxY!);
            if (currentTheme === 'castle') {
              ctx.strokeStyle = '#8a6e54'; // warm wood track
            } else if (currentTheme === 'ninja') {
              ctx.strokeStyle = '#3f6212'; // dark bamboo green pole
            } else {
              ctx.strokeStyle = '#0891b2'; // cyber neon cyan rod
            }
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Inner groove line
            ctx.beginPath();
            ctx.moveTo(peg.x, peg.minY!);
            ctx.lineTo(peg.x, peg.maxY!);
            if (currentTheme === 'castle') {
              ctx.strokeStyle = '#5c4632'; // dark slot groove
            } else if (currentTheme === 'ninja') {
              ctx.strokeStyle = '#1e293b'; // dark slate
            } else {
              ctx.strokeStyle = '#0e7490'; // neon dark cyan groove
            }
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.stroke();

            // End stops
            ctx.fillStyle = currentTheme === 'castle' ? '#5c3a21' : currentTheme === 'ninja' ? '#1e293b' : '#0e7490';
            ctx.fillRect(peg.x - 7, peg.minY! - 4, 14, 4);
            ctx.fillRect(peg.x - 7, peg.maxY!, 14, 4);
          }

          // Outer glowing ring
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, peg.radius + 6, 0, Math.PI * 2);
          if (currentTheme === 'castle') {
            ctx.strokeStyle = peg.type === 'blue' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)';
          } else if (currentTheme === 'ninja') {
            ctx.strokeStyle = peg.type === 'blue' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)';
          } else {
            ctx.strokeStyle = peg.type === 'blue' ? 'rgba(236, 72, 153, 0.25)' : 'rgba(168, 85, 247, 0.25)';
          }
          ctx.lineWidth = 4;
          ctx.stroke();

          // Body fill
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
          if (currentTheme === 'castle') {
            ctx.fillStyle = peg.type === 'blue' ? '#3b82f6' : '#ef4444';
            ctx.shadowColor = peg.type === 'blue' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)';
          } else if (currentTheme === 'ninja') {
            ctx.fillStyle = peg.type === 'blue' ? '#10b981' : '#f59e0b';
            ctx.shadowColor = peg.type === 'blue' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)';
          } else {
            ctx.fillStyle = peg.type === 'blue' ? '#ec4899' : '#a855f7';
            ctx.shadowColor = peg.type === 'blue' ? 'rgba(236, 72, 153, 0.5)' : 'rgba(168, 85, 247, 0.5)';
          }
          ctx.shadowBlur = 8;
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          // Inner badge
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          let badge = '🐾';
          if (currentTheme === 'ninja') {
            badge = peg.type === 'blue' ? '🌸' : '🎋';
          } else if (currentTheme === 'space') {
            badge = peg.type === 'blue' ? '👾' : '🛸';
          }
          ctx.fillText(badge, peg.x, peg.y);

          // Red shrinking circular timer
          if (peg.type === 'red' && peg.state === 'active') {
            ctx.beginPath();
            ctx.arc(peg.x, peg.y, peg.radius + 4, -Math.PI / 2, -Math.PI / 2 + (peg.timer / 3.0) * Math.PI * 2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
      }

      // 4. Draw golden coins (exact cartoon hexagonal style matching reference image)
      for (const coin of coins) {
        if (!coin.collected && coin.y > cameraY - 100 && coin.y < cameraY + canvas.height + 100) {
          const bounce = Math.sin((Date.now() / 220) + coin.animOffset) * 3;
          const cx = coin.x;
          const cy = coin.y + bounce;
          const r = coin.radius;

          // A) Draw outer hexagonal dark gold/orange border and shadow
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3 - Math.PI / 6; // vertex facing straight up
            const px = cx + r * Math.cos(angle);
            const py = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          // Hexagon drop shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2.5;

          // Hexagon dark amber outline border
          ctx.strokeStyle = '#d97706';
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.shadowColor = 'transparent'; // reset shadow
          ctx.shadowOffsetY = 0;

          // Hexagon body fill gradient
          const goldGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
          goldGrad.addColorStop(0, '#fbbf24'); // gold
          goldGrad.addColorStop(0.5, '#f59e0b'); // amber
          goldGrad.addColorStop(1, '#b45309'); // dark amber bottom reflection
          ctx.fillStyle = goldGrad;
          ctx.fill();

          // B) Draw inner inset smaller hexagon (light golden yellow)
          const innerR = r * 0.72;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3 - Math.PI / 6;
            const px = cx + innerR * Math.cos(angle);
            const py = cy + innerR * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          const innerGrad = ctx.createLinearGradient(cx - innerR, cy - innerR, cx + innerR, cy + innerR);
          innerGrad.addColorStop(0, '#fef08a'); // very bright yellow highlight reflection
          innerGrad.addColorStop(1, '#facc15'); // bright yellow-gold body
          ctx.fillStyle = innerGrad;
          ctx.fill();

          // Inner hexagon border
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1;
          ctx.stroke();

          // C) Sparkling center highlight (bead-like reflection)
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(cx - r * 0.22, cy - r * 0.22, r * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4.5 Draw animated coin collection particles & floating scores
      // A) Particles (4-pointed golden stars sparkles)
      for (const p of particles) {
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, Math.min(1.0, p.life));

        const cx = p.x;
        const cy = p.y;
        const s = p.size;

        ctx.moveTo(cx, cy - s);
        ctx.quadraticCurveTo(cx, cy, cx + s, cy);
        ctx.quadraticCurveTo(cx, cy, cx, cy + s);
        ctx.quadraticCurveTo(cx, cy, cx - s, cy);
        ctx.quadraticCurveTo(cx, cy, cx, cy - s);

        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1.0; // reset global alpha

      // B) Floating text scores (+100)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const f of floatingScores) {
        ctx.save();
        ctx.font = 'bold 15px sans-serif';

        // Shadow offset text
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, Math.min(1.0, f.life)) * 0.45})`;
        ctx.fillText(f.text, f.x + 1.5, f.y + 1.5);

        // Primary golden white text
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1.0, f.life))})`;
        ctx.strokeStyle = `rgba(217, 119, 6, ${Math.max(0, Math.min(1.0, f.life))})`; // gold/orange stroke outline
        ctx.lineWidth = 3.5;
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillText(f.text, f.x, f.y);
        ctx.restore();
      }

      // 5. Draw spiked obstacles / ninja throwing stars / cyber space mines
      for (const obs of obstacles) {
        if (obs.y > cameraY - 100 && obs.y < cameraY + canvas.height + 100) {
          ctx.save();
          ctx.translate(obs.x, obs.y);
          ctx.rotate(obs.angle);

          if (currentTheme === 'castle') {
            // A) Animated expanding warning field glow
            const pulse = Math.sin((Date.now() / 200) + obs.x) * 0.12 + 1.0;
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius * 2.2 * pulse, 0, Math.PI * 2);
            const warningGrad = ctx.createRadialGradient(0, 0, obs.radius * 0.8, 0, 0, obs.radius * 2.2 * pulse);
            warningGrad.addColorStop(0, 'rgba(239, 68, 68, 0.28)');
            warningGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.08)');
            warningGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = warningGrad;
            ctx.fill();

            // B) Red warning aura ring
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius * 1.4, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.lineWidth = 3;
            ctx.stroke();

            // C) Highly-polished pathogen spikes (8 spikes)
            const numSpikes = 8;
            for (let s = 0; s < numSpikes; s++) {
              ctx.rotate((Math.PI * 2) / numSpikes);

              // Spike stem/shaft (clinical needle look)
              ctx.beginPath();
              ctx.moveTo(-3, obs.radius - 2);
              ctx.lineTo(0, obs.radius + 12);
              ctx.lineTo(3, obs.radius - 2);
              ctx.closePath();

              const spikeGrad = ctx.createLinearGradient(-3, obs.radius, 3, obs.radius + 12);
              spikeGrad.addColorStop(0, '#ef4444');
              spikeGrad.addColorStop(0.7, '#f97316');
              spikeGrad.addColorStop(1, '#ea580c');
              ctx.fillStyle = spikeGrad;
              ctx.fill();

              // Shiny steel highlight on the left side of the spike stem
              ctx.beginPath();
              ctx.moveTo(-3, obs.radius - 2);
              ctx.lineTo(0, obs.radius + 12);
              ctx.lineTo(0, obs.radius - 2);
              ctx.closePath();
              ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
              ctx.fill();

              // Glowing hot biological/cyber node tip bead
              ctx.beginPath();
              ctx.arc(0, obs.radius + 13, 4, 0, Math.PI * 2);
              ctx.fillStyle = '#facc15'; // bright glowing yellow tip bead
              ctx.shadowColor = '#eab308';
              ctx.shadowBlur = 6;
              ctx.fill();
              ctx.shadowBlur = 0; // reset

              // Inner glow bead detail
              ctx.beginPath();
              ctx.arc(0, obs.radius + 13, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = '#ffffff';
              ctx.fill();
            }

            // D) 3D Glassmorphic Center Core Sphere
            const ballGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, obs.radius);
            ballGrad.addColorStop(0, '#fecaca'); // bright red-pink reflection center
            ballGrad.addColorStop(0.2, '#ef4444'); // primary red
            ballGrad.addColorStop(0.8, '#b91c1c'); // dark shadow red
            ballGrad.addColorStop(1, '#450a0a'); // deep crimson outline

            ctx.beginPath();
            ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
            ctx.fillStyle = ballGrad;
            ctx.shadowColor = 'rgba(220, 38, 38, 0.55)';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0; // reset

            // E) Glossy reflection crescent arc on top
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius - 2, Math.PI * 1.05, Math.PI * 1.95);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // F) Outer dark crimson ridge
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 2;
            ctx.stroke();

            // G) Blinking bright core warning bio-light
            const blinkRate = 200; // ms per flash
            const isLit = Math.floor(Date.now() / blinkRate) % 2 === 0;

            // Outer core light glow
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fillStyle = isLit ? 'rgba(253, 224, 71, 0.4)' : 'rgba(220, 38, 38, 0.2)';
            ctx.fill();

            // Inner core light center
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = isLit ? '#fde047' : '#7f1d1d';
            ctx.fill();
          } else if (currentTheme === 'ninja') {
            // SPINNING SHURIKEN (NINJA STAR)
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
            ctx.fill();

            ctx.fillStyle = '#94a3b8'; // steel body
            ctx.strokeStyle = '#475569'; // dark outline
            ctx.lineWidth = 1.5;

            for (let i = 0; i < 4; i++) {
              ctx.rotate(Math.PI / 2);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(-4, obs.radius * 0.4);
              ctx.lineTo(0, obs.radius * 1.5); // long razor tip
              ctx.lineTo(4, obs.radius * 0.4);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();

              // Sharp steel reflection highlight
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(0, obs.radius * 1.5);
              ctx.lineTo(4, obs.radius * 0.4);
              ctx.closePath();
              ctx.fillStyle = '#cbd5e1';
              ctx.fill();
            }

            // Center brass core ring
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#d97706';
            ctx.fill();
            ctx.stroke();

            // Center hollow rivet hole
            ctx.beginPath();
            ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#e2ecdb'; // matches the ninja bg
            ctx.fill();
            ctx.stroke();
          } else {
            // GLOWING SPACE MINE
            const pulse = Math.sin((Date.now() / 150) + obs.x) * 0.15 + 1.0;
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius * 2.0 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
            ctx.fill();

            // Spikes (neon rods)
            const spaceSpikes = 6;
            for (let s = 0; s < spaceSpikes; s++) {
              ctx.rotate((Math.PI * 2) / spaceSpikes);
              ctx.beginPath();
              ctx.moveTo(-2, 0);
              ctx.lineTo(0, obs.radius * 1.45);
              ctx.lineTo(2, 0);
              ctx.closePath();
              ctx.fillStyle = '#d946ef'; // Neon Magenta
              ctx.fill();

              // Spiked sensor tips
              ctx.beginPath();
              ctx.arc(0, obs.radius * 1.45, 3, 0, Math.PI * 2);
              ctx.fillStyle = '#06b6d4'; // Cyan tip
              ctx.fill();
            }

            // Center fusion core
            const mineGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, obs.radius);
            mineGrad.addColorStop(0, '#f3e8ff');
            mineGrad.addColorStop(0.3, '#c084fc');
            mineGrad.addColorStop(1, '#581c87');
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
            ctx.fillStyle = mineGrad;
            ctx.fill();

            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glass shiny glare
            ctx.beginPath();
            ctx.arc(0, 0, obs.radius - 2, Math.PI * 1.1, Math.PI * 1.9);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          ctx.restore();
        }
      }

      // 5.5 Draw Theme Transition Banners in the camera view!
      if (-cameraY > 750 && -cameraY < 950) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(50, -850, canvas.width - 100, 48);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, -850, canvas.width - 100, 48);

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#10b981'; // bright emerald green
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎋 ENTERED BAMBOO DOJO FOREST 🎋', canvas.width / 2, -826);
        ctx.restore();
      } else if (-cameraY > 1750 && -cameraY < 1950) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(50, -1850, canvas.width - 100, 48);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, -1850, canvas.width - 100, 48);

        ctx.font = 'bold 13px sans-serif';
        ctx.fillStyle = '#22d3ee'; // bright cyan
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛸 ENTERED CYBER DEEP SPACE 🛸', canvas.width / 2, -1826);
        ctx.restore();
      }

      // 5.6 Draw slingshot rubber band lines when dragging Tom
      if (isDragging && tom.attachedPegId !== null) {
        const anchor = pegs.find((p) => p.id === tom.attachedPegId);
        if (anchor) {
          ctx.beginPath();
          // Draw elastic bands from peg anchor to Tom's hands
          ctx.moveTo(anchor.x - 8, anchor.y);
          ctx.lineTo(tom.x - 6, tom.y);
          ctx.moveTo(anchor.x + 8, anchor.y);
          ctx.lineTo(tom.x + 6, tom.y);

          ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      // 6. Draw Tom the Cat with dynamic themed costumes!
      ctx.save();
      ctx.translate(tom.x, tom.y);

      let catColor = '#7e868c';
      let earColor = '#7e868c';
      let eyeColor = '#22c55e';
      let innerEarColor = '#fda4af';

      if (currentTheme === 'ninja') {
        catColor = '#1e293b'; // ninja slate-black
        earColor = '#1e293b';
        innerEarColor = '#475569';
        eyeColor = '#ef4444'; // glowing red ninja eyes
      } else if (currentTheme === 'space') {
        catColor = '#64748b'; // suit silver
        earColor = '#64748b';
        eyeColor = '#06b6d4'; // cosmic cyan eyes
      }

      // Left Ear
      ctx.beginPath();
      ctx.moveTo(-14, -10);
      ctx.lineTo(-22, -28);
      ctx.lineTo(-4, -16);
      ctx.fillStyle = earColor;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-12, -12);
      ctx.lineTo(-18, -24);
      ctx.lineTo(-6, -16);
      ctx.fillStyle = innerEarColor;
      ctx.fill();

      // Right Ear
      ctx.beginPath();
      ctx.moveTo(14, -10);
      ctx.lineTo(22, -28);
      ctx.lineTo(4, -16);
      ctx.fillStyle = earColor;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(12, -12);
      ctx.lineTo(18, -24);
      ctx.lineTo(6, -16);
      ctx.fillStyle = innerEarColor;
      ctx.fill();

      // Head body
      ctx.beginPath();
      ctx.arc(0, 0, tom.radius, 0, Math.PI * 2);
      ctx.fillStyle = catColor;
      ctx.fill();

      // Ninja headband
      if (currentTheme === 'ninja') {
        ctx.beginPath();
        ctx.arc(0, 0, tom.radius, Math.PI * 1.15, Math.PI * 1.85);
        ctx.lineTo(tom.radius * Math.cos(Math.PI * 1.85), -6);
        ctx.arc(0, 0, tom.radius, Math.PI * 1.85, Math.PI * 1.15, true);
        ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();

        // Blowing red ribbons
        ctx.beginPath();
        ctx.moveTo(-tom.radius + 1, -2);
        ctx.quadraticCurveTo(-tom.radius - 12, -8, -tom.radius - 8, -16);
        ctx.quadraticCurveTo(-tom.radius - 8, -6, -tom.radius - 1, -3);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
      }

      // Left Eye
      ctx.beginPath();
      ctx.arc(-6, -3, 5, 0, Math.PI * 2);
      ctx.fillStyle = eyeColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-6, -3, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-7.5, -4.5, 1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Right Eye
      ctx.beginPath();
      ctx.arc(6, -3, 5, 0, Math.PI * 2);
      ctx.fillStyle = eyeColor;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(6, -3, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(4.5, -4.5, 1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Muzzle & whiskers
      if (currentTheme !== 'ninja') {
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(-3, -2);
        ctx.lineTo(3, -2);
        ctx.fillStyle = innerEarColor;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, 2); ctx.lineTo(-18, 1);
        ctx.moveTo(-8, 4); ctx.lineTo(-19, 5);
        ctx.moveTo(8, 2); ctx.lineTo(18, 1);
        ctx.moveTo(8, 4); ctx.lineTo(19, 5);
        ctx.stroke();
      } else {
        // Ninja face mask wrap lines
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-tom.radius + 3, 5);
        ctx.quadraticCurveTo(0, 12, tom.radius - 3, 5);
        ctx.stroke();
      }

      // Astronaut glass helmet bubble
      if (currentTheme === 'space') {
        ctx.beginPath();
        ctx.arc(0, -3, tom.radius + 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224, 242, 254, 0.28)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -3, tom.radius + 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -3, tom.radius + 5, Math.PI * 1.05, Math.PI * 1.6);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      ctx.restore(); // restore translated state (Tom's translation)
      ctx.restore(); // restore translated state (Camera's translation)

      // 7. Draw themed side pillars
      if (currentTheme === 'castle') {
        // Left Pillar
        ctx.fillStyle = '#8a7968';
        ctx.fillRect(0, 0, 32, canvas.height);
        ctx.fillStyle = '#78695b';
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.fillRect(0, y, 32, 2);
          ctx.fillStyle = '#15803d';
          ctx.font = '9px Arial';
          ctx.fillText('🍃', 18, y + 15);
        }

        // Right Pillar
        ctx.fillStyle = '#8a7968';
        ctx.fillRect(canvas.width - 32, 0, 32, canvas.height);
        ctx.fillStyle = '#78695b';
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.fillRect(canvas.width - 32, y, 32, 2);
          ctx.fillStyle = '#15803d';
          ctx.font = '9px Arial';
          ctx.fillText('🍃', canvas.width - 24, y + 25);
        }
      } else if (currentTheme === 'ninja') {
        // BAMBOO COLUMNS
        // Left Bamboo
        ctx.fillStyle = '#4d7c0f'; // Dark bamboo green
        ctx.fillRect(0, 0, 32, canvas.height);
        ctx.fillStyle = '#365314'; // Bamboo nodes lines
        for (let y = 0; y < canvas.height; y += 60) {
          ctx.fillRect(0, y, 32, 3.5);
          ctx.fillStyle = '#10b981';
          ctx.font = '9px Arial';
          ctx.fillText('🎋', 18, y + 20);
        }

        // Right Bamboo
        ctx.fillStyle = '#4d7c0f';
        ctx.fillRect(canvas.width - 32, 0, 32, canvas.height);
        ctx.fillStyle = '#365314';
        for (let y = 0; y < canvas.height; y += 60) {
          ctx.fillRect(canvas.width - 32, y, 32, 3.5);
          ctx.fillStyle = '#10b981';
          ctx.font = '9px Arial';
          ctx.fillText('🎋', canvas.width - 24, y + 30);
        }
      } else {
        // CYBER NEON matrix columns
        // Left Column
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 32, canvas.height);
        ctx.strokeStyle = '#06b6d4'; // Cyan neon line
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(32, 0);
        ctx.lineTo(32, canvas.height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        for (let y = 0; y < canvas.height; y += 50) {
          const isLit = Math.floor((Date.now() + y) / 300) % 2 === 0;
          if (isLit) {
            ctx.fillRect(4, y + 10, 24, 8);
          }
          ctx.fillStyle = '#22d3ee';
          ctx.font = '9px Arial';
          ctx.fillText('✨', 18, y + 25);
        }

        // Right Column
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(canvas.width - 32, 0, 32, canvas.height);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(canvas.width - 32, 0);
        ctx.lineTo(canvas.width - 32, canvas.height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
        for (let y = 0; y < canvas.height; y += 50) {
          const isLit = Math.floor((Date.now() + y + 200) / 300) % 2 === 0;
          if (isLit) {
            ctx.fillRect(canvas.width - 28, y + 10, 24, 8);
          }
          ctx.fillStyle = '#22d3ee';
          ctx.font = '9px Arial';
          ctx.fillText('✨', canvas.width - 24, y + 35);
        }
      }

      animationId = requestAnimationFrame(render);
    };

    if (gameState === 'playing') {
      render();
    } else {
      // Draw standard landing/GameOver screen on canvas
      ctx.fillStyle = '#f8faf8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // columns
      ctx.fillStyle = '#8a7968';
      ctx.fillRect(0, 0, 32, canvas.height);
      ctx.fillRect(canvas.width - 32, 0, 32, canvas.height);

      const centerX = canvas.width / 2;

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';

      if (gameState === 'start') {
        ctx.fillText('Tom Clinger', centerX, 240);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText('Stretch & Fling Tom Upward!', centerX, 285);
        ctx.fillText('Blue tiles = Stable', centerX, 315);
        ctx.fillText('Red tiles = 3s Timer!', centerX, 335);
        ctx.fillText('Avoid spiked spinning bio-nodes!', centerX, 355);

        // draw cute Tom head in center
        const tomHeadY = 450;
        ctx.beginPath();
        ctx.arc(centerX, tomHeadY, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#7e868c';
        ctx.fill();
        // ears
        ctx.beginPath();
        ctx.moveTo(centerX - 20, tomHeadY - 10); ctx.lineTo(centerX - 30, tomHeadY - 35); ctx.lineTo(centerX - 7, tomHeadY - 20); ctx.fillStyle = '#7e868c'; ctx.fill();
        ctx.beginPath();
        ctx.moveTo(centerX + 20, tomHeadY - 10); ctx.lineTo(centerX + 30, tomHeadY - 35); ctx.lineTo(centerX + 7, tomHeadY - 20); ctx.fillStyle = '#7e868c'; ctx.fill();
        // eyes
        ctx.beginPath();
        ctx.arc(centerX - 8, tomHeadY - 5, 6, 0, Math.PI * 2); ctx.fillStyle = '#22c55e'; ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX - 8, tomHeadY - 5, 3, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 8, tomHeadY - 5, 6, 0, Math.PI * 2); ctx.fillStyle = '#22c55e'; ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + 8, tomHeadY - 5, 3, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill();
      } else if (gameState === 'gameover') {
        ctx.fillText('Game Over', centerX, 240);
        ctx.font = '18px sans-serif';
        ctx.fillStyle = '#475569';
        ctx.fillText(`Score: ${gameScore}`, centerX, 295);

        if (gameScore > highScore) {
          setHighScore(gameScore);
          ctx.font = 'bold 13px sans-serif';
          ctx.fillStyle = '#158a7c';
          ctx.fillText('★ NEW HIGH SCORE! ★', centerX, 345);
        } else {
          ctx.fillText(`High Score: ${highScore}`, centerX, 345);
        }
      }
    }

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleMouseDown);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchcancel', handleMouseUp);
    };
  }, [gameState, highScore, themeOverride]);

  // Restart the game
  const handleStartGame = () => {
    setGameState('playing');
  };

  return (
    <>
      {/* ── Pill navbar ── */}
      <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <div className="w-full max-w-[860px] bg-white rounded-full shadow-[0_2px_20px_rgba(0,0,0,0.10)] border border-gray-100 px-5 h-[58px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
            <span className="text-[16px] font-bold text-gray-900 tracking-tight">EHR Copilot</span>
          </Link>

          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-gray-400 font-medium">New Session</span>
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-semibold text-green-600">Processing</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session</span>
            <span className="text-[11px] font-mono font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full truncate max-w-[160px]">
              {sessionId}
            </span>
          </div>
        </div>
      </header>

      {/* ── Main content (2-Column Layout) ── */}
      <main className="min-h-screen flex items-center justify-center px-6 pt-28 pb-10" style={{ background: '#f8faf8' }}>
        <div className="w-full max-w-[1100px] grid grid-cols-12 gap-8 items-stretch">

          {/* LEFT COLUMN: Countdown Timer + Clinical Steps (col-span-5) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-5 justify-center">

            {/* Countdown timer card */}
            <div className="bg-white rounded-2xl border border-slate-155 p-6 flex flex-col items-center shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-center animate-in fade-in duration-500">
              <span className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 mb-2">Estimated processing time remaining</span>
              <div className="text-[64px] font-black tracking-tight text-slate-800 font-mono leading-none bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                {formatTimer()}
              </div>
              <p className="text-[12.5px] text-slate-500 mt-3 font-medium leading-relaxed max-w-[280px]">
                Your clinician dashboard will automatically load once processing is complete.
              </p>
            </div>

            {/* Clinical agents pipeline card */}
            <div className="bg-white rounded-2xl border border-slate-155 overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] animate-in fade-in duration-500">

              {/* Card Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Processing progress</span>
                  <span className="text-[11.5px] font-bold text-slate-700">{completedCount}/{AGENTS.length} complete</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-in-out"
                    style={{
                      width: `${progressPct}%`,
                      background: allDone
                        ? '#158a7c'
                        : 'linear-gradient(90deg, #158a7c 0%, #10b981 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Pipeline steps */}
              <div className="px-6 py-5 space-y-0.5">
                {AGENTS.map((agent, i) => (
                  <PipelineStep
                    key={agent.key}
                    agent={agent}
                    status={statuses[agent.key] ?? 'pending'}
                    isLast={i === AGENTS.length - 1}
                    index={i}
                  />
                ))}
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: Larger Tablet / Bezel Device Enclosed Canvas Game (col-span-7) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col items-center justify-center animate-in fade-in duration-700 delay-100">

            {/* Device container mockup bezel (Increased size to max-w-[500px] and h-[720px]!) */}
            <div className="relative w-full max-w-[500px] h-[720px] rounded-[42px] bg-[#0c100e] border-[8px] border-slate-900 shadow-[0_12px_45px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col items-center justify-center group">

              {/* Notch top bar detail */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-32 h-4.5 rounded-full bg-slate-900 z-50 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-800 mr-2.5" />
                <span className="w-10 h-1 rounded-full bg-slate-800" />
              </div>

              {/* Game Canvas */}
              <canvas
                ref={canvasRef}
                className="w-full h-full block bg-[#f8faf8] cursor-grab active:cursor-grabbing"
              />

              {/* Absolute overlay elements for UI */}
              {gameState === 'playing' && (
                <div className="absolute top-8 left-6 right-6 z-40 flex items-center justify-between select-none pointer-events-none">
                  {/* Score */}
                  <div className="bg-slate-950/80 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 shadow flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                    <span className="text-[14px] font-black text-white font-mono leading-none">{score}</span>
                  </div>

                  {/* High Score */}
                  <div className="bg-slate-950/80 backdrop-blur border border-white/10 rounded-full px-4 py-1.5 shadow flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">High</span>
                    <span className="text-[14px] font-black text-white font-mono leading-none">{highScore}</span>
                  </div>
                </div>
              )}

              {gameState !== 'playing' && (
                <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                  <span className="text-[12px] font-bold text-green-400 uppercase tracking-widest bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full mb-6">
                    {gameState === 'start' ? 'Interactive Mini-Game' : 'Game Over'}
                  </span>

                  <h3 className="text-[32px] font-black text-white tracking-tight leading-none mb-2">
                    {gameState === 'start' ? 'Tom Clinger' : 'Rest in Peace'}
                  </h3>

                  <p className="text-[13px] text-slate-300 leading-relaxed max-w-[240px] mb-8">
                    {gameState === 'start'
                      ? 'Stretch and fling Tom upwards to climb the castle! Avoid spiked obstacles and timered red pegs.'
                      : `You climbed high and collected coins, but Tom fell down. Total Score: ${score}`}
                  </p>

                  <button
                    onClick={handleStartGame}
                    className="bg-green-600 hover:bg-green-500 text-white text-[14px] font-extrabold px-8 py-3.5 rounded-full transition-transform active:scale-95 shadow-[0_4px_20px_rgba(22,163,74,0.3)] cursor-pointer"
                  >
                    {gameState === 'start' ? 'Play Game' : 'Try Again'}
                  </button>
                </div>
              )}

            </div>

            {/* Swipe instruction below screen */}
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">
              Touch/Click anywhere to stretch &amp; launch Tom!
            </p>

            {/* Theme Quick Selector (Toggle Button) */}
            <div className="mt-4 bg-white/95 backdrop-blur border border-slate-200/60 rounded-2xl px-5 py-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] flex flex-col items-center gap-2 animate-in fade-in duration-300">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dev Preview: Toggle Theme</span>
              <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200/30">
                {(['auto', 'castle', 'ninja', 'space'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setThemeOverride(t)}
                    className={`px-3.5 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 select-none cursor-pointer ${
                      themeOverride === t
                        ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] scale-[1.03]'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>
    </>
  );
}

export default AgentProgress;
