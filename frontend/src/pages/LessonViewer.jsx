import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseApi } from '../api/courseApi';
import { lessonApi } from '../api/lessonApi';
import LessonContent from '../components/lesson/LessonContent';
import LessonHeader from '../components/lesson/LessonHeader';
import LessonOutline from '../components/lesson/LessonOutline';
import { extractYoutubeId } from '../components/lesson/lessonUtils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin, isInstructor, isStudent } = useAuth();
  const courseBasePath = isAdmin ? '/admin' : isInstructor ? '/instructor' : '/student';

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [outline, setOutline] = useState([]);
  const [outlineLoading, setOutlineLoading] = useState(true);
  const [progress, setProgress] = useState({ isCompleted: false, watchDurationSecs: 0 });
  const [videoDurationSecs, setVideoDurationSecs] = useState(null);

  const watchSecsRef = useRef(0);
  const lessonIdRef = useRef(lessonId);
  const isCompletedRef = useRef(false);
  const syncTimerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);

  useEffect(() => {
    watchSecsRef.current = progress.watchDurationSecs;
    isCompletedRef.current = progress.isCompleted;
  }, [progress]);

  useEffect(() => {
    lessonIdRef.current = lessonId;
  }, [lessonId]);

  const loadLesson = useCallback(async () => {
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
      if (data.contentType === 'DOCUMENT' && data.contentUrl) {
        try {
          const urlRes = await lessonApi.getDocumentUrl(data.id);
          setDocumentUrl(urlRes.data.url);
        } catch {
          console.warn('Could not fetch document presigned URL');
        }
      }
    } catch {
      setLoadError('Could not load this lesson. Please try again.');
      toast.error('Could not load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonId, toast]);

  const loadOutline = useCallback(async () => {
    try {
      setOutlineLoading(true);
      const res = await courseApi.getById(courseId);
      const courseChapters = res.data.chapters || [];
      const chaptersWithLessons = await Promise.all(
        courseChapters
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
          .map(async (chapter) => {
            try {
              const lessonsRes = await lessonApi.getByChapter(chapter.id);
              return {
                ...chapter,
                lessons: (lessonsRes.data || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)),
              };
            } catch {
              return { ...chapter, lessons: [] };
            }
          })
      );
      setOutline(chaptersWithLessons);
    } catch {
      setOutline([]);
    } finally {
      setOutlineLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!lessonId) return;
    setLesson(null);
    setLoading(true);
    setLoadError(null);
    setProgress({ isCompleted: false, watchDurationSecs: 0 });
    setVideoDurationSecs(null);
    setDocumentUrl(null);
    loadLesson();
  }, [lessonId, loadLesson]);

  useEffect(() => {
    if (!courseId) return;
    loadOutline();
  }, [courseId, loadOutline]);

  const syncToBackend = useCallback(async (overrideCompleted = null) => {
    const currentId = lessonIdRef.current;
    const secs = watchSecsRef.current;
    const completed = overrideCompleted !== null ? overrideCompleted : isCompletedRef.current;
    try {
      setSyncing(true);
      await lessonApi.updateProgress(currentId, { watchDurationSecs: secs, isCompleted: completed });
    } catch (err) {
      console.warn('[LessonViewer] Sync failed:', err?.response?.status, err?.message);
    } finally {
      setSyncing(false);
    }
  }, []);

  const startTickTimer = useCallback(() => {
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    tickTimerRef.current = setInterval(() => {
      if (!isCompletedRef.current) {
        watchSecsRef.current += 1;
        setProgress((prev) => ({ ...prev, watchDurationSecs: prev.watchDurationSecs + 1 }));
      }
    }, 1000);
  }, []);

  const stopTickTimer = useCallback(() => {
    if (tickTimerRef.current) {
      clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    }
  }, []);

  const startSyncTimer = useCallback(() => {
    if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    syncTimerRef.current = setInterval(() => {
      if (!isCompletedRef.current) syncToBackend();
    }, 30000);
  }, [syncToBackend]);

  const stopSyncTimer = useCallback(() => {
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isStudent || !lesson || progress.isCompleted) return;

    const isYoutube = lesson.contentType === 'VIDEO' && extractYoutubeId(lesson.contentUrl);
    const isHtml5Video = lesson.contentType === 'VIDEO' && lesson.contentUrl && !isYoutube;

    if (!isYoutube && !isHtml5Video) startTickTimer();
    startSyncTimer();

    return () => {
      stopTickTimer();
      stopSyncTimer();
      if (!isCompletedRef.current) syncToBackend();
    };
  }, [lesson, progress.isCompleted, isStudent, startSyncTimer, startTickTimer, stopSyncTimer, stopTickTimer, syncToBackend]);

  const completeLesson = useCallback(async (watchDurationSecs) => {
    setCompleting(true);
    try {
      const res = await lessonApi.complete(lessonIdRef.current);
      const data = res.data;
      setProgress({
        isCompleted: true,
        watchDurationSecs: data?.watchDurationSecs ?? watchDurationSecs,
      });
      isCompletedRef.current = true;
      stopTickTimer();
      stopSyncTimer();
      toast.success('Lesson completed!');
    } catch (err) {
      console.error(err);
      toast.error('Could not mark lesson as completed');
    } finally {
      setCompleting(false);
    }
  }, [stopSyncTimer, stopTickTimer, toast]);

  const handleYoutubeTimeUpdate = useCallback((currentSecs) => {
    if (isCompletedRef.current) return;
    if (currentSecs > watchSecsRef.current) {
      watchSecsRef.current = currentSecs;
      setProgress((prev) => ({ ...prev, watchDurationSecs: currentSecs }));
    }
  }, []);

  const handleYoutubeReady = useCallback((player) => {
    const duration = Math.floor(player.getDuration?.() ?? 0);
    if (duration > 0) setVideoDurationSecs(duration);
  }, []);

  const handleYoutubeEnded = useCallback(async () => {
    if (!isStudent || isCompletedRef.current) return;
    const duration = Math.floor(ytPlayerRef.current?.getDuration?.() ?? watchSecsRef.current);
    watchSecsRef.current = duration;
    setProgress((prev) => ({ ...prev, watchDurationSecs: duration }));
    await completeLesson(duration);
  }, [completeLesson, isStudent]);

  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || isCompletedRef.current) return;
    const currentSecs = Math.floor(video.currentTime);
    if (currentSecs > watchSecsRef.current) {
      watchSecsRef.current = currentSecs;
      setProgress((prev) => ({ ...prev, watchDurationSecs: currentSecs }));
    }
    if (video.duration && !videoDurationSecs) {
      setVideoDurationSecs(Math.floor(video.duration));
    }
  }, [videoDurationSecs]);

  const handleVideoLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video && video.duration) {
      setVideoDurationSecs(Math.floor(video.duration));
      if (watchSecsRef.current > 0 && watchSecsRef.current < video.duration) {
        video.currentTime = watchSecsRef.current;
      }
    }
  }, []);

  const handleVideoEnded = useCallback(async () => {
    if (!isStudent || isCompletedRef.current) return;
    const duration = videoDurationSecs ?? watchSecsRef.current;
    watchSecsRef.current = duration;
    setProgress((prev) => ({ ...prev, watchDurationSecs: duration }));
    await completeLesson(duration);
  }, [completeLesson, isStudent, videoDurationSecs]);

  const handleComplete = async () => {
    if (!isStudent) return;
    await completeLesson(watchSecsRef.current);
  };

  const handleSaveProgress = async () => {
    if (!isStudent) return;
    try {
      setSyncing(true);
      await lessonApi.updateProgress(lessonId, {
        watchDurationSecs: watchSecsRef.current,
        isCompleted: isCompletedRef.current,
      });
      toast.success('Progress saved');
    } catch {
      toast.error('Could not save progress');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading lesson..." />;
  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-neutral-500">{loadError}</p>
        <Button onClick={loadLesson} className="mt-4">Try again</Button>
      </div>
    );
  }
  if (!lesson) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-neutral-500">No lesson data available.</p>
        <Button onClick={loadLesson} className="mt-4">Try again</Button>
      </div>
    );
  }

  const isYoutube = lesson?.contentType === 'VIDEO' && !!extractYoutubeId(lesson?.contentUrl);
  const isVideoLesson = lesson?.contentType === 'VIDEO';
  const flatLessons = outline.flatMap((chapter, chapterIndex) =>
    (chapter.lessons || []).map((item, lessonIndex) => ({ ...item, chapter, chapterIndex, lessonIndex }))
  );
  const currentLessonIndex = flatLessons.findIndex((item) => String(item.id) === String(lessonId));
  const currentLessonMeta = currentLessonIndex >= 0 ? flatLessons[currentLessonIndex] : null;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 animate-fade-in lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
        <LessonOutline
          outline={outline}
          outlineLoading={outlineLoading}
          lessonId={lessonId}
          currentLessonIndex={currentLessonIndex}
          totalLessons={flatLessons.length}
          courseBasePath={courseBasePath}
          courseId={courseId}
          onNavigate={navigate}
        />
      </aside>

      <main className="space-y-5">
        <Button
          variant="ghost"
          onClick={() => navigate(`${courseBasePath}/courses/${courseId}`)}
          className="!px-0 text-neutral-500 hover:text-neutral-900 hover:bg-transparent group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Back to course</span>
        </Button>

        {currentLessonMeta && (
          <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-500">
              Chapter {currentLessonMeta.chapterIndex + 1}
            </p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-semibold text-neutral-900">{currentLessonMeta.chapter.title}</p>
              <span className="flex-shrink-0 text-xs text-neutral-400">
                {currentLessonIndex + 1}/{flatLessons.length}
              </span>
            </div>
          </div>
        )}

        <LessonHeader
          lesson={lesson}
          isStudent={isStudent}
          isVideoLesson={isVideoLesson}
          progress={progress}
          syncing={syncing}
          completing={completing}
          onSaveProgress={handleSaveProgress}
          onComplete={handleComplete}
        />

        <LessonContent
          lesson={lesson}
          documentUrl={documentUrl}
          progress={progress}
          videoRef={videoRef}
          youtubePlayerRef={ytPlayerRef}
          onYoutubeReady={handleYoutubeReady}
          onYoutubeEnded={handleYoutubeEnded}
          onYoutubeTimeUpdate={handleYoutubeTimeUpdate}
          onVideoTimeUpdate={handleVideoTimeUpdate}
          onVideoLoadedMetadata={handleVideoLoadedMetadata}
          onVideoEnded={handleVideoEnded}
        />

        {isStudent && !progress.isCompleted && (
          <p className="text-center text-xs text-neutral-400 pb-4">
            {isYoutube || isVideoLesson
              ? 'Watch the full video to complete the lesson. Progress is saved when you leave.'
              : 'Progress is saved every 30 seconds. Use Save progress to save now.'}
          </p>
        )}
        {isStudent && progress.isCompleted && (
          <div className="flex items-center justify-center gap-2 pb-4 text-emerald-600 text-sm font-medium">
            <CheckCircle size={16} />
            You have completed this lesson.
          </div>
        )}
      </main>
    </div>
  );
}
