import { NextRequest, NextResponse } from 'next/server';

function getBackendBaseUrl(): string {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL.replace(/\/+$/, '');
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:4000';
}

async function proxyToBackend(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  const path = Array.isArray(slug) ? slug.join('/') : (slug || '');
  const backendBase = getBackendBaseUrl();
  const search = request.nextUrl.search;
  const targetUrl = `${backendBase}/momo/${path}${search}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.set(key, value);
    }
  });

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    const responseBody = await response.text();
    const responseHeaders = new Headers();
    const contentType = response.headers.get('content-type') || 'application/json';
    responseHeaders.set('content-type', contentType);

    return new NextResponse(responseBody, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error(`[MoMo Proxy] Error forwarding to ${targetUrl}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: `Failed to forward MoMo request to backend: ${error?.message}`,
      },
      { status: 502 }
    );
  }
}

export const GET = proxyToBackend;
export const POST = proxyToBackend;
export const PUT = proxyToBackend;
export const DELETE = proxyToBackend;
