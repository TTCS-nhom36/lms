import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import { CheckCircle } from 'lucide-react';

export default function LessonHeader({
  lesson,
  isStudent,
  isVideoLesson,
  progress,
  syncing,
  completing,
  onSaveProgress,
  onComplete,
}) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={lesson.contentType} size="sm" />
            {lesson.isFreePreview && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600">
                FREE PREVIEW
              </span>
            )}
            {isStudent && syncing && (
              <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                <span className="animate-spin inline-block w-2.5 h-2.5 border border-neutral-300 border-t-primary-500 rounded-full" />
                Saving...
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-neutral-900">{lesson.title}</h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isStudent && !progress.isCompleted && (
            <Button variant="secondary" onClick={onSaveProgress} disabled={syncing} className="!px-3 !py-2 text-sm">
              {syncing ? 'Saving...' : 'Save progress'}
            </Button>
          )}

          {isStudent && !isVideoLesson && (
            <Button
              onClick={onComplete}
              disabled={completing || progress.isCompleted}
              className={`btn-primary !px-4 !py-2 text-sm transition-all ${
                progress.isCompleted
                  ? '!bg-emerald-500 opacity-80 cursor-default'
                  : '!bg-gradient-to-r !from-emerald-500 !to-teal-600 hover:!shadow-emerald-500/30'
              }`}
            >
              <CheckCircle size={15} />
              {progress.isCompleted ? 'Completed' : completing ? 'Processing...' : 'Mark completed'}
            </Button>
          )}

          {isStudent && isVideoLesson && progress.isCompleted && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm font-semibold">
              <CheckCircle size={15} />
              Completed
            </div>
          )}

          {isStudent && isVideoLesson && completing && !progress.isCompleted && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-100 text-neutral-500 text-sm">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-neutral-300 border-t-primary-500 rounded-full" />
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
