import { NextRequest, NextResponse } from 'next/server';

import { responseNoStoreHeaders } from '@/lib/waitlist/httpNoStore';

import { knockOutWhiteMatFromBuffer } from './knockOutWhiteMat';

const ALLOWED_HOSTS = [
  'fimgs.net',
  'www.fimgs.net',
  'images.unsplash.com',
  'source.unsplash.com',
  'cdn.fragrantica.com',
];

/** Mat-processed responses are not cached (avoids long-lived cache entries). */

function isSupabasePublicStorageUrl(parsed: URL): boolean {
  if (!parsed.hostname.endsWith('.supabase.co')) return false;
  return parsed.pathname.includes('/storage/v1/object/public/');
}

function isR2PublicUrl(parsed: URL): boolean {
  const h = parsed.hostname.toLowerCase();
  if (h.endsWith('.r2.dev')) return true;
  const custom = (process.env.NEXT_PUBLIC_R2_IMAGE_HOSTNAME || '').toLowerCase().trim();
  return Boolean(custom && h === custom);
}

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (isSupabasePublicStorageUrl(parsed)) return true;
    if (isR2PublicUrl(parsed)) return true;
    return ALLOWED_HOSTS.some(
      (host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host)
    );
  } catch {
    return false;
  }
}

const FETCH_HEADERS = {
  Accept: 'image/*,image/webp,*/*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const mat = request.nextUrl.searchParams.get('mat') === '1';

  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json({ detail: 'Invalid or disallowed image URL' }, { status: 400 });
  }

  try {
    if (mat) {
      try {
        const res = await fetch(url, {
          headers: { ...FETCH_HEADERS, Referer: new URL(url).origin + '/' },
          signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`Upstream ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());
        const webp = await knockOutWhiteMatFromBuffer(buffer);

        return new NextResponse(new Uint8Array(webp), {
          status: 200,
          headers: {
            'Content-Type': 'image/webp',
            ...responseNoStoreHeaders,
          },
        });
      } catch (matErr) {
        console.error('Image proxy mat knockout failed:', matErr);
        // Fall through to passthrough
      }
    }

    const res = await fetch(url, {
      headers: { ...FETCH_HEADERS, Referer: new URL(url).origin + '/' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { detail: `Upstream returned ${res.status}` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const contentType = res.headers.get('Content-Type') || 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...responseNoStoreHeaders,
      },
    });
  } catch (err) {
    console.error('Image proxy fetch error:', err);
    return NextResponse.json({ detail: 'Failed to fetch image' }, { status: 502 });
  }
}
