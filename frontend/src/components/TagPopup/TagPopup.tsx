import './TagPopup.css';

import { Plus, X } from 'lucide-react';
import type { Sample, Tag } from '../../types';
import { TagFilledIcon, TagIcon } from '../ui/Icons';
import { useEffect, useMemo, useState } from 'react';

import { createTag } from '../../services/api';

type TagState = 'checked' | 'unchecked' | 'indeterminate';

interface TagStates {
  [tagId: number]: TagState;
}

interface SavePayload {
  sampleIds: number[];
  addTagIds: number[];
  removeTagIds: number[];
}

interface TagPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSampleIds?: number[];
  allTags?: Tag[];
  samples?: Sample[];
  onSave?: (payload: SavePayload) => void;
  onTagCreated?: () => void;
}

/**
 * TagPopup Component
 *
 * Modal for batch tagging multiple samples
 * - Displays all tags with checkboxes
 * - Shows common tags (all samples have) vs partial tags (some samples have)
 * - Search/filter tags
 * - Create new tags from search
 * - Save changes with batch API call
 */
export default function TagPopup({
  isOpen,
  onClose,
  selectedSampleIds = [],
  allTags = [],
  samples = [],
  onSave,
  onTagCreated
}: TagPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tagStates, setTagStates] = useState<TagStates>({});
  const [initialStates, setInitialStates] = useState<TagStates>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Calculate initial tag states when popup opens or samples change
  useEffect(() => {
    if (!isOpen || selectedSampleIds.length === 0) return;

    const states: TagStates = {};
    const selectedSamples = samples.filter(s => selectedSampleIds.includes(s.id));

    allTags.forEach(tag => {
      // Count how many selected samples have this tag
      const samplesWithTag = selectedSamples.filter(sample =>
        sample.tags?.some(t => t.id === tag.id)
      ).length;

      if (samplesWithTag === selectedSampleIds.length) {
        states[tag.id] = 'checked'; // All samples have this tag
      } else if (samplesWithTag > 0) {
        states[tag.id] = 'indeterminate'; // Some samples have this tag
      } else {
        states[tag.id] = 'unchecked'; // No samples have this tag
      }
    });

    setTagStates(states);
    setInitialStates(states);
    setHasChanges(false);
  }, [isOpen, selectedSampleIds, allTags, samples]);

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    if (!searchQuery) return allTags;

    const query = searchQuery.toLowerCase();
    return allTags.filter(tag => tag.name.toLowerCase().includes(query));
  }, [allTags, searchQuery]);

  // Sorted tags by checkbox
  const sortedTags = useMemo(() => {
    return [...filteredTags].sort((a, b) => {
    const stateA = tagStates[a.id] || 'unchecked';
    const stateB = tagStates[b.id] || 'unchecked';
    
    // First sort by state
    const order = { checked: 0, indeterminate: 1, unchecked: 2 };
    const stateOrder = order[stateA] - order[stateB];
    
    // If same state, sort alphabetically by name
    if (stateOrder === 0) {
      return a.name.localeCompare(b.name);
    }
    
    return stateOrder;
  });
  }, [filteredTags, tagStates]);

  // Check if search query could create a new tag
  const canCreateNewTag = useMemo(() => {
    if (!searchQuery) return false;

    // Normalize: lowercase, no spaces
    const normalized = searchQuery.toLowerCase().replace(/\s+/g, '');
    if (!normalized) return false;

    // Check if tag already exists
    const exists = allTags.some(tag => tag.name === normalized);
    return !exists;
  }, [searchQuery, allTags]);

  // Get normalized tag name for creation
  const getNewTagName = () => {
    return searchQuery.toLowerCase().replace(/\s+/g, '');
  };

  // Handle tag checkbox toggle
  const handleToggleTag = (tagId: number) => {
    setTagStates(prev => {
      const current = prev[tagId] || 'unchecked';
      let next: TagState;

      // State transitions:
      // checked -> unchecked
      // unchecked -> checked
      // indeterminate -> checked (clicking partial state checks all)
      if (current === 'checked') {
        next = 'unchecked';
      } else {
        next = 'checked';
      }

      const newStates = { ...prev, [tagId]: next };

      // Check if anything changed from initial state
      const changed = Object.keys(newStates).some(id =>
        newStates[Number(id)] !== initialStates[Number(id)]
      );
      setHasChanges(changed);

      return newStates;
    });
  };

  // Handle create new tag
  const handleCreateTag = async () => {
    const newTagName = getNewTagName();

    try {
      console.log('Creating new tag:', newTagName);
      const response = await createTag({ name: newTagName });
      const newTag = response.data;

      console.log('Tag created:', newTag);

      // Add the new tag to checked state
      setTagStates(prev => ({
        ...prev,
        [newTag.id]: 'checked'
      }));

      // Mark as changed
      setHasChanges(true);

      // Notify parent to refetch tags
      onTagCreated?.();

      // Clear search
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to create tag:', error);
      // TODO: Show error message to user
    }
  };

  // Handle save
  const handleSave = () => {
    // Calculate which tags to add/remove
    const addTagIds: number[] = [];
    const removeTagIds: number[] = [];

    Object.keys(tagStates).forEach(tagIdStr => {
      const tagId = parseInt(tagIdStr);
      const current = tagStates[tagId];
      const initial = initialStates[tagId];

      if (current === 'checked' && initial !== 'checked') {
        // Tag should be added to samples that don't have it
        addTagIds.push(tagId);
      } else if (current === 'unchecked' && initial !== 'unchecked') {
        // Tag should be removed from samples that have it
        removeTagIds.push(tagId);
      }
    });

    console.log('Save changes:', {
      sampleIds: selectedSampleIds,
      addTagIds,
      removeTagIds
    });

    onSave?.({
      sampleIds: selectedSampleIds,
      addTagIds,
      removeTagIds
    });
  };

  // Handle close (Escape key)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="tag-popup-overlay" onClick={onClose}>
      <div className="tag-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tag-popup-header">
          <div>
            <h2 className="tag-popup-title">Tag Samples</h2>
            <p className="tag-popup-subtitle">
              {selectedSampleIds.length} sample{selectedSampleIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button className="tag-popup-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="tag-popup-search">
          <input
            type="text"
            className="tag-search-input"
            placeholder="Search or create tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Tag List */}
        <div className="tag-popup-list">
          {/* Create new tag option */}
          {canCreateNewTag && (
            <div className="tag-create" onClick={handleCreateTag}>
              <Plus size={18} className="tag-create-icon" />
              <div className="tag-create-label">
                Create tag <span className="tag-create-name">{getNewTagName()}</span>
              </div>
            </div>
          )}

          {/* Existing tags */}
          {sortedTags.length > 0 ? (
            sortedTags.map(tag => {
              const state = tagStates[tag.id] || 'unchecked';
              return (
                <div
                  key={tag.id}
                  className="tag-item"
                  onClick={() => handleToggleTag(tag.id)}
                >
                  <span>
                  {state === 'checked' ? (
                        <TagFilledIcon className="w-5 h-5 text-green-500" />
                      ) : ( state === 'indeterminate' ? (
                        <TagIcon className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <TagIcon className="w-5 h-5 text-muted-foreground" />
                      ))}
                  </span>
                  <label className="tag-item-label">
                    {tag.color && (
                      <span
                        className="tag-item-color"
                        style={{ backgroundColor: tag.color }}
                      />
                    )}
                    {tag.name}
                  </label>
                  {state === 'indeterminate' && (
                    <span className="tag-item-count" title="Some selected samples have this tag">
                      partial
                    </span>
                  )}
                </div>
              );
            })
          ) : searchQuery ? (
            <div className="tag-popup-empty">
              No tags found for "{searchQuery}"
            </div>
          ) : (
            <div className="tag-popup-empty">
              No tags available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="tag-popup-footer">
          <div className="tag-popup-info">
            {hasChanges ? 'You have unsaved changes' : ''}
          </div>
          <div className="tag-popup-actions">
            <button
              className="tag-popup-button tag-popup-button-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="tag-popup-button tag-popup-button-save"
              onClick={handleSave}
              disabled={!hasChanges}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
