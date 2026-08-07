INSERT INTO parking_access.employees (employee_number, display_name, employment_status, parking_authorized)
VALUES
('EES-PH-1001','Avery Chen','ACTIVE',TRUE),
('EES-PH-1002','Morgan Reyes','ACTIVE',TRUE),
('EES-PH-1003','Jordan Patel','ACTIVE',TRUE),
('EES-PH-1099','Inactive Demo','INACTIVE',FALSE)
ON CONFLICT (employee_number) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  employment_status=EXCLUDED.employment_status,
  parking_authorized=EXCLUDED.parking_authorized,
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO parking_access.employee_vehicles (employee_id, vehicle_identifier, make, model, color, active)
SELECT employee_id, 'EMP-1001-A', 'Demo', 'Sedan', 'Blue', TRUE FROM parking_access.employees WHERE employee_number='EES-PH-1001'
ON CONFLICT (vehicle_identifier) DO NOTHING;
INSERT INTO parking_access.employee_vehicles (employee_id, vehicle_identifier, make, model, color, active)
SELECT employee_id, 'EMP-1002-A', 'Demo', 'SUV', 'Silver', TRUE FROM parking_access.employees WHERE employee_number='EES-PH-1002'
ON CONFLICT (vehicle_identifier) DO NOTHING;
INSERT INTO parking_access.employee_vehicles (employee_id, vehicle_identifier, make, model, color, active)
SELECT employee_id, 'EMP-1003-A', 'Demo', 'Hatchback', 'Green', TRUE FROM parking_access.employees WHERE employee_number='EES-PH-1003'
ON CONFLICT (vehicle_identifier) DO NOTHING;
INSERT INTO parking_access.employee_vehicles (employee_id, vehicle_identifier, make, model, color, active)
SELECT employee_id, 'EMP-1099-X', 'Demo', 'Sedan', 'Black', TRUE FROM parking_access.employees WHERE employee_number='EES-PH-1099'
ON CONFLICT (vehicle_identifier) DO NOTHING;

INSERT INTO parking_access.parking_spaces (space_number, zone)
SELECT zone || LPAD(n::text, 2, '0'), zone
FROM unnest(ARRAY['A','B','C','D','E','F','G']) AS zone
CROSS JOIN generate_series(1,10) AS n
ON CONFLICT (space_number) DO NOTHING;

INSERT INTO parking_access.visitor_passes (visitor_code)
SELECT 'VIS-' || LPAD(n::text, 4, '0')
FROM generate_series(1,50) AS n
ON CONFLICT (visitor_code) DO NOTHING;
