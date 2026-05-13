import { CheckCircle, FileText, ListChecks, Video } from 'lucide-react';

export default function LessonOutline({
  outline,
  outlineLoading,
  lessonId,
  currentLessonIndex,
  totalLessons,
  courseBasePath,
  courseId,
  onNavigate,
}) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">Course Outline</p>
          <p className="mt-1 text-sm text-neutral-500">
            {currentLessonIndex >= 0 ? `Lesson ${currentLessonIndex + 1} of ${totalLessons}` : `${totalLessons} lessons`}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <ListChecks size={18} />
        </div>
      </div>

      <div className="mt-4 max-h-[calc(100vh-190px)] space-y-4 overflow-y-auto pr-1">
        {outlineLoading ? (
          <div className="py-8 text-center text-sm text-neutral-400">Loading outline...</div>
        ) : outline.length === 0 ? (
          <div className="py-8 text-center text-sm text-neutral-400">No lessons found.</div>
        ) : (
          outline.map((chapter, chapterIndex) => (
            <div key={chapter.id} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-500">
                  {chapterIndex + 1}
                </span>
                <p className="line-clamp-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{chapter.title}</p>
              </div>
              <div className="space-y-1">
                {(chapter.lessons || []).map((item, lessonIndex) => {
                  const active = String(item.id) === String(lessonId);
                  const Icon = item.contentType === 'VIDEO' ? Video : FileText;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(`${courseBasePath}/courses/${courseId}/lessons/${item.id}`)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                        active
                          ? '!bg-[#0071e3] !text-white shadow-sm'
                          : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                      }`}
                    >
                      <Icon size={15} className={active ? 'text-white' : 'text-neutral-400'} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.title || 'Untitled lesson'}</p>
                        <p className={`text-[11px] ${active ? 'text-white/70' : 'text-neutral-400'}`}>
                          Lesson {lessonIndex + 1}
                        </p>
                      </div>
                      {item.isCompleted && <CheckCircle size={14} className={active ? 'text-white' : 'text-emerald-500'} />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
