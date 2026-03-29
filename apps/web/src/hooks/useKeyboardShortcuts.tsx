'use client';

import { useCallback, useEffect } from 'react';
import { useSessionStore, type SectionKey } from '@/lib/store/sessionStore';
import { useRouter } from 'next/navigation';


const SECTION_ORDER: SectionKey[] = ['risk_flags', 'subjective', 'objective', 'assessment', 'plan'];

interface UseKeyboardShortcutsOptions {
  onApprove?: () => void;
  onEdit?: () => void;
  onRevise?: () => void;
  onSubmitFeedback?: () => void;
  onCancel?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onApprove,
  onEdit,
  onRevise,
  onSubmitFeedback,
  onCancel,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}) {
  const { activeSection, setActiveSection, sectionStatuses } = useSessionStore();

  const navigateSection = useCallback(
    (direction: 'prev' | 'next') => {
      const idx = SECTION_ORDER.indexOf(activeSection);
      if (direction === 'next' && idx < SECTION_ORDER.length - 1) {
        const next = SECTION_ORDER[idx + 1];
        if (sectionStatuses[next] !== 'locked') setActiveSection(next);
      }
      if (direction === 'prev' && idx > 0) {
        setActiveSection(SECTION_ORDER[idx - 1]);
      }
    },
    [activeSection, sectionStatuses, setActiveSection]
  );

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in inputs/textareas
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === 'Escape') {
        onCancel?.();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        onSubmitFeedback?.();
        return;
      }

      // Block single-key shortcuts when in inputs
      if (isInput) return;

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        onApprove?.();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onEdit?.();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onRevise?.();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        navigateSection('next');
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        navigateSection('prev');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enabled, onApprove, onEdit, onRevise, onSubmitFeedback, onCancel, navigateSection]);
}

/** Small shortcut hint badge — shown next to action buttons */
export function ShortcutHint({ keys }: { keys: string }) {
  return (
    <kbd className="ml-1.5 hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-[#9CA3AF] bg-[#F3F4F6] border border-[#E5E7EB] rounded px-1 py-0.5 leading-none">
      {keys}
    </kbd>
  );
}
