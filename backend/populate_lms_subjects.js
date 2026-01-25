
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const subjectsToAdd = [
    'Seminar-I',
    'Augmented Reality and Virtual Reality (ARVR)',
    'High Performance Computing (HPC)',
    'Artificial Intelligence (AI)',
    'Advanced Data Structures and Algorithms (Tutorial)',
    'Mathematics for Machine Learning (Tutorial)'
];

const context = {
    program: 'MTech',
    branch: 'CSE(AIML)',
    year: 1,
    sem_roman: 'I'
};

async function populateSubjects() {
    console.log('Inserting missing subjects...');

    // Use a placeholder URL - User should update this later
    const placeholderUrl = 'https://drive.google.com/drive/u/0/my-drive';

    const records = subjectsToAdd.map(subject => ({
        ...context,
        subject: subject,
        drive_folder_url: placeholderUrl
    }));

    const { data, error } = await supabase
        .from('lms_subject_folders')
        .upsert(records, { onConflict: 'program, branch, year, sem_roman, subject' })
        .select();

    if (error) {
        console.error('Error inserting subjects:', error);
        return;
    }

    console.log(`Successfully inserted/updated ${data.length} subjects.`);
    console.table(data);
}

populateSubjects();
