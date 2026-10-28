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
    if (!enabled || !isSupabaseConfigured()) return;

    const channels = tables.map((tableName) => {
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

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [enabled, tables.join(",")]);
}
