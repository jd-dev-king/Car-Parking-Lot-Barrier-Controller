-- Register the Pharma Parking Access Digital Twin with the canonical EES Data Moon registry.
-- Safe to run repeatedly.

INSERT INTO ees_registry.systems (
    system_id, system_name, system_key, domain, system_type,
    description, status, data_role, primary_database, owner_name
)
VALUES (
    'e8100000-0000-4000-8000-000000000001'::uuid,
    'EES Pharma Parking Access Digital Twin',
    'ees-pharma-parking-access',
    'facility-access',
    'industrial-access-digital-twin',
    'Employee and visitor parking access-control digital twin for the EES Pharma campus, including PLC/HMI barrier control, security approvals, sessions, visitor badges, and access audit events.',
    'active',
    'parking-access-system-of-record',
    'ees_data_platform',
    'jeremiahlupton'
)
ON CONFLICT (system_key) DO UPDATE SET
    system_name=EXCLUDED.system_name,
    domain=EXCLUDED.domain,
    system_type=EXCLUDED.system_type,
    description=EXCLUDED.description,
    status=EXCLUDED.status,
    data_role=EXCLUDED.data_role,
    primary_database=EXCLUDED.primary_database,
    owner_name=EXCLUDED.owner_name,
    updated_at=NOW();

WITH s AS (
  SELECT system_id FROM ees_registry.systems
  WHERE system_key='ees-pharma-parking-access'
), d(dataset_id,dataset_name,dataset_key,object_name,classification,refresh_mode,description) AS (
  VALUES
  ('e8200000-0000-4000-8000-000000000001'::uuid,'Parking Employees','parking_access.employees','employees','master','event','Pharma employee parking authorization master data.'),
  ('e8200000-0000-4000-8000-000000000002'::uuid,'Employee Vehicles','parking_access.employee_vehicles','employee_vehicles','master','event','Registered employee vehicles used for automatic access decisions.'),
  ('e8200000-0000-4000-8000-000000000003'::uuid,'Parking Spaces','parking_access.parking_spaces','parking_spaces','operational','event','Seventy-space Pharma employee parking-lot inventory and occupancy state.'),
  ('e8200000-0000-4000-8000-000000000004'::uuid,'Parking Sessions','parking_access.parking_sessions','parking_sessions','operational','event','Employee and visitor parking entry/exit sessions.'),
  ('e8200000-0000-4000-8000-000000000005'::uuid,'Visitor Passes','parking_access.visitor_passes','visitor_passes','security','event','Reusable visitor ID pool with quarantine and reuse timing.'),
  ('e8200000-0000-4000-8000-000000000006'::uuid,'Security Requests','parking_access.security_requests','security_requests','security','event','Pending and completed Security approval requests for unknown vehicles.'),
  ('e8200000-0000-4000-8000-000000000007'::uuid,'Security Actions','parking_access.security_actions','security_actions','audit','event','Security approval and denial action history.'),
  ('e8200000-0000-4000-8000-000000000008'::uuid,'Parking Access Events','parking_access.access_events','access_events','audit','event','Canonical parking gate and access decision audit trail.')
)
INSERT INTO ees_registry.datasets (
    dataset_id, system_id, dataset_name, dataset_key, domain,
    database_name, schema_name, object_name, object_type, source_type,
    classification, refresh_mode, description, is_active
)
SELECT d.dataset_id,s.system_id,d.dataset_name,d.dataset_key,'facility-access',
       'ees_data_platform','parking_access',d.object_name,'table','postgresql',
       d.classification,d.refresh_mode,d.description,TRUE
FROM s CROSS JOIN d
ON CONFLICT (system_id,dataset_key) DO UPDATE SET
    dataset_name=EXCLUDED.dataset_name,
    database_name=EXCLUDED.database_name,
    schema_name=EXCLUDED.schema_name,
    object_name=EXCLUDED.object_name,
    object_type=EXCLUDED.object_type,
    classification=EXCLUDED.classification,
    refresh_mode=EXCLUDED.refresh_mode,
    description=EXCLUDED.description,
    is_active=TRUE,
    updated_at=NOW();
