import { ChevronUpIcon, SearchIcon, XIcon } from '../components/ui/Icons'
import { getScannedFolders, healthCheck, listCollections, listSamples, listTags } from '../services/api'
import { useMemo, useRef, useState } from 'react'

import FolderBrowserModal from '../components/FolderBrowserModal'
import SettingsModal from '../components/SettingsModal'
import Sidebar from '../components/Sidebar'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'

export default function Browser() {
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isLeftPaneVisible, setIsLeftPaneVisible] = useState(true)
  const [tagSearch, setTagSearch] = useState('')
  const [sampleSearch, setSampleSearch] = useState('')
  const [includedTags, setIncludedTags] = useState([])
  const [excludedTags, setExcludedTags] = useState([])

  const tableRef = useRef(null)

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

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    if (!tagsData?.tags) return []
    if (!tagSearch) return tagsData.tags
    return tagsData.tags.filter(tag =>
      tag.name.toLowerCase().includes(tagSearch.toLowerCase())
    )
  }, [tagsData, tagSearch])

  // Get samples list and filter by search
  const samples = useMemo(() => {
    const allSamples = samplesData?.samples || []
    if (!sampleSearch) return allSamples

    const searchLower = sampleSearch.toLowerCase()
    return allSamples.filter(sample =>
      sample.filename?.toLowerCase().includes(searchLower) ||
      sample.path?.toLowerCase().includes(searchLower)
    )
  }, [samplesData, sampleSearch])

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
        {/* Left Pane - Tags */}
        {isLeftPaneVisible && (
          <div className="w-64 flex flex-col bg-card/80 backdrop-blur-md rounded-lg border border-border overflow-hidden">
            {/* Tag Search */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagSearch}
                  onChange={(e) => setTagSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-muted border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Tag List */}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredTags.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No tags found
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredTags.map((tag) => {
                    const isIncluded = includedTags.includes(tag.id)
                    const isExcluded = excludedTags.includes(tag.id)

                    return (
                      <div
                        key={tag.id}
                        className={`
                          flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                          ${isIncluded ? 'bg-primary text-primary-foreground' : ''}
                          ${isExcluded ? 'bg-red-500 text-white' : ''}
                          ${!isIncluded && !isExcluded ? 'hover:bg-accent hover:text-accent-foreground' : ''}
                        `}
                        onClick={() => handleTagClick(tag.id, false)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          handleTagClick(tag.id, true)
                        }}
                      >
                        <span className="flex-1 truncate">{tag.name}</span>
                        {(isIncluded || isExcluded) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isIncluded) {
                                setIncludedTags(includedTags.filter(id => id !== tag.id))
                              } else {
                                setExcludedTags(excludedTags.filter(id => id !== tag.id))
                              }
                            }}
                            className="ml-2"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Toggle Button */}
            <div className="p-2 border-t border-border">
              <button
                onClick={() => setIsLeftPaneVisible(false)}
                className="w-full flex items-center justify-center py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronUpIcon className="w-4 h-4 rotate-[-90deg]" />
              </button>
            </div>
          </div>
        )}

        {/* Toggle Button (when left pane hidden) */}
        {!isLeftPaneVisible && (
          <button
            onClick={() => setIsLeftPaneVisible(true)}
            className="w-8 flex items-center justify-center bg-card/80 backdrop-blur-md rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <ChevronUpIcon className="w-4 h-4 rotate-90" />
          </button>
        )}

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
