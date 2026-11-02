import re, os
from datetime import datetime
import cv2, numpy as np, pytesseract
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from rapidfuzz import fuzz
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text, func
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL",
                         "postgresql+psycopg2://labelroute:labelroute@localhost:5432/labelroute")
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
Base = declarative_base()

# PIN prefix -> sorting hub
HUBS = {"600": "Chennai Hub", "110": "Delhi Hub", "400": "Mumbai Hub",
        "560": "Bengaluru Hub", "700": "Kolkata Hub", "500": "Hyderabad Hub"}
THRESHOLD = 0.80  # confidence needed to auto-route


class Shipment(Base):  # the manifest
    __tablename__ = "shipments"
    id = Column(Integer, primary_key=True)
    awb = Column(String, unique=True, index=True)
    recipient = Column(String)
    address = Column(String)
    pin = Column(String)
    phone = Column(String)


class Scan(Base):  # every label processed
    __tablename__ = "scans"
    id = Column(Integer, primary_key=True)
    created = Column(DateTime, default=datetime.utcnow)
    filename = Column(String)
    raw_text = Column(Text)
    awb = Column(String)
    pin = Column(String)
    phone = Column(String)
    matched_recipient = Column(String)
    hub = Column(String)
    confidence = Column(Float)
    status = Column(String)  # auto_routed | review | resolved


Base.metadata.create_all(engine)


def seed():
    with Session() as db:
        if db.query(Shipment).count():
            return
        rows = [("DL1234567890", "Priya Raman", "12 Anna Salai, T Nagar, Chennai", "600017", "9840012345"),
                ("DL2234567891", "Rahul Verma", "45 Connaught Place, New Delhi", "110001", "9810098100"),
                ("DL3234567892", "Sneha Kulkarni", "8 Marine Drive, Mumbai", "400020", "9820011223"),
                ("DL4234567893", "Arjun Nair", "22 MG Road, Bengaluru", "560001", "9845012345"),
                ("DL5234567894", "Ananya Das", "5 Park Street, Kolkata", "700016", "9830012345")]
        db.add_all([Shipment(awb=a, recipient=r, address=ad, pin=p, phone=ph) for a, r, ad, p, ph in rows])
        db.commit()


seed()
app = FastAPI(title="LabelRoute")


def preprocess(data: bytes):
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "That file is not a readable image.")
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    g = cv2.resize(g, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    g = cv2.fastNlMeansDenoising(g, h=15)
    return cv2.adaptiveThreshold(g, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10)


def parse(text: str):
    t = text.upper()
    phone = re.search(r"(?:\+?91[\s-]?)?[6-9]\d{9}", t)
    if phone:
        t = t.replace(phone.group(0), " ")
    awb = re.search(r"\b(?:[A-Z]{2,4}\d{8,14}|\d{11,14})\b", t)
    if awb:
        t = t.replace(awb.group(0), " ")
    pin = re.search(r"\b[1-9]\d{2}\s?\d{3}\b", t)
    return {"awb": awb.group(0) if awb else None,
            "pin": pin.group(0).replace(" ", "") if pin else None,
            "phone": phone.group(0) if phone else None}


def match(db, f, text):
    if f["awb"]:
        s = db.query(Shipment).filter_by(awb=f["awb"]).first()
        if s:
            return s, 0.97
    best, score = None, 0
    for s in db.query(Shipment).all():
        sc = fuzz.token_set_ratio(text.upper(), f"{s.recipient} {s.address} {s.pin}".upper())
        if f["pin"] and f["pin"] == s.pin:
            sc += 10
        if sc > score:
            best, score = s, sc
    return best, min(score, 100) / 100


def out(o):
    return {c.name: (getattr(o, c.name).isoformat() if isinstance(getattr(o, c.name), datetime)
                     else getattr(o, c.name)) for c in o.__table__.columns}


@app.post("/api/scan")
async def scan(file: UploadFile = File(...)):
    img = preprocess(await file.read())
    text = pytesseract.image_to_string(img, config="--psm 6")
    f = parse(text)
    with Session() as db:
        s, conf = match(db, f, text)
        pin = s.pin if s else f["pin"]
        hub = HUBS.get((pin or "")[:3])
        status = "auto_routed" if (s and conf >= THRESHOLD and hub) else "review"
        rec = Scan(filename=file.filename, raw_text=text, awb=s.awb if s else f["awb"], pin=pin,
                   phone=f["phone"], matched_recipient=s.recipient if s else None,
                   hub=hub if status == "auto_routed" else None, confidence=round(conf, 2), status=status)
        db.add(rec)
        db.commit()
        return out(rec)


@app.get("/api/scans")
def scans(status: str | None = None):
    with Session() as db:
        q = db.query(Scan).order_by(Scan.id.desc())
        if status:
            q = q.filter_by(status=status)
        return [out(s) for s in q.limit(100)]


class Resolve(BaseModel):
    awb: str | None = None
    pin: str


@app.post("/api/scans/{sid}/resolve")
def resolve(sid: int, body: Resolve):
    with Session() as db:
        s = db.get(Scan, sid)
        if not s:
            raise HTTPException(404, "Scan not found.")
        hub = HUBS.get(body.pin[:3])
        if not hub:
            raise HTTPException(422, "No hub serves that PIN prefix.")
        ship = db.query(Shipment).filter_by(awb=body.awb).first() if body.awb else None
        s.awb, s.pin, s.hub, s.status = body.awb, body.pin, hub, "resolved"
        s.matched_recipient = ship.recipient if ship else s.matched_recipient
        db.commit()
        return out(s)


@app.get("/api/stats")
def stats():
    with Session() as db:
        by = dict(db.query(Scan.status, func.count()).group_by(Scan.status).all())
        hubs = dict(db.query(Scan.hub, func.count()).filter(Scan.hub.isnot(None)).group_by(Scan.hub).all())
        avg = db.query(func.avg(Scan.confidence)).scalar() or 0
        total = sum(by.values())
        auto = by.get("auto_routed", 0)
        return {"total": total, "auto_routed": auto, "review": by.get("review", 0),
                "resolved": by.get("resolved", 0), "avg_confidence": round(avg, 2),
                "automation_rate": round(auto / total, 2) if total else 0, "by_hub": hubs}


class NewShipment(BaseModel):
    awb: str
    recipient: str
    address: str
    pin: str
    phone: str | None = None


@app.get("/api/shipments")
def shipments():
    with Session() as db:
        return [out(s) for s in db.query(Shipment).order_by(Shipment.id.desc())]


@app.post("/api/shipments")
def add_shipment(body: NewShipment):
    with Session() as db:
        if db.query(Shipment).filter_by(awb=body.awb).first():
            raise HTTPException(409, "That AWB is already in the manifest.")
        s = Shipment(**body.model_dump())
        db.add(s)
        db.commit()
        return out(s)


DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(DIST):  # production: serve the built React app
    app.mount("/", StaticFiles(directory=DIST, html=True))
