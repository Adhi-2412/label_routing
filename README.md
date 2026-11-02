# LabelRoute

Reads shipment details from package labels (OCR) so parcels can still be routed when the barcode is damaged or missing.

Stack: FastAPI + PostgreSQL (SQLAlchemy) + OpenCV/Tesseract + a React (Vite) frontend.



## How it works
Image -> OpenCV preprocessing -> Tesseract OCR -> regex extraction (AWB, PIN, phone) -> manifest match (exact AWB, else fuzzy on name/address/PIN) -> hub by PIN prefix.
Confidence >= 0.80 is auto-routed; anything lower goes to the review queue, where an operator corrects it.

## Tables
- shipments: the manifest (awb, recipient, address, pin, phone)
- scans: every label processed (raw text, extracted fields, confidence, hub, status)

Hubs are mapped in the `HUBS` dict in `backend/main.py`.
