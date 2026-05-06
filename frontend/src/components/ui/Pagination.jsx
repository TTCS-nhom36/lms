import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 py-4 mt-4 animate-fade-in">
      <button
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="p-2 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#d2d2d7] disabled:opacity-30 transition-all cursor-pointer"
        aria-label="Previous Page"
      >
        <ChevronLeft size={20} />
      </button>
      
      <span className="control-label text-[#6e6e73]">
        Page {page + 1} of {totalPages}
      </span>
      
      <button
        onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1}
        className="p-2 rounded-full text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#d2d2d7] disabled:opacity-30 transition-all cursor-pointer"
        aria-label="Next Page"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
