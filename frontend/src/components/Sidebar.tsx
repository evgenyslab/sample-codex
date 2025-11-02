import type { AppStats, HealthStatus } from '../types';
import { ChevronUpIcon, CollectionIcon, DashboardIcon, FolderIcon, PlusIcon, SearchIcon, SettingsIcon, TagIcon } from './ui/Icons';
import { FastForward, Play, Repeat, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAudioPlayer } from '../contexts/AudioPlayerContext';

interface SidebarProps {
  onAddFolders: () => void;
  onOpenSettings: () => void;
  stats: AppStats | null;
  health: HealthStatus | null;
}

interface MenuItem {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const Sidebar = ({ onAddFolders, onOpenSettings, stats, health }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get audio player context
  const { isPlaying, isLoopEnabled, isAutoPlayEnabled, toggleLoop, toggleAutoPlay } = useAudioPlayer();

  // Initialize from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored_collapsed = localStorage.getItem('sidebar-collapsed');
    return stored_collapsed === 'true';
  });

  // Persist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon, path: '/dashboard' },
    { id: 'browser', label: 'Browser', Icon: FolderIcon, path: '/browser' },
    { id: 'tags', label: 'Tags', Icon: TagIcon, path: '/tags' },
    { id: 'collections', label: 'Collections', Icon: CollectionIcon, path: '/collections' },
    { id: 'search', label: 'Search', Icon: SearchIcon, path: '/search' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const formatCompactNumber = (num: number) => {
    if (num >= 1000) return '>1k';
    return num.toString().padStart(3, ' ');
  };

  return (
    <div className={`border-r bg-background h-full flex flex-col ${isCollapsed ? 'w-16' : 'w-64'}`}>
      {/* Header */}
      <div className={`px-3 pt-6 pb-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className={`overflow-hidden transition-opacity duration-150 ${isCollapsed ? 'opacity-0 w-0 display-none' : 'flex-1 px-3 opacity-100'}`}>
          <h2 className="text-lg font-semibold tracking-tight whitespace-nowrap">Samplvr</h2>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-md transition-colors text-muted-foreground hover:bg-accent hover:text-foreground flex-shrink-0 ${isCollapsed ? '' : ''}`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronUpIcon className={`w-4 h-4 transition-transform duration-150 ${isCollapsed ? 'rotate-90' : '-rotate-90'}`} />
        </button>
      </div>

      {/* Add Folders Button */}
      <div className="px-3">
        <button
          onClick={onAddFolders}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center text-sm font-medium text-muted-foreground hover:bg-accent ${
            isCollapsed ? 'justify-center' : 'gap-3'
          }`}
          title={isCollapsed ? 'Add Folders' : ''}
        >
          <PlusIcon className="w-4 h-4 flex-shrink-0" />
          <span className={`overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Add Folders</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center text-sm font-medium hover:bg-accent ${
                isCollapsed ? 'justify-center' : 'gap-3'
              } ${
                isActive(item.path)
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className={`overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Stats Footer */}
      <div className="p-3 space-y-3">
        {/* Audio Player Controls */}
        <div className={`${isCollapsed ? 'space-y-2' : 'flex gap-2'}`}>
          {/* Play/Stop Indicator (read-only) */}
          <div
            className={`px-3 py-2 rounded-md flex items-center text-sm font-medium ${
              isCollapsed ? 'justify-center w-full' : 'flex-1 justify-center'
            } ${
              isPlaying
                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                : 'bg-red-500/20 text-red-600 dark:text-red-400'
            }`}
            title={isPlaying ? 'Playing' : 'Stopped'}
          >
            {isPlaying ? <Play size={16} className="fill-current" /> : <Square size={16} className="fill-current" />}
          </div>

          {/* Loop Toggle Button */}
          <button
            onClick={toggleLoop}
            className={`px-3 py-2 rounded-md transition-colors flex items-center text-sm font-medium ${
              isCollapsed ? 'justify-center w-full' : 'flex-1 justify-center'
            } ${
              isLoopEnabled
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
            title={isLoopEnabled ? 'Loop Enabled' : 'Loop Disabled'}
          >
            <Repeat size={16} />
          </button>

          {/* AutoPlay Toggle Button */}
          <button
            onClick={toggleAutoPlay}
            className={`px-3 py-2 rounded-md transition-colors flex items-center text-sm font-medium ${
              isCollapsed ? 'justify-center w-full' : 'flex-1 justify-center'
            } ${
              isAutoPlayEnabled
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
            title={isAutoPlayEnabled ? 'AutoPlay Enabled' : 'AutoPlay Disabled'}
          >
            <FastForward size={16} />
          </button>
        </div>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center text-sm font-medium text-muted-foreground hover:bg-accent ${
            isCollapsed ? 'justify-center' : 'gap-3'
          }`}
          title={isCollapsed ? 'Settings' : ''}
        >
          <SettingsIcon className="w-4 h-4 flex-shrink-0" />
          <span className={`overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Settings</span>
        </button>

        <div className={`pt-3 border-t ${isCollapsed ? 'space-y-3' : 'space-y-2'}`}>
          {/* Connection Status */}
          <div className={`flex items-center pb-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <span className={`text-xs text-muted-foreground overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0 display-none' : 'opacity-100'}`}>Status</span>
            <div className="flex items-center">
              <div className={`rounded-full ${isCollapsed ? 'w-2 h-2' : 'w-1.5 h-1.5 gap-1.5'} ${
                health?.database ? 'bg-green-500' : 'bg-red-500'
              }`} title={health?.database ? 'Connected' : 'Disconnected'} />
              <span className={`text-xs font-medium text-foreground overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                {health?.database ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`} title={isCollapsed ? `Samples: ${stats?.samples || 0}` : ''}>
            <span className={`text-xs text-muted-foreground overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Samples</span>
            <span className={`text-xs font-medium text-foreground ${isCollapsed ? 'font-mono' : ''}`}>
              {isCollapsed ? formatCompactNumber(stats?.samples || 0) : (stats?.samples || 0)}
            </span>
          </div>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`} title={isCollapsed ? `Tags: ${stats?.tags || 0}` : ''}>
            <span className={`text-xs text-muted-foreground overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Tags</span>
            <span className={`text-xs font-medium text-foreground ${isCollapsed ? 'font-mono' : ''}`}>
              {isCollapsed ? formatCompactNumber(stats?.tags || 0) : (stats?.tags || 0)}
            </span>
          </div>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`} title={isCollapsed ? `Collections: ${stats?.collections || 0}` : ''}>
            <span className={`text-xs text-muted-foreground overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Collections</span>
            <span className={`text-xs font-medium text-foreground ${isCollapsed ? 'font-mono' : ''}`}>
              {isCollapsed ? formatCompactNumber(stats?.collections || 0) : (stats?.collections || 0)}
            </span>
          </div>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`} title={isCollapsed ? `Folders: ${stats?.folders || 0}` : ''}>
            <span className={`text-xs text-muted-foreground overflow-hidden transition-opacity duration-150 whitespace-nowrap ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>Folders</span>
            <span className={`text-xs font-medium text-foreground ${isCollapsed ? 'font-mono' : ''}`}>
              {isCollapsed ? formatCompactNumber(stats?.folders || 0) : (stats?.folders || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
