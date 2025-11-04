import { CornerLeftUpIcon, FolderIcon, FolderFilledIcon, XIcon } from './ui/Icons';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { browseFolders } from '../services/api';
import { useScanProgress } from '../hooks/useScanProgress';

interface FolderData {
  path: string;
  parent: string | null;
  directories: string[];
  files?: string[];
}

interface FolderBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'scan' | 'select-folder' | 'select-database';
  onConfirm?: (path: string) => void;
  fileFilter?: string; // e.g., ".db" for database files
}

const FolderBrowserModal = ({ isOpen, onClose, mode = 'scan', onConfirm, fileFilter }: FolderBrowserModalProps) => {
  const [currentPath, setCurrentPath] = useState('');
  const [checkedFolders, setCheckedFolders] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const queryClient = useQueryClient();
  const { startScan } = useScanProgress();

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

  const { data: folderData, isLoading } = useQuery({
    queryKey: ['browse', currentPath, mode, fileFilter],
    queryFn: async () => {
      const includeFiles = mode === 'select-database';
      const response = await browseFolders(
        currentPath || undefined,
        includeFiles,
        includeFiles ? fileFilter : undefined
      );
      return response.data as FolderData;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen && !currentPath) {
      // Will load home directory by default
      setCurrentPath('');
    }
  }, [isOpen, currentPath]);

  if (!isOpen) return null;

  const handleNavigate = (dirName: string) => {
    if (folderData) {
      const newPath = folderData.path + '/' + dirName;
      setCurrentPath(newPath);
      setCheckedFolders([]); // Clear checked folders when navigating
    }
  };

  const handleGoUp = () => {
    if (folderData?.parent) {
      setCurrentPath(folderData.parent);
      setCheckedFolders([]); // Clear checked folders when navigating
    }
  };

  const handleFolderCheck = (dirName: string) => {
    setCheckedFolders(prev => {
      if (prev.includes(dirName)) {
        return prev.filter(f => f !== dirName);
      } else {
        return [...prev, dirName];
      }
    });
  };

  const handleFileClick = (fileName: string) => {
    if (mode === 'select-database' && folderData && onConfirm) {
      const fullPath = folderData.path + '/' + fileName;
      onConfirm(fullPath);
      onClose();
    }
  };

  const handleConfirmSelection = () => {
    if (mode === 'select-folder') {
      // In select-folder mode, return the current path (not checked folders)
      if (folderData && onConfirm) {
        onConfirm(folderData.path);
        onClose();
      }
    } else if (mode === 'select-database') {
      // In select-database mode, files are clicked directly (no confirm button needed)
      // This shouldn't be called, but just in case
      return;
    } else {
      // In scan mode, scan the checked folders
      if (checkedFolders.length > 0 && !isScanning && folderData) {
        setIsScanning(true);

        // Convert checked folders to full paths
        const folderPaths = checkedFolders.map(dirName => folderData.path + '/' + dirName);

        // Start WebSocket scan
        startScan(folderPaths);

        // Wait a bit then close modal and refresh data
        setTimeout(() => {
          setIsScanning(false);
          setCheckedFolders([]);
          onClose();

          // Refresh queries after scan starts
          queryClient.invalidateQueries({ queryKey: ['folders'] });
          queryClient.invalidateQueries({ queryKey: ['samples'] });
        }, 200);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card/80 backdrop-blur-md rounded-lg shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col border-2 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-card px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-card-foreground">
                {mode === 'select-folder'
                  ? 'Choose Database Location'
                  : mode === 'select-database'
                  ? 'Select Database File'
                  : 'Select Folders to Scan'}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === 'select-folder'
                  ? 'Navigate to the folder where you want to create the database'
                  : mode === 'select-database'
                  ? 'Navigate to and select a database file'
                  : 'Navigate to and select folders containing audio files'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Path & Controls */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGoUp}
              disabled={!folderData?.parent}
              className="p-2 rounded-md transition-colors bg-accent text-primary hover:bg-primary/50 disabled:opacity-50 disabled:pointer-events-none"
              title="Go up one folder"
            >
              <CornerLeftUpIcon className="w-4 h-4" />
            </button>
            <div className="flex-1 px-3 py-2 bg-card border border-input rounded-md text-xs font-mono overflow-x-auto whitespace-nowrap text-card-foreground">
              {folderData?.path || 'Loading...'}
            </div>
          </div>
        </div>

        {/* Directory and File List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-card">
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
          ) : (
            <div className="space-y-1">
              {/* Directories */}
              {folderData?.directories && folderData.directories.length > 0 ? (
                folderData.directories.map((dir) => {
                  const isChecked = checkedFolders.includes(dir);
                  return (
                    <div
                      key={dir}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent rounded-md transition-colors text-sm text-card-foreground border border-transparent hover:border-border group"
                    >
                      {mode === 'scan' && (
                        <button
                          onClick={() => handleFolderCheck(dir)}
                          className="flex-shrink-0 cursor-pointer transition-colors"
                          aria-label={isChecked ? 'Unselect folder' : 'Select folder'}
                        >
                          {isChecked ? (
                            <FolderFilledIcon className="w-5 h-5 text-primary" />
                          ) : (
                            <FolderIcon className="w-5 h-5 text-muted-foreground group-hover:text-card-foreground" />
                          )}
                        </button>
                      )}
                      {(mode === 'select-folder' || mode === 'select-database') && (
                        <FolderIcon className="w-5 h-5 text-muted-foreground group-hover:text-card-foreground" />
                      )}
                      <button
                        onClick={() => handleNavigate(dir)}
                        className="flex-1 text-left hover:text-primary transition-colors cursor-pointer"
                      >
                        {dir}
                      </button>
                    </div>
                  );
                })
              ) : null}

              {/* Files (only in select-database mode) */}
              {mode === 'select-database' && folderData?.files && folderData.files.length > 0 ? (
                folderData.files.map((file) => (
                  <div
                    key={file}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent rounded-md transition-colors text-sm text-card-foreground border border-transparent hover:border-border group cursor-pointer"
                    onClick={() => handleFileClick(file)}
                  >
                    <svg
                      className="w-5 h-5 text-blue-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="flex-1 hover:text-primary transition-colors">{file}</span>
                  </div>
                ))
              ) : null}

              {/* Empty state */}
              {folderData &&
                folderData.directories.length === 0 &&
                (!folderData.files || folderData.files.length === 0) && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {mode === 'select-database' ? 'No database files found' : 'No subdirectories found'}
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-between">
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 text-card-foreground bg-accent-foreground/20 hover:bg-accent-foreground/50 hover:text-accent-foreground"
          >
            Cancel
          </button>
          {mode !== 'select-database' && (
            <button
              onClick={handleConfirmSelection}
              disabled={mode === 'scan' ? (checkedFolders.length === 0 || isScanning) : !folderData}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 text-primary bg-accent-foreground/20 hover:bg-accent-foreground/50 disabled:opacity-50 disabled:pointer-events-none"
            >
              {mode === 'select-folder'
                ? 'Select This Folder'
                : (isScanning ? 'Starting Scan...' : `Confirm${checkedFolders.length > 0 ? ` (${checkedFolders.length})` : ''}`)
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderBrowserModal;
