import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

type RealtimeTable = 'support_tickets' | 'ticket_messages' | 'worksheets' | 'work_logs' | 'amc_responses';
type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeOptions {
  table: RealtimeTable;
  event?: RealtimeEvent;
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  showToast?: boolean;
  toastConfig?: {
    insertMessage?: string | ((payload: any) => string);
    updateMessage?: string | ((payload: any) => string);
    deleteMessage?: string | ((payload: any) => string);
  };
}

/**
 * Hook to subscribe to Supabase realtime updates for a specific table.
 * Use this hook in components to receive real-time updates and show notifications.
 * 
 * @example
 * useRealtime({
 *   table: 'support_tickets',
 *   event: 'INSERT',
 *   onInsert: (payload) => {
 *     setTickets(prev => [payload.new, ...prev]);
 *   },
 *   showToast: true,
 *   toastConfig: {
 *     insertMessage: 'New support ticket received!',
 *   }
 * });
 */
export function useRealtime(options: RealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const { table, event = '*', filter, onInsert, onUpdate, onDelete, showToast, toastConfig } = options;

    const channelName = `realtime-${table}-${Math.random().toString(36).substring(7)}`;
    
    let channel = supabase.channel(channelName);

    const subscriptionConfig: any = {
      event,
      schema: 'public',
      table,
    };

    if (filter) {
      subscriptionConfig.filter = filter;
    }

    channel = channel.on(
      'postgres_changes' as any,
      subscriptionConfig,
      (payload: any) => {
        const eventType = payload.eventType;

        switch (eventType) {
          case 'INSERT':
            onInsert?.(payload);
            if (showToast && toastConfig?.insertMessage) {
              const message = typeof toastConfig.insertMessage === 'function'
                ? toastConfig.insertMessage(payload)
                : toastConfig.insertMessage;
              toast.info(message, { icon: '🔔' });
            }
            break;
          case 'UPDATE':
            onUpdate?.(payload);
            if (showToast && toastConfig?.updateMessage) {
              const message = typeof toastConfig.updateMessage === 'function'
                ? toastConfig.updateMessage(payload)
                : toastConfig.updateMessage;
              toast.info(message, { icon: '🔄' });
            }
            break;
          case 'DELETE':
            onDelete?.(payload);
            if (showToast && toastConfig?.deleteMessage) {
              const message = typeof toastConfig.deleteMessage === 'function'
                ? toastConfig.deleteMessage(payload)
                : toastConfig.deleteMessage;
              toast.info(message, { icon: '🗑️' });
            }
            break;
        }
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to ${table}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error subscribing to ${table}`);
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [options.table, options.filter]);

  return channelRef;
}

/**
 * Hook specifically for support ticket notifications
 */
export function useTicketNotifications(callbacks: {
  onNewTicket?: (ticket: any) => void;
  onTicketUpdate?: (ticket: any) => void;
  onNewMessage?: (message: any) => void;
}) {
  // Subscribe to new tickets
  useRealtime({
    table: 'support_tickets',
    event: 'INSERT',
    onInsert: (payload) => {
      callbacks.onNewTicket?.(payload.new);
    },
    showToast: true,
    toastConfig: {
      insertMessage: (payload) => `New ticket: ${payload.new?.subject || 'Support request'}`,
    },
  });

  // Subscribe to ticket updates
  useRealtime({
    table: 'support_tickets',
    event: 'UPDATE',
    onUpdate: (payload) => {
      callbacks.onTicketUpdate?.(payload.new);
    },
    showToast: true,
    toastConfig: {
      updateMessage: (payload) => `Ticket updated: ${payload.new?.subject || 'Support request'}`,
    },
  });

  // Subscribe to new messages
  useRealtime({
    table: 'ticket_messages',
    event: 'INSERT',
    onInsert: (payload) => {
      callbacks.onNewMessage?.(payload.new);
    },
    showToast: true,
    toastConfig: {
      insertMessage: 'New message received',
    },
  });
}

/**
 * Hook specifically for worksheet notifications
 */
export function useWorksheetNotifications(callbacks: {
  onNewWorksheet?: (worksheet: any) => void;
  onWorksheetUpdate?: (worksheet: any) => void;
  onNewWorkLog?: (log: any) => void;
}) {
  // Subscribe to worksheet updates
  useRealtime({
    table: 'worksheets',
    event: '*',
    onInsert: (payload) => {
      callbacks.onNewWorksheet?.(payload.new);
    },
    onUpdate: (payload) => {
      callbacks.onWorksheetUpdate?.(payload.new);
    },
    showToast: true,
    toastConfig: {
      insertMessage: 'New worksheet created',
      updateMessage: (payload) => {
        const status = payload.new?.status;
        if (status === 'approved') return '✅ Worksheet approved';
        if (status === 'rejected') return '❌ Worksheet rejected';
        if (status === 'pending_approval') return '📝 Worksheet pending approval';
        return 'Worksheet updated';
      },
    },
  });

  // Subscribe to work logs
  useRealtime({
    table: 'work_logs',
    event: 'INSERT',
    onInsert: (payload) => {
      callbacks.onNewWorkLog?.(payload.new);
    },
    showToast: true,
    toastConfig: {
      insertMessage: 'New work log added',
    },
  });
}

/**
 * Hook specifically for AMC order notifications
 */
export function useOrderNotifications(callbacks: {
  onNewOrder?: (order: any) => void;
  onOrderUpdate?: (order: any) => void;
}) {
  useRealtime({
    table: 'amc_responses',
    event: '*',
    onInsert: (payload) => {
      callbacks.onNewOrder?.(payload.new);
    },
    onUpdate: (payload) => {
      callbacks.onOrderUpdate?.(payload.new);
    },
    showToast: true,
    toastConfig: {
      insertMessage: (payload) => `New AMC order from ${payload.new?.full_name || 'customer'}`,
      updateMessage: (payload) => {
        const status = payload.new?.status;
        if (status === 'active') return '✅ Order activated';
        if (status === 'inactive') return 'Order marked inactive';
        return 'Order updated';
      },
    },
  });
}
