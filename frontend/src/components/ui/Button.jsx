export default function Button({ variant = 'primary', size = 'md', className = '', type = 'button', children, ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900',
  };
  const sizes = {
    sm: '!px-2.5 !py-1.5 text-xs',
    md: '',
    lg: '!px-5 !py-3 text-base',
  };

  return (
    <button type={type} className={`${variants[variant] || variants.primary} ${sizes[size] || ''} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
