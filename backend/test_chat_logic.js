import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Mock Express Response
const res = {
    json: (data) => console.log("✅ Response JSON:", JSON.stringify(data, null, 2)),
    status: (code) => {
        console.log(`❌ Status Set: ${code}`);
        return { json: (data) => console.log("❌ Error JSON:", data) };
    }
};

// Mock User (Student)
const reqStudent = {
    user: { uid: 'test-student-uid', email: 'test@student.com' },
    body: { message: "Hello", role: "Student" }
};

// Mock Dependencies
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testChatLogic() {
    console.log("=== Testing Chat Route Logic (Mock) ===");

    // 1. Simulate Context Fetching (Copy-paste logic from chatRoutes.js essentially)
    try {
        const { uid } = reqStudent.user;
        console.log("Fetching context for UID:", uid);

        // We need a REAL uid to test Supabase queries effectively. 
        // Let's try to fetch ANY student profile first to get a valid ID 
        // because 'test-student-uid' wont exist.

        const { data: realStudent } = await supabase
            .from('student_profiles')
            .select('id, first_name')
            .limit(1)
            .single();

        if (!realStudent) {
            console.log("⚠️ No students found in DB. Cannot test real context fetching.");
            return;
        }

        console.log(`Using real student ID: ${realStudent.id} (${realStudent.first_name})`);
        reqStudent.user.uid = realStudent.id;

        // --- Logic from chatRoutes.js (Student user) ---
        // Inspect actual columns first
        const debugProfile = await supabase
            .from('student_profiles')
            .select('*')
            .eq('id', reqStudent.user.uid)
            .single();

        console.log("Actual Profile Keys:", Object.keys(debugProfile.data || {}));
        console.log("Values for program/branch:", {
            program: debugProfile.data?.program,
            branch: debugProfile.data?.branch,
            degree: debugProfile.data?.degree,
            discipline: debugProfile.data?.discipline
        });

        const profileQuery = await supabase
            .from('student_profiles')
            // Trying to select fields that might not exist
            .select('first_name, second_name, degree, discipline, year, sem_roman, subjects, program, branch')
            .eq('id', reqStudent.user.uid)
            .single();

        if (profileQuery.error) throw new Error(`Profile Fetch Error: ${profileQuery.error.message}`);
        const profile = profileQuery.data;
        console.log("Fetched Profile:", profile ? "OK" : "Missing");

        // Attendance
        const attQuery = await supabase
            .from('attendance_submissions')
            .select('status')
            .eq('student_id', reqStudent.user.uid);
        console.log("Fetched Attendance:", attQuery.data?.length || 0, "records");

        // Timetable
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = days[new Date().getDay()];

        // Fix: Ensure variables match what backend expects (backend uses degree/discipline)
        // Check if `program` column exists in timetable_entries or if it is `degree`
        // Inspecting index.js... wait, let's just run the query as written in chatRoutes

        const timetableQuery = await supabase
            .from('timetable_entries')
            .select('subject_name, start_time, end_time, room_no')
            .eq('program', profile.degree)
            .eq('branch', profile.discipline)
            .eq('year', profile.year)
            .eq('sem_roman', profile.sem_roman)
            .eq('day', today)
            .order('start_time', { ascending: true });

        if (timetableQuery.error) console.warn("Timetable Error (might be empty but query valid):", timetableQuery.error.message);
        console.log("Fetched Timetable:", timetableQuery.data?.length || 0, "entries");

        console.log("✅ Context Fetching Logic Success!");

        // We won't call the actual AI service here to save tokens/time, 
        // but we verified the DB part which is the most likely failure point (500 error).

    } catch (error) {
        console.error("❌ Logic Failure:", error);
    }
}

testChatLogic();
