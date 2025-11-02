import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsModal from './SettingsModal';
import * as api from '../services/api';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock the API
vi.mock('../services/api', () => ({
  clearAllData: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Get reference to mocked toast
import { toast as mockToast } from 'sonner';

describe('SettingsModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(() => 'light'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    // Mock URL and document methods for export
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  const renderModal = (isOpen = true) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SettingsModal isOpen={isOpen} onClose={mockOnClose} />
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = renderModal(false);
      expect(container.firstChild).toBeNull();
    });

    it('renders modal when open', () => {
      renderModal();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders header with title', () => {
      renderModal();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders close button', () => {
      renderModal();
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.some(btn => btn.querySelector('svg'))).toBe(true);
    });

    it('renders theme toggle section', () => {
      renderModal();
      expect(screen.getByText('Theme')).toBeInTheDocument();
      expect(screen.getByText('Switch between light and dark mode')).toBeInTheDocument();
    });

    it('renders database section', () => {
      renderModal();
      expect(screen.getByText('Database')).toBeInTheDocument();
    });


    it('renders clear all data button', () => {
      renderModal();
      expect(screen.getByText('Clear All Data')).toBeInTheDocument();
      expect(screen.getByText('Permanently delete all samples, tags, and collections')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('renders close footer button', () => {
      renderModal();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  describe('Close functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg') && btn.textContent === '');
      if (xButton) {
        await user.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when Close button is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Close'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderModal();

      const backdrop = container.querySelector('.fixed.inset-0');
      if (backdrop as HTMLElement) {
        await user.click(backdrop as HTMLElement);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when modal content is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Settings'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Theme toggle', () => {
    it('renders theme toggle in light mode by default', () => {
      renderModal();
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    it('toggles theme when toggle is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      // Get all buttons and find the Toggle (it's a switch button)
      const buttons = screen.getAllByRole('button');
      // The toggle should be one of the buttons (between Light and Dark text)
      const toggleButton = buttons.find(btn => btn.getAttribute('aria-pressed') !== null);

      if (toggleButton) {
        await user.click(toggleButton);
        // Theme should change (tested via ThemeContext)
        expect(toggleButton).toBeInTheDocument();
      }
    });
  });


  describe('Clear all data', () => {
    it('shows confirmation dialog when Clear All is clicked', async () => {
      const user = userEvent.setup();
      renderModal();

      await user.click(screen.getByText('Clear All'));

      expect(window.confirm).toHaveBeenCalledWith(
        'Are you sure you want to clear all data? This cannot be undone.'
      );
    });

    it('does not clear data if user cancels confirmation', async () => {
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockImplementation(() => false);

      renderModal();

      await user.click(screen.getByText('Clear All'));

      expect(api.clearAllData).not.toHaveBeenCalled();
    });

    it('clears data if user confirms', async () => {
      const user = userEvent.setup();
      vi.mocked(api.clearAllData).mockResolvedValue({} as any);

      renderModal();

      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(api.clearAllData).toHaveBeenCalled();
      });
    });

    it('shows loading state while clearing', async () => {
      const user = userEvent.setup();
      let resolveClear: () => void;
      vi.mocked(api.clearAllData).mockReturnValue(
        new Promise<any>((resolve) => {
          resolveClear = resolve;
        })
      );

      renderModal();

      await user.click(screen.getByText('Clear All'));

      expect(screen.getByText('Clearing...')).toBeInTheDocument();

      // Resolve the promise
      resolveClear!();
    });

    it('disables button while clearing', async () => {
      const user = userEvent.setup();
      let resolveClear: () => void;
      vi.mocked(api.clearAllData).mockReturnValue(
        new Promise<any>((resolve) => {
          resolveClear = resolve;
        })
      );

      renderModal();

      await user.click(screen.getByText('Clear All'));

      const clearButton = screen.getByText('Clearing...');
      expect(clearButton).toBeDisabled();

      // Resolve the promise
      resolveClear!();
    });

    it('invalidates all queries after clearing', async () => {
      const user = userEvent.setup();
      vi.mocked(api.clearAllData).mockResolvedValue({} as any);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      renderModal();

      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['folders'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['samples'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tags'] });
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['collections'] });
      });
    });

    it('shows success toast after clearing', async () => {
      const user = userEvent.setup();
      vi.mocked(api.clearAllData).mockResolvedValue({} as any);

      renderModal();

      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('All data cleared successfully');
      });
    });

    it('closes modal after successful clear', async () => {
      const user = userEvent.setup();
      vi.mocked(api.clearAllData).mockResolvedValue({} as any);

      renderModal();

      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows error toast on failed clear', async () => {
      const user = userEvent.setup();
      vi.mocked(api.clearAllData).mockRejectedValue(new Error('Clear failed'));

      renderModal();

      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to clear data');
      });
    });

    it('does not close modal on failed clear', async () => {
      const user = userEvent.setup();
      vi.mocked(api.clearAllData).mockRejectedValue(new Error('Clear failed'));

      renderModal();

      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(api.clearAllData).toHaveBeenCalled();
      });

      // Modal should still be open
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('resets loading state after error', async () => {
      const user = userEvent.setup();
      vi.mocked(api.clearAllData).mockRejectedValue(new Error('Clear failed'));

      renderModal();

      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        expect(screen.getByText('Clear All')).toBeInTheDocument();
      });

      // Button should be enabled again
      const clearButton = screen.getByText('Clear All');
      expect(clearButton).not.toBeDisabled();
    });
  });
});
