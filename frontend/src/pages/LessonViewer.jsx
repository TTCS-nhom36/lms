import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lessonApi } from '../api/lessonApi';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import { ArrowLeft, Video, FileText, Link as LinkIcon, CheckCircle, ExternalLink } from 'lucide-react';

export default function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [progress, setProgress] = useState({ isCompleted: false, watchDurationSecs: 0 });

  useEffect(() => {
    setProgress({ isCompleted: false, watchDurationSecs: 0 });
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      const res = await lessonApi.getById(lessonId);
      const lessonData = res.data;
      setLesson(lessonData);
      setProgress({
        isCompleted: lessonData.isCompleted || false,
        watchDurationSecs: lessonData.watchDurationSecs || 0,
      });
    } catch {
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await lessonApi.complete(lessonId);
      toast.success('Lesson completed! 🎉');
      setProgress({
        isCompleted: res.data?.isCompleted === true,
        watchDurationSecs: res.data?.watchDurationSecs || progress.watchDurationSecs || 0,
      });
    } catch {
      toast.error('Failed to mark as complete');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading lesson..." />;
  if (!lesson) return null;

  const renderContent = () => {
    switch (lesson.contentType) {
      case 'VIDEO':
        return (
          <div className="aspect-video bg-white rounded-xl overflow-hidden border border-neutral-200">
            {lesson.contentUrl ? (
              lesson.contentUrl.includes('youtube.com') || lesson.contentUrl.includes('youtu.be') ? (
                <iframe
                  src={lesson.contentUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lesson.title}
                />
              ) : (
                <video src={lesson.contentUrl} controls className="w-full h-full" />
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                <Video size={48} />
              </div>
            )}
          </div>
        );
      case 'DOCUMENT':
      case 'NOTEBOOK':
        return (
          <div className="glass-card p-6">
            {lesson.contentUrl && (
              <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
                <ExternalLink size={16} /> Open Document
              </a>
            )}
            {lesson.contentText && (
              <div className="prose prose-invert max-w-none text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap">
                {lesson.contentText}
              </div>
            )}
          </div>
        );
      case 'LINK':
        return (
          <div className="glass-card p-6 text-center">
            <LinkIcon size={40} className="text-cyan-400 mx-auto mb-3" />
            <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className="text-lg text-cyan-400 hover:text-cyan-300 font-medium flex items-center justify-center gap-2">
              <ExternalLink size={18} /> Open External Resource
            </a>
          </div>
        );
      case 'TEXT':
      default:
        return (
          <div className="glass-card p-6">
            <div className="text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap">
              {lesson.contentText || 'No content available.'}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer">
        <ArrowLeft size={18} /> Back to Course
      </button>

      {/* Lesson Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={lesson.contentType} size="sm" />
              {lesson.isFreePreview && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">FREE PREVIEW</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-neutral-900">{lesson.title}</h1>
          </div>
          <button
            onClick={handleComplete}
            disabled={completing || progress.isCompleted}
            className="btn-primary !bg-gradient-to-r !from-emerald-500 !to-teal-600 hover:!shadow-emerald-500/30"
          >
            <CheckCircle size={16} />
            {progress.isCompleted ? 'Completed' : completing ? 'Completing...' : 'Mark Complete'}
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-neutral-500">
            <span>{progress.isCompleted ? '100% completed' : 'Lesson not completed yet'}</span>
            <span>{progress.watchDurationSecs || 0} sec watched</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-200" style={{ width: `${progress.isCompleted ? 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
