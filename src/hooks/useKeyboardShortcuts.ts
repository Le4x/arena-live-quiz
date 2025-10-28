import { useEffect } from 'react';

export interface KeyboardShortcuts {
  onSpace?: () => void;
  onN?: () => void;
  onB?: () => void;
  onC?: () => void;
  onI?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          shortcuts.onSpace?.();
          break;
        case 'KeyN':
          e.preventDefault();
          shortcuts.onN?.();
          break;
        case 'KeyB':
          e.preventDefault();
          shortcuts.onB?.();
          break;
        case 'KeyC':
          e.preventDefault();
          shortcuts.onC?.();
          break;
        case 'KeyI':
          e.preventDefault();
          shortcuts.onI?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          shortcuts.onArrowLeft?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          shortcuts.onArrowRight?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}
