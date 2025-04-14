import { useEffect, useState, useRef } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '../supabase';

/**
 * A hook to subscribe to Supabase realtime changes
 * @param table The table to subscribe to
 * @param column The column to filter by (optional)
 * @param value The value of the column to filter by (optional)
 * @param event The event to listen for ('INSERT', 'UPDATE', 'DELETE', '*')
 * @param callback A callback to execute when an event is received
 * @returns An object with the channel and isConnected state
 */
export function useSupabaseRealtime(
  table: string,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*',
  column?: string,
  value?: string,
  callback?: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(callback);

  // Update the callback ref when the callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // Create a channel filtered by table name
    let subscription = supabase.channel(`public:${table}`);
    
    // Add filter if column and value are provided
    let filter = subscription
      .on(
        'postgres_changes' as any, 
        { 
          event: event, 
          schema: 'public', 
          table: table,
          ...(column && value ? { filter: `${column}=eq.${value}` } : {})
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          if (callbackRef.current) {
            callbackRef.current(payload);
          }
        }
      );

    // Subscribe to the channel
    filter
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    setChannel(filter);

    // Cleanup on unmount
    return () => {
      if (filter) {
        filter.unsubscribe();
      }
    };
  }, [table, column, value, event]); // Remove callback from dependency array

  return { channel, isConnected };
} 