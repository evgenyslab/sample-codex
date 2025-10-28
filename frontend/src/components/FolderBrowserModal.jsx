import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { browseFolders, scanFolders } from '../services/api'
import { Button } from './ui/Button'
import { FolderIcon, ChevronUpIcon, XIcon } from './ui/Icons'

const FolderBrowserModal = ({ isOpen, onClose }) => {
  const [currentPath, setCurrentPath] = useState('')
  const [selectedPaths, setSelectedPaths] = useState([])
  const queryClient = useQueryClient()

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

  const scanMutation = useMutation({
    mutationFn: (paths) => scanFolders(paths),
    onSuccess: () => {
      queryClient.invalidateQueries(['folders'])
      queryClient.invalidateQueries(['samples'])
      setSelectedPaths([])
      onClose()
    },
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
  }

  const handleGoUp = () => {
    if (folderData?.parent) {
      setCurrentPath(folderData.parent)
    }
  }

  const handleSelectCurrent = () => {
    if (folderData?.path && !selectedPaths.includes(folderData.path)) {
      setSelectedPaths([...selectedPaths, folderData.path])
    }
  }

  const handleScan = () => {
    if (selectedPaths.length > 0) {
      scanMutation.mutate(selectedPaths)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col border-2 border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-gray-900">Select Folders to Scan</h2>
              <p className="text-xs text-gray-600 mt-1">
                Navigate to and select folders containing audio files
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Path & Controls */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleGoUp}
              disabled={!folderData?.parent}
            >
              <ChevronUpIcon className="mr-1.5" />
              Up
            </Button>
            <div className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-xs font-mono overflow-x-auto whitespace-nowrap text-gray-900">
              {folderData?.path || 'Loading...'}
            </div>
            <Button
              onClick={handleSelectCurrent}
              disabled={!folderData?.path || selectedPaths.includes(folderData?.path)}
              size="sm"
            >
              Select
            </Button>
          </div>

          {selectedPaths.length > 0 && (
            <div className="text-xs text-gray-600">
              {selectedPaths.length} folder{selectedPaths.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Directory List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
          ) : folderData?.directories && folderData.directories.length > 0 ? (
            <div className="space-y-1">
              {folderData.directories.map((dir) => (
                <button
                  key={dir}
                  onClick={() => handleNavigate(dir)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-100 rounded-md flex items-center gap-3 transition-colors text-sm text-gray-900 border border-transparent hover:border-gray-200"
                >
                  <FolderIcon className="w-4 h-4 text-gray-500" />
                  <span>{dir}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-gray-500">
              No subdirectories found
            </div>
          )}
        </div>

        {/* Selected Paths */}
        {selectedPaths.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs font-medium mb-2 text-gray-700">Selected folders:</p>
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {selectedPaths.map((path) => (
                <div key={path} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-gray-200">
                  <span className="text-gray-700 font-mono text-xs truncate">{path}</span>
                  <button
                    onClick={() => setSelectedPaths(selectedPaths.filter(p => p !== path))}
                    className="text-gray-400 hover:text-gray-600 ml-2 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onClose}
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleScan}
            disabled={selectedPaths.length === 0 || scanMutation.isPending}
            size="sm"
          >
            {scanMutation.isPending ? 'Starting Scan...' : `Scan ${selectedPaths.length} Folder${selectedPaths.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FolderBrowserModal
