import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No data', description = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-[#f5f5f7] border border-[#d2d2d7] flex items-center justify-center mb-6">
        <Icon size={24} className="text-[#86868b]" />
      </div>
      <h3 className="utility-heading text-[#1d1d1f] mb-2">{title}</h3>
      {description && <p className="body-primary text-[#6e6e73] max-w-sm">{description}</p>}
    </div>
  );
}
