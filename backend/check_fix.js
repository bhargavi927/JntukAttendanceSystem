
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const branchNormalized = "CSE (AIML)";
    let branchCandidates = [branchNormalized];
    if (branchNormalized.includes('(')) {
        const parts = branchNormalized.split('(');
        const base = parts[0].trim();
        const rest = parts.slice(1).join('(').trim(); // "AIML)"
        branchCandidates = [
            `${base}(${rest}`, // "CSE(AIML)"
            `${base} (${rest}` // "CSE (AIML)"
        ];
    }

    console.log('Candidates:', branchCandidates);

    const { data, error } = await supabase
        .from('lms_subject_folders')
        .select('subject')
        .in('program', ['MTech', 'M.Tech', 'Mtech'])
        .in('branch', branchCandidates)
        .eq('year', 1)
        .eq('sem_roman', 'I');

    if (error) { console.error(error); return; }

    console.log('Found subjects:', data.map(d => d.subject));
}

check();
