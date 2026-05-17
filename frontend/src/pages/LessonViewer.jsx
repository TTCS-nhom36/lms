import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { courseApi } from '../api/courseApi';
import { lessonApi } from '../api/lessonApi';
import LessonContent from '../components/lesson/LessonContent';
import LessonOutline from '../components/lesson/LessonOutline';
import { extractYoutubeId } from '../components/lesson/lessonUtils';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { CheckCircle } from 'lucide-react';

export default function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin, isInstructor, isStudent } = useAuth();
  const courseBasePath = isAdmin ? '/admin' : isInstructor ? '/instructor' : '/student';

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [outline, setOutline] = useState([]);
  const [outlineLoading, setOutlineLoading] = useState(true);
  const [progress, setProgress] = useState({ isCompleted: false, watchDurationSecs: 0 });
  const [videoDurationSecs, setVideoDurationSecs] = useState(null);

  const watchSecsRef = useRef(0);
  const lessonIdRef = useRef(lessonId);
  const isCompletedRef = useRef(false);
  const courseCompletedRef = useRef(false);
  const syncTimerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const autoCompletingLessonRef = useRef(null);

  useEffect(() => {
    watchSecsRef.current = progress.watchDurationSecs;
    isCompletedRef.current = progress.isCompleted;
  }, [progress]);

  useEffect(() => {
    lessonIdRef.current = lessonId;
  }, [lessonId]);

  const updateOutlineLesson = useCallback((targetLessonId, patch) => {
    setOutline((prev) =>
      prev.map((chapter) => ({
        ...chapter,
        lessons: (chapter.lessons || []).map((item) =>
          String(item.id) === String(targetLessonId) ? { ...item, ...patch } : item
        ),
      }))
    );
  }, []);

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
      updateOutlineLesson(data.id, initial);
      if (data.contentType === 'DOCUMENT' && data.contentUrl) {
        try {
          const urlRes = await lessonApi.getDocumentUrl(data.id);
          setDocumentUrl(urlRes.data.url || data.contentUrl);
        } catch {
          console.warn('Could not fetch document presigned URL');
          setDocumentUrl(data.contentUrl);
        }
      }
    } catch {
      setLoadError('Could not load this lesson. Please try again.');
      toast.error('Could not load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonId, toast, updateOutlineLesson]);

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

  useEffect(() => {
    const lessons = outline.flatMap((chapter) => chapter.lessons || []);
    courseCompletedRef.current = lessons.length > 0 && lessons.every((item) => item.isCompleted);
  }, [outline]);

  const shouldSkipProgressUpdate = useCallback(() => (
    isCompletedRef.current || courseCompletedRef.current
  ), []);

  const syncToBackend = useCallback(async (overrideCompleted = null) => {
    if (overrideCompleted !== true && shouldSkipProgressUpdate()) return;

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
  }, [shouldSkipProgressUpdate]);

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
      if (!shouldSkipProgressUpdate()) syncToBackend();
    }, 30000);
  }, [syncToBackend, shouldSkipProgressUpdate]);

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
  }, [lesson, progress.isCompleted, isStudent, startSyncTimer, startTickTimer, stopSyncTimer, stopTickTimer, syncToBackend, shouldSkipProgressUpdate]);

  const completeLesson = useCallback(async (watchDurationSecs) => {
    try {
      const res = await lessonApi.complete(lessonIdRef.current);
      const data = res.data;
      setProgress({
        isCompleted: true,
        watchDurationSecs: data?.watchDurationSecs ?? watchDurationSecs,
      });
      isCompletedRef.current = true;
      updateOutlineLesson(lessonIdRef.current, {
        isCompleted: true,
        watchDurationSecs: data?.watchDurationSecs ?? watchDurationSecs,
      });
      stopTickTimer();
      stopSyncTimer();
      toast.success('Lesson completed!');
    } catch (err) {
      console.error(err);
      toast.error('Could not mark lesson as completed');
    }
  }, [stopSyncTimer, stopTickTimer, toast, updateOutlineLesson]);

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

  useEffect(() => {
    if (!isStudent || !lesson || lesson.contentType === 'VIDEO' || progress.isCompleted) return;
    if (String(autoCompletingLessonRef.current) === String(lesson.id)) return;

    autoCompletingLessonRef.current = lesson.id;
    completeLesson(watchSecsRef.current);
  }, [completeLesson, isStudent, lesson, progress.isCompleted]);

  const handleLessonNavigate = async (targetPath) => {
    if (isStudent && !shouldSkipProgressUpdate()) {
      try {
        setSyncing(true);
        await lessonApi.updateProgress(lessonIdRef.current, {
          watchDurationSecs: watchSecsRef.current,
          isCompleted: isCompletedRef.current,
        });
      } catch (err) {
        console.warn('[LessonViewer] Progress save before navigation failed:', err?.response?.status, err?.message);
      } finally {
        setSyncing(false);
      }
    }
    navigate(targetPath);
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
    <div className="relative left-1/2 grid w-[calc(100vw-32px)] -translate-x-1/2 grid-cols-1 gap-6 animate-fade-in md:w-[calc(100vw-80px)] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden lg:block lg:sticky lg:top-6 lg:self-start">
        <LessonOutline
          outline={outline}
          outlineLoading={outlineLoading}
          lessonId={lessonId}
          currentLessonIndex={currentLessonIndex}
          totalLessons={flatLessons.length}
          courseBasePath={courseBasePath}
          courseId={courseId}
          onNavigate={handleLessonNavigate}
        />
      </aside>

      <main className="min-w-0 space-y-5">
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
              : 'This lesson will be marked completed when opened.'}
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
