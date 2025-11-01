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
      className={`inline-flex items-center justify-center rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-6 w-11 relative ${
        pressed ? 'bg-primary' : 'bg-muted-foreground/20'
      } ${className}`}
      {...props}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
          pressed ? 'translate-x-2.5' : '-translate-x-2.5'
        }`}
      />
      {children}
    </button>
  );
};

export default Toggle;
