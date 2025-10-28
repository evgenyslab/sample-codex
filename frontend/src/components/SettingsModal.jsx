import { useEffect } from 'react'
import { XIcon } from './ui/Icons'

const SettingsModal = ({ isOpen, onClose }) => {
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

  if (!isOpen) return null

  const dbLocation = '/backend/data/samples.db' // This would come from API in production

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl border-2 border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">Settings</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Database Location */}
          <div>
            <label className="text-sm font-medium text-gray-900 block mb-2">
              Database Location
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={dbLocation}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-md font-mono text-gray-700"
              />
              <button
                onClick={() => {
                  // TODO: Implement file picker for database location
                  alert('Database location change will be implemented')
                }}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 bg-secondary text-secondary-foreground hover:opacity-80"
              >
                Change
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The location where your audio sample database is stored
            </p>
          </div>

          {/* Database Info */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Database Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Database Size</span>
                <span className="font-mono text-gray-900">~0 KB</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Last Modified</span>
                <span className="font-mono text-gray-900">-</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Database Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => alert('Export database feature coming soon')}
                className="w-full justify-start inline-flex items-center rounded-md text-sm font-medium transition-colors h-9 px-3 border border-input hover:bg-gray-200 hover:text-foreground"
              >
                Export Database
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                    alert('Clear database feature coming soon')
                  }
                }}
                className="w-full justify-start inline-flex items-center rounded-md text-sm font-medium transition-colors h-9 px-3 border border-input text-red-600 hover:bg-gray-200 hover:text-red-700"
              >
                Clear All Data
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 bg-primary text-primary-foreground hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
