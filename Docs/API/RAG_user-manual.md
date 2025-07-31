# Local RAG User Manual

## Table of Contents
1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation Guide](#installation-guide)
4. [Using Local RAG](#using-local-rag)
   - [Document Management](#document-management)
   - [Vector Store Operations](#vector-store-operations)
   - [RAG Query System](#rag-query-system)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Configuration](#advanced-configuration)

## Introduction

Local RAG (Retrieval-Augmented Generation) is a powerful system that combines the capabilities of large language models with your own documents. It enables semantic search and question answering based on your personal document collection, all while maintaining data privacy by processing everything locally.

The system consists of three main components:
1. **MCard Service** - Document storage backend with content-addressable storage
2. **Vector Store** - Document embedding storage for semantic retrieval
3. **RAG API** - Endpoints for document management, indexing, and querying

## System Requirements

### Hardware Requirements
- **CPU**: 4+ cores recommended
- **RAM**: Minimum 8GB, 16GB+ recommended
- **Storage**: 10GB+ available space

### Software Requirements
- **Docker**: version 20.10.0 or higher
- **Docker Compose**: version 2.0.0 or higher
- **Ollama**: (optional if using local LLM) version 0.1.17 or higher

## Installation Guide

### Quick Start with Docker

1. **Pull the Local RAG image**:
   ```bash
   docker pull henry768/local-rag:main
   ```

2. **Start the MCard service** (if not already running):
   ```bash
   docker run -d -p 49384:49384 --name mcard-service henry768/mcard-service:latest
   ```

3. **Run the Local RAG container**:
   ```bash
   docker run -d -p 28302:28302 \
     -e MCARD_BASE_URL=http://host.docker.internal:49384/v1 \
     -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
     -e HOME=/app \
     --name local-rag \
     henry768/local-rag:main
   ```

### Using Docker Compose

For a complete setup including Ollama LLM, use Docker Compose:

1. **Create a docker-compose.yml file**:
   ```yaml
   version: '3.8'
   
   services:
     local-rag:
       image: henry768/local-rag:main
       ports:
         - "28302:28302"
       environment:
         - MCARD_BASE_URL=http://host.docker.internal:49384/v1
         - OLLAMA_BASE_URL=http://ollama:11434
         - HOME=/app
       volumes:
         - ./data/vector_store:/app/data/vector_store
         - ./data/logs:/app/data/logs
       depends_on:
         - ollama
   
     ollama:
       image: ollama/ollama:latest
       ports:
         - "11434:11434"
       volumes:
         - ./ollama:/root/.ollama
   
     ollama-init:
       image: curlimages/curl:latest
       depends_on:
         - ollama
       restart: "no"
       entrypoint: >
         sh -c "sleep 10 &&
                curl -X POST http://ollama:11434/api/pull -d '{\"name\":\"llama3\"}' &&
                curl -X POST http://ollama:11434/api/pull -d '{\"name\":\"nomic-embed-text\"}'"
   ```

2. **Start the services**:
   ```bash
   docker-compose up -d
   ```

3. **Access the Local RAG API**:
   Open your browser to `http://localhost:28302/api/v1/status` to verify the service is running.

## Using Local RAG

### Document Management

#### Uploading Documents to MCard

Before you can query documents, they must be uploaded to the MCard service:

```bash
curl -X POST -F "file=@/path/to/your/document.pdf" http://localhost:28302/api/v1/upload
```

Response:
```json
{
  "hash": "d4de949007b4aaa7885ca54ac17338d007a6b8e902d786bb780266ad7a172fb7",
  "content_type": "application/pdf",
  "message": "Document uploaded successfully"
}
```

The returned hash is the unique identifier for your document. Save this for future reference.

#### Listing Documents

To view all documents in the MCard service:

```bash
curl http://localhost:28302/api/v1/documents
```

Response:
```json
{
  "documents": [
    {
      "hash": "d4de949007b4aaa7885ca54ac17338d007a6b8e902d786bb780266ad7a172fb7",
      "content_type": "application/pdf",
      "g_time": "sha256|2025-07-28T17:13:09.805427|UTC",
      "indexed": null
    },
    ...
  ],
  "total": 14,
  "page": 1,
  "page_size": 10,
  "has_next": true
}
```

### Vector Store Operations

#### Indexing Documents

After uploading documents to MCard, you need to index them into the vector store for semantic retrieval:

**Index a single document**:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"hash": "d4de949007b4aaa7885ca54ac17338d007a6b8e902d786bb780266ad7a172fb7"}' \
  http://localhost:28302/api/v1/index
```

Response:
```json
{
  "hash": "d4de949007b4aaa7885ca54ac17338d007a6b8e902d786bb780266ad7a172fb7",
  "chunks_created": 12,
  "embeddings_created": 12,
  "message": "Document indexed successfully"
}
```

**Index all documents**:
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"chunk_size": 500}' \
  http://localhost:28302/api/v1/index-all
```

Response:
```json
{
  "total_documents": 14,
  "processed_documents": 14,
  "skipped_documents": 0,
  "created_chunks": 86,
  "processing_time_ms": 8422.34,
  "content_type_stats": {
    "application/pdf": 2,
    "text/markdown": 8,
    "text/plain": 4
  },
  "message": "Successfully indexed 14 documents with 86 chunks"
}
```

#### Checking Vector Store Stats

To view statistics about indexed documents:

```bash
curl http://localhost:28302/api/v1/vector-stats
```

Response:
```json
{
  "total_chunks": 86,
  "unique_documents": 14,
  "collection_name": "mcard_documents",
  "supported_content_types": [
    "application/json",
    "text/plain",
    "text/markdown",
    "application/pdf",
    ...
  ]
}
```

### RAG Query System

#### Querying Documents

To ask questions based on your documents:

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"query": "What are the MCard API rules?", "max_sources": 3}' \
  http://localhost:28302/api/v1/query
```

Response:
```json
{
  "query": "What are the MCard API rules?",
  "answer": "Based on the provided source documents, the MCard API rules...",
  "citations": [
    {
      "hash": "d4de949007b4aaa7885ca54ac17338d007a6b8e902d786bb780266ad7a172fb7",
      "g_time": "sha256|2025-07-28T17:13:09.805427|UTC",
      "section": "chunk_1",
      "content": "# MCard API Usage Rules for Local RAG Project...",
      "relevance_score": 0.2661158499731562
    },
    ...
  ],
  "total_sources": 3,
  "response_time_ms": 4831.68
}
```

The `answer` field contains the AI-generated response based on your documents, and `citations` lists the source documents used for the answer.

## API Reference

### Health and Status Endpoints

- `GET /api/v1/health` - Check service health
- `GET /api/v1/status` - View service status and configuration

### Document Management Endpoints

- `POST /api/v1/upload` - Upload a document to MCard
- `GET /api/v1/documents` - List documents in MCard

### Vector Store Endpoints

- `POST /api/v1/index` - Index a single document
- `POST /api/v1/index-all` - Index all unindexed documents
- `GET /api/v1/vector-stats` - View vector store statistics
- `POST /api/v1/clear` - Clear the vector store (careful!)

### RAG Query Endpoint

- `POST /api/v1/query` - Query indexed documents

## Troubleshooting

### Common Issues

#### Connection Error to MCard Service

Error: `{"status": "unhealthy", "mcard_healthy": false}`

Solution:
1. Verify MCard service is running: `docker ps | grep mcard`
2. Check MCard URL environment variable is correct
3. Ensure network connectivity between containers

#### Vector Store Not Available

Error: `"Vector store not available. Please ensure documents are indexed."`

Solution:
1. Check if documents are uploaded to MCard: `curl http://localhost:28302/api/v1/documents`
2. Index documents using `/api/v1/index-all` endpoint
3. Verify vector store stats: `curl http://localhost:28302/api/v1/vector-stats`

#### Ollama Connection Issues

Error: `"Failed to generate embeddings"`

Solution:
1. Verify Ollama is running: `docker ps | grep ollama`
2. Check Ollama URL environment variable is correct
3. Ensure the required models are pulled: `curl http://localhost:11434/api/tags`

### Container Logs

To view logs from the container:

```bash
docker logs local-rag
```

## Advanced Configuration

### Environment Variables

The following environment variables can be configured:

| Variable | Default | Description |
|----------|---------|-------------|
| `MCARD_BASE_URL` | `http://localhost:49384/v1` | URL for MCard service |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL for Ollama LLM service |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `API_PORT` | `28302` | Port for the API service |
| `HOME` | `/app` | Home directory (should be `/app` for proper permissions) |

### Persistent Storage

To maintain vector store data between container restarts, mount a volume:

```bash
docker run -d -p 28302:28302 \
  -e MCARD_BASE_URL=http://host.docker.internal:49384/v1 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -e HOME=/app \
  -v $(pwd)/data/vector_store:/app/data/vector_store \
  --name local-rag \
  henry768/local-rag:main
```

This will preserve your document embeddings between restarts.
