# Smart Predictive Maintenance System — PRD

## Original Problem Statement
Build a full-stack web application simulating industrial machine monitoring using virtual IoT sensors (Temperature, Vibration, Sound, Current), real-time analytics, AI-based predictions, role-based panels (admin/engineer), and PDF reports. Dark modern industrial theme.

## Architecture
- **Backend**: FastAPI + MongoDB (motor) on port 8001, routes prefixed `/api`.
- **Frontend**: React 19 + Tailwind + shadcn + recharts + framer-motion + @phosphor-icons/react.
- **Auth**: JWT (HS256) + bcrypt password hashing; roles `admin` / `engineer`.
- **AI**: Claude Sonnet 4.5 via Emergent Universal Key (`emergentintegrations`), with rule-based fallback if LLM fails.
- **PDF**: reportlab generated server-side via `/api/report/pdf`.
- **Simulator**: async background task inserts a reading every 3 s per machine into `sensor_data`; emits alerts when status is WARNING/CRITICAL.

## User Personas
- **Admin**: manages users, thresholds, views logs + full dashboard.
- **Engineer**: monitors machines, views alerts and AI insights.

## Core Requirements (static)
- 4 virtual machines with distinct operating profiles.
- Real-time sensor cards (Temp °C, Vib g, Sound dB, Current A) with Green/Yellow/Red status.
- Machine health indicator 0–100 %.
- System status banner (NORMAL / WARNING / CRITICAL).
- Recharts live line chart with auto-refresh.
- AI diagnostic panel (risk level, findings, recommended action).
- Alert popups (toasts) + alert history.
- Admin panel (users, thresholds, logs).
- History panel with time + machine filters.
- PDF report download.
- Role-based routes + JWT auth.

## Implemented (2026-04-20)
- Full backend (`/app/backend/server.py`): auth, machines, get-data, send-data, history, alerts, ai-insights, thresholds CRUD, users admin CRUD, logs, PDF.
- Seeded users `admin@pm.com/admin123`, `engineer@pm.com/engineer123`.
- Background sensor simulator + alert rate-limiter (15 s).
- Frontend pages: Login, Dashboard, History, Admin, Layout.
- Components: SensorCard, HealthGauge, StatusBanner, TrendChart, AIPanel, AlertsList, MachineSelector.
- Dark Swiss/high-contrast industrial theme (Safety Orange / Obsidian, IBM Plex Sans / Manrope / JetBrains Mono).
- 100 % backend and frontend E2E test pass (iteration_1).

## Backlog (P1/P2)
- **P1** Debounce AI insight calls + per-machine cache to save LLM credits.
- **P1** Catch 401 explicitly in Dashboard and redirect to `/login`.
- **P2** Confirmation dialog before user deletion in Admin.
- **P2** Migrate FastAPI `on_event` to `lifespan` context manager.
- **P2** Cancel background simulator task on shutdown.
- **P2** Add multi-user registration UI beyond admin-seed.
- **P2** Export CSV in addition to PDF.
- **P2** WebSocket push instead of 3 s polling.

## Next Tasks
- User acceptance review.
- Top up Emergent LLM key if more LLM-driven insights are desired.
- Choose one P1 item to tackle next.
