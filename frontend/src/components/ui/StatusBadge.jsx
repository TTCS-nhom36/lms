export default function StatusBadge({ status, size = 'sm' }) {
  // Apple relies heavily on monochrome badges or very restrained palette. 
  // We will map major actions to Blue, errors to Red, and neutral/info to Gray.
  const styles = {
    // Roles
    ADMIN:       'bg-[#1d1d1f] text-white',
    INSTRUCTOR:  'bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]',
    STUDENT:     'bg-[#f5f5f7] text-[#6e6e73] border border-[#d2d2d7]',
    
    // Status
    DRAFT:       'bg-[#f5f5f7] text-[#86868b] border border-[#d2d2d7]',
    PUBLISHED:   'bg-[#0071e3] text-white',
    ARCHIVED:    'bg-[#f5f5f7] text-[#86868b] line-through',
    ACTIVE:      'bg-[#0071e3] text-white',
    COMPLETED:   'bg-[#f5f5f7] text-[#1d1d1f] border border-[#d2d2d7]',
    DROPPED:     'bg-[#e30000] text-white',
    
    // Content Types
    QUIZ:        'bg-[#f5f5f7] text-[#1d1d1f]',
    FILE_UPLOAD: 'bg-[#f5f5f7] text-[#1d1d1f]',
    LINK_SUBMIT: 'bg-[#f5f5f7] text-[#1d1d1f]',
    VIDEO:       'bg-[#f5f5f7] text-[#1d1d1f]',
    DOCUMENT:    'bg-[#f5f5f7] text-[#1d1d1f]',
    TEXT:        'bg-[#f5f5f7] text-[#1d1d1f]',
    NOTEBOOK:    'bg-[#f5f5f7] text-[#1d1d1f]',
    LINK:        'bg-[#f5f5f7] text-[#1d1d1f]',
    
    true:        'bg-[#0071e3] text-white',
    false:       'bg-[#f5f5f7] text-[#86868b] border border-[#d2d2d7]',
  };

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[11px] font-semibold',
    sm: 'px-3 py-1 text-[13px] font-semibold',
    md: 'px-4 py-1.5 text-[15px] font-semibold',
  };

  const displayText = status === true ? 'Active' : status === false ? 'Inactive' : status;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${
        styles[String(status)] || 'bg-[#f5f5f7] text-[#6e6e73] border border-[#d2d2d7]'
      } ${sizeClasses[size]} tracking-tight`}
    >
      {displayText}
    </span>
  );
}
