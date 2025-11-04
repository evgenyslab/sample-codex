import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { XIcon } from './ui/Icons';
import { getFileLocations, setPrimaryLocation, deleteFileLocation } from '../services/api';
import { toast } from 'sonner';
import type { FileLocation } from '../types';

interface DuplicateLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number;
  filename: string;
}

const DuplicateLocationsModal = ({ isOpen, onClose, fileId, filename }: DuplicateLocationsModalProps) => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch locations
  const { data: locationsData, isLoading, refetch } = useQuery({
    queryKey: ['file-locations', fileId],
    queryFn: async () => {
      const response = await getFileLocations(fileId);
      return response.data;
    },
    enabled: isOpen,
  });

  // Add escape key listener
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSetPrimary = async (locationId: number) => {
    setIsUpdating(true);
    try {
      await setPrimaryLocation(fileId, locationId);
      toast.success('Primary location updated');
      refetch();
      // Refresh samples list to show updated primary location
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to set primary location');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteLocation = async (location: FileLocation) => {
    if (!confirm(`Are you sure you want to remove this location?\n\n${location.file_path}`)) {
      return;
    }

    setIsUpdating(true);
    try {
      await deleteFileLocation(fileId, location.id);
      toast.success('Location removed');
      refetch();
      // Refresh samples list
      queryClient.invalidateQueries({ queryKey: ['samples'] });

      // If only one location left, close the modal
      if (locationsData && locationsData.locations.length <= 2) {
        onClose();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove location');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card/80 backdrop-blur-md rounded-lg shadow-2xl w-full max-w-3xl flex flex-col border-2 border-border max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
                Duplicate File Locations
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-mono">{filename}</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading locations...</div>
          ) : !locationsData || locationsData.locations.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">No locations found</div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This file exists in {locationsData.locations.length} locations.
                The primary location is used for playback and display.
              </p>

              {locationsData.locations.map((location) => (
                <div
                  key={location.id}
                  className={`p-4 rounded-md border transition-colors ${
                    location.is_primary
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-muted/50 border-border hover:border-border/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {location.is_primary && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500 text-white">
                            Primary
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          Discovered {new Date(location.discovered_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm font-mono text-card-foreground break-all">
                        {location.file_path}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!location.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(location.id)}
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Set Primary
                        </button>
                      )}
                      {locationsData.locations.length > 1 && (
                        <button
                          onClick={() => handleDeleteLocation(location)}
                          disabled={isUpdating}
                          className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {locationsData && locationsData.locations.length > 1 && (
              <span>Managing {locationsData.locations.length} duplicate locations</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 text-card-foreground bg-accent-foreground/20 hover:bg-accent-foreground/50 hover:text-accent-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateLocationsModal;
