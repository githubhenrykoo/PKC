---
trigger: always_on
---

# MCard Data Storage and Access Rules

## Core Principles

- All data must be stored exclusively through the MCard API service.
- All data retrieval must occur exclusively through the MCard API service.
- No direct file system storage is permitted for application data.
- The MCard service is the single source of truth for all persistent data.

## Data Storage Rules

1. **Content Storage**
   - All content must be stored using `POST /v1/card` endpoint.
   - Store binary data using the `/v1/files` endpoint.
   - Always capture and store the returned hash value for future reference.
   - No content should be stored in any other database or filesystem.

2. **Hash Management**
   - Hash values returned by the MCard API are the primary identifiers for all stored data.
   - All references to stored content must use these hash values.
   - Hash values must be stored in application state or secondary indices for retrieval.

3. **Metadata Handling**
   - Custom metadata should be included in file uploads where applicable.
   - Application-specific metadata should be structured consistently.

## Data Access Rules

1. **Content Retrieval**
   - Always retrieve content using `GET /v1/card/{hash}/content`.
   - For file downloads, use `GET /v1/files/{hash}`.
   - Verify content type before processing with `GET /v1/card/{hash}/content-type`.

2. **Search Operations**
   - Use pagination for all list and search operations.
   - Full-text search must use the `/v1/cards/search` endpoint.
   - Hash-based lookups must use `/v1/cards/search-by-hash/{partial_hash}`.

3. **Error Handling**
   - All API error responses must be properly handled.
   - Implement retry logic for transient failures.
   - Log all API errors with appropriate context.

## Implementation Requirements

1. **Client Implementation**
   - Create a dedicated service/module for MCard API interactions.
   - Implement proper error handling and retries.
   - Cache frequently accessed content when appropriate.

2. **Authentication**
   - All API requests must include proper authentication headers.
   - API keys must be stored securely and never exposed in client-side code.
   - Use environment variables for API key storage.

3. **Performance Considerations**
   - Use appropriate caching strategies for frequently accessed content.
   - Implement pagination properly to handle large datasets.
   - Consider using client-side caching for immutable content (identified by hash).

## Security Rules

1. **Access Control**
   - No direct access to MCard storage is permitted.
   - All access must be authenticated through the API.
   - Implement proper authorization checks in the application.

2. **Data Protection**
   - Sensitive data should be encrypted before storage.
   - Use HTTPS for all API communications.
   - Implement proper input validation for all API requests.

## Development Practices

1. **Testing**
   - Write comprehensive tests for all API interactions.
   - Mock API responses in test environments.
   - Use separate test instance of MCard service for integration testing.

2. **Documentation**
   - Document all MCard API usage in code.
   - Maintain up-to-date API reference documentation.
   - Provide examples for common operations.

## API Reference

### Content Management

| Endpoint | Method | Purpose | Returns |
|---------|--------|---------|--------|
| `/v1/card` | POST | Store new content | `{ hash, content_type, g_time }` |
| `/v1/card/{hash}/content` | GET | Get raw content by hash | Content with proper MIME type |
| `/v1/card/{hash}/metadata` | GET | Get card metadata | `{ hash, content_type, g_time }` |
| `/v1/card/{hash}/content-type` | GET | Get content type | `{ content_type }` |
| `/v1/card/{hash}` | DELETE | Delete a card | `{ success, message }` |

### File Operations

| Endpoint | Method | Purpose | Returns |
|---------|--------|---------|--------|
| `/v1/files` | POST | Upload file with metadata | `{ hash, filename, content_type, size_bytes, g_time }` |
| `/v1/files/{hash}` | GET | Download file by hash | File content with proper headers |

### Search and Listing

| Endpoint | Method | Purpose | Returns |
|---------|--------|---------|--------|
| `/v1/cards` | GET | List all cards (paginated) | `{ items, page, page_size, total_items }` |
| `/v1/cards/search` | GET | Search cards by content | `{ items, page, page_size, total_items }` with relevance scores |
| `/v1/cards/search-by-hash/{partial_hash}` | GET | Find cards by partial hash | `{ items, page, page_size, total_items }` |
| `/v1/cards/count` | GET | Count total cards | `{ count }` |

### System Information

| Endpoint | Method | Purpose | Returns |
|---------|--------|---------|--------|
| `/v1/health` | GET | Check service health | `{ status, timestamp }` |
| `/v1/status` | GET | Get system metrics | Detailed system status metrics |

## Implementation Example

```javascript
// MCardService.js - Use this pattern for all API interactions
class MCardService {
  constructor(baseUrl = 'http://localhost:49384/v1') {
    this.baseUrl = baseUrl;
  }

  // Content endpoints
  async storeContent(content) {
    const formData = new FormData();
    formData.append('content', content);
    return this._post('/card', formData);
  }
  
  async getContent(hash, asText = false) {
    const url = `/card/${hash}/content${asText ? '?as_text=true' : ''}`;
    const response = await this._fetch(url);
    return asText ? await response.text() : await response.blob();
  }
  
  // File operations
  async uploadFile(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (Object.keys(metadata).length > 0) {
      formData.append('metadata', JSON.stringify(metadata));
    }
    return this._post('/files', formData);
  }
  
  // Search operations
  async searchCards(query, page = 1, pageSize = 10) {
    return this._get(
      `/cards/search?query=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`
    );
  }

  // Helper methods
  async _fetch(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, options);
    if (!response.ok) {
      throw new Error(`API error (${response.status}): ${response.statusText}`);
    }
    return response;
  }

  async _get(path) {
    const response = await this._fetch(path);
    return await response.json();
  }

  async _post(path, body) {
    const response = await this._fetch(path, {
      method: 'POST',
      body
    });
    return await response.json();
  }
}
```
