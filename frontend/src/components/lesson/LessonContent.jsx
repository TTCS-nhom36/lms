import YoutubePlayer from '../YoutubePlayer';
import { BookOpen, Download, ExternalLink, Link as LinkIcon, Video } from 'lucide-react';
import { extractYoutubeId } from './lessonUtils';

export default function LessonContent({
  lesson,
  documentUrl,
  progress,
  videoRef,
  youtubePlayerRef,
  onYoutubeReady,
  onYoutubeEnded,
  onYoutubeTimeUpdate,
  onVideoTimeUpdate,
  onVideoLoadedMetadata,
  onVideoEnded,
}) {
  switch (lesson.contentType) {
    case 'VIDEO': {
      const youtubeId = extractYoutubeId(lesson.contentUrl);
      if (!lesson.contentUrl) {
        return (
          <div className="aspect-video glass-card flex flex-col items-center justify-center gap-3 text-neutral-400">
            <Video size={48} className="opacity-40" />
            <span className="text-sm">No video available</span>
          </div>
        );
      }
      if (youtubeId) {
        return (
          <YoutubePlayer
            ref={youtubePlayerRef}
            videoId={youtubeId}
            startSeconds={progress.watchDurationSecs}
            onReady={onYoutubeReady}
            onEnded={onYoutubeEnded}
            onTimeUpdate={onYoutubeTimeUpdate}
          />
        );
      }
      return (
        <div className="rounded-xl overflow-hidden shadow-lg border border-neutral-200 bg-black">
          <video
            ref={videoRef}
            src={lesson.contentUrl}
            controls
            className="w-full max-h-[480px]"
            onTimeUpdate={onVideoTimeUpdate}
            onLoadedMetadata={onVideoLoadedMetadata}
            onEnded={onVideoEnded}
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
              <a href={documentUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0071e3] text-white font-semibold text-sm hover:bg-[#0077ed] transition-colors shadow-sm">
                <Download size={18} /> Download document
              </a>
            ) : lesson.contentUrl ? (
              <p className="text-sm text-neutral-400">Loading document link...</p>
            ) : (
              <p className="text-neutral-400 text-sm">No document attached.</p>
            )
          )}
          {lesson.contentType === 'NOTEBOOK' && lesson.contentUrl && (
            <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-medium text-sm">
              <ExternalLink size={16} /> Open notebook
            </a>
          )}
          {lesson.contentText && (
            <div className="text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap">
              {lesson.contentText}
            </div>
          )}
          {!lesson.contentUrl && !lesson.contentText && (
            <p className="text-neutral-400 text-sm">No document content available.</p>
          )}
        </div>
      );

    case 'LINK':
      return (
        <div className="glass-card p-10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
            <LinkIcon size={32} className="text-cyan-500" />
          </div>
          <p className="text-neutral-500 text-sm">External resource</p>
          <a href={lesson.contentUrl} target="_blank" rel="noreferrer" className="btn-primary !bg-gradient-to-r !from-cyan-500 !to-blue-600">
            <ExternalLink size={16} /> Open link
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
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Lesson content</span>
          </div>
          <div className="text-neutral-700 text-sm leading-relaxed whitespace-pre-wrap">
            {lesson.contentText || 'No content available.'}
          </div>
        </div>
      );
  }
}
