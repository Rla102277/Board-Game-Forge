import { useEffect, useRef, useState } from "react";
import {
  useGetDesignerArtifact,
  useUpdateDesignerArtifact,
} from "@workspace/api-client-react";

/**
 * Hook for per-project designer artifacts that live in the
 * `designer_artifacts` table. Replaces the old localStorage-only pattern.
 *
 * Behavior:
 *  - On mount, fetches the artifact from the server.
 *  - One-time legacy import: if the server returns an empty artifact (`{}`)
 *    and `legacyKey` returns a non-empty localStorage value, that value is
 *    pushed to the server and the localStorage key is then removed.
 *  - `setState` is synchronous + debounced: the in-memory state updates
 *    immediately, and the server is updated 500ms after the last change.
 *
 * Generic T must be a JSON-serializable object (matches the JSONB column).
 */
export function useDesignerArtifact<T extends object>(
  projectId: number,
  kind: string,
  getDefault: () => T,
  legacyKey?: (projectId: number) => string,
  legacyImport?: (projectId: number) => T | null,
  legacyCleanup?: (projectId: number) => void,
): {
  state: T;
  setState: (next: T | ((prev: T) => T)) => void;
  isLoading: boolean;
  isSaving: boolean;
} {
  const { data: serverRow, isLoading, error: fetchError } = useGetDesignerArtifact(projectId, kind);
  const updateMutation = useUpdateDesignerArtifact();

  // Log fetch errors
  useEffect(() => {
    if (fetchError) {
      // eslint-disable-next-line no-console
      console.error(`[useDesignerArtifact:${kind}] Fetch error:`, fetchError);
    }
  }, [fetchError, kind]);

  const [state, setStateRaw] = useState<T>(getDefault);
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  const lastSavedRef = useRef<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Initial hydration from server (and one-time legacy import) ───────────
  useEffect(() => {
    if (hydratedRef.current) return;
    if (isLoading || !serverRow) return;
    hydratedRef.current = true;

    const data = serverRow.data as Record<string, unknown> | undefined;
    const isEmpty = !data || Object.keys(data).length === 0;

    if (!isEmpty) {
      setStateRaw(data as T);
      lastSavedRef.current = JSON.stringify(data);
      return;
    }

    // Server is empty — try custom multi-key legacy import first
    if (legacyImport) {
      try {
        const parsed = legacyImport(projectId);
        if (parsed && Object.keys(parsed as Record<string, unknown>).length > 0) {
          setStateRaw(parsed);
          updateMutation.mutate(
            { projectId, kind, data: { data: parsed as unknown as Record<string, unknown> } },
            {
              onSuccess: () => {
                lastSavedRef.current = JSON.stringify(parsed);
                if (legacyCleanup) {
                  try { legacyCleanup(projectId); } catch { /* ignore */ }
                }
              },
            },
          );
          return;
        }
      } catch { /* ignore corrupt legacy data */ }
    }

    // Server is empty — try legacy localStorage import
    if (legacyKey) {
      try {
        const raw = localStorage.getItem(legacyKey(projectId));
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          setStateRaw(parsed);
          // Push legacy data to server, then remove the localStorage key
          updateMutation.mutate(
            { projectId, kind, data: { data: parsed as unknown as Record<string, unknown> } },
            {
              onSuccess: () => {
                try { localStorage.removeItem(legacyKey(projectId)); } catch { /* ignore */ }
                lastSavedRef.current = JSON.stringify(parsed);
              },
            },
          );
          return;
        }
      } catch { /* ignore corrupt legacy data */ }
    }

    // No server data and no legacy data — start with the default
    const def = getDefault();
    setStateRaw(def);
    lastSavedRef.current = JSON.stringify(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, serverRow]);

  // ── Debounced server save on every state change ──────────────────────────
  const setState: typeof setStateRaw = (next) => {
    setStateRaw((prev) => {
      const computed = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      const serialized = JSON.stringify(computed);

      // Skip if unchanged
      if (serialized === lastSavedRef.current) return computed;
      lastSavedRef.current = serialized;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const seq = ++saveSeqRef.current;
      setIsSaving(true);
      saveTimerRef.current = setTimeout(() => {
        updateMutation.mutate(
          { projectId, kind, data: { data: computed as unknown as Record<string, unknown> } },
          {
            onSettled: () => {
              // Only clear isSaving if this is the most recent save
              if (seq === saveSeqRef.current) setIsSaving(false);
            },
            onError: (err) => {
              // eslint-disable-next-line no-console
              console.error(`[useDesignerArtifact:${kind}] Save error:`, err);
            },
          },
        );
      }, 500);

      return computed;
    });
  };

  // ── Cleanup pending save on unmount ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { state, setState, isLoading: isLoading && !hydratedRef.current, isSaving };
}
