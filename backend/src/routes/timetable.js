import { Router } from 'express';
import getSupabase from '../config/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const table = 'timetable_entries';

router.use(authenticate);

// GET /api/timetable - fetch timetable for specific day
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { program, branch, year, sem_roman, day } = req.query;

    if (!program || !branch || !year || !sem_roman || !day) {
      return res.status(400).json({ error: 'Missing required query parameters: program, branch, year, sem_roman, day' });
    }

    // Initialize query
    let query = supabase.from(table).select('*');

    // --- Normalize Branch Logic ---
    const normalize = (str) => (str || '').replace(/\s+/g, ' ').trim();
    const normalizeBranch = (b) => {
      let norm = normalize(b);
      // Support matching "CSE(AIML)" against "CSE (AIML)" and vice versa
      return norm;
    };

    const normBranch = normalizeBranch(branch);

    // Strict Branch Candidates
    // If user sends "CSE(AIML)", we want to match "CSE(AIML)" OR "CSE (AIML)" 
    // BUT filters must include program/year/sem, so duplication across programs is avoided by those filters.
    const possibleBranches = new Set();
    possibleBranches.add(normBranch);

    // Add variants with/without space if parens exist
    if (normBranch.includes('(')) {
      const parts = normBranch.split('(');
      const base = parts[0].trim();
      const rest = parts.slice(1).join('(').trim();
      possibleBranches.add(`${base}(${rest}`);
      possibleBranches.add(`${base} (${rest}`);
    }

    // Aliases (keep as fallback if needed for specific cases)
    const BRANCH_ALIASES = {
      'AIML-ICP': ['CSE (ICP)', 'CSE(ICP)'],
    };
    if (BRANCH_ALIASES[branch]) {
      BRANCH_ALIASES[branch].forEach(b => possibleBranches.add(b));
    }

    // Normalize Program
    // "B.Tech"/"BTech"/"Btech" -> "Btech"
    // "M.Tech"/"MTech"/"Mtech" -> "Mtech"
    let programCandidates = [program];
    const pClean = normalize(program).replace(/\./g, '');
    if (pClean.toLowerCase() === 'btech') programCandidates = ['BTech', 'B.Tech', 'Btech'];
    if (pClean.toLowerCase() === 'mtech') programCandidates = ['MTech', 'M.Tech', 'Mtech'];

    // LOGS
    console.log('[Timetable] Fetching for:', { program, branch, year, sem: sem_roman, day });
    console.log('[Timetable] Query Filters:', {
      program: programCandidates,
      branch: Array.from(possibleBranches),
      year: parseInt(year),
      sem: sem_roman,
      day
    });

    query = query
      .in('program', programCandidates)
      .in('branch', Array.from(possibleBranches))
      .eq('year', parseInt(year))
      .eq('sem_roman', sem_roman)
      .eq('day', day)
      .order('start_time', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    console.log(`[Timetable] Found ${data?.length || 0} entries.`);

    return res.json({ timetable: data || [] });
  } catch (err) {
    console.error('GET /timetable error', err);
    return res.status(500).json({ error: 'Failed to fetch timetable' });
  }
});

// GET /api/timetable/week - fetch full week timetable
router.get('/week', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { program, branch, year, sem_roman } = req.query;

    if (!program || !branch || !year || !sem_roman) {
      return res.status(400).json({ error: 'Missing required query parameters: program, branch, year, sem_roman' });
    }

    let query = supabase
      .from(table)
      .select('*')
      .eq('program', program)
      .eq('branch', branch)
      .eq('year', parseInt(year))
      .eq('sem_roman', sem_roman)
      .order('day', { ascending: true })
      .order('start_time', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    // Group by day
    const byDay = (data || []).reduce((acc, entry) => {
      if (!acc[entry.day]) acc[entry.day] = [];
      acc[entry.day].push(entry);
      return acc;
    }, {});

    return res.json({ timetable: byDay });
  } catch (err) {
    console.error('GET /timetable/week error', err);
    return res.status(500).json({ error: 'Failed to fetch weekly timetable' });
  }
});

export default router;
