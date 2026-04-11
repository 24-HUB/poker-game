import React from 'react';

type Variant = 'primary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-[#ffd700] text-[#0f0c29] font-bold hover:bg-yellow-300 disabled:bg-yellow-900 disabled:text-yellow-600',
  danger:
    'bg-[#e74c3c] text-white font-semibold hover:bg-red-400 disabled:bg-red-900 disabled:text-red-600',
  ghost:
    'bg-transparent border border-[#ffd700]/40 text-[#ffd700] hover:bg-[#ffd700]/10 disabled:opacity-40',
};

const sizeClass: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || loading}
    className={[
      'rounded-lg transition-colors duration-150 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-[#ffd700]/60',
      variantClass[variant],
      sizeClass[size],
      className,
    ].join(' ')}
  >
    {loading ? <span className="animate-spin mr-2">⟳</span> : null}
    {children}
  </button>
);
