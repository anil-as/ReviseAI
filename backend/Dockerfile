# ─────────────────────────────────────────
#  ReviseAI – Backend (FastAPI + SQLite)
# ─────────────────────────────────────────

# Use a slim Python 3.11 image for a smaller footprint
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy and install Python dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend source code
COPY . .

# Create a directory for the SQLite database file
RUN mkdir -p /app/data

# Expose the port FastAPI will listen on
EXPOSE 8000

# Start the app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
