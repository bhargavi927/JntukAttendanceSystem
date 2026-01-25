import { Router } from 'express';
import multer from 'multer';
import { getDistance } from 'geolib';
import getSupabase from '../config/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET = 'attendance-photos';
const SIGNED_URL_EXPIRES = parseInt(process.env.SUPABASE_SIGNED_URL_EXPIRES || '3600', 10);
const table = 'attendance_submissions';
const permissionsTable = 'professor_attendance_permissions';
const professorTable = 'professor_profiles';
const normalizeSubject = (s) => (s || '').trim().toLowerCase();

async function findActivePermission({ supabase, subject, date, time, professorId }) {
  const cleanSubject = typeof subject === 'string' ? subject.trim() : subject;
  const cleanTime = typeof time === 'string' ? time.slice(0, 5) : time; // HH:MM
  const normalizedInput = normalizeSubject(cleanSubject);

  let query = supabase
    .from(permissionsTable)
    .select('*, session_hours')
    .eq('date', date)
    .eq('status', 'Active')
    .lte('start_time', cleanTime)
    .gte('end_time', cleanTime);

  if (professorId) {
    query = query.eq('professor_id', professorId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).find((perm) => normalizeSubject(perm.subject) === normalizedInput) || null;
}

async function ensureStudent(supabase, uid) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select('id')
    .eq('id', uid)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

async function ensureProfessor(supabase, uid) {
  const { data, error } = await supabase
    .from(professorTable)
    .select('role')
    .eq('id', uid)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.role === 'professor';
}

// 8) POST /api/attendance-submissions - Student uploads attendance photo
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;

    // Verify student
    const isStudent = await ensureStudent(supabase, uid);
    if (!isStudent) {
      return res.status(403).json({ error: 'Only students can upload attendance' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { subject, date, time, professor_id, program, branch, year, sem_roman, student_reg_no } = req.body || {};
    const cleanSubject = typeof subject === 'string' ? subject.trim() : '';

    // Check for existing submission for this student, subject, and date
    console.log(`[Attendance] Received submission: StudentID=${uid}, Subject=${cleanSubject}, Date=${date}, ProfID=${professor_id}`);

    if (cleanSubject && date) {
      const { data: existing, error: existingErr } = await supabase
        .from(table)
        .select('id')
        .eq('student_id', uid)
        .eq('subject', cleanSubject)
        .eq('date', date)
        .neq('status', 'Rejected') // Allow retry if previous was rejected
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: `Attendance for '${cleanSubject}' has already been submitted today.` });
      }
    }
    if (!cleanSubject || !date || !time || !professor_id || !student_reg_no) {
      return res.status(400).json({ error: 'Missing subject, date, time, professor_id, or student_reg_no' });
    }

    // Re-validate permission before accepting upload
    const now = new Date();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    if (date !== today) {
      return res.status(400).json({ error: 'Can only submit attendance for today' });
    }

    // Validate time format (HH:MM) and compare
    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(time)) {
      return res.status(400).json({ error: 'Time must be in HH:MM format' });
    }

    const permission = await findActivePermission({
      supabase,
      subject: cleanSubject,
      date,
      time,
      professorId: professor_id,
    });

    if (!permission) {
      return res.status(403).json({ error: 'No active permission for this class' });
    }

    // Validate location if required
    if (permission.location_required) {
      const pLat = permission.latitude;
      const pLng = permission.longitude;
      const radius = permission.radius_meters || 150;

      // If permission has location data, we must check against it
      if (pLat && pLng) {
        const lat = parseFloat(req.body.latitude);
        const lng = parseFloat(req.body.longitude);

        if (!lat || !lng) {
          return res.status(400).json({ error: 'Location verification required. Please enable GPS.' });
        }

        const dist = getDistance(
          { latitude: lat, longitude: lng },
          { latitude: pLat, longitude: pLng }
        );

        console.log(`[Geolocation] Student: (${lat}, ${lng}), Prof: (${pLat}, ${pLng}), Dist: ${dist}m, Radius: ${radius}m`);

        if (dist > radius) {
          return res.status(400).json({
            error: `You are too far from the class location (${dist}m away). Max allowed: ${radius}m.`
          });
        }
      }
    }

    // Upload photo to storage
    const timestamp = Date.now();
    const ext = req.file.mimetype.includes('png') ? 'png' : 'jpg';
    const safeProgram = (program || 'NA').replace(/[^a-z0-9_-]/gi, '');
    const safeBranch = (branch || 'NA').replace(/[^a-z0-9_-]/gi, '');
    const safeYear = year ? `Y${year}` : 'YNA';
    const safeSem = sem_roman || 'NA';
    const safeSubject = cleanSubject.replace(/[^a-z0-9_-]/gi, '');
    const photoPath = `attendance/${safeProgram}/${safeBranch}/${safeYear}/${safeSem}/${date}/${safeSubject || 'subject'}/${uid}_${timestamp}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(photoPath, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadErr) {
      console.error('[attendance-submissions] Storage upload error:', uploadErr);
      throw uploadErr;
    }

    // Insert into attendance_submissions
    const { data: submission, error: insertErr } = await supabase
      .from(table)
      .insert({
        student_id: uid,
        professor_id,
        subject: cleanSubject,
        date,
        time,
        student_reg_no,
        program: program || null,
        branch: branch || null,
        year: year ? parseInt(year) : null,
        sem_roman: sem_roman || null,
        photo_bucket: BUCKET,
        photo_path: photoPath,
        status: 'Pending',
        latitude: req.body.latitude ? parseFloat(req.body.latitude) : null,
        longitude: req.body.longitude ? parseFloat(req.body.longitude) : null,
        attendance_value: permission.session_hours || 1
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Generate signed URL
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(photoPath, SIGNED_URL_EXPIRES);

    const photoUrl = signed?.signedUrl || null;

    console.log(`[Attendance] Success! Created submission ID: ${submission.id}`);

    return res.status(201).json({
      submission: {
        ...submission,
        photo_url: photoUrl
      }
    });
  } catch (err) {
    console.error('POST /attendance-submissions error', err);
    return res.status(500).json({ error: 'Failed to upload attendance' });
  }
});

// 9) GET /api/attendance-submissions - Professor fetches submissions
router.get('/', authenticate, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;

    // Verify professor
    const isProf = await ensureProfessor(supabase, uid);
    if (!isProf) {
      return res.status(403).json({ error: 'Only professors can view submissions' });
    }

    // Query submissions for this professor
    let query = supabase.from(table).select('*').eq('professor_id', uid);

    // Optional filters
    const { subject, date, status } = req.query;
    if (subject) query = query.eq('subject', subject);
    if (date) query = query.eq('date', date);
    if (status) query = query.eq('status', status);

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Generate signed URLs for all photos
    const submissionsWithUrls = await Promise.all(
      (data || []).map(async (sub) => {
        let photoUrl = null;
        if (sub.photo_path) {
          const { data: signed, error: signErr } = await supabase.storage
            .from(sub.photo_bucket || BUCKET)
            .createSignedUrl(sub.photo_path, SIGNED_URL_EXPIRES);
          if (!signErr && signed?.signedUrl) {
            photoUrl = signed.signedUrl;
          }
        }
        return { ...sub, photo_url: photoUrl };
      })
    );

    return res.json({ submissions: submissionsWithUrls });
  } catch (err) {
    console.error('GET /attendance-submissions error', err);
    return res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// 10) PATCH /api/attendance-submissions/:id/status - Professor updates status
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;
    const { id } = req.params;
    const { status } = req.body || {};

    if (!status || !['Accepted', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify professor
    const isProf = await ensureProfessor(supabase, uid);
    if (!isProf) {
      return res.status(403).json({ error: 'Only professors can update submissions' });
    }

    // Update submission (must belong to this professor)
    const { data, error } = await supabase
      .from(table)
      .update({ status })
      .eq('id', id)
      .eq('professor_id', uid)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Submission not found or does not belong to you' });
      }
      throw error;
    }

    // Generate signed URL
    let photoUrl = null;
    if (data.photo_path) {
      const { data: signed, error: signErr } = await supabase.storage
        .from(data.photo_bucket || BUCKET)
        .createSignedUrl(data.photo_path, SIGNED_URL_EXPIRES);
      if (!signErr && signed?.signedUrl) {
        photoUrl = signed.signedUrl;
      }
    }

    return res.json({ submission: { ...data, photo_url: photoUrl } });
  } catch (err) {
    console.error('PATCH /attendance-submissions/:id/status error', err);
    return res.status(500).json({ error: 'Failed to update submission' });
  }
});

// 11) GET /api/attendance-submissions/my-submissions - Student fetches their own history
router.get('/my-submissions', authenticate, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;

    // Verify student (optional but good practice)
    const isStudent = await ensureStudent(supabase, uid);
    if (!isStudent) {
      return res.status(403).json({ error: 'Only students can view their own submissions' });
    }

    let query = supabase.from(table).select('*').eq('student_id', uid);

    // Optional status filter
    const { status } = req.query;
    if (status) query = query.eq('status', status);

    query = query.order('date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return res.json({ submissions: data });
  } catch (err) {
    console.error('GET /attendance-submissions/my-submissions error', err);
    return res.status(500).json({ error: 'Failed to fetch your submissions' });
  }
});

export default router;
