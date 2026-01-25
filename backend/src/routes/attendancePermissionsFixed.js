import { Router } from 'express';
import getSupabase from '../config/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const table = 'professor_attendance_permissions';
const professorProfileTable = 'professor_profiles';

// Normalize subject for case-insensitive comparison
const normalizeSubject = (s) => (s || '').trim().toLowerCase();

async function ensureProfessor(supabase, uid) {
  const { data, error } = await supabase
    .from(professorProfileTable)
    .select('role')
    .eq('id', uid)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.role === 'professor';
}

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;

    const isProf = await ensureProfessor(supabase, uid);
    if (!isProf) return res.status(403).json({ error: 'Forbidden' });

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('professor_id', uid)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });
    if (error) throw error;

    return res.json({ permissions: data || [] });
  } catch (err) {
    console.error('GET /attendance-permissions error', err);
    return res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

router.post('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;
    const isProf = await ensureProfessor(supabase, uid);
    if (!isProf) return res.status(403).json({ error: 'Forbidden' });

    const { subject, date, start_time, end_time, status = 'Active', locationRequired = true } = req.body || {};
    const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
    if (!cleanSubject || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from(table)
      .insert({
        professor_id: uid,
        subject: cleanSubject,
        date,
        start_time,
        end_time,
        status,
        location_required: Boolean(locationRequired),
      })
      .select()
      .single();
    if (error) throw error;

    return res.status(201).json({ permission: data });
  } catch (err) {
    console.error('POST /attendance-permissions error', err);
    return res.status(500).json({ error: 'Failed to create permission' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;
    const isProf = await ensureProfessor(supabase, uid);
    if (!isProf) return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const { subject, date, start_time, end_time, status, locationRequired } = req.body || {};

    const cleanSubject = typeof subject === 'string' ? subject.trim() : undefined;

    const payload = {};
    if (cleanSubject) payload.subject = cleanSubject;
    if (date) payload.date = date;
    if (start_time) payload.start_time = start_time;
    if (end_time) payload.end_time = end_time;
    if (status && ['Active', 'Inactive'].includes(status)) payload.status = status;
    if (typeof locationRequired === 'boolean') payload.location_required = locationRequired;

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id)
      .eq('professor_id', uid)
      .select()
      .single();
    if (error) throw error;

    return res.json({ permission: data });
  } catch (err) {
    console.error('PATCH /attendance-permissions/:id error', err);
    return res.status(500).json({ error: 'Failed to update permission' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;
    const isProf = await ensureProfessor(supabase, uid);
    if (!isProf) return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('professor_id', uid);
    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('DELETE /attendance-permissions/:id error', err);
    return res.status(500).json({ error: 'Failed to delete permission' });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { uid } = req.user;
    const isProf = await ensureProfessor(supabase, uid);
    if (!isProf) return res.status(403).json({ error: 'Forbidden' });

    const { id } = req.params;
    const { status } = req.body || {};
    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const { data, error } = await supabase
      .from(table)
      .update({ status })
      .eq('id', id)
      .eq('professor_id', uid)
      .select()
      .single();
    if (error) throw error;

    return res.json({ permission: data });
  } catch (err) {
    console.error('PATCH /attendance-permissions/:id/status error', err);
    return res.status(500).json({ error: 'Failed to update status' });
  }
});

// VALIDATE endpoint with case-insensitive exact subject matching AND Context Validation
router.get('/validate', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { subject, date, time, professor_id, program, branch, year, sem_roman } = req.query;

    if (!subject || !date || !time) {
      return res.status(400).json({ allowed: false, reason: 'Missing subject/date/time' });
    }

    const cleanSubject = typeof subject === 'string' ? subject.trim() : subject;
    const cleanTime = typeof time === 'string' ? time.slice(0, 5) : time; // HH:MM only
    const normalizedInputSubject = normalizeSubject(cleanSubject);

    // 1. Check if Permission exists (Generic check)
    let query = supabase
      .from(table)
      .select('*')
      .eq('date', date)
      .eq('status', 'Active')
      .lte('start_time', cleanTime)
      .gte('end_time', cleanTime);

    if (professor_id) {
      query = query.eq('professor_id', professor_id);
    }

    const { data, error } = await query;
    if (error) throw error;

    const permission = Array.isArray(data) && data.length > 0
      ? data.find(p => normalizeSubject(p.subject) === normalizedInputSubject)
      : null;

    if (!permission) {
      return res.json({ allowed: false, reason: 'Permission not active for this class.' });
    }

    // 2. CONTEXT VALIDATION (Prevent BTech/MTech mix-up)
    // If context params are provided, verify the student actually has this class in their timetable.
    if (program && branch && year && sem_roman) {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

      // Normalize inputs for timetable query
      const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const normBranch = normalize(branch);

      let branchCandidates = [normBranch];
      if (normBranch.includes('(')) {
        const parts = normBranch.split('(');
        const base = parts[0].trim();
        const rest = parts.slice(1).join('(').trim();
        branchCandidates = [`${base}(${rest}`, `${base} (${rest}`];
      }
      // Add current raw just in case
      branchCandidates.push(branch);
      branchCandidates = [...new Set(branchCandidates)];

      let programCandidates = [program];
      const pClean = normalize(program).replace(/\./g, '');
      if (pClean.toLowerCase() === 'btech') programCandidates = ['BTech', 'B.Tech', 'Btech'];
      if (pClean.toLowerCase() === 'mtech') programCandidates = ['MTech', 'M.Tech', 'Mtech'];

      // Query Timetable
      const { data: ttData, error: ttError } = await supabase
        .from('timetable_entries')
        .select('*')
        .in('program', programCandidates)
        .in('branch', branchCandidates)
        .eq('year', parseInt(year))
        .eq('sem_roman', sem_roman)
        .eq('day', dayName)
        // Fuzzy subject match or exact? use normalized comparison
        .ilike('subject', subject); // Simple check on subject name

      if (ttError) {
        console.error('Timetable validation error:', ttError);
        // Fail open or closed? Closed for safety, but if DB error... 
        // Let's assume allowed if DB check fails, to avoid blocking legit users on glitch? 
        // No, requirement is strict "NEVER fetch by subject alone".
        // If we can't verify, we should probably warn or block. 
        // But strict block might be annoying. Let's block.
        return res.json({ allowed: false, reason: 'Unable to verify class context.' });
      }

      const validContext = ttData && ttData.length > 0;

      if (!validContext) {
        console.log('[Validate] Context Mismatch:', { program, branch, year, sem_roman, dayName, subject });
        return res.json({ allowed: false, reason: `This class is not in the timetable for ${program} ${branch}.` });
      }
    }

    return res.json({ allowed: true, permissionId: permission.id, permission });
  } catch (err) {
    console.error('GET /attendance-permissions/validate error', err);
    return res.status(500).json({ allowed: false, reason: 'Validation failed' });
  }
});

export default router;
