#!/usr/bin/env python
import os
import sys
from dotenv import load_dotenv
import psycopg2


def main() -> int:
    load_dotenv()

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print('ERROR: DATABASE_URL is not set in the environment or .env file.')
        return 1

    print('Testing PostgreSQL connectivity using DATABASE_URL...')

    try:
        conn = psycopg2.connect(database_url, connect_timeout=10)
        with conn.cursor() as cursor:
            cursor.execute('SELECT version();')
            version = cursor.fetchone()
        conn.close()
        print('SUCCESS: Connected to PostgreSQL.')
        print(f'PostgreSQL version: {version[0]}')
        return 0
    except psycopg2.Error as error:
        print('ERROR: Failed to connect to PostgreSQL.')
        print(f'  {error.__class__.__name__}: {error}')
        return 1


if __name__ == '__main__':
    sys.exit(main())
