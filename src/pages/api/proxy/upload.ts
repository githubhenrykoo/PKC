import type { APIRoute } from 'astro';

/**
 * Server-side proxy for file uploads to bypass CORS restrictions
 */
export const post: APIRoute = async ({ request }) => {
  try {
    // Get the request body as FormData
    const formData = await request.formData();
    
    console.log('Proxy received upload request');
    
    // Check if we have a file
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: true, message: 'No file found in request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Log file details
    console.log(`Proxying file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    
    // Forward the request to the MCard API
    const apiUrl = 'https://devmcard.pkc.pub/v1/files';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: formData, // Reuse the original FormData
    });
    
    // Get the response
    const responseData = await response.json();
    
    // Log the result
    console.log(`Upload proxy response: ${response.status} ${response.statusText}`);
    
    // Return the response with appropriate headers
    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Upload proxy error:', error);
    
    return new Response(JSON.stringify({
      error: true, 
      message: error instanceof Error ? error.message : 'Unknown upload error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
