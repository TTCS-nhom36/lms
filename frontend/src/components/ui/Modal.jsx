import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-12">
      {/* Light Apple overlay */}
      <div className="absolute inset-0 bg-white/60 backdrop-blur-md" onClick={onClose} />
      
      <div className={`relative ${sizes[size]} w-full apple-card animate-slide-up flex flex-col max-h-full`}>
        <div className="flex items-center justify-between px-8 py-5 border-b border-[#f5f5f7]">
          <h2 className="utility-heading text-[#1d1d1f] tracking-tight">{title}</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#f5f5f7] text-[#86868b] hover:bg-[#d2d2d7] hover:text-[#1d1d1f] transition-all cursor-pointer"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
        <div className="px-8 py-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
