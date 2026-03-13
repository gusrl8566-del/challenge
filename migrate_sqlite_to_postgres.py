import sqlite3
import subprocess
from pathlib import Path


SQLITE_PATH = Path("/home/hyungi/projects/backend/inbody.sqlite")
DOCKER_EXE = "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
TABLE_ORDER = [
    "challenge_seasons",
    "admins",
    "challenge_config",
    "participants",
    "scores",
    "inbody_records",
    "inbody_data",
]


def sql_literal(value, declared_type=""):
    if value is None:
        return "NULL"
    dtype = declared_type.lower()
    if "bool" in dtype:
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"1", "true", "t", "yes", "y"}:
                return "TRUE"
            if lowered in {"0", "false", "f", "no", "n"}:
                return "FALSE"
        if isinstance(value, (int, float)):
            return "TRUE" if int(value) != 0 else "FALSE"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def quote_ident(name):
    return '"' + name.replace('"', '""') + '"'


def main():
    if not SQLITE_PATH.exists():
        raise SystemExit(f"SQLite file not found: {SQLITE_PATH}")

    con = sqlite3.connect(str(SQLITE_PATH))
    cur = con.cursor()

    lines = ["BEGIN;"]
    truncate_targets = ", ".join(quote_ident(t) for t in TABLE_ORDER)
    lines.append(f"TRUNCATE TABLE {truncate_targets} CASCADE;")

    for table in TABLE_ORDER:
        table_info = cur.execute(f"PRAGMA table_info({table})").fetchall()
        cols = [row[1] for row in table_info]
        col_types = [row[2] or "" for row in table_info]
        if not table_info:
            continue

        rows = cur.execute(f"SELECT * FROM {table}").fetchall()
        if not rows:
            continue

        col_sql = ", ".join(quote_ident(c) for c in cols)
        values_sql = []
        for row in rows:
            values_sql.append(
                "(" + ", ".join(sql_literal(v, col_types[i]) for i, v in enumerate(row)) + ")"
            )

        lines.append(f"INSERT INTO {quote_ident(table)} ({col_sql}) VALUES")
        lines.append(",\n".join(values_sql) + ";")

    lines.append("COMMIT;")
    sql = "\n".join(lines)

    cmd = [
        DOCKER_EXE,
        "compose",
        "exec",
        "-T",
        "postgres",
        "psql",
        "-U",
        "inbody",
        "-d",
        "inbody_challenge",
        "-v",
        "ON_ERROR_STOP=1",
    ]
    result = subprocess.run(cmd, input=sql, text=True, capture_output=True)
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)
        raise SystemExit(result.returncode)

    print(result.stdout)


if __name__ == "__main__":
    main()
