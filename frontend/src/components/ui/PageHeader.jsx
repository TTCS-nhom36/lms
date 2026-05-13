export default function PageHeader({ title, description, icon: Icon, actions, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`.trim()}>
      <div>
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          {Icon && <Icon size={18} className="text-[color:var(--app-accent)]" />}
          {title}
        </h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
