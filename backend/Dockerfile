FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" asyncpg httpx pydantic pydantic-settings python-dotenv

COPY app/ app/
COPY seed/ seed/

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
