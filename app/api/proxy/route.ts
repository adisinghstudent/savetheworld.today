import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    // Validate URL
    new URL(url);

    // Fetch the target URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';

    // Only proxy HTML content
    if (!contentType.includes('text/html')) {
      return NextResponse.json(
        { error: 'Only HTML content can be proxied' },
        { status: 400 }
      );
    }

    let html = await response.text();

    // Basic URL rewriting - convert relative URLs to absolute
    const baseUrl = new URL(url);
    const baseHref = `${baseUrl.protocol}//${baseUrl.host}`;

    // Add base tag to handle relative URLs
    const baseTag = `<base href="${baseHref}">`;
    html = html.replace(/<head>/i, `<head>${baseTag}`);

    // Create response with modified HTML
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Remove frame-busting headers
        'X-Frame-Options': 'ALLOWALL',
        // Allow embedding
        'Content-Security-Policy': '',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to proxy URL' },
      { status: 500 }
    );
  }
}
