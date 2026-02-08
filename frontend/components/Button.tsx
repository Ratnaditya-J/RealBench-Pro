import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center font-medium rounded-lg
    transition-all duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
    active:scale-[0.98]
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-blue-600 to-blue-700 
      hover:from-blue-500 hover:to-blue-600
      text-white shadow-lg shadow-blue-500/20
      hover:shadow-xl hover:shadow-blue-500/30
      focus:ring-blue-500
    `,
    secondary: `
      bg-slate-700 hover:bg-slate-600
      text-white shadow-lg shadow-black/20
      hover:shadow-xl hover:shadow-black/30
      focus:ring-slate-500
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-700
      hover:from-red-500 hover:to-red-600
      text-white shadow-lg shadow-red-500/20
      hover:shadow-xl hover:shadow-red-500/30
      focus:ring-red-500
    `,
    ghost: `
      hover:bg-white/10 text-slate-300 hover:text-white
      focus:ring-slate-500
    `,
    outline: `
      border border-slate-600 hover:border-slate-500
      bg-transparent hover:bg-white/5
      text-slate-300 hover:text-white
      focus:ring-slate-500
    `,
    gradient: `
      bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600
      hover:from-blue-500 hover:via-purple-500 hover:to-pink-500
      text-white shadow-lg shadow-purple-500/20
      hover:shadow-xl hover:shadow-purple-500/30
      focus:ring-purple-500
    `,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
    xl: 'px-6 py-3 text-lg gap-2.5',
  };

  const LoadingSpinner = () => (
    <svg 
      className="animate-spin h-4 w-4" 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoadingSpinner />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;

// Icon button variant
export function IconButton({
  children,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}: Omit<ButtonProps, 'icon' | 'iconPosition'>) {
  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
  };

  return (
    <Button
      variant={variant}
      className={`${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}
