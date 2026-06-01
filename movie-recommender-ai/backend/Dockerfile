FROM python:3.10-slim

WORKDIR /workspace

# Install system utilities needed for building packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app structure and AI model directory
COPY app /workspace/backend/app
COPY ../ai_model /workspace/ai_model

# Expose FastAPI default port
EXPOSE 8000

# Set environment path to enable proper package discovery
ENV PYTHONPATH=/workspace

# Launch Uvicorn server
CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
