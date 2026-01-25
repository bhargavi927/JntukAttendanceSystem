// fetchStudentProfile.js
// Shared helper to fetch student profile from backend using Firebase token
import { getAuth } from "firebase/auth";
import { BACKEND_URL } from "../config";

export async function fetchStudentProfile() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const idToken = await user.getIdToken();
  const res = await fetch(`${BACKEND_URL}/api/student-profile/me`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch student profile");
  const data = await res.json();
  if (!data.profile) throw new Error("Profile not found");
  // Return only the required fields
  const p = data.profile;
  return {
    reg_no: p.reg_no || "",
    program: p.program || "",
    branch: p.branch || "",
    year: p.year || "",
    sem_roman: p.sem_roman || "",
    subjects: Array.isArray(p.subjects) ? p.subjects : [],
  };
}
