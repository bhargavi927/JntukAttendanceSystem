
import { Router } from 'express';
import getSupabase from '../config/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const table = 'lms_subject_folders';

// GET /api/lms/contexts
// GET /api/lms/contexts?program=BTech
router.get('/contexts', authenticate, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { program } = req.query;
    let query = supabase
      .from('lms_subject_folders')
      .select('program, branch, year, sem_roman', { distinct: true });
    if (program) {
      query = query.eq('program', program);
    }
    query = query
      .order('branch', { ascending: true })
      .order('year', { ascending: true })
      .order('sem_roman', { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ contexts: data });
  } catch (err) {
    console.error('GET /lms/contexts error', err);
    return res.status(500).json({ error: 'Failed to fetch contexts' });
  }
});

// GET /api/lms/drive-folder?program=&branch=&year=&sem_roman=&subject=
router.get('/drive-folder', authenticate, async (req, res) => {
  try {
    const supabase = getSupabase();
    let { program, branch, year, sem_roman, subject } = req.query;

    if (!program || !branch || !year || !sem_roman || !subject) {
      return res.status(400).json({ error: 'Missing required query params' });
    }

    console.log('[LMS Drive] Received:', { program, branch, year, sem_roman, subject });

    // --- Normalization Logic (Same as lmsSubjectRoutes) ---
    const normalize = (str) => (str || '').replace(/\s+/g, ' ').trim();

    // 1. Program Normalization
    let programCandidates = [program];
    const pClean = normalize(program).replace(/\./g, '');
    if (pClean.toLowerCase() === 'btech') {
      programCandidates = ['BTech', 'B.Tech', 'B. Tech', 'Btech'];
    } else if (pClean.toLowerCase() === 'mtech') {
      programCandidates = ['MTech', 'M.Tech', 'M. Tech', 'Mtech'];
    }

    // 2. Branch Normalization
    const normBranch = normalize(branch);
    let branchCandidates = [normBranch];
    if (normBranch.includes('(')) {
      const parts = normBranch.split('(');
      const base = parts[0].trim();
      const rest = parts.slice(1).join('(').trim();
      branchCandidates = [`${base}(${rest}`, `${base} (${rest}`];
    }
    // Add original just in case
    branchCandidates.push(branch);
    branchCandidates = [...new Set(branchCandidates)];

    // 3. Year & Sem
    const yearInt = parseInt(year, 10);
    const semRoman = normalize(sem_roman); // strict case (usually uppercase in DB 'I', 'II')

    // 4. Subject
    // 4. Subject (only trim, preserve internal spaces for DB match)
    const normSubject = (subject || '').trim();

    console.log('[LMS Drive] Lookup Params:', {
      programCandidates,
      branchCandidates,
      yearInt,
      semRoman,
      subject: normSubject
    });

    // Helper to validate URL
    const isValidDriveUrl = (url) => {
      return url && url.includes('/folders/');
    };

    // STRICT Query
    // Match ANY valid program variant AND ANY valid branch variant for THIS context
    // AND exact year/sem AND exact subject (case-insensitive)
    const { data, error } = await supabase
      .from(table)
      .select('drive_folder_url, subject')
      .in('program', programCandidates)
      .in('branch', branchCandidates)
      .eq('year', yearInt)
      .eq('sem_roman', semRoman)
      .ilike('subject', normSubject); // Case-insensitive exact match

    if (error) throw error;

    // Find the first valid URL
    let finalUrl = null;
    if (data && data.length > 0) {
      const validRow = data.find(row => isValidDriveUrl(row.drive_folder_url));
      if (validRow) {
        finalUrl = validRow.drive_folder_url;
      } else {
        console.warn('[LMS Drive] Found rows but URLs invalid:', data);
      }
    }

    if (!finalUrl) {
      console.warn('[LMS Drive] Not found or invalid URL.');

      // Fetch available subjects for this context to give helpful error
      const { data: available } = await supabase
        .from(table)
        .select('subject')
        .in('program', programCandidates)
        .in('branch', branchCandidates)
        .eq('year', yearInt)
        .eq('sem_roman', semRoman);

      return res.status(404).json({
        error: 'Folder not found',
        searchedFor: normSubject,
        available: available?.map(a => a.subject) || []
      });
    }

    return res.json({ drive_folder_url: finalUrl });

  } catch (err) {
    console.error('GET /lms/drive-folder error', err);
    return res.status(500).json({ error: 'Failed to fetch drive folder' });
  }
});

export default router;
