.PHONY: dev backend frontend test

dev:
	@echo "Starting backend and frontend in separate terminals is recommended."
	@echo "Backend:  cd backend && .venv/bin/activate && uvicorn app.main:app --reload --port 8000"
	@echo "Frontend: cd frontend && npm run dev"

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

test:
	cd backend && pytest -q
