import { SearchIcon } from '../components/ui/Icons'
import { getScannedFolders, healthCheck, listCollections, listSamples, listTags, bulkUpdateSampleTags } from '../services/api'
import { useEffect, useMemo, useRef, useState } from 'react'

import FilterPane from '../components/FilterPane'
import FolderBrowserModal from '../components/FolderBrowserModal'
import FolderTreePane from '../components/FolderTreePane'
import SamplePlayer from '../components/SamplePlayer/SamplePlayer'
import SettingsModal from '../components/SettingsModal'
import Sidebar from '../components/Sidebar'
import TagPopup from '../components/TagPopup/TagPopup'
import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'

export default function Browser() {
  const [isFolderBrowserOpen, setIsFolderBrowserOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isTagPopupOpen, setIsTagPopupOpen] = useState(false)
  const [selectedSample, setSelectedSample] = useState(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [selectedSamples, setSelectedSamples] = useState(new Set())

  const samplePlayerRef = useRef(null)

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
  const [sortColumn, setSortColumn] = useState(null) // 'name' | 'duration' | 'channels'
  const [sortDirection, setSortDirection] = useState(null) // 'asc' | 'desc'
  const lastClickedIndexRef = useRef(null) // Track last clicked index for shift-click range selection

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

  const { data: samplesData, refetch: refetchSamples } = useQuery({
    queryKey: ['samples', includedTags, excludedTags],
    queryFn: async () => {
      const params = { page: 1, limit: 100000 }
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

  const { data: tagsData, refetch: refetchTags } = useQuery({
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

    // Apply sorting
    if (sortColumn && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aVal, bVal

        switch (sortColumn) {
          case 'name':
            aVal = (a.filename || '').toLowerCase()
            bVal = (b.filename || '').toLowerCase()
            break
          case 'duration':
            aVal = a.duration || 0
            bVal = b.duration || 0
            break
          case 'channels':
            aVal = a.channels || 0
            bVal = b.channels || 0
            break
          default:
            return 0
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [samplesData, sampleSearch, includedFolders, excludedFolders, sortColumn, sortDirection])

  // Calculate which tags are actually used in samples (for filtering tag pane)
  const usedTags = useMemo(() => {
    const allSamples = samplesData?.samples || []
    const tagIds = new Set()

    allSamples.forEach(sample => {
      sample.tags?.forEach(tag => {
        tagIds.add(tag.id)
      })
    })

    // Filter tags to only those that are used
    return (tagsData?.tags || []).filter(tag => tagIds.has(tag.id))
  }, [samplesData, tagsData])

  // Clear selected sample if it's no longer in visible samples due to folder filtering
  useEffect(() => {
    if (selectedSample && !samples.some(s => s.id === selectedSample.id)) {
      setSelectedSample(null)
      setIsPlayerOpen(false)
    }
  }, [samples, selectedSample])

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
    const secs = seconds % 60
    const secsInt = Math.floor(secs)
    const milliseconds = Math.floor((secs - secsInt) * 1000)
    return `${mins}:${secsInt.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`
  }

  // Handle column sort toggle: none -> asc -> desc -> none
  const handleSort = (column) => {
    if (sortColumn !== column) {
      // New column, start with ascending
      setSortColumn(column)
      setSortDirection('asc')
    } else if (sortDirection === 'asc') {
      // Currently ascending, switch to descending
      setSortDirection('desc')
    } else {
      // Currently descending, clear sort
      setSortColumn(null)
      setSortDirection(null)
    }
  }

  // Handle tag save from popup
  const handleTagSave = async ({ sampleIds, addTagIds, removeTagIds }) => {
    console.log('Saving tag changes:', { sampleIds, addTagIds, removeTagIds })

    try {
      await bulkUpdateSampleTags(sampleIds, addTagIds, removeTagIds)
      console.log('Tags updated successfully')

      // Refetch samples to update the UI
      await refetchSamples()

      // Close popup and clear selection
      setIsTagPopupOpen(false)
      setSelectedSamples(new Set())
    } catch (error) {
      console.error('Failed to update tags:', error)
      // TODO: Show error message to user
    }
  }

  // Keyboard shortcuts for multi-select and navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return
      }

      if (e.key === 'Escape') {
        // Clear multi-select and single select, close player
        setSelectedSamples(new Set())
        setSelectedSample(null)
        setIsPlayerOpen(false)
      } else if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
        // Select all samples (Cmd+A / Ctrl+A)
        e.preventDefault()
        const allSampleIds = new Set(samples.map(s => s.id))
        setSelectedSamples(allSampleIds)
        // Close player when selecting multiple
        setIsPlayerOpen(false)
        setSelectedSample(null)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Navigate up/down through samples
        e.preventDefault()

        if (samples.length === 0) return

        const currentIndex = selectedSample
          ? samples.findIndex(s => s.id === selectedSample.id)
          : -1

        let nextIndex
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < samples.length - 1 ? currentIndex + 1 : 0
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : samples.length - 1
        }

        const nextSample = samples[nextIndex]
        setSelectedSample(nextSample)
        setIsPlayerOpen(true)
        setSelectedSamples(new Set()) // Clear multi-select
      } else if (e.key === 'l' && selectedSample && isPlayerOpen) {
        // Toggle loop mode (only when player is open)
        e.preventDefault()
        samplePlayerRef.current?.toggleLoop()
      } else if (e.key === 'f' && selectedSample) {
        // Reveal folder location in folder pane
        e.preventDefault()
        if (selectedSample.filepath) {
          // Extract folder path from file path (everything before the last /)
          const lastSlashIndex = selectedSample.filepath.lastIndexOf('/')
          if (lastSlashIndex > 0) {
            const folderPath = selectedSample.filepath.substring(0, lastSlashIndex)
            // Set as included folder to filter by it
            setIncludedFolders([folderPath])
            setExcludedFolders([])
            // Make sure folder pane is visible
            if (!isFolderPaneVisible) {
              setIsFolderPaneVisible(true)
            }
          }
        }
      } else if (e.key === 't' && (selectedSamples.size > 0 || selectedSample)) {
        // Open tag popup - works with multi-select OR single sample in player
        e.preventDefault()

        // If single sample is playing, use that sample
        if (selectedSample && selectedSamples.size === 0) {
          setSelectedSamples(new Set([selectedSample.id]))
        }

        setIsTagPopupOpen(true)
      } else if (e.key === 'c' && selectedSamples.size > 0) {
        // Open collection popup (TODO: future)
        e.preventDefault()
        console.log('Open collection popup for', selectedSamples.size, 'samples')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedSamples, samples, selectedSample, isPlayerOpen, isFolderPaneVisible])

  return (
    <div className="flex h-screen bg-background overflow-x-hidden">
      <Sidebar
        onAddFolders={() => setIsFolderBrowserOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        stats={stats}
        health={health}
      />

      <div className="flex-1 flex gap-2 p-4 overflow-hidden">
        {/* Left Pane - Tags Filter */}
        <FilterPane
          items={usedTags}
          type="tags"
          includedItems={includedTags}
          excludedItems={excludedTags}
          highlightedItems={selectedSample?.tags?.map(t => t.id) || []}
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
        <div className="flex-1 flex flex-col bg-card/80 backdrop-blur-md rounded-lg border border-border overflow-hidden relative">
          {/* Sample Search & Selection Count */}
          <div className="p-2 border-b border-border flex items-center gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search samples..."
                value={sampleSearch}
                onChange={(e) => setSampleSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-muted border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            {selectedSamples.size > 0 && (
              <div className="flex items-center gap-2">
                <div className="px-3 py-2 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-md text-sm font-medium whitespace-nowrap">
                  {selectedSamples.size} selected
                </div>
                <button
                  onClick={() => setSelectedSamples(new Set())}
                  className="px-2 py-2 hover:bg-muted rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear selection (Esc)"
                >
                  ✕
                </button>
              </div>
            )}
            {/* Sample count - right side */}
            <div className="px-3 py-2 text-sm text-muted-foreground font-medium whitespace-nowrap font-mono">
              {samples.length !== samplesData?.pagination?.total ? (
                <>{samples.length}/{samplesData?.pagination?.total || 0}</>
              ) : (
                <>{samplesData?.pagination?.total || 0}</>
              )}
            </div>
          </div>

          {/* Sample Table */}
          <div
            ref={tableRef}
            className="flex-1 overflow-auto"
            style={{ paddingBottom: isPlayerOpen ? '200px' : '0' }}
          >
            <div className="min-w-full">
              {/* Table Header */}
              <div className="sticky top-0 bg-muted border-b border-border z-10">
                <div className="flex text-xs font-medium text-muted-foreground">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex-1 px-4 py-3 text-left hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Name
                    {sortColumn === 'name' && (
                      <span className="text-primary">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('duration')}
                    className="w-32 px-4 py-3 text-left hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Duration
                    {sortColumn === 'duration' && (
                      <span className="text-primary">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('channels')}
                    className="w-28 px-4 py-3 text-left hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center gap-1"
                  >
                    Channels
                    {sortColumn === 'channels' && (
                      <span className="text-primary">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </button>
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
                  const isSelected = selectedSample?.id === sample.id
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
                      className={`flex items-center text-sm border-b border-border transition-colors cursor-pointer select-none ${
                        isSelected
                          ? 'bg-primary/20 hover:bg-primary/25 border-l-4 border-l-primary'
                          : selectedSamples.has(sample.id)
                          ? 'bg-blue-500/15 hover:bg-blue-500/20 border-l-2 border-l-blue-500'
                          : 'hover:bg-accent'
                      }`}
                      onClick={(e) => {
                        const currentIndex = samples.findIndex(s => s.id === sample.id)

                        // Shift+click for range selection
                        if (e.shiftKey && lastClickedIndexRef.current !== null) {
                          e.preventDefault()
                          const startIndex = Math.min(lastClickedIndexRef.current, currentIndex)
                          const endIndex = Math.max(lastClickedIndexRef.current, currentIndex)

                          // Select all samples in range
                          const rangeIds = new Set()
                          for (let i = startIndex; i <= endIndex; i++) {
                            rangeIds.add(samples[i].id)
                          }

                          setSelectedSamples(rangeIds)
                          setIsPlayerOpen(false)
                          setSelectedSample(null)
                        }
                        // Cmd/Ctrl+click for multi-select toggle
                        else if (e.metaKey || e.ctrlKey) {
                          e.preventDefault()
                          const newSelected = new Set(selectedSamples)

                          // If a sample is currently playing (selectedSample exists), add it to multi-select
                          if (selectedSample && !newSelected.has(selectedSample.id)) {
                            newSelected.add(selectedSample.id)
                          }

                          // Toggle the clicked sample
                          if (newSelected.has(sample.id)) {
                            newSelected.delete(sample.id)
                          } else {
                            newSelected.add(sample.id)
                          }

                          setSelectedSamples(newSelected)

                          // Close player since we're now in multi-select mode
                          setIsPlayerOpen(false)
                          setSelectedSample(null)

                          // Update last clicked index
                          lastClickedIndexRef.current = currentIndex
                        } else {
                          // Regular click - single select with player
                          setSelectedSample(sample)
                          setIsPlayerOpen(true)
                          setSelectedSamples(new Set()) // Clear multi-select

                          // Update last clicked index
                          lastClickedIndexRef.current = currentIndex
                        }
                      }}
                    >
                      <div className="flex-1 px-4 py-2 truncate text-foreground">
                        {sample.filename}
                      </div>
                      <div className="w-32 px-4 py-2 text-muted-foreground font-mono text-xs">
                        {formatDuration(sample.duration)}
                      </div>
                      <div className="w-28 px-4 py-2 text-muted-foreground text-xs">
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

          {/* Sample Player - positioned at bottom of browser pane */}
          <SamplePlayer
            ref={samplePlayerRef}
            sample={selectedSample}
            isOpen={isPlayerOpen}
            onClose={() => setIsPlayerOpen(false)}
          />
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

      <TagPopup
        isOpen={isTagPopupOpen}
        onClose={() => setIsTagPopupOpen(false)}
        selectedSampleIds={Array.from(selectedSamples)}
        allTags={tagsData?.tags || []}
        samples={samplesData?.samples || []}
        onSave={handleTagSave}
        onTagCreated={refetchTags}
      />
    </div>
  )
}
