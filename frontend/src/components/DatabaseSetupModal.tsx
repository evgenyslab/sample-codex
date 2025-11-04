import { useState } from 'react';
import { initializeDatabase } from '../services/api';
import FolderBrowserModal from './FolderBrowserModal';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onSuccess: () => void;
}

const DatabaseSetupModal = ({ isOpen, onSuccess }: DatabaseSetupModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDatabaseBrowser, setShowDatabaseBrowser] = useState(false);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string | null>(null);
  const [newDbName, setNewDbName] = useState('samples.db');

  if (!isOpen) return null;

  const handleLoadExisting = () => {
    setError(null);
    setShowDatabaseBrowser(true);
  };

  const handleDatabaseSelected = async (dbPath: string) => {
    setShowDatabaseBrowser(false);
    setIsLoading(true);
    setError(null);

    try {
      const response = await initializeDatabase({
        mode: 'load',
        path: dbPath,
      });

      if (response.data.success) {
        onSuccess();
      } else {
        setError(response.data.error || 'Failed to load database');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChooseFolder = () => {
    setError(null);
    setShowFolderBrowser(true);
  };

  const handleFolderSelected = (folderPath: string) => {
    setShowFolderBrowser(false);
    setSelectedFolderPath(folderPath);
  };

  const handleAcceptFolder = async () => {
    if (!selectedFolderPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await initializeDatabase({
        mode: 'create',
        path: selectedFolderPath,
        name: newDbName,
      });

      if (response.data.success) {
        onSuccess();
      } else {
        setError(response.data.error || 'Failed to create database');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div
          className="bg-card border border-border rounded-lg shadow-2xl max-w-5xl w-full mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border bg-muted/50">
            <h2 className="text-2xl font-semibold text-foreground">Database Setup</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Choose how you want to set up your audio sample database
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-6 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Split screen options */}
          <div className="grid grid-cols-2 divide-x divide-border">
            {/* Load Existing Database */}
            <div className="p-8">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mb-4">
                  <svg
                    className="w-6 h-6 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-2">Load Existing Database</h3>
                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  Browse and select a previously created database file (.db) from your system. This allows you to continue
                  working with an existing sample library.
                </p>

                <button
                  onClick={handleLoadExisting}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-muted disabled:text-muted-foreground text-white rounded-md font-medium transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Browse for Database'}
                </button>
              </div>
            </div>

            {/* Create New Database */}
            <div className="p-8 bg-muted/20">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>

                <h3 className="text-xl font-semibold text-foreground mb-2">Create New Database</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a fresh database in a folder of your choice. You'll be able to start scanning and
                  organizing your audio samples immediately.
                </p>

                <div className="mb-4">
                  <label htmlFor="db-name" className="block text-sm font-medium text-foreground mb-2">
                    Database Name
                  </label>
                  <input
                    id="db-name"
                    type="text"
                    value={newDbName}
                    onChange={(e) => setNewDbName(e.target.value)}
                    placeholder="samples.db"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must end with .db extension
                  </p>
                </div>

                {/* Show selected folder path */}
                {selectedFolderPath && (
                  <div className="mb-4 p-3 bg-background border border-input rounded-md">
                    <p className="text-xs font-medium text-foreground mb-1">Database will be created at:</p>
                    <p className="text-sm font-mono text-muted-foreground break-all">
                      {selectedFolderPath}/{newDbName}
                    </p>
                  </div>
                )}

                {/* Buttons */}
                <div className={`mt-auto ${selectedFolderPath ? 'grid grid-cols-2 gap-2' : ''}`}>
                  {!selectedFolderPath ? (
                    <button
                      onClick={handleChooseFolder}
                      disabled={!newDbName}
                      className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground text-white rounded-md font-medium transition-colors"
                    >
                      Choose Folder Location
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleChooseFolder}
                        disabled={isLoading}
                        className="px-4 py-3 bg-muted hover:bg-muted/80 disabled:bg-muted disabled:text-muted-foreground text-foreground rounded-md font-medium transition-colors"
                      >
                        Change
                      </button>
                      <button
                        onClick={handleAcceptFolder}
                        disabled={isLoading || !newDbName}
                        className="px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-muted disabled:text-muted-foreground text-white rounded-md font-medium transition-colors"
                      >
                        {isLoading ? 'Creating...' : 'Accept'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/50">
            <p className="text-xs text-muted-foreground text-center">
              Your database stores all information about your audio samples, tags, and collections
            </p>
          </div>
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

      {/* Folder Browser Modal (for creating new database) */}
      {showFolderBrowser && (
        <FolderBrowserModal
          isOpen={showFolderBrowser}
          onClose={() => setShowFolderBrowser(false)}
          onConfirm={handleFolderSelected}
          mode="select-folder"
        />
      )}
    </>
  );
};

export default DatabaseSetupModal;
