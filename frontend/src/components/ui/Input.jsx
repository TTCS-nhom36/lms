export default function Input({ label, error, className = '', id, ...props }) {
  const inputId = id || props.name || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-gray-600">
          {label}
        </label>
      )}
      <input id={inputId} aria-invalid={Boolean(error)} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
