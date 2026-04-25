import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-md" onClick={onClose} />
      <div className="relative max-w-sm w-full apple-card animate-slide-up p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-5">
          <AlertTriangle size={24} className="text-[#e30000]" />
        </div>
        <h3 className="utility-heading text-[#1d1d1f] mb-3">{title || 'Confirm Action'}</h3>
        <p className="body-primary text-[#6e6e73] mb-8">{message || 'Are you sure you want to proceed?'}</p>
        
        <div className="flex flex-col gap-3">
          <button onClick={onConfirm} className="btn-danger w-full py-3 text-base">Confirm</button>
          <button onClick={onClose} className="btn-secondary w-full py-3 text-base !border-none !bg-[#f5f5f7]">Cancel</button>
        </div>
      </div>
    </div>
  );
}
