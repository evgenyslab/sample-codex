import { XIcon, MoonIcon, SunIcon } from './ui/Icons';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { clearAllData, healthCheck, initializeDatabase, reconcileDatabase } from '../services/api';
import { toast } from 'sonner';
import FolderBrowserModal from './FolderBrowserModal';
import OrphanedFilesModal from './OrphanedFilesModal';
import type { ReconcileStats } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [isClearing, setIsClearing] = useState(false);
  const [showDatabaseBrowser, setShowDatabaseBrowser] = useState(false);
  const [databasePath, setDatabasePath] = useState<string>('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileStats, setReconcileStats] = useState<ReconcileStats | null>(null);
  const [showOrphanedFilesModal, setShowOrphanedFilesModal] = useState(false);
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

  // Fetch database path on open
  useEffect(() => {
    if (isOpen) {
      healthCheck()
        .then((response) => {
          setDatabasePath(response.data.database_path);
        })
        .catch((error) => {
          console.error('Failed to fetch database path:', error);
        });
    }
  }, [isOpen]);

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

  const handleClearAllData = async () => {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearAllData();

      // Refetch all queries to refresh the UI
      queryClient.refetchQueries({ queryKey: ['folders'] });
      queryClient.refetchQueries({ queryKey: ['samples'] });
      queryClient.refetchQueries({ queryKey: ['samples-all'] });
      queryClient.refetchQueries({ queryKey: ['tags'] });
      queryClient.refetchQueries({ queryKey: ['collections'] });

      toast.success('All data cleared successfully');
      onClose();
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error('Failed to clear data');
    } finally {
      setIsClearing(false);
    }
  };

  const handleChangeDatabase = () => {
    setShowDatabaseBrowser(true);
  };

  const handleDatabaseSelected = async (dbPath: string) => {
    setShowDatabaseBrowser(false);

    try {
      const response = await initializeDatabase({
        mode: 'load',
        path: dbPath,
      });

      if (response.data.success) {
        toast.success('Database changed successfully. Reloading...');
        // Reload the page to use the new database
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error(response.data.error || 'Failed to load database');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load database');
    }
  };

  const handleReconcile = async () => {
    setIsReconciling(true);
    setReconcileStats(null);

    try {
      const response = await reconcileDatabase();
      setReconcileStats(response.data.stats);

      if (response.data.stats.orphaned_files > 0) {
        toast.warning(
          `Reconciliation complete. Found ${response.data.stats.orphaned_files} orphaned file(s).`,
          {
            action: {
              label: 'View',
              onClick: () => setShowOrphanedFilesModal(true),
            },
          }
        );
      } else {
        toast.success('Reconciliation complete. All files are accessible.');
      }

      // Refetch samples to update any visual indicators
      queryClient.invalidateQueries({ queryKey: ['samples'] });
    } catch (error) {
      console.error('Failed to reconcile database:', error);
      toast.error('Failed to reconcile database');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleViewOrphanedFiles = () => {
    setShowOrphanedFilesModal(true);
  };


  return (
    <div
      className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-card/80 backdrop-blur-md rounded-lg shadow-2xl w-full max-w-2xl flex flex-col border-2 border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-card-foreground">Settings</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-card-foreground transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Database Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-card-foreground">Database</h3>

            {/* Database Path */}
            <div className="p-3 bg-muted/50 rounded-md border border-border">
              <p className="text-xs text-muted-foreground mb-1">Database Location</p>
              <p className="text-xs font-mono text-card-foreground break-all">
                {databasePath || 'Loading...'}
              </p>
            </div>

            {/* Change Database */}
            <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-md border border-blue-500/20">
              <div>
                <p className="text-sm text-card-foreground">Change Database</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Load a different database file
                </p>
              </div>
              <button
                onClick={handleChangeDatabase}
                className="px-3 py-1.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
              >
                Change DB
              </button>
            </div>

            {/* Reconcile Database */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-md border border-amber-500/20">
                <div>
                  <p className="text-sm text-card-foreground">Reconcile Database</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Verify all file locations and mark missing files
                  </p>
                </div>
                <button
                  onClick={handleReconcile}
                  disabled={isReconciling}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isReconciling ? 'Reconciling...' : 'Reconcile'}
                </button>
              </div>

              {/* Reconcile Stats */}
              {reconcileStats && (
                <div className="p-3 bg-muted/50 rounded-md border border-border text-xs space-y-1">
                  <p className="font-medium text-card-foreground mb-2">Reconciliation Results:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Total Files:</span>{' '}
                      <span className="text-card-foreground font-mono">{reconcileStats.total_files}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Locations:</span>{' '}
                      <span className="text-card-foreground font-mono">{reconcileStats.total_locations}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valid:</span>{' '}
                      <span className="text-green-500 font-mono">{reconcileStats.valid_locations}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Missing:</span>{' '}
                      <span className="text-red-500 font-mono">{reconcileStats.missing_locations}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Orphaned Files:</span>{' '}
                      <span className="text-amber-500 font-mono">{reconcileStats.orphaned_files}</span>
                      {reconcileStats.orphaned_files > 0 && (
                        <button
                          onClick={handleViewOrphanedFiles}
                          className="ml-2 text-amber-500 hover:text-amber-600 underline"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clear All Data */}
            <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-md border border-red-500/20">
              <div>
                <p className="text-sm text-card-foreground">Clear All Data</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete all samples, tags, and collections
                </p>
              </div>
              <button
                onClick={handleClearAllData}
                disabled={isClearing}
                className="px-3 py-1.5 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {isClearing ? 'Clearing...' : 'Clear All'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-between">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 w-9 text-muted-foreground hover:text-card-foreground hover:bg-accent-foreground/10"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-9 px-3 text-card-foreground bg-accent-foreground/20 hover:bg-accent-foreground/50 hover:text-accent-foreground"
          >
            Close
          </button>
        </div>
      </div>

      {/* Database Browser Modal */}
      {showDatabaseBrowser && (
        <FolderBrowserModal
          isOpen={showDatabaseBrowser}
          onClose={() => setShowDatabaseBrowser(false)}
          onConfirm={handleDatabaseSelected}
          mode="select-database"
          fileFilter=".db"
        />
      )}

      {/* Orphaned Files Modal */}
      <OrphanedFilesModal
        isOpen={showOrphanedFilesModal}
        onClose={() => setShowOrphanedFilesModal(false)}
      />
    </div>
  );
};

export default SettingsModal;
