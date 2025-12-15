# C-FLOW (Capstone Report Submission System)

The capstone report submission system is designed to streamline and simplify the process of submitting, reviewing, and managing multiple versions of student reports. The system aims to address key pain points faced by administrators, lecturers, and students in managing courses and handling different versions of reports, feedback, and revisions. By creating a user-friendly, real-world system that minimizes confusion, the platform ensures that administrators can efficiently manage courses, and both students and lecturers can easily track the progress of a report and the corresponding feedback.

## Features

### F1. Authentication
- Users can log in using School of Information Technology (SIT) accounts.

---

### F2. User Management
- Administrators can manage user accounts without requiring user self-registration.
- Add users manually include SoLA lecturer.
- Fetch student information into the system.
- Update user status.

---

### F3. Course Management
- Administrators can perform full CRUD (Create, Read, Update, Delete) operations on courses.
- Create a course and assign an academic program.
- Update course information.
- Delete a course.
- Add students, lecturers, and administrators to a course.
- View course information and submission status summary via the dashboard.
- View submission status for each student group.

---

### F4. Student Grouping with Lecturer Assignment
- Administrators can assign students into groups and designate lecturers.
- Download Excel template for group creation.
- Create groups manually or via Excel upload.
- Update group details.
- Delete groups.

---

### F5. Announcements
- Administrators and lecturers can post announcements within a course.
- All enrolled users can view announcements.
- Create announcements with file attachments.
- Update announcements.
- Delete announcements.

---

### F6. File Management
- Administrators and lecturers can upload shared files to a course.
- All enrolled users can access course files.
- Upload files.
- Download files.
- Delete files.

---

### F7. Assignment Creation
- Administrators can manage assignments directly within the system.
- Title and description
- Related files
- Deliverables
- Allowed submission file types
- Due date and end date
- Create assignments.
- Update assignments.
- Delete assignments.

---

### F8. Version Control
- The system automatically tracks and labels each submission version.
- Both students and lecturers can clearly view submission history.
- Students can create submission versions with descriptions and attached files.
- Lecturers can provide feedback within the same version.
- Access to both latest submission and full version history.

---

### F9. Submission
- Students can submit their work under the latest version.
- Add submission descriptions.
- Upload submission files.

---

### F10. Feedback Management
- Lecturers can provide feedback linked to specific submission versions.
- Write feedback comments within the system.
- Upload annotated or feedback files and return them to students.
- Update submission status (e.g., Approved, Approved with Feedback, Not Approved).
- Update assignment due dates.

---

### F11. Automatic File Renaming
- Uploaded files are automatically renamed using a standardized format.

**Examples**
- Student submission  
  - CS program: `G01_Chapter1_V02.pdf`  
  - DSI program: `G0001_Chapter1_V02.pdf`

- Lecturer feedback  
  - CS program: `LecturerName_G01_Chapter1_V02.pdf`  
  - DSI program: `LecturerName_G0001_Chapter1_V02.pdf`

---

### F12. Automated Notifications
- The system automatically notifies users via email and in-system announcements.

## Tech Stack

### Frontend
- **Next.js** (v14.x)
- **React** (v18.x)
- **TypeScript** (v5.x)
- **Tailwind CSS** (v3.4+)

### Backend
- **Bun** (v1.1+)
- **TypeScript** (v5.x)
- **Hono** (v4.x)
- **Nodemailer** (v6.x)

### Database
- **PostgreSQL** (v16.x)

### ORM
- **Prisma** (v5.x)

### Storage
- **MinIO (S3-compatible object storage)** (vRELEASE.2024+)

## Repository Structure

```text
backend/
├── dist/                # Compiled output (build files)
├── node_modules/        # Project dependencies
├── prisma/              # Prisma schema and migrations
├── src/
│   ├── assets/          # Static assets and resources
│   ├── controller/     # Request handlers and business logic
│   ├── lib/             # Shared libraries and external service setups
│   ├── mail/            # Email templates and mail service logic
│   ├── middleware/     # Custom middleware (auth, validation, etc.)
│   ├── model/           # Data models and domain logic
│   ├── router/          # API route definitions
│   ├── types/           # TypeScript type definitions
│   ├── util/            # Utility and helper functions
│   ├── index.ts         # Application entry point
│   └── prisma.ts        # Prisma client initialization
├── .env                 # Environment variables
├── .gitignore           # Git ignore configuration
├── bun.lockb            # Bun lock file
├── dockerfile           # Docker configuration for deployment
├── package.json         # Project metadata and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md            # Project documentation
```

## Backend Setup (Bun + Hono)

### Install Dependencies
```bash
bun install
```

### Configure environment variables

```bash
# --------------------
# Database (PostgreSQL)
# --------------------
DATABASE_URL="postgresql://cflow:<PASSWORD>@localhost:5432/cflow_db?schema=public"

# -------------
# Auth (JWT)
# -------------
JWT_SECRET="replace-with-a-long-random-string"
JWT_EXPIRES_IN="1h"

# ----------------
# Storage (MinIO)
# ----------------
MINIO_ENDPOINT="minio"          # IP/Domain of Faculty VM MinIO
MINIO_ACCESS="<MINIO_ACCESS_KEY>"
MINIO_SECRET="<MINIO_SECRET_KEY>"
MINIO_BUCKET="cflow"

# ----------------------------
# SIT OIDC Authentication
# ----------------------------
OIDC_ISSUER="https://login.sit.kmutt.ac.th/realms/adproj/"
OIDC_AUTH_URL="https://login.sit.kmutt.ac.th/realms/adproj/protocol/openid-connect/auth"
OIDC_TOKEN_URL="https://login.sit.kmutt.ac.th/realms/adproj/protocol/openid-connect/token"
OIDC_USERINFO_URL="https://login.sit.kmutt.ac.th/realms/adproj/protocol/openid-connect/userinfo"
OIDC_END_SESSION_URL="https://login.sit.kmutt.ac.th/realms/adproj/protocol/openid-connect/logout"

OIDC_CLIENT_ID="auth-xxxxxxxxxxxxxxxxxxxx"
OIDC_CLIENT_SECRET="<DO_NOT_COMMIT>"
OIDC_REDIRECT_URI="http://localhost:3000/auth/callback"

FRONTEND_AFTER_LOGIN_URL="http://localhost:3000"

# -----------------------
# Student Data Integration
# -----------------------
STUDENT_FETCH_DATA_URL="https://sitbrain.sit.kmutt.ac.th"

# ----------------
# Email (SMTP)
# ----------------
SMTP_HOST="smtp.sit.kmutt.ac.th"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="<SMTP_USERNAME>"
SMTP_PASS="<DO_NOT_COMMIT>"
MAIL_FROM="C-Flow System <no-reply@smtp.sit.kmutt.ac.th>"
```

### Prepare the Database
```bash
bun run db:generate
bun run db:migrate
```

### Run the Backend
```bash
bun dev
```
## Group Member
65130500211 Navin Dansaikul itdansaikul@gmail.com 0655324151
65130500241 Mananchai Chankhuong mark110447@gmail.com 0985614651