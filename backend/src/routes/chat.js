import express from 'express';
import { generateAIResponse } from '../services/aiService.js';
import { authenticate } from '../middleware/auth.js';
import getSupabase from '../config/supabaseClient.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
    console.log('[Chat Route] Incoming request from user:', req.user?.uid, 'role:', req.body?.role);
    try {
        const { message, role } = req.body;
        const { uid, email } = req.user;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Fetch user context from Supabase
        const supabase = getSupabase();
        let contextData = {};

        if (role === 'Student' || role === 'student') {
            // 1. Fetch Profile
            const { data: profile } = await supabase
                .from('student_profiles')
                .select('first_name, second_name, program, branch, year, sem_roman, subjects')
                .eq('id', uid)
                .single();

            // 2. Fetch Attendance Summary
            // Calculate real attendance % from submissions
            const { data: submissions } = await supabase
                .from('attendance_submissions')
                .select('status')
                .eq('student_id', uid);

            const total = submissions?.length || 0;
            const present = submissions?.filter(s => s.status === 'Accepted').length || 0;
            const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

            // 3. Fetch Weekly Timetable
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            // Normalize Query Params (Handle M.Tech vs MTech mismatch)
            // Timetable uses "MTech", Profile uses "M.Tech"
            const normalizedProgram = profile.program ? profile.program.replace(/\./g, '') : '';

            // Use correct columns as per DB schema: subject (not subject_name), room (not room_no)
            const { data: timetable } = await supabase
                .from('timetable_entries')
                .select('day, subject, start_time, end_time, room')
                .or(`program.eq.${profile.program},program.eq.${normalizedProgram}`) // Check both variants
                .eq('branch', profile.branch)
                .eq('year', profile.year)
                .eq('sem_roman', profile.sem_roman)
                .order('day', { ascending: true })
                .order('start_time', { ascending: true });

            // --- NEW: Attendance Prediction Context ---
            let predictionSummary = "Data unavailable";
            try {
                // Group attendance by subject
                const attendanceMap = {};
                if (submissions) {
                    submissions.forEach(sub => {
                        // Only count Accepted for 'Attended'
                        if (sub.status === 'Accepted') {
                            // subject name might need normalization, but let's assume raw match
                            const s = sub.subject || 'Unknown';
                            attendanceMap[s] = (attendanceMap[s] || 0) + 1;
                        }
                    });
                }

                // Calculate Weekly Classes from Timetable
                const weeklyMap = {};
                const distinctSubjects = [];
                if (timetable) {
                    timetable.forEach(t => {
                        const s = t.subject;
                        weeklyMap[s] = (weeklyMap[s] || 0) + 1;
                        if (!distinctSubjects.includes(s)) distinctSubjects.push(s);
                    });
                }

                // Simple Prediction Calculation (Rule-Based only for Chat speed)
                const subjectsRisk = distinctSubjects.map(sub => {
                    const attended = attendanceMap[sub] || 0;
                    const weekly = weeklyMap[sub] || 3;
                    // Estimation of Held: max(attended, weekly * 12) - assuming 12 weeks passed roughly
                    // Use a conservative estimate for context
                    const estimatedHeld = Math.max(attended, weekly * 12);
                    const pct = estimatedHeld > 0 ? (attended / estimatedHeld * 100).toFixed(0) : 0;

                    // Risk Rule: < 75%
                    let risk = 'Low';
                    if (pct < 75) risk = 'High';
                    else if (pct < 80) risk = 'Medium';

                    return `${sub}: ${pct}% (Risk: ${risk})`;
                });

                predictionSummary = subjectsRisk.join('; ');
            } catch (predErr) {
                console.error("[Chat] Prediction context error:", predErr);
            }
            // ------------------------------------------

            contextData = {
                name: profile ? `${profile.first_name} ${profile.second_name}` : email,
                attendance: `${percentage}% (${present}/${total} classes)`,
                attendance_prediction: predictionSummary, // Injected here
                profile: profile || {},
                subjects: profile?.subjects || [],
                timetable: timetable || [],
                today: today
            };
        } else if (role === 'Professor' || role === 'professor') {
            // 1. Fetch Profile
            const { data: profile } = await supabase
                .from('professor_profiles')
                .select('first_name, second_name, department, subjects') // Corrected columns
                .eq('id', uid)
                .single();

            // 2. Fetch Active Classes (Permissions)
            let { data: activeClasses } = await supabase
                .from('professor_attendance_permissions')
                .select('subject_name, program, branch, year, sem_roman, status')
                .eq('professor_id', uid)
                .eq('status', 'Active');

            // Fallback: If permissions are empty, use subjects from Profile (as text list)
            if (!activeClasses || activeClasses.length === 0) {
                let subjectsList = [];
                if (Array.isArray(profile?.subjects)) {
                    subjectsList = profile.subjects;
                } else if (typeof profile?.subjects === 'string') {
                    subjectsList = profile.subjects.split(',').map(s => s.trim());
                }

                activeClasses = subjectsList.map(sub => ({
                    subject_name: sub,
                    program: 'Unknown',
                    branch: 'Unknown',
                    status: 'Active'
                }));
            }

            // 3. Fetch Pending Requests (Detailed)
            const { data: pendingData } = await supabase
                .from('attendance_submissions')
                .select('id, subject_name, student_id, risk_level, created_at')
                .eq('status', 'Pending');

            const pendingCount = pendingData?.length || 0;
            const suspiciousCount = pendingData?.filter(s => s.risk_level === 'High').length || 0;
            const safeCount = pendingCount - suspiciousCount;

            // Manual Join: Fetch Student Profiles for these requests to get Program/Branch
            let groupedPending = {};

            if (pendingCount > 0) {
                const studentIds = [...new Set(pendingData.map(p => p.student_id))];
                const { data: studentProfiles } = await supabase
                    .from('student_profiles')
                    .select('id, program, branch') // Assuming 'id' matches 'student_id'
                    .in('id', studentIds);

                // Create a map for quick lookup
                const profileMap = (studentProfiles || []).reduce((acc, prof) => {
                    acc[prof.id] = prof;
                    return acc;
                }, {});

                // Group by Program -> Subject
                groupedPending = pendingData.reduce((acc, curr) => {
                    const prof = profileMap[curr.student_id];
                    const prog = prof?.program || 'Unknown';
                    // Normalize program if needed (e.g. M.Tech -> MTech logic if we cared, but here we just display it)
                    const subj = curr.subject_name;
                    const key = `${prog} - ${subj}`;

                    if (!acc[key]) acc[key] = { total: 0, high_risk: 0, ids: [] };
                    acc[key].total++;
                    if (curr.risk_level === 'High') acc[key].high_risk++;
                    acc[key].ids.push(curr.id);
                    return acc;
                }, {});
            }
            console.log("3. Pending Data Fetched");

            const pendingSummary = Object.entries(groupedPending)
                .map(([key, stats]) => `${key}: ${stats.total} reqs (${stats.high_risk} High Risk)`)
                .join('; ');

            // ... chart logic ...
            const pendingChart = {
                type: 'bar',
                title: 'Pending Approvals Overview',
                data: [
                    { label: 'Safe', value: safeCount, color: '#10B981' }, // Green
                    { label: 'High Risk', value: suspiciousCount, color: '#EF4444' } // Red
                ]
            };

            // 4. Class Analytics
            const todayISO = new Date().toISOString().split('T')[0];
            const { data: todaySubmissions } = await supabase
                .from('attendance_submissions')
                .select('risk_level, ai_analysis, status, subject_name')
                .gte('created_at', todayISO);
            console.log("4. Analytics Fetched");

            // ... analytics logic ...
            let analyticsSummary = "No classes conducted today.";
            if (todaySubmissions && todaySubmissions.length > 0) {
                const total = todaySubmissions.length;
                const highRisk = todaySubmissions.filter(s => s.risk_level === 'High').length;
                const present = todaySubmissions.filter(s => s.status === 'Accepted').length;

                // Group by subject
                const bySubject = todaySubmissions.reduce((acc, curr) => {
                    acc[curr.subject_name] = (acc[curr.subject_name] || 0) + 1;
                    return acc;
                }, {});

                analyticsSummary = `Total Submissions Today: ${total}. Present: ${present}. High Risk: ${highRisk}. Breakdown: ${JSON.stringify(bySubject)}`;
            }

            // 5. Fetch Professor Timetable 
            // ... timetable logic ...
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            let professorTimetable = [];

            if (activeClasses && activeClasses.length > 0) {
                const subjects = activeClasses.map(c => c.subject_name);

                const { data: allTimetable } = await supabase
                    .from('timetable_entries')
                    .select('*')
                    .eq('day', today)
                    .in('subject', subjects)
                    .order('start_time', { ascending: true });

                professorTimetable = (allTimetable || []).filter(entry =>
                    activeClasses.some(cls =>
                        cls.subject_name === entry.subject &&
                        cls.branch === entry.branch &&
                        cls.program === entry.program
                    )
                );
            }
            console.log("5. Timetable Fetched");

            contextData = {
                name: profile ? `${profile.first_name} ${profile.second_name}` : email,
                role: 'Professor',
                active_classes: activeClasses || [],
                pending_approvals: `${pendingCount} total. Breakdown: ${pendingSummary}`,
                pending_chart: JSON.stringify(pendingChart),
                analytics: analyticsSummary,
                timetable: professorTimetable,
                today: today
            };
        }

        console.log("Context prepared. Calling AI Service...");
        console.log("Context Keys:", Object.keys(contextData));

        let response = await generateAIResponse(message, role || 'Student', contextData);
        console.log("AI Response Received. Length:", response.text.length);

        // --- ACTION EXECUTION LOGIC ---
        if (response.text.includes('[ACTION: ACCEPT_ALL]')) {
            console.log("[ChatAction] Executing ACCEPT_ALL");
            // ... action logic ...
            const { error } = await supabase
                .from('attendance_submissions')
                .update({ status: 'Accepted' })
                .eq('status', 'Pending');

            if (!error) {
                response.text = response.text.replace('[ACTION: ACCEPT_ALL]', '\n\n✅ **Success:** All pending attendance requests have been accepted.');
            } else {
                response.text = response.text.replace('[ACTION: ACCEPT_ALL]', '\n\n❌ **Error:** Failed to update database.');
            }

        } else if (response.text.includes('[ACTION: ACCEPT_SAFE]')) {
            console.log("[ChatAction] Executing ACCEPT_SAFE");
            // ... action logic ...
            const { error } = await supabase
                .from('attendance_submissions')
                .update({ status: 'Accepted' })
                .eq('status', 'Pending')
                .neq('risk_level', 'High');

            if (!error) {
                response.text = response.text.replace('[ACTION: ACCEPT_SAFE]', '\n\n✅ **Success:** All safe (non-suspicious) attendance requests have been accepted.');
            } else {
                response.text = response.text.replace('[ACTION: ACCEPT_SAFE]', '\n\n❌ **Error:** Failed to update database.');
            }
        }

        console.log("Sending response to frontend...");
        res.json(response);

    } catch (error) {
        console.error("Chat Route Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
