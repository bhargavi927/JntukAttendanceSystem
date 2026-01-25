import { Router } from 'express';
import multer from 'multer';
import getSupabase from '../config/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET_STUDENT || process.env.SUPABASE_STORAGE_BUCKET || 'profile-images-private';
const SIGNED_URL_EXPIRES = parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRES || '86400', 10);
const table = 'student_profiles';

const pickProfileFields = (body) => {
  const fields = [
    'first_name',
    'second_name',
    'phone_number',
    'degree',
    'discipline',
    'year_from',
    'year_to',
    'father_name',
    'father_phone_number',
    'mother_name',
    'mother_phone_number',
    'aadhaar_number',
    'aadhaar_last4',
    'blood_group',
    'address',
    'program',
    'branch',
    'year',
    'sem_roman',
    'subjects',
    'reg_no'
  ];
  const filtered = {};
  fields.forEach((f) => {
    if (body[f] !== undefined) filtered[f] = body[f];
  });
  return filtered;
};

router.get('/me', authenticate, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid, email } = req.user;
    console.log(`[student-profile/me] Fetching profile for uid=${uid}, email=${email}`);
    const { data, error } = await supabase.from(table).select('*').eq('id', uid).single();
    if (error && error.code !== 'PGRST116') {
      console.error(`[student-profile/me] Supabase query error: ${error.code}`, error.message);
      throw error;
    }
    if (!data) {
      console.log(`[student-profile/me] No profile found for uid=${uid}`);
      return res.json({ profile: null });
    }
    console.log(`[student-profile/me] Profile found, returning data`);

    let signedUrl = data.photo_url || null;
    if (data.photo_object_path) {
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(data.photo_object_path, SIGNED_URL_EXPIRES);
      if (!signErr && signed?.signedUrl) signedUrl = signed.signedUrl;
    }

    const verification_status =
      data.verification_status !== undefined && data.verification_status !== null
        ? data.verification_status
        : (typeof data.is_verified === 'boolean'
          ? (data.is_verified ? 'Verified' : 'Not Verified')
          : undefined);

    // Normalize subjects to always be an array
    let subjects = data.subjects;
    if (typeof subjects === 'string') {
      try {
        subjects = JSON.parse(subjects);
      } catch {
        subjects = subjects.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(subjects)) {
      subjects = [];
    }

    // Correct merge: spread data first, then override/add fields
    return res.json({ profile: { ...data, subjects, verification_status, photo_url: signedUrl, email, role: 'student' } });
  } catch (err) {
    console.error('GET /student-profile/me error', err);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/upsert', authenticate, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid, email } = req.user;
    const payload = pickProfileFields(req.body || {});

    // Normalize subjects to JSON string
    if (payload.subjects) {
      if (Array.isArray(payload.subjects)) {
        payload.subjects = JSON.stringify(payload.subjects);
      } else if (typeof payload.subjects === 'string' && !payload.subjects.startsWith('[')) {
        // If it's a plain string, convert to JSON array
        const arr = payload.subjects.split(',').map(s => s.trim()).filter(Boolean);
        payload.subjects = JSON.stringify(arr);
      }
    }

    const row = {
      id: uid,
      email,
      ...payload,
      role: 'student',
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(table)
      .upsert(row, { onConflict: 'id' })
      .select()
      .single();
    if (error) throw error;

    return res.json({ profile: data });
  } catch (err) {
    console.error('POST /student-profile/upsert error', err);
    return res.status(500).json({ error: 'Failed to save profile' });
  }
});

router.post('/upload-photo', authenticate, upload.single('file'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const objectPath = `students/${uid}/profile.jpg`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });
    if (uploadErr) throw uploadErr;

    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(objectPath, SIGNED_URL_EXPIRES);
    if (signErr) throw signErr;

    const { data, error: upsertErr } = await supabase
      .from(table)
      .upsert(
        {
          id: uid,
          photo_bucket: BUCKET,
          photo_object_path: objectPath,
          photo_url: signed?.signedUrl || null,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )
      .select()
      .single();
    if (upsertErr) throw upsertErr;

    return res.json({
      photoURL: signed?.signedUrl || null,
      photoBucket: BUCKET,
      photoObjectPath: objectPath,
      profile: data
    });
  } catch (err) {
    console.error('POST /student-profile/upload-photo error', err);
    return res.status(500).json({ error: 'Failed to upload photo' });
  }
});


router.post('/verify', authenticate, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;
    const { code } = req.body;

    const SECRET_CODE = process.env.STUDENT_VERIFICATION_CODE;

    if (!SECRET_CODE) {
      console.error('STUDENT_VERIFICATION_CODE not set in .env');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!code || code !== SECRET_CODE) {
      return res.status(403).json({ error: 'Invalid verification code' });
    }

    // Verify in Supabase
    const { data, error } = await supabase
      .from(table)
      .update({ verification_status: 'Verified', is_verified: true })
      .eq('id', uid)
      .select()
      .single();

    if (error) throw error;

    // Sync to Firebase (Firestore + Custom Claims)
    try {
      const admin = await import('../config/firebaseAdmin.js');
      const db = admin.default.firestore();

      // 1. Update Firestore Profile
      await db.collection('users').doc(uid).set({
        verificationStatus: 'Verified',
        isVerified: true
      }, { merge: true });

      // 2. Set Custom Claims (optional but recommended for security rules)
      await admin.default.auth().setCustomUserClaims(uid, {
        role: 'student',
        verified: true
      });

      console.log(`[verify] Synced verification for ${uid} to Firebase`);
    } catch (fbErr) {
      console.error('[verify] Failed to sync to Firebase:', fbErr);
    }

    return res.json({ success: true, profile: data });
  } catch (err) {
    console.error('POST /verify error', err);
    return res.status(500).json({ error: 'Verification failed' });
  }
});

export default router;
