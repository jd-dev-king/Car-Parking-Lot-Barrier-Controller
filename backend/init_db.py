from pathlib import Path
from db import close_pool, open_pool, run_sql_file

BASE = Path(__file__).resolve().parent
open_pool()
try:
    run_sql_file(BASE / "sql" / "001_parking_access_schema.sql")
    run_sql_file(BASE / "sql" / "002_seed_demo_data.sql")
    run_sql_file(BASE / "sql" / "003_register_data_moon.sql")
    print("Initialized ees_data_platform.parking_access with 70 spaces, 15 demo employees/vehicles, 50 visitor IDs, and Data Moon registration.")
finally:
    close_pool()
