"""Smart Predictive Maintenance System - FastAPI backend."""
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import math
import random
import logging
import asyncio
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
import uuid
import jwt
import bcrypt
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = os.environ.get("JWT_ALGO", "HS256")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Smart Predictive Maintenance API")
api = APIRouter(prefix="/api")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("pm")

# ----------------------- Models -----------------------
class RegisterReq(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "engineer"

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class TokenResp(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    role: str
    created_at: str

class ThresholdReq(BaseModel):
    temp_warning: float
    temp_critical: float
    vib_warning: float
    vib_critical: float
    sound_warning: float
    sound_critical: float
    current_warning: float
    current_critical: float

class SensorReading(BaseModel):
    id: str
    machine_id: str
    temperature: float
    vibration: float
    sound: float
    current: float
    status: str
    health: float
    timestamp: str

# ----------------------- Auth helpers -----------------------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user: Dict[str, Any]) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Dict[str, Any]:
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

# ----------------------- Sensor simulator -----------------------
MACHINES = [
    {"id": "m1", "name": "Assembly Line Alpha", "location": "Sector A-01", "profile": "healthy"},
    {"id": "m2", "name": "Compressor Beta", "location": "Sector B-03", "profile": "warning"},
    {"id": "m3", "name": "Conveyor Gamma", "location": "Sector C-02", "profile": "critical"},
    {"id": "m4", "name": "Hydraulic Delta", "location": "Sector D-04", "profile": "healthy"},
]

DEFAULT_THRESHOLDS = {
    "temp_warning": 55.0, "temp_critical": 75.0,
    "vib_warning": 1.2, "vib_critical": 1.8,
    "sound_warning": 80.0, "sound_critical": 95.0,
    "current_warning": 6.5, "current_critical": 8.0,
}

# in-memory smooth state per machine
_state: Dict[str, Dict[str, float]] = {}

def _init_state():
    for m in MACHINES:
        base = {
            "healthy":  {"t": 38.0, "v": 0.6, "s": 60.0, "c": 4.2},
            "warning":  {"t": 58.0, "v": 1.3, "s": 82.0, "c": 6.8},
            "critical": {"t": 72.0, "v": 1.6, "s": 90.0, "c": 7.6},
        }[m["profile"]]
        _state[m["id"]] = {
            "temperature": base["t"], "vibration": base["v"],
            "sound": base["s"], "current": base["c"],
        }

_init_state()

def _drift(cur: float, lo: float, hi: float, step: float) -> float:
    nxt = cur + random.uniform(-step, step)
    if random.random() < 0.04:  # occasional spike
        nxt += random.uniform(-2 * step, 3 * step)
    return max(lo, min(hi, nxt))

def simulate_reading(machine_id: str) -> Dict[str, float]:
    st = _state[machine_id]
    st["temperature"] = _drift(st["temperature"], 25, 95, 1.2)
    st["vibration"]   = _drift(st["vibration"], 0.2, 2.5, 0.08)
    st["sound"]       = _drift(st["sound"], 40, 110, 1.5)
    st["current"]     = _drift(st["current"], 2.0, 10.5, 0.25)
    return {k: round(v, 2) for k, v in st.items()}

def classify(vals: Dict[str, float], th: Dict[str, float]) -> str:
    if (vals["temperature"] >= th["temp_critical"] or vals["vibration"] >= th["vib_critical"]
            or vals["current"] >= th["current_critical"] or vals["sound"] >= th["sound_critical"]):
        return "CRITICAL"
    if (vals["temperature"] >= th["temp_warning"] or vals["vibration"] >= th["vib_warning"]
            or vals["current"] >= th["current_warning"] or vals["sound"] >= th["sound_warning"]):
        return "WARNING"
    return "NORMAL"

def health_score(vals: Dict[str, float], th: Dict[str, float]) -> float:
    # 0-100. Penalise based on distance past warning toward critical.
    def penalty(val, warn, crit):
        if val <= warn:
            return 0.0
        if val >= crit:
            return 30.0
        return (val - warn) / (crit - warn) * 30.0
    pen = (
        penalty(vals["temperature"], th["temp_warning"], th["temp_critical"]) +
        penalty(vals["vibration"], th["vib_warning"], th["vib_critical"]) +
        penalty(vals["sound"], th["sound_warning"], th["sound_critical"]) +
        penalty(vals["current"], th["current_warning"], th["current_critical"])
    )
    return round(max(0.0, 100.0 - pen), 1)

async def get_thresholds() -> Dict[str, float]:
    doc = await db.config.find_one({"_id": "thresholds"})
    if not doc:
        return DEFAULT_THRESHOLDS.copy()
    return {k: doc.get(k, DEFAULT_THRESHOLDS[k]) for k in DEFAULT_THRESHOLDS}

async def log_event(level: str, message: str, machine_id: Optional[str] = None):
    await db.logs.insert_one({
        "id": str(uuid.uuid4()), "level": level, "message": message,
        "machine_id": machine_id, "timestamp": datetime.now(timezone.utc).isoformat(),
    })

# ----------------------- Startup: seed users -----------------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    seeds = [
        {"username": "admin", "email": "admin@pm.com", "password": "admin123", "role": "admin"},
        {"username": "engineer", "email": "engineer@pm.com", "password": "engineer123", "role": "engineer"},
    ]
    for s in seeds:
        if not await db.users.find_one({"email": s["email"]}):
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "username": s["username"],
                "email": s["email"],
                "role": s["role"],
                "password": hash_password(s["password"]),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            log.info(f"seeded user {s['email']}")
    # start background simulator
    asyncio.create_task(background_sim())

async def background_sim():
    """Auto-generate a reading for each machine every 3s for trend continuity."""
    await asyncio.sleep(2)
    while True:
        try:
            th = await get_thresholds()
            for m in MACHINES:
                vals = simulate_reading(m["id"])
                st = classify(vals, th)
                hs = health_score(vals, th)
                ts = datetime.now(timezone.utc).isoformat()
                rid = str(uuid.uuid4())
                doc = {"id": rid, "machine_id": m["id"], **vals,
                       "status": st, "health": hs, "timestamp": ts}
                await db.sensor_data.insert_one(doc)
                if st in ("WARNING", "CRITICAL"):
                    # rate-limit: only create alert if last alert > 15s ago for this machine
                    last = await db.alerts.find_one(
                        {"machine_id": m["id"]}, sort=[("timestamp", -1)], projection={"_id": 0})
                    emit = True
                    if last:
                        try:
                            last_t = datetime.fromisoformat(last["timestamp"])
                            if (datetime.now(timezone.utc) - last_t).total_seconds() < 15:
                                emit = False
                        except Exception:
                            pass
                    if emit:
                        msg = build_alert_message(vals, st, th)
                        await db.alerts.insert_one({
                            "id": str(uuid.uuid4()), "machine_id": m["id"],
                            "machine_name": m["name"], "message": msg,
                            "type": st.lower(), "timestamp": ts,
                        })
        except Exception as e:
            log.error(f"sim error: {e}")
        await asyncio.sleep(3)

def build_alert_message(vals, status, th):
    parts = []
    if vals["temperature"] >= th["temp_warning"]:
        parts.append(f"Temp {vals['temperature']}°C")
    if vals["vibration"] >= th["vib_warning"]:
        parts.append(f"Vib {vals['vibration']}")
    if vals["sound"] >= th["sound_warning"]:
        parts.append(f"Sound {vals['sound']}dB")
    if vals["current"] >= th["current_warning"]:
        parts.append(f"Current {vals['current']}A")
    return f"{status}: " + ", ".join(parts) if parts else status

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ----------------------- Routes: auth -----------------------
@api.post("/auth/register", response_model=TokenResp)
async def register(req: RegisterReq):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")
    role = req.role if req.role in ("admin", "engineer") else "engineer"
    user = {
        "id": str(uuid.uuid4()), "username": req.username, "email": req.email,
        "role": role, "password": hash_password(req.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    pub = {k: v for k, v in user.items() if k not in ("password", "_id")}
    return {"access_token": create_token(pub), "token_type": "bearer", "user": pub}

@api.post("/auth/login", response_model=TokenResp)
async def login(req: LoginReq):
    u = await db.users.find_one({"email": req.email})
    if not u or not verify_password(req.password, u["password"]):
        raise HTTPException(401, "Invalid credentials")
    pub = {k: v for k, v in u.items() if k not in ("password", "_id")}
    return {"access_token": create_token(pub), "token_type": "bearer", "user": pub}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

# ----------------------- Routes: machines & sensor -----------------------
@api.get("/machines")
async def list_machines(user=Depends(get_current_user)):
    return MACHINES

@api.get("/get-data")
async def get_data(machine_id: str = "m1", user=Depends(get_current_user)):
    if machine_id not in _state:
        raise HTTPException(404, "Unknown machine")
    th = await get_thresholds()
    vals = simulate_reading(machine_id)
    st = classify(vals, th)
    hs = health_score(vals, th)
    return {
        "machine_id": machine_id, **vals, "status": st, "health": hs,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "thresholds": th,
    }

@api.post("/send-data")
async def send_data(machine_id: str = "m1", user=Depends(get_current_user)):
    if machine_id not in _state:
        raise HTTPException(404, "Unknown machine")
    th = await get_thresholds()
    vals = simulate_reading(machine_id)
    st = classify(vals, th)
    hs = health_score(vals, th)
    ts = datetime.now(timezone.utc).isoformat()
    rid = str(uuid.uuid4())
    doc = {"id": rid, "machine_id": machine_id, **vals, "status": st, "health": hs, "timestamp": ts}
    await db.sensor_data.insert_one(doc)
    if st in ("WARNING", "CRITICAL"):
        await db.alerts.insert_one({
            "id": str(uuid.uuid4()), "machine_id": machine_id,
            "machine_name": next(m["name"] for m in MACHINES if m["id"] == machine_id),
            "message": build_alert_message(vals, st, th), "type": st.lower(), "timestamp": ts,
        })
    return {"id": rid, "machine_id": machine_id, **vals, "status": st, "health": hs, "timestamp": ts}

@api.get("/history")
async def history(machine_id: str = "m1", hours: int = 1, limit: int = 200,
                  user=Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    cursor = db.sensor_data.find(
        {"machine_id": machine_id, "timestamp": {"$gte": cutoff}},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    rows.reverse()
    return rows

@api.get("/alerts")
async def alerts(machine_id: Optional[str] = None, limit: int = 50,
                 user=Depends(get_current_user)):
    q = {}
    if machine_id:
        q["machine_id"] = machine_id
    rows = await db.alerts.find(q, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return rows

# ----------------------- AI insights (Claude) -----------------------
@api.get("/ai-insights")
async def ai_insights(machine_id: str = "m1", user=Depends(get_current_user)):
    if machine_id not in _state:
        raise HTTPException(404, "Unknown machine")
    th = await get_thresholds()
    # gather last 10 readings
    recent = await db.sensor_data.find(
        {"machine_id": machine_id}, {"_id": 0}
    ).sort("timestamp", -1).limit(10).to_list(10)
    recent.reverse()
    if not recent:
        vals = simulate_reading(machine_id)
        recent = [{"machine_id": machine_id, **vals,
                   "status": classify(vals, th), "health": health_score(vals, th),
                   "timestamp": datetime.now(timezone.utc).isoformat()}]
    cur = recent[-1]
    machine = next(m for m in MACHINES if m["id"] == machine_id)

    fallback = _rule_insight(cur, th, machine)
    if not EMERGENT_LLM_KEY:
        return fallback
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        sys_msg = (
            "You are a senior industrial maintenance engineer AI. Given machine sensor "
            "readings, produce a concise JSON response with keys: risk_level "
            "(LOW|MEDIUM|HIGH|CRITICAL), headline (<=60 chars), findings (array of 2-3 "
            "short bullet strings), action (single actionable maintenance recommendation "
            "<=120 chars). Return ONLY valid JSON, no prose."
        )
        prompt = (
            f"Machine: {machine['name']} ({machine['location']})\n"
            f"Thresholds: {th}\n"
            f"Latest reading: temp={cur['temperature']}°C vib={cur['vibration']} "
            f"sound={cur['sound']}dB current={cur['current']}A status={cur['status']} "
            f"health={cur['health']}%\n"
            f"Recent trend (oldest→newest): "
            f"{[(r['temperature'], r['vibration'], r['sound'], r['current']) for r in recent]}\n"
            "Return JSON only."
        )
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"pm-{machine_id}",
            system_message=sys_msg,
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")
        resp = await chat.send_message(UserMessage(text=prompt))
        import json as _json, re
        txt = resp.strip()
        m = re.search(r"\{.*\}", txt, re.S)
        if m:
            data = _json.loads(m.group(0))
            data["source"] = "llm"
            data["machine_id"] = machine_id
            return data
    except Exception as e:
        log.warning(f"LLM insight failed: {e}")
    fallback["source"] = "rules"
    return fallback

def _rule_insight(cur, th, machine):
    findings = []
    if cur["temperature"] >= th["temp_critical"]:
        findings.append(f"Temperature critically high at {cur['temperature']}°C")
    elif cur["temperature"] >= th["temp_warning"]:
        findings.append(f"Temperature rising abnormally ({cur['temperature']}°C)")
    if cur["vibration"] >= th["vib_critical"]:
        findings.append(f"Severe vibration detected ({cur['vibration']})")
    elif cur["vibration"] >= th["vib_warning"]:
        findings.append(f"High vibration detected ({cur['vibration']})")
    if cur["current"] >= th["current_critical"]:
        findings.append(f"Possible system overload — current at {cur['current']}A")
    elif cur["current"] >= th["current_warning"]:
        findings.append(f"Elevated current draw ({cur['current']}A)")
    if cur["sound"] >= th["sound_warning"]:
        findings.append(f"Acoustic anomaly ({cur['sound']}dB)")
    if not findings:
        findings = ["All sensors within nominal envelope", "No anomalies detected in recent trend"]

    status = cur["status"]
    risk = {"NORMAL": "LOW", "WARNING": "MEDIUM", "CRITICAL": "HIGH"}[status]
    action = {
        "LOW": "Continue scheduled preventive maintenance cycle.",
        "MEDIUM": "Inspect bearings and lubrication; schedule diagnostic within 48h.",
        "HIGH": "Halt operation, dispatch field engineer, inspect cooling and load path.",
    }[risk]
    headline = {
        "LOW": "Systems nominal",
        "MEDIUM": "Early-stage anomaly detected",
        "HIGH": "Immediate intervention required",
    }[risk]
    return {
        "machine_id": machine["id"], "risk_level": risk, "headline": headline,
        "findings": findings[:3], "action": action, "source": "rules",
    }

# ----------------------- Thresholds (admin) -----------------------
@api.get("/thresholds")
async def get_th(user=Depends(get_current_user)):
    return await get_thresholds()

@api.put("/thresholds")
async def put_th(req: ThresholdReq, user=Depends(require_admin)):
    doc = req.model_dump()
    doc["_id"] = "thresholds"
    await db.config.replace_one({"_id": "thresholds"}, doc, upsert=True)
    await log_event("INFO", f"Thresholds updated by {user['email']}")
    return {k: v for k, v in doc.items() if k != "_id"}

# ----------------------- Users & logs (admin) -----------------------
@api.get("/users")
async def list_users(user=Depends(require_admin)):
    rows = await db.users.find({}, {"_id": 0, "password": 0}).to_list(500)
    return rows

@api.delete("/users/{uid}")
async def delete_user(uid: str, user=Depends(require_admin)):
    if uid == user["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    r = await db.users.delete_one({"id": uid})
    await log_event("WARN", f"User {uid} deleted by {user['email']}")
    return {"deleted": r.deleted_count}

@api.get("/logs")
async def get_logs(limit: int = 100, user=Depends(require_admin)):
    rows = await db.logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return rows

# ----------------------- PDF report -----------------------
@api.get("/report/pdf")
async def report_pdf(machine_id: str = "m1", hours: int = 1,
                     user=Depends(get_current_user)):
    if machine_id not in _state:
        raise HTTPException(404, "Unknown machine")
    machine = next(m for m in MACHINES if m["id"] == machine_id)
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    rows = await db.sensor_data.find(
        {"machine_id": machine_id, "timestamp": {"$gte": cutoff}}, {"_id": 0}
    ).sort("timestamp", -1).limit(300).to_list(300)
    rows.reverse()
    alerts_rows = await db.alerts.find(
        {"machine_id": machine_id, "timestamp": {"$gte": cutoff}}, {"_id": 0}
    ).sort("timestamp", -1).limit(50).to_list(50)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("t", parent=styles["Heading1"], textColor=colors.HexColor("#FF5A00"))
    elems = [
        Paragraph("Smart Predictive Maintenance Report", title_style),
        Paragraph(f"<b>Machine:</b> {machine['name']} ({machine['location']})", styles["Normal"]),
        Paragraph(f"<b>Generated:</b> {datetime.now(timezone.utc).isoformat()}", styles["Normal"]),
        Paragraph(f"<b>Window:</b> last {hours}h — {len(rows)} samples, {len(alerts_rows)} alerts", styles["Normal"]),
        Spacer(1, 12),
    ]
    if rows:
        latest = rows[-1]
        elems.append(Paragraph(
            f"<b>Latest:</b> Temp {latest['temperature']}°C | Vib {latest['vibration']} | "
            f"Sound {latest['sound']} dB | Current {latest['current']} A | "
            f"Status {latest['status']} | Health {latest['health']}%", styles["Normal"]))
        elems.append(Spacer(1, 12))
        sample = rows[-min(20, len(rows)):]
        tdata = [["Time (UTC)", "Temp", "Vib", "Sound", "Current", "Status", "Health"]]
        for r in sample:
            tdata.append([r["timestamp"][11:19], r["temperature"], r["vibration"],
                          r["sound"], r["current"], r["status"], r["health"]])
        tbl = Table(tdata, hAlign="LEFT")
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0A0A0E")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
        ]))
        elems.append(tbl)
        elems.append(Spacer(1, 14))
    if alerts_rows:
        elems.append(Paragraph("<b>Alerts</b>", styles["Heading3"]))
        for a in alerts_rows[:20]:
            elems.append(Paragraph(
                f"{a['timestamp'][11:19]} — [{a['type'].upper()}] {a['message']}",
                styles["Normal"]))
    doc.build(elems)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="report-{machine_id}-{int(datetime.now().timestamp())}.pdf"'
    })

# ----------------------- register app -----------------------
app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
