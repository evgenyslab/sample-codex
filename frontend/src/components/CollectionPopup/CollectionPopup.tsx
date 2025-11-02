import './CollectionPopup.css';

import { BookFilledIcon, BookIcon } from '../ui/Icons';
import type { Collection, Sample } from '../../types';
import { Plus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { createCollection } from '../../services/api';

type CollectionState = 'checked' | 'unchecked' | 'indeterminate';

interface CollectionStates {
  [collectionId: number]: CollectionState;
}

interface CollectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSampleIds?: number[];
  allCollections?: Collection[];
  samples?: Sample[];
  onSave?: (addCollectionIds: number[], removeCollectionIds: number[]) => void;
  onCollectionCreated?: (collection: Collection) => void;
}

/**
 * CollectionPopup Component
 *
 * Modal for batch adding samples to collections
 * - Displays all collections with checkboxes
 * - Shows common collections (all samples in) vs partial (some samples in)
 * - Search/filter collections
 * - Create new collections from search
 * - Save changes with batch API call
 */
export default function CollectionPopup({
  isOpen,
  onClose,
  selectedSampleIds = [],
  allCollections = [],
  samples = [],
  onSave,
  onCollectionCreated
}: CollectionPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collectionStates, setCollectionStates] = useState<CollectionStates>({});
  const [initialStates, setInitialStates] = useState<CollectionStates>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Calculate initial collection states when popup opens or samples change
  useEffect(() => {
    if (!isOpen || selectedSampleIds.length === 0) return;

    const states: CollectionStates = {};
    const selectedSamples = samples.filter(s => selectedSampleIds.includes(s.id));

    allCollections.forEach(collection => {
      // Count how many selected samples are in this collection
      const samplesInCollection = selectedSamples.filter(sample =>
        sample.collections?.some(c => c.id === collection.id)
      ).length;

      if (samplesInCollection === selectedSampleIds.length) {
        states[collection.id] = 'checked'; // All samples in this collection
      } else if (samplesInCollection > 0) {
        states[collection.id] = 'indeterminate'; // Some samples in this collection
      } else {
        states[collection.id] = 'unchecked'; // No samples in this collection
      }
    });

    setCollectionStates(states);
    setInitialStates(states);
    setHasChanges(false);
  }, [isOpen, selectedSampleIds, allCollections, samples]);

  // Validate collection name (lowercase letters, numbers, dots, underscores, dashes only)
  const validateCollectionName = (name: string) => {
    const validPattern = /^[a-z0-9._-]+$/;
    return validPattern.test(name);
  };

  // Check for validation errors in search query
  useEffect(() => {
    if (!searchQuery) {
      setValidationError('');
      return;
    }

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setValidationError('');
      return;
    }

    if (!validateCollectionName(trimmed)) {
      setValidationError('Only lowercase letters, numbers, dots (.), underscores (_), and dashes (-) are allowed');
    } else {
      setValidationError('');
    }
  }, [searchQuery]);

  // Filter collections by search query
  const filteredCollections = useMemo(() => {
    if (!searchQuery) return allCollections;

    const query = searchQuery.toLowerCase();
    return allCollections.filter(collection => collection.name.toLowerCase().includes(query));
  }, [allCollections, searchQuery]);

  // Check if search query could create a new collection
  const canCreateNewCollection = useMemo(() => {
    if (!searchQuery) return false;

    const trimmed = searchQuery.trim();
    if (!trimmed) return false;

    // Check if name is valid
    if (!validateCollectionName(trimmed)) return false;

    // Check if collection already exists
    const exists = allCollections.some(collection =>
      collection.name.toLowerCase() === trimmed.toLowerCase()
    );
    return !exists;
  }, [searchQuery, allCollections]);

  // Get new collection name for creation
  const getNewCollectionName = () => {
    return searchQuery.trim();
  };

  // Handle collection checkbox toggle
  const handleToggleCollection = (collectionId: number) => {
    setCollectionStates(prev => {
      const current = prev[collectionId] || 'unchecked';
      let next: CollectionState;

      // State transitions:
      // checked -> unchecked
      // unchecked -> checked
      // indeterminate -> checked (add to all samples)
      if (current === 'checked') {
        next = 'unchecked';
      } else {
        next = 'checked';
      }

      const newStates = { ...prev, [collectionId]: next };

      // Check if there are changes
      const changed = Object.keys(newStates).some(id => newStates[Number(id)] !== initialStates[Number(id)]);
      setHasChanges(changed);

      return newStates;
    });
  };

  // Handle create new collection
  const handleCreateCollection = async () => {
    const name = getNewCollectionName();
    try {
      const response = await createCollection({ name, description: '' });
      const newCollection = response.data;

      // Auto-check the new collection
      setCollectionStates(prev => ({
        ...prev,
        [newCollection.id]: 'checked'
      }));
      setHasChanges(true);

      // Clear search
      setSearchQuery('');

      // Notify parent to refetch
      if (onCollectionCreated) {
        onCollectionCreated(newCollection);
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      alert('Failed to create collection');
    }
  };

  // Handle save
  const handleSave = () => {
    // Calculate which collections to add and remove
    const addCollectionIds: number[] = [];
    const removeCollectionIds: number[] = [];

    Object.keys(collectionStates).forEach(collectionId => {
      const id = parseInt(collectionId);
      const currentState = collectionStates[id];
      const initialState = initialStates[id] || 'unchecked';

      // If changed from unchecked/indeterminate to checked -> add
      if (currentState === 'checked' && initialState !== 'checked') {
        addCollectionIds.push(id);
      }
      // If changed from checked/indeterminate to unchecked -> remove
      else if (currentState === 'unchecked' && initialState !== 'unchecked') {
        removeCollectionIds.push(id);
      }
    });

    onSave?.(addCollectionIds, removeCollectionIds);
    onClose();
  };

  // Handle close
  const handleClose = () => {
    setSearchQuery('');
    setHasChanges(false);
    onClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter' && e.metaKey && hasChanges) {
        // Cmd+Enter to save
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="collection-popup-overlay" onClick={handleClose}>
      <div className="collection-popup" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="collection-popup-header">
          <div>
            <h2 className="collection-popup-title">Add to Collections</h2>
            <p className="collection-popup-subtitle">
              {selectedSampleIds.length} sample{selectedSampleIds.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={handleClose} className="collection-popup-close">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="collection-popup-search">
          <input
            type="text"
            className="collection-search-input"
            placeholder="Search or create collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {validationError && (
            <div className="collection-validation-error">
              {validationError}
            </div>
          )}
        </div>

        {/* Collection List */}
        <div className="collection-popup-list">
          {filteredCollections.length === 0 && !canCreateNewCollection && (
            <div className="collection-popup-empty">
              No collections found
            </div>
          )}

          {filteredCollections.map((collection) => {
            const state = collectionStates[collection.id] || 'unchecked';

            return (
              <div
                key={collection.id}
                className="collection-item"
                onClick={() => handleToggleCollection(collection.id)}
              >
                 <span>
                  {state === 'checked' ? (
                        <BookFilledIcon className="w-5 h-5 text-green-500" />
                      ) : ( state === 'indeterminate' ? (
                        <BookIcon className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <BookIcon className="w-5 h-5 text-muted-foreground" />
                      ))}
                  </span>
                <label className="collection-item-label">
                  {collection.name}
                </label>
              </div>
            );
          })}

          {/* Create new collection option */}
          {canCreateNewCollection && (
            <div className="collection-create" onClick={handleCreateCollection}>
              <Plus className="collection-create-icon" />
              <span className="collection-create-label">
                Create collection "<span className="collection-create-name">{getNewCollectionName()}</span>"
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="collection-popup-footer">
          <div className="collection-popup-info">
            {hasChanges ? 'Unsaved changes' : ''}
          </div>
          <div className="collection-popup-actions">
            <button onClick={handleClose} className="collection-popup-button collection-popup-button-cancel">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="collection-popup-button collection-popup-button-save"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
