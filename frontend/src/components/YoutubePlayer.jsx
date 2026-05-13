import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

/**
 * YoutubePlayer — wraps the YouTube IFrame Player API.
 *
 * Props:
 *   videoId        (string)   YouTube video ID
 *   startSeconds   (number)   Resume position in seconds
 *   onReady        (fn)       Called with player instance when ready
 *   onEnded        (fn)       Called when video finishes
 *   onTimeUpdate   (fn)       Called every second with current time (seconds)
 *
 * Ref exposes: { getCurrentTime, getDuration, seekTo }
 */
const YoutubePlayer = forwardRef(function YoutubePlayer(
  { videoId, startSeconds = 0, onReady, onEnded, onTimeUpdate },
  ref
) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const tickRef = useRef(null);
  const readyRef = useRef(false);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getCurrentTime: () => playerRef.current?.getCurrentTime?.() ?? 0,
    getDuration: () => playerRef.current?.getDuration?.() ?? 0,
    seekTo: (secs) => playerRef.current?.seekTo?.(secs, true),
  }));

  useEffect(() => {
    // Load YouTube IFrame API script if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          start: Math.floor(startSeconds),
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            readyRef.current = true;
            onReady?.(e.target);
          },
          onStateChange: (e) => {
            const YT = window.YT.PlayerState;

            // Video playing → start tick
            if (e.data === YT.PLAYING) {
              if (tickRef.current) clearInterval(tickRef.current);
              tickRef.current = setInterval(() => {
                const t = Math.floor(playerRef.current?.getCurrentTime?.() ?? 0);
                onTimeUpdate?.(t);
              }, 1000);
            }

            // Video paused / buffering / cued → stop tick
            if (e.data === YT.PAUSED || e.data === YT.BUFFERING || e.data === YT.CUED) {
              if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
              }
            }

            // Video ended
            if (e.data === YT.ENDED) {
              if (tickRef.current) {
                clearInterval(tickRef.current);
                tickRef.current = null;
              }
              onEnded?.();
            }
          },
        },
      });
    };

    // YT API might already be loaded
    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Queue until API ready
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      try { playerRef.current?.destroy?.(); } catch {
        // YouTube player teardown can fail if the iframe was already removed.
      }
      playerRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="aspect-video rounded-xl overflow-hidden shadow-lg border border-neutral-200">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});

export default YoutubePlayer;
