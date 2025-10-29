import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import FolderBrowserModal from '../components/FolderBrowserModal'
import SettingsModal from '../components/SettingsModal'
import { useQuery } from '@tanstack/react-query'
import { healthCheck, listSamples, listTags, getScannedFolders, listCollections } from '../services/api'

export default function Tags() {
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await healthCheck()
      return response.data
    }
  })

  const { data: samplesData } = useQuery({
    queryKey: ['samples'],
    queryFn: async () => {
      const response = await listSamples({ page: 1, limit: 10 })
      return response.data
    }
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await listTags()
      return response.data
    }
  })

  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const response = await getScannedFolders()
      return response.data
    }
  })

  const { data: collectionsData } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await listCollections()
      return response.data
    }
  })

  const stats = {
    samples: samplesData?.pagination?.total || 0,
    tags: tagsData?.tags?.length || 0,
    folders: foldersData?.folders?.length || 0,
    collections: collectionsData?.collections?.length || 0,
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onAddFolders={() => setIsFolderBrowserOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
        health={health}
      />

      <div className="flex-1 overflow-auto bg-muted/40">
        <div className="p-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Tags</h1>
          <p className="text-muted-foreground">Tags page placeholder</p>
        </div>
      </div>

      <FolderBrowserModal
        isOpen={isFolderBrowserOpen}
        onClose={() => setIsFolderBrowserOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
