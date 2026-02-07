
import getSupabase from './src/config/supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = getSupabase();

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

    console.log('Found M.Tech entries:', mtech.length);
    const unique = [...new Set(mtech.map(JSON.stringify))].map(JSON.parse);
    console.log('Unique Configurations:', unique);

    // Check specifically for what the user is selecting
    // Program: M.Tech
    // Branch: CSE (AIML)
    // Year: 1
    // Sem: I

    // Let's see what branches we have for M.Tech
    const { data: branches } = await supabase
        .from('lms_subject_folders')
        .select('branch')
        .ilike('program', 'M%Tech%');

    const uniqueBranches = [...new Set(branches.map(b => b.branch))];
    console.log('M.Tech Branches in DB:', uniqueBranches);
}

check();
