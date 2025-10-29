import { CornerLeftUpIcon, FolderIcon, XIcon } from './ui/Icons'
import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { browseFolders } from '../services/api'
import { useScanProgress } from '../hooks/useScanProgress.jsx'

const FolderBrowserModal = ({ isOpen, onClose }) => {
  const [currentPath, setCurrentPath] = useState('')
  const [checkedFolders, setCheckedFolders] = useState([])
  const [isScanning, setIsScanning] = useState(false)
  const queryClient = useQueryClient()
  const { startScan } = useScanProgress()

  // Add escape key listener
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const { data: folderData, isLoading } = useQuery({
    queryKey: ['browse', currentPath],
    queryFn: async () => {
      const response = await browseFolders(currentPath || null)
      return response.data
    },
    enabled: isOpen,
  })

  useEffect(() => {
    if (isOpen && !currentPath) {
      // Will load home directory by default
      setCurrentPath('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleNavigate = (dirName) => {
    const newPath = folderData.path + '/' + dirName
    setCurrentPath(newPath)
    setCheckedFolders([]) // Clear checked folders when navigating
  }

  const handleGoUp = () => {
    if (folderData?.parent) {
      setCurrentPath(folderData.parent)
      setCheckedFolders([]) // Clear checked folders when navigating
    }
  }

  const handleFolderCheck = (dirName) => {
    setCheckedFolders(prev => {
      if (prev.includes(dirName)) {
        return prev.filter(f => f !== dirName)
      } else {
        return [...prev, dirName]
      }
    })
  }

  const handleConfirmSelection = () => {
    if (checkedFolders.length > 0 && !isScanning) {
      setIsScanning(true)

      // Convert checked folders to full paths
      const folderPaths = checkedFolders.map(dirName => folderData.path + '/' + dirName)

      // Start WebSocket scan
      startScan(folderPaths)

      // Wait a bit then close modal and refresh data
      setTimeout(() => {
        setIsScanning(false)
        setCheckedFolders([])
        onClose()

        // Refresh queries after scan starts
        queryClient.invalidateQueries(['folders'])
        queryClient.invalidateQueries(['samples'])
      }, 200)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-card backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col border-2 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-card px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-card-foreground">Select Folders to Scan</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Navigate to and select folders containing audio files
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Path & Controls */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoUp}
              disabled={!folderData?.parent}
              className="p-2 rounded-md transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
              title="Go up one folder"
            >
              <CornerLeftUpIcon className="w-4 h-4" />
            </button>
            <div className="flex-1 px-3 py-2 bg-card border border-input rounded-md text-xs font-mono overflow-x-auto whitespace-nowrap text-card-foreground">
              {folderData?.path || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-card">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
          ) : folderData?.directories && folderData.directories.length > 0 ? (
            <div className="space-y-1">
              {folderData.directories.map((dir) => (
                <div
                  key={dir}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent rounded-md transition-colors text-sm text-card-foreground border border-transparent hover:border-border"
                >
                  <input
                    type="checkbox"
                    checked={checkedFolders.includes(dir)}
                    onChange={() => handleFolderCheck(dir)}
                    className="w-4 h-4 rounded border-input text-foreground focus:ring-ring cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => handleNavigate(dir)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <FolderIcon className="w-4 h-4 text-muted-foreground" />
                    <span>{dir}</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No subdirectories found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 text-card-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={checkedFolders.length === 0 || isScanning}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isScanning ? 'Starting Scan...' : `Confirm${checkedFolders.length > 0 ? ` (${checkedFolders.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FolderBrowserModal
