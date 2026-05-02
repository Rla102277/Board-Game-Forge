import { useEffect, useRef, useState } from "react";
import {
  useGetUserArtifact,
  useUpdateUserArtifact,
} from "@workspace/api-client-react";

/**
 * Hook for per-user artifacts that live in the `user_artifacts` table.
 * Mirrors `useDesignerArtifact` but is scoped to the signed-in user
 * instead of a project. Used for cross-project user state such as
 * Learn chat history, Bible chapter completion, and Design-101 progress.
 *
 * Behavior:
 *  - On mount, fetches the artifact for the current user from the server.
 *  - One-time legacy import: if the server returns an empty artifact (`{}`)
 *    and `legacyKey()` returns a non-empty localStorage value, that value is
 *    pushed to the server and the localStorage key is then removed.
 *  - `setState` is synchronous + debounced: the in-memory state updates
 *    immediately, and the server is updated 500ms after the last change.
 *
 * Generic T must be a JSON-serializable object (matches the JSONB column).
 */
export function useUserArtifact<T extends object>(
  kind: string,
  getDefault: () => T,
  legacyKey?: () => string,
  legacyImport?: () => T | null,
  legacyCleanup?: () => void,
): {
  state: T;
  setState: (next: T | ((prev: T) => T)) => void;
  isLoading: boolean;
  isSaving: boolean;
} {
  const { data: serverRow, isLoading } = useGetUserArtifact(kind);
  const updateMutation = useUpdateUserArtifact();

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

    if (legacyImport) {
      try {
        const parsed = legacyImport();
        if (parsed && Object.keys(parsed as Record<string, unknown>).length > 0) {
          setStateRaw(parsed);
          updateMutation.mutate(
            { kind, data: { data: parsed as unknown as Record<string, unknown> } },
            {
              onSuccess: () => {
                lastSavedRef.current = JSON.stringify(parsed);
                if (legacyCleanup) {
                  try { legacyCleanup(); } catch { /* ignore */ }
                }
              },
            },
          );
          return;
        }
      } catch { /* ignore corrupt legacy data */ }
    }

    if (legacyKey) {
      try {
        const raw = localStorage.getItem(legacyKey());
        if (raw) {
          const parsed = JSON.parse(raw) as T;
          setStateRaw(parsed);
          updateMutation.mutate(
            { kind, data: { data: parsed as unknown as Record<string, unknown> } },
            {
              onSuccess: () => {
                try { localStorage.removeItem(legacyKey()); } catch { /* ignore */ }
                lastSavedRef.current = JSON.stringify(parsed);
              },
            },
          );
          return;
        }
      } catch { /* ignore corrupt legacy data */ }
    }

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
      if (serialized === lastSavedRef.current) return computed;
      lastSavedRef.current = serialized;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      const seq = ++saveSeqRef.current;
      setIsSaving(true);
      saveTimerRef.current = setTimeout(() => {
        updateMutation.mutate(
          { kind, data: { data: computed as unknown as Record<string, unknown> } },
          {
            onSettled: () => {
              if (seq === saveSeqRef.current) setIsSaving(false);
            },
          },
        );
      }, 500);

      return computed;
    });
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { state, setState, isLoading: isLoading && !hydratedRef.current, isSaving };
}
