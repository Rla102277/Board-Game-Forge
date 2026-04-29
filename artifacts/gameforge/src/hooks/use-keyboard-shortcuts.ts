import { useEffect } from "react";

interface ShortcutHandlers {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      
      // Don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInputField = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      
      if (isInputField) return;

      // Cmd+K or Ctrl+K - Quick actions
      if (isCmdOrCtrl && e.key === 'k') {
        e.preventDefault();
        handlers['quickActions']?.();
      }

      // Cmd+/ or Ctrl+/ - Search
      if (isCmdOrCtrl && e.key === '/') {
        e.preventDefault();
        handlers['search']?.();
      }

      // Cmd+Shift+P - Command palette
      if (isCmdOrCtrl && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        handlers['commandPalette']?.();
      }

      // Number keys 1-9 for navigation
      if (!isCmdOrCtrl && !e.shiftKey && e.key >= '1' && e.key <= '9') {
        const section = parseInt(e.key);
        handlers[`nav${section}`]?.();
      }

      // Escape - Close dialogs/modals
      if (e.key === 'Escape') {
        handlers['escape']?.();
      }

      // Cmd+N or Ctrl+N - New project
      if (isCmdOrCtrl && e.key === 'n') {
        e.preventDefault();
        handlers['newProject']?.();
      }

      // Cmd+E or Ctrl+E - Quick create entity
      if (isCmdOrCtrl && e.key === 'e') {
        e.preventDefault();
        handlers['quickCreateEntity']?.();
      }

      // Cmd+R or Ctrl+R - Quick create rule
      if (isCmdOrCtrl && e.key === 'r') {
        e.preventDefault();
        handlers['quickCreateRule']?.();
      }

      // Cmd+T or Ctrl+T - Quick create task
      if (isCmdOrCtrl && e.key === 't') {
        e.preventDefault();
        handlers['quickCreateTask']?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
