import { createContext, useContext, useState, ReactNode } from 'react'
import type { Sample } from '../types'

interface AudioPlayerContextType {
  selectedSample: Sample | null
  setSelectedSample: (sample: Sample | null) => void
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  isLoopEnabled: boolean
  setIsLoopEnabled: (enabled: boolean) => void
  isAutoPlayEnabled: boolean
  setIsAutoPlayEnabled: (enabled: boolean) => void
  toggleLoop: () => void
  toggleAutoPlay: () => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider')
  }
  return context
}

interface AudioPlayerProviderProps {
  children: ReactNode
}

export const AudioPlayerProvider = ({ children }: AudioPlayerProviderProps) => {
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoopEnabled, setIsLoopEnabled] = useState(() => {
    const saved = localStorage.getItem('audio-player-loop-enabled')
    return saved !== null ? saved === 'true' : false
  })
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(() => {
    const saved = localStorage.getItem('audio-player-autoplay-enabled')
    return saved !== null ? saved === 'true' : false
  })

  const toggleLoop = () => {
    setIsLoopEnabled((prev) => {
      const newValue = !prev
      localStorage.setItem('audio-player-loop-enabled', newValue.toString())
      return newValue
    })
  }

  const toggleAutoPlay = () => {
    setIsAutoPlayEnabled((prev) => {
      const newValue = !prev
      localStorage.setItem('audio-player-autoplay-enabled', newValue.toString())
      return newValue
    })
  }

  return (
    <AudioPlayerContext.Provider
      value={{
        selectedSample,
        setSelectedSample,
        isPlaying,
        setIsPlaying,
        isLoopEnabled,
        setIsLoopEnabled,
        isAutoPlayEnabled,
        setIsAutoPlayEnabled,
        toggleLoop,
        toggleAutoPlay,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}
