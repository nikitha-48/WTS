#!/usr/bin/env python
"""
Read-only inspection of the Supabase Postgres database that this Django app
points at. Prints all user/public-schema tables, their row counts, and the
contents of the project's app tables (accounts / files / tasks).

Usage:
    .venv\\Scripts\\python.exe file-management-django-backend\\dump_supabase_data.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv


# Tables we care about (Django app tables). Other tables are auth_*, django_*.
APP_TABLES = (
    "accounts_customuser",
    "files_file",
    "files_file_shared_with",
    "tasks_task",
)

# Sensitive columns to mask in the printed output. Hashes/passwords leak nothing
# operationally, but no need to splash them on screen.
MASK_COLUMNS = {"password"}


def _default_json(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (bytes, memoryview)):
        return f"<{len(bytes(value))} bytes>"
    raise TypeError(f"Unserializable type: {type(value).__name__}")


def _safe_row(row: dict) -> dict:
    out = {}
    for key, value in row.items():
        if key in MASK_COLUMNS and value:
            out[key] = "<hashed, hidden>"
        else:
            out[key] = value
    return out


def _print_section(title: str) -> None:
    bar = "=" * len(title)
    print(f"\n{bar}\n{title}\n{bar}")


def main() -> int:
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL is not set.")
        return 1

    # Hide credentials from the host banner
    safe_url = db_url
    if "@" in db_url:
        scheme, rest = db_url.split("://", 1)
        creds, host = rest.split("@", 1)
        user = creds.split(":", 1)[0]
        safe_url = f"{scheme}://{user}:***@{host}"
    print(f"Connecting to {safe_url}")

    try:
        conn = psycopg2.connect(db_url, connect_timeout=15)
    except psycopg2.Error as exc:
        print(f"ERROR: connection failed: {exc}")
        return 1

    conn.set_session(readonly=True, autocommit=True)

    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        # ── Server identity ────────────────────────────────────────────────
        cur.execute("SELECT version() AS version, current_database() AS db, current_user AS usr;")
        meta = cur.fetchone()
        _print_section("Server")
        print(f"Version : {meta['version']}")
        print(f"Database: {meta['db']}")
        print(f"User    : {meta['usr']}")

        # ── List all public-schema tables with row counts ──────────────────
        cur.execute(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name;
            """
        )
        tables = [r["table_name"] for r in cur.fetchall()]

        _print_section(f"Tables in 'public' schema ({len(tables)})")
        counts = {}
        for t in tables:
            try:
                cur.execute(f'SELECT COUNT(*) AS n FROM "{t}";')
                counts[t] = cur.fetchone()["n"]
            except psycopg2.Error as exc:
                counts[t] = f"error: {exc.pgerror or exc}"
        width = max(len(t) for t in tables) if tables else 0
        for t in tables:
            print(f"  {t.ljust(width)}  {counts[t]}")

        # ── Dump app-table contents ────────────────────────────────────────
        for t in APP_TABLES:
            if t not in counts:
                continue
            _print_section(f"Table: {t}  (rows: {counts[t]})")
            if counts[t] == 0:
                print("(empty)")
                continue
            cur.execute(f'SELECT * FROM "{t}" ORDER BY 1 LIMIT 500;')
            rows = [_safe_row(dict(r)) for r in cur.fetchall()]
            print(json.dumps(rows, indent=2, default=_default_json, ensure_ascii=False))

    conn.close()
    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
