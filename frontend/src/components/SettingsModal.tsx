import { XIcon } from './ui/Icons';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import Toggle from './ui/Toggle';
import { clearAllData } from '../services/api';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  const [isClearing, setIsClearing] = useState(false);
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();

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

      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['samples'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });

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
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-card-foreground">Theme</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Switch between light and dark mode
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Light</span>
              <Toggle
                pressed={theme === 'dark'}
                onPressedChange={toggleTheme}
                aria-label="Toggle theme"
              />
              <span className="text-xs text-muted-foreground">Dark</span>
            </div>
          </div>

          {/* Database Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-card-foreground">Database</h3>

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
        <div className="px-6 py-4 border-t border-border bg-muted flex items-center justify-end">
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
