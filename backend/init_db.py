from pathlib import Path
from db import close_pool, open_pool, run_sql_file

BASE = Path(__file__).resolve().parent
open_pool()
try:
    run_sql_file(BASE / "sql" / "001_parking_access_schema.sql")
    run_sql_file(BASE / "sql" / "002_seed_demo_data.sql")
    print("Initialized ees_data_platform.parking_access with 70 spaces, demo employees, and 50 visitor IDs.")
finally:
    close_pool()
