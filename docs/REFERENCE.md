# FileServer API and operations reference

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
| PUT | `/api/files/{id}/content/` | Update text file content |
| GET | `/api/files/{id}/office-content/` | Load Office document for viewing/editing |
| PUT | `/api/files/{id}/office-content/` | Save Office document changes |
| GET | `/api/files/{id}/download/` | Download file |
| GET | `/api/files/trash/` | List trashed files |
| POST | `/api/files/trash/{id}/restore/` | Restore from trash |
| POST | `/api/files/bulk-delete/` | Bulk soft-delete |
| POST | `/api/files/bulk-move/` | Bulk move to folder |
| POST | `/api/files/bulk-copy/` | Bulk copy to folder |
| POST | `/api/files/compress/` | Compress files into a ZIP archive |
| POST | `/api/files/{id}/extract/` | Extract a ZIP archive |

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

## Environment Configuration

The backend uses a `.env` file for configuration. Copy the example and adjust as needed:

```bash
cd backend
copy .env.example .env
```

Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_SECRET_KEY` | insecure dev key | Django secret key |
| `DJANGO_DEBUG` | `True` | Debug mode |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | Comma-separated allowed hosts |
| `FILE_UPLOAD_MAX_SIZE` | `104857600` (100 MB) | Max file upload size in bytes |
| `OFFICE_PREVIEW_MAX_FILE_SIZE` | `20971520` (20 MB) | Max office file size for document preview |
| `CORS_ALLOWED_ORIGINS` | localhost dev servers | Comma-separated CORS origins |

See `.env.example` for environment examples. PostgreSQL and S3 entries require corresponding backend settings and dependencies; the current default uses SQLite and local file storage.

## Office Document Viewer/Editor

The platform includes a built-in viewer and editor for Microsoft Office files:

- **Word (.docx)** — paragraphs with rich text formatting, tables, embedded images
- **Excel (.xlsx)** — multi-sheet support, cell formatting, merged cells, column widths
- **PowerPoint (.pptx/.pptm)** — slide thumbnails, positioned shapes, rich text runs, embedded images

Features:
- **Table extraction**: Word tables are extracted and rendered in document order alongside paragraphs
- **Embedded images**: DOCX images render in document order and PowerPoint pictures render on slide coordinates, with unplaced media kept as a fallback shelf
- **Theme color resolution**: Office theme-based colors (dk1, accent1, etc.) are resolved to RGB hex values using the document's theme XML, with fallback to default Office theme colors
- **Preview size limit**: Configurable via `OFFICE_PREVIEW_MAX_FILE_SIZE` in `.env` (default 20 MB) to prevent parsing very large files

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
- CORS restricted to configured origins (configurable via `CORS_ALLOWED_ORIGINS` env var)
- File upload size limit configurable via `FILE_UPLOAD_MAX_SIZE` env var (default 100 MB)
- Office preview size limit configurable via `OFFICE_PREVIEW_MAX_FILE_SIZE` env var (default 20 MB)

## Production Considerations

- To use PostgreSQL, install a database driver and configure Django database settings; the example environment variables alone do not enable it.
- To use S3/MinIO, add a storage backend and configure Django storage settings.
- Set `DEBUG = False` and configure `SECRET_KEY` via env vars
- Configure CORS origins via `CORS_ALLOWED_ORIGINS` env var
- Enable `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`
- Add Redis for caching + Celery task queue
- Set up CDN for file delivery
- Configure structured logging and error tracking
