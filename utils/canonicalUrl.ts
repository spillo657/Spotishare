/**
 * Helper to determine the canonical production URL for SpotiShare.
 * Prevents sharing temporary Vercel preview deployment URLs or hash links.
 */
export function getCanonicalAppUrl(): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // In local development, always use the current local origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin;
    }
  }

  // If a custom app URL is configured via environment variables, prioritize it
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  // Vercel production alias environment variable
  if (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}`;
  }

  // Primary production domain fallback
  if (typeof window !== 'undefined' && window.location.origin.includes('vercel.app')) {
    return 'https://spotishare-spillo657s-projects.vercel.app';
  }

  return typeof window !== 'undefined' ? window.location.origin : 'https://spotishare-spillo657s-projects.vercel.app';
}
