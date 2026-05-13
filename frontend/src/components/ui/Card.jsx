export default function Card({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={`card border border-gray-200 bg-white ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
