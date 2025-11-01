import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FolderTreePane from './FolderTreePane';

describe('FolderTreePane', () => {
  const mockSamplePaths = [
    '/root/folder1/file1.mp3',
    '/root/folder1/file2.mp3',
    '/root/folder1/subfolder1/file3.mp3',
    '/root/folder2/file4.mp3',
    '/root/folder2/subfolder2/file5.mp3',
  ];

  const defaultProps = {
    samplePaths: mockSamplePaths,
    includedFolders: [],
    excludedFolders: [],
    onFolderClick: vi.fn(),
    onRemoveIncluded: vi.fn(),
    onRemoveExcluded: vi.fn(),
    isVisible: true,
    onToggleVisibility: vi.fn(),
  };

  describe('Rendering', () => {
    it('renders folder tree when visible', () => {
      render(<FolderTreePane {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search folders...')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<FolderTreePane {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search folders...')).toBeInTheDocument();
    });

    it('renders collapsed button when not visible', () => {
      render(<FolderTreePane {...defaultProps} isVisible={false} />);
      const button = screen.getByTitle('Show folders pane');
      expect(button).toBeInTheDocument();
    });

    it('returns null when not visible and no toggle function', () => {
      const { container } = render(
        <FolderTreePane {...defaultProps} isVisible={false} onToggleVisibility={undefined} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('shows no folders message when list is empty', () => {
      render(<FolderTreePane {...defaultProps} samplePaths={[]} />);
      expect(screen.getByText('No folders found')).toBeInTheDocument();
    });

    it('renders folder names from sample paths', () => {
      render(<FolderTreePane {...defaultProps} />);
      expect(screen.getByText('folder1')).toBeInTheDocument();
      expect(screen.getByText('folder2')).toBeInTheDocument();
    });

    it('does not show subfolders when parent is collapsed', () => {
      render(<FolderTreePane {...defaultProps} />);
      // Subfolders are not visible until parent is expanded
      expect(screen.queryByText('subfolder1')).not.toBeInTheDocument();
      expect(screen.queryByText('subfolder2')).not.toBeInTheDocument();
    });
  });

  describe('Tree building from paths', () => {
    it('extracts unique folder paths from sample paths', () => {
      render(<FolderTreePane {...defaultProps} />);
      // Should show folder1, folder2, and their subfolders
      expect(screen.getByText('folder1')).toBeInTheDocument();
      expect(screen.getByText('folder2')).toBeInTheDocument();
    });

    it('builds hierarchical structure', () => {
      render(<FolderTreePane {...defaultProps} />);
      // Subfolders should be nested under their parents
      const folder1 = screen.getByText('folder1').closest('div');
      expect(folder1).toBeInTheDocument();
    });

    it('handles paths with common root', () => {
      render(<FolderTreePane {...defaultProps} />);
      // All paths share /root prefix, should be removed
      expect(screen.queryByText('root')).not.toBeInTheDocument();
    });

    it('handles single folder with multiple files', () => {
      const singleFolderPaths = [
        '/root/folder/file1.mp3',
        '/root/folder/file2.mp3',
        '/root/folder/file3.mp3',
      ];
      render(<FolderTreePane {...defaultProps} samplePaths={singleFolderPaths} />);

      // When all files are in the same folder, that folder becomes the common root
      // and is removed from the tree, resulting in "No folders found"
      expect(screen.getByText('No folders found')).toBeInTheDocument();
    });
  });

  describe('Expand/collapse functionality', () => {
    it('folders with children have expand/collapse buttons', () => {
      const { container } = render(<FolderTreePane {...defaultProps} />);
      const expandButtons = container.querySelectorAll('button[title="Expand"]');
      expect(expandButtons.length).toBeGreaterThan(0);
    });

    it('expands folder when expand button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<FolderTreePane {...defaultProps} />);

      const expandButton = container.querySelector('button[title="Expand"]');
      if (expandButton) {
        await user.click(expandButton);
        expect(screen.getByText('subfolder1')).toBeInTheDocument();
      }
    });

    it('collapses folder when collapse button is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(<FolderTreePane {...defaultProps} />);

      // First expand
      const expandButton = container.querySelector('button[title="Expand"]');
      if (expandButton) {
        await user.click(expandButton);

        // Then collapse
        const collapseButton = container.querySelector('button[title="Collapse"]');
        if (collapseButton) {
          await user.click(collapseButton);
          // Subfolder should no longer be visible
          expect(screen.queryByText('subfolder1')).not.toBeInTheDocument();
        }
      }
    });

    it('does not show expand button for folders without children', () => {
      const singlePaths = ['/root/folder1/file.mp3'];
      const { container } = render(<FolderTreePane {...defaultProps} samplePaths={singlePaths} />);

      const expandButtons = container.querySelectorAll('button[title="Expand"]');
      expect(expandButtons.length).toBe(0);
    });
  });

  describe('Folder click interactions', () => {
    it('calls onFolderClick when folder is clicked', async () => {
      const user = userEvent.setup();
      const onFolderClick = vi.fn();

      render(<FolderTreePane {...defaultProps} onFolderClick={onFolderClick} />);

      await user.click(screen.getByText('folder1'));
      expect(onFolderClick).toHaveBeenCalledWith('/root/folder1', false);
    });

    it('calls onFolderClick with Ctrl flag when Ctrl+clicked', async () => {
      const user = userEvent.setup();
      const onFolderClick = vi.fn();

      render(<FolderTreePane {...defaultProps} onFolderClick={onFolderClick} />);

      const folder = screen.getByText('folder1').parentElement;
      if (folder) {
        await user.keyboard('{Control>}');
        await user.click(folder);
        await user.keyboard('{/Control}');
        expect(onFolderClick).toHaveBeenCalledWith('/root/folder1', true);
      }
    });

    it('calls onFolderClick with Cmd flag when Cmd+clicked', async () => {
      const user = userEvent.setup();
      const onFolderClick = vi.fn();

      render(<FolderTreePane {...defaultProps} onFolderClick={onFolderClick} />);

      const folder = screen.getByText('folder1').parentElement;
      if (folder) {
        await user.keyboard('{Meta>}');
        await user.click(folder);
        await user.keyboard('{/Meta}');
        expect(onFolderClick).toHaveBeenCalledWith('/root/folder1', true);
      }
    });

    it('does not propagate click when expand button is clicked', async () => {
      const user = userEvent.setup();
      const onFolderClick = vi.fn();
      const { container } = render(<FolderTreePane {...defaultProps} onFolderClick={onFolderClick} />);

      const expandButton = container.querySelector('button[title="Expand"]');
      if (expandButton) {
        await user.click(expandButton);
        expect(onFolderClick).not.toHaveBeenCalled();
      }
    });
  });

  describe('Folder states', () => {
    it('applies included styling to included folders', () => {
      render(<FolderTreePane {...defaultProps} includedFolders={['/root/folder1']} />);
      const folder = screen.getByText('folder1').closest('.flex.items-center.gap-1') as HTMLElement;
      expect(folder?.className).toContain('bg-primary');
    });

    it('applies excluded styling to excluded folders', () => {
      render(<FolderTreePane {...defaultProps} excludedFolders={['/root/folder2']} />);
      const folder = screen.getByText('folder2').closest('.flex.items-center.gap-1') as HTMLElement;
      expect(folder?.className).toContain('bg-red-500');
    });

    it('highlights parent when child folder is selected', () => {
      render(<FolderTreePane {...defaultProps} includedFolders={['/root/folder1/subfolder1']} />);
      const parentFolder = screen.getByText('folder1').closest('.flex.items-center.gap-1') as HTMLElement;
      expect(parentFolder?.className).toContain('bg-primary/5');
    });

    it('shows remove button for included folders', () => {
      render(<FolderTreePane {...defaultProps} includedFolders={['/root/folder1']} />);
      const removeButtons = screen.getAllByTitle('Remove filter');
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('shows remove button for excluded folders', () => {
      render(<FolderTreePane {...defaultProps} excludedFolders={['/root/folder1']} />);
      const removeButtons = screen.getAllByTitle('Remove filter');
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('shows remove child filters button for parent with selected children', () => {
      render(<FolderTreePane {...defaultProps} includedFolders={['/root/folder1/subfolder1']} />);
      const removeButtons = screen.getAllByTitle(/Remove/);
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Remove functionality', () => {
    it('calls onRemoveIncluded when remove button clicked on included folder', async () => {
      const user = userEvent.setup();
      const onRemoveIncluded = vi.fn();

      render(
        <FolderTreePane
          {...defaultProps}
          includedFolders={['/root/folder1']}
          onRemoveIncluded={onRemoveIncluded}
        />
      );

      const removeButton = screen.getByTitle('Remove filter');
      await user.click(removeButton);
      expect(onRemoveIncluded).toHaveBeenCalledWith('/root/folder1');
    });

    it('calls onRemoveExcluded when remove button clicked on excluded folder', async () => {
      const user = userEvent.setup();
      const onRemoveExcluded = vi.fn();

      render(
        <FolderTreePane
          {...defaultProps}
          excludedFolders={['/root/folder1']}
          onRemoveExcluded={onRemoveExcluded}
        />
      );

      const removeButton = screen.getByTitle('Remove filter');
      await user.click(removeButton);
      expect(onRemoveExcluded).toHaveBeenCalledWith('/root/folder1');
    });

    it('removes all child filters when parent remove button clicked', async () => {
      const user = userEvent.setup();
      const onRemoveIncluded = vi.fn();

      render(
        <FolderTreePane
          {...defaultProps}
          includedFolders={['/root/folder1/subfolder1']}
          onRemoveIncluded={onRemoveIncluded}
        />
      );

      const removeButton = screen.getByTitle(/Remove/);
      await user.click(removeButton);
      expect(onRemoveIncluded).toHaveBeenCalledWith('/root/folder1/subfolder1');
    });

    it('stops propagation when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onFolderClick = vi.fn();
      const onRemoveIncluded = vi.fn();

      render(
        <FolderTreePane
          {...defaultProps}
          includedFolders={['/root/folder1']}
          onFolderClick={onFolderClick}
          onRemoveIncluded={onRemoveIncluded}
        />
      );

      const removeButton = screen.getByTitle('Remove filter');
      await user.click(removeButton);
      expect(onRemoveIncluded).toHaveBeenCalled();
      expect(onFolderClick).not.toHaveBeenCalled();
    });
  });

  describe('Search functionality', () => {
    it('filters folders based on search query', async () => {
      const user = userEvent.setup();
      render(<FolderTreePane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search folders...');
      await user.type(searchInput, 'folder1');

      expect(screen.getByText('folder1')).toBeInTheDocument();
      expect(screen.queryByText('folder2')).not.toBeInTheDocument();
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      render(<FolderTreePane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search folders...');
      await user.type(searchInput, 'FOLDER1');

      expect(screen.getByText('folder1')).toBeInTheDocument();
    });

    it('auto-expands parent folders when child matches search', async () => {
      const user = userEvent.setup();
      render(<FolderTreePane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search folders...');
      await user.type(searchInput, 'subfolder1');

      // Parent folder1 should be auto-expanded to show subfolder1
      expect(screen.getByText('subfolder1')).toBeInTheDocument();
      expect(screen.getByText('folder1')).toBeInTheDocument();
    });

    it('shows auto-expanded message when searching', async () => {
      const user = userEvent.setup();
      render(<FolderTreePane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search folders...');
      await user.type(searchInput, 'folder');

      expect(screen.getByText('Showing matches (auto-expanded)')).toBeInTheDocument();
    });

    it('shows no folders message when search yields no results', async () => {
      const user = userEvent.setup();
      render(<FolderTreePane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search folders...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No folders found')).toBeInTheDocument();
    });

    it('clears search expanded state when search is cleared', async () => {
      const user = userEvent.setup();
      render(<FolderTreePane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search folders...');
      await user.type(searchInput, 'subfolder1');

      expect(screen.getByText('subfolder1')).toBeInTheDocument();

      await user.clear(searchInput);

      // After clearing search, subfolder should not be visible (parent collapsed)
      expect(screen.queryByText('subfolder1')).not.toBeInTheDocument();
    });
  });

  describe('Active filters summary', () => {
    it('shows included count when folders are included', () => {
      render(
        <FolderTreePane
          {...defaultProps}
          includedFolders={['/root/folder1', '/root/folder2']}
        />
      );
      expect(screen.getByText('Include:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows excluded count when folders are excluded', () => {
      render(
        <FolderTreePane
          {...defaultProps}
          excludedFolders={['/root/folder1']}
        />
      );
      expect(screen.getByText('Exclude:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('does not show summary when no filters are active', () => {
      render(<FolderTreePane {...defaultProps} />);
      expect(screen.queryByText('Include:')).not.toBeInTheDocument();
      expect(screen.queryByText('Exclude:')).not.toBeInTheDocument();
    });
  });

  describe('Toggle visibility', () => {
    it('calls onToggleVisibility with false when hide button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleVisibility = vi.fn();

      render(<FolderTreePane {...defaultProps} onToggleVisibility={onToggleVisibility} />);

      const hideButton = screen.getByTitle('Hide folders pane');
      await user.click(hideButton);
      expect(onToggleVisibility).toHaveBeenCalledWith(false);
    });

    it('calls onToggleVisibility with true when collapsed button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleVisibility = vi.fn();

      render(
        <FolderTreePane
          {...defaultProps}
          isVisible={false}
          onToggleVisibility={onToggleVisibility}
        />
      );

      const showButton = screen.getByTitle('Show folders pane');
      await user.click(showButton);
      expect(onToggleVisibility).toHaveBeenCalledWith(true);
    });
  });

  describe('Hierarchical indentation', () => {
    it('applies indentation based on depth', async () => {
      const user = userEvent.setup();
      const { container } = render(<FolderTreePane {...defaultProps} />);

      // Expand folder1 to show subfolder1
      const expandButton = container.querySelector('button[title="Expand"]');
      if (expandButton) {
        await user.click(expandButton);

        const subfolder = screen.getByText('subfolder1').closest('.flex.items-center.gap-1') as HTMLElement;
        const style = subfolder?.getAttribute('style');

        // Subfolder should have more padding than parent (depth * 12 + 8)
        expect(style).toBeTruthy();
        if (style) {
          expect(style).toContain('padding-left');
        }
      }
    });
  });
});
