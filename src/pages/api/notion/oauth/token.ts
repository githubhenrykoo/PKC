import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { code, redirect_uri } = body;

    if (!code) {
      return new Response(JSON.stringify({ error: 'Missing authorization code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get Notion credentials from environment
    const clientId = import.meta.env.PUBLIC_NOTION_CLIENT_ID;
    const clientSecret = import.meta.env.PUBLIC_NOTION_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: 'Notion credentials not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Exchanging Notion OAuth code for token...');

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Notion token exchange failed:', errorText);
      return new Response(JSON.stringify({ 
        error: `Token exchange failed: ${tokenResponse.status}`,
        details: errorText 
      }), {
        status: tokenResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Notion token exchange successful:', { 
      hasAccessToken: !!tokenData.access_token,
      workspaceName: tokenData.workspace_name,
      workspaceId: tokenData.workspace_id
    });

    // Return the token data to the client
    return new Response(JSON.stringify({
      success: true,
      data: tokenData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notion OAuth token exchange error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
