import { BookOpen, ClipboardList, Layers3, PlayCircle } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export default function CourseHero({ course, chaptersCount, lessonsCount, assignmentsCount, actions }) {
  const stats = [
    { label: 'Chapters', value: chaptersCount, icon: Layers3 },
    { label: 'Lessons', value: lessonsCount, icon: PlayCircle },
    { label: 'Assignments', value: assignmentsCount, icon: ClipboardList },
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-sm">
      <div className="relative min-h-[260px] bg-gradient-to-br from-slate-950 via-slate-800 to-primary-800">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <BookOpen size={120} className="text-white" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <StatusBadge status={course.status} />
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">{course.title}</h1>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/80">
                {course.description || 'No description available.'}
              </p>
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 divide-y divide-neutral-100 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900">{item.value}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
