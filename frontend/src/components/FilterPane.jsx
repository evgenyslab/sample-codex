import { ChevronUpIcon, SearchIcon, TagIcon, XIcon } from './ui/Icons'
import { useMemo, useState } from 'react'

/**
 * FilterPane - A reusable component for displaying and filtering items (tags, folders, collections)
 *
 * @param {Object} props
 * @param {Array} props.items - Array of items to display
 * @param {string} props.type - Type of items ('tags', 'folders', 'collections')
 * @param {Array} props.includedItems - Array of included item IDs
 * @param {Array} props.excludedItems - Array of excluded item IDs
 * @param {Function} props.onItemClick - Callback when item is clicked (itemId, isRightClick)
 * @param {Function} props.onRemoveIncluded - Callback to remove item from included list
 * @param {Function} props.onRemoveExcluded - Callback to remove item from excluded list
 * @param {boolean} props.isVisible - Whether the pane is visible
 * @param {Function} props.onToggleVisibility - Callback to toggle visibility
 * @param {string} props.getItemLabel - Function to get label from item (optional, defaults to item.name)
 * @param {string} props.getItemId - Function to get ID from item (optional, defaults to item.id)
 */
export default function FilterPane({
  items = [],
  type = 'items',
  includedItems = [],
  excludedItems = [],
  onItemClick,
  onRemoveIncluded,
  onRemoveExcluded,
  isVisible = true,
  onToggleVisibility,
  getItemLabel = (item) => item.name,
  getItemId = (item) => item.id,
  showExclude = true,
}) {
  const [searchQuery, setSearchQuery] = useState('')

  // Get display names (for future use in tooltips/labels)

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!items) return []
    if (!searchQuery) return items

    const searchLower = searchQuery.toLowerCase()
    return items.filter(item =>
      getItemLabel(item).toLowerCase().includes(searchLower)
    )
  }, [items, searchQuery, getItemLabel])

  const handleItemClick = (itemId, isRightClick) => {
    if (onItemClick) {
      onItemClick(itemId, isRightClick)
    }
  }

  const handleRemoveIncluded = (e, itemId) => {
    e.stopPropagation()
    if (onRemoveIncluded) {
      onRemoveIncluded(itemId)
    }
  }

  const handleRemoveExcluded = (e, itemId) => {
    e.stopPropagation()
    if (onRemoveExcluded) {
      onRemoveExcluded(itemId)
    }
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
              placeholder={`Search ${type}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-muted border border-input rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No {type} found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => {
                const itemId = getItemId(item)
                const itemLabel = getItemLabel(item)
                const isIncluded = includedItems.includes(itemId)
                const isExcluded = excludedItems.includes(itemId)

                return (
                  <div
                    key={itemId}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                      ${isIncluded ? 'bg-primary text-primary-foreground' : ''}
                      ${isExcluded ? 'bg-red-500 text-white' : ''}
                      ${!isIncluded && !isExcluded ? 'hover:bg-accent hover:text-accent-foreground' : ''}
                    `}
                    onClick={() => handleItemClick(itemId, false)}
                    onContextMenu={(e) => {
                      if (showExclude) {
                        e.preventDefault()
                        handleItemClick(itemId, true)
                      }
                    }}
                    title={showExclude ? 'Left-click to include, right-click to exclude' : 'Click to select'}
                  >
                    <span className="flex-1 truncate">{itemLabel}</span>
                    {(isIncluded || isExcluded) && (
                      <button
                        onClick={(e) => {
                          if (isIncluded) {
                            handleRemoveIncluded(e, itemId)
                          } else {
                            handleRemoveExcluded(e, itemId)
                          }
                        }}
                        className="ml-2 hover:opacity-70 transition-opacity"
                        title="Remove filter"
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

        {/* Active Filters Summary */}
        {(includedItems.length > 0 || excludedItems.length > 0) && (
          <div className="px-3 py-2 border-t border-border bg-muted/50">
            <div className="text-xs text-muted-foreground space-y-1">
              {includedItems.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Include:</span>
                  <span>{includedItems.length}</span>
                </div>
              )}
              {excludedItems.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Exclude:</span>
                  <span>{excludedItems.length}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toggle Button */}
        {onToggleVisibility && (
          <div className="p-2 border-t border-border">
            <button
              onClick={() => onToggleVisibility(false)}
              className="w-full flex items-center justify-center py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title={`Hide ${type} pane`}
            >
              <ChevronUpIcon className="w-4 h-4 rotate-[-90deg]" />
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
        title={`Show ${type} pane`}
      >
        <TagIcon className="w-4 h-4" />
      </button>
    )
  }

  return null
}
