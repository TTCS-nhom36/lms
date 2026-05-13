export default function CardGrid({ children, columns = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', className = '' }) {
  return (
    <div className={`grid ${columns} gap-4 ${className}`.trim()}>
      {children}
    </div>
  );
}
