import os
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Copy .env.example to .env and set the ees_data_platform connection URL.")

pool = ConnectionPool(
    conninfo=DATABASE_URL,
    min_size=1,
    max_size=8,
    kwargs={"row_factory": dict_row},
    open=False,
)

@contextmanager
def connection():
    with pool.connection() as conn:
        yield conn


def open_pool():
    pool.open(wait=True)


def close_pool():
    pool.close()


def run_sql_file(path: str | Path):
    sql = Path(path).read_text(encoding="utf-8")
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
