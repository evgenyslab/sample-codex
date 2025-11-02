import { useEffect, useState } from 'react'

const DemoBanner = () => {
  const [isDemoMode, setIsDemoMode] = useState(false)

  useEffect(() => {
    // Check if backend is in demo mode
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        console.log('Demo mode health check:', data)
        console.log('Setting isDemoMode to:', data.demo_mode === true)
        setIsDemoMode(data.demo_mode === true)
      })
      .catch((error) => {
        // If health check fails, don't show banner
        console.error('Demo mode health check failed:', error)
        setIsDemoMode(false)
      })
  }, [])

  if (!isDemoMode) return null

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 text-center text-sm">
      <span className="font-semibold text-primary">🎭 Demo Mode</span>
      <span className="text-muted-foreground ml-2">
        Your changes are private and temporary. Data resets after 1 hour of inactivity. Hit `?` for shortcuts.
      </span>
    </div>
  )
}

export default DemoBanner
