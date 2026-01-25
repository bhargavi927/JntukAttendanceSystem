# Attendance System - Setup Guide

## Important: Backend & Frontend Must Run Simultaneously

### Understanding the Setup
- **Backend**: Node.js Express server running on `http://localhost:5001`
- **Frontend**: React development server running on `http://localhost:3000`
- **Both must be running at the same time** for the system to work

---

## Step 1: Configure Frontend Environment

### 1a. Verify `.env.local` exists in frontend root

File location: `c:\Users\kapil\Downloads\VibeCoding\Attendance System\frontend\.env.local`

### 1b. Ensure it contains:
```dotenv
REACT_APP_BACKEND_URL=http://localhost:5001
REACT_APP_FIREBASE_API_KEY=AIzaSyBW5AdIojmoEb7Pa2m4SGPreFk-aAIRG0U
REACT_APP_FIREBASE_AUTH_DOMAIN=attendencesystem-27682.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=attendencesystem-27682
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=559463642852
REACT_APP_FIREBASE_APP_ID=1:559463642852:web:21369eb60e623f87705ef1
REACT_APP_FIREBASE_DATABASE_URL=https://attendencesystem-27682-default-rtdb.firebaseio.com/
REACT_APP_SUPABASE_URL=https://pouxchcyhraztqqaogog.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdXhjaGN5aHJhenRxcWFvZ29nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDY1NTEsImV4cCI6MjA4MTgyMjU1MX0.LMc0jDRPaMgqZ0acxA-2WhOHX4ON8lHSxl58kaR1SRc
```

---

## Step 2: Run Backend in Terminal 1

**Keep this terminal OPEN** while developing.

```bash
cd "c:\Users\kapil\Downloads\VibeCoding\Attendance System\backend"
npm start
```

**Expected output:**
```
[index.js] Environment loaded
[index.js] Initializing Supabase...
SUPABASE_URL: loaded
SUPABASE_SERVICE_ROLE_KEY: loaded
[index.js] Supabase initialized
[index.js] Initializing Firebase Admin...
FIREBASE_PROJECT_ID: loaded
FIREBASE_CLIENT_EMAIL: loaded
FIREBASE_PRIVATE_KEY: loaded
[index.js] Firebase Admin initialized
[index.js] Importing routes...
[index.js] Routes imported
[index.js] Routes mounted
✅ Backend listening on http://localhost:5001
```

**Do NOT close this terminal.** The backend must stay running.

---

## Step 3: Verify Backend is Running

### Option A: Open in Browser
Open `http://localhost:5001/health` in your browser. You should see:
```json
{"ok":true}
```

### Option B: Test in PowerShell
```powershell
Invoke-WebRequest -Uri "http://localhost:5001/health" -UseBasicParsing
```

**Status Code should be 200 and Content should show `{"ok":true}`**

---

## Step 4: Run Frontend in Terminal 2

**In a NEW terminal** (keep Terminal 1 open with backend):

```bash
cd "c:\Users\kapil\Downloads\VibeCoding\Attendance System\frontend"
npm start
```

**Expected output:**
```
Compiled successfully!
You can now view jntuk-attendance-system in the browser.
  Local:            http://localhost:3000
```

---

## Step 5: Verify Connection

### Open browser to:
`http://localhost:3000`

### Login as Student/Professor, then navigate to Profile page

### Open Browser Console (F12 → Console tab)

**Should NOT see:**
- ❌ `ERR_CONNECTION_REFUSED`
- ❌ `Failed to fetch`

**Should see:**
- ✅ `[ProfProfilePage] Got Firebase token, calling backend...`
- ✅ `[ProfProfilePage] Response status: 200` (or similar success)
- ✅ Profile data appears on page

---

## Step 6: Troubleshooting

### If you still get ERR_CONNECTION_REFUSED:

**Try using `127.0.0.1` instead of `localhost`:**

1. Stop frontend (Ctrl+C in Terminal 2)
2. Edit `frontend\.env.local`:
   ```dotenv
   REACT_APP_BACKEND_URL=http://127.0.0.1:5001
   ```
3. Restart frontend:
   ```bash
   npm start
   ```
4. Refresh browser (Ctrl+F5)

### Verify backend is truly running:

```powershell
netstat -ano | findstr :5001
```

Should show a LISTENING entry for port 5001.

### Check if port is in use:

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 5001).OwningProcess
```

### Restart everything:

1. Kill all node processes:
   ```powershell
   Get-Process node | Stop-Process -Force
   ```
2. Wait 2 seconds
3. Start backend in Terminal 1
4. Wait for "✅ Backend listening..."
5. Start frontend in Terminal 2
6. Wait for "Compiled successfully!"
7. Refresh browser

---

## Development Workflow

From this point on:

1. **Terminal 1 (Backend)**: `cd backend && npm start` → KEEP OPEN
2. **Terminal 2 (Frontend)**: `cd frontend && npm start` → KEEP OPEN
3. **Browser**: `http://localhost:3000`

Both terminals must stay open. Code changes auto-reload in both.

---

## Quick Verification Checklist

- [ ] Backend terminal shows `✅ Backend listening on http://localhost:5001`
- [ ] `http://localhost:5001/health` returns `{"ok":true}` in browser
- [ ] Frontend terminal shows `Compiled successfully!`
- [ ] `http://localhost:3000` loads in browser
- [ ] F12 Console shows NO `ERR_CONNECTION_REFUSED`
- [ ] Navigating to Profile page loads user data
- [ ] Console shows fetch success messages

