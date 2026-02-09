# Use slim Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend

# Expose Flask port
EXPOSE 5000

# Run Gunicorn with backend.app:app
CMD flask db upgrade && gunicorn backend.app:app -b 0.0.0.0:5000