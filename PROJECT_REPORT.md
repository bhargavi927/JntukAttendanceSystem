# Project Report: M-M-Tracker (Attendance System)

## 1. Executive Summary
This project is a comprehensive **Attendance Management System** designed to streamline the process of recording and verifying student attendance in an academic setting. It features a dual-interface web application (Student and Professor portals) that leverages modern web technologies to ensure secure, location-based, and verified attendance submissions.

**Key Value Propositions:**
-   **Eliminates Proxy Attendance**: Uses geolocation enforcement and live photo uploads.
-   **Automated Validation**: Checks submissions against class timetables and professor permissions.
-   **Digital LMS Integration**: Provides easy access to subject materials linked via Google Drive.
-   **Real-time Analytics**: Offers immediate insights into attendance percentage and history.

---

## 2. Technical Architecture

### 2.1 Technology Stack

**Frontend:**
-   **Framework**: React.js (Create React App)
-   **Styling**: Tailwind CSS + Vanilla CSS (Custom design system)
-   **Routing**: React Router v6
-   **State Management**: React Context API (`AuthContext`)
-   **Icons**: Bootstrap Icons
-   **HTTP Client**: Native Fetch API

**Backend:**
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Middleware**: Morgan (logging), CORS, Multer (file handling)
-   **Geolocation**: Geolib (distance calculation)

**Infrastructure & Services:**
-   **Authentication**: Firebase Authentication (Email/Password)
-   **Database**: Supabase (PostgreSQL)
-   **File Storage**: Supabase Storage (Buckets: `attendance-photos`, `profile-images`)
-   **Hosting**: (Local/Cloud ready)

### 2.2 System Diagram
*   **Client**: React App (Mobile/Desktop) -> **API Gateway**: Express Server -> **Services**:
    *   Auth Service (Firebase)
    *   Data Service (Supabase DB)
    *   File Service (Supabase Storage)

---

## 3. Key Features Detailed

### 3.1 Authentication & Security
-   **Firebase Integration**: Secure sign-up/login flows.
-   **Role-Based Access Control (RBAC)**:
    -   **Student**: Access to upload attendance, view history, access LMS.
    -   **Professor**: Access to create permissions, review submissions, manage settings.
    -   **Admin**: User role management.
-   **Route Protection**: Higher-Order Components (`RequireAuth`, `RequireVerifiedStudent`, `RequireProfessor`) ensure unauthorized users cannot access protected routes.

### 3.2 Student Portal Features
1.  **Dashboard (`StudHome.js`)**: Quick view of actions and status.
2.  **Attendance Submission (`StudUploadAttendence.js`)**:
    -   **Mobile-Only Restriction**: Enforces submission only via mobile devices to prevent desktop spoofing.
    -   **Geolocation Check**: Captures device GPS coordinates. Validates against the professor's broadcasted location (e.g., within 100m).
    -   **Timetable Integration**: Automatically loads classes for the current day based on the student's program/branch/year.
    -   **Live Photo**: Captures a photo at the moment of attendance.
    -   **Permission Check**: Verifies if the professor has opened an active "Attendance Session" for that specific subject and time.
3.  **Attendance Register (`StudAttendanceRegister.js`)**:
    -   View percentage attendance per subject.
    -   Detailed history of submissions.
4.  **Profile Management (`StudProfilePage.js`)**:
    -   manage academic details (Roll No, Branch, Year).
    -   Validation logic to normalize inputs (e.g., "B.Tech" vs "Btech").
5.  **LMS Access (`StudLMSFiles.js`)**:
    -   Dynamic fetching of subject materials based on verified profile data.

### 3.3 Professor Portal Features
1.  **Permission Management (`ProfPermissions.js`)**:
    -   Create "Sessions" for specific classes (Date, Time, Location).
    -   Set location requirements (Latitude/Longitude/Radius).
    -   Toggle sessions Active/Inactive.
2.  **Review Attendance (`ReviewAttendance.js` / `ProfAttendanceRegister.js`)**:
    -   View incoming submissions in real-time.
    -   Approve/Reject submissions specifically.
    -   View submission geolocation on map (conceptual) or distance validation data.
3.  **LMS Management (`ProfLMSFiles.js`)**:
    -   Manage access links for subject folders.

---

## 4. Database Schema (Supabase/PostgreSQL)

### Core Tables:
1.  **`student_profiles`**:
    -   `id` (FK to Auth), `reg_no`, `name`, `program`, `branch`, `year`, `sem_roman`, `verification_status`.
2.  **`professor_profiles`**:
    -   `id` (FK to Auth), `name`, `email`, `role` (Professor/HOD).
3.  **`professor_attendance_permissions`**:
    -   Controls *when* students can submit.
    -   Columns: `id`, `professor_id`, `subject`, `date`, `start_time`, `end_time`, `status`, `latitude`, `longitude`, `radius_meters`, `location_required`.
4.  **`attendance_submissions`**:
    -   The actual attendance record.
    -   Columns: `id`, `student_id`, `professor_id`, `subject`, `date`, `time`, `photo_path`, `status` (Pending/Accepted/Rejected), `latitude`, `longitude`.
5.  **`timetable_entries`**:
    -   Static schedule data used for validation.
    -   Columns: `day`, `start_time`, `end_time`, `subject`, `program`, `branch`, `year`.
6.  **`lms_subject_folders`**:
    -   Maps subjects to Drive IDs.

---

## 5. Directory Structure Overview

### Frontend
-   `src/contexts/`: Global state (Auth, Notification).
-   `src/components/`: Reusable UI (Navbars, Cards, Protected Route Wrappers).
-   `src/pages/`: Main application views.
-   `src/utils/`: Helper functions (Profile fetchers, formatters).

### Backend
-   `src/config/`: DB and Firebase setup.
-   `src/middleware/`: Auth verification middleware.
-   `src/routes/`: API endpoint definitions (RESTful architecture).
    -   Segregated by domain: `studentProfile`, `professorProfile`, `attendanceSubmissions`, `attendancePermissions`.

---

## 6. Implementation Highlights

### Geolocation Logic
The system uses the `geolib` library on the backend to calculate the distance between the Student's submission coordinates and the Professor's permission coordinates.

```javascript
// Backend Validation Snippet
const dist = getDistance(
  { latitude: studentLat, longitude: studentLng },
  { latitude: profLat, longitude: profLng }
);
if (dist > radius) throw new Error("Too far from class");
```

### Mobile Restriction
The frontend aggressively checks for mobile environments to prevent "easy" spoofing from comfortable desktop environments.

```javascript
// Frontend Check
const isMobileDevice = /Android|iPhone|iPad/i.test(navigator.userAgent);
if (!isMobileDevice) disableUpload();
```

---

## 7. Future Enhancements
-   **Face Recognition**: Auto-verify student identity from the uploaded photo using AI.
-   **Offline Mode**: Allow caching of submissions when network is poor (sync later).
-   **Push Notifications**: Alert students when a class attendance window opens.
-   **Automated Reports**: Generate PDF attendance sheets for Professors.
