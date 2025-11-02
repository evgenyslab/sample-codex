import { getScannedFolders, healthCheck, listCollections, listSamples, listTags } from '../services/api'

import FolderBrowserModal from '../components/FolderBrowserModal.tsx'
import SettingsModal from '../components/SettingsModal.tsx'
import Sidebar from '../components/Sidebar'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { Tag, Collection, Folder, Sample, HealthStatus, AppStats } from '../types'

interface TagsResponse {
  tags: Tag[]
}

interface CollectionsResponse {
  collections: Collection[]
}

interface FoldersResponse {
  folders: Folder[]
}

interface SamplesResponse {
  samples: Sample[]
  pagination: {
    total: number
    page: number
    page_size: number
  }
}

export default function Collections() {
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await healthCheck()
      return response.data as HealthStatus
    }
  })

  const { data: samplesData } = useQuery({
    queryKey: ['samples'],
    queryFn: async () => {
      const response = await listSamples({ page: 1, page_size: 10 } as any)
      return response.data as unknown as SamplesResponse
    }
  })

  const { data: tagsData } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await listTags()
      return response.data as unknown as TagsResponse
    }
  })

  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const response = await getScannedFolders()
      return response.data as unknown as FoldersResponse
    }
  })

  const { data: collectionsData } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await listCollections()
      return response.data as unknown as CollectionsResponse
    }
  })

  const stats: AppStats = {
    samples: samplesData?.pagination?.total || 0,
    tags: tagsData?.tags?.length || 0,
    folders: foldersData?.folders?.length || 0,
    collections: collectionsData?.collections?.length || 0,
  }

  return (
    <div className="flex h-full bg-background">
      <Sidebar
        onAddFolders={() => setIsFolderBrowserOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
        health={health as any}
      />

      <div className="flex-1 overflow-auto bg-muted/40">
        <div className="p-8">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Collections</h1>
          <p className="text-muted-foreground">Collections Management page placeholder</p>
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
