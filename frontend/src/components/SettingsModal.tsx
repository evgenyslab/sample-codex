import { XIcon, MoonIcon, SunIcon } from './ui/Icons';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { clearAllData, healthCheck } from '../services/api';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [isClearing, setIsClearing] = useState(false);
  const [databasePath, setDatabasePath] = useState<string>('');
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
    </div>
  );
};

export default SettingsModal;
