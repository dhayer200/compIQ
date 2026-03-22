.PHONY: backend frontend dev migrate seed build-frontend docker-build

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

dev:
	make backend & make frontend & wait

migrate:
	cd backend && python -c "import asyncio; from app.db import init_db, run_migrations; asyncio.run(init_db()); asyncio.run(run_migrations())"

seed:
	cd backend && python -m app.seed

build-frontend:
	cd frontend && npm run build

docker-build:
	cd backend && docker build -t compiq-backend .
