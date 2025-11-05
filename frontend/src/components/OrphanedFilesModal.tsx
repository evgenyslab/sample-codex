import { XIcon } from './ui/Icons';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOrphanedFiles } from '../services/api';
import type { OrphanedFile } from '../types';

interface OrphanedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrphanedFilesModal = ({ isOpen, onClose }: OrphanedFilesModalProps) => {
  // Fetch orphaned files
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['orphaned-files'],
    queryFn: async () => {
      const response = await getOrphanedFiles();
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

  // Refetch when modal opens
  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card/80 backdrop-blur-md rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border-2 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
                Orphaned Files
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Files with no valid locations on disk. Metadata is preserved.
              </p>
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
        <div className="flex-1 overflow-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Loading orphaned files...</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-12">
              <p className="text-red-500">Failed to load orphaned files</p>
            </div>
          )}

          {data && data.total === 0 && (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No orphaned files found</p>
            </div>
          )}

          {data && data.total > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Found {data.total} orphaned file{data.total !== 1 ? 's' : ''}
              </p>

              {data.orphaned_files.map((file: OrphanedFile) => (
                <div
                  key={file.id}
                  className="p-4 bg-muted/50 rounded-md border border-border space-y-2"
                >
                  {/* File Info */}
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-card-foreground">
                          {file.alias || `File #${file.id}`}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                          Hash: {file.file_hash}
                        </p>
                      </div>
                      <div className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded">
                        Missing
                      </div>
                    </div>

                    {/* File Details */}
                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                      <span>Format: {file.format || 'Unknown'}</span>
                      <span>Size: {formatFileSize(file.file_size)}</span>
                      <span>Duration: {formatDuration(file.duration)}</span>
                      <span>{file.location_count} location(s)</span>
                      <span className="text-red-500">{file.missing_count} missing</span>
                    </div>

                    {/* Last Known Path */}
                    {file.last_known_path && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground">Last known location:</p>
                        <p className="text-xs font-mono text-card-foreground bg-background/50 px-2 py-1 rounded mt-1 break-all">
                          {file.last_known_path}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tags and Collections */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {/* Tags */}
                    {file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: tag.color
                                ? `${tag.color}20`
                                : 'rgba(100, 100, 100, 0.2)',
                              color: tag.color || 'inherit',
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Collections */}
                    {file.collections.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.collections.map((collection) => (
                          <span
                            key={collection.id}
                            className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-500"
                          >
                            📁 {collection.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {file.tags.length === 0 && file.collections.length === 0 && (
                      <span className="text-xs text-muted-foreground">No tags or collections</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted flex justify-end">
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

export default OrphanedFilesModal;
