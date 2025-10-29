import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { CollectionIcon, FolderIcon, MusicIcon, PlusIcon, TagIcon } from '../components/ui/Icons'
import { getScannedFolders, healthCheck, listCollections, listSamples, listTags } from '../services/api'

import FolderBrowserModal from '../components/FolderBrowserModal'
import SettingsModal from '../components/SettingsModal'
import Sidebar from '../components/Sidebar'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export default function Dashboard() {
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
      {/* Sidebar */}
      <Sidebar
        onAddFolders={() => setIsFolderBrowserOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
        health={health}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-muted/40">
        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Samples</CardTitle>
                <MusicIcon className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{samplesData?.pagination?.total || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Audio files in library
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tags</CardTitle>
                <TagIcon className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tagsData?.tags?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Organization labels
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Collections</CardTitle>
                <CollectionIcon className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{collectionsData?.collections?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Organized sets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Folders</CardTitle>
                <FolderIcon className="w-5 h-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{foldersData?.folders?.length || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Scanned directories
                </p>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* Folder Browser Modal*/}
      <FolderBrowserModal
        isOpen={isFolderBrowserOpen}
        onClose={() => setIsFolderBrowserOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}
