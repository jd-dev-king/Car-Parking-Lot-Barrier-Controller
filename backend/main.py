import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from db import close_pool, connection, open_pool, run_sql_file

BASE_DIR = Path(__file__).resolve().parent


def normalize_vehicle(value: str) -> str:
    return " ".join(value.strip().upper().split())


class VehicleRequest(BaseModel):
    vehicle_identifier: str = Field(min_length=2, max_length=64)


class SecurityDecision(BaseModel):
    security_user: str = Field(default="SECURITY-DEMO", min_length=2, max_length=80)
    notes: str | None = Field(default=None, max_length=500)


@asynccontextmanager
async def lifespan(app: FastAPI):
    open_pool()
    yield
    close_pool()


app = FastAPI(title="EES Pharma Parking Access API", version="3.0.4", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def log_event(cur, gate_id, vehicle_identifier, event_type, result, reason=None, visitor_pass_id=None):
    cur.execute(
        """
        INSERT INTO parking_access.access_events
        (gate_id, vehicle_identifier, visitor_pass_id, event_type, access_result, reason)
        VALUES (%s,%s,%s,%s,%s,%s)
        """,
        (gate_id, vehicle_identifier, visitor_pass_id, event_type, result, reason),
    )


def allocate_space(cur):
    cur.execute(
        """
        SELECT space_id, space_number
        FROM parking_access.parking_spaces
        WHERE occupied=FALSE
        ORDER BY zone, space_number
        FOR UPDATE SKIP LOCKED
        LIMIT 1
        """
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=409, detail="Parking lot is full")
    return row


@app.get("/api/health")
def health():
    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT current_database() AS database, CURRENT_TIMESTAMP AS server_time")
        row = cur.fetchone()
        return {"ok": True, **row}


@app.post("/api/admin/init")
def initialize_database():
    run_sql_file(BASE_DIR / "sql" / "001_parking_access_schema.sql")
    run_sql_file(BASE_DIR / "sql" / "002_seed_demo_data.sql")
    return {"ok": True, "message": "parking_access schema and demo data initialized"}


@app.get("/api/parking/status")
def parking_status():
    with connection() as conn, conn.cursor() as cur:
        cur.execute("UPDATE parking_access.visitor_passes SET status='AVAILABLE', reusable_after=NULL, updated_at=CURRENT_TIMESTAMP WHERE status='QUARANTINED' AND reusable_after <= CURRENT_TIMESTAMP")
        cur.execute("SELECT COUNT(*) AS capacity FROM parking_access.parking_spaces")
        capacity = cur.fetchone()["capacity"]
        cur.execute("""
            SELECT
              COUNT(*) FILTER (WHERE occupant_type='EMPLOYEE') AS employees,
              COUNT(*) FILTER (WHERE occupant_type='VISITOR') AS visitors,
              COUNT(*) AS occupied
            FROM parking_access.parking_sessions
            WHERE session_status='ACTIVE'
        """)
        counts = cur.fetchone()
        cur.execute("SELECT COUNT(*) AS available FROM parking_access.visitor_passes WHERE status='AVAILABLE'")
        pass_count = cur.fetchone()["available"]
        cur.execute("""
            SELECT
                ps.vehicle_identifier,
                ps.occupant_type,
                sp.space_number,
                ps.entry_time,
                vp.visitor_code,
                e.employee_number,
                e.display_name
            FROM parking_access.parking_sessions ps
            JOIN parking_access.parking_spaces sp
                ON sp.space_id = ps.space_id
            LEFT JOIN parking_access.visitor_passes vp
                ON vp.visitor_pass_id = ps.visitor_pass_id
            LEFT JOIN parking_access.employee_vehicles ev
                ON ev.vehicle_id = ps.employee_vehicle_id
            LEFT JOIN parking_access.employees e
                ON e.employee_id = ev.employee_id
            WHERE ps.session_status='ACTIVE'
            ORDER BY ps.occupant_type, sp.zone, sp.space_number
        """)
        sessions = cur.fetchall()
        occupied = counts["occupied"]
        conn.commit()
        return {
            "capacity": capacity,
            "occupied": occupied,
            "employees": counts["employees"],
            "visitors": counts["visitors"],
            "remaining": capacity - occupied,
            "full": occupied >= capacity,
            "empty": occupied == 0,
            "visitor_pool_available": pass_count,
            "active_sessions": sessions,
        }


@app.post("/api/admin/reset-demo")
def reset_demo():
    """Return the simulator to an empty-lot demo state without deleting audit history."""
    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS count FROM parking_access.parking_sessions WHERE session_status='ACTIVE'")
        active_count = cur.fetchone()["count"]

        cur.execute("""
            UPDATE parking_access.parking_sessions
            SET session_status='CLOSED', exit_time=CURRENT_TIMESTAMP
            WHERE session_status='ACTIVE'
        """)
        cur.execute("""
            UPDATE parking_access.parking_spaces
            SET occupied=FALSE, updated_at=CURRENT_TIMESTAMP
        """)
        cur.execute("""
            UPDATE parking_access.visitor_passes
            SET status='AVAILABLE', issued_at=NULL, activated_at=NULL,
                returned_at=NULL, reusable_after=NULL, updated_at=CURRENT_TIMESTAMP
        """)
        cur.execute("""
            UPDATE parking_access.security_requests
            SET status='CANCELLED', decided_at=CURRENT_TIMESTAMP,
                security_user=COALESCE(security_user, 'SYSTEM-DEMO-RESET'),
                notes=CASE
                    WHEN notes IS NULL OR notes='' THEN 'Cancelled by demo restart'
                    ELSE notes || ' | Cancelled by demo restart'
                END
            WHERE status='PENDING'
        """)
        log_event(
            cur,
            "SYSTEM",
            None,
            "DEMO_RESET",
            "GRANTED",
            f"Demo restarted; {active_count} active parking session(s) closed and lot reset to empty.",
        )
        conn.commit()
        return {
            "ok": True,
            "closed_sessions": active_count,
            "message": "Parking demo reset to an empty lot. Audit history preserved.",
        }


@app.get("/api/demo/identifiers")
def demo_identifiers():
    with connection() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT e.employee_number, e.display_name, e.employment_status,
                   e.parking_authorized, ev.vehicle_identifier, ev.make, ev.model, ev.color
            FROM parking_access.employees e
            JOIN parking_access.employee_vehicles ev ON ev.employee_id=e.employee_id
            ORDER BY e.employee_number
        """)
        rows = cur.fetchall()
        cur.execute("""
            SELECT visitor_code
            FROM parking_access.visitor_passes
            WHERE status='AVAILABLE'
            ORDER BY visitor_code
            LIMIT 1
        """)
        next_pass = cur.fetchone()
        return {
            "authorized": [r for r in rows if r["employment_status"] == "ACTIVE" and r["parking_authorized"]],
            "denied_examples": [r for r in rows if r["employment_status"] != "ACTIVE" or not r["parking_authorized"]],
            "unknown_visitor_examples": ["VISITOR-DEMO-01", "DELIVERY-TRUCK-07", "CONTRACTOR-302"],
            "next_available_visitor_code": next_pass["visitor_code"] if next_pass else None,
        }


def employee_record_for_vehicle(cur, vehicle):
    cur.execute("""
        SELECT ev.vehicle_id, e.employee_number, e.display_name,
               e.employment_status, e.parking_authorized
        FROM parking_access.employee_vehicles ev
        JOIN parking_access.employees e ON e.employee_id=ev.employee_id
        WHERE ev.vehicle_identifier=%s
          AND ev.active=TRUE
        LIMIT 1
    """, (vehicle,))
    return cur.fetchone()


def employee_exception_reason(employee):
    if not employee:
        return None
    if employee["employment_status"] == "LEAVE":
        return "Employee is currently on leave"
    if employee["employment_status"] != "ACTIVE":
        return "Employee record is inactive"
    if not employee["parking_authorized"]:
        return "Parking authorization is suspended"
    return None


@app.post("/api/access/entry")
def entry(req: VehicleRequest):
    vehicle = normalize_vehicle(req.vehicle_identifier)
    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT session_id FROM parking_access.parking_sessions WHERE vehicle_identifier=%s AND session_status='ACTIVE'", (vehicle,))
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Vehicle already has an active parking session")

        employee = employee_record_for_vehicle(cur, vehicle)
        employee_exception = employee_exception_reason(employee)

        if employee and not employee_exception:
            space = allocate_space(cur)
            cur.execute("UPDATE parking_access.parking_spaces SET occupied=TRUE, updated_at=CURRENT_TIMESTAMP WHERE space_id=%s", (space["space_id"],))
            cur.execute("""
                INSERT INTO parking_access.parking_sessions
                (vehicle_identifier, occupant_type, employee_vehicle_id, space_id)
                VALUES (%s,'EMPLOYEE',%s,%s)
                RETURNING session_id, entry_time
            """, (vehicle, employee["vehicle_id"], space["space_id"]))
            session = cur.fetchone()
            log_event(cur, "EMPLOYEE_ENTRY", vehicle, "EMPLOYEE_RECOGNIZED", "GRANTED", f"Authorized employee {employee['employee_number']}")
            conn.commit()
            return {
                "decision": "GRANTED", "occupant_type": "EMPLOYEE", "vehicle_identifier": vehicle,
                "employee_number": employee["employee_number"], "display_name": employee["display_name"],
                "spot_number": space["space_number"], "session_id": session["session_id"], "entry_time": session["entry_time"]
            }

        cur.execute("SELECT security_request_id, requested_at FROM parking_access.security_requests WHERE vehicle_identifier=%s AND status='PENDING' ORDER BY requested_at DESC LIMIT 1", (vehicle,))
        pending = cur.fetchone()
        if not pending:
            cur.execute("INSERT INTO parking_access.security_requests (vehicle_identifier) VALUES (%s) RETURNING security_request_id, requested_at", (vehicle,))
            pending = cur.fetchone()
        cur.execute("""
            SELECT visitor_code
            FROM parking_access.visitor_passes
            WHERE status='AVAILABLE'
            ORDER BY visitor_code
            LIMIT 1
        """)
        next_pass = cur.fetchone()
        review_type = "EMPLOYEE_EXCEPTION" if employee else "VISITOR_UNKNOWN"
        review_reason = employee_exception or "Unknown vehicle; Security approval required"
        event_type = "EMPLOYEE_EXCEPTION" if employee else "UNKNOWN_VEHICLE"
        log_event(cur, "EMPLOYEE_ENTRY", vehicle, event_type, "PENDING", review_reason)
        conn.commit()
        return {
            "decision": "SECURITY_REVIEW",
            "review_type": review_type,
            "review_reason": review_reason,
            "vehicle_identifier": vehicle,
            "employee_number": employee["employee_number"] if employee else None,
            "display_name": employee["display_name"] if employee else None,
            "employment_status": employee["employment_status"] if employee else None,
            "parking_authorized": employee["parking_authorized"] if employee else None,
            "next_visitor_code": None if employee else (next_pass["visitor_code"] if next_pass else None),
            **pending,
        }


@app.get("/api/security/requests")
def security_requests(status: str = Query(default="PENDING")):
    status = status.upper()
    with connection() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT security_request_id, vehicle_identifier, status, requested_at, decided_at, security_user, notes
            FROM parking_access.security_requests
            WHERE status=%s
            ORDER BY requested_at
            LIMIT 50
        """, (status,))
        requests = cur.fetchall()
        cur.execute("""
            SELECT visitor_code
            FROM parking_access.visitor_passes
            WHERE status='AVAILABLE'
            ORDER BY visitor_code
            LIMIT 1
        """)
        next_pass = cur.fetchone()
        next_code = next_pass["visitor_code"] if next_pass else None
        for request in requests:
            employee = employee_record_for_vehicle(cur, request["vehicle_identifier"])
            exception = employee_exception_reason(employee)
            if employee and exception:
                request["review_type"] = "EMPLOYEE_EXCEPTION"
                request["review_reason"] = exception
                request["employee_number"] = employee["employee_number"]
                request["display_name"] = employee["display_name"]
                request["employment_status"] = employee["employment_status"]
                request["parking_authorized"] = employee["parking_authorized"]
                request["next_visitor_code"] = None
            else:
                request["review_type"] = "VISITOR_UNKNOWN"
                request["review_reason"] = "Unknown vehicle; Security approval required"
                request["next_visitor_code"] = next_code
        return requests


@app.post("/api/security/requests/{request_id}/approve")
def approve_security_request(request_id: int, decision: SecurityDecision):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM parking_access.security_requests WHERE security_request_id=%s FOR UPDATE", (request_id,))
        request = cur.fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="Security request not found")
        if request["status"] != "PENDING":
            raise HTTPException(status_code=409, detail=f"Security request already {request['status'].lower()}")

        vehicle_identifier = request["vehicle_identifier"]
        employee = employee_record_for_vehicle(cur, vehicle_identifier)
        employee_exception = employee_exception_reason(employee)
        space = allocate_space(cur)

        # Known employee exceptions may be admitted by Security as a temporary override.
        # They remain EMPLOYEE sessions and never consume a visitor credential.
        if employee and employee_exception:
            cur.execute("UPDATE parking_access.parking_spaces SET occupied=TRUE, updated_at=CURRENT_TIMESTAMP WHERE space_id=%s", (space["space_id"],))
            cur.execute("UPDATE parking_access.security_requests SET status='APPROVED', decided_at=CURRENT_TIMESTAMP, security_user=%s, notes=%s WHERE security_request_id=%s", (decision.security_user, decision.notes, request_id))
            cur.execute("""
                INSERT INTO parking_access.parking_sessions
                (vehicle_identifier, occupant_type, employee_vehicle_id, security_request_id, space_id)
                VALUES (%s,'EMPLOYEE',%s,%s,%s)
                RETURNING session_id, entry_time
            """, (vehicle_identifier, employee["vehicle_id"], request_id, space["space_id"]))
            session = cur.fetchone()
            notes = decision.notes or f"Security override approved: {employee_exception}"
            cur.execute("INSERT INTO parking_access.security_actions (security_request_id, action_type, security_user, notes) VALUES (%s,'EMPLOYEE_OVERRIDE',%s,%s)", (request_id, decision.security_user, notes))
            log_event(cur, "EMPLOYEE_ENTRY", vehicle_identifier, "EMPLOYEE_OVERRIDE_APPROVED", "GRANTED", notes)
            conn.commit()
            return {
                "decision": "GRANTED",
                "approval_type": "EMPLOYEE_OVERRIDE",
                "occupant_type": "EMPLOYEE",
                "vehicle_identifier": vehicle_identifier,
                "employee_number": employee["employee_number"],
                "display_name": employee["display_name"],
                "override_reason": employee_exception,
                "spot_number": space["space_number"],
                "session_id": session["session_id"],
                "entry_time": session["entry_time"],
            }

        # Unknown vehicle: normal visitor workflow with pooled VIS-#### credential.
        cur.execute("UPDATE parking_access.visitor_passes SET status='AVAILABLE', reusable_after=NULL, updated_at=CURRENT_TIMESTAMP WHERE status='QUARANTINED' AND reusable_after <= CURRENT_TIMESTAMP")
        cur.execute("SELECT visitor_pass_id, visitor_code FROM parking_access.visitor_passes WHERE status='AVAILABLE' ORDER BY visitor_code FOR UPDATE SKIP LOCKED LIMIT 1")
        visitor_pass = cur.fetchone()
        if not visitor_pass:
            raise HTTPException(status_code=409, detail="No visitor IDs are currently available")

        cur.execute("UPDATE parking_access.visitor_passes SET status='ACTIVE', issued_at=CURRENT_TIMESTAMP, activated_at=CURRENT_TIMESTAMP, returned_at=NULL, reusable_after=NULL, updated_at=CURRENT_TIMESTAMP WHERE visitor_pass_id=%s", (visitor_pass["visitor_pass_id"],))
        cur.execute("UPDATE parking_access.parking_spaces SET occupied=TRUE, updated_at=CURRENT_TIMESTAMP WHERE space_id=%s", (space["space_id"],))
        cur.execute("UPDATE parking_access.security_requests SET status='APPROVED', decided_at=CURRENT_TIMESTAMP, security_user=%s, notes=%s WHERE security_request_id=%s", (decision.security_user, decision.notes, request_id))
        cur.execute("""
            INSERT INTO parking_access.parking_sessions
            (vehicle_identifier, occupant_type, visitor_pass_id, security_request_id, space_id)
            VALUES (%s,'VISITOR',%s,%s,%s)
            RETURNING session_id, entry_time
        """, (vehicle_identifier, visitor_pass["visitor_pass_id"], request_id, space["space_id"]))
        session = cur.fetchone()
        cur.execute("INSERT INTO parking_access.security_actions (security_request_id, action_type, security_user, notes) VALUES (%s,'BUZZ_IN',%s,%s)", (request_id, decision.security_user, decision.notes))
        log_event(cur, "EMPLOYEE_ENTRY", vehicle_identifier, "VISITOR_APPROVED", "GRANTED", f"Visitor pass {visitor_pass['visitor_code']} issued", visitor_pass["visitor_pass_id"])
        conn.commit()
        return {
            "decision": "GRANTED", "approval_type": "VISITOR", "occupant_type": "VISITOR", "vehicle_identifier": vehicle_identifier,
            "visitor_pass_code": visitor_pass["visitor_code"], "spot_number": space["space_number"],
            "session_id": session["session_id"], "entry_time": session["entry_time"]
        }


@app.post("/api/security/requests/{request_id}/deny")
def deny_visitor(request_id: int, decision: SecurityDecision):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT vehicle_identifier, status FROM parking_access.security_requests WHERE security_request_id=%s FOR UPDATE", (request_id,))
        request = cur.fetchone()
        if not request:
            raise HTTPException(status_code=404, detail="Security request not found")
        if request["status"] != "PENDING":
            raise HTTPException(status_code=409, detail=f"Security request already {request['status'].lower()}")
        cur.execute("UPDATE parking_access.security_requests SET status='DENIED', decided_at=CURRENT_TIMESTAMP, security_user=%s, notes=%s WHERE security_request_id=%s", (decision.security_user, decision.notes, request_id))
        cur.execute("INSERT INTO parking_access.security_actions (security_request_id, action_type, security_user, notes) VALUES (%s,'DENY',%s,%s)", (request_id, decision.security_user, decision.notes))
        employee = employee_record_for_vehicle(cur, request["vehicle_identifier"])
        exception = employee_exception_reason(employee)
        log_event(cur, "EMPLOYEE_ENTRY", request["vehicle_identifier"], "EMPLOYEE_OVERRIDE_DENIED" if employee and exception else "VISITOR_DENIED", "DENIED", decision.notes or exception)
        conn.commit()
        return {"decision": "DENIED", "vehicle_identifier": request["vehicle_identifier"]}


@app.post("/api/access/exit")
def exit_vehicle(req: VehicleRequest):
    vehicle = normalize_vehicle(req.vehicle_identifier)
    with connection() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT ps.session_id, ps.occupant_type, ps.space_id, sp.space_number,
                   ps.visitor_pass_id, vp.visitor_code
            FROM parking_access.parking_sessions ps
            JOIN parking_access.parking_spaces sp ON sp.space_id=ps.space_id
            LEFT JOIN parking_access.visitor_passes vp ON vp.visitor_pass_id=ps.visitor_pass_id
            WHERE ps.vehicle_identifier=%s AND ps.session_status='ACTIVE'
            FOR UPDATE OF ps
        """, (vehicle,))
        session = cur.fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="No active parking session found for this vehicle")

        cur.execute("UPDATE parking_access.parking_sessions SET session_status='CLOSED', exit_time=CURRENT_TIMESTAMP WHERE session_id=%s", (session["session_id"],))
        cur.execute("UPDATE parking_access.parking_spaces SET occupied=FALSE, updated_at=CURRENT_TIMESTAMP WHERE space_id=%s", (session["space_id"],))
        reusable_after = None
        if session["occupant_type"] == "VISITOR":
            cur.execute("""
                UPDATE parking_access.visitor_passes
                SET status='QUARANTINED', returned_at=CURRENT_TIMESTAMP,
                    reusable_after=CURRENT_TIMESTAMP + INTERVAL '24 hours', updated_at=CURRENT_TIMESTAMP
                WHERE visitor_pass_id=%s
                RETURNING reusable_after
            """, (session["visitor_pass_id"],))
            reusable_after = cur.fetchone()["reusable_after"]
        log_event(cur, "EMPLOYEE_EXIT", vehicle, "VEHICLE_EXIT", "GRANTED", f"Space {session['space_number']} released", session["visitor_pass_id"])
        conn.commit()
        return {
            "decision": "GRANTED", "vehicle_identifier": vehicle, "occupant_type": session["occupant_type"],
            "spot_number": session["space_number"], "visitor_pass_code": session["visitor_code"],
            "reusable_after": reusable_after
        }


@app.get("/api/events")
def events(limit: int = Query(default=50, ge=1, le=200)):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM parking_access.access_events ORDER BY event_time DESC LIMIT %s", (limit,))
        return cur.fetchall()
