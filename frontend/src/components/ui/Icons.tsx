// Icons using @tabler/icons-react library
import {
  IconBooks,
  IconChevronUp,
  IconCornerLeftUp,
  IconFolder,
  IconLayoutDashboard,
  IconMoon,
  IconMusic,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
  IconTag,
  IconX
} from '@tabler/icons-react';

interface IconProps {
  className?: string;
}

// Re-export with consistent naming and default size
export const DashboardIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconLayoutDashboard className={className} stroke={1.5} />
);

export const FolderIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconFolder className={className} stroke={1.5} />
);

export const TagIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconTag className={className} stroke={1.5} />
);

export const CollectionIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconBooks className={className} stroke={1.5} />
);

export const SearchIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconSearch className={className} stroke={1.5} />
);

export const MusicIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconMusic className={className} stroke={1.5} />
);

export const SettingsIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconSettings className={className} stroke={1.5} />
);

export const PlusIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconPlus className={className} stroke={1.5} />
);

export const ChevronUpIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconChevronUp className={className} stroke={1.5} />
);

export const XIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconX className={className} stroke={1.5} />
);

export const CornerLeftUpIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconCornerLeftUp className={className} stroke={1.5} />
);

export const MoonIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconMoon className={className} stroke={1.5} />
);

export const SunIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconSun className={className} stroke={1.5} />
);
