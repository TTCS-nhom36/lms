import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseApi } from '../api/courseApi';
import { lessonApi } from '../api/lessonApi';
import { assignmentApi } from '../api/assignmentApi';
import { chapterApi } from '../api/chapterApi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, Video, FileText,
  Link as LinkIcon, Play, Lock, ClipboardList, Calendar, Clock,
  Plus, Edit, Trash2, ChevronUp, ChevronDown as ChevronDownIcon, CheckCircle
} from 'lucide-react';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isStudent, isInstructor, isAdmin } = useAuth();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [lessons, setLessons] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [showChapterModal, setShowChapterModal] = useState(false);
  const [editChapter, setEditChapter] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [chapterForm, setChapterForm] = useState({ title: '' });
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [editLesson, setEditLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', contentType: 'VIDEO', contentUrl: '', contentText: '', isFreePreview: false, chapterId: null });
  const [showLessonConfirm, setShowLessonConfirm] = useState(false);
  const [deleteLessonId, setDeleteLessonId] = useState(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressLesson, setProgressLesson] = useState(null);
  const [progressForm, setProgressForm] = useState({ isCompleted: false, watchDurationSecs: 0 });
  const [lessonProgress, setLessonProgress] = useState({});

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const res = await courseApi.getById(id);
      setCourse(res.data.course);
      setChapters(res.data.chapters || []);

      // Load lessons per chapter
      const lessonData = {};
      for (const ch of res.data.chapters || []) {
        try {
          const lRes = await lessonApi.getByChapter(ch.id);
          lessonData[ch.id] = lRes.data || [];
        } catch {
          lessonData[ch.id] = [];
        }
      }
      setLessons(lessonData);

      // Load assignments
      try {
        const aRes = await assignmentApi.getByCourse(id);
        setAssignments(aRes.data || []);
      } catch {
        setAssignments([]);
      }
    } catch {
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (chId) => {
    setExpanded((p) => ({ ...p, [chId]: !p[chId] }));
  };

  const handleCreateChapter = () => {
    setEditChapter(null);
    setChapterForm({
      title: '',
      orderIndex: chapters.length + 1
    });
    setShowChapterModal(true);
  };

  const handleEditChapter = (ch) => {
    setEditChapter(ch);
    setChapterForm({
      title: ch.title,
      orderIndex: ch.orderIndex || 1
    });
    setShowChapterModal(true);
  };

  const handleSaveChapter = async () => {
    try {

      // For now, only send title as backend doesn't support other fields
      const payload = {
        title: chapterForm.title,
        orderIndex: chapterForm.orderIndex
      };
      if (editChapter) {
        await chapterApi.update(editChapter.id, payload);
        toast.success('Chapter updated');
      } else {
        await chapterApi.create(id, payload);
        toast.success('Chapter created');
      }
      setShowChapterModal(false);
      loadData();
    } catch {
      toast.error('Failed to save chapter');
    }
  };

  const handleCreateLesson = (chapterId) => {
    setEditLesson(null);
    setLessonForm({
      title: '', contentType: 'VIDEO', contentUrl: '', contentText: '', isFreePreview: false, chapterId,
    });
    setShowLessonModal(true);
  };

  const handleEditLesson = (lesson) => {
    setEditLesson(lesson);
    setLessonForm({
      title: lesson.title,
      contentType: lesson.contentType || 'VIDEO',
      contentUrl: lesson.contentUrl || '',
      contentText: lesson.contentText || '',
      isFreePreview: lesson.isFreePreview || false,
      chapterId: lesson.chapterId,
    });
    setShowLessonModal(true);
  };

  const handleSaveLesson = async () => {
    try {
      const payload = {
        chapterId: lessonForm.chapterId,
        title: lessonForm.title,
        contentType: lessonForm.contentType,
        contentUrl: lessonForm.contentUrl,
        contentText: lessonForm.contentText,
        isFreePreview: lessonForm.isFreePreview,

      };

      if (editLesson) {
        await lessonApi.update(editLesson.id, payload);
        toast.success('Lesson updated');
      } else {
        await lessonApi.create(lessonForm.chapterId, payload);
        toast.success('Lesson created');
      }
      setShowLessonModal(false);
      loadData();
    } catch {
      toast.error('Failed to save lesson');
    }
  };

  const handleDeleteLesson = async () => {
    try {
      await lessonApi.delete(deleteLessonId);
      toast.success('Lesson deleted');
      setShowLessonConfirm(false);
      loadData();
    } catch {
      toast.error('Failed to delete lesson');
    }
  };

  const handleOpenProgress = (lesson) => {
    setProgressLesson(lesson);
    const existing = lessonProgress[lesson.id] || { isCompleted: false, watchDurationSecs: 0 };
    setProgressForm({ isCompleted: existing.isCompleted, watchDurationSecs: existing.watchDurationSecs || 0 });
    setShowProgressModal(true);
  };

  const handleSaveProgress = async () => {
    try {
      const res = await lessonApi.updateProgress(progressLesson.id, {
        isCompleted: progressForm.isCompleted,
        watchDurationSecs: Number(progressForm.watchDurationSecs) || 0,
      });
      setLessonProgress((prev) => ({ ...prev, [progressLesson.id]: res.data }));
      toast.success('Lesson progress updated');
      setShowProgressModal(false);
    } catch {
      toast.error('Failed to update lesson progress');
    }
  };

  const handleDeleteChapter = async () => {
    try {
      await chapterApi.delete(deleteId);
      toast.success('Chapter deleted');
      setShowConfirm(false);
      loadData();
    } catch {
      toast.error('Failed to delete chapter');
    }
  };

  const handleMoveChapter = async (chId, direction) => {
    const sortedChapters = [...chapters].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = sortedChapters.findIndex(ch => ch.id === chId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sortedChapters.length - 1)) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [sortedChapters[index], sortedChapters[newIndex]] = [sortedChapters[newIndex], sortedChapters[index]];

    const newOrder = sortedChapters.map(ch => ch.id);
    try {
      await chapterApi.reorder({ chapterIds: newOrder });
      loadData();
    } catch {
      toast.error('Failed to reorder chapters');
    }
  };

  const contentIcons = { VIDEO: Video, DOCUMENT: FileText, TEXT: FileText, LINK: LinkIcon, NOTEBOOK: FileText };

  if (loading) return <LoadingSpinner text="Loading course..." />;
  if (!course) return null;

  const basePath = isAdmin ? '/admin' : isInstructor ? '/instructor' : '/student';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Course Header */}
      <div className="glass-card overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-primary-600/30 via-blue-600/20 to-indigo-600/10 flex items-center justify-center relative">
          {course.thumbnailUrl ? (
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <BookOpen size={56} className="text-neutral-400" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6">
            <StatusBadge status={course.status} />
            <h1 className="text-2xl font-bold text-neutral-900 mt-2">{course.title}</h1>
          </div>
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-neutral-700 text-sm leading-relaxed">{course.description || 'No description available.'}</p>
            {(isInstructor || isAdmin) && (
              <button onClick={() => navigate(`/instructor/courses/${course.id}/assignments`)} className="btn-secondary !px-4 !py-2 text-sm">
                Manage Assignments
              </button>
            )}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-neutral-400">
            <span>{chapters.length} chapters</span>
            <span>•</span>
            <span>{Object.values(lessons).flat().length} lessons</span>
            <span>•</span>
            <span>{assignments.length} assignments</span>
          </div>
        </div>
      </div>

      {/* Chapters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-neutral-900">Course Content</h3>
          {isAdmin && (
            <button onClick={handleCreateChapter} className="btn-primary">
              <Plus size={15} /> Add Chapter
            </button>
          )}
        </div>
        <div className="space-y-2">
          {chapters.sort((a, b) => a.orderIndex - b.orderIndex).map((ch) => (
            <div key={ch.id} className="glass-card !rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-100 transition-colors"
                onClick={() => toggleChapter(ch.id)}
              >
                {expanded[ch.id] ? <ChevronDown size={16} className="text-neutral-500" /> : <ChevronRight size={16} className="text-neutral-500" />}
                <span className="text-sm font-semibold text-neutral-800 flex-1">{ch.title}</span>
                <span className="text-xs text-neutral-400">{lessons[ch.id]?.length || 0} lessons</span>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(ch.id, 'up'); }} className="p-1 rounded hover:bg-neutral-200" title="Move Up">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleMoveChapter(ch.id, 'down'); }} className="p-1 rounded hover:bg-neutral-200" title="Move Down">
                      <ChevronDownIcon size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleEditChapter(ch); }} className="p-1 rounded hover:bg-neutral-200" title="Edit">
                      <Edit size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(ch.id); setShowConfirm(true); }} className="p-1 rounded hover:bg-red-200 text-red-600" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              {expanded[ch.id] && (
                <div className="border-t border-neutral-200 bg-white/30">
                  {isAdmin && (
                    <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-200">
                      <span className="text-sm font-medium text-neutral-700">Lessons</span>
                      <button onClick={(e) => { e.stopPropagation(); handleCreateLesson(ch.id); }} className="btn-secondary !px-3 !py-1">
                        <Plus size={14} /> Add Lesson
                      </button>
                    </div>
                  )}
                  {(lessons[ch.id] || []).sort((a, b) => a.orderIndex - b.orderIndex).map((ls) => {
                    const Icon = contentIcons[ls.contentType] || FileText;
                    const progressPercent = ls.isCompleted
                      ? 100
                      : ls.watchDurationSecs
                      ? Math.min(99, Math.round((ls.watchDurationSecs / 600) * 100))
                      : 0;
                    const hasProgress = ls.isCompleted || (ls.watchDurationSecs > 0);

                    return (
                      <div key={ls.id} className="border-b border-neutral-200 last:border-0">
                        <div
                          onClick={() => {
                            if (isStudent) navigate(`/student/courses/${id}/lessons/${ls.id}`);
                          }}
                          className={`flex items-center gap-3 px-6 py-3 transition-colors ${isStudent ? 'cursor-pointer hover:bg-neutral-50' : ''}`}
                        >
                          {isStudent && ls.isCompleted ? (
                            <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" />
                          ) : (
                            <Icon size={14} className="text-neutral-400 flex-shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium truncate ${ls.isCompleted && isStudent ? 'text-emerald-700' : 'text-neutral-700'}`}>
                                {ls.title}
                              </span>
                              <StatusBadge status={ls.contentType} size="xs" />
                              {ls.isFreePreview && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-500">FREE</span>
                              )}
                              {isStudent && ls.isCompleted && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600">Hoàn thành</span>
                              )}
                              {isStudent && !ls.isCompleted && ls.watchDurationSecs > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-600">Đang học</span>
                              )}
                            </div>
                            {isStudent && hasProgress && (
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="flex-1 h-1 rounded-full bg-neutral-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${ls.isCompleted ? 'bg-emerald-500' : 'bg-primary-400'}`}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-neutral-400 w-8 text-right">{progressPercent}%</span>
                              </div>
                            )}
                          </div>

                          {ls.contentType === 'DOCUMENT' && ls.contentUrl && (
                            <a
                              href={ls.contentUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="btn-secondary btn-xs flex-shrink-0"
                            >
                              Tải xuống
                            </a>
                          )}
                          {isStudent && !ls.isCompleted && (
                            <Play size={12} className="text-primary-400 flex-shrink-0" />
                          )}
                        </div>

                        {isAdmin && (
                          <div className="px-6 py-2 flex flex-wrap items-center gap-2 bg-slate-50 border-t border-neutral-100">
                            <button onClick={() => handleEditLesson(ls)} className="btn-secondary !px-2 !py-1 text-xs">
                              <Edit size={13} /> Edit
                            </button>
                            <button onClick={() => handleOpenProgress(ls)} className="btn-secondary !px-2 !py-1 text-xs">
                              <CheckCircle size={13} /> Progress
                            </button>
                            <button
                              onClick={() => { setDeleteLessonId(ls.id); setShowLessonConfirm(true); }}
                              className="btn-danger !px-2 !py-1 text-xs"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Assignments */}
      {assignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-3">Assignments</h3>
          <div className="space-y-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                onClick={() => {
                  if (isStudent) navigate(`/student/assignments/${a.id}`);
                  else if (isInstructor || isAdmin) navigate(`/instructor/courses/${id}/submissions/${a.id}`);
                }}
                className="glass-card !rounded-xl p-4 cursor-pointer hover:border-primary-500/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary-500/15 flex items-center justify-center">
                    <ClipboardList size={18} className="text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-neutral-800">{a.title}</h4>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-0.5">
                      <StatusBadge status={a.type} size="xs" />
                      {a.dueDate && <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(a.dueDate).toLocaleDateString()}</span>}
                      {a.timeLimitMins > 0 && <span className="flex items-center gap-1"><Clock size={10} /> {a.timeLimitMins}m</span>}
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400">Max: {a.maxScore}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapter Modal */}
      {isAdmin && (
        <Modal isOpen={showChapterModal} onClose={() => setShowChapterModal(false)} title={editChapter ? 'Edit Chapter' : 'Create Chapter'} size="md">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Title</label>
              <input
                type="text"
                value={chapterForm.title}
                onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                placeholder="Chapter title"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setShowChapterModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveChapter} className="btn-primary">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Lesson Modal */}
      {isAdmin && (
        <Modal isOpen={showLessonModal} onClose={() => setShowLessonModal(false)} title={editLesson ? 'Edit Lesson' : 'Create Lesson'} size="md">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Lesson Title</label>
              <input
                type="text"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Lesson title"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Content Type</label>
              <select
                value={lessonForm.contentType}
                onChange={(e) => setLessonForm({ ...lessonForm, contentType: e.target.value })}
                className="w-full"
              >
                <option value="VIDEO">Video</option>
                <option value="DOCUMENT">Document</option>
                <option value="TEXT">Text</option>
                <option value="LINK">Link</option>
                <option value="NOTEBOOK">Notebook</option>
              </select>
            </div>
            {lessonForm.contentType === 'TEXT' ? (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Lesson Content</label>
                <textarea
                  rows={4}
                  value={lessonForm.contentText}
                  onChange={(e) => setLessonForm({ ...lessonForm, contentText: e.target.value })}
                  placeholder="Add lesson text content"
                />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Content URL</label>
                <input
                  type="url"
                  value={lessonForm.contentUrl}
                  onChange={(e) => setLessonForm({ ...lessonForm, contentUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={lessonForm.isFreePreview}
                  onChange={(e) => setLessonForm({ ...lessonForm, isFreePreview: e.target.checked })}
                />
                Free preview
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setShowLessonModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveLesson} className="btn-primary">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Progress Modal */}
      {isAdmin && (
        <Modal isOpen={showProgressModal} onClose={() => setShowProgressModal(false)} title="Update Lesson Progress" size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Lesson</label>
              <p className="text-sm text-neutral-700">{progressLesson?.title}</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={progressForm.isCompleted}
                  onChange={(e) => setProgressForm({ ...progressForm, isCompleted: e.target.checked })}
                />
                Mark as completed
              </label>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Watch duration (seconds)</label>
              <input
                type="number"
                min="0"
                value={progressForm.watchDurationSecs}
                onChange={(e) => setProgressForm({ ...progressForm, watchDurationSecs: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button onClick={() => setShowProgressModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveProgress} className="btn-primary">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDeleteChapter}
        title="Delete Chapter"
        message="This will permanently delete the chapter and all its lessons. Are you sure?"
      />
      <ConfirmDialog
        isOpen={showLessonConfirm}
        onClose={() => setShowLessonConfirm(false)}
        onConfirm={handleDeleteLesson}
        title="Delete Lesson"
        message="This will permanently delete the lesson. Are you sure?"
      />
    </div>
  );
}
