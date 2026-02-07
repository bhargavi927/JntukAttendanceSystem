
import getSupabase from './src/config/supabaseClient.js';

async function check() {
    const supabase = getSupabase();
    console.log("Checking for timetable_entry_id...");

    // Check if column exists by selecting it
    const { data, error } = await supabase
        .from('professor_attendance_permissions')
        .select('timetable_entry_id')
        .limit(1);

    if (error) {
        console.error("Column check failed:", error);
    } else {
        console.log("Column confirmed accessible.");
    }
}

check();
