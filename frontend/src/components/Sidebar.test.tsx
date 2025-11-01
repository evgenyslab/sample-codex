import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import type { HealthStatus, AppStats } from '../types';

// Wrapper for Router context
const renderWithRouter = (ui: React.ReactElement, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);
  return render(ui, { wrapper: BrowserRouter });
};

describe('Sidebar', () => {
  const mockStats: AppStats = {
    samples: 1234,
    tags: 56,
    collections: 12,
    folders: 8,
  };

  const mockHealth: HealthStatus = {
    status: 'ok',
    database: true,
  };

  const defaultProps = {
    onAddFolders: vi.fn(),
    onOpenSettings: vi.fn(),
    stats: mockStats,
    health: mockHealth,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the app title', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      expect(screen.getByText('Sampvr')).toBeInTheDocument();
    });

    it('renders all navigation items', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Browser')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('Collections')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('renders Add Folders button', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      expect(screen.getByText('Add Folders')).toBeInTheDocument();
    });

    it('renders Settings button', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders stats when provided', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.getByText('56')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('renders connection status when connected', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('renders disconnected status when not connected', () => {
      const disconnectedHealth: HealthStatus = {
        status: 'error',
        database: false,
      };
      renderWithRouter(<Sidebar {...defaultProps} health={disconnectedHealth} />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('renders 0 for stats when null', () => {
      renderWithRouter(<Sidebar {...defaultProps} stats={null} />);
      expect(screen.getAllByText('0')).toHaveLength(4); // 4 stat items
    });
  });

  describe('Navigation', () => {
    it('highlights active route', () => {
      renderWithRouter(<Sidebar {...defaultProps} />, { route: '/dashboard' });
      const dashboardButton = screen.getByText('Dashboard').closest('button');
      expect(dashboardButton).toHaveClass('bg-muted', 'text-foreground');
    });

    it('does not highlight inactive routes', () => {
      renderWithRouter(<Sidebar {...defaultProps} />, { route: '/dashboard' });
      const tagsButton = screen.getByText('Tags').closest('button');
      expect(tagsButton).not.toHaveClass('bg-muted');
      expect(tagsButton).toHaveClass('text-muted-foreground');
    });
  });

  describe('Interactions', () => {
    it('calls onAddFolders when Add Folders is clicked', async () => {
      const user = userEvent.setup();
      const onAddFolders = vi.fn();

      renderWithRouter(<Sidebar {...defaultProps} onAddFolders={onAddFolders} />);

      const addButton = screen.getByText('Add Folders').closest('button');
      if (addButton) await user.click(addButton);

      expect(onAddFolders).toHaveBeenCalledTimes(1);
    });

    it('calls onOpenSettings when Settings is clicked', async () => {
      const user = userEvent.setup();
      const onOpenSettings = vi.fn();

      renderWithRouter(<Sidebar {...defaultProps} onOpenSettings={onOpenSettings} />);

      const settingsButton = screen.getByText('Settings').closest('button');
      if (settingsButton) await user.click(settingsButton);

      expect(onOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Collapse functionality', () => {
    it('starts expanded by default', () => {
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);
      const sidebar = container.querySelector('.w-64');
      expect(sidebar).toBeInTheDocument();
    });

    it('collapses when toggle button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);

      const toggleButton = container.querySelector('button[title="Collapse sidebar"]');
      expect(toggleButton).toBeInTheDocument();

      if (toggleButton) await user.click(toggleButton);

      const collapsedSidebar = container.querySelector('.w-16');
      expect(collapsedSidebar).toBeInTheDocument();
    });

    it('persists collapsed state to localStorage', async () => {
      const user = userEvent.setup();
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);

      const toggleButton = container.querySelector('button[title="Collapse sidebar"]');
      if (toggleButton) await user.click(toggleButton);

      expect(localStorage.getItem('sidebar-collapsed')).toBe('true');
    });

    it('loads collapsed state from localStorage', () => {
      localStorage.setItem('sidebar-collapsed', 'true');

      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);
      const collapsedSidebar = container.querySelector('.w-16');
      expect(collapsedSidebar).toBeInTheDocument();
    });

    it('expands from collapsed state when clicked again', async () => {
      const user = userEvent.setup();
      localStorage.setItem('sidebar-collapsed', 'true');

      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);

      const toggleButton = container.querySelector('button[title="Expand sidebar"]');
      if (toggleButton) await user.click(toggleButton);

      const expandedSidebar = container.querySelector('.w-64');
      expect(expandedSidebar).toBeInTheDocument();
      expect(localStorage.getItem('sidebar-collapsed')).toBe('false');
    });
  });

  describe('Compact number formatting', () => {
    it('displays numbers under 1000 as-is when expanded', () => {
      const stats: AppStats = {
        samples: 999,
        tags: 50,
        collections: 10,
        folders: 5,
      };
      renderWithRouter(<Sidebar {...defaultProps} stats={stats} />);
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    it('displays >1k for numbers over 1000 when collapsed', () => {
      localStorage.setItem('sidebar-collapsed', 'true');

      const stats: AppStats = {
        samples: 5000,
        tags: 1500,
        collections: 10,
        folders: 5,
      };

      renderWithRouter(<Sidebar {...defaultProps} stats={stats} />);

      // In collapsed mode, numbers > 1000 show as '>1k'
      const samplesDisplay = screen.getByText('>1k');
      expect(samplesDisplay).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has tooltips on collapsed items', () => {
      localStorage.setItem('sidebar-collapsed', 'true');
      const { container } = renderWithRouter(<Sidebar {...defaultProps} />);

      const addFoldersButton = container.querySelector('button[title="Add Folders"]');
      const settingsButton = container.querySelector('button[title="Settings"]');

      expect(addFoldersButton).toBeInTheDocument();
      expect(settingsButton).toBeInTheDocument();
    });

    it('has no tooltips on expanded items', () => {
      renderWithRouter(<Sidebar {...defaultProps} />);

      const dashboardButton = screen.getByText('Dashboard').closest('button');
      expect(dashboardButton).toHaveAttribute('title', '');
    });
  });
});
