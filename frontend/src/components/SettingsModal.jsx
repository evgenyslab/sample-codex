import { MoonIcon, SunIcon, XIcon } from './ui/Icons'
import { useEffect, useState } from 'react'

import Toggle from './ui/Toggle'
import { clearAllData } from '../services/api'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useTheme } from '../contexts/ThemeContext'

const SettingsModal = ({ isOpen, onClose }) => {
  const [isClearing, setIsClearing] = useState(false)
  const queryClient = useQueryClient()
  const { theme, toggleTheme } = useTheme()

  const handleClearAllData = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return
    }

    setIsClearing(true)
    try {
      const response = await clearAllData()
      if (response.data.status === 'success') {
        toast.success('All data has been cleared successfully')
        // Invalidate all queries to refresh the UI
        queryClient.invalidateQueries()
      } else {
        toast.error('Failed to clear data')
      }
    } catch (error) {
      console.error('Error clearing data:', error)
      toast.error('An error occurred while clearing data')
    } finally {
      setIsClearing(false)
    }
  }

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
      className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card/80 backdrop-blur-md rounded-lg shadow-2xl w-full max-w-2xl border-2 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-card-foreground">Settings</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 bg-card">
          {/* Database Location */}
          <div>
            <label className="text-sm font-medium text-card-foreground block mb-2">
              Database Location
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={dbLocation}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-muted border border-input rounded-md font-mono text-card-foreground"
              />
              <button
                onClick={() => {
                  // TODO: Implement file picker for database location
                  alert('Database location change will be implemented')
                }}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Change
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              The location where your audio sample database is stored
            </p>
          </div>

          {/* Database Info */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-card-foreground mb-3">Database Information</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Database Size</span>
                <span className="font-mono text-card-foreground">~0 KB</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Last Modified</span>
                <span className="font-mono text-card-foreground">-</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-card-foreground mb-3">Database Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => alert('Export database feature coming soon')}
                className="w-full justify-start inline-flex items-center rounded-md text-sm font-medium transition-colors h-9 px-3 border border-input text-card-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Export Database
              </button>
              <button
                onClick={handleClearAllData}
                disabled={isClearing}
                className="w-full justify-start inline-flex items-center rounded-md text-sm font-medium transition-colors h-9 px-3 border border-input text-red-600 dark:text-red-400 hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
              >
                {isClearing ? 'Clearing...' : 'Clear All Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-between">
          <Toggle
            pressed={theme === 'dark'}
            onPressedChange={() => toggleTheme()}
            className="text-xs hover:bg-accent-foreground/20"
          >
            {theme === 'light' ? <MoonIcon className="w-4 h-4" /> : <SunIcon className="w-4 h-4" />}
          </Toggle>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 text-primary bg-accent-foreground/20 hover:bg-accent-foreground/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
