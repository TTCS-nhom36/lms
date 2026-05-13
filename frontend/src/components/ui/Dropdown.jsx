export default function Dropdown({ label, value, options = [], onChange, placeholder = 'Select...', className = '' }) {
  return (
    <label className={`block ${className}`.trim()}>
      {label && <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>}
      <select value={value} onChange={(event) => onChange?.(event.target.value)} className="w-full">
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
