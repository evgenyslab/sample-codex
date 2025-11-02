import { ChevronUpIcon, SearchIcon, TagIcon, XIcon } from './ui/Icons';
import { useMemo, useState } from 'react';

/*
This function will need some work, and most likely so will all the filtering states.

Top level browser page gets all items, then list of tags, folder and collections.
The unique set of tags across all items is displayed in the tag filter pane.
The unique set of common folders across all items is displayed in the folder filter pane.
The unique set of collections across all items is displayed in the collection filter pane.

Now, if we want to exclude tags, we click exclude, which adds it to the excluded list, but it 
also causes the files to be filtered to only show files that do not have that tag, that in turn
removes the tag from filter pane, but we want to keep it in the filter pane, so we can re-include it.


*/

interface FilterItem {
  id: number;
  name: string;
  [key: string]: any;
}

interface FilterPaneProps<T extends FilterItem = FilterItem> {
  items?: T[];
  type?: string;
  includedItems?: number[];
  excludedItems?: number[];
  highlightedItems?: number[];
  onItemClick?: (itemId: number, isRightClick: boolean) => void;
  onRemoveIncluded?: (itemId: number) => void;
  onRemoveExcluded?: (itemId: number) => void;
  isVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  getItemLabel?: (item: T) => string;
  getItemId?: (item: T) => number;
  showExclude?: boolean;
  collapsedIcon?: React.ComponentType<{ className?: string }>;
}

/**
 * FilterPane - A reusable component for displaying and filtering items (tags, folders, collections)
 */
export default function FilterPane<T extends FilterItem = FilterItem>({
  items = [],
  type = 'items',
  includedItems = [],
  excludedItems = [],
  highlightedItems = [],
  onItemClick,
  onRemoveIncluded,
  onRemoveExcluded,
  isVisible = true,
  onToggleVisibility,
  getItemLabel = (item) => item.name,
  getItemId = (item) => item.id,
  showExclude = true,
  collapsedIcon: CollapsedIcon = TagIcon,
}: FilterPaneProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items based on search, and sort highlighted items to top
  const filteredItems = useMemo(() => {
    if (!items) return [];

    // All visible tags at the moment
    let filtered = items;

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = items.filter(item =>
        getItemLabel(item).toLowerCase().includes(searchLower)
      );
    }

    // Sort highlighted items to top
    if (highlightedItems && highlightedItems.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        const aHighlighted = highlightedItems.includes(getItemId(a));
        const bHighlighted = highlightedItems.includes(getItemId(b));

        if (aHighlighted && !bHighlighted) return -1;
        if (!aHighlighted && bHighlighted) return 1;
        return 0;
      });
    }
    

    return filtered;
  }, [items, searchQuery, highlightedItems, getItemLabel, getItemId]);

  const handleItemClick = (itemId: number, isRightClick: boolean) => {
    if (onItemClick) {
      onItemClick(itemId, isRightClick);
    }
  };

  const handleRemoveIncluded = (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation();
    if (onRemoveIncluded) {
      onRemoveIncluded(itemId);
    }
  };

  const handleRemoveExcluded = (e: React.MouseEvent, itemId: number) => {
    e.stopPropagation();
    if (onRemoveExcluded) {
      onRemoveExcluded(itemId);
    }
  };

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
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No {type} found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item) => {
                const itemId = getItemId(item);
                const itemLabel = getItemLabel(item);
                const isIncluded = includedItems.includes(itemId);
                const isExcluded = excludedItems.includes(itemId);
                const isHighlighted = highlightedItems.includes(itemId);

                return (
                  <div
                    key={itemId}
                    className={`
                      flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                      ${isIncluded ? 'bg-green-500/50 text-primary-foreground' : ''}
                      ${isExcluded ? 'bg-red-500 text-white' : ''}
                      ${!isIncluded && !isExcluded && isHighlighted ? 'bg-yellow-500/20 outline-1 outline-yellow-500 dark:bg-yellow-200/10' : ''}
                      ${!isIncluded && !isExcluded && !isHighlighted ? 'hover:bg-accent hover:text-accent-foreground' : ''}
                    `}
                    onClick={() => handleItemClick(itemId, false)}
                    onContextMenu={(e) => {
                      if (showExclude) {
                        e.preventDefault();
                        handleItemClick(itemId, true);
                      }
                    }}
                    title={showExclude ? 'Left-click to include, right-click to exclude' : 'Click to select'}
                  >
                    <span className="flex-1 truncate">{itemLabel}</span>
                    {(isIncluded || isExcluded) && (
                      <button
                        onClick={(e) => {
                          if (isIncluded) {
                            handleRemoveIncluded(e, itemId);
                          } else {
                            handleRemoveExcluded(e, itemId);
                          }
                        }}
                        className="ml-2 hover:opacity-70 transition-opacity"
                        title="Remove filter"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
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
          <div className="px-2 py-1 border-t border-border">
            <button
              onClick={() => onToggleVisibility(false)}
              className="w-full flex items-center justify-center py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-accent"
              title={`Hide ${type} pane`}
            >
              <ChevronUpIcon className="w-3.5 h-3.5 rotate-[-90deg]" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Collapsed state (toggle button)
  if (onToggleVisibility) {
    return (
      <button
        onClick={() => onToggleVisibility(true)}
        className="w-8 flex items-center justify-center bg-card/80 backdrop-blur-md rounded-lg border border-border hover:bg-accent transition-colors"
        title={`Show ${type} pane`}
      >
        <CollapsedIcon className="w-4 h-4" />
      </button>
    );
  }

  return null;
}
