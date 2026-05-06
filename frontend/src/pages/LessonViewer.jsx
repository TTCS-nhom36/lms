import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lessonApi } from '../api/lessonApi';
import { useToast } from '../contexts/ToastContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import StatusBadge from '../components/ui/StatusBadge';
import {
  ArrowLeft, Video, FileText, Link as LinkIcon,
  CheckCircle, ExternalLink, Clock, BookOpen, Timer, Download,
} from 'lucide-react';

// Estimate lesson "length" for progress bar (seconds). Used only for non-video content.
const ESTIMATED_READING_SECS = 600; // 10 min default

function formatDuration(secs) {
  if (!secs || secs < 0) return '0s';
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Core state
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null); // presigned URL for DOCUMENT lessons

  // Progress state
  const [progress, setProgress] = useState({ isCompleted: false, watchDurationSecs: 0 });
  const [videoDurationSecs, setVideoDurationSecs] = useState(null); // only for HTML5 video

  // Refs to avoid stale closures in intervals
  const watchSecsRef = useRef(0);
  const lessonIdRef = useRef(lessonId);
  const isCompletedRef = useRef(false);
  const syncTimerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const videoRef = useRef(null);

  // Keep refs in sync
  useEffect(() => {
    watchSecsRef.current = progress.watchDurationSecs;
    isCompletedRef.current = progress.isCompleted;
  }, [progress]);

  useEffect(() => {
    lessonIdRef.current = lessonId;
  }, [lessonId]);

  // ─── Load lesson ──────────────────────────────────────────────────
  useEffect(() => {
    setLesson(null);
    setLoading(true);
    setProgress({ isCompleted: false, watchDurationSecs: 0 });
    setVideoDurationSecs(null);
    loadLesson();
  }, [lessonId]);

  const loadLesson = async () => {
    try {
      const res = await lessonApi.getById(lessonId);
      const data = res.data;
      setLesson(data);
      const initial = {
        isCompleted: data.isCompleted ?? false,
        watchDurationSecs: data.watchDurationSecs ?? 0,
      };
      setProgress(initial);
      watchSecsRef.current = initial.watchDurationSecs;
      isCompletedRef.current = initial.isCompleted;
      // Fetch presigned URL for DOCUMENT lessons
      if (data.contentType === 'DOCUMENT' && data.contentUrl) {
        try {
          const urlRes = await lessonApi.getDocumentUrl(data.id);
          setDocumentUrl(urlRes.data.url);
        } catch {
          console.warn('Could not fetch document presigned URL');
        }
      }
    } catch {
      toast.error('Không thể tải bài học');
    } finally {
      setLoading(false);
    }
  };

  // ─── Update Progress API ──────────────────────────────────────────
  const syncToBackend = useCallback(async (overrideCompleted = null) => {
    const currentId = lessonIdRef.current;
    const secs = watchSecsRef.current;
    const completed = overrideCompleted !== null ? overrideCompleted : isCompletedRef.current;
    try {
      setSyncing(true);
      await lessonApi.updateProgress(currentId, {
        watchDurationSecs: secs,
        isCompleted: completed,
      });
    } catch (err) {
      console.warn('[LessonViewer] Sync failed:', err?.response?.status, err?.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  // ─── Tick timer (1s) for non-video OR YouTube iframe ──────────────
  const startTickTimer = useCallback(() => {
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    tickTimerRef.current = setInterval(() => {
      if (!isCompletedRef.current) {
        watchSecsRef.current += 1;
        setProgress(prev => ({ ...prev, watchDurationSecs: prev.watchDurationSecs + 1 }));
      }
    }, 1000);
  }, []);

  const stopTickTimer = useCallback(() => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  // ─── Sync timer (every 30s) ───────────────────────────────────────
  const startSyncTimer = useCallback(() => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    syncTimerRef.current = setInterval(() => {
      if (!isCompletedRef.current) {
        syncToBackend();
      }
    }, 30000);
  }, [syncToBackend]);

  const stopSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  // ─── Start/stop tracking when lesson changes ───────────────────────
  useEffect(() => {
    if (!lesson || progress.isCompleted) return;

    const isHtml5Video = lesson.contentType === 'VIDEO' &&
      lesson.contentUrl &&
      !lesson.contentUrl.includes('youtube.com') &&
      !lesson.contentUrl.includes('youtu.be');

    // For HTML5 video, onTimeUpdate handles the tick — no interval needed
    if (!isHtml5Video) {
      startTickTimer();
    }
    startSyncTimer();

    return () => {
      stopTickTimer();
      stopSyncTimer();
      // Sync on unmount (navigate away)
      if (!isCompletedRef.current) {
        syncToBackend();
      }
    };
  }, [lesson?.id, progress.isCompleted]);

  // ─── HTML5 video tracking ─────────────────────────────────────────
  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isCompletedRef.current) return;
    const currentSecs = Math.floor(video.currentTime);
    // Only update if increased (avoid seeking backward inflating time)
    if (currentSecs > watchSecsRef.current) {
      watchSecsRef.current = currentSecs;
      setProgress(prev => ({ ...prev, watchDurationSecs: currentSecs }));
    }
    if (video.duration && !videoDurationSecs) {
      setVideoDurationSecs(Math.floor(video.duration));
    }
  }, [videoDurationSecs]);

  const handleVideoLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration) {
      setVideoDurationSecs(Math.floor(video.duration));
      // Resume from saved position
      if (watchSecsRef.current > 0 && watchSecsRef.current < video.duration) {
        video.currentTime = watchSecsRef.current;
      }
    }
  }, []);

  // ─── Mark Complete ────────────────────────────────────────────────
  const handleComplete = async () => {
    setCompleting(true);
    try {
      // Use the dedicated /complete endpoint (POST)
      const res = await lessonApi.complete(lessonId);
      const data = res.data;

      setProgress({
        isCompleted: true,
        watchDurationSecs: data?.watchDurationSecs ?? watchSecsRef.current,
      });
      watchSecsRef.current = data?.watchDurationSecs ?? watchSecsRef.current;
      isCompletedRef.current = true;

      // Stop timers since lesson is done
      stopTickTimer();
      stopSyncTimer();

      toast.success('🎉 Hoàn thành bài học!');
    } catch (err) {
      toast.error('Không thể đánh dấu hoàn thành');
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  // ─── Manual save progress ─────────────────────────────────────────
  const handleSaveProgress = async () => {
    try {
      setSyncing(true);
      await lessonApi.updateProgress(lessonId, {
        watchDurationSecs: watchSecsRef.current,
        isCompleted: isCompletedRef.current,
      });
      toast.success('Đã lưu tiến độ');
    } catch {
      toast.error('Không thể lưu tiến độ');
    } finally {
      setSyncing(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────
  const convertYoutubeUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = new URL(url).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}?rel=0`;
    }
    return url;
  };

  const getProgressPercent = () => {
    if (progress.isCompleted) return 100;
    const duration = videoDurationSecs || ESTIMATED_READING_SECS;
    return Math.min(99, Math.round((progress.watchDurationSecs / duration) * 100));
  };

  // ─── Content render ───────────────────────────────────────────────
  const renderContent = () => {
    switch (lesson.contentType) {
      case 'VIDEO': {
        const isYoutube = lesson.contentUrl?.includes('youtube.com') || lesson.contentUrl?.includes('youtu.be');
        if (!lesson.contentUrl) {
          return (
            <div className="aspect-video glass-card flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Video size={48} className="opacity-40" />
              <span className="text-sm">Chưa có video</span>
            </div>
          );
        }
        return isYoutube ? (
          <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-neutral-200">
            <iframe
              src={convertYoutubeUrl(lesson.contentUrl)}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden shadow-lg border border-neutral-200 bg-black">
            <video
              ref={videoRef}
              src={lesson.contentUrl}
              controls
              className="w-full max-h-[480px]"
              onTimeUpdate={handleVideoTimeUpdate}
              onLoadedMetadata={handleVideoLoadedMetadata}
            />
          </div>
        );
      }

      case 'DOCUMENT':
      case 'NOTEBOOK':
        return (
          <div className="glass-card p-6 space-y-4">
            {lesson.contentType === 'DOCUMENT' && (
              documentUrl ? (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0071e3] text-white font-semibold text-sm hover:bg-[#0077ed] transition-colors shadow-sm"
                >
                  <Download size={18} /> Tải tài liệu về
                </a>
              ) : lesson.contentUrl ? (
                <p className="text-sm text-neutral-400">Đang tải liên kết tài liệu...</p>
              ) : (
                <p className="text-neutral-400 text-sm">Chưa có tài liệu đính kèm.</p>
              )
            )}
            {lesson.contentType === 'NOTEBOOK' && lesson.contentUrl && (
              <a
                href={lesson.contentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-medium text-sm"
              >
                <ExternalLink size={16} /> Mở Notebook
              </a>
            )}
            {lesson.contentText && (
              <div className="text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap">
                {lesson.contentText}
              </div>
            )}
            {!lesson.contentUrl && !lesson.contentText && (
              <p className="text-neutral-400 text-sm">Chưa có nội dung tài liệu.</p>
            )}
          </div>
        );

      case 'LINK':
        return (
          <div className="glass-card p-10 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
              <LinkIcon size={32} className="text-cyan-500" />
            </div>
            <p className="text-neutral-500 text-sm">Tài nguyên bên ngoài</p>
            <a
              href={lesson.contentUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary !bg-gradient-to-r !from-cyan-500 !to-blue-600"
            >
              <ExternalLink size={16} /> Mở liên kết
            </a>
            {lesson.contentUrl && (
              <p className="text-xs text-neutral-400 break-all max-w-md text-center">{lesson.contentUrl}</p>
            )}
          </div>
        );

      case 'TEXT':
      default:
        return (
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-primary-500" />
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Nội dung bài học</span>
            </div>
            <div className="text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap">
              {lesson.contentText || 'Chưa có nội dung.'}
            </div>
          </div>
        );
    }
  };

  // ─── Render ───────────────────────────────────────────────────────
  if (loading) return <LoadingSpinner text="Đang tải bài học..." />;
  if (!lesson) return null;

  const percent = getProgressPercent();

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Back nav */}
      <button
        onClick={() => navigate(`/student/courses/${courseId}`)}
        className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-sm font-medium">Quay lại khóa học</span>
      </button>

      {/* Header card */}
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
              {syncing && (
                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                  <span className="animate-spin inline-block w-2.5 h-2.5 border border-neutral-300 border-t-primary-500 rounded-full" />
                  Đang lưu...
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-neutral-900">{lesson.title}</h1>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {!progress.isCompleted && (
              <button
                onClick={handleSaveProgress}
                disabled={syncing}
                className="btn-secondary !px-3 !py-2 text-sm"
                title="Lưu tiến độ ngay"
              >
                <Timer size={15} />
                Lưu tiến độ
              </button>
            )}
            <button
              onClick={handleComplete}
              disabled={completing || progress.isCompleted}
              className={`btn-primary !px-4 !py-2 text-sm transition-all ${
                progress.isCompleted
                  ? '!bg-emerald-500 opacity-80 cursor-default'
                  : '!bg-gradient-to-r !from-emerald-500 !to-teal-600 hover:!shadow-emerald-500/30'
              }`}
            >
              <CheckCircle size={15} />
              {progress.isCompleted
                ? 'Đã hoàn thành'
                : completing
                ? 'Đang xử lý...'
                : 'Đánh dấu hoàn thành'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Đã xem: {formatDuration(progress.watchDurationSecs)}
              {videoDurationSecs && (
                <span className="text-neutral-400"> / {formatDuration(videoDurationSecs)}</span>
              )}
            </span>
            <span className={`font-medium ${progress.isCompleted ? 'text-emerald-600' : 'text-neutral-500'}`}>
              {progress.isCompleted ? '✓ Hoàn thành' : `${percent}%`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 border border-neutral-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress.isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-primary-500 to-blue-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Footer hint */}
      {!progress.isCompleted && (
        <p className="text-center text-xs text-neutral-400 pb-4">
          Tiến độ được tự động lưu mỗi 30 giây • Nhấn "Lưu tiến độ" để lưu ngay
        </p>
      )}
      {progress.isCompleted && (
        <div className="flex items-center justify-center gap-2 pb-4 text-emerald-600 text-sm font-medium">
          <CheckCircle size={16} />
          Bạn đã hoàn thành bài học này!
        </div>
      )}
    </div>
  );
}
