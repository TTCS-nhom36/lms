import StatusBadge from '../ui/StatusBadge';
import Button from '../ui/Button';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit,
  FileText,
  Link as LinkIcon,
  Play,
  Plus,
  Trash2,
  Video,
} from 'lucide-react';

const contentIcons = { VIDEO: Video, DOCUMENT: FileText, TEXT: FileText, LINK: LinkIcon, NOTEBOOK: FileText };

function LessonRow({ lesson, canManage, isStudent, onOpen, onEdit, onDelete }) {
  const Icon = contentIcons[lesson.contentType] || FileText;
  const progressPercent = lesson.isCompleted
    ? 100
    : lesson.watchDurationSecs
    ? Math.min(99, Math.round((lesson.watchDurationSecs / 600) * 100))
    : 0;
  const hasProgress = lesson.isCompleted || lesson.watchDurationSecs > 0;

  return (
    <div className="border-b border-neutral-200 last:border-0">
      <div onClick={onOpen} className="flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors hover:bg-neutral-50">
        {isStudent && lesson.isCompleted ? (
          <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
        ) : (
          <Icon size={14} className="text-neutral-400 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium truncate ${lesson.isCompleted && isStudent ? 'text-emerald-700' : 'text-neutral-700'}`}>
              {lesson.title}
            </span>
            <StatusBadge status={lesson.contentType} size="xs" />
            {lesson.isFreePreview && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-500">FREE</span>
            )}
            {isStudent && lesson.isCompleted && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600">Completed</span>
            )}
            {isStudent && !lesson.isCompleted && lesson.watchDurationSecs > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600">In progress</span>
            )}
          </div>
          {isStudent && hasProgress && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${lesson.isCompleted ? 'bg-emerald-500' : 'bg-primary-400'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-neutral-400 w-8 text-right">{progressPercent}%</span>
            </div>
          )}
        </div>

        {lesson.contentType === 'DOCUMENT' && lesson.contentUrl && (
          <a href={lesson.contentUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="btn-secondary btn-xs flex-shrink-0">
            Download
          </a>
        )}
        {isStudent && !lesson.isCompleted && <Play size={12} className="text-primary-400 flex-shrink-0" />}
      </div>

      {canManage && (
        <div className="px-6 py-2 flex flex-wrap items-center gap-2 bg-slate-50 border-t border-neutral-100">
          <Button variant="secondary" onClick={() => onEdit(lesson)} className="!px-2 !py-1 text-xs">
            <Edit size={13} /> Edit
          </Button>
          <Button variant="danger" onClick={() => onDelete(lesson)} className="!px-2 !py-1 text-xs">
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      )}
    </div>
  );
}

function ChapterItem({
  chapter,
  lessons,
  expanded,
  canManage,
  isStudent,
  onToggle,
  onMove,
  onEditChapter,
  onDeleteChapter,
  onCreateLesson,
  onOpenLesson,
  onEditLesson,
  onDeleteLesson,
}) {
  const sortedLessons = [...(lessons || [])].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="glass-card !rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-100 transition-colors" onClick={() => onToggle(chapter.id)}>
        {expanded ? <ChevronDown size={16} className="text-neutral-500" /> : <ChevronRight size={16} className="text-neutral-500" />}
        <span className="text-sm font-semibold text-neutral-800 flex-1">{chapter.title}</span>
        <span className="text-xs text-neutral-400">{sortedLessons.length} lessons</span>
        {canManage && (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onMove(chapter.id, 'up'); }} className="p-1 rounded hover:bg-neutral-200" title="Move Up">
              <ChevronUp size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onMove(chapter.id, 'down'); }} className="p-1 rounded hover:bg-neutral-200" title="Move Down">
              <ChevronDown size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEditChapter(chapter); }} className="p-1 rounded hover:bg-neutral-200" title="Edit">
              <Edit size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteChapter(chapter); }} className="p-1 rounded hover:bg-red-200 text-red-600" title="Delete">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-neutral-200 bg-white/30">
          {canManage && (
            <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">Lessons</span>
              <Button variant="secondary" onClick={(e) => { e.stopPropagation(); onCreateLesson(chapter.id); }} className="!px-3 !py-1">
                <Plus size={14} /> Add Lesson
              </Button>
            </div>
          )}
          {sortedLessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              lesson={lesson}
              canManage={canManage}
              isStudent={isStudent}
              onOpen={() => onOpenLesson(lesson)}
              onEdit={onEditLesson}
              onDelete={onDeleteLesson}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CourseCurriculum({
  chapters,
  lessons,
  expanded,
  canManage,
  isStudent,
  onCreateChapter,
  onToggleChapter,
  onMoveChapter,
  onEditChapter,
  onDeleteChapter,
  onCreateLesson,
  onOpenLesson,
  onEditLesson,
  onDeleteLesson,
}) {
  const sortedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <section className="rounded-3xl border border-white/70 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">Curriculum</p>
          <h3 className="text-xl font-semibold text-neutral-900">Course Content</h3>
        </div>
        {canManage && (
          <Button onClick={onCreateChapter}>
            <Plus size={15} /> Add Chapter
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {sortedChapters.map((chapter) => (
          <ChapterItem
            key={chapter.id}
            chapter={chapter}
            lessons={lessons[chapter.id]}
            expanded={expanded[chapter.id]}
            canManage={canManage}
            isStudent={isStudent}
            onToggle={onToggleChapter}
            onMove={onMoveChapter}
            onEditChapter={onEditChapter}
            onDeleteChapter={onDeleteChapter}
            onCreateLesson={onCreateLesson}
            onOpenLesson={onOpenLesson}
            onEditLesson={onEditLesson}
            onDeleteLesson={onDeleteLesson}
          />
        ))}
      </div>
    </section>
  );
}
