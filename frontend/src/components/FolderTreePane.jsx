import { ChevronUpIcon, FolderIcon, SearchIcon, XIcon } from './ui/Icons'
import { useMemo, useState } from 'react'

/**
 * Build a folder tree structure from flat paths
 * @param {Array} paths - Array of file paths
 * @returns {Object} Tree structure with common root removed
 */
function buildFolderTree(paths) {
  if (!paths || paths.length === 0) return { root: '', tree: {} }

  // Find common root path
  const pathParts = paths.map(p => p.split('/').filter(Boolean))
  if (pathParts.length === 0) return { root: '', tree: {} }

  let commonRoot = []
  const firstPath = pathParts[0]

  for (let i = 0; i < firstPath.length; i++) {
    const part = firstPath[i]
    if (pathParts.every(parts => parts[i] === part)) {
      commonRoot.push(part)
    } else {
      break
    }
  }

  const rootPath = '/' + commonRoot.join('/')

  // Build tree structure
  const tree = {}
  paths.forEach(path => {
    const parts = path.split('/').filter(Boolean)
    const relativeParts = parts.slice(commonRoot.length)

    if (relativeParts.length === 0) return

    let current = tree
    const folderPath = []

    relativeParts.forEach((part) => {
      folderPath.push(part)

      if (!current[part]) {
        current[part] = {
          name: part,
          fullPath: '/' + [...commonRoot, ...folderPath].join('/'),
          children: {},
          isFile: false  // These are all directories
        }
      }
      current = current[part].children
    })
  })

  return { root: rootPath, tree }
}

/**
 * FolderTreePane - A hierarchical folder filter with expand/collapse
 *
 * Click to include, Ctrl/Cmd+Click to exclude folders
 */
export default function FolderTreePane({
  samplePaths = [],
  includedFolders = [],
  excludedFolders = [],
  onFolderClick,
  onRemoveIncluded,
  onRemoveExcluded,
  isVisible = true,
  onToggleVisibility,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFolders, setExpandedFolders] = useState({})
  const [searchExpandedFolders, setSearchExpandedFolders] = useState({})

  // Build folder tree from sample paths
  const { tree } = useMemo(() => {
    const paths = samplePaths.map(path => {
      // Get directory path (remove filename)
      const parts = path.split('/')
      parts.pop() // Remove filename
      return parts.join('/')
    }).filter((path, index, self) => path && self.indexOf(path) === index) // Unique directories

    const result = buildFolderTree(paths)

    // Debug logging
    if (import.meta.env.DEV) {
      console.log('FolderTreePane - Sample paths:', samplePaths.length)
      console.log('FolderTreePane - Unique directories:', paths.length)
      console.log('FolderTreePane - Common root:', result.root)
      console.log('FolderTreePane - Tree structure:', result.tree)
    }

    return result
  }, [samplePaths])

  // Filter folders based on search and collect paths to expand
  const filteredTree = useMemo(() => {
    if (!searchQuery) {
      setSearchExpandedFolders({})
      return tree
    }

    const toExpand = {}
    const filterTree = (node, parentPath = '') => {
      const filtered = {}
      Object.entries(node).forEach(([key, value]) => {
        if (value.isFile) return

        const matchesSearch = key.toLowerCase().includes(searchQuery.toLowerCase())
        const filteredChildren = filterTree(value.children, value.fullPath)

        if (matchesSearch || Object.keys(filteredChildren).length > 0) {
          filtered[key] = {
            ...value,
            children: filteredChildren
          }

          // Mark parent path for expansion
          if (parentPath) {
            toExpand[parentPath] = true
          }

          // If this folder has matching children, expand it too
          if (Object.keys(filteredChildren).length > 0) {
            toExpand[value.fullPath] = true
          }
        }
      })
      return filtered
    }

    const result = filterTree(tree)
    setSearchExpandedFolders(toExpand)
    return result
  }, [tree, searchQuery])

  const toggleExpanded = (path) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }))
  }

  const handleFolderClick = (folderPath, isShiftClick) => {
    if (onFolderClick) {
      onFolderClick(folderPath, isShiftClick)
    }
  }

  const handleRemoveIncluded = (e, folderPath) => {
    e.stopPropagation()
    if (onRemoveIncluded) {
      onRemoveIncluded(folderPath)
    }
  }

  const handleRemoveExcluded = (e, folderPath) => {
    e.stopPropagation()
    if (onRemoveExcluded) {
      onRemoveExcluded(folderPath)
    }
  }

  const renderFolderTree = (node, depth = 0) => {
    return Object.entries(node).map(([, value]) => {
      if (value.isFile) return null

      // Use search-expanded state if searching, otherwise use manual expanded state
      const isExpanded = searchQuery
        ? searchExpandedFolders[value.fullPath] || expandedFolders[value.fullPath]
        : expandedFolders[value.fullPath]
      const hasChildren = Object.keys(value.children).length > 0
      const isIncluded = includedFolders.includes(value.fullPath)
      const isExcluded = excludedFolders.includes(value.fullPath)

      // Check if any child folder is selected (for parent highlighting)
      // Use proper path delimiter checking
      const normalizedPath = value.fullPath.endsWith('/') ? value.fullPath : value.fullPath + '/'
      const hasSelectedChild = includedFolders.some(folder =>
        folder !== value.fullPath && folder.startsWith(normalizedPath)
      ) || excludedFolders.some(excluded =>
        excluded !== value.fullPath && excluded.startsWith(normalizedPath)
      )
      const hasExcludedChild = excludedFolders.some(folder =>
        folder !== value.fullPath && folder.startsWith(normalizedPath)
      )

      return (
        <div key={value.fullPath}>
          <div
            className={`
              flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-colors
              ${isIncluded ? 'bg-primary text-primary-foreground' : ''}
              ${isExcluded ? 'bg-red-500 text-white' : ''}
              ${!isIncluded && !isExcluded && hasSelectedChild && !hasExcludedChild ? 'bg-primary/5 text-foreground' : ''}
              ${!isIncluded && !isExcluded && hasExcludedChild ? 'bg-red-500/20 text-foreground' : ''}
              ${!isIncluded && !isExcluded && !hasSelectedChild && !hasExcludedChild ? 'hover:bg-accent hover:text-accent-foreground' : ''}
            `}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {/* Expand/Collapse Button */}
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleExpanded(value.fullPath)
                }}
                className="w-4 h-4 flex items-center justify-center hover:bg-background/20 rounded transition-colors flex-shrink-0"
                title={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronUpIcon
                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : 'rotate-90'}`}
                />
              </button>
            ) : (
              <div className="w-4" />
            )}

            {/* Folder Icon */}
            <FolderIcon className="w-4 h-4 flex-shrink-0" />

            {/* Folder Name - Clickable area */}
            <div
              className="flex-1 flex items-center justify-between cursor-pointer min-w-0"
              onClick={(e) => handleFolderClick(value.fullPath, e.ctrlKey || e.metaKey)}
              title={`${value.fullPath}\nClick to include, Ctrl/Cmd+Click to exclude`}
            >
              <span className="truncate">{value.name}</span>

              {/* Remove Button */}
              {(isIncluded || isExcluded) && (
                <button
                  onClick={(e) => {
                    if (isIncluded) {
                      handleRemoveIncluded(e, value.fullPath)
                    } else {
                      handleRemoveExcluded(e, value.fullPath)
                    }
                  }}
                  className="ml-2 hover:opacity-70 transition-opacity flex-shrink-0"
                  title="Remove filter"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Render children if expanded */}
          {hasChildren && isExpanded && (
            <div>
              {renderFolderTree(value.children, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  // Visible pane
  if (isVisible) {
    return (
      <div className="w-64 flex flex-col bg-card/80 backdrop-blur-md rounded-lg border border-border overflow-hidden">
        {/* Search */}
        <div className="p-2 border-b border-border">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-muted border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {searchQuery && (
            <div className="mt-1 text-xs text-muted-foreground">
              Showing matches (auto-expanded)
            </div>
          )}
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2">
          {Object.keys(filteredTree).length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No folders found
            </div>
          ) : (
            <div className="space-y-0.5">
              {renderFolderTree(filteredTree)}
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {(includedFolders.length > 0 || excludedFolders.length > 0) && (
          <div className="px-3 py-2 border-t border-border bg-muted/50">
            <div className="text-xs text-muted-foreground space-y-1">
              {includedFolders.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Include:</span>
                  <span>{includedFolders.length}</span>
                </div>
              )}
              {excludedFolders.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Exclude:</span>
                  <span>{excludedFolders.length}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toggle Button */}
        {onToggleVisibility && (
          <div className="px-2 py-1 border-t border-border">
            <button
              onClick={() => onToggleVisibility(false)}
              className="w-full flex items-center justify-center py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
              title="Hide folders pane"
            >
              <ChevronUpIcon className="w-3.5 h-3.5 rotate-[-90deg]" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Collapsed state (toggle button)
  if (onToggleVisibility) {
    return (
      <button
        onClick={() => onToggleVisibility(true)}
        className="w-8 flex items-center justify-center bg-card/80 backdrop-blur-md rounded-lg border border-border hover:bg-accent transition-colors"
        title="Show folders pane"
      >
        <FolderIcon className="w-4 h-4" />
      </button>
    )
  }

  return null
}
