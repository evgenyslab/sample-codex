import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CollectionPopup from './CollectionPopup';
import * as api from '../../services/api';
import type { Collection, Sample } from '../../types';

// Mock the API
vi.mock('../../services/api', () => ({
  createCollection: vi.fn(),
}));

describe('CollectionPopup', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnCollectionCreated = vi.fn();

  const mockCollections: Collection[] = [
    { id: 1, name: 'drums', description: '' },
    { id: 2, name: 'bass', description: '' },
    { id: 3, name: 'synth', description: '' },
  ];

  const mockSamples: Sample[] = [
    {
      id: 1,
      filename: 'sample1.wav',
      filepath: '/path/to/sample1.wav',
      duration: 1.0,
      sample_rate: 44100,
      channels: 2,
      folder_id: 1,
      collections: [mockCollections[0], mockCollections[1]], // in drums and bass
    },
    {
      id: 2,
      filename: 'sample2.wav',
      filepath: '/path/to/sample2.wav',
      duration: 2.0,
      sample_rate: 44100,
      channels: 2,
      folder_id: 1,
      collections: [mockCollections[0]], // only in drums
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPopup = (props = {}) => {
    return render(
      <CollectionPopup
        isOpen={true}
        onClose={mockOnClose}
        selectedSampleIds={[1, 2]}
        allCollections={mockCollections}
        samples={mockSamples}
        onSave={mockOnSave}
        onCollectionCreated={mockOnCollectionCreated}
        {...props}
      />
    );
  };

  describe('Rendering', () => {
    it('renders nothing when closed', () => {
      const { container } = renderPopup({ isOpen: false });
      expect(container.firstChild).toBeNull();
    });

    it('renders popup when open', () => {
      renderPopup();
      expect(screen.getByText('Add to Collections')).toBeInTheDocument();
    });

    it('renders header with title', () => {
      renderPopup();
      expect(screen.getByText('Add to Collections')).toBeInTheDocument();
    });

    it('renders selected sample count', () => {
      renderPopup();
      expect(screen.getByText('2 samples selected')).toBeInTheDocument();
    });

    it('renders singular sample text for single selection', () => {
      renderPopup({ selectedSampleIds: [1] });
      expect(screen.getByText('1 sample selected')).toBeInTheDocument();
    });

    it('renders close button', () => {
      renderPopup();
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.some(btn => btn.querySelector('svg'))).toBe(true);
    });

    it('renders search input', () => {
      renderPopup();
      expect(screen.getByPlaceholderText('Search or create collection...')).toBeInTheDocument();
    });

    it('renders all collections', () => {
      renderPopup();
      expect(screen.getByText('drums')).toBeInTheDocument();
      expect(screen.getByText('bass')).toBeInTheDocument();
      expect(screen.getByText('synth')).toBeInTheDocument();
    });

    it('renders footer with cancel and save buttons', () => {
      renderPopup();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('renders empty state when no collections', () => {
      renderPopup({ allCollections: [] });
      expect(screen.getByText('No collections found')).toBeInTheDocument();
    });
  });

  describe('Close functionality', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn => btn.querySelector('svg') && btn.textContent === '');
      if (xButton) {
        await user.click(xButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderPopup();

      await user.click(screen.getByText('Cancel'));
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = renderPopup();

      const backdrop = container.querySelector('.collection-popup-overlay');
      if (backdrop as HTMLElement) {
        await user.click(backdrop as HTMLElement);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderPopup();

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('does not close when popup content is clicked', async () => {
      const user = userEvent.setup();
      renderPopup();

      await user.click(screen.getByText('Add to Collections'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('clears search when closing', async () => {
      const user = userEvent.setup();
      const { rerender } = renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...') as HTMLInputElement;
      await user.type(searchInput, 'test');

      await user.click(screen.getByText('Cancel'));

      rerender(
        <CollectionPopup
          isOpen={true}
          onClose={mockOnClose}
          selectedSampleIds={[1, 2]}
          allCollections={mockCollections}
          samples={mockSamples}
          onSave={mockOnSave}
          onCollectionCreated={mockOnCollectionCreated}
        />
      );

      const newSearchInput = screen.getByPlaceholderText('Search or create collection...') as HTMLInputElement;
      expect(newSearchInput.value).toBe('');
    });
  });

  describe('Collection state management', () => {
    it('shows checked state for collections all samples are in', () => {
      renderPopup();
      const checkboxes = screen.getAllByRole('checkbox');
      const drumsCheckbox = checkboxes[0]; // drums - both samples are in it
      expect(drumsCheckbox).toBeChecked();
    });

    it('shows indeterminate state for collections some samples are in', () => {
      renderPopup();
      const checkboxes = screen.getAllByRole('checkbox');
      const bassCheckbox = checkboxes[1]; // bass - only sample 1 is in it
      expect(bassCheckbox).not.toBeChecked();
      expect((bassCheckbox as HTMLInputElement).indeterminate).toBe(true);
    });

    it('shows unchecked state for collections no samples are in', () => {
      renderPopup();
      const checkboxes = screen.getAllByRole('checkbox');
      const synthCheckbox = checkboxes[2]; // synth - no samples are in it
      expect(synthCheckbox).not.toBeChecked();
      expect((synthCheckbox as HTMLInputElement).indeterminate).toBe(false);
    });
  });

  describe('Collection toggle functionality', () => {
    it('toggles collection from checked to unchecked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      const drumsCheckbox = checkboxes[0]; // drums - checked

      await user.click(drumsCheckbox);

      expect(drumsCheckbox).not.toBeChecked();
    });

    it('toggles collection from unchecked to checked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      const synthCheckbox = checkboxes[2]; // synth - unchecked

      await user.click(synthCheckbox);

      expect(synthCheckbox).toBeChecked();
    });

    it('toggles collection from indeterminate to checked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      const bassCheckbox = checkboxes[1]; // bass - indeterminate

      await user.click(bassCheckbox);

      expect(bassCheckbox).toBeChecked();
    });

    it('shows "Unsaved changes" after toggling', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Toggle synth

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });

    it('enables save button after changes', async () => {
      const user = userEvent.setup();
      renderPopup();

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Toggle synth

      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Search functionality', () => {
    it('filters collections by search query', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'drum');

      expect(screen.getByText('drums')).toBeInTheDocument();
      expect(screen.queryByText('bass')).not.toBeInTheDocument();
      expect(screen.queryByText('synth')).not.toBeInTheDocument();
    });

    it('filters collections case-insensitively', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'DRUMS');

      expect(screen.getByText('drums')).toBeInTheDocument();
    });

    it('shows "No collections found" message when search has no results', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No collections found')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows validation error for invalid characters', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'Invalid Name!');

      expect(screen.getByText('Only lowercase letters, numbers, dots (.), underscores (_), and dashes (-) are allowed')).toBeInTheDocument();
    });

    it('does not show validation error for valid names', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'valid-name_123.test');

      expect(screen.queryByText('Only lowercase letters, numbers, dots (.), underscores (_), and dashes (-) are allowed')).not.toBeInTheDocument();
    });

    it('allows lowercase letters', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'abcdef');

      expect(screen.queryByText(/Only lowercase/)).not.toBeInTheDocument();
    });

    it('allows numbers', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'test123');

      expect(screen.queryByText(/Only lowercase/)).not.toBeInTheDocument();
    });

    it('allows dots, underscores, and dashes', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'test.name_with-dash');

      expect(screen.queryByText(/Only lowercase/)).not.toBeInTheDocument();
    });

    it('rejects uppercase letters', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'TestName');

      expect(screen.getByText(/Only lowercase/)).toBeInTheDocument();
    });

    it('rejects spaces', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'test name');

      expect(screen.getByText(/Only lowercase/)).toBeInTheDocument();
    });

    it('rejects special characters', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'test@name');

      expect(screen.getByText(/Only lowercase/)).toBeInTheDocument();
    });
  });

  describe('Collection creation', () => {
    it('shows create option for new valid collection name', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'newcollection');

      expect(screen.getByText('Create collection "')).toBeInTheDocument();
      expect(screen.getByText('newcollection')).toBeInTheDocument();
    });

    it('does not show create option for existing collection', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'drums');

      expect(screen.queryByText('Create collection "')).not.toBeInTheDocument();
    });

    it('does not show create option for invalid names', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'Invalid Name');

      expect(screen.queryByText('Create collection "')).not.toBeInTheDocument();
    });

    it('does not show create option for empty search', () => {
      renderPopup();
      expect(screen.queryByText('Create collection "')).not.toBeInTheDocument();
    });

    it('creates collection when create option is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createCollection).mockResolvedValue({
        data: { id: 4, name: 'newcollection', description: '' },
      } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'newcollection');

      const createOption = screen.getByText('Create collection "').closest('.collection-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(api.createCollection).toHaveBeenCalledWith({ name: 'newcollection', description: '' });
        });
      }
    });

    it('marks new collection as checked after creation', async () => {
      const user = userEvent.setup();
      const newCollection = { id: 4, name: 'newcollection', description: '' };
      vi.mocked(api.createCollection).mockResolvedValue({ data: newCollection } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'newcollection');

      const createOption = screen.getByText('Create collection "').closest('.collection-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
        });
      }
    });

    it('calls onCollectionCreated after creating collection', async () => {
      const user = userEvent.setup();
      const newCollection = { id: 4, name: 'newcollection', description: '' };
      vi.mocked(api.createCollection).mockResolvedValue({ data: newCollection } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'newcollection');

      const createOption = screen.getByText('Create collection "').closest('.collection-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(mockOnCollectionCreated).toHaveBeenCalledWith(newCollection);
        });
      }
    });

    it('clears search after creating collection', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createCollection).mockResolvedValue({
        data: { id: 4, name: 'newcollection', description: '' },
      } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...') as HTMLInputElement;
      await user.type(searchInput, 'newcollection');

      const createOption = screen.getByText('Create collection "').closest('.collection-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(searchInput.value).toBe('');
        });
      }
    });

    it('handles collection creation error gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      vi.mocked(api.createCollection).mockRejectedValue(new Error('Creation failed'));

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, 'newcollection');

      const createOption = screen.getByText('Create collection "').closest('.collection-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Error creating collection:', expect.any(Error));
          expect(alertSpy).toHaveBeenCalledWith('Failed to create collection');
        });
      }

      consoleErrorSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('Save functionality', () => {
    it('disables save button when no changes', () => {
      renderPopup();
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });

    it('calls onSave with correct payload when adding collections', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Check synth (was unchecked)

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith([3], []); // add synth, remove none
    });

    it('calls onSave with correct payload when removing collections', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Uncheck drums (was checked)

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith([], [1]); // add none, remove drums
    });

    it('calls onSave with correct payload when adding and removing collections', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Uncheck drums
      await user.click(checkboxes[2]); // Check synth

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith([3], [1]); // add synth, remove drums
    });

    it('calls onSave with correct payload when changing indeterminate to checked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Check bass (was indeterminate)

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith([2], []); // add bass to sample 2
    });

    it('calls onSave with correct payload when changing indeterminate to unchecked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Check bass (indeterminate -> checked)
      await user.click(checkboxes[1]); // Uncheck bass (checked -> unchecked)

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith([], [2]); // remove bass from sample 1
    });

    it('closes popup after save', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Check synth

      await user.click(screen.getByText('Save'));

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Keyboard shortcuts', () => {
    it('saves with Cmd+Enter', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Check synth to enable save

      await user.keyboard('{Meta>}{Enter}{/Meta}');

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('does not save with Cmd+Enter when no changes', async () => {
      const user = userEvent.setup();
      renderPopup();

      await user.keyboard('{Meta>}{Enter}{/Meta}');

      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('handles empty selectedSampleIds', () => {
      renderPopup({ selectedSampleIds: [] });
      expect(screen.getByText('0 samples selected')).toBeInTheDocument();
    });

    it('handles missing samples prop', () => {
      renderPopup({ samples: undefined });
      expect(screen.getByText('Add to Collections')).toBeInTheDocument();
    });

    it('handles missing allCollections prop', () => {
      renderPopup({ allCollections: undefined });
      expect(screen.getByText('No collections found')).toBeInTheDocument();
    });

    it('handles samples without collections', () => {
      const samplesWithoutCollections: Sample[] = [
        {
          id: 1,
          filename: 'sample1.wav',
          filepath: '/path/to/sample1.wav',
          duration: 1.0,
          sample_rate: 44100,
          channels: 2,
          folder_id: 1,
          collections: [],
        },
      ];

      renderPopup({ samples: samplesWithoutCollections, selectedSampleIds: [1] });
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked();
    });

    it('resets state when popup reopens', async () => {
      const { rerender } = renderPopup();
      const user = userEvent.setup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Check synth
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

      rerender(
        <CollectionPopup
          isOpen={false}
          onClose={mockOnClose}
          selectedSampleIds={[1, 2]}
          allCollections={mockCollections}
          samples={mockSamples}
          onSave={mockOnSave}
          onCollectionCreated={mockOnCollectionCreated}
        />
      );

      rerender(
        <CollectionPopup
          isOpen={true}
          onClose={mockOnClose}
          selectedSampleIds={[1, 2]}
          allCollections={mockCollections}
          samples={mockSamples}
          onSave={mockOnSave}
          onCollectionCreated={mockOnCollectionCreated}
        />
      );

      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });

    it('trims whitespace from collection names', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createCollection).mockResolvedValue({
        data: { id: 4, name: 'trimmed', description: '' },
      } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create collection...');
      await user.type(searchInput, '  trimmed  ');

      const createOption = screen.getByText('trimmed');
      expect(createOption).toBeInTheDocument();
    });
  });
});
