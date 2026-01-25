import { Router } from 'express';
import getSupabase from '../config/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const table = 'lms_subject_folders';

// GET /api/lms/subjects?program=&branch=&year=&sem_roman=
router.get('/subjects', authenticate, async (req, res) => {
    try {
        const supabase = getSupabase();
        let { program, branch, year, sem_roman } = req.query;

        console.log('[LMS Subjects] Received:', { program, branch, year, sem_roman });

        if (!program || !branch || !year || !sem_roman) {
            return res.status(400).json({ error: 'Missing required query params' });
        }

        // Normalization logic
        const normalize = (str) => (str || '').replace(/\s+/g, ' ').trim();

        // Normalize Program: "B.Tech"/"BTech" -> "Btech" (conceptually), but for DB query we might need exact match or OR
        // User requested normalization: "B.Tech"/"BTech"/"Btech" -> "Btech"
        // However, DB might store it differently.
        // Let's inspect the prompt request: "B.Tech"/"BTech"/"Btech" -> "Btech"
        // "M.Tech"/"MTech"/"Mtech" -> "Mtech"

        // We will normalize to what we think is the canonical form, OR check multiple.
        // The prompt says: normalizeProgram: "B.Tech"/"BTech"/"Btech" -> "Btech"
        // But then says "Program values differ across UI/DB... Fix approach: Normalize... Return JSON".
        // It implies we should search for the normalized value OR search for both.
        // Let's try to search using the filter logic described in the prompt.
        // But wait, if the DB contains "B.Tech", and we normalize to "Btech", we won't find it if we use .eq().
        // So we should probably try to match MULTIPLE or normalize the DB value (can't do that easily).
        // Better strategy: Filter by a list of likely candidates.

        let programCandidates = [program];
        const pClean = normalize(program).replace(/\./g, ''); // Remove all dots: BTech
        // Add variations: BTech, B.Tech, B. Tech
        if (pClean.toLowerCase() === 'btech') {
            programCandidates = ['BTech', 'B.Tech', 'B. Tech', 'Btech'];
        } else if (pClean.toLowerCase() === 'mtech') {
            programCandidates = ['MTech', 'M.Tech', 'M. Tech', 'Mtech'];
        }

        // Customize Branch variants
        // Support "CSE(AIML)" and "CSE (AIML)"
        let branchNormalized = normalize(branch);
        const branchNoSpace = branchNormalized.replace(/\s+\(/g, '(');
        const branchWithSpace = branchNormalized.replace(/\(/g, ' (').replace(/\s+/g, ' ').replace(' (', ' (').trim();
        // The above regex might be tricky. Simpler: ensure space or no space.

        // Let's just create the two specific known variants we care about if parentheses exist
        let branchCandidates = [branchNormalized];
        if (branchNormalized.includes('(')) {
            const parts = branchNormalized.split('(');
            const base = parts[0].trim();
            const rest = parts.slice(1).join('(').trim(); // "AIML)"
            branchCandidates = [
                `${base}(${rest}`, // "CSE(AIML)"
                `${base} (${rest}` // "CSE (AIML)"
            ];
        } else {
            branchCandidates = [branchNormalized, branch];
        }

        // Dedup
        branchCandidates = [...new Set(branchCandidates)];

        // Year and Sem
        const yearInt = parseInt(year, 10);
        const semRoman = normalize(sem_roman); // strict case?

        console.log('[LMS Subjects] Normalized/Search Params:', {
            programCandidates,
            branchCandidates,
            yearInt,
            semRoman
        });

        const { data, error } = await supabase
            .from(table)
            .select('subject')
            .in('program', programCandidates)
            .in('branch', branchCandidates)
            .eq('year', yearInt)
            .eq('sem_roman', semRoman);

        if (error) throw error;

        console.log(`[LMS Subjects] Found ${data?.length || 0} rows`);

        // Extract unique subjects
        const subjects = [...new Set(data.map(d => d.subject))].sort();

        return res.json({ subjects });

    } catch (err) {
        console.error('GET /api/lms/subjects error', err);
        return res.status(500).json({ error: 'Failed to fetch subjects' });
    }
});

export default router;
