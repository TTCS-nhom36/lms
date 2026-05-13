export default function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div className={`flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1 ${className}`.trim()} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
