import { useEffect, useState } from 'react'

interface BannerConfig {
  show: boolean
  icon?: string
  title: string
  message: string
  variant?: 'info' | 'warning' | 'error'
}

const Banner = () => {
  const [banner, setBanner] = useState<BannerConfig | null>(null)

  useEffect(() => {
    // Check if backend is in demo mode
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        console.log('Demo mode health check:', data)
        console.log('Setting banner for demo mode:', data.demo_mode === true)

        if (data.demo_mode === true) {
          setBanner({
            show: true,
            icon: '🎭',
            title: 'Demo Mode',
            message: 'Your changes are private and temporary. Data resets after 1 hour of inactivity. Hit `?` for shortcuts.',
            variant: 'info'
          })
        }
      })
      .catch((error) => {
        // If health check fails, don't show banner
        console.error('Banner health check failed:', error)
        setBanner(null)
      })
  }, [])

  if (!banner?.show) return null

  const variantStyles = {
    info: 'bg-primary/10 border-primary/20 text-primary',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
  }

  const variant = banner.variant || 'info'

  return (
    <div className={`${variantStyles[variant]} border-b px-4 py-2 text-center text-sm flex-shrink-0`}>
      {banner.icon && <span className="font-semibold">{banner.icon} </span>}
      <span className="font-semibold">{banner.title}</span>
      <span className="text-muted-foreground ml-2">
        {banner.message}
      </span>
    </div>
  )
}

export default Banner
