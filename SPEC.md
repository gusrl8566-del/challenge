# REST API Server Specification

## Project Overview
- **Project name**: REST API Server
- **Type**: Node.js REST API
- **Core functionality**: A RESTful API server with CRUD operations for managing items
- **Target users**: Developers building frontend applications

## Technology Stack
- Node.js
- Express.js (web framework)
- In-memory data store

## API Endpoints

### Items Resource
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/items | Get all items |
| GET | /api/items/:id | Get item by ID |
| POST | /api/items | Create new item |
| PUT | /api/items/:id | Update item by ID |
| DELETE | /api/items/:id | Delete item by ID |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check endpoint |

## Data Model

### Item
```json
{
  "id": "string (UUID)",
  "name": "string",
  "description": "string",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## Request/Response Format

### POST /api/items
Request body:
```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

Response (201):
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

### PUT /api/items/:id
Request body:
```json
{
  "name": "string (optional)",
  "description": "string (optional)"
}
```

Response (200):
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## Configuration
- Port: 3000 (default), configurable via PORT environment variable

## Acceptance Criteria
1. Server starts without errors
2. All CRUD endpoints work correctly
3. Proper HTTP status codes returned
4. UUID generation for item IDs
5. Timestamps properly recorded
