import { ArrowRight, BookOpen } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export default function CourseCard({
  course,
  index = 0,
  tone = 'blue',
  onClick,
  actions,
  footer,
  showStatus = true,
  statusPlacement = 'title',
  progress,
  cta,
}) {
  const tones = {
    blue: 'from-blue-50 to-indigo-100 text-blue-300',
    violet: 'from-violet-50 to-indigo-100 text-indigo-300',
    emerald: 'from-emerald-50 to-teal-100 text-emerald-300',
  };
  const toneClass = tones[tone] || tones.blue;

  return (
    <div
      onClick={onClick}
      className={`card overflow-hidden group animate-slide-up ${onClick ? 'cursor-pointer' : ''}`}
      style={{ opacity: 0, animationDelay: `${index * 0.04}s` }}
    >
      <div className={`h-32 bg-gradient-to-br ${toneClass} flex items-center justify-center relative overflow-hidden`}>
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <BookOpen size={30} className="opacity-80" />
        )}
        {showStatus && (statusPlacement === 'image' || statusPlacement === 'both') && (
          <div className="absolute top-2.5 right-2.5">
            <StatusBadge status={course.status} size="xs" />
          </div>
        )}
        {progress >= 100 && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Completed
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 text-sm truncate flex-1">{course.title}</h3>
          {showStatus && (statusPlacement === 'title' || statusPlacement === 'both') && <StatusBadge status={course.status} size="xs" />}
        </div>
        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{course.description || 'No description'}</p>

        {typeof progress === 'number' && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress || 0}%` }} />
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {progress >= 100 ? 'Completed' : progress ? `${progress}% complete` : 'Not started'}
              </p>
            </div>
            <ArrowRight size={14} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        )}

        {cta}
        {footer}
        {actions && <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">{actions}</div>}
      </div>
    </div>
  );
}
