import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toggle from './Toggle';

describe('Toggle', () => {
  it('renders children correctly', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}}>
        Toggle Me
      </Toggle>
    );
    expect(screen.getByText('Toggle Me')).toBeInTheDocument();
  });

  it('renders as button with switch role', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}}>
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.tagName).toBe('BUTTON');
  });

  it('has correct aria-checked when pressed is false', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}}>
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('has correct aria-checked when pressed is true', () => {
    render(
      <Toggle pressed={true} onPressedChange={() => {}}>
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('has correct data-state when pressed is false', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}}>
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('data-state', 'off');
  });

  it('has correct data-state when pressed is true', () => {
    render(
      <Toggle pressed={true} onPressedChange={() => {}}>
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('data-state', 'on');
  });

  it('calls onPressedChange with true when clicked while off', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Toggle pressed={false} onPressedChange={handleChange}>
        Toggle
      </Toggle>
    );

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('calls onPressedChange with false when clicked while on', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Toggle pressed={true} onPressedChange={handleChange}>
        Toggle
      </Toggle>
    );

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('applies custom className', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}} className="custom-class">
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveClass('custom-class');
  });

  it('applies default classes', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}}>
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'rounded-md',
      'text-sm',
      'font-medium',
      'transition-colors',
      'h-9',
      'px-3'
    );
  });

  it('respects disabled attribute', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}} disabled>
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeDisabled();
  });

  it('does not call onPressedChange when disabled', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Toggle pressed={false} onPressedChange={handleChange} disabled>
        Toggle
      </Toggle>
    );

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(handleChange).not.toHaveBeenCalled();
  });

  it('has type button', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}}>
        Toggle
      </Toggle>
    );
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('type', 'button');
  });

  it('forwards additional HTML attributes', () => {
    render(
      <Toggle pressed={false} onPressedChange={() => {}} data-testid="test-toggle" title="Test Title">
        Toggle
      </Toggle>
    );
    const toggle = screen.getByTestId('test-toggle');
    expect(toggle).toHaveAttribute('title', 'Test Title');
  });

  it('handles multiple rapid clicks correctly', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Toggle pressed={false} onPressedChange={handleChange}>
        Toggle
      </Toggle>
    );

    const toggle = screen.getByRole('switch');
    await user.click(toggle);
    await user.click(toggle);
    await user.click(toggle);

    // Each click toggles from the current pressed state (false)
    // Since the component is controlled and we're not updating the pressed prop,
    // all calls will toggle from false to true
    expect(handleChange).toHaveBeenCalledTimes(3);
    expect(handleChange).toHaveBeenNthCalledWith(1, true);
    expect(handleChange).toHaveBeenNthCalledWith(2, true);
    expect(handleChange).toHaveBeenNthCalledWith(3, true);
  });
});
