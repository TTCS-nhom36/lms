export default function AuthField({ icon: Icon, label, action, className = '', ...inputProps }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[color:var(--app-text)] flex items-center gap-2">
          {Icon && <Icon size={16} className="text-[color:var(--app-text-soft)]" />}
          {label}
        </label>
        {action}
      </div>
      <input className={`app-input w-full ${className}`.trim()} {...inputProps} />
    </div>
  );
}
