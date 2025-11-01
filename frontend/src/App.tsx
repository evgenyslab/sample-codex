import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { AudioPlayerProvider } from './contexts/AudioPlayerContext'
import Startup from './pages/Startup'
import Dashboard from './pages/Dashboard'
import Browser from './pages/Browser'
import Tags from './pages/Tags'
import Collections from './pages/Collections'
import Search from './pages/Search'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import { useState, useEffect } from 'react'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false)

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
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ThemeProvider>
      <AudioPlayerProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Startup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/browser" element={<Browser />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/search" element={<Search />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <KeyboardShortcutsModal
            isOpen={isShortcutsModalOpen}
            onClose={() => setIsShortcutsModalOpen(false)}
          />
        </QueryClientProvider>
      </AudioPlayerProvider>
    </ThemeProvider>
  )
}

export default App
