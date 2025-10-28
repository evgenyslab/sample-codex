import { CollectionIcon, DashboardIcon, FolderIcon, PlusIcon, SearchIcon, SettingsIcon, TagIcon } from './ui/Icons'

import { useState } from 'react'

const Sidebar = ({ onAddFolders, onOpenSettings, stats, health }) => {
  const [activeView, setActiveView] = useState('dashboard')

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
    { id: 'browser', label: 'Browser', Icon: FolderIcon },
    { id: 'tags', label: 'Tags', Icon: TagIcon },
    { id: 'collections', label: 'Collections', Icon: CollectionIcon },
    { id: 'search', label: 'Search', Icon: SearchIcon },
  ]

  return (
    <div className="w-64 border-r bg-background h-screen flex flex-col">
      {/* Header - No divider */}
      <div className="px-6 pt-6 pb-4">
        <h2 className="text-lg font-semibold tracking-tight">Audio Sample Manager</h2>
        <p className="text-xs text-muted-foreground mt-1">Organize your sounds</p>
      </div>

      {/* Add Folders Button */}
      <div className="px-3 pb-4">
        <button
          onClick={onAddFolders}
          className="w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 text-sm font-medium bg-primary hover:bg-gray-100 text-primary-foreground"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Add Folders</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.Icon
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 text-sm font-medium hover:bg-gray-100 ${
                activeView === item.id
                  ? 'bg-muted text-foreground bg-gray-50'  // active view css
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Stats Footer */}
      <div className="p-3 space-y-3">
        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          className="w-full text-left px-3 py-2 rounded-md transition-colors flex items-center gap-3 text-sm font-medium text-muted-foreground hover:bg-gray-100"
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>

        <div className="space-y-2 pt-3 border-t">
          {/* Connection Status */}
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs text-muted-foreground">Status</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${
                health?.database ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-xs font-medium text-foreground">
                {health?.database ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Samples</span>
            <span className="text-xs font-medium text-foreground">{stats?.samples || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Tags</span>
            <span className="text-xs font-medium text-foreground">{stats?.tags || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Collections</span>
            <span className="text-xs font-medium text-foreground">{stats?.collections || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Folders</span>
            <span className="text-xs font-medium text-foreground">{stats?.folders || 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
