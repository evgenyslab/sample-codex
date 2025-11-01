import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagPopup from './TagPopup';
import * as api from '../../services/api';
import type { Tag, Sample } from '../../types';

// Mock the API
vi.mock('../../services/api', () => ({
  createTag: vi.fn(),
}));

describe('TagPopup', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnTagCreated = vi.fn();

  const mockTags: Tag[] = [
    { id: 1, name: 'kick', color: '#ff0000' },
    { id: 2, name: 'snare', color: '#00ff00' },
    { id: 3, name: 'hihat', color: '#0000ff' },
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
      tags: [mockTags[0], mockTags[1]], // has kick and snare
    },
    {
      id: 2,
      filename: 'sample2.wav',
      filepath: '/path/to/sample2.wav',
      duration: 2.0,
      sample_rate: 44100,
      channels: 2,
      folder_id: 1,
      tags: [mockTags[0]], // has only kick
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPopup = (props = {}) => {
    return render(
      <TagPopup
        isOpen={true}
        onClose={mockOnClose}
        selectedSampleIds={[1, 2]}
        allTags={mockTags}
        samples={mockSamples}
        onSave={mockOnSave}
        onTagCreated={mockOnTagCreated}
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
      expect(screen.getByText('Tag Samples')).toBeInTheDocument();
    });

    it('renders header with title', () => {
      renderPopup();
      expect(screen.getByText('Tag Samples')).toBeInTheDocument();
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
      expect(screen.getByPlaceholderText('Search or create tag...')).toBeInTheDocument();
    });

    it('renders all tags', () => {
      renderPopup();
      expect(screen.getByText('kick')).toBeInTheDocument();
      expect(screen.getByText('snare')).toBeInTheDocument();
      expect(screen.getByText('hihat')).toBeInTheDocument();
    });

    it('renders tag colors', () => {
      const { container } = renderPopup();
      const colorSpans = container.querySelectorAll('.tag-item-color');
      expect(colorSpans.length).toBe(3);
      expect(colorSpans[0]).toHaveStyle({ backgroundColor: '#ff0000' });
    });

    it('renders footer with cancel and save buttons', () => {
      renderPopup();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('renders empty state when no tags', () => {
      renderPopup({ allTags: [] });
      expect(screen.getByText('No tags available')).toBeInTheDocument();
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

      const backdrop = container.querySelector('.tag-popup-overlay');
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

      await user.click(screen.getByText('Tag Samples'));
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Tag state management', () => {
    it('shows checked state for tags all samples have', () => {
      renderPopup();
      const checkboxes = screen.getAllByRole('checkbox');
      const kickCheckbox = checkboxes[0]; // kick tag - both samples have it
      expect(kickCheckbox).toBeChecked();
    });

    it('shows indeterminate state for tags some samples have', () => {
      renderPopup();
      const checkboxes = screen.getAllByRole('checkbox');
      const snareCheckbox = checkboxes[1]; // snare tag - only sample 1 has it
      expect(snareCheckbox).not.toBeChecked();
      expect((snareCheckbox as HTMLInputElement).indeterminate).toBe(true);
    });

    it('shows unchecked state for tags no samples have', () => {
      renderPopup();
      const checkboxes = screen.getAllByRole('checkbox');
      const hihatCheckbox = checkboxes[2]; // hihat tag - no samples have it
      expect(hihatCheckbox).not.toBeChecked();
      expect((hihatCheckbox as HTMLInputElement).indeterminate).toBe(false);
    });

    it('shows "partial" label for indeterminate tags', () => {
      renderPopup();
      expect(screen.getByText('partial')).toBeInTheDocument();
    });
  });

  describe('Tag toggle functionality', () => {
    it('toggles tag from checked to unchecked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      const kickCheckbox = checkboxes[0]; // kick tag - checked

      await user.click(kickCheckbox);

      expect(kickCheckbox).not.toBeChecked();
    });

    it('toggles tag from unchecked to checked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      const hihatCheckbox = checkboxes[2]; // hihat tag - unchecked

      await user.click(hihatCheckbox);

      expect(hihatCheckbox).toBeChecked();
    });

    it('toggles tag from indeterminate to checked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      const snareCheckbox = checkboxes[1]; // snare tag - indeterminate

      await user.click(snareCheckbox);

      expect(snareCheckbox).toBeChecked();
    });

    it('shows "You have unsaved changes" after toggling', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Toggle hihat

      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
    });

    it('enables save button after changes', async () => {
      const user = userEvent.setup();
      renderPopup();

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Toggle hihat

      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Search functionality', () => {
    it('filters tags by search query', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'kick');

      expect(screen.getByText('kick')).toBeInTheDocument();
      expect(screen.queryByText('snare')).not.toBeInTheDocument();
      expect(screen.queryByText('hihat')).not.toBeInTheDocument();
    });

    it('filters tags case-insensitively', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'KICK');

      expect(screen.getByText('kick')).toBeInTheDocument();
    });

    it('shows "No tags found" message when search has no results', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No tags found for "nonexistent"')).toBeInTheDocument();
    });

    it('clears search when popup closes', async () => {
      const user = userEvent.setup();
      const { rerender } = renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...') as HTMLInputElement;
      await user.type(searchInput, 'kick');
      expect(searchInput.value).toBe('kick');

      // Close and reopen
      rerender(
        <TagPopup
          isOpen={false}
          onClose={mockOnClose}
          selectedSampleIds={[1, 2]}
          allTags={mockTags}
          samples={mockSamples}
          onSave={mockOnSave}
          onTagCreated={mockOnTagCreated}
        />
      );

      rerender(
        <TagPopup
          isOpen={true}
          onClose={mockOnClose}
          selectedSampleIds={[1, 2]}
          allTags={mockTags}
          samples={mockSamples}
          onSave={mockOnSave}
          onTagCreated={mockOnTagCreated}
        />
      );

      const newSearchInput = screen.getByPlaceholderText('Search or create tag...') as HTMLInputElement;
      expect(newSearchInput.value).toBe('');
    });
  });

  describe('Tag creation', () => {
    it('shows create option for new tag name', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'newtag');

      expect(screen.getByText('Create tag')).toBeInTheDocument();
      expect(screen.getByText('newtag')).toBeInTheDocument();
    });

    it('does not show create option for existing tag', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'kick');

      expect(screen.queryByText('Create tag')).not.toBeInTheDocument();
    });

    it('normalizes tag names (lowercase, no spaces)', async () => {
      const user = userEvent.setup();
      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'New Tag');

      expect(screen.getByText('newtag')).toBeInTheDocument();
    });

    it('does not show create option for empty search', () => {
      renderPopup();
      expect(screen.queryByText('Create tag')).not.toBeInTheDocument();
    });

    it('creates tag when create option is clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createTag).mockResolvedValue({
        data: { id: 4, name: 'newtag', color: null },
      } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'newtag');

      const createOption = screen.getByText('Create tag').closest('.tag-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(api.createTag).toHaveBeenCalledWith({ name: 'newtag' });
        });
      }
    });

    it('marks new tag as checked after creation', async () => {
      const user = userEvent.setup();
      const newTag = { id: 4, name: 'newtag', color: null };
      vi.mocked(api.createTag).mockResolvedValue({ data: newTag } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'newtag');

      const createOption = screen.getByText('Create tag').closest('.tag-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
        });
      }
    });

    it('calls onTagCreated after creating tag', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createTag).mockResolvedValue({
        data: { id: 4, name: 'newtag', color: null },
      } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'newtag');

      const createOption = screen.getByText('Create tag').closest('.tag-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(mockOnTagCreated).toHaveBeenCalled();
        });
      }
    });

    it('clears search after creating tag', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createTag).mockResolvedValue({
        data: { id: 4, name: 'newtag', color: null },
      } as any);

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...') as HTMLInputElement;
      await user.type(searchInput, 'newtag');

      const createOption = screen.getByText('Create tag').closest('.tag-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(searchInput.value).toBe('');
        });
      }
    });

    it('handles tag creation error gracefully', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(api.createTag).mockRejectedValue(new Error('Creation failed'));

      renderPopup();

      const searchInput = screen.getByPlaceholderText('Search or create tag...');
      await user.type(searchInput, 'newtag');

      const createOption = screen.getByText('Create tag').closest('.tag-create');
      if (createOption) {
        await user.click(createOption as HTMLElement);

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create tag:', expect.any(Error));
        });
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Save functionality', () => {
    it('disables save button when no changes', () => {
      renderPopup();
      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });

    it('calls onSave with correct payload when adding tags', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Check hihat (was unchecked)

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith({
        sampleIds: [1, 2],
        addTagIds: [3], // hihat id
        removeTagIds: [],
      });
    });

    it('calls onSave with correct payload when removing tags', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Uncheck kick (was checked)

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith({
        sampleIds: [1, 2],
        addTagIds: [],
        removeTagIds: [1], // kick id
      });
    });

    it('calls onSave with correct payload when adding and removing tags', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Uncheck kick
      await user.click(checkboxes[2]); // Check hihat

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith({
        sampleIds: [1, 2],
        addTagIds: [3], // hihat
        removeTagIds: [1], // kick
      });
    });

    it('calls onSave with correct payload when changing indeterminate tag to checked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Check snare (was indeterminate)

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith({
        sampleIds: [1, 2],
        addTagIds: [2], // snare - should be added to sample 2
        removeTagIds: [],
      });
    });

    it('calls onSave with correct payload when changing indeterminate tag to unchecked', async () => {
      const user = userEvent.setup();
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Check snare (indeterminate -> checked)
      await user.click(checkboxes[1]); // Uncheck snare (checked -> unchecked)

      await user.click(screen.getByText('Save'));

      expect(mockOnSave).toHaveBeenCalledWith({
        sampleIds: [1, 2],
        addTagIds: [],
        removeTagIds: [2], // snare - should be removed from sample 1
      });
    });

    it('logs save payload to console', async () => {
      const user = userEvent.setup();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      renderPopup();

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Check hihat

      await user.click(screen.getByText('Save'));

      expect(consoleLogSpy).toHaveBeenCalledWith('Save changes:', {
        sampleIds: [1, 2],
        addTagIds: [3],
        removeTagIds: [],
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('handles empty selectedSampleIds', () => {
      renderPopup({ selectedSampleIds: [] });
      expect(screen.getByText('0 samples selected')).toBeInTheDocument();
    });

    it('handles missing samples prop', () => {
      renderPopup({ samples: undefined });
      // Should not crash
      expect(screen.getByText('Tag Samples')).toBeInTheDocument();
    });

    it('handles missing allTags prop', () => {
      renderPopup({ allTags: undefined });
      expect(screen.getByText('No tags available')).toBeInTheDocument();
    });

    it('handles samples without tags', () => {
      const samplesWithoutTags: Sample[] = [
        {
          id: 1,
          filename: 'sample1.wav',
          filepath: '/path/to/sample1.wav',
          duration: 1.0,
          sample_rate: 44100,
          channels: 2,
          folder_id: 1,
          tags: [],
        },
      ];

      renderPopup({ samples: samplesWithoutTags, selectedSampleIds: [1] });
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes[0]).not.toBeChecked();
    });

    it('handles tags without colors', () => {
      const tagsWithoutColors: Tag[] = [
        { id: 1, name: 'kick', color: null },
      ];

      const { container } = renderPopup({ allTags: tagsWithoutColors });
      expect(screen.getByText('kick')).toBeInTheDocument();
      // Should still render but without color span
      const colorSpans = container.querySelectorAll('.tag-item-color');
      expect(colorSpans.length).toBe(0);
    });

    it('resets state when popup reopens', async () => {
      const { rerender } = renderPopup();
      const user = userEvent.setup();

      // Make changes
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[2]); // Check hihat
      expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();

      // Close popup
      rerender(
        <TagPopup
          isOpen={false}
          onClose={mockOnClose}
          selectedSampleIds={[1, 2]}
          allTags={mockTags}
          samples={mockSamples}
          onSave={mockOnSave}
          onTagCreated={mockOnTagCreated}
        />
      );

      // Reopen popup
      rerender(
        <TagPopup
          isOpen={true}
          onClose={mockOnClose}
          selectedSampleIds={[1, 2]}
          allTags={mockTags}
          samples={mockSamples}
          onSave={mockOnSave}
          onTagCreated={mockOnTagCreated}
        />
      );

      // Changes should be reset
      expect(screen.queryByText('You have unsaved changes')).not.toBeInTheDocument();
    });
  });
});
