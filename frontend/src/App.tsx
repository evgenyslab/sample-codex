import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Startup from './pages/Startup'
import Dashboard from './pages/Dashboard'
import Browser from './pages/Browser'
import Tags from './pages/Tags'
import Collections from './pages/Collections'
import Search from './pages/Search'
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
  return (
    <ThemeProvider>
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
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
