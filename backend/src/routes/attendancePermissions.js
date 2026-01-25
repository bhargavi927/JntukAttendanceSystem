import { Router } from 'express';
import getSupabase from '../config/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const table = 'professor_attendance_permissions';
const professorProfileTable = 'professor_profiles';
const timetableTable = 'timetable_entries';

// Normalize subject for case-insensitive equality
const normalizeSubject = (s) => (s || '').trim().toLowerCase();

const validateDuration = (start, end) => {
  const [startH, startM] = (start || '').split(':').map(Number);
  const [endH, endM] = (end || '').split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const durationMinutes = endMinutes - startMinutes;
  return { durationMinutes, startMinutes, endMinutes };
};

async function ensureProfessor(supabase, uid) {
  const { data, error } = await supabase
    .from(professorProfileTable)
    .select('role')
    .eq('id', uid)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.role === 'professor';
}

async function findActivePermission({ supabase, subject, date, time, professorId }) {
  const cleanSubject = typeof subject === 'string' ? subject.trim() : subject;
  const cleanTime = typeof time === 'string' ? time.slice(0, 5) : time; // HH:MM
  const normalizedInput = normalizeSubject(cleanSubject);

  let query = supabase
    .from(table)
    .select('*')
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

    const {
      timetable_entry_id,
      subject,
      day,
      date,
      start_time,
      end_time,
      status,
      locationRequired = true,
      latitude,
      longitude,
      radius_meters,
    } = req.body || {};

    let resolvedSubject = typeof subject === 'string' ? subject.trim() : '';
    let resolvedStart = start_time;
    let resolvedEnd = end_time;
    let resolvedDay = typeof day === 'string' ? day.trim() : undefined;
    let resolvedTimetableId = null;

    if (timetable_entry_id) {
      const { data: entry, error: entryErr } = await supabase
        .from(timetableTable)
        .select('id, subject, day, start_time, end_time')
        .eq('id', timetable_entry_id)
        .single();
      if (entryErr) throw entryErr;
      resolvedTimetableId = entry?.id || null;
      if (!resolvedSubject) resolvedSubject = entry?.subject || '';
      if (!resolvedDay) resolvedDay = entry?.day;
      if (!resolvedStart) resolvedStart = entry?.start_time;
      if (!resolvedEnd) resolvedEnd = entry?.end_time;
    }

    if (!resolvedSubject || !date || !resolvedStart || !resolvedEnd) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { durationMinutes } = validateDuration(resolvedStart, resolvedEnd);
    if (durationMinutes < 5 || durationMinutes > 20) {
      return res.status(400).json({ error: 'Permission window must be between 5 and 20 minutes.' });
    }

    const payload = {
      professor_id: uid,
      timetable_entry_id: resolvedTimetableId,
      subject: resolvedSubject,
      date,
      start_time: resolvedStart,
      end_time: resolvedEnd,
      status,
      location_required: Boolean(locationRequired),
      latitude,
      longitude,
      location_required: Boolean(locationRequired),
      latitude,
      longitude,
      radius_meters: radius_meters || 150,
      session_hours: req.body.session_hours || 1,
    };
    if (resolvedDay) payload.day = resolvedDay;

    const { data, error } = await supabase
      .from(table)
      .insert(payload)
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

    // If both start_time and end_time are being updated, validate duration
    if (start_time && end_time) {
      const { durationMinutes } = validateDuration(start_time, end_time);
      if (durationMinutes < 5 || durationMinutes > 20) {
        return res.status(400).json({ error: 'Permission window must be between 5 and 20 minutes.' });
      }
    }

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

// VALIDATE endpoint with case-insensitive exact subject matching
router.get('/validate', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { subject, date, time, professor_id } = req.query;
    if (!subject || !date || !time) {
      return res.status(400).json({ allowed: false, reason: 'Missing subject/date/time' });
    }

    const permission = await findActivePermission({
      supabase,
      subject,
      date,
      time,
      professorId: professor_id,
    });

    if (!permission) {
      return res.json({ allowed: false, reason: 'Permission not active for this class.' });
    }

    return res.json({ allowed: true, permissionId: permission.id, permission });
  } catch (err) {
    console.error('GET /attendance-permissions/validate error', err);
    return res.status(500).json({ allowed: false, reason: 'Validation failed' });
  }
});

export default router;
