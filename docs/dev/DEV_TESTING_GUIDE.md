# Development Testing Guide: Auth & Request Flow

This guide covers how to test the vacation request system in dev mode, including authentication, request creation, and the approval workflow.

## Prerequisites

### Environment Setup

Ensure your `.env` file (or `.env.local`) has:

```env
BYPASS_AUTH=true
BYPASS_AUTH_SECRET=your-local-secret-key
DATABASE_URL=your-database-connection-string
PORT=3002
```

With `BYPASS_AUTH=true`, the app uses local HS256 token validation instead of Keycloak JWKS.

### Running the App

```bash
cd vacation_system
npm install
npm run dev
```

The app runs at `http://localhost:3002`.

---

## Part 1: Authentication & User Setup

### Available Dev Roles

The system recognizes these test user patterns via username convention:

| Username Pattern | Internal Role | Approval Step | Can Review |
|---|---|---|---|
| `dev-profesor` | `Profesor` | N/A | ❌ No |
| `dev-jefatura-admin` | `Jefe_Administrativo` | Paso 2 | ✅ Yes |
| `dev-jefatura-departamento` | `Jefe_de_Departamento` | Paso 1 | ✅ Yes |
| `dev-director` | `Director_de_Escuela` | Paso 3 | ✅ Yes |

**Note:** Roles are determined by:
1. **SAC token roles** (if provided in token)
2. **Fallback:** Username convention (if no token roles)

### Minting Dev Tokens

**Endpoint:** `POST /api/dev/login`

**Request Body:**

```json
{
  "username": "dev-profesor",
  "email": "profesor@example.com",
  "name": "Juan Profesor"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "dev-profesor",
    "email": "profesor@example.com",
    "name": "Juan Profesor"
  }
}
```

**Example using cURL:**

```bash
curl -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev-profesor",
    "email": "profesor@example.com",
    "name": "Juan Profesor"
  }'
```

### Setting the Token

Save the returned token and use it in subsequent requests:

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Verify Authentication

**Endpoint:** `GET /api/vacation/me`

```bash
curl -X GET http://localhost:3002/api/vacation/me \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**

```json
{
  "user": {
    "id": 1,
    "username": "dev-profesor",
    "email": "profesor@example.com",
    "nombre": "Juan Profesor",
    "dias_vacaciones_disponibles": 15
  },
  "roles": ["Profesor"],
  "claims": {
    "preferred_username": "dev-profesor",
    "email": "profesor@example.com",
    "name": "Juan Profesor"
  }
}
```

---

## Part 2: Creating & Managing Vacation Requests

### Step 1: Create a Draft Request

**Endpoint:** `POST /api/vacation/requests`

**Request Body:**

```json
{
  "fecha_inicio": "2026-07-01",
  "fecha_fin": "2026-07-10",
  "observacion": "Summer vacation plans"
}
```

**Validation Rules:**
- Dates must be `YYYY-MM-DD` format
- End date >= start date
- Start date cannot be in the past
- At least 1 working day required (excluding weekends)
- User must have enough available vacation days
- No overlapping Borrador/Enviado/Aprobado requests in date range

**Example using cURL:**

```bash
PROF_TOKEN="<profesor-token>"

curl -X POST http://localhost:3002/api/vacation/requests \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha_inicio": "2026-07-01",
    "fecha_fin": "2026-07-10",
    "observacion": "Summer vacation"
  }'
```

**Response:**

```json
{
  "id": 1,
  "id_usuario": 1,
  "fecha_inicio": "2026-07-01",
  "fecha_fin": "2026-07-10",
  "dias_habiles": 6,
  "observacion": "Summer vacation",
  "estado": "Borrador",
  "paso_actual": null,
  "fecha_creacion": "2026-06-20T10:30:00Z",
  "fecha_modificacion": "2026-06-20T10:30:00Z"
}
```

### Step 2: Submit the Request (Draft → Sent)

**Endpoint:** `PATCH /api/vacation/requests/[id]`

**Request Body:**

```json
{
  "action": "submit"
}
```

**What happens:**
- Request moves from `Borrador` → `Enviado`
- `paso_actual` set to 1 (first reviewer step)
- Timestamp updated

**Example using cURL:**

```bash
curl -X PATCH http://localhost:3002/api/vacation/requests/1 \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit"
  }'
```

### Step 3: Get Request Details

**Endpoint:** `GET /api/vacation/requests/[id]`

**Access Control:**
- ✅ Request owner (always)
- ✅ Reviewer at any approval step (can view to review)
- ❌ Others (403 Forbidden)

**Example using cURL:**

```bash
curl -X GET http://localhost:3002/api/vacation/requests/1 \
  -H "Authorization: Bearer $PROF_TOKEN"
```

**Response includes:**
- Request details (dates, status, estado)
- Full user info
- Revision history (all approvals/rejections)

---

## Part 3: Testing the Approval Workflow

### Scenario: 3-Step Approval Chain

1. **Profesor** creates request → Submitted
2. **Jefe_de_Departamento** reviews (Paso 1) → Approves/Rejects
3. **Jefe_Administrativo** reviews (Paso 2) → Approves/Rejects
4. **Director_de_Escuela** reviews (Paso 3) → Final approval → Days deducted

### Setup: Create Test Users with All Roles

```bash
# Login as professor
PROF_TOKEN=$(curl -s -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev-profesor",
    "email": "profesor@example.com",
    "name": "Juan Profesor"
  }' | jq -r '.token')

# Login as department head
JEFE_DEPT_TOKEN=$(curl -s -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev-jefatura-departamento",
    "email": "jefe-dept@example.com",
    "name": "Maria Jefe Departamento"
  }' | jq -r '.token')

# Login as administrative head
JEFE_ADMIN_TOKEN=$(curl -s -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev-jefatura-admin",
    "email": "jefe-admin@example.com",
    "name": "Carlos Jefe Admin"
  }' | jq -r '.token')

# Login as director
DIRECTOR_TOKEN=$(curl -s -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dev-director",
    "email": "director@example.com",
    "name": "Ana Director"
  }' | jq -r '.token')
```

### Test Flow: Full Approval Chain

#### 1. Professor Creates & Submits Request

```bash
# Create draft
REQUEST=$(curl -s -X POST http://localhost:3002/api/vacation/requests \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha_inicio": "2026-07-01",
    "fecha_fin": "2026-07-10",
    "observacion": "Summer vacation"
  }')

REQUEST_ID=$(echo $REQUEST | jq -r '.id')

# Submit request
curl -X PATCH http://localhost:3002/api/vacation/requests/$REQUEST_ID \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "submit"}'
```

#### 2. Department Head Reviews (Paso 1)

**Endpoint:** `GET /api/vacation/requests/pending`

Department head sees their pending requests:

```bash
curl -X GET http://localhost:3002/api/vacation/requests/pending \
  -H "Authorization: Bearer $JEFE_DEPT_TOKEN"
```

**Response:** List of requests awaiting Paso 1 review

**Approve the Request:**

```bash
curl -X POST http://localhost:3002/api/vacation/approve \
  -H "Authorization: Bearer $JEFE_DEPT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_solicitud": '$REQUEST_ID',
    "comentario": "Approved by department head"
  }'
```

**What happens:**
- `vac_revision` record created: { accion: "Aprobado", comentario, rol_revisor: "Jefe_de_Departamento" }
- Request `paso_actual` advances to 2
- Status remains `Enviado`

**Or Reject:**

```bash
curl -X POST http://localhost:3002/api/vacation/reject \
  -H "Authorization: Bearer $JEFE_DEPT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_solicitud": '$REQUEST_ID',
    "comentario": "Rejected: needs more details"
  }'
```

**What happens:**
- `vac_revision` record created: { accion: "Rechazado", comentario }
- Request estado = `Rechazado`, paso_actual = NULL
- Review chain terminates (professor must resubmit)

#### 3. Admin Head Reviews (Paso 2)

```bash
curl -X GET http://localhost:3002/api/vacation/requests/pending \
  -H "Authorization: Bearer $JEFE_ADMIN_TOKEN"
```

Approve (advances to Paso 3):

```bash
curl -X POST http://localhost:3002/api/vacation/approve \
  -H "Authorization: Bearer $JEFE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_solicitud": '$REQUEST_ID',
    "comentario": "Approved by admin"
  }'
```

#### 4. Director Reviews (Paso 3) — Final Step

```bash
curl -X GET http://localhost:3002/api/vacation/requests/pending \
  -H "Authorization: Bearer $DIRECTOR_TOKEN"
```

**Final Approval:**

```bash
curl -X POST http://localhost:3002/api/vacation/approve \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_solicitud": '$REQUEST_ID',
    "comentario": "Approved"
  }'
```

**What happens (atomic transaction):**
1. `vac_revision` record created: { accion: "Aprobado", rol_revisor: "Director_de_Escuela" }
2. Request estado = `Aprobado`, paso_actual = NULL (review complete)
3. **Days deducted:** professor's `dias_vacaciones_disponibles` -= 6 (working days)

#### 5. Verify Final State

```bash
curl -X GET http://localhost:3002/api/vacation/requests/$REQUEST_ID \
  -H "Authorization: Bearer $PROF_TOKEN"
```

**Response:**

```json
{
  "solicitud": {
    "id": 1,
    "estado": "Aprobado",
    "paso_actual": null,
    "dias_habiles": 6
  },
  "usuario": {
    "dias_vacaciones_disponibles": 9  // Was 15, now 9
  },
  "revisiones": [
    {
      "accion": "Aprobado",
      "rol_revisor": "Jefe_de_Departamento",
      "comentario": "Approved by department head",
      "fecha_revision": "2026-06-20T10:45:00Z"
    },
    {
      "accion": "Aprobado",
      "rol_revisor": "Jefe_Administrativo",
      "comentario": "Approved by admin",
      "fecha_revision": "2026-06-20T10:50:00Z"
    },
    {
      "accion": "Aprobado",
      "rol_revisor": "Director_de_Escuela",
      "comentario": "Approved",
      "fecha_revision": "2026-06-20T10:55:00Z"
    }
  ]
}
```

---

## Part 4: Testing Access Control & Smart Filtering

### Test 1: Professor Sees Own Requests Only

```bash
# List all requests as professor
curl -X GET http://localhost:3002/api/vacation/requests \
  -H "Authorization: Bearer $PROF_TOKEN"
```

**Result:** Only requests created by this professor

### Test 2: Reviewer Sees Their Pending Requests Only

```bash
# Department head sees only paso_actual=1 requests
curl -X GET http://localhost:3002/api/vacation/requests/pending \
  -H "Authorization: Bearer $JEFE_DEPT_TOKEN"
```

**Result:** Only requests awaiting Paso 1 review (not Paso 2 or 3)

### Test 3: Reviewer Cannot Approve at Wrong Step

**Scenario:** Paso is 1, but admin (Paso 2) tries to approve

```bash
curl -X POST http://localhost:3002/api/vacation/approve \
  -H "Authorization: Bearer $JEFE_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_solicitud": '$REQUEST_ID',
    "comentario": "Trying to approve out of order"
  }'
```

**Result:** 400 Bad Request – "Wrong reviewer role for this paso"

### Test 4: Non-Owner Cannot Access Others' Requests

**Scenario:** Professor A tries to view Professor B's request

```bash
PROF_B_TOKEN="<other-professor-token>"

curl -X GET http://localhost:3002/api/vacation/requests/$OTHER_REQUEST_ID \
  -H "Authorization: Bearer $PROF_B_TOKEN"
```

**Result:** 403 Forbidden (unless Professor B is also a reviewer)

### Test 5: Reviewer Can Access Any Request

**Scenario:** Department head views any professor's request (for review)

```bash
curl -X GET http://localhost:3002/api/vacation/requests/$ANY_REQUEST_ID \
  -H "Authorization: Bearer $JEFE_DEPT_TOKEN"
```

**Result:** 200 OK (reviewers can view all requests)

---

## Part 5: Testing Edge Cases

### Edge Case 1: Insufficient Vacation Days

**Setup:** Professor has 5 days available

```bash
curl -X POST http://localhost:3002/api/vacation/requests \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha_inicio": "2026-07-01",
    "fecha_fin": "2026-07-10"
  }'
```

**Result:** 400 Bad Request – "Insufficient vacation days"

### Edge Case 2: Overlapping Requests

**Setup:** Professor already has an approved request for 2026-07-05

```bash
curl -X POST http://localhost:3002/api/vacation/requests \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha_inicio": "2026-07-03",
    "fecha_fin": "2026-07-08"
  }'
```

**Result:** 400 Bad Request – "Request overlaps with existing vacation"

### Edge Case 3: Cannot Submit Non-Draft Request

**Setup:** Request is already Enviado

```bash
curl -X PATCH http://localhost:3002/api/vacation/requests/$REQUEST_ID \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "submit"}'
```

**Result:** 400 Bad Request – "Request must be in Borrador state"

### Edge Case 4: Approval Fails with Insufficient Days

**Setup:** Between approval and final step, vacation days were manually reduced

```bash
curl -X POST http://localhost:3002/api/vacation/approve \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id_solicitud": '$REQUEST_ID',
    "comentario": "Final approval"
  }'
```

**Result:** 400 Bad Request – "Insufficient vacation days for final approval" (transaction rolls back)

### Edge Case 5: Start Date Cannot Be in Past

```bash
curl -X POST http://localhost:3002/api/vacation/requests \
  -H "Authorization: Bearer $PROF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha_inicio": "2026-01-01",
    "fecha_fin": "2026-01-10"
  }'
```

**Result:** 400 Bad Request – "Start date cannot be in the past"

---

## Part 6: Testing via UI

### Browser Session Setup

1. Open `http://localhost:3002` in browser
2. Use dev-switcher overlay (if available) to login as different roles
3. Or manually set token in localStorage:

```javascript
// In browser console
localStorage.setItem('vacation_token', 'your-jwt-token');
location.reload();
```

### Workflow in UI

1. **Professor perspective:**
   - Create vacation request via form
   - See draft status
   - Submit request
   - View request details and revision history

2. **Reviewer perspective:**
   - View pending requests on dashboard
   - Click to open request
   - Approve with comment
   - Reject with feedback

3. **Filters:**
   - Filter by status (Borrador, Enviado, Aprobado, Rechazado)
   - Filter by date range
   - Pagination

---

## Useful Commands Summary

### Quick Token Setup (Bash)

```bash
# Source this to set up all tokens at once
PROF_TOKEN=$(curl -s -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dev-profesor","email":"prof@test.com","name":"Professor"}' | jq -r '.token')

JEFE_DEPT_TOKEN=$(curl -s -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dev-jefatura-departamento","email":"jefe@test.com","name":"Department Head"}' | jq -r '.token')

JEFE_ADMIN_TOKEN=$(curl -s -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dev-jefatura-admin","email":"admin@test.com","name":"Admin Head"}' | jq -r '.token')

DIRECTOR_TOKEN=$(curl -s -X POST http://localhost:3002/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{"username":"dev-director","email":"director@test.com","name":"Director"}' | jq -r '.token')

echo "Tokens set. Use: \$PROF_TOKEN, \$JEFE_DEPT_TOKEN, \$JEFE_ADMIN_TOKEN, \$DIRECTOR_TOKEN"
```

### View Database State (SQL)

```sql
-- All users and their roles
SELECT u.id, u.username, r.rol
FROM usuario u
LEFT JOIN usuario_rol r ON u.id = r.id_usuario
ORDER BY u.username, r.rol;

-- All requests with status
SELECT id, id_usuario, estado, paso_actual, dias_habiles, fecha_inicio, fecha_fin
FROM vac_solicitud
ORDER BY fecha_creacion DESC;

-- Revision history for a request
SELECT id_solicitud, accion, rol_revisor, comentario, fecha_revision
FROM vac_revision
WHERE id_solicitud = <REQUEST_ID>
ORDER BY fecha_revision;

-- User vacation days
SELECT username, dias_vacaciones_disponibles
FROM usuario
WHERE username LIKE 'dev-%';
```

---

## Troubleshooting

### Token is Invalid

- Check that `BYPASS_AUTH=true` in .env
- Verify token is from `/api/dev/login` endpoint
- Ensure Authorization header: `Authorization: Bearer <token>`

### Cannot Access Request (403)

- Are you the owner or a reviewer?
- Is the request at your approval step?
- Reviewers can view any request; owners only their own

### Approval Fails Unexpectedly

- Check database: is paso_actual correct?
- Is user role correct for that paso?
- Do they have enough vacation days?
- Check server logs for detailed error

### Changes Not Reflecting in UI

- Clear localStorage and re-login
- Hard refresh browser (Ctrl+Shift+R)
- Check network tab for failed API calls

