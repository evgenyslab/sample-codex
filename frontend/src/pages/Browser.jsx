import { SearchIcon } from '../components/ui/Icons'
import { getScannedFolders, healthCheck, listCollections, listSamples, listTags } from '../services/api'
import { useEffect, useMemo, useRef, useState } from 'react'

import FilterPane from '../components/FilterPane'
import FolderBrowserModal from '../components/FolderBrowserModal'
import FolderTreePane from '../components/FolderTreePane'
import SettingsModal from '../components/SettingsModal'
import Sidebar from '../components/Sidebar'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'

export default function Browser() {
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Persist pane visibility state
  const [isLeftPaneVisible, setIsLeftPaneVisible] = useState(() => {
    const saved = localStorage.getItem('browser-tags-pane-visible')
    return saved !== null ? saved === 'true' : true
  })
  const [isFolderPaneVisible, setIsFolderPaneVisible] = useState(() => {
    const saved = localStorage.getItem('browser-folders-pane-visible')
    return saved !== null ? saved === 'true' : true
  })

  const [sampleSearch, setSampleSearch] = useState('')
  const [includedTags, setIncludedTags] = useState([])
  const [excludedTags, setExcludedTags] = useState([])
  const [includedFolders, setIncludedFolders] = useState([])
  const [excludedFolders, setExcludedFolders] = useState([])

  const tableRef = useRef(null)

  // Persist pane visibility to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('browser-tags-pane-visible', isLeftPaneVisible.toString())
  }, [isLeftPaneVisible])

  useEffect(() => {
    localStorage.setItem('browser-folders-pane-visible', isFolderPaneVisible.toString())
  }, [isFolderPaneVisible])

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await healthCheck()
      return response.data
    }
  })

  const { data: samplesData } = useQuery({
    queryKey: ['samples', includedTags, excludedTags],
    queryFn: async () => {
      const params = { page: 1, limit: 10000 }
      if (includedTags.length > 0) {
        params.tags = includedTags.join(',')
      }
      if (excludedTags.length > 0) {
        params.exclude_tags = excludedTags.join(',')
      }
      const response = await listSamples(params)
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

  // Helper function to check if a path is in a folder (with proper delimiter checking)
  const isPathInFolder = (filePath, folderPath) => {
    if (!filePath || !folderPath) return false
    // Ensure folder path ends with / for proper matching
    const normalizedFolder = folderPath.endsWith('/') ? folderPath : folderPath + '/'
    return filePath.startsWith(normalizedFolder) || filePath === folderPath
  }

  // Get samples list and filter by search and folders
  const samples = useMemo(() => {
    let filtered = samplesData?.samples || []

    // Apply folder filters
    if (includedFolders.length > 0 || excludedFolders.length > 0) {
      filtered = filtered.filter(sample => {
        const samplePath = sample.filepath || ''

        // Check exclusions first
        if (excludedFolders.length > 0) {
          const isExcluded = excludedFolders.some(folder => isPathInFolder(samplePath, folder))
          if (isExcluded) return false
        }

        // Check inclusions
        if (includedFolders.length > 0) {
          const isIncluded = includedFolders.some(folder => isPathInFolder(samplePath, folder))
          return isIncluded
        }

        return true
      })
    }

    // Apply search filter
    if (sampleSearch) {
      const searchLower = sampleSearch.toLowerCase()
      filtered = filtered.filter(sample =>
        sample.filename?.toLowerCase().includes(searchLower) ||
        sample.filepath?.toLowerCase().includes(searchLower)
      )
    }

    return filtered
  }, [samplesData, sampleSearch, includedFolders, excludedFolders])

  // Virtualizer for sample table
  const rowVirtualizer = useVirtualizer({
    count: samples.length,
    getScrollElement: () => tableRef.current,
    estimateSize: () => 40,
    overscan: 10,
  })

  const handleTagClick = (tagId, isRightClick = false) => {
    if (isRightClick) {
      // Right-click: toggle exclude
      if (excludedTags.includes(tagId)) {
        setExcludedTags(excludedTags.filter(id => id !== tagId))
      } else {
        setExcludedTags([...excludedTags, tagId])
        setIncludedTags(includedTags.filter(id => id !== tagId))
      }
    } else {
      // Left-click: toggle include
      if (includedTags.includes(tagId)) {
        setIncludedTags(includedTags.filter(id => id !== tagId))
      } else {
        setIncludedTags([...includedTags, tagId])
        setExcludedTags(excludedTags.filter(id => id !== tagId))
      }
    }
  }

  const handleFolderClick = (folderPath, isCtrlClick = false) => {
    if (isCtrlClick) {
      // Ctrl/Cmd-click: toggle exclude
      if (excludedFolders.includes(folderPath)) {
        setExcludedFolders(excludedFolders.filter(p => p !== folderPath))
      } else {
        setExcludedFolders([...excludedFolders, folderPath])
        setIncludedFolders(includedFolders.filter(p => p !== folderPath))
      }
    } else {
      // Click: toggle include
      if (includedFolders.includes(folderPath)) {
        setIncludedFolders(includedFolders.filter(p => p !== folderPath))
      } else {
        setIncludedFolders([...includedFolders, folderPath])
        setExcludedFolders(excludedFolders.filter(p => p !== folderPath))
      }
    }
  }

  // Extract sample paths for folder tree (from tag-filtered samples)
  const samplePathsForFolderTree = useMemo(() => {
    return (samplesData?.samples || []).map(s => s.filepath).filter(Boolean)
  }, [samplesData])

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        onAddFolders={() => setIsFolderBrowserOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
        health={health}
      />

      <div className="flex-1 flex gap-2 p-4 overflow-hidden">
        {/* Left Pane - Tags Filter */}
        <FilterPane
          items={tagsData?.tags || []}
          type="tags"
          includedItems={includedTags}
          excludedItems={excludedTags}
          onItemClick={handleTagClick}
          onRemoveIncluded={(tagId) => setIncludedTags(includedTags.filter(id => id !== tagId))}
          onRemoveExcluded={(tagId) => setExcludedTags(excludedTags.filter(id => id !== tagId))}
          isVisible={isLeftPaneVisible}
          onToggleVisibility={setIsLeftPaneVisible}
          showExclude={true}
        />

        {/* Middle Pane - Folder Tree Filter */}
        <FolderTreePane
          samplePaths={samplePathsForFolderTree}
          includedFolders={includedFolders}
          excludedFolders={excludedFolders}
          onFolderClick={handleFolderClick}
          onRemoveIncluded={(path) => setIncludedFolders(includedFolders.filter(p => p !== path))}
          onRemoveExcluded={(path) => setExcludedFolders(excludedFolders.filter(p => p !== path))}
          isVisible={isFolderPaneVisible}
          onToggleVisibility={setIsFolderPaneVisible}
        />

        {/* Right Pane - Sample Browser */}
        <div className="flex-1 flex flex-col bg-card/80 backdrop-blur-md rounded-lg border border-border overflow-hidden">
          {/* Sample Search */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search samples..."
                value={sampleSearch}
                onChange={(e) => setSampleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Sample Table */}
          <div ref={tableRef} className="flex-1 overflow-auto">
            <div className="min-w-full">
              {/* Table Header */}
              <div className="sticky top-0 bg-muted border-b border-border z-10">
                <div className="flex text-xs font-medium text-muted-foreground">
                  <div className="flex-1 px-4 py-3">Name</div>
                  <div className="w-24 px-4 py-3">Duration</div>
                  <div className="w-24 px-4 py-3">Channels</div>
                </div>
              </div>

              {/* Virtualized Table Body */}
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const sample = samples[virtualRow.index]
                  return (
                    <div
                      key={sample.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="flex items-center text-sm border-b border-border hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 px-4 py-2 truncate text-foreground">
                        {sample.filename}
                      </div>
                      <div className="w-24 px-4 py-2 text-muted-foreground font-mono text-xs">
                        {formatDuration(sample.duration)}
                      </div>
                      <div className="w-24 px-4 py-2 text-muted-foreground text-xs">
                        {sample.channels || '-'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Empty State */}
              {samples.length === 0 && (
                <div className="text-center py-16 text-sm text-muted-foreground">
                  No samples found
                </div>
              )}
            </div>
          </div>
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
