# API Contract — Reminder Creation

## Endpoint

| Field  | Value                    |
|--------|--------------------------|
| Method | `POST`                   |
| Path   | `/api/v1/reminders`      |

---

## Authentication

Every request must carry a valid JWT access token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Obtain the token via `POST /api/v1/auth/login` (not yet implemented — placeholder for the auth router).

Missing or invalid tokens return **401 Unauthorized**.

---

## Request Body

`Content-Type: application/json`

```json
{
  "title":       "string  (required, 1–200 characters)",
  "description": "string  (optional, null if omitted)",
  "due_date":    "string  (optional, ISO 8601 datetime e.g. '2026-04-01T09:00:00Z')",
  "priority":    "string  (optional, one of: 'low' | 'medium' | 'high', default: 'medium')"
}
```

### Field rules

| Field         | Type             | Required | Constraints                        | Default    |
|---------------|------------------|----------|------------------------------------|------------|
| `title`       | string           | Yes      | 1–200 characters                   | —          |
| `description` | string \| null   | No       | No length limit                    | `null`     |
| `due_date`    | ISO 8601 string  | No       | Any valid datetime with timezone   | `null`     |
| `priority`    | enum string      | No       | `"low"`, `"medium"`, or `"high"`   | `"medium"` |

---

## Success Response — 201 Created

```json
{
  "status": "ok",
  "message": "Reminder created",
  "data": {
    "id":          "550e8400-e29b-41d4-a716-446655440000",
    "title":       "Buy groceries",
    "description": "Milk, eggs, bread",
    "due_date":    "2026-04-01T09:00:00Z",
    "priority":    "high",
    "completed":   false,
    "created_at":  "2026-03-26T14:22:00.123456Z"
  }
}
```

### Response field types

| Field        | Type             | Notes                            |
|--------------|------------------|----------------------------------|
| `id`         | string (UUID v4) | Server-generated                 |
| `title`      | string           |                                  |
| `description`| string \| null   |                                  |
| `due_date`   | string \| null   | ISO 8601 datetime                |
| `priority`   | string           | `"low"` \| `"medium"` \| `"high"`|
| `completed`  | boolean          | Always `false` on creation       |
| `created_at` | string           | ISO 8601 datetime (UTC)          |

---

## Error Responses

### 401 Unauthorized — missing or invalid token

```json
{
  "detail": "Could not validate credentials"
}
```

Header: `WWW-Authenticate: Bearer`

### 422 Unprocessable Entity — validation failure

Standard FastAPI/Pydantic error body:

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "title"],
      "msg": "Field required",
      "input": {}
    }
  ]
}
```

---

## Example curl

```bash
# Obtain a token first (auth endpoint TBD)
TOKEN="<your_access_token>"

curl -X POST http://localhost:8000/api/v1/reminders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Buy groceries",
    "description": "Milk, eggs, bread",
    "due_date": "2026-04-01T09:00:00Z",
    "priority": "high"
  }'
```

---

## Notes for frontend-dev

- Import the service in `src/Services/RemindersService.ts`.
- The response `data.id` is a UUID string — store it as-is.
- `due_date` and `description` may be `null`; guard against that in the UI.
- `completed` will always be `false` at creation time; a separate PATCH endpoint will handle toggling (coming soon).
