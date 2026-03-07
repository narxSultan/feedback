# feedback-system

Event Feedback Platform with Angular + Tailwind frontend, Express backend, and PostgreSQL database.

## Structure

- `backend` - Node.js + Express API
- `frontend` - Angular + Tailwind web app

## Backend Setup

```bash
cd backend
cp .env.example .env
npm install
```

Customize upload size limits in `backend/.env` if needed:

```bash
UPLOAD_IMAGE_MAX_MB=1.5
EVENT_IMAGE_MAX_MB=1.5
PROFILE_IMAGE_MAX_MB=1.0
```

Create database tables:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

If tables already existed before this update, run:

```bash
psql "$DATABASE_URL" -f db/migrations/001_add_event_image_url.sql
psql "$DATABASE_URL" -f db/migrations/002_users_subscription_activity.sql
```

Create an admin user:

```bash
node src/utils/createAdmin.js "Admin" "admin@example.com" "admin123"
```

Run backend:

```bash
npm run dev
```

Backend base URL: `http://localhost:5000/api`

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend URL: `http://localhost:4200`

## REST APIs

- `POST /api/admin/login`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId/role`
- `GET /api/admin/activities`
- `GET /api/admin/public-feedback?search=...`
- `GET /api/events`
- `POST /api/events`
- `POST /api/events/upload-image`
- `POST /api/feedback`
- `GET /api/feedback/event/:eventId`
- `POST /api/donate`
- `POST /api/users/register`
- `POST /api/users/login`
- `POST /api/users/forgot-password`
- `POST /api/users/reset-password`
- `GET /api/users/dashboard`
- `POST /api/users/events`
- `POST /api/users/payments`
- `DELETE /api/users/payments/:paymentId`
- `DELETE /api/users/payments`
- `GET /api/users/events/:eventId/feedback`
- `GET /api/users/feedback-history`
- `GET /api/users/me`
- `PUT /api/users/me`
- `PATCH /api/users/change-password`
- `POST /api/users/upload-event-image`
- `POST /api/users/upload-profile-image`

## Notes

- Event creation generates codes in format `EVT-A93KD`
- Participant feedback and donations work without user registration
- Event and feedback viewing APIs are protected with admin JWT auth
- User accounts can create their own events and pay subscription/donation from user dashboard
- Admin can assign/remove user role (`user` or `admin`)
- User dashboard includes feedback count/history, CSV export, profile update, profile image upload, and password change
- Forgot password sends reset link to registered email (configure SMTP in `backend/.env`)
