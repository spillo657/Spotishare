import crypto from 'crypto';

export interface BuildStampInfo {
  commitSha: string;
  env: string;
  deploymentId: string;
  dbHostFingerprint: string;
  builtAt: string;
}

export function getDbHostFingerprint(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl) return 'no-db';
  try {
    const host = new URL(supabaseUrl).hostname;
    return crypto.createHash('sha256').update(host).digest('hex').substring(0, 8);
  } catch {
    return crypto.createHash('sha256').update(supabaseUrl).digest('hex').substring(0, 8);
  }
}

export function getBuildStamp(): BuildStampInfo {
  const commitSha =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    'local-dev';
  const env =
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development';
  const deploymentId =
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID ||
    'local';

  return {
    commitSha: commitSha.substring(0, 7),
    env,
    deploymentId,
    dbHostFingerprint: getDbHostFingerprint(),
    builtAt: new Date().toISOString()
  };
}
