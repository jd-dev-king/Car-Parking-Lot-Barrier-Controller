# EES Pharma Parking Access Digital Twin

**Version 3.0.0**

A secure employee and visitor parking access digital twin for a pharmaceutical manufacturing facility, built as part of the **EES Industrial Universe**.

The project combines a browser-based 3D parking simulation, virtual PLC logic, PostgreSQL-backed identity and access control, Security approval workflows, live parking occupancy, and an industrial HMI.

The system represents the **Pharma Employee Parking Lot** and integrates with the canonical EES PostgreSQL data platform:

```text
ees_data_platform
```

---

## Project Overview

The EES Pharma Parking Access Digital Twin models a secure 70-space employee parking facility supporting:

- Employee vehicle authorization
- Employee access exceptions
- Security overrides
- Visitor approval
- Temporary visitor identifiers
- Entry and exit gate control
- Live parking occupancy
- Parking-space assignment
- Security event logging
- Virtual PLC logic
- PostgreSQL persistence
- Three.js 3D visualization
- EES Universal Data Moon registration

The simulation represents the parking and perimeter-access layer surrounding the pharmaceutical manufacturing environment.

---

# EES Universe Architecture

The Parking Access Digital Twin is one operational component of the larger EES Industrial Universe.

```text
                         EES INDUSTRIAL UNIVERSE
                                  │
                                  ▼
                         ees_data_platform
                          PostgreSQL Database
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
         power_grid.*         pharma.*         parking_access.*
              │                                       │
              ▼                                       ▼
       Power Grid Sun                    Pharma Parking Access Twin
              │                                       │
              ▼                                       ▼
        RC Controls                         PLC / HMI / Security
              │                                       │
              └───────────────┬───────────────────────┘
                              ▼
                         analytics / EES
```

The parking application uses the same canonical PostgreSQL environment as the other connected EES systems.

---

# Technology Stack

## Frontend

- HTML5
- CSS3
- JavaScript
- Three.js
- Browser-based virtual PLC
- Industrial HMI interface

## Backend

- Python
- FastAPI
- Uvicorn
- Psycopg
- PostgreSQL

## Database

- PostgreSQL 14
- Canonical database:

```text
ees_data_platform
```

## EES Integration

- `ees_registry`
- `parking_access`
- Future Smart Assistant AI integration
- Future Manufacturing Intelligence analytics
- Future Power Grid / facility cross-domain events

---

# Major Features

## 1. 70-Space Pharma Employee Parking Lot

The Three.js environment presents a secure pharmaceutical employee parking facility containing 70 managed parking spaces.

The HMI displays:

- Current occupancy
- Remaining capacity
- Employee count
- Visitor count
- Lot full state
- Lot empty state

---

## 2. Employee Vehicle Authorization

Employee vehicle identities are stored in PostgreSQL.

Example authorized vehicle:

```text
EMP-1001-A
```

The access system validates the vehicle against:

```text
parking_access.employee_vehicles
```

and its associated employee record.

Normal authorized employees receive automatic entry authorization when space is available.

---

## 3. Employee Access Exception Workflow

Employees who are known to the system but do not currently meet normal parking authorization requirements are **not classified as visitors**.

Examples include:

- Parking authorization suspended
- Employee on leave
- Inactive employee record

These requests become:

```text
EMPLOYEE ACCESS EXCEPTION
```

and are routed to the Security Desk.

Security may then:

```text
Approve Employee Override + Open Gate
```

or:

```text
Deny Employee Access
```

This allows realistic pharmaceutical-facility exceptions such as an employee returning while on leave to:

- Return company equipment
- Attend an occupational-health appointment
- Attend a conference or training event
- Meet management or Human Resources
- Complete administrative requirements
- Perform an approved temporary facility visit

The employee remains classified as an **employee** throughout the workflow and does not consume a visitor ID.

---

# Demo Employee Records

The v3.0.0 database includes 15 demonstration employee identities.

## Authorized Employees

```text
EES-PH-1001    Avery Chen
EES-PH-1002    Morgan Reyes
EES-PH-1003    Jordan Patel
EES-PH-1004    Taylor Brooks
EES-PH-1005    Cameron Diaz
EES-PH-1006    Riley Thompson
EES-PH-1007    Casey Nguyen
EES-PH-1008    Drew Wallace
EES-PH-1009    Alexis Martin
EES-PH-1010    Samir Shah
EES-PH-1011    Jamie Rivera
EES-PH-1012    Devon Clarke
```

Example registered vehicle identifiers:

```text
EMP-1001-A
EMP-1002-A
EMP-1003-A
EMP-1004-A
EMP-1005-A
EMP-1006-A
EMP-1007-A
EMP-1008-A
EMP-1009-A
EMP-1010-A
EMP-1011-A
EMP-1012-A
```

## Security Review Demonstration Records

```text
EMP-1088-X
Parking Suspended Demo

EMP-1098-X
Employee On Leave Demo

EMP-1099-X
Inactive Employee Demo
```

These records allow the Security override workflow to be demonstrated without modifying real employee data.

---

# Visitor Access Workflow

Unknown vehicle identifiers do not receive automatic entry.

Instead:

```text
Unknown Vehicle
      │
      ▼
Gate Remains Closed
      │
      ▼
Security Review
      │
      ├── Deny Access
      │
      └── Approve Visitor
               │
               ▼
       Assign Next VIS-####
               │
               ▼
          Open Entry Gate
```

Visitor IDs are allocated from a PostgreSQL-backed visitor pool.

Examples:

```text
VIS-0001
VIS-0002
VIS-0003
...
```

The next available identifier is automatically selected when Security approves a visitor.

---

# Visitor ID Quarantine

Visitor identifiers are not immediately recycled after a visitor exits.

Following exit, the identifier can enter a temporary quarantine state before becoming available for reuse.

This supports:

- Auditability
- Security investigation
- Reduced identifier collision
- Cleaner access-history reconstruction

---

# Parking Entry Workflow

For an authorized employee:

```text
Vehicle Detected
      │
      ▼
Database Lookup
      │
      ▼
Employee Vehicle Found
      │
      ▼
Employee Active?
      │
      ▼
Parking Authorized?
      │
      ▼
Space Available?
      │
      ▼
Entry Gate Opens
      │
      ▼
Parking Space Assigned
      │
      ▼
Parking Session Created
      │
      ▼
Occupancy +1
```

---

# Parking Exit Workflow

```text
Vehicle Detected at Exit
        │
        ▼
Locate Active Parking Session
        │
        ▼
Authorize Exit
        │
        ▼
Open Exit Barrier
        │
        ▼
Close Parking Session
        │
        ▼
Release Parking Space
        │
        ▼
Occupancy -1
```

Visitor sessions additionally update the visitor-pass lifecycle.

---

# Live Occupancy

The HMI provides a live database-backed occupancy display.

Example:

```text
LIVE OCCUPANCY

12 / 70

58 spaces available
```

Separate counters are maintained for:

```text
Employees
Visitors
```

Both counters are interactive.

Clicking **Employees** displays employees currently inside the parking lot.

Clicking **Visitors** displays visitors currently inside the parking lot.

The live roster includes information such as:

- Employee or visitor identity
- Vehicle identifier
- Assigned parking space
- Occupant classification
- Entry timestamp

---

# Restart Demo / Reset Lot

The Live Occupancy panel includes:

```text
Restart Demo / Reset Lot
```

This function returns the simulator to a clean demonstration state.

It:

- Closes active demo parking sessions
- Releases occupied parking spaces
- Clears pending Security requests
- Returns applicable visitor IDs to the available pool
- Resets employee occupancy
- Resets visitor occupancy
- Returns the HMI count to `0 / 70`

Historical database events remain available for audit and demonstration purposes.

---

# Virtual PLC

The application includes a browser-based virtual PLC scan.

Example PLC tags include:

```text
Vehicle_Detected
Employee_Vehicle
Visitor_Vehicle
Vehicle_Authorized
Security_Approval
Entry_Gate_Open
Exit_Gate_Open
Car_Count
Spots_Remaining
```

The PLC executes on an approximately:

```text
100 ms
```

browser simulation cycle.

The HMI displays the scan counter and current logical states.

---

# Secure Entry Logic

Conceptually, entry authorization follows:

```text
Vehicle_Detected
       │
       ▼
   DB LOOKUP
       │
       ▼
Employee Authorization
       │
       ├──────────────┐
       │              │
       ▼              ▼
Normal Access    Security Override
       │              │
       └───────OR─────┘
               │
               ▼
       AND NOT Lot_Full
               │
               ▼
       AND NOT Emergency_Stop
               │
               ▼
        Entry_Gate_Open
```

This models a simplified IEC 61131-3-style industrial control workflow.

---

# Holographic HMI

The industrial HMI displays:

- Entry gate status
- Exit gate status
- Lot full state
- Lot empty state
- Database state
- Visitor ID availability
- PLC scan count
- Live occupancy
- Employee occupancy
- Visitor occupancy
- Access-control decisions
- Security requests

---

# Emergency Stop

The HMI includes an Emergency Stop control.

When active, access-control gate commands are prevented from energizing regardless of authorization state.

This models the safety-priority behavior expected from industrial control systems.

---

# PostgreSQL Schema

The project uses:

```text
parking_access
```

inside:

```text
ees_data_platform
```

Core objects include:

```text
parking_access.employees
parking_access.employee_vehicles
parking_access.parking_spaces
parking_access.parking_sessions
parking_access.visitor_passes
parking_access.security_requests
parking_access.security_actions
parking_access.access_events
```

---

# Employees

Employee master information includes fields such as:

```text
employee_number
display_name
employment_status
parking_authorized
```

Example:

```text
EES-PH-1001
Avery Chen
ACTIVE
true
```

---

# Employee Vehicles

Registered vehicles are linked back to employees.

Example:

```text
Employee:
EES-PH-1001

Vehicle:
EMP-1001-A

Make:
Honda

Model:
Accord

Color:
Blue
```

---

# Parking Sessions

Each successful entry creates a parking session.

The session tracks:

- Vehicle identifier
- Occupant type
- Parking space
- Entry timestamp
- Exit timestamp
- Session status
- Visitor pass when applicable

An active session represents a vehicle currently inside the parking lot.

---

# Security Requests

Security exceptions are persisted so authorization decisions are auditable.

Requests can represent:

```text
UNKNOWN VISITOR
```

or:

```text
EMPLOYEE ACCESS EXCEPTION
```

Security actions record whether the request was approved or denied.

---

# EES Universal Data Moon Registration

The Parking Access Digital Twin registers itself with:

```text
ees_registry.systems
```

using:

```text
system_name:
EES Pharma Parking Access Digital Twin

system_key:
ees-pharma-parking-access

domain:
facility-access

system_type:
industrial-access-digital-twin

primary_database:
ees_data_platform
```

Parking datasets are also registered with the EES dataset registry.

This allows the Universal Data Moon and future EES systems to discover the Parking Twin programmatically.

---

# Local Installation

## Requirements

Recommended:

```text
Python 3.12+
PostgreSQL 14+
Modern web browser
```

---

## 1. Enter the Project

```bash
cd '/Users/your-user/Documents/GitHub/EES Universe/EES-Pharma-Parking-Access-Digital-Twin-v3.0.0'
```

---

## 2. Create the Python Environment

```bash
python3.12 -m venv .venv
```

Activate:

```bash
source .venv/bin/activate
```

---

## 3. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

---

## 4. Configure PostgreSQL

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL=postgresql://your_postgres_user@localhost:5432/ees_data_platform

API_HOST=0.0.0.0
API_PORT=8001

CORS_ORIGINS=http://localhost:5501,http://127.0.0.1:5501
```

Do not commit `.env` files containing production credentials.

---

## 5. Initialize the Database

From:

```text
backend/
```

run:

```bash
python init_db.py
```

Expected output resembles:

```text
Initialized ees_data_platform.parking_access with 70 spaces,
15 demo employees/vehicles,
50 visitor IDs,
and Data Moon registration.
```

---

# Running the Application

Two local processes are required.

## Terminal 1 — FastAPI Backend

From the project:

```bash
source .venv/bin/activate
cd backend
```

Run:

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8001
```

API:

```text
http://localhost:8001
```

---

## Terminal 2 — Frontend

From the project root:

```bash
python3 -m http.server 5501
```

Application:

```text
http://localhost:5501
```

---

# API Health

Verify the backend with:

```bash
curl http://localhost:8001/api/health
```

Demo identifiers:

```bash
curl http://localhost:8001/api/demo/identifiers
```

---

# Demonstration Workflow

A recommended demonstration sequence is:

### Authorized employee

```text
EMP-1001-A
```

1. Detect at Entry
2. Authorization succeeds
3. Entry barrier opens
4. Space is assigned
5. Occupancy increases
6. Detect at Exit
7. Exit barrier opens
8. Session closes
9. Occupancy decreases

### Parking-suspended employee

```text
EMP-1088-X
```

1. Detect at Entry
2. Employee is identified
3. Normal authorization fails
4. Security Review appears
5. Security may approve an Employee Override or deny access

### Employee on leave

```text
EMP-1098-X
```

Use the same Security override workflow.

### Inactive employee

```text
EMP-1099-X
```

Use the same Security override workflow.

### Visitor

Enter an unknown vehicle identifier.

1. Vehicle remains at closed entry barrier
2. Security request is generated
3. Next available `VIS-####` is shown
4. Security approves or denies access
5. Approved visitor receives the identifier
6. Gate opens
7. Visitor parking session begins

---

# Current Simulation Mode

Version 3.0.0 uses **operator-triggered simulation controls**.

Entry and exit events are initiated through:

```text
Detect at Entry
Detect at Exit
```

This makes demonstrations deterministic and allows individual database, PLC, Security, and HMI states to be inspected during each transaction.

The previous prototype included automated vehicle-cycle behavior. Automatic traffic simulation is intentionally not enabled in the current database-integrated release.

---

# Planned Automatic Simulation Mode

A future release can reintroduce:

```text
MANUAL / AUTO
```

simulation modes.

Auto mode is expected to generate controlled traffic from the PostgreSQL demo population and automatically execute:

```text
Employee arrival
→ identity detection
→ authorization
→ parking
→ dwell interval
→ exit
```

while occasionally generating:

- Parking-suspended employee scenarios
- Employee-on-leave scenarios
- Unknown visitor arrivals
- Security approval scenarios
- Security denial scenarios
- Parking-capacity events
- Gate faults

Manual mode will remain available for deterministic portfolio demonstrations.

---

# Suggested Future Enhancements

Planned EES integration opportunities include:

- Automated vehicle traffic mode
- Shift-change traffic simulation
- Pharma employee schedule integration
- Smart Assistant AI parking queries
- Manufacturing Intelligence parking analytics
- Security dashboard analytics
- Parking demand forecasting
- EV charging spaces
- ADA / reserved space modeling
- Contractor parking
- Delivery vehicle security
- Parking-space reservation
- Badge reader simulation
- License-plate recognition simulation
- PLC ladder/FBD visualization
- Power Grid Sun parking electrical loads
- Camera/security telemetry
- Access anomaly detection
- Multi-lot Pharma campus support

---

# Smart Assistant AI Integration

The future EES Smart Assistant AI will be able to query parking information through the EES data platform.

Examples:

```text
How many employees are currently parked?
```

```text
Which visitors are currently inside the Pharma lot?
```

```text
How many spaces remain?
```

```text
Was EMP-1098-X approved by Security today?
```

```text
Show today's denied parking requests.
```

This will allow Parking Access to become another operational domain available to the EES intelligence layer.

---

# Security Design

The project demonstrates an important distinction between:

```text
Identity
Authorization
Security Override
```

A known employee remains an employee even when their normal parking authorization fails.

A visitor remains a separate temporary identity class.

This prevents employee exceptions from being incorrectly converted into visitor identities and preserves a cleaner audit trail.

---

# Pharmaceutical Manufacturing Context

Although this project is a portfolio-scale digital twin, the design reflects concepts relevant to controlled pharmaceutical manufacturing environments:

- Controlled site access
- Employee identity management
- Visitor management
- Security review
- Auditability
- Restricted-access workflows
- Event traceability
- Separation of operational roles
- Industrial HMI visualization
- Database-backed system state

The simulator does not represent a validated production access-control system and should not be used as one.

---

# Repository Structure

```text
EES-Pharma-Parking-Access-Digital-Twin-v3.0.0/
│
├── index.html
├── style.css
├── app.js
├── config.js
├── README.md
├── LICENSE
│
└── backend/
    ├── main.py
    ├── db.py
    ├── init_db.py
    ├── requirements.txt
    ├── .env.example
    │
    └── sql/
        └── ...
```

---

# Version 3.0.0 Highlights

Version 3.0.0 transitions the original parking PLC demonstration into a database-integrated Pharma facility digital twin.

Major improvements include:

- Pharma employee parking context
- Canonical `ees_data_platform` integration
- `parking_access` PostgreSQL schema
- 70 managed parking spaces
- Seeded employee and vehicle identities
- Security exception workflows
- Employee Security overrides
- Visitor ID pool
- Visitor badge lifecycle
- Database-backed occupancy
- Employee/visitor live roster
- Restart Demo / Reset Lot
- Entry and exit persistence
- EES Data Moon registration
- FastAPI backend
- Three.js parking environment
- Browser virtual PLC
- Industrial HMI
- Access event audit trail

---

# Author

EES Portfolio Universe Exclusive by Jeremiah Lupton (JDL)

# License

This project is licensed under the MIT License.

See:

```text
LICENSE
```

for details.

---

# EES Industrial Universe

The EES Industrial Universe is a connected portfolio of industrial digital twins, data engineering systems, manufacturing intelligence tools, controls simulations, and AI-enabled operational systems.

The long-term objective is to demonstrate how independent operational systems can share a common data platform while preserving their individual domain responsibilities.

```text
Power
Controls
Manufacturing
Supply
Facility Access
Analytics
Artificial Intelligence
        │
        ▼
EES Industrial Universe
```

---

**EES Pharma Parking Access Digital Twin · v3.0.0**

**Secure Access · Virtual PLC · FastAPI · PostgreSQL · Three.js · EES Universe**
