import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  try {
    const accessToken = url.searchParams.get('accessToken');

    if (!accessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing accessToken parameter' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Fetching Notion databases...');

    // Search for databases that the integration has access to
    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        }
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Failed to search databases:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to search databases: ${searchResponse.status}`,
        details: errorText
      }), {
        status: searchResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const searchData = await searchResponse.json();
    const databases = searchData.results || [];

    console.log(`Found ${databases.length} databases`);

    // Process each database to get basic info
    const documents = databases.map((db: any) => ({
      id: db.id,
      title: extractDatabaseTitle(db),
      type: 'database',
      lastEdited: db.last_edited_time,
      url: db.url
    }));

    return new Response(JSON.stringify({
      success: true,
      documents: documents
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notion database API error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Helper function to extract database title
function extractDatabaseTitle(database: any): string {
  if (database.title && Array.isArray(database.title)) {
    return database.title.map((t: any) => t.plain_text).join('') || 'Untitled Database';
  }
  return database.id;
}
