export default function Textarea({ label, error, className = '', id, ...props }) {
  const textareaId = id || props.name;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={textareaId} className="mb-1 block text-xs font-medium text-gray-600">
          {label}
        </label>
      )}
      <textarea id={textareaId} aria-invalid={Boolean(error)} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
