// Icons using @tabler/icons-react library
import {
  IconLayoutDashboard,
  IconFolder,
  IconTag,
  IconBooks,
  IconSearch,
  IconMusic,
  IconSettings,
  IconPlus,
  IconChevronUp,
  IconX
} from '@tabler/icons-react'

// Re-export with consistent naming and default size
export const DashboardIcon = ({ className = "w-4 h-4" }) => (
  <IconLayoutDashboard className={className} stroke={1.5} />
)

export const FolderIcon = ({ className = "w-4 h-4" }) => (
  <IconFolder className={className} stroke={1.5} />
)

export const TagIcon = ({ className = "w-4 h-4" }) => (
  <IconTag className={className} stroke={1.5} />
)

export const CollectionIcon = ({ className = "w-4 h-4" }) => (
  <IconBooks className={className} stroke={1.5} />
)

export const SearchIcon = ({ className = "w-4 h-4" }) => (
  <IconSearch className={className} stroke={1.5} />
)

export const MusicIcon = ({ className = "w-4 h-4" }) => (
  <IconMusic className={className} stroke={1.5} />
)

export const SettingsIcon = ({ className = "w-4 h-4" }) => (
  <IconSettings className={className} stroke={1.5} />
)

export const PlusIcon = ({ className = "w-4 h-4" }) => (
  <IconPlus className={className} stroke={1.5} />
)

export const ChevronUpIcon = ({ className = "w-4 h-4" }) => (
  <IconChevronUp className={className} stroke={1.5} />
)

export const XIcon = ({ className = "w-4 h-4" }) => (
  <IconX className={className} stroke={1.5} />
)
