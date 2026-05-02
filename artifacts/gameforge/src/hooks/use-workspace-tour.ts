import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "gameforge:workspace-tour-completed";

export function useWorkspaceTour(projectId: number) {
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const key = `${STORAGE_KEY}:${projectId}`;
    const completed = localStorage.getItem(key);
    if (!completed) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [projectId]);

  const startTour = useCallback(() => setShowTour(true), []);
  const completeTour = useCallback((projectIdVal: number) => {
    localStorage.setItem(`${STORAGE_KEY}:${projectIdVal}`, "true");
    setShowTour(false);
  }, []);
  const dismissTour = useCallback((projectIdVal: number) => {
    localStorage.setItem(`${STORAGE_KEY}:${projectIdVal}`, "skipped");
    setShowTour(false);
  }, []);

  return { showTour, startTour, completeTour, dismissTour };
}
