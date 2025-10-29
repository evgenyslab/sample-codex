import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export function useScanProgress() {
  const wsRef = useRef(null)
  const toastIdRef = useRef(null)
  const queryClient = useQueryClient()

  const startScan = useCallback((folderPaths) => {
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close()
    }

    // Determine WebSocket URL
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = import.meta.env.VITE_API_URL
      ? new URL(import.meta.env.VITE_API_URL).host
      : 'localhost:8000'

    const wsUrl = `${wsProtocol}//${wsHost}/api/folders/ws/scan`

    // Create WebSocket connection
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log('WebSocket connected')
      // Send scan request
      ws.send(JSON.stringify({ paths: folderPaths }))

      // Show initial toast
      toastIdRef.current = toast.loading('Starting scan...', {
        duration: Infinity,
        position: 'bottom-right',
      })
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'progress') {
          const { phase, progress, message } = data
          const phaseLabel = phase === 'scanning' ? 'Scanning' : 'Processing'

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
              id: toastIdRef.current,
              duration: Infinity,
              position: 'bottom-right',
            }
          )
        } else if (data.type === 'stats_update') {
          // Update stats in React Query cache
          if (data.stats) {
            // Update samples query
            queryClient.setQueryData(['samples'], (oldData) => {
              if (oldData?.pagination) {
                return {
                  ...oldData,
                  pagination: {
                    ...oldData.pagination,
                    total: data.stats.samples
                  }
                }
              }
              return oldData
            })

            // Update tags query
            queryClient.invalidateQueries(['tags'])

            // Update collections query
            queryClient.invalidateQueries(['collections'])

            // Update folders query
            queryClient.invalidateQueries(['folders'])
          }
        } else if (data.type === 'complete') {
          // Show success toast
          toast.success(data.message, {
            id: toastIdRef.current,
            duration: 3000,
            position: 'bottom-right',
          })

          // Close WebSocket
          ws.close()
          wsRef.current = null
        } else if (data.type === 'error') {
          // Show error toast
          toast.error(data.message, {
            id: toastIdRef.current,
            duration: 5000,
            position: 'bottom-right',
          })

          // Close WebSocket
          ws.close()
          wsRef.current = null
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      toast.error('Connection error. Please try again.', {
        id: toastIdRef.current,
        duration: 5000,
        position: 'bottom-right',
      })
    }

    ws.onclose = () => {
      console.log('WebSocket closed')
      wsRef.current = null
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close()
      }
    }
  }, [queryClient])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return { startScan }
}
