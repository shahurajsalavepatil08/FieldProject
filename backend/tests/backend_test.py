"""Backend tests for Smart Predictive Maintenance System."""
import os
import time
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get(
    "REACT_APP_BACKEND_URL"
) else "https://factory-pulse-41.preview.emergentagent.com"

ADMIN = {"email": "admin@pm.com", "password": "admin123"}
ENG = {"email": "engineer@pm.com", "password": "engineer123"}


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def eng_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json=ENG, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- Auth ---
class TestAuth:
    def test_login_admin(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["token_type"] == "bearer"
        assert d["user"]["role"] == "admin"
        assert d["user"]["email"] == ADMIN["email"]
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 20

    def test_login_engineer(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json=ENG, timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "engineer"

    def test_login_invalid(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@pm.com", "password": "wrong"},
            timeout=15,
        )
        assert r.status_code == 401

    def test_register_new(self):
        email = f"TEST_{int(time.time())}@pm.com"
        r = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": "tester",
                "email": email,
                "password": "secret123",
                "role": "engineer",
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email
        assert d["user"]["role"] == "engineer"

    def test_register_dup(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": "x",
                "email": ADMIN["email"],
                "password": "x",
                "role": "admin",
            },
            timeout=15,
        )
        assert r.status_code == 400

    def test_me(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN["email"]

    def test_me_no_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401


# --- Machines / sensor ---
class TestMachines:
    def test_machines_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/machines", timeout=15)
        assert r.status_code == 401

    def test_machines_list(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/machines", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        ms = r.json()
        assert len(ms) == 4
        ids = {m["id"] for m in ms}
        assert ids == {"m1", "m2", "m3", "m4"}

    def test_get_data(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/get-data?machine_id=m1", headers=H(admin_token), timeout=15
        )
        assert r.status_code == 200
        d = r.json()
        for k in ("temperature", "vibration", "sound", "current",
                  "status", "health", "thresholds", "timestamp"):
            assert k in d
        assert d["status"] in ("NORMAL", "WARNING", "CRITICAL")
        assert 0 <= d["health"] <= 100

    def test_get_data_unknown(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/get-data?machine_id=zzz", headers=H(admin_token), timeout=15
        )
        assert r.status_code == 404

    def test_send_data_persists(self, admin_token):
        r = requests.post(
            f"{BASE_URL}/api/send-data?machine_id=m1",
            headers=H(admin_token),
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["machine_id"] == "m1"
        rid = d["id"]
        # verify persisted via history
        time.sleep(1)
        h = requests.get(
            f"{BASE_URL}/api/history?machine_id=m1&hours=1",
            headers=H(admin_token),
            timeout=15,
        )
        assert h.status_code == 200
        ids = [row["id"] for row in h.json()]
        assert rid in ids

    def test_history(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/history?machine_id=m2&hours=1",
            headers=H(admin_token),
            timeout=15,
        )
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        # background sim should populate something
        if rows:
            assert "_id" not in rows[0]
            assert rows[0]["machine_id"] == "m2"

    def test_alerts(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/alerts", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# --- AI ---
class TestAI:
    def test_ai_insights(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/ai-insights?machine_id=m3",
            headers=H(admin_token),
            timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("risk_level", "headline", "findings", "action", "source"):
            assert k in d
        assert d["source"] in ("llm", "rules")
        assert d["risk_level"] in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
        assert isinstance(d["findings"], list) and len(d["findings"]) >= 1


# --- Thresholds + RBAC ---
class TestThresholds:
    def test_get(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/thresholds", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("temp_warning", "temp_critical", "vib_warning", "vib_critical",
                  "sound_warning", "sound_critical", "current_warning", "current_critical"):
            assert k in d

    def test_engineer_cannot_put(self, eng_token):
        body = {
            "temp_warning": 55, "temp_critical": 75, "vib_warning": 1.2,
            "vib_critical": 1.8, "sound_warning": 80, "sound_critical": 95,
            "current_warning": 6.5, "current_critical": 8.0,
        }
        r = requests.put(
            f"{BASE_URL}/api/thresholds", json=body, headers=H(eng_token), timeout=15
        )
        assert r.status_code == 403

    def test_admin_can_put_and_persist(self, admin_token):
        body = {
            "temp_warning": 55, "temp_critical": 75, "vib_warning": 1.2,
            "vib_critical": 1.8, "sound_warning": 80, "sound_critical": 95,
            "current_warning": 6.5, "current_critical": 8.0,
        }
        r = requests.put(
            f"{BASE_URL}/api/thresholds", json=body, headers=H(admin_token), timeout=15
        )
        assert r.status_code == 200
        # verify persisted
        g = requests.get(
            f"{BASE_URL}/api/thresholds", headers=H(admin_token), timeout=15
        ).json()
        assert g["temp_warning"] == 55


# --- Admin endpoints ---
class TestAdmin:
    def test_users_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/users", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        emails = {u["email"] for u in rows}
        assert ADMIN["email"] in emails

    def test_users_engineer_403(self, eng_token):
        r = requests.get(f"{BASE_URL}/api/users", headers=H(eng_token), timeout=15)
        assert r.status_code == 403

    def test_logs_admin(self, admin_token):
        r = requests.get(f"{BASE_URL}/api/logs", headers=H(admin_token), timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_logs_engineer_403(self, eng_token):
        r = requests.get(f"{BASE_URL}/api/logs", headers=H(eng_token), timeout=15)
        assert r.status_code == 403


# --- PDF ---
class TestPDF:
    def test_pdf(self, admin_token):
        r = requests.get(
            f"{BASE_URL}/api/report/pdf?machine_id=m1&hours=1",
            headers=H(admin_token),
            timeout=30,
        )
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
