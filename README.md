# Enterprise File Storage Platform

A multi-tenant enterprise file storage service with a Google Drive–inspired web client, built with Django REST Framework and React.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12+, Django 5, Django REST Framework |
| Auth | JWT (simplejwt), API Keys (djangorestframework-api-key) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Storage | Local filesystem (dev) / S3-compatible (prod) |
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| State | Zustand (auth), TanStack Query (server state) |
| UI | Headless UI, Heroicons, Recharts |

## Project Structure

```
FileServer/
├── backend/
│   ├── config/              # Django settings, URLs, WSGI/ASGI
│   ├── apps/
│   │   ├── accounts/        # Custom User model, JWT auth
│   │   ├── tenants/         # Multi-tenant management, admin endpoints
│   │   ├── files/           # File upload, download, management
│   │   ├── folders/         # Folder tree management
│   │   └── api_keys/        # Tenant-scoped API key system
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # UI, layout, file, and folder components
│   │   ├── features/        # Page-level components (auth, files, admin)
│   │   ├── services/        # API service layer
│   │   ├── hooks/           # TanStack Query hooks
│   │   ├── stores/          # Zustand auth store
│   │   ├── types/           # TypeScript interfaces
│   │   └── lib/             # Axios instance, utilities
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\Activate.ps1

# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start server
python manage.py runserver
```

The API will be available at `http://localhost:8000/api/`.

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register user + create tenant |
| POST | `/api/auth/login/` | Login → JWT tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Blacklist refresh token |
| GET | `/api/auth/me/` | Current user profile |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload/` | Upload file (multipart/form-data) |
| GET | `/api/files/` | List files (filterable) |
| GET | `/api/files/{id}/` | File details |
| DELETE | `/api/files/{id}/` | Soft delete |
| PUT | `/api/files/{id}/rename/` | Rename file |
| PUT | `/api/files/{id}/move/` | Move file to folder |
| GET | `/api/files/{id}/download/` | Download file |
| GET | `/api/files/trash/` | List trashed files |
| POST | `/api/files/trash/{id}/restore/` | Restore from trash |
| POST | `/api/files/bulk-delete/` | Bulk soft-delete |
| POST | `/api/files/bulk-move/` | Bulk move to folder |

### Folders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/folders/` | Create folder |
| GET | `/api/folders/` | List folders |
| GET | `/api/folders/{id}/` | Folder with children & files |
| PUT | `/api/folders/{id}/` | Rename folder |
| DELETE | `/api/folders/{id}/` | Delete folder |

### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/apikeys/` | Create API key |
| GET | `/api/apikeys/` | List API keys |
| DELETE | `/api/apikeys/{prefix}/` | Revoke API key |

### Admin (superuser only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/tenants/` | List all tenants |
| GET | `/api/admin/tenants/{id}/` | Tenant details |
| PATCH | `/api/admin/tenants/{id}/` | Update tenant (quota, status, name) |
| GET | `/api/admin/tenants/{id}/api-keys/` | List tenant's API keys |
| GET | `/api/admin/storage-usage/` | Storage metrics |
| GET | `/api/admin/system-metrics/` | System health |
| GET | `/api/admin/activity/` | Recent activity log |

## Authentication

### Web App (JWT)

```
Authorization: Bearer <access_token>
```

### System-to-System (API Key)

```
X-API-Key: <api_key>
```

API keys are scoped to a tenant and support granular permissions: `read`, `write`, `delete`, `admin`.

## End User API Usage (API Key Integrations)

This section is for external systems or scripts that call the platform using an API key.

### 1) Base URL and Headers

- Base URL: `http://localhost:8000/api`
- Required header for API key flows:

```http
X-API-Key: <your_api_key>
Content-Type: application/json
```

For endpoints that require JWT auth (web/admin flows), use:

```http
Authorization: Bearer <access_token>
```

### 2) Endpoint Structure Pattern

- Collections: `GET /resource/`, `POST /resource/`
- Single item: `GET /resource/{id}/`
- Action endpoint: `PUT /resource/{id}/rename/`, `GET /resource/{id}/download/`
- API key revoke: `DELETE /apikeys/{prefix}/`

### 3) API Key Lifecycle (Expected Requests/Responses)

#### Create API key

`POST /api/apikeys/`

Request body:

```json
{
       "name": "CI Pipeline",
       "permissions": ["files:read", "files:write"]
}
```

Expected response (`201 Created`):

```json
{
       "prefix": "NE3Ca8UN",
       "name": "CI Pipeline",
       "permissions": ["files:read", "files:write"],
       "created": "2026-03-04T10:45:12.100Z",
       "key": "NE3Ca8UN.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

Notes:
- `key` is shown once at creation time.
- Store it securely; only `prefix` is returned later.

#### List API keys

`GET /api/apikeys/`

Expected response (`200 OK`):

```json
{
       "count": 2,
       "next": null,
       "previous": null,
       "results": [
              {
                     "prefix": "NE3Ca8UN",
                     "name": "CI Pipeline",
                     "permissions": ["files:read", "files:write"],
                     "created": "2026-03-04T10:45:12.100Z",
                     "last_used": null,
                     "revoked": false
              }
       ]
}
```

#### Revoke API key

`DELETE /api/apikeys/{prefix}/`

Expected response: `204 No Content`

### 4) Common Resource Response Shapes

#### Files list (`GET /api/files/`)

Expected response:

```json
{
       "count": 1,
       "next": null,
       "previous": null,
       "results": [
              {
                     "id": "<uuid>",
                     "original_filename": "report.pdf",
                     "file_size": 24576,
                     "file_type": "application/pdf",
                     "updated_at": "2026-03-04T10:20:00Z"
              }
       ]
}
```

#### Folder list (`GET /api/folders/`)

Expected response:

```json
{
       "count": 1,
       "next": null,
       "previous": null,
       "results": [
              {
                     "id": "<uuid>",
                     "name": "Invoices",
                     "parent": null,
                     "updated_at": "2026-03-04T10:10:00Z"
              }
       ]
}
```

### 5) Typical Error Responses

- `400 Bad Request`: validation errors
- `401 Unauthorized`: missing/invalid auth token
- `403 Forbidden`: permission denied for tenant/role
- `404 Not Found`: resource not found

Validation error shape example:

```json
{
       "permissions": ["\"files:execute\" is not a valid choice."]
}
```

## Multi-Tenancy

- Each tenant has isolated storage and data
- Users belong to a single tenant
- API keys are scoped to their tenant
- All queries automatically filter by tenant
- Storage quotas are enforced per-tenant

## Security

- Tenant-scoped data isolation
- JWT with token rotation and blacklisting
- Hashed API keys (only shown once on creation)
- No raw storage paths exposed in API responses
- Rate limiting (30/min anonymous, 120/min authenticated)
- Audit logging for file operations
- CORS restricted to configured origins
- 100MB max upload size

## Production Considerations

- Switch to PostgreSQL (`dj-database-url`)
- Configure S3/MinIO for object storage
- Set `DEBUG = False` and configure `SECRET_KEY`
- Enable `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`
- Add Redis for caching + Celery task queue
- Set up CDN for file delivery
- Configure structured logging and error tracking

## License

MIT
