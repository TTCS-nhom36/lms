export default function Avatar({ name = '', src, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

  if (src) {
    return <img src={src} alt={name || 'Avatar'} className={`${sizes[size] || sizes.md} rounded-full object-cover ${className}`.trim()} />;
  }

  return (
    <div className={`${sizes[size] || sizes.md} flex items-center justify-center rounded-full bg-primary-50 font-semibold text-primary-600 ${className}`.trim()}>
      {initials}
    </div>
  );
}
