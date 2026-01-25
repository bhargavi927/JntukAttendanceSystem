
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .rpc('get_columns', { table_name: 'professor_attendance_permissions' }); // RPC unlikely to exist

    // Standard way
    const { data: cols, error: err } = await supabase
        .from('professor_attendance_permissions')
        .select('*')
        .limit(0);

    // If limit 0 returns no data, we can't get keys.
    // Let's try inserting a dummy row and seeing if it fails on unknown columns? No.

    // Try to select specific columns and see if error.
    const { error: err2 } = await supabase
        .from('professor_attendance_permissions')
        .select('program, branch, year, sem_roman')
        .limit(1);

    if (err2) {
        console.log('Columns likely MISSING:', err2.message);
    } else {
        console.log('Columns EXIST.');
    }
}

check();
