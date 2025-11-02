import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPane from './FilterPane';

describe('FilterPane', () => {
  const mockItems = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
  ];

  const defaultProps = {
    items: mockItems,
    type: 'tags',
    includedItems: [],
    excludedItems: [],
    highlightedItems: [],
    onItemClick: vi.fn(),
    onRemoveIncluded: vi.fn(),
    onRemoveExcluded: vi.fn(),
    isVisible: true,
    onToggleVisibility: vi.fn(),
  };

  describe('Rendering', () => {
    it('renders all items when visible', () => {
      render(<FilterPane {...defaultProps} />);
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('renders search input', () => {
      render(<FilterPane {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search tags...')).toBeInTheDocument();
    });

    it('renders collapsed button when not visible', () => {
      render(<FilterPane {...defaultProps} isVisible={false} />);
      const button = screen.getByTitle('Show tags pane');
      expect(button).toBeInTheDocument();
    });

    it('returns null when not visible and no toggle function', () => {
      const { container } = render(
        <FilterPane {...defaultProps} isVisible={false} onToggleVisibility={undefined} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('shows no items message when list is empty', () => {
      render(<FilterPane {...defaultProps} items={[]} />);
      expect(screen.getByText('No tags found')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('filters items based on search query', async () => {
      const user = userEvent.setup();
      render(<FilterPane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search tags...');
      await user.type(searchInput, 'Item 1');

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      render(<FilterPane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search tags...');
      await user.type(searchInput, 'ITEM 1');

      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('shows no items message when search yields no results', async () => {
      const user = userEvent.setup();
      render(<FilterPane {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Search tags...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No tags found')).toBeInTheDocument();
    });
  });

  describe('Item interactions', () => {
    it('calls onItemClick when item is left-clicked', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      render(<FilterPane {...defaultProps} onItemClick={onItemClick} />);

      await user.click(screen.getByText('Item 1'));

      expect(onItemClick).toHaveBeenCalledWith(1, false);
    });

    it('calls onItemClick with right-click when item is right-clicked', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      render(<FilterPane {...defaultProps} onItemClick={onItemClick} />);

      const item = screen.getByText('Item 1');
      await user.pointer({ keys: '[MouseRight]', target: item });

      expect(onItemClick).toHaveBeenCalledWith(1, true);
    });

    it('does not prevent context menu when showExclude is false', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();

      render(<FilterPane {...defaultProps} onItemClick={onItemClick} showExclude={false} />);

      const item = screen.getByText('Item 1');
      await user.pointer({ keys: '[MouseRight]', target: item });

      expect(onItemClick).not.toHaveBeenCalled();
    });
  });

  describe('Item states', () => {
    it('applies included styling to included items', () => {
      render(<FilterPane {...defaultProps} includedItems={[1]} />);
      const item = screen.getByText('Item 1').closest('div');
      expect(item).toHaveClass('bg-primary');
    });

    it('applies excluded styling to excluded items', () => {
      render(<FilterPane {...defaultProps} excludedItems={[2]} />);
      const item = screen.getByText('Item 2').closest('div');
      expect(item).toHaveClass('bg-red-500');
    });

    it('applies highlighted styling to highlighted items', () => {
      render(<FilterPane {...defaultProps} highlightedItems={[3]} />);
      const item = screen.getByText('Item 3').closest('div');
      expect(item).toHaveClass('bg-yellow-500/20');
    });

    it('shows remove button for included items', () => {
      render(<FilterPane {...defaultProps} includedItems={[1]} />);
      const removeButtons = screen.getAllByTitle('Remove filter');
      expect(removeButtons.length).toBeGreaterThan(0);
    });

    it('shows remove button for excluded items', () => {
      render(<FilterPane {...defaultProps} excludedItems={[1]} />);
      const removeButtons = screen.getAllByTitle('Remove filter');
      expect(removeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Remove functionality', () => {
    it('calls onRemoveIncluded when remove button is clicked on included item', async () => {
      const user = userEvent.setup();
      const onRemoveIncluded = vi.fn();

      render(<FilterPane {...defaultProps} includedItems={[1]} onRemoveIncluded={onRemoveIncluded} />);

      const removeButton = screen.getByTitle('Remove filter');
      await user.click(removeButton);

      expect(onRemoveIncluded).toHaveBeenCalledWith(1);
    });

    it('calls onRemoveExcluded when remove button is clicked on excluded item', async () => {
      const user = userEvent.setup();
      const onRemoveExcluded = vi.fn();

      render(<FilterPane {...defaultProps} excludedItems={[1]} onRemoveExcluded={onRemoveExcluded} />);

      const removeButton = screen.getByTitle('Remove filter');
      await user.click(removeButton);

      expect(onRemoveExcluded).toHaveBeenCalledWith(1);
    });

    it('stops propagation when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onItemClick = vi.fn();
      const onRemoveIncluded = vi.fn();

      render(
        <FilterPane
          {...defaultProps}
          includedItems={[1]}
          onItemClick={onItemClick}
          onRemoveIncluded={onRemoveIncluded}
        />
      );

      const removeButton = screen.getByTitle('Remove filter');
      await user.click(removeButton);

      expect(onRemoveIncluded).toHaveBeenCalled();
      expect(onItemClick).not.toHaveBeenCalled();
    });
  });

  describe('Active filters summary', () => {
    it('shows included count when items are included', () => {
      render(<FilterPane {...defaultProps} includedItems={[1, 2]} />);
      expect(screen.getByText('Include:')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows excluded count when items are excluded', () => {
      render(<FilterPane {...defaultProps} excludedItems={[1]} />);
      expect(screen.getByText('Exclude:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('does not show summary when no filters are active', () => {
      render(<FilterPane {...defaultProps} />);
      expect(screen.queryByText('Include:')).not.toBeInTheDocument();
      expect(screen.queryByText('Exclude:')).not.toBeInTheDocument();
    });
  });

  describe('Toggle visibility', () => {
    it('calls onToggleVisibility with false when hide button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleVisibility = vi.fn();

      render(<FilterPane {...defaultProps} onToggleVisibility={onToggleVisibility} />);

      const hideButton = screen.getByTitle('Hide tags pane');
      await user.click(hideButton);

      expect(onToggleVisibility).toHaveBeenCalledWith(false);
    });

    it('calls onToggleVisibility with true when collapsed button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleVisibility = vi.fn();

      render(<FilterPane {...defaultProps} isVisible={false} onToggleVisibility={onToggleVisibility} />);

      const showButton = screen.getByTitle('Show tags pane');
      await user.click(showButton);

      expect(onToggleVisibility).toHaveBeenCalledWith(true);
    });
  });

  describe('Custom getters', () => {
    it('uses custom getItemLabel function', () => {
      const items = [{ id: 1, name: 'Internal', displayName: 'Custom Label' }];
      render(
        <FilterPane
          {...defaultProps}
          items={items}
          getItemLabel={(item: any) => item.displayName}
        />
      );

      expect(screen.getByText('Custom Label')).toBeInTheDocument();
      expect(screen.queryByText('Internal')).not.toBeInTheDocument();
    });

    it('uses custom getItemId function', async () => {
      const user = userEvent.setup();
      const items = [{ id: 999, customId: 42, name: 'Item' }];
      const onItemClick = vi.fn();

      render(
        <FilterPane
          {...defaultProps}
          items={items}
          onItemClick={onItemClick}
          getItemId={(item: any) => item.customId}
        />
      );

      await user.click(screen.getByText('Item'));

      expect(onItemClick).toHaveBeenCalledWith(42, false);
    });
  });

  describe('Highlighted items sorting', () => {
    it('sorts highlighted items to the top', () => {
      const { container } = render(<FilterPane {...defaultProps} highlightedItems={[3]} />);

      const items = container.querySelectorAll('.space-y-1 > div');
      const firstItemText = items[0]?.textContent;

      expect(firstItemText).toContain('Item 3');
    });
  });
});
