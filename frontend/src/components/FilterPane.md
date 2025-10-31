# FilterPane Component

A reusable, flexible filter pane component for displaying and filtering items like tags, folders, and collections.

## Features

- ✅ Search/filter items by name
- ✅ Include/exclude selection (configurable)
- ✅ Active filter summary
- ✅ Collapsible with toggle button
- ✅ Custom label and ID accessors
- ✅ Right-click for exclusion (optional)
- ✅ Visual feedback for selected/excluded items
- ✅ Keyboard accessible

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | Array of items to display |
| `type` | String | `'items'` | Type label (e.g., 'tags', 'folders', 'collections') |
| `includedItems` | Array | `[]` | Array of included item IDs |
| `excludedItems` | Array | `[]` | Array of excluded item IDs |
| `onItemClick` | Function | - | Callback when item is clicked: `(itemId, isRightClick) => void` |
| `onRemoveIncluded` | Function | - | Callback to remove from included: `(itemId) => void` |
| `onRemoveExcluded` | Function | - | Callback to remove from excluded: `(itemId) => void` |
| `isVisible` | Boolean | `true` | Whether the pane is visible |
| `onToggleVisibility` | Function | - | Callback to toggle visibility: `(visible) => void` |
| `getItemLabel` | Function | `item => item.name` | Function to extract label from item |
| `getItemId` | Function | `item => item.id` | Function to extract ID from item |
| `showExclude` | Boolean | `true` | Whether to show exclude functionality (right-click) |

## Usage Examples

### Basic Usage - Tags with Include/Exclude

```jsx
import FilterPane from './components/FilterPane'
import { useState } from 'react'

function MyComponent() {
  const [includedTags, setIncludedTags] = useState([])
  const [excludedTags, setExcludedTags] = useState([])
  const [isVisible, setIsVisible] = useState(true)

  const tags = [
    { id: 1, name: 'Drum' },
    { id: 2, name: 'Bass' },
    { id: 3, name: 'Synth' },
  ]

  const handleTagClick = (tagId, isRightClick) => {
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

  return (
    <FilterPane
      items={tags}
      type="tags"
      includedItems={includedTags}
      excludedItems={excludedTags}
      onItemClick={handleTagClick}
      onRemoveIncluded={(id) => setIncludedTags(includedTags.filter(i => i !== id))}
      onRemoveExcluded={(id) => setExcludedTags(excludedTags.filter(i => i !== id))}
      isVisible={isVisible}
      onToggleVisibility={setIsVisible}
      showExclude={true}
    />
  )
}
```

### Folders - Simple Selection (No Exclude)

```jsx
function FolderFilter() {
  const [selectedFolders, setSelectedFolders] = useState([])

  const folders = [
    { id: 1, path: '/samples/drums' },
    { id: 2, path: '/samples/synths' },
  ]

  const handleFolderClick = (folderId) => {
    if (selectedFolders.includes(folderId)) {
      setSelectedFolders(selectedFolders.filter(id => id !== folderId))
    } else {
      setSelectedFolders([...selectedFolders, folderId])
    }
  }

  return (
    <FilterPane
      items={folders}
      type="folders"
      includedItems={selectedFolders}
      excludedItems={[]}
      onItemClick={handleFolderClick}
      onRemoveIncluded={(id) => setSelectedFolders(selectedFolders.filter(i => i !== id))}
      onRemoveExcluded={() => {}}
      getItemLabel={(folder) => folder.path}  // Custom label
      showExclude={false}  // Disable right-click exclude
    />
  )
}
```

### Collections - Single Selection

```jsx
function CollectionFilter() {
  const [selectedCollection, setSelectedCollection] = useState(null)

  const collections = [
    { id: 1, name: 'Favorites' },
    { id: 2, name: 'Project A' },
  ]

  const handleCollectionClick = (collectionId) => {
    setSelectedCollection(collectionId === selectedCollection ? null : collectionId)
  }

  return (
    <FilterPane
      items={collections}
      type="collections"
      includedItems={selectedCollection ? [selectedCollection] : []}
      excludedItems={[]}
      onItemClick={handleCollectionClick}
      onRemoveIncluded={() => setSelectedCollection(null)}
      onRemoveExcluded={() => {}}
      showExclude={false}
    />
  )
}
```

### Custom Label and ID Accessors

```jsx
<FilterPane
  items={customItems}
  type="items"
  getItemLabel={(item) => `${item.title} (${item.count})`}
  getItemId={(item) => item.uuid}
  // ... other props
/>
```

## Behavior

### Click Interactions

- **Left-click**: Toggle include (adds to included items)
- **Right-click** (if `showExclude` is true): Toggle exclude (adds to excluded items)
- **X button**: Remove from included/excluded list

### Visual States

- **Normal**: Gray background on hover
- **Included**: Blue/primary background
- **Excluded**: Red background
- **Search**: Filters items by label in real-time

### Active Filter Summary

Shows count of included and excluded items at the bottom of the pane when filters are active.

## Styling

Uses Tailwind CSS with theme variables:
- `bg-card` - Card background
- `bg-primary` - Primary color for included items
- `bg-red-500` - Red for excluded items
- `text-foreground` - Foreground text
- `text-muted-foreground` - Muted text
- `border-border` - Border color

## Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Title attributes for tooltips
- Clear visual feedback for states

## Integration with Browser Page

The Browser page uses FilterPane for the tags filter:

```jsx
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
```

## Future Enhancements

- [ ] Multi-select with Ctrl/Cmd click
- [ ] Keyboard shortcuts (Space to toggle, Delete to remove)
- [ ] Drag-and-drop reordering
- [ ] Color indicators for items
- [ ] Count badges (e.g., number of samples per tag)
- [ ] Grouped items (categories)
- [ ] Saved filter presets
