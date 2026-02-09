#!/bin/sh

echo "🚀 Running migrations..."
flask db upgrade || exit 1

echo "✅ Starting Gunicorn..."
exec gunicorn backend.app:app -b 0.0.0.0:5000
