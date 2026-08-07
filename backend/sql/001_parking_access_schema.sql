CREATE SCHEMA IF NOT EXISTS parking_access;

CREATE TABLE IF NOT EXISTS parking_access.employees (
    employee_id BIGSERIAL PRIMARY KEY,
    employee_number VARCHAR(32) NOT NULL UNIQUE,
    display_name VARCHAR(120) NOT NULL,
    employment_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE','INACTIVE','LEAVE')),
    parking_authorized BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_access.employee_vehicles (
    vehicle_id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES parking_access.employees(employee_id),
    vehicle_identifier VARCHAR(64) NOT NULL UNIQUE,
    make VARCHAR(50),
    model VARCHAR(50),
    color VARCHAR(30),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_access.parking_spaces (
    space_id BIGSERIAL PRIMARY KEY,
    space_number VARCHAR(8) NOT NULL UNIQUE,
    zone VARCHAR(8) NOT NULL,
    space_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    occupied BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_access.visitor_passes (
    visitor_pass_id BIGSERIAL PRIMARY KEY,
    visitor_code VARCHAR(20) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','ACTIVE','QUARANTINED')),
    issued_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    returned_at TIMESTAMPTZ,
    reusable_after TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parking_access.security_requests (
    security_request_id BIGSERIAL PRIMARY KEY,
    vehicle_identifier VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','DENIED','CANCELLED')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMPTZ,
    security_user VARCHAR(80),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS parking_access.parking_sessions (
    session_id BIGSERIAL PRIMARY KEY,
    vehicle_identifier VARCHAR(64) NOT NULL,
    occupant_type VARCHAR(20) NOT NULL CHECK (occupant_type IN ('EMPLOYEE','VISITOR')),
    employee_vehicle_id BIGINT REFERENCES parking_access.employee_vehicles(vehicle_id),
    visitor_pass_id BIGINT REFERENCES parking_access.visitor_passes(visitor_pass_id),
    security_request_id BIGINT REFERENCES parking_access.security_requests(security_request_id),
    space_id BIGINT NOT NULL REFERENCES parking_access.parking_spaces(space_id),
    entry_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMPTZ,
    session_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (session_status IN ('ACTIVE','CLOSED')),
    CONSTRAINT one_identity_type CHECK (
      (occupant_type='EMPLOYEE' AND employee_vehicle_id IS NOT NULL AND visitor_pass_id IS NULL)
      OR
      (occupant_type='VISITOR' AND visitor_pass_id IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_vehicle_session
ON parking_access.parking_sessions(vehicle_identifier)
WHERE session_status='ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_space_session
ON parking_access.parking_sessions(space_id)
WHERE session_status='ACTIVE';

CREATE TABLE IF NOT EXISTS parking_access.access_events (
    event_id BIGSERIAL PRIMARY KEY,
    event_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    gate_id VARCHAR(30) NOT NULL,
    vehicle_identifier VARCHAR(64),
    visitor_pass_id BIGINT REFERENCES parking_access.visitor_passes(visitor_pass_id),
    event_type VARCHAR(40) NOT NULL,
    access_result VARCHAR(20) NOT NULL,
    reason TEXT
);

CREATE TABLE IF NOT EXISTS parking_access.security_actions (
    security_action_id BIGSERIAL PRIMARY KEY,
    security_request_id BIGINT NOT NULL REFERENCES parking_access.security_requests(security_request_id),
    action_type VARCHAR(30) NOT NULL,
    security_user VARCHAR(80) NOT NULL,
    action_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_employee_vehicle_identifier ON parking_access.employee_vehicles(vehicle_identifier);
CREATE INDEX IF NOT EXISTS idx_security_requests_status ON parking_access.security_requests(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON parking_access.parking_sessions(session_status, entry_time);
CREATE INDEX IF NOT EXISTS idx_visitor_pass_reuse ON parking_access.visitor_passes(status, reusable_after);
CREATE INDEX IF NOT EXISTS idx_access_events_time ON parking_access.access_events(event_time DESC);
