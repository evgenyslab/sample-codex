import './index.css'

import { AudioPlayerProvider, useAudioPlayer } from './contexts/AudioPlayerContext'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import Banner from './components/Banner'
import Browser from './pages/Browser'
import Collections from './pages/Collections'
import Dashboard from './pages/Dashboard'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import MobileNotSupported from './components/MobileNotSupported'
import Search from './pages/Search'
import Startup from './pages/Startup'
import Tags from './pages/Tags'
import { ThemeProvider } from './contexts/ThemeContext'
import { Toaster } from 'react-hot-toast'

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
  const { toggleLoop, toggleAutoPlay } = useAudioPlayer()

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
