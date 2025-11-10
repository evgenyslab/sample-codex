import { ChevronUpIcon, SearchIcon, TagIcon, XIcon } from './ui/Icons';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTagsMetadata, getCollectionsMetadata } from '../services/api';
import type { TagMetadata, CollectionMetadata } from '../types';

// Constant empty array to avoid re-creating on every render
const EMPTY_NUMBER_ARRAY: number[] = [];

interface FilterItem {
  id: number;
  name: string;
  sample_count?: number;
  [key: string]: any;
}

interface FilterPaneProps<T extends FilterItem = FilterItem> {
  items?: T[]; // Optional legacy support
  type: 'tags' | 'collections' | string; // Type determines which metadata to fetch
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
  tagColorMap?: Map<number, string>; // Color mapping for tags (auto-generated)
}

/**
 * FilterPane - A reusable component for displaying and filtering items (tags, folders, collections)
 * Now fetches metadata internally based on type prop
 */
export default function FilterPane<T extends FilterItem = FilterItem>({
  items: itemsProp,
  type = 'items',
  includedItems,
  excludedItems,
  highlightedItems,
  onItemClick,
  onRemoveIncluded,
  onRemoveExcluded,
  isVisible = true,
  onToggleVisibility,
  getItemLabel = (item) => item.name,
  getItemId = (item) => item.id,
  showExclude = true,
  collapsedIcon: CollapsedIcon = TagIcon,
  tagColorMap,
}: FilterPaneProps<T>) {
  // Use constant empty arrays if props not provided to avoid re-renders
  const effectiveIncludedItems = includedItems || EMPTY_NUMBER_ARRAY;
  const effectiveExcludedItems = excludedItems || EMPTY_NUMBER_ARRAY;
  const effectiveHighlightedItems = highlightedItems || EMPTY_NUMBER_ARRAY;

  const [searchQuery, setSearchQuery] = useState('');

  // Fetch metadata based on type
  const { data: tagsMetadata, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags-metadata'],
    queryFn: async () => {
      const response = await getTagsMetadata();
      return response.data.tags as TagMetadata[];
    },
    enabled: type === 'tags' && !itemsProp, // Only fetch if not using legacy items prop
  });

  const { data: collectionsMetadata, isLoading: collectionsLoading } = useQuery({
    queryKey: ['collections-metadata'],
    queryFn: async () => {
      const response = await getCollectionsMetadata();
      return response.data.collections as CollectionMetadata[];
    },
    enabled: type === 'collections' && !itemsProp,
  });

  // Use fetched metadata or fall back to items prop for legacy support
  const items = useMemo(() => {
    if (itemsProp) return itemsProp;
    if (type === 'tags') return (tagsMetadata || []) as unknown as T[];
    if (type === 'collections') return (collectionsMetadata || []) as unknown as T[];
    return [];
  }, [itemsProp, type, tagsMetadata, collectionsMetadata]);

  const isLoading = (type === 'tags' && tagsLoading) || (type === 'collections' && collectionsLoading);

  // Filter items based on search, and sort selected/highlighted items to top
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

    // For tags, move selected (included or excluded) tags to top
    if (type === 'tags') {
      const selected = filtered.filter(item => {
        const itemId = getItemId(item);
        return effectiveIncludedItems.includes(itemId) || effectiveExcludedItems.includes(itemId);
      });
      const unselected = filtered.filter(item => {
        const itemId = getItemId(item);
        return !effectiveIncludedItems.includes(itemId) && !effectiveExcludedItems.includes(itemId);
      });

      // Sort selected alphabetically
      selected.sort((a, b) => getItemLabel(a).localeCompare(getItemLabel(b)));

      // Sort unselected: group by sample count, then alphabetically
      const unselectedWithSamples = unselected.filter(item => (item.sample_count ?? 0) >= 1);
      const unselectedWithoutSamples = unselected.filter(item => (item.sample_count ?? 0) === 0);

      unselectedWithSamples.sort((a, b) => getItemLabel(a).localeCompare(getItemLabel(b)));
      unselectedWithoutSamples.sort((a, b) => getItemLabel(a).localeCompare(getItemLabel(b)));

      // Combine: selected first, then unselected with samples, then unselected without samples
      filtered = [...selected, ...unselectedWithSamples, ...unselectedWithoutSamples];
    } else {
      // For non-tags, sort highlighted items to top
      if (effectiveHighlightedItems.length > 0) {
        filtered = [...filtered].sort((a, b) => {
          const aHighlighted = effectiveHighlightedItems.includes(getItemId(a));
          const bHighlighted = effectiveHighlightedItems.includes(getItemId(b));

          if (aHighlighted && !bHighlighted) return -1;
          if (!aHighlighted && bHighlighted) return 1;
          return 0;
        });
      }
    }

    return filtered;
  }, [items, searchQuery, effectiveIncludedItems, effectiveExcludedItems, effectiveHighlightedItems, getItemLabel, getItemId, type]);

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
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading {type}...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No {type} found
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const itemId = getItemId(item);
                const itemLabel = getItemLabel(item);
                const sampleCount = item.sample_count;
                const isIncluded = effectiveIncludedItems.includes(itemId);
                const isExcluded = effectiveExcludedItems.includes(itemId);
                const isHighlighted = effectiveHighlightedItems.includes(itemId);

                // Get tag color for styling (if available)
                const tagColor = type === 'tags' && tagColorMap ? tagColorMap.get(itemId) : null;

                // Calculate background color
                let backgroundColor: string | undefined;
                let textColor: string | undefined;

                if (type === 'tags' && tagColor) {
                  // For tags with colors, use the tag color with 50% transparency
                  if (isIncluded || isHighlighted) {
                    // Convert hex to rgba with 50% opacity
                    const hex = tagColor.replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16);
                    const g = parseInt(hex.substring(2, 4), 16);
                    const b = parseInt(hex.substring(4, 6), 16);
                    backgroundColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
                  } else if (isExcluded) {
                    backgroundColor = 'rgb(239, 68, 68)'; // red-500
                    textColor = 'white';
                  }
                }

                // Check if we need to insert a separator (for tags only)
                // Show separator between selected and unselected tags, or between tags with/without samples
                const prevItem = filteredItems[index - 1];
                const prevItemId = prevItem ? getItemId(prevItem) : null;
                const prevIsSelected = prevItemId ?
                  (effectiveIncludedItems.includes(prevItemId) || effectiveExcludedItems.includes(prevItemId)) : false;
                const currentIsSelected = isIncluded || isExcluded;

                const showSeparator = type === 'tags' && index > 0 && (
                  // Separator between selected and unselected
                  (prevIsSelected && !currentIsSelected) ||
                  // Separator between tags with samples and without (only in unselected section)
                  (!prevIsSelected && !currentIsSelected &&
                   (prevItem?.sample_count ?? 0) >= 1 && (item.sample_count ?? 0) === 0)
                );

                return (
                  <>
                    {showSeparator && (
                      <div key={`separator-${itemId}`} className="py-1.5">
                        <div className="border-t border-border/50" />
                      </div>
                    )}
                    <div
                      key={itemId}
                      className={`
                        flex items-center justify-between px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
                        ${!backgroundColor && isIncluded ? 'bg-green-500/50 text-primary-foreground' : ''}
                        ${!backgroundColor && isExcluded ? 'bg-red-500 text-white' : ''}
                        ${!backgroundColor && !isIncluded && !isExcluded && isHighlighted ? 'bg-yellow-500/20 outline-1 outline-yellow-500 dark:bg-yellow-200/10' : ''}
                        ${!backgroundColor && !isIncluded && !isExcluded && !isHighlighted ? 'hover:bg-accent hover:text-accent-foreground' : ''}
                      `}
                      style={backgroundColor ? { backgroundColor, color: textColor } : undefined}
                      onClick={() => handleItemClick(itemId, false)}
                      onContextMenu={(e) => {
                        if (showExclude) {
                          e.preventDefault();
                          handleItemClick(itemId, true);
                        }
                      }}
                      title={showExclude ? 'Left-click to include, right-click to exclude' : 'Click to select'}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {type === 'tags' && tagColorMap && (
                          <TagIcon
                            className="flex-shrink-0 w-4 h-4"
                            style={{ color: tagColorMap.get(itemId) || '#6b7280' }}
                          />
                        )}
                        <span className="truncate">{itemLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sampleCount !== undefined && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {sampleCount}
                          </span>
                        )}
                        {(isIncluded || isExcluded) && (
                          <button
                            onClick={(e) => {
                              if (isIncluded) {
                                handleRemoveIncluded(e, itemId);
                              } else {
                                handleRemoveExcluded(e, itemId);
                              }
                            }}
                            className="ml-1 hover:opacity-70 transition-opacity"
                            title="Remove filter"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {(effectiveIncludedItems.length > 0 || effectiveExcludedItems.length > 0) && (
          <div className="px-3 py-2 border-t border-border bg-muted/50">
            <div className="text-xs text-muted-foreground space-y-1">
              {effectiveIncludedItems.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Include:</span>
                  <span>{effectiveIncludedItems.length}</span>
                </div>
              )}
              {effectiveExcludedItems.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Exclude:</span>
                  <span>{effectiveExcludedItems.length}</span>
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
