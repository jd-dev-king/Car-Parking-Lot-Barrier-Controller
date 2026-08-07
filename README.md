# EES Pharma Parking Access Digital Twin

Version 3 extends the original Car Parking Lot Barrier Controller into a secure employee-parking access system for the EES Pharma environment.

The browser application combines a JavaScript virtual PLC, a Three.js 70-space parking digital twin, a Security HMI, and a FastAPI service connected to PostgreSQL database `ees_data_platform`.

## Version 3 Architecture

```text
Vehicle Detection
      |
      v
Browser PLC / HMI / Three.js
      |
      v
FastAPI Access-Control API
      |
      v
PostgreSQL
 ees_data_platform
      |
      +-- parking_access.employees
      +-- parking_access.employee_vehicles
      +-- parking_access.parking_spaces
      +-- parking_access.parking_sessions
      +-- parking_access.visitor_passes
      +-- parking_access.security_requests
      +-- parking_access.security_actions
      +-- parking_access.access_events
```

The browser never receives PostgreSQL credentials. Database access stays behind the API service.

## Access Behavior

### Employee vehicle

1. Vehicle identifier is detected at the entrance.
2. The API checks `parking_access.employee_vehicles` and the linked employee record.
3. Active, parking-authorized employees are granted access automatically.
4. The next available parking space is reserved in PostgreSQL.
5. The PLC opens the entrance gate.
6. The Three.js vehicle enters the assigned space.
7. The parking session and access event remain stored in PostgreSQL.

Demo employee identifiers:

```text
EMP-1001-A
EMP-1002-A
EMP-1003-A
```

`EMP-1099-X` is seeded as an inactive/unauthorized employee test case and therefore follows the unknown/security path.

### Visitor vehicle

1. An unknown vehicle reaches the entrance.
2. The entrance gate remains closed.
3. A `PENDING` Security request is created.
4. Security chooses **Buzz In + Issue Visitor ID** or **Deny**.
5. Approval reserves a parking space and allocates the next available visitor ID.
6. The gate opens and the visitor enters.
7. On exit, the visitor ID becomes `QUARANTINED` for 24 hours.
8. After 24 hours the ID becomes available for reuse.

Visitor IDs are seeded as:

```text
VIS-0001 ... VIS-0050
```

## Parking Capacity

The digital twin contains 70 spaces:

```text
A01-A10
B01-B10
C01-C10
D01-D10
E01-E10
F01-F10
G01-G10
```

The HMI shows total occupancy, employee occupancy, visitor occupancy, remaining spaces, lot-full state, lot-empty state, and available visitor IDs.

## Project Structure

```text
ees_3d_parking_plc_simulator/
├── index.html
├── style.css
├── config.js
├── app.js
├── vercel.json
├── LICENSE
├── README.md
└── backend/
    ├── main.py
    ├── db.py
    ├── init_db.py
    ├── requirements.txt
    ├── .env.example
    ├── railway.json
    ├── Procfile
    └── sql/
        ├── 001_parking_access_schema.sql
        └── 002_seed_demo_data.sql
```

# Local PostgreSQL Setup

The API expects the existing PostgreSQL database:

```text
ees_data_platform
```

## 1. Enter the backend folder

```bash
cd /Users/jeremiahlupton/Documents/GitHub/ees_3d_parking_plc_simulator/backend
```

## 2. Create a Python virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

## 4. Create `.env`

```bash
cp .env.example .env
```

Edit `.env` and use the PostgreSQL credentials for `ees_data_platform`:

```text
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/ees_data_platform
CORS_ORIGINS=http://127.0.0.1:5500,http://localhost:5500,https://jd-dev-king.github.io
PORT=8000
```

Do not commit `.env`.

## 5. Initialize the parking schema

```bash
python init_db.py
```

Expected result:

```text
Initialized ees_data_platform.parking_access with 70 spaces, demo employees, and 50 visitor IDs.
```

## 6. Start the API

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 7. Test the database connection

Open another Terminal window:

```bash
curl http://localhost:8000/api/health
```

Expected response includes:

```json
{
  "ok": true,
  "database": "ees_data_platform"
}
```

Check parking status:

```bash
curl http://localhost:8000/api/parking/status
```

Initial response should show approximately:

```json
{
  "capacity": 70,
  "occupied": 0,
  "employees": 0,
  "visitors": 0,
  "remaining": 70,
  "full": false,
  "empty": true,
  "visitor_pool_available": 50
}
```

## 8. Start the browser simulator

Leave the API running. Open the repository root in VS Code and launch `index.html` with Live Server.

`config.js` defaults to:

```text
http://localhost:8000
```

The header should change to **API + DB ONLINE**.

# End-to-End Tests

## Employee Entry

Use:

```text
EMP-1001-A
```

Click **Detect at Entry**.

Expected behavior:

- Database lookup succeeds.
- Access is granted automatically.
- A space such as `A01` is reserved.
- Entrance gate opens.
- Vehicle enters the 3D lot.
- Employee count becomes 1.
- PostgreSQL receives a parking session and access event.

## Employee Exit

Keep `EMP-1001-A` selected and click **Detect at Exit**.

Expected behavior:

- Active parking session is found.
- Exit gate opens.
- Vehicle leaves.
- Space is released.
- Occupancy returns to 0.

## Visitor Entry

Use:

```text
VISITOR-001
```

Click **Detect at Entry**.

Expected behavior:

- Vehicle is not found in employee records.
- Gate stays closed.
- Security panel displays a pending request.
- Click **Buzz In + Issue Visitor ID**.
- A visitor ID such as `VIS-0001` is allocated.
- A parking space is reserved.
- Entrance gate opens.
- Visitor count becomes 1.

## Visitor Exit / 24-Hour Recycle

With `VISITOR-001` selected, click **Detect at Exit**.

Expected behavior:

- Visitor parking session closes.
- Assigned space is released.
- Visitor ID becomes `QUARANTINED`.
- `reusable_after` is set to 24 hours after exit.
- The ID is excluded from the available pool until that timestamp passes.

# Useful PostgreSQL Queries

## Employee vehicles

```sql
SELECT
    e.employee_number,
    e.display_name,
    e.employment_status,
    e.parking_authorized,
    ev.vehicle_identifier,
    ev.active
FROM parking_access.employee_vehicles ev
JOIN parking_access.employees e
  ON e.employee_id = ev.employee_id
ORDER BY e.employee_number;
```

## Current parking sessions

```sql
SELECT
    ps.vehicle_identifier,
    ps.occupant_type,
    sp.space_number,
    ps.entry_time,
    vp.visitor_code
FROM parking_access.parking_sessions ps
JOIN parking_access.parking_spaces sp
  ON sp.space_id = ps.space_id
LEFT JOIN parking_access.visitor_passes vp
  ON vp.visitor_pass_id = ps.visitor_pass_id
WHERE ps.session_status = 'ACTIVE'
ORDER BY sp.space_number;
```

## Visitor ID pool

```sql
SELECT
    visitor_code,
    status,
    returned_at,
    reusable_after
FROM parking_access.visitor_passes
ORDER BY visitor_code;
```

## Access audit trail

```sql
SELECT
    event_time,
    gate_id,
    vehicle_identifier,
    event_type,
    access_result,
    reason
FROM parking_access.access_events
ORDER BY event_time DESC
LIMIT 100;
```

# Railway Deployment

Railway PostgreSQL exposes connection variables including `DATABASE_URL`. Configure the API service with a reference to the PostgreSQL service's `DATABASE_URL` rather than putting credentials in the repository.

For the Railway API service:

```text
DATABASE_URL=<Railway PostgreSQL DATABASE_URL reference>
CORS_ORIGINS=https://jd-dev-king.github.io,https://YOUR-VERCEL-DOMAIN.vercel.app
```

Set the service root directory to:

```text
/backend
```

The included `railway.json` starts:

```text
uvicorn main:app --host 0.0.0.0 --port $PORT
```

After Railway provides the public API URL, update `config.js`:

```javascript
window.EES_API_BASE_URL = "https://YOUR-RAILWAY-API.up.railway.app";
```

Then GitHub Pages and Vercel can use the Railway API while PostgreSQL remains private behind the backend service.

# Security Notes

This is a portfolio/demo access-control system. For a production physical facility, add authenticated Security users, encrypted secrets, rate limiting, real credential/vehicle readers, role-based authorization, audit retention policies, and privacy controls. Avoid exposing raw license-plate or employee personal data in a public frontend.

## Technology Stack

- PostgreSQL
- FastAPI
- Psycopg 3 connection pooling
- JavaScript virtual PLC
- Three.js / WebGL
- HTML5 / CSS3
- GitHub Pages
- Vercel
- Railway

## Version

**Version 3.0.0 — Pharma Employee Parking Access & Security Digital Twin**
