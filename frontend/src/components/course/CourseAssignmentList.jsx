import { Calendar, Clock, ClipboardList, Edit, Trash2 } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export default function CourseAssignmentList({ assignments, onOpen, canManage = false, onEdit, onDelete }) {
  if (!assignments.length) return null;

  return (
    <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">Assignments</p>
          <h3 className="text-xl font-semibold text-neutral-900">Course Assignments</h3>
        </div>
        <span className="text-sm text-neutral-500">{assignments.length} items</span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(assignment)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onOpen(assignment);
            }}
            className="w-full cursor-pointer rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-left transition-all hover:border-primary-300 hover:bg-white hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
                <ClipboardList size={18} className="text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-semibold text-neutral-900">{assignment.title}</h4>
                  <StatusBadge status={assignment.type} size="xs" />
                </div>
                {assignment.description && (
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-neutral-500">{assignment.description}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-neutral-500">
                  <span className="font-semibold text-neutral-700">Max: {assignment.maxScore}</span>
                  {assignment.dueDate && <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(assignment.dueDate).toLocaleString('vi-VN')}</span>}
                  {assignment.timeLimitMins > 0 && <span className="flex items-center gap-1"><Clock size={10} /> {assignment.timeLimitMins}m</span>}
                </div>
              </div>
              {canManage && (
                <span className="flex shrink-0 items-center gap-1" onClick={(event) => event.stopPropagation()}>
                  <button type="button" onClick={() => onEdit?.(assignment)} className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50" title="Edit assignment">
                    <Edit size={14} />
                  </button>
                  <button type="button" onClick={() => onDelete?.(assignment)} className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50" title="Delete assignment">
                    <Trash2 size={14} />
                  </button>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
