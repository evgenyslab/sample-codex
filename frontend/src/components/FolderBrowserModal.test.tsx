import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FolderBrowserModal from './FolderBrowserModal';
import * as api from '../services/api';
import * as useScanProgressHook from '../hooks/useScanProgress';

// Mock the API
vi.mock('../services/api', () => ({
  browseFolders: vi.fn(),
}));

// Mock useScanProgress hook
vi.mock('../hooks/useScanProgress', () => ({
  useScanProgress: vi.fn(),
}));

describe('FolderBrowserModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();
  const mockStartScan = vi.fn();

  const mockFolderData = {
    path: '/home/user',
    parent: '/home',
    directories: ['Documents', 'Music', 'Downloads'],
  };

  const mockRootFolderData = {
    path: '/',
    parent: null,
    directories: ['home', 'usr', 'var'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Setup mocks
    vi.mocked(api.browseFolders).mockResolvedValue({
      data: mockFolderData,
    } as any);

    vi.mocked(useScanProgressHook.useScanProgress).mockReturnValue({
      startScan: mockStartScan,
    });
  });

  const renderModal = (isOpen = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <FolderBrowserModal isOpen={isOpen} onClose={mockOnClose} />
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = renderModal(false);
      expect(container.firstChild).toBeNull();
    });

    it('renders modal when open', async () => {
      renderModal();
      await waitFor(() => {
        expect(screen.getByText('Select Folders to Scan')).toBeInTheDocument();
      });
    });

    it('renders header with title and description', async () => {
      renderModal();
      await waitFor(() => {
        expect(screen.getByText('Select Folders to Scan')).toBeInTheDocument();
        expect(screen.getByText('Navigate to and select folders containing audio files')).toBeInTheDocument();
      });
    });

    it('renders close button', async () => {
      renderModal();
      await waitFor(() => {
        const closeButtons = screen.getAllByRole('button');
        expect(closeButtons.some(btn => btn.textContent === '' && btn.querySelector('svg'))).toBe(true);
      });
    });

    it('renders current path', async () => {
      renderModal();
      await waitFor(() => {
        expect(screen.getByText('/home/user')).toBeInTheDocument();
      });
    });

    it('renders directory list', async () => {
      renderModal();
      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
        expect(screen.getByText('Music')).toBeInTheDocument();
        expect(screen.getByText('Downloads')).toBeInTheDocument();
      });
    });

    it('shows loading state initially', () => {
      renderModal();
      const loadingElements = screen.getAllByText('Loading...');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('shows empty state when no directories', async () => {
      vi.mocked(api.browseFolders).mockResolvedValue({
        data: { ...mockFolderData, directories: [] },
      } as any);

      renderModal();
      await waitFor(() => {
        expect(screen.getByText('No subdirectories found')).toBeInTheDocument();
      });
    });
  });

  describe('Close functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Select Folders to Scan')).toBeInTheDocument();
      });

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.textContent === '' && btn.querySelector('svg'));
      if (xButton) {
        await user.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Select Folders to Scan')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderModal();

      await waitFor(() => {
        expect(screen.getByText('Select Folders to Scan')).toBeInTheDocument();
      });

      const backdrop = container.querySelector('.fixed.inset-0');
      if (backdrop as HTMLElement) {
        await user.click(backdrop as HTMLElement);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Select Folders to Scan')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when modal content is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Select Folders to Scan')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select Folders to Scan'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('navigates to subdirectory when clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Documents'));

      await waitFor(() => {
        expect(api.browseFolders).toHaveBeenCalledWith('/home/user/Documents');
      });
    });

    it('navigates up when up button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('/home/user')).toBeInTheDocument();
      });

      const upButton = screen.getByTitle('Go up one folder');
      await user.click(upButton);

      await waitFor(() => {
        expect(api.browseFolders).toHaveBeenCalledWith('/home');
      });
    });

    it('disables up button when at root', async () => {
      vi.mocked(api.browseFolders).mockResolvedValue({
        data: mockRootFolderData,
      } as any);

      renderModal();

      await waitFor(() => {
        const upButton = screen.getByTitle('Go up one folder');
        expect(upButton).toBeDisabled();
      });
    });

    it('clears checked folders when navigating', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      // Check a folder
      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);

      // Navigate
      await user.click(screen.getByText('Documents'));

      await waitFor(() => {
        // Confirm button should not show count after navigation
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });
    });
  });

  describe('Folder selection', () => {
    it('checks folder when checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);

      expect(checkboxes[0]!).toBeChecked();
    });

    it('unchecks folder when checkbox is clicked again', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);
      expect(checkboxes[0]!).toBeChecked();

      await user.click(checkboxes[0]!);
      expect(checkboxes[0]!).not.toBeChecked();
    });

    it('allows multiple folders to be checked', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);
      await user.click(checkboxes[1]!);

      expect(checkboxes[0]!).toBeChecked();
      expect(checkboxes[1]!).toBeChecked();
    });

    it('updates confirm button text with count', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);
      await user.click(checkboxes[1]!);

      expect(screen.getByText('Confirm (2)')).toBeInTheDocument();
    });

    it('stops propagation when checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      const initialCallCount = vi.mocked(api.browseFolders).mock.calls.length;

      await user.click(checkboxes[0]!);

      // Should not navigate to folder
      expect(api.browseFolders).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('Scan confirmation', () => {
    it('disables confirm button when no folders selected', async () => {
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Confirm')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm');
      expect(confirmButton).toBeDisabled();
    });

    it('enables confirm button when folders are selected', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);

      const confirmButton = screen.getByText('Confirm (1)');
      expect(confirmButton).not.toBeDisabled();
    });

    it('starts scan with selected folders', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);
      await user.click(checkboxes[1]!);

      await user.click(screen.getByText('Confirm (2)'));

      expect(mockStartScan).toHaveBeenCalledWith([
        '/home/user/Documents',
        '/home/user/Music',
      ]);
    });

    it('shows scanning state', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);

      await user.click(screen.getByText('Confirm (1)'));

      expect(screen.getByText('Starting Scan...')).toBeInTheDocument();
    });

    it('closes modal after scan starts', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);

      await user.click(screen.getByText('Confirm (1)'));

      vi.runAllTimers();

      expect(mockOnClose).toHaveBeenCalled();

      vi.useRealTimers();
    }, 10000);

    it('invalidates queries after scan starts', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
      await user.click(checkboxes[0]!);

      await user.click(screen.getByText('Confirm (1)'));

      vi.runAllTimers();

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['folders'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['samples'] });

      vi.useRealTimers();
    }, 10000);
  });

  describe('API integration', () => {
    it('fetches folder data on mount', async () => {
      renderModal();

      await waitFor(() => {
        expect(api.browseFolders).toHaveBeenCalledWith(null);
      }, { timeout: 3000 });
    });

    it('does not fetch when modal is closed', () => {
      renderModal(false);
      expect(api.browseFolders).not.toHaveBeenCalled();
    });

    it('passes current path to API', async () => {
      const user = userEvent.setup();
      renderModal();

      await waitFor(() => {
        expect(screen.getByText('Documents')).toBeInTheDocument();
      }, { timeout: 3000 });

      await user.click(screen.getByText('Documents'));

      await waitFor(() => {
        expect(api.browseFolders).toHaveBeenCalledWith('/home/user/Documents');
      }, { timeout: 3000 });
    });
  });
});
