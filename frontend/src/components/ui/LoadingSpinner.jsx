export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-[2.5px]',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className={`${sizes[size]} rounded-full border-[#d2d2d7] border-t-[#0071e3] animate-spin`} />
      {text && <p className="control-label text-[#86868b] tracking-wider uppercase text-[11px]">{text}</p>}
    </div>
  );
}
