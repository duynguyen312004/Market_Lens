FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade \
    -r /app/backend/requirements.txt

COPY backend /app/backend

RUN useradd --create-home --shell /usr/sbin/nologin marketlens \
    && chown -R marketlens:marketlens /app

USER marketlens

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.getenv(\"PORT\", \"8000\")}/api/v1/health', timeout=4)"

CMD ["python", "-m", "backend.start"]
