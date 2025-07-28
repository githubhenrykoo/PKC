# MCard-Service API User Manual

## Introduction

The MCard-Service API provides a powerful content-addressable storage system based on the MCard library. This manual will guide you through deploying the service, interacting with its endpoints, and interpreting the responses.

## Table of Contents

1. [Deployment](#deployment)
    - [Using Docker Compose](#using-docker-compose)
    - [Configuration Options](#configuration-options)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
    - [Content Management](#content-management)
    - [Search and Listing](#search-and-listing)
    - [Timestamp Operations](#timestamp-operations)
    - [System Information](#system-information)
4. [Working with Files](#working-with-files)
5. [Understanding Responses](#understanding-responses)
    - [Hash Values](#hash-values)
    - [G-Time Format](#g-time-format)
    - [Content Types](#content-types)
6. [Error Handling](#error-handling)
7. [Examples](#examples)
    - [Basic Operations](#basic-operations)
    - [Search Operations](#search-operations)
    - [Administrative Tasks](#administrative-tasks)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

## Deployment

### Using Docker Compose

The easiest way to deploy MCard-Service is using Docker Compose. Simply create a `docker-compose.yml` file with the following content:

```yaml
version: '3.8'

services:
  mcard-service:
    container_name: mcard-service
    image: henry768/mcard-service:latest
    ports:
      - "49384:49384"  # Map to any port you prefer, e.g., "49384:49384"
    volumes:
      - mcard-data:/app/data
    environment:
      - LOG_LEVEL=INFO
      # Add any other environment variables here
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:49384/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

# Named volumes for data persistence
volumes:
  mcard-data:
    # This will be automatically created by Docker Compose
```

Then run:

```bash
docker-compose up -d
```

The service will be available at `http://localhost:49384/v1/` (or whatever port you configured).

### Configuration Options

The following environment variables can be set in your docker-compose.yml:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port to expose the API | 49384 |
| LOG_LEVEL | Logging level (DEBUG, INFO, WARNING, ERROR) | INFO |
| MCard-Password | Admin password for administrative operations | None |
| CORS_ALLOWED_ORIGINS | Comma-separated list of origins allowed to access the API | * |
| CORS_ALLOW_CREDENTIALS | Whether to allow credentials in CORS requests | false |

## Authentication

API requests require an API key provided in the header:

```
Authorization: Bearer YOUR_API_KEY
```

For development environments, authentication might be disabled.

## API Endpoints

All endpoints are prefixed with `/v1`.

### Content Management

#### Create Card

**Endpoint:** `POST /v1/card`

Upload content to create a new card.

**Request Format:**
- Content-Type: `multipart/form-data`
- Body:
  - `content`: File or text content to store

**Response Example:**
```json
{
  "hash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "content_type": "application/pdf",
  "g_time": "sha256|2025-07-25T11:20:54.123456|UTC"
}
```

**Example Command:**
```bash
curl -X POST -F "content=@document.pdf" http://localhost:49384/v1/card
```

#### Get Card Content

**Endpoint:** `GET /v1/card/{hash}/content`

Retrieve the raw content of a card.

**Parameters:**
- `hash`: The hash value of the card
- `as_text` (query, optional): Set to "true" to return as text instead of binary

**Response:** Raw content with appropriate Content-Type

**Example Command:**
```bash
curl http://localhost:49384/v1/card/7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069/content
```

#### Get Card Metadata

**Endpoint:** `GET /v1/card/{hash}/metadata`

Retrieve metadata for a card.

**Parameters:**
- `hash`: The hash value of the card

**Response Example:**
```json
{
  "hash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "g_time": "sha256|2025-07-25T11:20:54.123456|UTC",
  "content_type": "application/pdf"
}
```

**Example Command:**
```bash
curl http://localhost:49384/v1/card/7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069/metadata
```

#### Get Card Content Type

**Endpoint:** `GET /v1/card/{hash}/content-type`

Retrieve just the content type of a card.

**Parameters:**
- `hash`: The hash value of the card

**Response Example:**
```json
{
  "content_type": "application/pdf"
}
```

**Example Command:**
```bash
curl http://localhost:49384/v1/card/7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069/content-type
```

#### Delete Card

**Endpoint:** `DELETE /v1/card/{hash}`

Delete a card by its hash.

**Parameters:**
- `hash`: The hash value of the card

**Response Example:**
```json
{
  "success": true,
  "message": "Card deleted"
}
```

**Example Command:**
```bash
curl -X DELETE http://localhost:49384/v1/card/7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
```

### Search and Listing

#### List Cards

**Endpoint:** `GET /v1/cards`

List cards with pagination.

**Parameters:**
- `page` (query, optional): Page number (default: 1)
- `page_size` (query, optional): Number of items per page (default: 10)

**Response Example:**
```json
{
  "items": [
    {
      "hash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "g_time": "sha256|2025-07-25T11:20:54.123456|UTC",
      "content_type": "application/pdf"
    },
    {
      "hash": "6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b",
      "g_time": "sha256|2025-07-25T11:21:54.123456|UTC",
      "content_type": "text/plain"
    }
  ],
  "page": 1,
  "page_size": 10,
  "total_items": 42,
  "total_pages": 5,
  "has_next": true,
  "has_previous": false
}
```

**Example Command:**
```bash
curl "http://localhost:49384/v1/cards?page=1&page_size=10"
```

#### Search by Content

**Endpoint:** `GET /v1/cards/search`

Search cards by content.

**Parameters:**
- `query` (query): Search string
- `page` (query, optional): Page number (default: 1)
- `page_size` (query, optional): Number of items per page (default: 10)

**Response Example:**
```json
{
  "items": [
    {
      "hash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "g_time": "sha256|2025-07-25T11:20:54.123456|UTC",
      "content_type": "application/pdf",
      "score": 0.95
    }
  ],
  "query": "search term",
  "page": 1,
  "page_size": 10,
  "total_items": 1,
  "total_pages": 1,
  "has_next": false,
  "has_previous": false
}
```

**Example Command:**
```bash
curl "http://localhost:49384/v1/cards/search?query=example&page=1&page_size=10"
```

#### Search by Hash

**Endpoint:** `GET /v1/cards/search-by-hash/{partial_hash}`

Search cards by partial hash.

**Parameters:**
- `partial_hash`: Partial hash value to search for
- `page` (query, optional): Page number (default: 1)
- `page_size` (query, optional): Number of items per page (default: 10)

**Response Example:** Similar to the list cards response.

**Example Command:**
```bash
curl "http://localhost:49384/v1/cards/search-by-hash/7f83b1?page=1&page_size=10"
```

#### Count Cards

**Endpoint:** `GET /v1/cards/count`

Returns the total count of cards.

**Response Example:**
```json
{
  "count": 42
}
```

**Example Command:**
```bash
curl http://localhost:49384/v1/cards/count
```

#### Clear Collection

**Endpoint:** `DELETE /v1/cards`

Clears all cards from the collection. This is a dangerous operation and should be protected.

**Parameters:**
- `confirmation` (query): Must be set to "CONFIRM_DELETE_ALL" to proceed

**Response Example:**
```json
{
  "success": true,
  "message": "Collection cleared. Deleted 42 cards."
}
```

**Example Command:**
```bash
curl -X DELETE "http://localhost:49384/v1/cards?confirmation=CONFIRM_DELETE_ALL"
```

### Timestamp Operations

#### Get Current G-Time

**Endpoint:** `GET /v1/g-time/now`

Returns the current G-Time stamp.

**Parameters:**
- `hash_function` (query, optional): Hash function to use (default: "sha256")

**Response Example:**
```json
{
  "g_time": "sha256|2025-07-25T11:20:54.123456|UTC"
}
```

**Example Command:**
```bash
curl http://localhost:49384/v1/g-time/now
```

#### Parse G-Time

**Endpoint:** `GET /v1/g-time/parse`

Parses a G-Time string into its components.

**Parameters:**
- `g_time` (query): G-Time string to parse

**Response Example:**
```json
{
  "timestamp": "2025-07-25T11:20:54.123456",
  "region_code": "UTC",
  "hash_function": "sha256"
}
```

**Example Command:**
```bash
curl "http://localhost:49384/v1/g-time/parse?g_time=sha256|2025-07-25T11:20:54.123456|UTC"
```

### System Information

#### Health Check

**Endpoint:** `GET /v1/health`

Basic health check to verify the service is running.

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-25T11:20:54.123456Z"
}
```

**Example Command:**
```bash
curl http://localhost:49384/v1/health
```

#### System Status

**Endpoint:** `GET /v1/status`

Provides detailed system status information.

**Response Example:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "database": {
    "status": "connected",
    "total_cards": 42,
    "database_size_bytes": 1048576
  },
  "system": {
    "cpu_usage_percent": 12.5,
    "memory_usage_percent": 24.3,
    "disk_free_bytes": 10737418240
  }
}
```

**Example Command:**
```bash
curl http://localhost:49384/v1/status
```

#### Configuration

**Endpoint:** `GET /v1/config`

Returns the current service configuration (non-sensitive parts).

**Response Example:**
```json
{
  "database_path": "data/mcard.db",
  "max_content_size_bytes": 10485760,
  "default_page_size": 10,
  "supported_hash_algorithms": ["sha256", "sha512"]
}
```

**Example Command:**
```bash
curl http://localhost:49384/v1/config
```

## Working with Files

For convenience, the API provides specialized endpoints for file operations:

#### Upload File

**Endpoint:** `POST /v1/files`

Upload a file with automatic metadata extraction.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: File to upload
  - `metadata` (optional): JSON object with custom metadata

**Response Example:**
```json
{
  "hash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
  "filename": "document.pdf",
  "content_type": "application/pdf",
  "size_bytes": 1048576,
  "g_time": "sha256|2025-07-25T11:20:54.123456|UTC"
}
```

**Example Command:**
```bash
curl -X POST -F "file=@document.pdf" http://localhost:49384/v1/files
```

#### Download File

**Endpoint:** `GET /v1/files/{hash}`

Retrieves a file by its hash with proper headers for download.

**Parameters:**
- `hash`: The hash value of the file
- `filename` (query, optional): Suggested filename for the download

**Response:** Raw file content with appropriate Content-Type and Content-Disposition headers

**Example Command:**
```bash
curl -OJ "http://localhost:49384/v1/files/7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069?filename=document.pdf"
```

## Understanding Responses

### Hash Values

Hash values are the primary identifiers for cards in the MCard-Service. By default, SHA-256 is used, producing a 64-character hexadecimal string. 

These hash values are content-based, meaning:
- The same content will always produce the same hash
- Any change in content (even a single bit) will produce a completely different hash
- Hash values cannot be reversed to obtain the original content

When storing content, always save the returned hash value as it's the only way to retrieve that content later.

### G-Time Format

G-Time (Global Time) is a special timestamp format used by MCard-Service that includes:
1. A hash function identifier (e.g., "sha256")
2. A timestamp in ISO 8601 format (with microsecond precision)
3. A region code (e.g., "UTC")

These components are separated by pipe characters: `sha256|2025-07-25T11:20:54.123456|UTC`

G-Time provides a temporally-ordered reference to content that includes:
- When the content was stored
- Which hash function was used
- Which region the content was stored in

### Content Types

The MCard-Service automatically detects the content type of stored data based on content analysis. Common content types include:

- `text/plain`: Plain text files
- `text/markdown`: Markdown documents
- `application/json`: JSON data
- `application/xml`: XML data
- `application/pdf`: PDF documents
- `image/jpeg`, `image/png`: Image files
- `text/x-python`: Python source code
- And many others

The detected content type determines how the content is handled when retrieved.

## Error Handling

All error responses follow this format:

```json
{
  "error": true,
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error-specific details
  }
}
```

Common error codes:
- `NOT_FOUND`: Resource not found
- `INVALID_REQUEST`: Invalid request parameters
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `HASH_COLLISION`: Content with same hash already exists
- `INTERNAL_ERROR`: Server error

## Examples

### Basic Operations

#### Store a text file and retrieve it

```bash
# Store a text file
HASH=$(curl -X POST -F "content=@notes.txt" http://localhost:49384/v1/card | jq -r '.hash')

# Retrieve the content
curl -s http://localhost:49384/v1/card/$HASH/content > retrieved_notes.txt

# Get metadata
curl -s http://localhost:49384/v1/card/$HASH/metadata | jq
```

#### Store JSON data and retrieve it

```bash
# Create a JSON file
echo '{"name": "John Doe", "email": "john@example.com"}' > user.json

# Store the JSON file
HASH=$(curl -X POST -F "content=@user.json" http://localhost:49384/v1/card | jq -r '.hash')

# Retrieve the JSON content
curl -s http://localhost:49384/v1/card/$HASH/content | jq
```

### Search Operations

#### List all cards with pagination

```bash
# First page
curl -s "http://localhost:49384/v1/cards?page=1&page_size=5" | jq

# Second page
curl -s "http://localhost:49384/v1/cards?page=2&page_size=5" | jq
```

#### Search for content containing specific text

```bash
curl -s "http://localhost:49384/v1/cards/search?query=example" | jq
```

#### Find cards by partial hash

```bash
curl -s "http://localhost:49384/v1/cards/search-by-hash/7f83b1" | jq
```

### Administrative Tasks

#### Get system status

```bash
curl -s http://localhost:49384/v1/status | jq
```

#### Count total cards

```bash
curl -s http://localhost:49384/v1/cards/count | jq
```

## Best Practices

1. **Always Save Hash Values**: Store returned hash values as they are the only way to retrieve content.
2. **Use Pagination**: When listing or searching cards, always use pagination parameters to avoid large responses.
3. **Content Type Awareness**: Be aware that the content type is detected automatically and might affect how you handle the retrieved content.
4. **Error Handling**: Always handle error responses in your application.
5. **Backup Strategy**: Regularly back up the data volume if using Docker.

## Troubleshooting

### Common Issues

1. **Card Not Found**: Verify the hash value is correct. Hash values are case-sensitive.
2. **Permission Issues**: Ensure the Docker volume has proper permissions.
3. **API Key Rejected**: Verify the API key is provided correctly in the Authorization header.
4. **Container Won't Start**: Check logs with `docker logs mcard-service`.
5. **Database Access Issues**: Verify the volume is mounted correctly and has appropriate permissions.
6. **CORS Errors on File Uploads**: Binary files (JPG, MP3) may fail to upload due to CORS restrictions. Ensure proper CORS configuration in the server environment variables.

### Getting Help

For additional assistance:
- Check the API documentation in the Docs/API directory
- Look for error details in the server logs
- Refer to the MCard library documentation
