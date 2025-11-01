import { ReactNode, ButtonHTMLAttributes } from 'react';

interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children?: ReactNode;
  className?: string;
}

const Toggle = ({ pressed, onPressedChange, children, className = '', ...props }: ToggleProps) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      data-state={pressed ? 'on' : 'off'}
      onClick={() => onPressedChange(!pressed)}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 px-3 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Toggle;
