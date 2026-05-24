#!/usr/bin/env python
import os
from dotenv import load_dotenv
import psycopg2
import psycopg2.extras


def main() -> int:
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(env_path)

    dbname = os.getenv('DATABASE_NAME')
    user = os.getenv('DATABASE_USER')
    password = os.getenv('DATABASE_PASSWORD')
    host = os.getenv('DATABASE_HOST', 'localhost')
    port = os.getenv('DATABASE_PORT', '5432')

    if not all([dbname, user, password, host, port]):
        print('ERROR: Missing local database config in .env.')
        return 1

    print(f'Testing local PostgreSQL database {dbname}@{host}:{port}')

    try:
        conn = psycopg2.connect(
            dbname=dbname,
            user=user,
            password=password,
            host=host,
            port=port,
            connect_timeout=10,
        )
    except psycopg2.Error as error:
        print('ERROR: Could not connect to the local PostgreSQL database.')
        print(f'  {error.__class__.__name__}: {error}')
        return 1

    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute(
                "SELECT table_schema, table_name FROM information_schema.tables "
                "WHERE table_schema NOT IN ('information_schema','pg_catalog') "
                "ORDER BY table_schema, table_name;"
            )
            tables = cursor.fetchall()
            print('Available tables:')
            for row in tables:
                print(f"  {row['table_schema']}.{row['table_name']}")

            cursor.execute(
                "SELECT id, username, email, role, is_active, is_approved, created_at "
                "FROM accounts_customuser ORDER BY created_at DESC LIMIT 100;"
            )
            users = cursor.fetchall()

            if not users:
                print('\nNo users found in accounts_customuser.')
            else:
                print(f'\nFound {len(users)} user(s) in accounts_customuser:')
                for user_row in users:
                    print(
                        f"  id={user_row['id']} username={user_row['username']} email={user_row['email']} "
                        f"role={user_row['role']} active={user_row['is_active']} approved={user_row['is_approved']} "
                        f"created_at={user_row['created_at']}"
                    )
    except psycopg2.Error as error:
        print('ERROR: Query failed.')
        print(f'  {error.__class__.__name__}: {error}')
        return 1
    finally:
        conn.close()

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
