// Example usage of FilterPane component for different types

import FilterPane from './FilterPane'
import { useState } from 'react'

// Example 1: Tags (with include/exclude)
function TagFilterExample() {
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

// Example 2: Folders (with custom label accessor)
function FolderFilterExample() {
  const [selectedFolders, setSelectedFolders] = useState([])
  const [isVisible, setIsVisible] = useState(true)

  const folders = [
    { id: 1, path: '/samples/drums', sample_count: 150 },
    { id: 2, path: '/samples/synths', sample_count: 200 },
    { id: 3, path: '/samples/vocals', sample_count: 75 },
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
      isVisible={isVisible}
      onToggleVisibility={setIsVisible}
      getItemLabel={(folder) => folder.path}
      getItemId={(folder) => folder.id}
      showExclude={false}  // Folders don't need exclude
    />
  )
}

// Example 3: Collections (simple selection)
function CollectionFilterExample() {
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [isVisible, setIsVisible] = useState(true)

  const collections = [
    { id: 1, name: 'Favorites', item_count: 50 },
    { id: 2, name: 'Project A', item_count: 30 },
    { id: 3, name: 'Workbench', item_count: 15 },
  ]

  const handleCollectionClick = (collectionId) => {
    // Single selection
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
      isVisible={isVisible}
      onToggleVisibility={setIsVisible}
      showExclude={false}
    />
  )
}

// Example 4: Multiple FilterPanes side by side
function MultipleFilterPanesExample() {
  return (
    <div className="flex gap-2">
      <TagFilterExample />
      <FolderFilterExample />
      <CollectionFilterExample />
    </div>
  )
}

export { TagFilterExample, FolderFilterExample, CollectionFilterExample, MultipleFilterPanesExample }
