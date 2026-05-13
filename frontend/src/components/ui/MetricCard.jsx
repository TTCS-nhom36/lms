export default function MetricCard({ icon: Icon, label, value, hint, accent = 'bg-slate-50 text-slate-700' }) {
  return (
    <div className="card p-5 border border-gray-200 bg-white">
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accent}`}>
          <Icon size={18} />
        </div>
      )}
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mt-1">{label}</div>
      {hint ? <div className="text-[11px] text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}
