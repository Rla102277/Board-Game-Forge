/**
 * Real-time presence via Ably.
 * Fetches a token from our API, connects to Ably, and joins the presence
 * set for `presence:project-{projectId}`.
 *
 * Returns the list of currently-present users.
 */

import { useEffect, useRef, useState } from "react";
import * as Ably from "ably";
import type { PresenceUser } from "@/lib/collaboration-types";

async function getClerkToken(): Promise<string | null> {
  try {
    // @ts-ignore
    const clerk = window.Clerk;
    if (clerk?.session) return await clerk.session.getToken();
  } catch {}
  return null;
}

function apiBase(): string {
  const url = import.meta.env.VITE_API_URL;
  return url ? url.replace(/\/$/, "") : "";
}

async function fetchAblyTokenRequest(
  projectId: number,
  userName: string,
  avatarUrl: string | null,
): Promise<Ably.TokenRequest> {
  const token = await getClerkToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${apiBase()}/api/presence/token`, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify({ projectId, userName, avatarUrl }),
  });
  if (!res.ok) throw new Error("Failed to get presence token");
  const data = await res.json();
  return data.tokenRequest as Ably.TokenRequest;
}

export interface UseAblyPresenceOptions {
  projectId: number;
  userId: number;
  userName: string;
  avatarUrl: string | null;
  section?: string;
  enabled?: boolean;
}

export function useAblyPresence({
  projectId,
  userId,
  userName,
  avatarUrl,
  section,
  enabled = true,
}: UseAblyPresenceOptions): PresenceUser[] {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);
  const clientRef = useRef<Ably.Realtime | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !projectId || !userId) return;

    const ABLY_KEY = import.meta.env.VITE_ABLY_API_KEY as string | undefined;

    let ablyClient: Ably.Realtime;

    const connect = async () => {
      try {
        const clientOptions: Ably.ClientOptions = {
          clientId: String(userId),
        };

        if (ABLY_KEY) {
          clientOptions.key = ABLY_KEY;
        } else {
          clientOptions.authCallback = async (_tokenParams, callback) => {
            try {
              const tokenRequest = await fetchAblyTokenRequest(projectId, userName, avatarUrl);
              callback(null, tokenRequest);
            } catch (err) {
              callback(String(err), null);
            }
          };
        }

        ablyClient = new Ably.Realtime(clientOptions);
        clientRef.current = ablyClient;

        const channel = ablyClient.channels.get(`presence:project-${projectId}`);
        channelRef.current = channel;

        const presenceData = { userName, avatarUrl, section: section ?? null };

        await channel.presence.enter(presenceData);

        const updatePresence = async () => {
          try {
            const members = await channel.presence.get();
            setPresentUsers(
              members.map((m) => {
                const data = m.data as { userName?: string; avatarUrl?: string | null; section?: string | null };
                return {
                  userId: parseInt(m.clientId, 10),
                  userName: data?.userName ?? m.clientId,
                  avatarUrl: data?.avatarUrl ?? null,
                  cursorX: 0,
                  cursorY: 0,
                  section: data?.section ?? null,
                  lastSeen: new Date().toISOString(),
                };
              }),
            );
          } catch {}
        };

        channel.presence.subscribe(updatePresence);
        await updatePresence();
      } catch (err) {
        console.warn("Ably presence connection failed:", err);
      }
    };

    connect();

    return () => {
      if (channelRef.current) {
        channelRef.current.presence.leave().catch(() => {});
        channelRef.current.presence.unsubscribe();
      }
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
      channelRef.current = null;
    };
  }, [projectId, userId, enabled]);

  useEffect(() => {
    if (!channelRef.current || !userId) return;
    channelRef.current.presence
      .update({ userName, avatarUrl, section: section ?? null })
      .catch(() => {});
  }, [section, userName, avatarUrl, userId]);

  return presentUsers;
}
