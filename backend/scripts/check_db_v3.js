
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: branches, error } = await supabase
        .from('lms_subject_folders')
        .select('program, branch')
        .ilike('program', 'M%Tech%');

    if (error) { console.error(error); return; }

    const unique = [...new Set(branches.map(b => `${b.program} | ${b.branch}`))];
    console.log('Unique MTech Combinations:', unique);
}

check();
