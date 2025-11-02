// Icons using @tabler/icons-react library
import {
  IconBook,
  IconBookFilled,
  IconBooks,
  IconChevronUp,
  IconCornerLeftUp,
  IconFolder,
  IconFolderFilled,
  IconLayoutDashboard,
  IconMoon,
  IconMusic,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
  IconTag,
  IconTagFilled,
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

export const FolderFilledIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconFolderFilled className={className} />
);

export const TagIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconTag className={className} stroke={1.5} />
);

export const TagFilledIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconTagFilled className={className} stroke={1.5} />
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

export const BookIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconBook className={className} stroke={1.5} />
);

export const BookFilledIcon = ({ className = "w-4 h-4" }: IconProps) => (
  <IconBookFilled className={className} stroke={1.5} />
);
