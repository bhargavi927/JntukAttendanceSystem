// Firebase helper (modular SDK v9+)
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import {
  getDatabase,
  ref as rtdbRef,
  get as rtdbGet,
  update as rtdbUpdate
} from 'firebase/database';


// Add your Firebase config to .env.local or environment variables
// Example variables to add to .env (do NOT commit real keys):
// REACT_APP_FIREBASE_API_KEY=...
// REACT_APP_FIREBASE_AUTH_DOMAIN=...
// REACT_APP_FIREBASE_PROJECT_ID=...

const firebaseConfig = {
  apiKey: "AIzaSyBW5AdIojmoEb7Pa2m4SGPreFk-aAIRG0U",
  authDomain: "attendencesystem-27682.firebaseapp.com",
  databaseURL: "https://attendencesystem-27682-default-rtdb.firebaseio.com",
  projectId: "attendencesystem-27682",
  storageBucket: "attendencesystem-27682.firebasestorage.app",
  messagingSenderId: "559463642852",
  appId: "1:559463642852:web:21369eb60e623f87705ef1",
  measurementId: "G-C6JXESVTYD"
};

const hasRTDB = Boolean(firebaseConfig.databaseURL);

// Helpful validation when running locally
const REQUIRED_FIREBASE_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'messagingSenderId',
  'appId'
];
const missing = REQUIRED_FIREBASE_KEYS.filter((k) => !firebaseConfig[k]);
if (missing.length) {
  console.error('Firebase config missing the following REACT_APP_ vars:', missing);
  console.error('Copy `.env.local.example` to `.env.local` and fill values (do not commit `.env.local`).');
  // do not initialize Firebase without config
  throw new Error('Missing Firebase configuration: ' + missing.join(', '));
}

// Initialize Firebase safely and provide masked diagnostic output
function maskKey(key){
  if(!key || key.length < 8) return '****';
  return key.slice(0,4) + '...' + key.slice(-4);
}

let app;
let auth;
let db;
let rtdb;
try{
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  if (hasRTDB) {
    rtdb = getDatabase(app);
  }

  console.info('Firebase initialized. Project:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    apiKey: maskKey(firebaseConfig.apiKey)
  });
}catch(err){
  console.error('Firebase initialization failed:', err && err.message ? err.message : err);
  console.error('If this is `auth/invalid-api-key`, verify `.env.local` contains the Web app SDK config (API key) and restart the dev server.');
  throw err;
}

export { auth, db, rtdb, hasRTDB };

function formatFirebaseError(err) {
  if (!err) return 'Unknown error';
  const code = err?.code ? String(err.code) : '';
  const message = err?.message ? String(err.message) : String(err);
  return code ? `${code}: ${message}` : message;
}

function normalizeEmail(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Email is required');
  return raw;
}

export async function upsertUserProfile(uid, data) {
  if (!uid) throw new Error('Missing uid');
  if (!data || typeof data !== 'object') throw new Error('Missing profile data');
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });
    return;
  } catch (err) {
    // If Firestore rules are blocking, allow saving to RTDB when configured.
    if (hasRTDB) {
      await upsertUserProfileRTDB(uid, data);
      return;
    }
    throw err;
  }
}

// Realtime Database (RTDB) profile helpers
// Stores profile at: Realtime Database -> users/{uid}
export async function upsertUserProfileRTDB(uid, data) {
  if (!uid) throw new Error('Missing uid');
  if (!data || typeof data !== 'object') throw new Error('Missing profile data');
  if (!hasRTDB || !rtdb) {
    throw new Error('Realtime Database is not configured. Set REACT_APP_FIREBASE_DATABASE_URL in .env.local and restart the dev server.');
  }
  const now = Date.now();
  const pathRef = rtdbRef(rtdb, `users/${uid}`);
  await rtdbUpdate(pathRef, {
    ...data,
    updatedAt: now,
    createdAt: data.createdAt ? data.createdAt : now
  });
}

export async function getUserProfileRTDB(uid) {
  if (!uid) throw new Error('Missing uid');
  if (!hasRTDB || !rtdb) {
    return null;
  }
  const pathRef = rtdbRef(rtdb, `users/${uid}`);
  const snap = await rtdbGet(pathRef);
  if (!snap.exists()) return null;
  return { uid, __source: 'rtdb', ...snap.val() };
}

export async function signupUser({ name, id, branch, phone, email, password, role, photoFile }) {
  try {
    const firebaseEmail = normalizeEmail(email);
    console.info('signupUser: creating user', firebaseEmail);
    const cred = await createUserWithEmailAndPassword(auth, firebaseEmail, password);
    const user = cred.user;
    console.info('signupUser: created uid=', user.uid);

    // Store name in Firebase Auth profile so the app can display it
    // even if Firestore profile write is blocked by rules.
    const safeName = String(name || '').trim();
    if (safeName) {
      try {
        await updateProfile(user, { displayName: safeName });
        console.info('signupUser: set auth displayName to name');
      } catch (err) {
        console.warn('signupUser: updateProfile failed:', err?.message || String(err));
      }
    }

    // Send verification email to the real email used at signup.
    console.info('signupUser: sending verification email');
    await sendEmailVerification(user);
    console.info('signupUser: verification email sent');

    // Photo uploads use Supabase private buckets with token exchange.
    // Keep signup flow simple and billing-free: upload photo from Profile page after login.
    let photoURL = null;
    if (photoFile) {
      console.info('signupUser: photoFile provided; skipping upload at signup (upload from Profile page instead)');
    }

    // Ensure role is set and valid
    const userRole = role || 'student';
    console.info('signupUser: using role =', userRole);

    // Store profile in Firestore (users/{uid}). If rules block it, fall back to RTDB when configured.
    let profileSaved = false;
    let profileStorage = null; // 'firestore' | 'rtdb' | null
    let profileError = null;

    const profilePayload = {
      name,
      userName: name,
      id,
      userId: id,
      branch,
      phone,
      email: firebaseEmail,
      role: userRole,
      photoURL,
      createdAt: serverTimestamp()
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      console.info('signupUser: writing user profile to Firestore', profilePayload);
      await setDoc(userRef, profilePayload, { merge: true });
      profileSaved = true;
      profileStorage = 'firestore';
      console.info('signupUser: profile written to Firestore');
    } catch (err) {
      profileError = formatFirebaseError(err);
      console.warn('signupUser: Firestore profile write failed:', profileError);
      if (hasRTDB) {
        try {
          console.info('signupUser: trying RTDB fallback write');
          const profilePayloadRTDB = {
            name,
            userName: name,
            id,
            userId: id,
            branch,
            phone,
            email: firebaseEmail,
            role: userRole,
            photoURL: photoURL || ''
          };
          await upsertUserProfileRTDB(user.uid, profilePayloadRTDB);
          profileSaved = true;
          profileStorage = 'rtdb';
          console.info('signupUser: profile written to RTDB');
        } catch (err2) {
          const rtdbError = formatFirebaseError(err2);
          profileError = `${profileError}; RTDB fallback failed: ${rtdbError}`;
          console.warn('signupUser: RTDB fallback write failed:', rtdbError);
        }
      }
    }

    // Sign out so user must verify first (non-blocking)
    try {
      await signOut(auth);
      console.info('signupUser: signed out after signup');
    } catch (err) {
      console.warn('signupUser: signOut failed:', err?.message || String(err));
    }

    return { uid: user.uid, profileSaved, profileStorage, profileError };
  } catch (err) {
    console.error('signupUser error:', err && err.message ? err.message : err);
    throw err;
  }
}

export async function loginUser(email, password, role) {
  try {
    const firebaseEmail = normalizeEmail(email);
    console.info('loginUser: signing in', firebaseEmail);
    const cred = await signInWithEmailAndPassword(auth, firebaseEmail, password);
    const user = cred.user;
    // Ensure emailVerified is up to date after clicking the verification link.
    try {
      await user.reload();
    } catch (err) {
      console.warn('loginUser: user.reload failed:', err?.message || String(err));
    }
    console.info('loginUser: signed in uid=', user.uid, 'emailVerified=', user.emailVerified);
    if (!user.emailVerified) {
      await signOut(auth);
      const err = new Error('email-not-verified');
      err.code = 'email-not-verified';
      err.user = user;
      throw err;
    }
    // fetch profile (non-fatal)
    let profile = null;
    let profileError = null;
    try {
      profile = await getUserProfile(user.uid);
      console.info('loginUser: fetched profile', profile && profile.uid);
      // Check if the profile role matches the requested role
      if (role && profile && profile.role && profile.role !== role) {
        await signOut(auth);
        const err = new Error('role-mismatch');
        err.code = 'role-mismatch';
        err.user = user;
        err.profile = profile;
        throw err;
      }
    } catch (err) {
      profileError = err && err.message ? err.message : String(err);
      console.warn('loginUser: profile fetch failed, continuing without profile:', profileError);
    }
    return { user, profile, profileError };
  } catch (err) {
    console.error('loginUser error:', err && err.message ? err.message : err);
    throw err;
  }
}

export async function resendVerificationForSignedInUser(email, password) {
  // Sign in then resend verification then sign out
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  if (user.emailVerified) {
    await signOut(auth);
    return { alreadyVerified: true };
  }
  await sendEmailVerification(user);
  await signOut(auth);
  return { sent: true };
}

export async function sendPasswordReset(email) {
  const firebaseEmail = normalizeEmail(email);
  await sendPasswordResetEmail(auth, firebaseEmail);
}

export async function getUserProfile(uid) {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return { uid: snap.id, __source: 'firestore', ...snap.data() };
    // If Firestore doc doesn't exist, try RTDB (when configured)
    if (hasRTDB) {
      const rtdbProfile = await getUserProfileRTDB(uid);
      return rtdbProfile;
    }
    return null;
  } catch (err) {
    // Firestore throws when offline; surface a clear message and return null so caller can continue
    console.error('getUserProfile error:', err && err.message ? err.message : err);
    // If Firestore read is blocked by rules or network, try RTDB fallback when configured.
    if (hasRTDB) {
      try {
        const rtdbProfile = await getUserProfileRTDB(uid);
        return rtdbProfile;
      } catch (err2) {
        console.error('getUserProfile RTDB fallback error:', err2 && err2.message ? err2.message : err2);
      }
    }
    // return null for offline-like conditions; otherwise rethrow so callers can show exact reason
    const message = String(err?.message || err);
    if (message.toLowerCase().includes('offline')) return null;
    throw err;
  }
}

export async function updateUserProfile(uid, patch) {
  if (!uid) throw new Error('Missing uid');
  if (!patch || typeof patch !== 'object') throw new Error('Missing profile update');
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, patch);
}

export async function fetchAllUsers() {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snaps = await getDocs(q);
  return snaps.docs.map(d => ({ uid: d.id, ...d.data() }));
}
