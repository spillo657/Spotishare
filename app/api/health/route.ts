import { NextResponse } from 'next/server';
import { getBuildStamp } from '@/utils/buildStamp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const stamp = getBuildStamp();

  // Log in functions as requested (safely without secrets)
  console.log('[API HEALTH CHECK]', JSON.stringify(stamp));

  return NextResponse.json({
    status: 'ok',
    stamp
  }, { status: 200 });
}
