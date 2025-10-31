# FolderTreePane Component

A hierarchical folder tree component with expand/collapse functionality for filtering samples by folder paths.

## Features

- ✅ Hierarchical folder tree display
- ✅ Expand/collapse folders
- ✅ Click to include, Shift+Click to exclude
- ✅ Common root path detection and removal
- ✅ Search/filter folders
- ✅ Visual differentiation for included/excluded folders
- ✅ Active filter summary
- ✅ Collapsible pane with toggle button
- ✅ Separate click areas for expand/collapse vs select

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `samplePaths` | Array | `[]` | Array of full file paths from samples |
| `includedFolders` | Array | `[]` | Array of included folder paths |
| `excludedFolders` | Array | `[]` | Array of excluded folder paths |
| `onFolderClick` | Function | - | Callback when folder is clicked: `(folderPath, isShiftClick) => void` |
| `onRemoveIncluded` | Function | - | Callback to remove from included: `(folderPath) => void` |
| `onRemoveExcluded` | Function | - | Callback to remove from excluded: `(folderPath) => void` |
| `isVisible` | Boolean | `true` | Whether the pane is visible |
| `onToggleVisibility` | Function | - | Callback to toggle visibility: `(visible) => void` |

## Usage

### Basic Usage

```jsx
import FolderTreePane from './components/FolderTreePane'
import { useState, useMemo } from 'react'

function MyComponent() {
  const [includedFolders, setIncludedFolders] = useState([])
  const [excludedFolders, setExcludedFolders] = useState([])
  const [isVisible, setIsVisible] = useState(true)

  // Extract paths from your samples
  const samplePaths = useMemo(() => {
    return samples.map(s => s.path).filter(Boolean)
  }, [samples])

  const handleFolderClick = (folderPath, isShiftClick) => {
    if (isShiftClick) {
      // Shift-click: toggle exclude
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

  return (
    <FolderTreePane
      samplePaths={samplePaths}
      includedFolders={includedFolders}
      excludedFolders={excludedFolders}
      onFolderClick={handleFolderClick}
      onRemoveIncluded={(path) => setIncludedFolders(includedFolders.filter(p => p !== path))}
      onRemoveExcluded={(path) => setExcludedFolders(excludedFolders.filter(p => p !== path))}
      isVisible={isVisible}
      onToggleVisibility={setIsVisible}
    />
  )
}
```

### Applying Folder Filters to Samples

```jsx
// Filter samples based on folder selections
const filteredSamples = useMemo(() => {
  let filtered = samples

  // Apply folder filters
  if (includedFolders.length > 0 || excludedFolders.length > 0) {
    filtered = filtered.filter(sample => {
      const samplePath = sample.path || ''

      // Check exclusions first
      if (excludedFolders.length > 0) {
        const isExcluded = excludedFolders.some(folder =>
          samplePath.startsWith(folder)
        )
        if (isExcluded) return false
      }

      // Check inclusions
      if (includedFolders.length > 0) {
        const isIncluded = includedFolders.some(folder =>
          samplePath.startsWith(folder)
        )
        return isIncluded
      }

      return true
    })
  }

  return filtered
}, [samples, includedFolders, excludedFolders])
```

## How It Works

### Common Root Detection

The component automatically detects the common root path from all sample paths and displays the tree relative to that root:

**Input paths:**
```
/Users/me/samples/drums/kick.wav
/Users/me/samples/drums/snare.wav
/Users/me/samples/synths/lead.wav
```

**Common root detected:** `/Users/me/samples`

**Tree displayed:**
```
📁 drums
  📁 (files)
📁 synths
  📁 (files)
```

### Tree Structure

The folder tree is built by:
1. Extracting directory paths from full file paths
2. Finding the common root
3. Building a hierarchical tree structure
4. Removing filename components (showing only directories)

### Click Interactions

- **Expand/Collapse Button** (chevron icon): Expands or collapses child folders
- **Folder Name Area**:
  - **Click**: Toggle include (adds to included folders)
  - **Shift+Click**: Toggle exclude (adds to excluded folders)
- **X Button**: Remove from included/excluded list

### Visual States

- **Normal**: Gray background on hover
- **Included**: Blue/primary background
- **Excluded**: Red background
- **Expanded**: Chevron points up, children visible
- **Collapsed**: Chevron points left, children hidden

### Filter Behavior

**Include Mode:**
- If any folders are included, only samples in those folders (or subfolders) are shown

**Exclude Mode:**
- Samples in excluded folders (or subfolders) are hidden

**Combined:**
- Exclusions are applied first (exclude takes precedence)
- Then inclusions are applied
- A folder cannot be both included and excluded at the same time

## Integration with Browser Page

The Browser page uses both FilterPane (tags) and FolderTreePane (folders) together:

```jsx
<div className="flex gap-2">
  {/* Tags Filter */}
  <FilterPane
    items={tagsData?.tags || []}
    type="tags"
    includedItems={includedTags}
    excludedItems={excludedTags}
    onItemClick={handleTagClick}
    // ... other props
  />

  {/* Folder Tree Filter */}
  <FolderTreePane
    samplePaths={samplePathsForFolderTree}
    includedFolders={includedFolders}
    excludedFolders={excludedFolders}
    onFolderClick={handleFolderClick}
    // ... other props
  />

  {/* Sample Browser */}
  <div>
    {/* Display filtered samples */}
  </div>
</div>
```

**Filter Flow:**
1. User selects tags → Filters samples by tags
2. Folder tree updates to show folders from tag-filtered samples
3. User selects folders → Further filters the already tag-filtered samples
4. Sample browser shows final filtered results

## Styling

Uses Tailwind CSS with theme variables:
- `bg-card` - Card background
- `bg-primary` - Primary color for included folders
- `bg-red-500` - Red for excluded folders
- `text-foreground` - Foreground text
- `text-muted-foreground` - Muted text
- `border-border` - Border color

## Accessibility

- Semantic HTML structure
- Clear click areas that don't overlap
- Title attributes for tooltips
- Keyboard-friendly (standard button behavior)
- Visual feedback for all states

## Performance

- Uses `useMemo` for tree building and filtering
- Efficient tree traversal
- Minimal re-renders with proper React keys
- Handles large folder structures well

## Future Enhancements

- [ ] Multi-select folders with Ctrl/Cmd click
- [ ] Expand/collapse all button
- [ ] Folder sample count badges
- [ ] Persist expanded state
- [ ] Drag to select multiple folders
- [ ] Breadcrumb navigation
- [ ] Context menu for folder operations
