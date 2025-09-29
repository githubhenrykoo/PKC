import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  try {
    const pageId = url.searchParams.get('pageId');
    const accessToken = url.searchParams.get('accessToken');

    if (!pageId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing pageId parameter' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!accessToken) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Missing accessToken parameter' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Fetching Notion page: ${pageId}`);

    // Get page information
    const pageResponse = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    if (!pageResponse.ok) {
      const errorText = await pageResponse.text();
      console.error('Failed to fetch page:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to fetch page: ${pageResponse.status}`,
        details: errorText
      }), {
        status: pageResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const page = await pageResponse.json();

    // Get page blocks (content)
    const blocksResponse = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });

    if (!blocksResponse.ok) {
      const errorText = await blocksResponse.text();
      console.error('Failed to fetch blocks:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to fetch page content: ${blocksResponse.status}`,
        details: errorText
      }), {
        status: blocksResponse.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const blocks = await blocksResponse.json();

    // Parse the blocks into structured data
    const document = parseNotionBlocks(page, blocks.results);

    console.log('Successfully fetched Notion page:', {
      pageId,
      title: document.page.properties?.title?.title?.[0]?.plain_text || 'Untitled',
      blockCount: blocks.results.length
    });

    return new Response(JSON.stringify({
      success: true,
      document: document
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notion getpage API error:', error);
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

// Helper function to parse Notion blocks into structured data
function parseNotionBlocks(page: any, blocks: any[]) {
  const tables: any[] = [];
  const descriptions: any[] = [];
  const subheadings: any[] = [];
  const codeBlocks: any[] = [];

  blocks.forEach((block, index) => {
    switch (block.type) {
      case 'paragraph':
        if (block.paragraph?.rich_text?.length > 0) {
          const content = block.paragraph.rich_text
            .map((text: any) => text.plain_text)
            .join('');
          if (content.trim()) {
            descriptions.push({
              id: block.id,
              content: content,
              type: 'paragraph'
            });
          }
        }
        break;

      case 'bulleted_list_item':
        if (block.bulleted_list_item?.rich_text?.length > 0) {
          const content = block.bulleted_list_item.rich_text
            .map((text: any) => text.plain_text)
            .join('');
          if (content.trim()) {
            descriptions.push({
              id: block.id,
              content: content,
              type: 'bullet_point'
            });
          }
        }
        break;

      case 'numbered_list_item':
        if (block.numbered_list_item?.rich_text?.length > 0) {
          const content = block.numbered_list_item.rich_text
            .map((text: any) => text.plain_text)
            .join('');
          if (content.trim()) {
            descriptions.push({
              id: block.id,
              content: content,
              type: 'numbered_list'
            });
          }
        }
        break;

      case 'heading_1':
        if (block.heading_1?.rich_text?.length > 0) {
          const content = block.heading_1.rich_text
            .map((text: any) => text.plain_text)
            .join('');
          subheadings.push({
            id: block.id,
            content: content,
            level: 1
          });
        }
        break;

      case 'heading_2':
        if (block.heading_2?.rich_text?.length > 0) {
          const content = block.heading_2.rich_text
            .map((text: any) => text.plain_text)
            .join('');
          subheadings.push({
            id: block.id,
            content: content,
            level: 2
          });
        }
        break;

      case 'heading_3':
        if (block.heading_3?.rich_text?.length > 0) {
          const content = block.heading_3.rich_text
            .map((text: any) => text.plain_text)
            .join('');
          subheadings.push({
            id: block.id,
            content: content,
            level: 3
          });
        }
        break;

      case 'code':
        if (block.code?.rich_text?.length > 0) {
          const content = block.code.rich_text
            .map((text: any) => text.plain_text)
            .join('');
          codeBlocks.push({
            id: block.id,
            content: content,
            language: block.code.language || 'plain'
          });
        }
        break;

      case 'table':
        // For tables, we need to fetch the table rows separately
        // This is a simplified version - you might need to handle table rows differently
        tables.push({
          id: block.id,
          rows: [
            {
              cells: ['Table content needs separate API call to fetch rows']
            }
          ]
        });
        break;

      default:
        // Handle other block types as needed
        break;
    }
  });

  return {
    page: page,
    tables: tables,
    descriptions: descriptions,
    subheadings: subheadings,
    codeBlocks: codeBlocks
  };
}
