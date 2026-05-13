import { Calendar, Clock, ClipboardList } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

export default function AssignmentInfoCard({ assignment, isPastDue }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10">
            <ClipboardList size={20} className="text-primary-500" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-900">{assignment.title}</h2>
              {isPastDue && <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600">Past due</span>}
            </div>
            {assignment.description && (
              <p className="line-clamp-3 text-sm leading-6 text-neutral-600">{assignment.description}</p>
            )}
          </div>
        </div>
        <div className="shrink-0">
            <StatusBadge status={assignment.type} size="sm" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-neutral-50 p-3 md:grid-cols-4">
        <div>
          <span className="text-xs text-neutral-400 block">Max Score</span>
          <span className="text-sm font-semibold text-neutral-900">{assignment.maxScore}</span>
        </div>
        <div>
          <span className="text-xs text-neutral-400 block">Weight</span>
          <span className="text-sm font-semibold text-neutral-900">{assignment.weight}</span>
        </div>
        {assignment.dueDate && (
          <div>
            <span className="text-xs text-neutral-400 flex items-center gap-1"><Calendar size={10} /> Due Date</span>
            <span className={`text-sm font-semibold ${isPastDue ? 'text-rose-400' : 'text-neutral-800'}`}>
              {new Date(assignment.dueDate).toLocaleString('vi-VN')}
            </span>
          </div>
        )}
        {assignment.timeLimitMins > 0 && (
          <div>
            <span className="text-xs text-neutral-400 flex items-center gap-1"><Clock size={10} /> Time Limit</span>
            <span className="text-sm font-semibold text-neutral-800">{assignment.timeLimitMins} min</span>
          </div>
        )}
      </div>
    </div>
  );
}
