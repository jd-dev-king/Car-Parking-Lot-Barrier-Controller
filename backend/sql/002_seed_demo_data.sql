-- EES Pharma Parking Access Digital Twin v3.0.0
-- Repeatable demonstration seed data for ees_data_platform.parking_access.
-- The seed intentionally creates identities/vehicles and parking capacity,
-- but does not create active parking sessions so entry/exit workflows can
-- be demonstrated cleanly from the HMI.

INSERT INTO parking_access.employees
(employee_number, display_name, employment_status, parking_authorized)
VALUES
('EES-PH-1001','Avery Chen','ACTIVE',TRUE),
('EES-PH-1002','Morgan Reyes','ACTIVE',TRUE),
('EES-PH-1003','Jordan Patel','ACTIVE',TRUE),
('EES-PH-1004','Taylor Brooks','ACTIVE',TRUE),
('EES-PH-1005','Cameron Diaz','ACTIVE',TRUE),
('EES-PH-1006','Riley Thompson','ACTIVE',TRUE),
('EES-PH-1007','Casey Nguyen','ACTIVE',TRUE),
('EES-PH-1008','Drew Wallace','ACTIVE',TRUE),
('EES-PH-1009','Alexis Martin','ACTIVE',TRUE),
('EES-PH-1010','Samir Shah','ACTIVE',TRUE),
('EES-PH-1011','Jamie Rivera','ACTIVE',TRUE),
('EES-PH-1012','Devon Clarke','ACTIVE',TRUE),
('EES-PH-1088','Parking Suspended Demo','ACTIVE',FALSE),
('EES-PH-1098','Leave Demo','LEAVE',TRUE),
('EES-PH-1099','Inactive Demo','INACTIVE',FALSE)
ON CONFLICT (employee_number) DO UPDATE SET
  display_name=EXCLUDED.display_name,
  employment_status=EXCLUDED.employment_status,
  parking_authorized=EXCLUDED.parking_authorized,
  updated_at=CURRENT_TIMESTAMP;

WITH vehicles(employee_number, vehicle_identifier, make, model, color, active) AS (
  VALUES
  ('EES-PH-1001','EMP-1001-A','Honda','Accord','Blue',TRUE),
  ('EES-PH-1002','EMP-1002-A','Toyota','RAV4','Silver',TRUE),
  ('EES-PH-1003','EMP-1003-A','Subaru','Impreza','Green',TRUE),
  ('EES-PH-1004','EMP-1004-A','Ford','Escape','White',TRUE),
  ('EES-PH-1005','EMP-1005-A','Hyundai','Tucson','Black',TRUE),
  ('EES-PH-1006','EMP-1006-A','Kia','Sportage','Gray',TRUE),
  ('EES-PH-1007','EMP-1007-A','Mazda','CX-5','Red',TRUE),
  ('EES-PH-1008','EMP-1008-A','Nissan','Altima','Blue',TRUE),
  ('EES-PH-1009','EMP-1009-A','Volkswagen','Jetta','White',TRUE),
  ('EES-PH-1010','EMP-1010-A','Tesla','Model 3','Black',TRUE),
  ('EES-PH-1011','EMP-1011-A','Chevrolet','Equinox','Silver',TRUE),
  ('EES-PH-1012','EMP-1012-A','Honda','CR-V','Gray',TRUE),
  ('EES-PH-1088','EMP-1088-X','Demo','Sedan','Orange',TRUE),
  ('EES-PH-1098','EMP-1098-X','Demo','SUV','Purple',TRUE),
  ('EES-PH-1099','EMP-1099-X','Demo','Sedan','Black',TRUE)
)
INSERT INTO parking_access.employee_vehicles
(employee_id, vehicle_identifier, make, model, color, active)
SELECT e.employee_id, v.vehicle_identifier, v.make, v.model, v.color, v.active
FROM vehicles v
JOIN parking_access.employees e ON e.employee_number=v.employee_number
ON CONFLICT (vehicle_identifier) DO UPDATE SET
  employee_id=EXCLUDED.employee_id,
  make=EXCLUDED.make,
  model=EXCLUDED.model,
  color=EXCLUDED.color,
  active=EXCLUDED.active,
  updated_at=CURRENT_TIMESTAMP;

-- Seven zones, ten spaces each = 70 total spaces.
INSERT INTO parking_access.parking_spaces (space_number, zone, space_type)
SELECT
  zone || LPAD(n::text, 2, '0'),
  zone,
  CASE
    WHEN zone='A' AND n IN (1,2,3,4) THEN 'ACCESSIBLE'
    WHEN zone='G' AND n IN (7,8,9,10) THEN 'EV'
    WHEN zone='A' AND n IN (9,10) THEN 'VISITOR'
    ELSE 'STANDARD'
  END
FROM unnest(ARRAY['A','B','C','D','E','F','G']) AS zone
CROSS JOIN generate_series(1,10) AS n
ON CONFLICT (space_number) DO UPDATE SET
  zone=EXCLUDED.zone,
  space_type=EXCLUDED.space_type,
  updated_at=CURRENT_TIMESTAMP;

-- Reusable visitor badge pool.
INSERT INTO parking_access.visitor_passes (visitor_code)
SELECT 'VIS-' || LPAD(n::text, 4, '0')
FROM generate_series(1,50) AS n
ON CONFLICT (visitor_code) DO NOTHING;
