export function extractYoutubeId(url) {
  if (!url) return null;
  if (url.includes('youtube.com/watch?v=')) {
    try { return new URL(url).searchParams.get('v'); } catch { return null; }
  }
  if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1]?.split('?')[0] ?? null;
  }
  if (url.includes('youtube.com/embed/')) {
    return url.split('/embed/')[1]?.split('?')[0] ?? null;
  }
  return null;
}
