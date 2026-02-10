#!/bin/bash
# entrypoint.sh

# Exit immediately if a command fails
set -e

# Wait for Postgres to be ready
echo "Waiting for database to be ready..."
until python -c "import psycopg2; import os; psycopg2.connect(os.getenv('DATABASE_URL'))" > /dev/null 2>&1; do
    echo "Database not ready, retrying in 2s..."
    sleep 2
done

echo "Database is ready! Running migrations..."

# Run Flask migrations
flask db upgrade

echo "Starting Gunicorn..."
exec gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 3
