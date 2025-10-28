import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { healthCheck, listSamples, listTags, getScannedFolders, listCollections } from '../services/api'
import Sidebar from '../components/Sidebar'
import FolderBrowserModal from '../components/FolderBrowserModal'
import SettingsModal from '../components/SettingsModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { MusicIcon, TagIcon, FolderIcon, PlusIcon, CollectionIcon } from '../components/ui/Icons'

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

          {/* Recent Samples */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Samples</CardTitle>
              <CardDescription className="text-xs">Your most recently added audio files</CardDescription>
            </CardHeader>
            <CardContent>
              {samplesData?.samples && samplesData.samples.length > 0 ? (
                <div className="space-y-2">
                  {samplesData.samples.map((sample) => (
                    <div
                      key={sample.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <MusicIcon className="w-4 h-4 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{sample.filename}</p>
                          <p className="text-xs text-muted-foreground truncate">{sample.filepath}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-xs font-medium">
                          {sample.duration ? `${sample.duration.toFixed(2)}s` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sample.format || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MusicIcon className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                  <h3 className="font-medium text-sm mb-1">No samples found</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Start by scanning a folder containing audio files
                  </p>
                  <button
                    onClick={() => setIsFolderBrowserOpen(true)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <PlusIcon className="mr-2" />
                    Add Folders
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Scanned Folders */}
          {foldersData?.folders && foldersData.folders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scanned Folders</CardTitle>
                <CardDescription className="text-xs">Directories being monitored for audio files</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {foldersData.folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center justify-between p-3 rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FolderIcon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-mono truncate text-muted-foreground">{folder.path}</span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded ml-2">
                        {folder.sample_count}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Folder Browser Modal */}
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
