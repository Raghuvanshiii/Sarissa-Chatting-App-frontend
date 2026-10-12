/**
 * Resolves a media or avatar URL to an absolute URL pointing to the backend
 * if it is stored as a relative path (e.g. /uploads/filename.png).
 */
export function getMediaUrl(url?: string): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}
