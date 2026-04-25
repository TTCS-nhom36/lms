import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseApi } from '../api/courseApi';
import { lessonApi } from '../api/lessonApi';
import { assignmentApi } from '../api/assignmentApi';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, Video, FileText,
  Link as LinkIcon, Play, Lock, ClipboardList, Calendar, Clock
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
          <p className="text-neutral-700 text-sm leading-relaxed">{course.description || 'No description available.'}</p>
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
        <h3 className="text-lg font-semibold text-neutral-900 mb-3">Course Content</h3>
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
              </div>
              {expanded[ch.id] && (
                <div className="border-t border-neutral-200 bg-white/30">
                  {(lessons[ch.id] || []).sort((a, b) => a.orderIndex - b.orderIndex).map((ls) => {
                    const Icon = contentIcons[ls.contentType] || FileText;
                    return (
                      <div
                        key={ls.id}
                        onClick={() => {
                          if (isStudent) navigate(`/student/courses/${id}/lessons/${ls.id}`);
                        }}
                        className={`flex items-center gap-3 px-6 py-2.5 border-b border-neutral-200 last:border-0 transition-colors ${
                          isStudent ? 'cursor-pointer hover:bg-neutral-100' : ''
                        }`}
                      >
                        <Icon size={14} className="text-neutral-400" />
                        <span className="text-sm text-neutral-700 flex-1">{ls.title}</span>
                        <StatusBadge status={ls.contentType} size="xs" />
                        {ls.isFreePreview && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400">FREE</span>
                        )}
                        {isStudent && <Play size={12} className="text-primary-400" />}
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
    </div>
  );
}
