import './index.css'

import { AudioPlayerProvider, useAudioPlayer } from './contexts/AudioPlayerContext'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import Banner from './components/Banner'
import Browser from './pages/Browser'
import Collections from './pages/Collections'
import Dashboard from './pages/Dashboard'
import DatabaseSetupModal from './components/DatabaseSetupModal'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import MobileNotSupported from './components/MobileNotSupported'
import Search from './pages/Search'
import Startup from './pages/Startup'
import Tags from './pages/Tags'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from 'react-hot-toast'
import { getDatabaseStatus, healthCheck } from './services/api'

// Detect if device is a mobile phone (excludes tablets like iPad)
const isMobilePhone = () => {
  const ua = navigator.userAgent
  // Check if it's a mobile device but NOT a tablet
  const isMobile = /iPhone|Android.*Mobile/i.test(ua)
  return isMobile
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Inner component that has access to AudioPlayerContext
function AppContent() {
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false)
  const [isDatabaseReady, setIsDatabaseReady] = useState(false)
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(true)
  const { toggleLoop, toggleAutoPlay } = useAudioPlayer()

  // Check database status on startup
  useEffect(() => {
    const checkDatabase = async () => {
      try {
        // First check if we're in demo mode
        const health = await healthCheck()
        if (health.data.demo_mode) {
          // In demo mode, database is always ready
          setIsDatabaseReady(true)
          setIsCheckingDatabase(false)
          return
        }

        // In production mode, check if database exists
        const status = await getDatabaseStatus()
        if (status.data.exists) {
          setIsDatabaseReady(true)
        } else {
          setShowDatabaseSetup(true)
        }
      } catch (error) {
        console.error('Failed to check database status:', error)
        // If we can't check the status, show the setup modal to be safe
        // This handles cases where the endpoint doesn't exist or backend is down
        setShowDatabaseSetup(true)
      } finally {
        setIsCheckingDatabase(false)
      }
    }

    checkDatabase()
  }, [])

  const handleDatabaseSetupSuccess = () => {
    setShowDatabaseSetup(false)
    setIsDatabaseReady(true)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }

      // Check for Shift+/ (? key)
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault()
        setIsShortcutsModalOpen(true)
      } else if (e.key === 'l') {
        // Toggle loop mode (global shortcut)
        e.preventDefault()
        toggleLoop()
      } else if (e.key === 'p') {
        // Toggle auto-play mode (global shortcut)
        e.preventDefault()
        toggleAutoPlay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleLoop, toggleAutoPlay])

  // Show loading state while checking database
  if (isCheckingDatabase) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Checking database...</p>
        </div>
      </div>
    )
  }

  // Show database setup modal if needed
  if (showDatabaseSetup) {
    return (
      <>
        <div className="flex items-center justify-center h-screen bg-background">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold text-foreground mb-4">Welcome to Audio Sample Manager</h1>
            <p className="text-muted-foreground">Please set up your database to get started</p>
          </div>
        </div>
        <DatabaseSetupModal isOpen={showDatabaseSetup} onSuccess={handleDatabaseSetupSuccess} />
      </>
    )
  }

  // Only render the app if database is ready
  if (!isDatabaseReady) {
    return null
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Banner />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Startup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/browser" element={<Browser />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Toaster />
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  )
}

function App() {
  // Check if on mobile phone (not tablet)
  if (isMobilePhone()) {
    return (
      <ThemeProvider>
        <MobileNotSupported />
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <AudioPlayerProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </QueryClientProvider>
      </AudioPlayerProvider>
    </ThemeProvider>
  )
}

export default App
