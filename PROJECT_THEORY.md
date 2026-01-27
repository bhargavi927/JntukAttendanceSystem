# JNTUK Attendance System - Project Theory

## 1. Executive Summary
The **JNTUK Attendance System** is a Next-Gen Smart Campus platform designed to digitally transform the attendance verification process. Unlike traditional manual roll calls or simple checkbox apps, this system employs **Geo-Fencing** and **biometric AI verification** to ensure integrity, speed, and accuracy.

The platform distinguishes between **Student** and **Professor** roles, offering tailored interfaces:
-   **Students**: Can only mark attendance when physically present in class (validated via GPS) and by submitting a live selfie (validated via AI).
-   **Professors**: Can manage attendance windows, review flagged submissions, and access enhanced analytics.

## 2. Technical Architecture

### 2.1 Technology Stack
-   **Frontend**: React.js (modern functional components, hooks), Tailwind CSS (styling).
-   **Backend**: Node.js & Express (REST API).
-   **Database**: PostgreSQL (via Supabase) for structured data (profiles, attendance records).
-   **Authentication**: Firebase Auth (Identity management, JWT tokens).
-   **Storage**: Supabase Storage (Buckets for Profile Photos and Attendance Selfies).
-   **AI Engine**: `face-api.js` (TensorFlow.js) running on Node.js.

### 2.2 Core Integrations
-   **Supabase**: Acts as the primary data layer. We leverage its Row Level Security (RLS) policies and storage capabilities.
-   **Firebase**: Handles secure user login and session management.
-   **GeoLib**: Performs high-precision distance calculations for location validation.

## 3. Key Modules & Workflows

### 3.1 Smart Attendance Submission (The "Trust Protocol")
This is the core feature. To prevent proxy attendance, the system enforces a "Two-Factor Verification":
1.  **Location Factor**: The Student's device GPS must be within a specific radius (e.g., 100m) of the Professor's set location.
    -   *Tech*: The backend calculates the Haversine distance between the student's coords and the permission's coords.
2.  **Identity Factor (AI)**: The Student uploads a live selfie. The AI compares this selfie against their registered Profile Picture.

### 3.2 Real AI Face Verification
We do not use random numbers or simple file checks. We implemented a **Deep Learning** pipeline using `face-api.js`.
-   **Model**: SSD MobileNet V1 (for detection) + Face Recognition Net (ResNet-34 based) for embeddings.
-   **Process**:
    1.  **Reference**: Fetch the student's *Profile Picture* (verified ground truth).
    2.  **Query**: Receive the newly uploaded *Attendance Selfie*.
    3.  **Embedding**: Convert both faces into 128-dimensional vectors.
    4.  **Comparison**: Calculate the **Euclidean Distance** between the vectors.
-   **Scoring**:
    -   **Consistency %**: Derived from the distance (inverse correlation).
    -   **Risk Level**: Classified as High/Medium/Low based on the score.

### 3.3 Role-Based Chatbot (SupportBot)
A context-aware AI assistant helps users navigate the platform.
-   **Auto-Detection**: The bot identifies if the user is a `Student` or `Professor` based on the URL/Session.
-   **Contextual Actions**:
    -   *Student Side*: Offers "Check Attendance", "LMS Materials".
    -   *Professor Side*: Offers "Review Attendance", "Manage Permissions", "Open Register".
-   **Interactive**: Uses "Chips" (clickable buttons) for faster interaction.

### 3.4 Learning Management System (LMS)
A centralized repository for academic resources.
-   **Structure**: Material is organized by Program -> Branch -> Year -> Semester.
-   **Access**: Students are automatically routed to their relevant folders based on their profile data.

## 4. Security & Data Integrity
-   **Signed URLs**: All image access is secured via time-limited signed URLs (Supabase).
-   **JWT Authorization**: Every backend request is verified against the Firebase User Token.
-   **RBAC**: Middleware ensures only Professors can access granular controls (permissions/reviews) and Students can only view their own data.

## 5. Future Roadmap
-   **Offline Mode**: Caching attendance when network is poor and syncing later.
-   **Advanced Analytics**: predicting student dropout risk based on attendance patterns.
-   **Push Notifications**: Alerts for class starts and low attendance warnings.
