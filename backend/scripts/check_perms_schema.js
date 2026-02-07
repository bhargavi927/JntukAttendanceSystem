
import getSupabase from './src/config/supabaseClient.js';

async function check() {
    const supabase = getSupabase();
    console.log("Checking professor_attendance_permissions columns...");

    const { data, error } = await supabase
        .from('professor_attendance_permissions')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        console.log("Columns found:", Object.keys(data[0]));
    } else {
        console.log("Table is empty, cannot verify columns from data.");
    }
}

check();
