
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase
        .from('professor_attendance_permissions')
        .select('*')
        .limit(1);

    if (error) { console.error(error); return; }
    console.log('Keys in professor_attendance_permissions:', Object.keys(data[0] || {}));
}

check();
