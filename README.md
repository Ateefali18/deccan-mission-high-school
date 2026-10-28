# DECCAN MISSION HIGH SCHOOL ERP
**Phase 1 Foundation: Architecture, Relational Database, RBAC Authentication & Royal Dark/Gold UI**  
*Location: Hyderabad, Telangana, India • CBSE Affiliation No: TS-HYD-CBSE-41092*

---

## 1. System Overview

This repository represents **Phase 1 of 3** for the production-grade School ERP designed for **Deccan Mission High School, Hyderabad**. It establishes the core database architecture, multi-role authentication with strict server-side resource isolation, structured logging, Alembic migrations, and the Royal Dark & Gold design system.

### Key Capabilities in Phase 1:
- **Relational Persistence**: 12 normalized SQLAlchemy models running under Alembic migrations.
- **Strict School & Role Isolation**:
  - **Admin/Principal**: School-wide management of students, faculty, classes, sections, and academic sessions.
  - **Teacher (Faculty)**: Restricted strictly to assigned classes, sections, and authorized students.
  - **Student**: Isolated strictly to their own personal record, enrollment status, and authorized school notices.
- **Security & RBAC**:
  - Direct bcrypt hashing with 12 salt rounds (no deprecated wrappers).
  - Dual session handling: HttpOnly SameSite browser cookies + Bearer token header support.
  - In-memory rate limiting on authentication attempts.
  - Safe initial administrator bootstrap command refusing unexpected overwrites.
- **Royal Dark & Gold Design System**:
  - Official school-administration visual language.
  - WCAG 2.2 AA compliant contrast.
  - Light, Dark, and System theme modes with live switcher.
  - Responsive AppShell with collapsible desktop sidebar and mobile drawer.
- **Global Search Foundation**:
  - Server-side debounced queries indexing student admission numbers, student names, teacher employee IDs, and teacher names.
- **Phase 2 & Phase 3 Readiness**:
  - Honest "Coming Soon" states for upcoming modules (Attendance, Exams, Marks, Timetable, Fees, AI Assistant) without fake functionality.

---

## 2. Tech Stack

| Layer | Technology | Version / Specification |
|---|---|---|
| **Frontend** | React + TypeScript + Vite | React 18, TypeScript 5.6, Vite 5.4 |
| **Styling** | Tailwind CSS + CSS Variables | Royal Dark & Gold Theme Palette |
| **Routing** | React Router DOM | v6.28 with Protected Client-Side Shells |
| **Icons** | Lucide React | v0.468 |
| **Validation** | React Hook Form + Zod | Schema-based client validation |
| **Testing (Frontend)** | Vitest + Happy-DOM | Component & schema test suite |
| **Backend** | Python FastAPI | v0.162+ |
| **ORM & DB** | SQLAlchemy 2.0 + Alembic | PostgreSQL (Production target) / SQLite (Dev) |
| **Security** | Bcrypt + Python-Jose (JWT) | Password hashing & Token generation |
| **Testing (Backend)** | Pytest + HTTPX | 15 foundational integration tests |

---

## 3. Project Directory Structure

```text
dmhs/
├── backend/
│   ├── alembic/                      # Alembic database migrations
│   │   ├── versions/                 # Version scripts (04b664b0a2c3_initial_schema.py)
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/        # Auth, Schools, Classes, Students, Teachers, Dashboards, Search, Health
│   │   │   │   └── api.py            # Central v1 router mount
│   │   │   └── deps.py               # Dependency injection & RBAC gatekeepers
│   │   ├── core/
│   │   │   ├── config.py             # Pydantic BaseSettings
│   │   │   ├── security.py           # Bcrypt hashing & JWT management
│   │   │   ├── logging.py            # Structured logging setup
│   │   │   └── exceptions.py         # Standardized HTTP exceptions
│   │   ├── db/
│   │   │   └── session.py            # Engine, Base, and SessionLocal
│   │   ├── models/                   # 12 Normalized SQLAlchemy Models
│   │   │   ├── school.py
│   │   │   ├── academic_year.py
│   │   │   ├── role.py
│   │   │   ├── user.py
│   │   │   ├── teacher_profile.py
│   │   │   ├── student_profile.py
│   │   │   ├── class_model.py
│   │   │   ├── section.py
│   │   │   ├── student_enrollment.py
│   │   │   ├── teacher_assignment.py
│   │   │   └── audit_log.py
│   │   ├── permissions/
│   │   │   └── rules.py              # Centralized resource-level authorization
│   │   ├── schemas/                  # Pydantic v2 validation contracts
│   │   ├── services/                 # Business logic for auth, dashboards, search, students
│   │   ├── tests/                    # Automated pytest suite
│   │   ├── cli.py                    # Admin bootstrap and dev seeding CLI
│   │   └── main.py                   # FastAPI Application Root
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── app/                      # AuthContext, ThemeContext, AppRoutes
│   │   ├── components/
│   │   │   ├── navigation/           # Sidebar, TopNav, GlobalSearch, UserMenu, Breadcrumbs
│   │   │   ├── shared/               # PageHeader, MetricCard, ComingSoonCard, ProtectedRoute
│   │   │   └── ui/                   # Button, Input, Select, Badge, Card, Dialog, Table, Toast...
│   │   ├── layouts/                  # AppShell
│   │   ├── pages/
│   │   │   ├── auth/                 # LoginPage
│   │   │   ├── admin/                # AdminDashboard, StudentsPage, TeachersPage, ClassesPage, AcademicYearsPage
│   │   │   ├── teacher/              # TeacherDashboard, MyStudentsPage, TeacherProfilePage
│   │   │   ├── student/              # StudentDashboard, StudentProfilePage
│   │   │   └── common/               # ComingSoonPage, AccessDeniedPage, NotFoundPage
│   │   ├── services/                 # API client wrapper
│   │   ├── types/                    # TypeScript interfaces
│   │   ├── tests/                    # Vitest test suite
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── vitest.config.ts
├── run_dev.ps1                       # Root PowerShell startup script
└── README.md
```

---

## 4. Database Setup & Migrations

The schema is completely managed by **Alembic**.

### Migration Commands:
To apply all migrations to the database:
```powershell
cd backend
alembic upgrade head
```

To create a new schema migration:
```powershell
cd backend
alembic revision --autogenerate -m "description_of_change"
```

### PostgreSQL vs. SQLite Configuration:
- **Development/Testing Default**: `sqlite:///./dmhs.db` (zero external dependencies).
- **Production Deployment Target**: Set `DATABASE_URL` in `backend/.env`:
  ```bash
  DATABASE_URL=postgresql+psycopg2://<user>:<password>@<host>:5432/<dbname>
  ```

---

## 5. First-Time Administrator Bootstrap

Security requirements mandate that **no hard-coded admin passwords** exist in production. Use the administrative CLI command to safely provision the initial principal account.

```powershell
cd backend
python -m app.cli bootstrap-admin --username admin --email principal@dmhs.edu.in --name "Dr. K. R. Ahmed"
```
*Note: If `--password` is omitted, the CLI will securely prompt for password entry with confirmation. If an administrator account already exists for the school, the script will refuse to overwrite it.*

### Development Demo Seeding:
For immediate testing and verification of all portals:
```powershell
cd backend
python -m app.cli seed-dev-data
```
This populates:
- **Academic Year**: 2025–2026 (Active)
- **Classes**: Class 1 through Class 10 with sections A and B
- **Admin**: `admin` / `Admin@DMHS2026`
- **Teacher**: `teacher1` / `Teacher@DMHS2026` (EMP-1001)
- **Student**: `student1` / `Student@DMHS2026` (ADM-2025-0101)

---

## 6. How to Run the Complete Application

### Option A: Using Root Helper Script (Windows PowerShell)
```powershell
.\run_dev.ps1
```

### Option B: Running Manually

**Terminal 1 (Backend API):**
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

**Terminal 2 (Frontend UI):**
```powershell
cd frontend
npm run dev
```
Access the application at: `http://localhost:5173`

---

## 7. Running Automated Tests

### Backend Test Suite (Pytest):
```powershell
cd backend
python -m pytest -v
```
**Results**: 15 passed, covering:
- Health check & database connectivity
- Login authentication & invalid credential defense
- Protected routes & token decoding
- Student isolation (students blocked from viewing other student profiles)
- Teacher assignment restriction (teachers blocked from unassigned sections)
- Admin privileges and class creation
- Global search by admission number & employee ID
- Real-time dashboard database counts
- Relational persistence verification

### Frontend Test Suite (Vitest):
```powershell
cd frontend
npm run test
```
**Results**: 4 passed, covering:
- Zod student admission form validation
- ThemeContext switching (Light, Dark, System)
- DOM class toggles and localStorage synchronization

### Frontend Production Build:
```powershell
cd frontend
npm run build
```
**Results**: Succeeded (`tsc && vite build`), generating optimized bundles in `dist/`.

---

## 8. Implemented Routes & Endpoints

### Backend REST API (`/api/v1`):
- `GET /health`: System & database connectivity check.
- `POST /auth/login`: Authenticate and receive JWT + HttpOnly cookie.
- `POST /auth/logout`: Invalidate session and clear cookie.
- `GET /auth/me`: Fetch authenticated user profile and roles.
- `GET /schools/current`: Read current school configuration.
- `GET /academic-years/`: List academic sessions.
- `POST /academic-years/`: Create new academic session (Admin only).
- `GET /classes/`: List classes with sections.
- `POST /classes/`: Create class (Admin only).
- `POST /classes/{class_id}/sections`: Create section for class (Admin only).
- `GET /students/`: Paginated student list (with class/section filtering).
- `POST /students/`: Admit student with enrollment (Admin only).
- `GET /students/{id}`: Detailed profile (with role-based access checks).
- `GET /students/me/profile`: Student profile for signed-in account.
- `GET /teachers/`: Paginated teacher list.
- `POST /teachers/`: Register faculty member (Admin only).
- `GET /teachers/{id}`: Faculty details & assignments.
- `GET /teachers/me/profile`: Faculty profile for signed-in account.
- `GET /dashboards/admin`: Real database counts & activity log.
- `GET /dashboards/teacher`: Teacher assigned classes, subjects, authorized student count.
- `GET /dashboards/student`: Student enrollment, roll number, term status.
- `GET /search/?q=...`: Server-side global directory search.

### Frontend Client Routes:
- `/login`: Professional sign-in with quick dev autofill credentials.
- `/admin/dashboard`: Principal metrics & operations.
- `/admin/students`: Student directory with admission modal.
- `/admin/teachers`: Faculty directory with registration modal.
- `/admin/classes`: Class and section capacity manager.
- `/admin/academic-years`: School term manager.
- `/teacher/dashboard`: Teacher dashboard with assignment cards.
- `/teacher/my-students`: Authorized student roll list.
- `/teacher/profile`: Faculty credentials card.
- `/student/dashboard`: Student academic portal.
- `/student/profile`: Student admission and enrollment record.
- `/coming-soon`: Honest roadmap placeholder for Phase 2/3.
- `/access-denied`: 403 Forbidden security boundary.

---

## 9. Phase 2 — Supabase Connection & Live Cloud Persistence

The ERP is fully connected to the Deccan Mission High School Supabase project:
- **Supabase Project URL**: `https://snnzmgbkiiydboujublj.supabase.co`
- **Supabase Dashboard**: `https://supabase.com/dashboard/project/snnzmgbkiiydboujublj`
- **SQL Editor**: `https://supabase.com/dashboard/project/snnzmgbkiiydboujublj/sql/new`

### Complete 40-Table PostgreSQL Schema
The database contains 40 normalized tables with high-performance B-Tree indexes, Row-Level Security (RLS) policies, and Supabase Storage buckets:

1. **School Configuration**: `schools`, `school_settings`, `academic_years`, `classes`, `sections`, `subjects`, `class_subjects`, `timetable_entries`.
2. **Identity & User Profiles**: `profiles`, `user_roles`, `teachers`, `teacher_profiles`, `teacher_assignments`, `teacher_subject_assignments`, `teacher_class_assignments`.
3. **Student Information & Dossier**: `students`, `student_profiles`, `student_enrollments`, `student_guardians`, `student_documents`, `document_requirements`, `student_status_history`.
4. **Attendance System**: `attendance_sessions`, `attendance_records`, `attendance_summaries`.
5. **Examinations & Marks**: `exam_types`, `exams`, `exam_subjects`, `marks`.
6. **Fees & Billing**: `fee_categories`, `fee_structures`, `fee_discounts`, `invoices`, `payments`.
7. **Communication & Academics**: `notices`, `assignments`, `assignment_submissions`, `leave_applications`, `notifications`, `audit_logs`.
8. **AI Assistant Foundation**: `ai_conversations`, `ai_messages`, `ai_feedback`.

### Supabase Storage Buckets
- `profile-photos`: Public storage bucket for student & faculty profile avatars.
- `student-documents`: Private authenticated storage bucket for certificates, Transfer Certificates (TC), birth records, and previous report cards.

### Version-Controlled Migration Files
- `supabase/migrations/20261028000001_initial_dmhs_schema.sql` (Tables & Indexes)
- `supabase/migrations/20261028000002_rls_and_policies.sql` (Row-Level Security & Helper Functions)
- `supabase/migrations/20261028000003_storage_buckets.sql` (Storage Buckets & Object Policies)
- `supabase/migrations/20261028000004_seed_initial_data.sql` (Seed Data: DMHS-HYD, Classes 1-10, Subjects, Faculty, Students)
- `supabase/complete_dmhs_supabase_schema.sql` (Single ready-to-run file for 1-click execution in the Supabase SQL Editor)

### How to Apply to Your Supabase Project
1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/snnzmgbkiiydboujublj/sql/new).
2. Open `supabase/complete_dmhs_supabase_schema.sql` in this repo, copy its contents, and paste into the SQL editor.
3. Click **Run**. All 40 tables, RLS policies, storage buckets, and initial seeds will be applied instantly.
4. Copy your **Publishable (anon) API Key** from **Project Settings → API** and paste it into `frontend/.env`:
   ```bash
   VITE_SUPABASE_ANON_KEY=your_actual_publishable_anon_key_here
   ```
5. Reload the frontend. The ERP top banner will display: `⚡ Supabase Connected: Live data persistence active`.

---

## 10. Phase 3 — Production-Ready AI Assistant, Realtime Sync & Verification

Phase 3 completes the school ERP with an enterprise AI assistant architecture, real-time database synchronization, standardized attendance logic, timetable period calculation, and exhaustive test suites.

### 1. Secure AI Assistant Architecture
- **Provider Abstraction**: Configured via server-side environment variables `AI_PROVIDER` (default `"gemini"`), `AI_MODEL` (`"gemini-1.5-pro"`), and `AI_API_KEY`.
- **Zero Raw SQL Exposure**: The AI engine uses pre-validated, role-gated query functions. Arbitrary model-generated SQL execution is strictly prevented.
- **Strict Role-Scoped Answering**:
  - **Admin**: School-wide student lookups, low-attendance alerts (<75%), fee totals, upcoming CBSE exams, faculty assignments, notices.
  - **Teacher**: Restricted strictly to assigned classes/sections. Timetable periods, student roll call, low-attendance alerts for assigned students. Financials and unassigned classes are blocked.
  - **Student**: Isolated strictly to their own student record, current period, overall attendance percentage, published marks, and principal announcements. Disclosing other student records is strictly blocked.
- **Interactive Global AI Drawer**: Available across all portals via floating trigger pill and keyboard shortcut with role-tailored prompt suggestions and direct navigation links to student records and attendance.

### 2. Standardized Attendance Formula
$$\text{Attendance Percentage} = \frac{\text{Present} + (\text{Late} \times \text{Weight})}{\text{Total Sessions} - \text{Excused Sessions}} \times 100$$
- Configurable late weight (default `1.0`) and excused denominator exclusion.
- Low-attendance alerts automatically flag students below the 75% CBSE requirement.

### 3. Timetable & Next Period Calculation
- Timezone-aware calculation (`Asia/Kolkata`) comparing current time against the master timetable for today’s day-of-week.
- Determines currently running periods, remaining time, and next period with subject and room number.

### 4. Supabase Realtime Synchronization
- Dynamic subscriptions via `useRealtimeSync` hook listening to `students`, `teachers`, `attendance_records`, `notices`, `invoices`, and `timetable_entries`.
- Automatic clean-up on unmount prevents duplicate listeners and infinite re-fetch loops.

### 5. Automated Test Results
- **Backend Pytest Suite**: **20 passed (100%)**
  - `test_auth.py`: Health check, login authentication, invalid password defense, token decoding, logout.
  - `test_dashboards.py`: Admin database counts, teacher authorized assignments, student profile metrics.
  - `test_permissions.py`: Student isolation, teacher assignment boundary, admin access control.
  - `test_search.py`: Debounced admission number and employee ID lookups, term persistence.
  - `test_ai_and_attendance.py`: Standardized attendance formula, AI next period calculation, admission lookup, financial boundary protection, notice retrieval.
- **Frontend Vitest Suite**: **9 passed (100%)**
  - `attendance_and_ai.test.ts`: Attendance percentages, weighting, low-attendance threshold.
  - `validation.test.ts`: Zod schema validation rules.
  - `ThemeSelector.test.tsx`: Royal Dark & Gold theme toggles, DOM class mutations, localStorage sync.
- **Frontend Production Build**: `tsc && vite build` succeeded with **0 errors**.
