import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  DashboardIcon,
  FolderIcon,
  TagIcon,
  CollectionIcon,
  SearchIcon,
  SettingsIcon,
  PlusIcon,
  ChevronUpIcon,
} from './Icons';

describe('Icons', () => {
  describe('DashboardIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<DashboardIcon />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<DashboardIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(<DashboardIcon className="w-8 h-8 custom" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-8', 'h-8', 'custom');
    });
  });

  describe('FolderIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<FolderIcon />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<FolderIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(<FolderIcon className="w-6 h-6" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-6', 'h-6');
    });
  });

  describe('TagIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<TagIcon />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<TagIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(<TagIcon className="w-5 h-5" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-5', 'h-5');
    });
  });

  describe('CollectionIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<CollectionIcon />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<CollectionIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(<CollectionIcon className="custom-size" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-size');
    });
  });

  describe('SearchIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<SearchIcon />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<SearchIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(<SearchIcon className="text-blue-500" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-blue-500');
    });
  });

  describe('SettingsIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<SettingsIcon />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<SettingsIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(<SettingsIcon className="w-10 h-10" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-10', 'h-10');
    });
  });

  describe('PlusIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<PlusIcon />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<PlusIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(<PlusIcon className="icon-large" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('icon-large');
    });
  });

  describe('ChevronUpIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<ChevronUpIcon />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<ChevronUpIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('w-4', 'h-4');
    });

    it('applies custom className', () => {
      const { container } = render(<ChevronUpIcon className="rotate-180" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('rotate-180');
    });
  });

  describe('Icon consistency', () => {
    it('all icons accept className prop', () => {
      const icons = [
        DashboardIcon,
        FolderIcon,
        TagIcon,
        CollectionIcon,
        SearchIcon,
        SettingsIcon,
        PlusIcon,
        ChevronUpIcon,
      ];

      icons.forEach((Icon) => {
        const { container } = render(<Icon className="test-class" />);
        const svg = container.querySelector('svg');
        expect(svg).toHaveClass('test-class');
      });
    });

    it('all icons render SVG elements', () => {
      const icons = [
        DashboardIcon,
        FolderIcon,
        TagIcon,
        CollectionIcon,
        SearchIcon,
        SettingsIcon,
        PlusIcon,
        ChevronUpIcon,
      ];

      icons.forEach((Icon) => {
        const { container } = render(<Icon />);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg?.tagName).toBe('svg');
      });
    });
  });
});
