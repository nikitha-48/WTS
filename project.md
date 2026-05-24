# WTS — Work Task System

> Reference document capturing the current state of the project.
> Last reviewed: 2026-05-24 (post-Supabase wiring)

---

## 1. What this project is

An internal **Employee File Portal + Task Tracker** for **ssKatt**
(`@sskatt.com` emails enforced everywhere).

- **Employees** sign up → wait for admin approval → upload work files →
  receive tasks assigned by admins.
- **Admins** approve / deactivate / reactivate users, review uploaded files
  (`pending → reviewing → approved | rejected` with admin note), assign tasks
  (`pending → in_progress → done`) with optional admin-attached files.
- Real-time updates flow over Django Channels WebSockets.

---

## 2. Tech stack

### Frontend (root)
- React 18, Vite 5, React Router 6
- Tailwind CSS 3, Heroicons
- axios (now actively used for the API)

### Backend (`file-management-django-backend/`)
- Django 6.0.5, DRF 3.17, Channels 4.3 + Daphne
- `django-cors-headers`, Cloudinary, `dj-database-url`, `psycopg2-binary`
- Custom JWT auth via PyJWT (no SimpleJWT)
- `whitenoise`, `gunicorn` installed (whitenoise middleware not yet wired)

### Database
- **Supabase Postgres** at
  `db.drwkyxwilwutbtiakfle.supabase.co:5432/postgres`
- Connection driven by `DATABASE_URL` in
  `file-management-django-backend/.env`
- All Django app tables (`accounts_customuser`, `files_file`, `tasks_task`,
  `django_migrations`, …) live in the `public` schema. Migrations have been
  applied.

### Local dev runtime
- Python **3.12** (`runtime.txt` says 3.12; project venv at root `.venv` is 3.12)
- Node + npm
- `vercel.json` declares python 3.13 — flagged as a deploy mismatch

---

## 3. Repository layout

```
WTS/
├── src/                              # React frontend
│   ├── App.jsx, main.jsx, api.js, index.css
│   ├── assets/logo.png
│   ├── components/                   # FileList, FileUpload, Layout, Navbar,
│   │                                 # PreviewModal, ProtectedRoute,
│   │                                 # ReviewModal, ShareModal, StatusBadge,
│   │                                 # TaskRow
│   ├── context/                      # AuthContext, FilesContext, TasksContext
│   ├── hooks/useWebSocket.js
│   ├── pages/                        # Login, Signup, Register, NotFound,
│   │                                 # AdminDashboard, EmployeeDashboard
│   └── utils/                        # dateUtils.js + 2 stray empty .py files
├── file-management-django-backend/
│   ├── accounts/                     # CustomUser, JWT auth, registration
│   ├── files/                        # File model + WS consumer + viewset
│   ├── tasks/                        # Task model + WS consumer + viewset
│   ├── config/                       # settings, urls, asgi, wsgi, routing
│   ├── manage.py, build.sh, runtime.txt, requirements.txt
│   ├── pyrightconfig.json
│   └── helpers: check_local_users.py, check_postgres_connection.py,
│                dump_supabase_data.py
├── docs/                             # Stale Vite build (broken /FMS/ base)
├── dist/                             # Even older Vite build (orphan)
├── index.html
├── package.json, vite.config.js
├── tailwind.config.js, postcss.config.js
├── vercel.json
├── .env (root)                       # mirrors backend .env
├── .env.local                        # VITE_API_URL=http://localhost:8000/api
└── .gitignore
```

---

## 4. Backend details

### 4.1 Apps and models

| App        | File                       | Key fields / notes |
|------------|----------------------------|--------------------|
| `accounts` | `models.py::CustomUser`    | extends `AbstractUser`; `email` unique; `role` ∈ {`employee`,`admin`}, default `employee`; `department` default `General`; `profile_picture`; `is_active=False` and `is_approved=False` by default; helpers `is_employee()`, `is_admin_user()` |
| `files`    | `models.py::File`          | UUID PK; `original_name`, `file_name`, `mime_type`, `size`, `url`, `cloudinary_id`, `description`; FK `user` (CASCADE); status pipeline; `admin_note`; `reviewed_at`; FK `reviewed_by` (SET_NULL); `shared` Bool; M2M `shared_with` |
| `tasks`    | `models.py::Task`          | UUID PK; `title`, `description`, `assigned_to_email`; FK `assigned_to_user` (SET_NULL); FK `assigned_by_user` (CASCADE); status pipeline; `admin_file` (`FileField`); `due_date`, `completed_at` |

### 4.2 Authentication

- `accounts/authentication.JWTAuthentication` — `Authorization: Bearer <token>`,
  HS256 with `settings.SECRET_KEY`. Rejects unapproved/inactive accounts.
- `accounts/utils.create_jwt_token` issues 7-day tokens.
- Serializers (`accounts/serializers.py`):
  - `UserSerializer` — exposes `name`, `isActive`, `isApproved`, `createdAt`
    in addition to model fields, so the React UI can consume it directly.
  - `UserRegistrationSerializer` — accepts `{email, password, name, department}`
    (no separate `username` or `password2`); enforces `@sskatt.com`; new
    employees start `is_active=False, is_approved=False`. Auto-derives a
    `username` from the email, splits `name` into `first_name` / `last_name`.
  - `AdminRegistrationSerializer` — same shape; auto staff/superuser/active/approved.
  - `UserLoginSerializer`.

### 4.3 API endpoints (`config/urls.py`)

All under `/api/` (router prefix). Router registers `auth`, `files`, `tasks`.

**Auth (`UserViewSet`)**
- `POST   /api/auth/register/`           — public
- `POST   /api/auth/login/`              — public; 403 if pending approval
- `GET    /api/auth/me/`                 — auth
- `GET    /api/auth/`                    — admin (list employees)
- `PATCH  /api/auth/{id}/approve_user/`  — admin
- `PATCH  /api/auth/{id}/deactivate_user/` — admin
- `PATCH  /api/auth/{id}/activate_user/` — admin
- `DELETE /api/auth/{id}/delete_user/`   — admin

**Files (`FileViewSet`)** — full CRUD plus
- `PATCH  /api/files/{id}/update_status/` — admin review
- Accepts `multipart/form-data` for create. `url`, `cloudinary_id`,
  `file_name`, `mime_type`, `size` are server-populated.
- Storage: Cloudinary if real credentials are configured, else local
  `MEDIA_ROOT/employee-files/` with the URL served at `/media/...` in DEBUG.

**Tasks (`TaskViewSet`)** — full CRUD plus
- `PATCH  /api/tasks/{id}/update_status/`
- Create accepts multipart for an optional `admin_file`.
- `assigned_by_user` is set from the authed user; `assigned_to_user` is
  resolved by email lookup.

### 4.4 WebSockets

- `config/routing.py`:
  - `ws/files/` → `files.consumers.FileConsumer` (broadcast group `files_group`)
  - `ws/tasks/` → `tasks.consumers.TaskConsumer` (per-user group `tasks_<slugify(email)>`)
- Consumers fixed to use the actual snake_case model fields (`created_at`,
  `original_name`, `due_date`).
- Auth: `config/asgi.py` still uses `AuthMiddlewareStack` (cookie/session).
  The frontend appends `?token=<jwt>` but no JWT-aware Channels middleware
  is installed yet, so WS connections are anonymous and `TaskConsumer` falls
  back to the `tasks_anonymous` group. Per-user task push will start
  working once a JWT middleware is added (open work item).

### 4.5 Settings (`config/settings.py`)

- DB: `DATABASE_URL` → Postgres via `dj_database_url.parse(..., ssl_require=True)`;
  SQLite fallback if missing.
- `CHANNEL_LAYERS = InMemoryChannelLayer` (single-process only).
  `channels_redis` is in requirements but not yet activated.
- `DEBUG` defaults to True if env missing.
- `ALLOWED_HOSTS = ['localhost', '127.0.0.1']` (hardcoded — not prod-ready).
- DRF default auth = JWT, default permission = `IsAuthenticated`.
- CORS allows `localhost:3000`, `localhost:5173` with credentials.
- Cloudinary configured from env. The view layer also detects placeholder
  values and falls back to local disk so dev works without real keys.
- `urls.py` serves `/media/` while DEBUG.

### 4.6 Helper scripts

- `build.sh` — Render-style build (pip install + collectstatic + migrate).
- `check_local_users.py` — uses discrete `DATABASE_*` env vars (different
  from the `DATABASE_URL` config the app uses).
- `check_postgres_connection.py` — sanity-check `DATABASE_URL`.
- `dump_supabase_data.py` — list public tables, row counts, and dump the
  app tables (`accounts_customuser`, `files_file`, `tasks_task`).
- `pyrightconfig.json` — type-checker config.

---

## 5. Frontend details

### 5.1 Routing (`src/App.jsx`)

| Path        | Element                                       | Notes |
|-------------|-----------------------------------------------|-------|
| `/login`    | `Login`                                       | redirects to dashboard if logged in |
| `/signup`   | `Signup`                                      | redirects to `/employee` if logged in |
| `/`         | redirect to `/admin` or `/employee` by role   | else `/login` |
| `/employee` | `EmployeeDashboard` (via `ProtectedRoute`)    | role: employee |
| `/admin`    | `AdminDashboard` (via `ProtectedRoute`)       | role: admin |
| `*`         | `NotFound`                                    | catch-all |

`Register.jsx` is still orphan (not imported).

### 5.2 Pages

- `Login.jsx` — awaits `useAuth().login`; shows demo-account quick-fill buttons
  (these only prefill the form; the demo accounts no longer exist server-side).
- `Signup.jsx` — awaits `useAuth().signup`; shows pending-approval screen.
- `AdminDashboard.jsx` — tabs (needs review / all files / task manager /
  employees), opens `ws://localhost:8000/ws/files/`, lists files+tasks from
  context, employees from `getAllEmployees()`.
- `EmployeeDashboard.jsx` — tabs (Today / Sort & Filter / File stats / Your
  tasks), upload widget, opens `ws://localhost:8000/ws/tasks/`.
- `NotFound.jsx`.

### 5.3 Contexts (now backed by the REST API)

- **`AuthContext`** — bootstraps from `localStorage[authToken]` by hitting
  `GET /auth/me/`. Exposes:
  - `user, login, signup, logout, loading, isAuthenticated, isAdmin`
  - `getAllEmployees, getPendingEmployees` — return cached list, trigger a
    background refresh
  - `approveEmployee, deactivateEmployee, reactivateEmployee` — async PATCH
  - `refreshEmployees`
- **`FilesContext`** — `files` from `GET /files/`. Methods:
  - `addFile({file, description, ...})` → `POST /files/` (multipart)
  - `updateFileStatus(id, status, adminNote)` → `PATCH /files/{id}/update_status/`
  - `toggleShared(id, value)` → `PATCH /files/{id}/`
  - `refreshFiles()`
  - All API responses are normalised into the camelCase shape the components
    expect (`originalName`, `userName`, `userEmail`, `mimeType`, `createdAt`).
- **`TasksContext`** — `tasks` from `GET /tasks/`. Methods:
  - `addTask({title, description, assignedToEmail, adminFile})` →
    `POST /tasks/` (multipart)
  - `updateTaskStatus(id, status)` → `PATCH /tasks/{id}/update_status/`
  - `refreshTasks()`

### 5.4 API integration (`src/api.js`)

- `baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'`
- Single token storage key exported as `TOKEN_STORAGE_KEY = 'authToken'`.
- Helpers: `apiErrorMessage(err)` (extracts a UI-friendly error string),
  `absoluteUrl(path)` (turns `/media/...` into a full URL).

### 5.5 WebSockets (`src/hooks/useWebSocket.js`)

- Uses the same `TOKEN_STORAGE_KEY` so the JWT in the query string matches
  what the API uses.
- Sends `{ action: 'get_files' }` to `/ws/files/` and `{ action: 'get_my_tasks' }`
  to `/ws/tasks/` on connect.

### 5.6 Components

| Component        | Purpose | Status |
|------------------|---------|--------|
| `FileList`       | Tabular list with type icons, status pill, action icons | active |
| `FileUpload`     | Drag-and-drop or click upload with optional notes | active |
| `Layout`         | Older alternative chrome | dead — `Navbar` is used instead |
| `Navbar`         | Brand bar with logo, user, role, logout | active |
| `PreviewModal`   | Inline previews for image / PDF / text formats | active |
| `ProtectedRoute` | Auth + role gate | active |
| `ReviewModal`    | Approve / Reject / Reviewing + admin note | active |
| `ShareModal`     | Generates placeholder URL and copies to clipboard | active (UI only) |
| `StatusBadge`    | Pill for file status | active |
| `TaskRow`        | Standalone row component | dead — `EmployeeDashboard` defines its own |

### 5.7 Build / deploy

- `vite.config.js` — `base: '/'`, `build.outDir: 'docs'`, dev server on 5173.
- `vercel.json`:
  - `@vercel/python` runtime `python3.13` against `config/wsgi.py`
    (HTTP only — Channels/WebSockets won't run there).
  - `@vercel/static-build` reading `package.json` with `distDir: 'docs'`.
- `package.json` scripts: `dev`, `build`, `preview`, `lint` (no real linter).

---

## 6. Environment variables

### Root `.env`
- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`
- `DATABASE_NAME`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_HOST`,
  `DATABASE_PORT` (only used by `check_local_users.py`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `JWT_SECRET_KEY` (declared but unused)

### `file-management-django-backend/.env`
- Same keys as root, plus `DATABASE_URL` pointing at Supabase.

### `.env.local` (frontend, gitignored)
- `VITE_API_URL=http://localhost:8000/api`

---

## 7. End-to-end smoke test (verified)

The full register → approve → login → upload → task flow has been verified
against the live Supabase database:

1. `POST /api/auth/register/` → 201, `status: "pending_approval"`
2. `POST /api/auth/login/` while pending → 403
3. ORM flips `is_active=True, is_approved=True`
4. `POST /api/auth/login/` → 200 with JWT
5. `GET /api/auth/me/` with bearer → 200
6. `POST /api/files/` (multipart with `file=...`) → 201, row in `files_file`,
   file at `/media/employee-files/...`
7. `GET /api/files/` → 200 with the upload
8. Admin `POST /api/tasks/` (multipart) → 201,
   `assigned_by_user_id` and `assigned_to_user_id` resolved from email
9. `PATCH /api/tasks/{id}/update_status/` → 200, status reflected

---

## 8. Known issues still open

- **WebSocket auth**: `config/asgi.py` only wires `AuthMiddlewareStack`
  (cookie auth). The frontend sends `?token=<jwt>`, but no JWT-aware
  Channels middleware reads it. Result: WS scope is anonymous and
  `TaskConsumer` falls back to `tasks_anonymous`. Need a custom
  `JWTAuthMiddleware` for Channels.
- **Channel layer**: `InMemoryChannelLayer` won't survive multi-worker
  deploys. `channels_redis` is in requirements; needs activation in
  settings.
- **Production hardening**: `DEBUG` defaults to True if env is missing,
  `ALLOWED_HOSTS` is hardcoded to localhost, no whitenoise middleware.
- **Vercel deploy**: `vercel.json` runs `wsgi.py` (no WebSockets), python
  version mismatch with `runtime.txt` (3.13 vs 3.12), and the committed
  `docs/` is a stale GitHub Pages build referencing a `/FMS/` base.
  Channels in production needs Render or Railway, not Vercel.
- **`accounts/urls.py`**: `AdminViewSet` defined there is still not
  included in `config/urls.py`. All `/admins/...` endpoints are dead.
- **Dead code**: `src/pages/Register.jsx`, `src/components/Layout.jsx`,
  `src/components/TaskRow.jsx`, `src/utils/cloudinary_config.py`,
  `src/utils/__init__.py`, plus `pg`/`sequelize`/`gh-pages` in
  `package.json`.
- **Stale build outputs**: `dist/` and `docs/` should be cleaned and
  regenerated.

---

## 9. Quick commands

### Frontend
```cmd
npm install
npm run dev          REM Vite dev server on http://localhost:5173
npm run build        REM Output goes to docs/
npm run preview
```

### Backend (from `file-management-django-backend/`)
```cmd
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py createsuperuser
..\.venv\Scripts\python.exe manage.py runserver         REM HTTP on http://localhost:8000

REM For WebSockets, run via Daphne
..\.venv\Scripts\daphne.exe -p 8000 config.asgi:application
```

### Inspecting Supabase data
```cmd
..\.venv\Scripts\python.exe file-management-django-backend\dump_supabase_data.py
```

---

## 10. Summary

The frontend now talks to the real Django REST API for **auth, files, and
tasks**, and every write lands in Supabase Postgres. Files store the binary
either in Cloudinary (when configured) or in `MEDIA_ROOT/employee-files/`
locally — the metadata always lives in `files_file`. Tasks resolve
`assigned_by_user` from the request and `assigned_to_user` from the email,
and they are persisted in `tasks_task`. WebSockets still need a JWT-aware
Channels middleware to deliver per-user task notifications correctly, but
they don't block the REST persistence path.
