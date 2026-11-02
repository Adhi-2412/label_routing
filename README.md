# LabelRoute

Reads shipment details from package labels (OCR) so parcels can still be routed when the barcode is damaged or missing.

Stack: FastAPI + PostgreSQL (SQLAlchemy) + OpenCV/Tesseract + a React (Vite) frontend.

## Run
1. Start PostgreSQL: `docker compose up -d` (uses docker-compose.yml). Or use your own server and set `DATABASE_URL`, e.g. `postgresql+psycopg2://user:pass@host:5432/dbname`.
2. Install Tesseract OCR: `sudo apt install tesseract-ocr` (Ubuntu), `brew install tesseract` (macOS), or the Windows installer.
3. Backend:
   - `python -m venv venv && source venv/bin/activate`
   - `pip install -r requirements.txt`
   - `uvicorn backend.main:app --reload` (API docs at http://localhost:8000/docs)
4. Frontend (development), in a second terminal:
   - `cd frontend && npm install && npm run dev`
   - open http://localhost:5173 (calls to /api are proxied to port 8000)
5. Single-server mode: `cd frontend && npm run build`, then restart the backend; it serves the built app at http://localhost:8000.

The tables are created on first start and the manifest is seeded with 5 sample rows.
Default connection: `postgresql+psycopg2://labelroute:labelroute@localhost:5432/labelroute` (override with the `DATABASE_URL` environment variable). Change the default password before any real deployment.

## How it works
Image -> OpenCV preprocessing -> Tesseract OCR -> regex extraction (AWB, PIN, phone) -> manifest match (exact AWB, else fuzzy on name/address/PIN) -> hub by PIN prefix.
Confidence >= 0.80 is auto-routed; anything lower goes to the review queue, where an operator corrects it.

## Tables
- shipments: the manifest (awb, recipient, address, pin, phone)
- scans: every label processed (raw text, extracted fields, confidence, hub, status)

Hubs are mapped in the `HUBS` dict in `backend/main.py`.
