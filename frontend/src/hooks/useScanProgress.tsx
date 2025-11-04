import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import type { WebSocketMessage } from '../types';

interface PaginatedSamplesData {
  pagination?: {
    total: number;
    page: number;
    page_size: number;
  };
  samples?: unknown[];
}

export function useScanProgress() {
  const wsRef = useRef<WebSocket | null>(null);
  const toastIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  const startScan = useCallback((folderPaths: string[]) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Determine WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // If VITE_API_URL is relative (like '/api'), use current host
    // Otherwise parse the full URL to get the host
    let wsHost: string;
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl || apiUrl.startsWith('/')) {
      wsHost = window.location.host;
    } else {
      wsHost = new URL(apiUrl).host;
    }

    const wsUrl = `${wsProtocol}//${wsHost}/api/folders/ws/scan`;

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send scan request
      ws.send(JSON.stringify({ paths: folderPaths }));

      // Show initial toast
      toastIdRef.current = toast.loading('Starting scan...', {
        duration: Infinity,
        position: 'bottom-right',
      });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;

        if (data.type === 'progress') {
          const { phase, progress, message } = data;
          const phaseLabel = phase === 'scanning' ? 'Scanning' : 'Processing';

          // Update toast with progress
          toast.loading(
            <div>
              <div className="font-medium">{phaseLabel} files...</div>
              <div className="text-xs text-muted-foreground mt-1">{message}</div>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                <div
                  className="bg-foreground h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>,
            {
              id: toastIdRef.current || undefined,
              duration: Infinity,
              position: 'bottom-right',
            }
          );
        } else if (data.type === 'stats_update') {
          // Update stats in React Query cache
          if (data.stats) {
            // Update samples query
            queryClient.setQueryData<PaginatedSamplesData>(['samples'], (oldData) => {
              if (oldData?.pagination) {
                return {
                  ...oldData,
                  pagination: {
                    ...oldData.pagination,
                    total: data.stats.samples
                  }
                };
              }
              return oldData;
            });

            // Update tags query
            queryClient.invalidateQueries({ queryKey: ['tags'] });

            // Update collections query
            queryClient.invalidateQueries({ queryKey: ['collections'] });

            // Update folders query
            queryClient.invalidateQueries({ queryKey: ['folders'] });
          }
        } else if (data.type === 'refresh_folders') {
          // Refetch folder metadata (folder tree in sidebar)
          queryClient.invalidateQueries({ queryKey: ['folders-metadata'] });
          queryClient.refetchQueries({ queryKey: ['folders-metadata'] });
        } else if (data.type === 'complete') {
          // Show success toast
          toast.success(data.message, {
            id: toastIdRef.current || undefined,
            duration: 3000,
            position: 'bottom-right',
          });

          // Refetch all data to show new samples (using refetchQueries for more aggressive refresh)
          queryClient.refetchQueries({ queryKey: ['samples'] });
          queryClient.refetchQueries({ queryKey: ['samples-all'] });
          queryClient.refetchQueries({ queryKey: ['tags'] });
          queryClient.refetchQueries({ queryKey: ['collections'] });
          queryClient.refetchQueries({ queryKey: ['folders'] });

          // Close WebSocket
          ws.close();
          wsRef.current = null;
        } else if (data.type === 'error') {
          // Show error toast
          toast.error(data.message, {
            id: toastIdRef.current || undefined,
            duration: 5000,
            position: 'bottom-right',
          });

          // Close WebSocket
          ws.close();
          wsRef.current = null;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
      toast.error('Connection error. Please try again.', {
        id: toastIdRef.current || undefined,
        duration: 5000,
        position: 'bottom-right',
      });
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      wsRef.current = null;
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { startScan };
}
