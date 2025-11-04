import { ChevronUpIcon, FolderIcon, SearchIcon, XIcon } from './ui/Icons';
import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFoldersMetadata } from '../services/api';
import type { FolderMetadata } from '../types';

// Constant empty arrays to avoid re-creating on every render
const EMPTY_STRING_ARRAY: string[] = [];

interface TreeNode {
  name: string;
  fullPath: string;
  children: Record<string, TreeNode>;
  isFile: boolean;
  sampleCount?: number; // NEW: Count of samples in this folder
}

interface TreeResult {
  root: string;
  tree: Record<string, TreeNode>;
}

/**
 * Build a folder tree structure from folder metadata with counts
 */
function buildFolderTreeFromMetadata(folders: FolderMetadata[], commonRoot: string): TreeResult {
  if (!folders || folders.length === 0) return { root: commonRoot || '', tree: {} };

  const rootParts = commonRoot.split('/').filter(Boolean);

  // Build tree structure
  const tree: Record<string, TreeNode> = {};
  folders.forEach(({ path, sample_count }) => {
    const parts = path.split('/').filter(Boolean);
    const relativeParts = parts.slice(rootParts.length);

    if (relativeParts.length === 0) return;

    let current = tree;
    const folderPath: string[] = [];

    relativeParts.forEach((part, index) => {
      folderPath.push(part);
      const isLeaf = index === relativeParts.length - 1;

      if (!current[part]) {
        current[part] = {
          name: part,
          fullPath: path,
          children: {},
          isFile: false,
          sampleCount: isLeaf ? sample_count : undefined,
        };
      } else if (isLeaf && current[part]) {
        // Update sample count for leaf nodes
        current[part]!.sampleCount = sample_count;
      }
      current = current[part]!.children;
    });
  });

  return { root: commonRoot, tree };
}

/**
 * Build a folder tree structure from flat paths (legacy)
 */
function buildFolderTree(paths: string[]): TreeResult {
  if (!paths || paths.length === 0) return { root: '', tree: {} };

  // Find common root path
  const pathParts = paths.map(p => p.split('/').filter(Boolean));
  if (pathParts.length === 0) return { root: '', tree: {} };

  const commonRoot: string[] = [];
  const firstPath = pathParts[0];

  if (firstPath) {
    for (let i = 0; i < firstPath.length; i++) {
      const part = firstPath[i];
      if (part && pathParts.every(parts => parts[i] === part)) {
        commonRoot.push(part);
      } else {
        break;
      }
    }
  }

  const rootPath = '/' + commonRoot.join('/');

  // Build tree structure
  const tree: Record<string, TreeNode> = {};
  paths.forEach(path => {
    const parts = path.split('/').filter(Boolean);
    const relativeParts = parts.slice(commonRoot.length);

    if (relativeParts.length === 0) return;

    let current = tree;
    const folderPath: string[] = [];

    relativeParts.forEach((part) => {
      folderPath.push(part);

      if (!current[part]) {
        current[part] = {
          name: part,
          fullPath: '/' + [...commonRoot, ...folderPath].join('/'),
          children: {},
          isFile: false
        };
      }
      current = current[part]!.children;
    });
  });

  // If tree is empty but we have a common root, add the root as a single node
  if (Object.keys(tree).length === 0 && commonRoot.length > 0) {
    const rootName = commonRoot[commonRoot.length - 1];
    tree[rootName] = {
      name: rootName,
      fullPath: rootPath,
      children: {},
      isFile: false
    };
  }

  return { root: rootPath, tree };
}

interface FolderTreePaneProps {
  samplePaths?: string[];
  includedFolders?: string[];
  excludedFolders?: string[];
  onFolderClick?: (folderPath: string, isCtrlClick: boolean, isRightClick: boolean) => void;
  onRemoveIncluded?: (folderPath: string) => void;
  onRemoveExcluded?: (folderPath: string) => void;
  isVisible?: boolean;
  onToggleVisibility?: (visible: boolean) => void;
  expandToPath?: string; // Path to expand to (will expand all parent folders)
}

/**
 * FolderTreePane - A hierarchical folder filter with expand/collapse
 *
 * Click to select, Cmd/Ctrl+Click to add, Right-Click to exclude folders
 */
export default function FolderTreePane({
  samplePaths,
  includedFolders,
  excludedFolders,
  onFolderClick,
  onRemoveIncluded,
  onRemoveExcluded,
  isVisible = true,
  onToggleVisibility,
  expandToPath,
}: FolderTreePaneProps) {
  // Use constant empty arrays if props not provided to avoid re-renders
  const effectiveSamplePaths = samplePaths || EMPTY_STRING_ARRAY;
  const effectiveIncludedFolders = includedFolders || EMPTY_STRING_ARRAY;
  const effectiveExcludedFolders = excludedFolders || EMPTY_STRING_ARRAY;
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [searchExpandedFolders, setSearchExpandedFolders] = useState<Record<string, boolean>>({});

  // Fetch folders metadata from backend
  const { data: foldersData } = useQuery({
    queryKey: ['folders-metadata'],
    queryFn: async () => {
      const response = await getFoldersMetadata();
      return response.data;
    },
    enabled: !samplePaths, // Only fetch if not using legacy samplePaths prop
  });

  // Build folder tree from metadata or legacy sample paths
  const { tree } = useMemo(() => {
    if (effectiveSamplePaths.length > 0) {
      // Legacy: Build from sample paths
      const paths = effectiveSamplePaths.map(path => {
        const parts = path.split('/');
        parts.pop(); // Remove filename
        return parts.join('/');
      }).filter((path, index, self) => path && self.indexOf(path) === index);

      const result = buildFolderTree(paths);

      if (import.meta.env.DEV) {
        console.log('FolderTreePane (legacy) - Sample paths:', effectiveSamplePaths.length);
        console.log('FolderTreePane (legacy) - Unique directories:', paths.length);
        console.log('FolderTreePane (legacy) - Common root:', result.root);
      }

      return result;
    } else if (foldersData) {
      // New: Build from metadata
      const result = buildFolderTreeFromMetadata(foldersData.folders, foldersData.common_root);

      if (import.meta.env.DEV) {
        console.log('FolderTreePane (metadata) - Folders:', foldersData.folders.length);
        console.log('FolderTreePane (metadata) - Common root:', foldersData.common_root);
        console.log('FolderTreePane (metadata) - Tree structure:', result.tree);
      }

      return result;
    }
    return { tree: {} };
  }, [effectiveSamplePaths, foldersData]);

  // Filter folders based on search and collect paths to expand
  const { filteredTree, expandMap } = useMemo(() => {
    if (!searchQuery) {
      return { filteredTree: tree, expandMap: {} };
    }

    const toExpand: Record<string, boolean> = {};
    const filterTree = (node: Record<string, TreeNode>, parentPath = ''): Record<string, TreeNode> => {
      const filtered: Record<string, TreeNode> = {};
      Object.entries(node).forEach(([key, value]) => {
        if (value.isFile) return;

        const matchesSearch = key.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = filterTree(value.children, value.fullPath);

        if (matchesSearch || Object.keys(filteredChildren).length > 0) {
          filtered[key] = {
            ...value,
            children: filteredChildren
          };

          // Mark parent path for expansion
          if (parentPath) {
            toExpand[parentPath] = true;
          }

          // If this folder has matching children, expand it too
          if (Object.keys(filteredChildren).length > 0) {
            toExpand[value.fullPath] = true;
          }
        }
      });
      return filtered;
    };

    const result = filterTree(tree);
    return { filteredTree: result, expandMap: toExpand };
  }, [tree, searchQuery]);

  // Update search expanded folders when expandMap changes
  useEffect(() => {
    setSearchExpandedFolders(expandMap);
  }, [expandMap]);

  // Expand to specific path when expandToPath changes
  useEffect(() => {
    if (!expandToPath) return;

    // Build list of all parent paths that need to be expanded
    const pathsToExpand: Record<string, boolean> = {};

    // Walk up the path hierarchy and mark all parents for expansion
    let currentPath = expandToPath;
    while (currentPath && currentPath !== '/') {
      pathsToExpand[currentPath] = true;

      // Get parent path
      const lastSlashIndex = currentPath.lastIndexOf('/');
      if (lastSlashIndex <= 0) break;
      currentPath = currentPath.substring(0, lastSlashIndex);
    }

    // Update expanded folders state
    setExpandedFolders(prev => ({
      ...prev,
      ...pathsToExpand
    }));
  }, [expandToPath]);

  const toggleExpanded = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleFolderClick = (folderPath: string, isCtrlClick: boolean, isRightClick: boolean) => {
    if (onFolderClick) {
      onFolderClick(folderPath, isCtrlClick, isRightClick);
    }
  };

  const handleRemoveIncluded = (e: React.MouseEvent, folderPath: string) => {
    e.stopPropagation();
    if (onRemoveIncluded) {
      onRemoveIncluded(folderPath);
    }
  };

  const handleRemoveExcluded = (e: React.MouseEvent, folderPath: string) => {
    e.stopPropagation();
    if (onRemoveExcluded) {
      onRemoveExcluded(folderPath);
    }
  };

  const renderFolderTree = (node: Record<string, TreeNode>, depth = 0): ReactElement[] => {
    return Object.entries(node).map(([, value]) => {
      if (value.isFile) return null;

      // Use search-expanded state if searching, otherwise use manual expanded state
      const isExpanded = searchQuery
        ? searchExpandedFolders[value.fullPath] || expandedFolders[value.fullPath]
        : expandedFolders[value.fullPath];
      const hasChildren = Object.keys(value.children).length > 0;
      const isIncluded = effectiveIncludedFolders.includes(value.fullPath);
      const isExcluded = effectiveExcludedFolders.includes(value.fullPath);

      // Check if any child folder is selected (for parent highlighting)
      const normalizedPath = value.fullPath.endsWith('/') ? value.fullPath : value.fullPath + '/';
      const hasSelectedChild = effectiveIncludedFolders.some(folder =>
        folder !== value.fullPath && folder.startsWith(normalizedPath)
      ) || effectiveExcludedFolders.some(excluded =>
        excluded !== value.fullPath && excluded.startsWith(normalizedPath)
      );
      const hasExcludedChild = effectiveExcludedFolders.some(folder =>
        folder !== value.fullPath && folder.startsWith(normalizedPath)
      );

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
                  e.stopPropagation();
                  toggleExpanded(value.fullPath);
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
              onClick={(e) => handleFolderClick(value.fullPath, e.ctrlKey || e.metaKey, false)}
              onContextMenu={(e) => {
                e.preventDefault();
                handleFolderClick(value.fullPath, false, true);
              }}
              title={`${value.fullPath}\nClick to select, Cmd/Ctrl+Click to add, Right-Click to exclude`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate">{value.name}</span>
                {value.sampleCount !== undefined && (
                  <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                    {value.sampleCount}
                  </span>
                )}
              </div>

              {/* Remove Button */}
              {(isIncluded || isExcluded || hasSelectedChild) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isIncluded) {
                      handleRemoveIncluded(e, value.fullPath);
                    } else if (isExcluded) {
                      handleRemoveExcluded(e, value.fullPath);
                    } else if (hasSelectedChild) {
                      // Remove all child filters
                      const normalizedPath = value.fullPath.endsWith('/') ? value.fullPath : value.fullPath + '/';
                      effectiveIncludedFolders.forEach(folder => {
                        if (folder.startsWith(normalizedPath) && onRemoveIncluded) {
                          onRemoveIncluded(folder);
                        }
                      });
                      effectiveExcludedFolders.forEach(folder => {
                        if (folder.startsWith(normalizedPath) && onRemoveExcluded) {
                          onRemoveExcluded(folder);
                        }
                      });
                    }
                  }}
                  className="ml-2 hover:opacity-70 transition-opacity flex-shrink-0"
                  title={hasSelectedChild && !isIncluded && !isExcluded ? "Remove child filters" : "Remove filter"}
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
      );
    }).filter((el): el is ReactElement => el !== null);
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
        {(effectiveIncludedFolders.length > 0 || effectiveExcludedFolders.length > 0) && (
          <div className="px-3 py-2 border-t border-border bg-muted/50">
            <div className="text-xs text-muted-foreground space-y-1">
              {effectiveIncludedFolders.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Include:</span>
                  <span>{effectiveIncludedFolders.length}</span>
                </div>
              )}
              {effectiveExcludedFolders.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Exclude:</span>
                  <span>{effectiveExcludedFolders.length}</span>
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
    );
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
    );
  }

  return null;
}
