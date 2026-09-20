from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from typing import Generator, Any

import duckdb
from app.settings import settings

_write_lock = asyncio.Lock()


def get_db_path(custom_path: str | Path | None = None) -> str:
    """Resolve database path from arguments or application settings."""
    if custom_path:
        return str(custom_path)
    return str(settings.server.db_path)


def _load_spatial_extension(con: duckdb.DuckDBPyConnection) -> None:
    """Ensure DuckDB spatial extension is loaded for spatial operations."""
    try:
        con.execute("LOAD spatial;")
    except Exception:
        try:
            con.execute("INSTALL spatial; LOAD spatial;")
        except Exception:
            pass


def _connect_with_retry(path: str, read_only: bool = True, max_retries: int = 5) -> duckdb.DuckDBPyConnection:
    """Connect to DuckDB with retry backoff to tolerate Windows transient file locks."""
    import time
    for attempt in range(max_retries):
        try:
            return duckdb.connect(path, read_only=read_only)
        except duckdb.IOException:
            if attempt == max_retries - 1:
                raise
            time.sleep(0.05 * (2 ** attempt))
    return duckdb.connect(path, read_only=read_only)


@contextmanager
def _cursor(db_path: str | Path | None = None, read_only: bool = True) -> Generator[duckdb.DuckDBPyConnection, None, None]:
    """Provide a DuckDB cursor for query execution."""
    path = get_db_path(db_path)
    con = _connect_with_retry(path, read_only=read_only)
    _load_spatial_extension(con)
    try:
        yield con
    finally:
        con.close()


@contextmanager
def read_cursor(db_path: str | Path | None = None) -> Generator[duckdb.DuckDBPyConnection, None, None]:
    """Provide a read-only DuckDB cursor for query execution."""
    with _cursor(db_path, read_only=True) as con:
        yield con


@contextmanager
def write_cursor(db_path: str | Path | None = None) -> Generator[duckdb.DuckDBPyConnection, None, None]:
    """Provide a read-write DuckDB cursor for synchronous mutations."""
    with _cursor(db_path, read_only=False) as con:
        yield con


@asynccontextmanager
async def write_connection(db_path: str | Path | None = None) -> Generator[duckdb.DuckDBPyConnection, None, None]:
    """Provide an exclusive write connection wrapped in an asyncio lock."""
    path = get_db_path(db_path)
    async with _write_lock:
        con = await asyncio.to_thread(_connect_with_retry, path, False)
        await asyncio.to_thread(_load_spatial_extension, con)
        try:
            yield con
        finally:
            await asyncio.to_thread(con.close)


def execute_schema(db_path: str | Path | None = None, schema_file: str | Path | None = None) -> None:
    """Execute data/schema.sql to initialize or verify database schema."""
    path = get_db_path(db_path)
    schema_path = Path(schema_file) if schema_file else Path(__file__).resolve().parent.parent.parent / "data" / "schema.sql"
    if not schema_path.exists():
        raise FileNotFoundError(f"Schema file not found at {schema_path}")

    sql = schema_path.read_text(encoding="utf-8")
    con = duckdb.connect(path, read_only=False)
    _load_spatial_extension(con)
    try:
        con.execute(sql)
    finally:
        con.close()
