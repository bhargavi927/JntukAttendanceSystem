# JNTUK Attendance System (UI)


## Project Overview

This project is a comprehensive **Attendance Management System** designed to streamline the process of recording and verifying student attendance in an academic setting. It features a dual-interface web application (Student and Professor portals) that leverages modern web technologies to ensure secure, location-based, and verified attendance submissions.

### Key Value Propositions
- **Eliminates Proxy Attendance**: Uses geolocation enforcement and live photo uploads.
- **Automated Validation**: Checks submissions against class timetables and professor permissions.
- **Digital LMS Integration**: Provides easy access to subject materials linked via Google Drive.
- **Real-time Analytics**: Offers immediate insights into attendance percentage and history.

This project contains a React + Tailwind UI for login/signup with Firebase integration.

Setup

1. Copy `.env.local.example` to `.env.local` and fill in your Firebase config keys.
2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm start
```

Routes

- `/` — Login / Signup UI
- `/forgot` — Forgot password
- `/student` — Student dashboard (protected)
- `/professor` — Professor dashboard (protected)
- `/admin` — Admin dashboard (admin only)

Notes

- Profile images are stored in Supabase Storage (buckets: `profile-images`, `pdfs`). Configure `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in `.env.local`.
- Profile data is stored in Firebase (Firestore `users/{uid}` and optionally Realtime Database `users/{uid}` when `REACT_APP_FIREBASE_DATABASE_URL` is set).

- Add admin users by setting a custom claim `admin` in Firebase Auth via the Firebase Admin SDK or the Firebase console (for testing, you can manually add role: 'admin' in Firestore document).
- Firestore rules example is in `firestore.rules`.

## Fix: profile not saving (permission-denied) / Dashboard shows Student: -

This app saves profile data at:

- Firestore: `users/{uid}` (primary)
- Realtime Database: `users/{uid}` (fallback when configured)

If you see `permission-denied` during signup/profile save, your Firebase rules in the Console are not published (or you're on the wrong project).

### Publish rules from this repo (recommended)

This repo includes:

- `firestore.rules`
- `database.rules.json`
- `firebase.json` + `.firebaserc` (project: `attendencesystem-27682`)

Run:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules,database
```

### Verify the write succeeded

1. Firebase Console → **Firestore Database** → **Data**
	- Confirm document exists at `users/<your_uid>` with fields like `name`, `id`, `branch`, `phone`.
2. Firebase Console → **Realtime Database** (optional)
	- Confirm JSON exists at `users/<your_uid>`.
3. App Dashboard (dev mode)
	- The header shows: `Dev: profile=firestore|rtdb|none; id=...`

## Supabase private Storage (RLS) with Firebase Auth

If you want **private buckets** (RLS enabled) while keeping **Firebase Auth** as the only login, you must exchange a Firebase ID token for a Supabase-compatible JWT.

### Buckets

- `profile-images` (private)
- `pdfs` (private)

### RLS policies (Supabase SQL Editor)

This project stores objects under a UID prefix, e.g. `profile-images/<uid>/profile.jpg` and `pdfs/<uid>/...`.

```sql
alter table storage.objects enable row level security;

create policy "storage_select_own_folder"
on storage.objects
for select
to authenticated
using (
	bucket_id in ('profile-images','pdfs')
	and name like (auth.uid() || '/%')
);

create policy "storage_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
	bucket_id in ('profile-images','pdfs')
	and name like (auth.uid() || '/%')
);

create policy "storage_update_own_folder"
on storage.objects
for update
to authenticated
using (
	bucket_id in ('profile-images','pdfs')
	and name like (auth.uid() || '/%')
)
with check (
	bucket_id in ('profile-images','pdfs')
	and name like (auth.uid() || '/%')
);

create policy "storage_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
	bucket_id in ('profile-images','pdfs')
	and name like (auth.uid() || '/%')
);
```

### Token exchange server

There is an Express server in `server/` that implements:

- `POST /supabase-token`
- Verifies Firebase ID token using Firebase Admin
- Returns a Supabase JWT signed with your `SUPABASE_JWT_SECRET`

Run it locally:

```bash
cd server
npm install
copy .env.example .env
npm start
```

Set `SUPABASE_JWT_SECRET` in `server/.env` from Supabase Project Settings → API → JWT Secret.

Firebase Admin credentials (choose one):

- Set `GOOGLE_APPLICATION_CREDENTIALS` to your Firebase service-account JSON path, OR
- Put the JSON into `FIREBASE_SERVICE_ACCOUNT_JSON` in `server/.env`.

### Frontend env

Set the token endpoint in `.env.local`:

```dotenv
REACT_APP_SUPABASE_TOKEN_ENDPOINT=http://localhost:5001/supabase-token
```

### Where things are stored

- Supabase Storage:
	- `profile-images/<firebase_uid>/profile.jpg`
	- `pdfs/<firebase_uid>/<branch>/<subject>/<filename>.pdf`
- Firebase profile document:
	- Firestore `users/<uid>` contains `photoBucket` + `photoObjectPath` (+ a short-lived signed `photoURL` for immediate display)

