import type { APIRoute } from 'astro';

// Helper to render HTML skeletons expected by client initializers
function renderTemplate(
  rendererType: string,
  hash: string,
  contentType?: string
): string {
  switch (rendererType) {
    case 'markdown':
      return `
        <div class="markdown-renderer" data-hash="${hash}">
          <article class="prose dark:prose-invert max-w-none" id="markdown-content-${hash}">
            <!-- Content will be rendered by client-side script -->
          </article>
        </div>
      `;
    case 'html':
      return `
        <div class="html-renderer" data-hash="${hash}">
          <article class="prose dark:prose-invert max-w-none" id="html-content-${hash}">
            <!-- Content will be rendered by client-side script -->
          </article>
        </div>
      `;
    case 'json':
      return `
        <div class="json-renderer" data-hash="${hash}">
          <div class="w-full h-full">
            <pre id="json-content-${hash}" class="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border overflow-auto h-full">
              <!-- Content will be rendered by client-side script -->
            </pre>
          </div>
        </div>
      `;
    case 'text':
      return `
        <div class="text-renderer" data-hash="${hash}">
          <article class="prose dark:prose-invert max-w-none" id="text-content-${hash}">
            <!-- Content will be rendered by client-side script -->
          </article>
        </div>
      `;
    case 'image': {
      // Client code builds the image URL using runtime env; server doesn't need to embed it here
      return `
        <div class="image-renderer" data-hash="${hash}">
          <div class="w-full h-full flex items-center justify-center">
            <!-- Image element will be set by client or uses direct API URL composition -->
            <img 
              id="image-content-${hash}"
              src="" 
              alt="MCard Image" 
              class="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              loading="lazy"
              onerror="this.closest('.image-renderer')?.classList.add('image-error')"
            />
          </div>
        </div>
      `;
    }
    case 'pdf': {
      // Use a placeholder iframe; client can set src using runtime env if needed
      return `
        <div class="pdf-renderer h-full w-full flex flex-col" data-hash="${hash}">
          <div class="flex-1 min-h-0 mb-2">
            <iframe 
              id="pdf-content-${hash}"
              src="" 
              class="w-full h-full border-0 rounded-lg"
              title="PDF Preview"
              style="min-height: 600px;"
            ></iframe>
          </div>
          <div class="flex justify-center gap-2 py-2 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex-shrink-0">
            <!-- Action buttons will work once src is set on client side -->
          </div>
        </div>
      `;
    }
    default: {
      const type = contentType || 'application/octet-stream';
      return `
        <div class="unknown-renderer" data-hash="${hash}">
          <div class="text-center">
            <div class="text-6xl mb-4">❓</div>
            <h3 class="text-lg font-semibold mb-2">Unknown Content Type</h3>
            <p class="text-sm opacity-70 mb-4">Type: ${type}</p>
            <p class="text-sm opacity-70 mb-4">Hash: ${hash}</p>
          </div>
        </div>
      `;
    }
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { rendererType, hash, metadata, contentType } = body || {};

    if (!rendererType || !hash) {
      return new Response(JSON.stringify({ error: 'rendererType and hash are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const html = renderTemplate(String(rendererType), String(hash), String(contentType || metadata?.content_type || ''));

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: 'Invalid request', details: err?.message || String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
};
