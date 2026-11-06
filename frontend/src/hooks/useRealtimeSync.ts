import { useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "../services/supabaseClient";

interface RealtimeSyncOptions {
  tables: string[];
  onSync: (table: string, eventType: string, payload: any) => void;
  enabled?: boolean;
}

export function useRealtimeSync({ tables, onSync, enabled = true }: RealtimeSyncOptions) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    if (!enabled) return;

    // 1. Cross-tab BroadcastChannel listener for immediate local multi-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel("dmhs_sync_channel");
        bc.onmessage = (event) => {
          const { table, eventType, data } = event.data || {};
          if (table && (tables.includes(table) || tables.includes("*"))) {
            onSyncRef.current(table, eventType || "UPDATE", data);
          }
        };
      }
    } catch {}

    // 2. Window event listener for immediate same-tab mutations
    const handleLocalMutation = (e: any) => {
      const { table, eventType, data } = e.detail || {};
      if (table && (tables.includes(table) || tables.includes("*"))) {
        onSyncRef.current(table, eventType || "UPDATE", data);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("dmhs_data_mutation", handleLocalMutation);
    }

    // 3. Supabase Realtime subscription for cross-session database sync
    let channels: any[] = [];
    if (isSupabaseConfigured()) {
      channels = tables.map((tableName) => {
        const channelName = `dmhs_rt_${tableName}_${Math.random().toString(36).substring(2, 7)}`;
        return supabase
          .channel(channelName)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: tableName },
            (payload) => {
              onSyncRef.current(tableName, payload.eventType, payload);
            }
          )
          .subscribe();
      });
    }

    return () => {
      if (bc) {
        bc.close();
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("dmhs_data_mutation", handleLocalMutation);
      }
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [enabled, tables.join(",")]);
}
