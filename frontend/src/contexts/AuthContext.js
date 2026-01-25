import React, { createContext, useEffect, useState } from 'react';
import { auth, getUserProfile } from '../firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';

export const AuthContext = createContext({ user: null, profile: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted) return;
      if (u) {
        setUser(u);
        try {
          // Fetch from Backend API (Source of Truth)
          const token = await u.getIdToken();
          const { BACKEND_URL } = require('../config');

          let fetchedProfile = null;

          // 1. Try Student Profile
          const resStud = await fetch(`${BACKEND_URL}/api/student-profile/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (resStud.ok) {
            const data = await resStud.json();
            if (data.profile) fetchedProfile = data.profile;
          }

          // 2. If not student, try Professor Profile
          if (!fetchedProfile) {
            const resProf = await fetch(`${BACKEND_URL}/api/professor-profile/me`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resProf.ok) {
              const data = await resProf.json();
              if (data.profile) fetchedProfile = data.profile;
            }
          }

          if (fetchedProfile) {
            setProfile(fetchedProfile);
          } else {
            console.warn("AuthContext: Profile not found in Backend (Student/Professor). Fallback to Firestore.");
            try {
              const p = await getUserProfile(u.uid);
              setProfile(p);
            } catch (e) { setProfile(null); }
          }
        } catch (err) {
          console.error("AuthContext Error:", err);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; unsub(); }
  }, []);

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return null;
    }
    try {
      const token = await auth.currentUser.getIdToken();
      const { BACKEND_URL } = require('../config');

      let fetchedProfile = null;

      // 1. Try Student
      const resStud = await fetch(`${BACKEND_URL}/api/student-profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resStud.ok) {
        const data = await resStud.json();
        if (data.profile) fetchedProfile = data.profile;
      }

      // 2. Try Professor
      if (!fetchedProfile) {
        const resProf = await fetch(`${BACKEND_URL}/api/professor-profile/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resProf.ok) {
          const data = await resProf.json();
          if (data.profile) fetchedProfile = data.profile;
        }
      }

      if (fetchedProfile) {
        setProfile(fetchedProfile);
        return fetchedProfile;
      } else {
        // Fallback
        const p = await getUserProfile(auth.currentUser.uid);
        setProfile(p);
        return p;
      }
    } catch (err) {
      console.error("refreshProfile error:", err);
      try {
        const p = await getUserProfile(auth.currentUser.uid);
        setProfile(p);
        return p;
      } catch {
        setProfile(null);
        return null;
      }
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
