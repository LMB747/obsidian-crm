import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export interface ShortcutConfig {
  onSearch?: () => void;
  onNew?: () => void;
  onEscape?: () => void;
}

// Navigation shortcuts: first key press activates "g" mode,
// second key press navigates to the target section.
const G_SHORTCUTS: Record<string, string> = {
  d: 'dashboard',
  c: 'clients',
  p: 'projects',
  f: 'freelancers',
  i: 'invoices',
  w: 'worktracking',
  a: 'analytics',
  s: 'settings',
};

export function useKeyboardShortcuts(config: ShortcutConfig = {}) {
  const { setActiveSection, setSearchQuery } = useStore();
  // We keep a ref so the effect doesn't re-register on every render
  const configRef = useRef(config);
  configRef.current = config;

  const gModeRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Cmd/Ctrl + K → focus search / open command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        configRef.current.onSearch?.();
        return;
      }

      // Escape → callback (only when not in an input)
      if (e.key === 'Escape' && !isInput) {
        configRef.current.onEscape?.();
        return;
      }

      // Cmd/Ctrl + F → clear search and focus it
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setSearchQuery('');
        configRef.current.onSearch?.();
        return;
      }

      // Don't handle navigation shortcuts when typing in inputs
      if (isInput) return;

      // "G" prefix navigation shortcuts
      if (gModeRef.current) {
        gModeRef.current = false;
        if (gTimerRef.current) clearTimeout(gTimerRef.current);

        const section = G_SHORTCUTS[e.key.toLowerCase()];
        if (section) {
          e.preventDefault();
          setActiveSection(section);
        }
        return;
      }

      // Press "g" to enter navigation mode
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        gModeRef.current = true;
        // Auto-cancel "g" mode after 1.5s if no second key
        gTimerRef.current = setTimeout(() => {
          gModeRef.current = false;
        }, 1500);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    };
  }, [setActiveSection, setSearchQuery]);
}
