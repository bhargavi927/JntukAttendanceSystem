
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars:', { supabaseUrl, supabaseKey: !!supabaseKey });
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking lms_subject_folders...');

    // Check for M.Tech specifically
    const { data: mtech, error } = await supabase
        .from('lms_subject_folders')
        .select('program, branch, year, sem_roman')
        .ilike('program', 'M%Tech%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    // console.log('Found M.Tech entries:', mtech.length);
    // const unique = [...new Set(mtech.map(m => JSON.stringify(m)))].map(s => JSON.parse(s));
    // console.log('Unique Configurations:', unique);

    // Check specific branch logic
    const { data: branches } = await supabase
        .from('lms_subject_folders')
        .select('branch')
        .ilike('program', 'M%Tech%');

    const uniqueBranches = [...new Set(branches.map(b => b.branch))];
    console.log('M.Tech Branches in DB:', uniqueBranches);

    // Check strict match for what we are looking for
    const { data: strictMatch } = await supabase
        .from('lms_subject_folders')
        .select('program, branch, year, sem_roman, subject')
        .ilike('program', 'M%Tech%')
        .eq('year', 1)
        .eq('sem_roman', 'I');

    console.log('M.Tech Year 1 Sem I entries:', strictMatch);
}

check();
