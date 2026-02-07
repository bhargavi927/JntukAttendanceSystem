
import { Router } from 'express';
import getSupabase from '../config/supabaseClient.js';
import { authenticate } from '../middleware/auth.js';
import { calculateAdvancedPrediction, aggregatePredictions } from '../utils/attendancePredictor.js';

const router = Router();

// GET /api/attendance/prediction
router.get('/prediction', authenticate, async (req, res) => {
    try {
        const supabase = getSupabase();
        const { uid } = req.user;

        // 1. Fetch Student Profile to get implementation context (program/branch etc if needed for schedule)
        // We'll assume the student is valid if authenticated, but we need their ID for submissions.

        // 2. Fetch Attendance Submissions (Approved only? Or all? Usually Approved + Pending helps, but Approved is confirming 'Attended')
        // Let's count 'Approved' as 'Attended'.
        const { data: submissions, error: subError } = await supabase
            .from('attendance_submissions')
            .select('subject, status')
            .eq('student_id', uid)
            .eq('status', 'Accepted');

        if (subError) throw subError;

        // Group by subject
        const attendanceMap = {};
        submissions.forEach(sub => {
            const s = sub.subject;
            if (!attendanceMap[s]) attendanceMap[s] = 0;
            attendanceMap[s]++;
        });

        // 3. Fetch "Held" classes. 
        // Logic: Count valid permission records for the student's batch that have passed?
        // This is complex without knowing exact batch. 
        // PROMPT CONSTRAINT: "Total classes held per subject (either from permissions/sessions/timetable or derive from records)"
        // Deriving from "permissions" table is best if we know the student's batch.
        // Let's TRY to find the student's batch first.

        const { data: profile } = await supabase
            .from('student_profiles')
            .select('program, branch, year, sem_roman')
            .eq('id', uid)
            .single();

        // 4. Fetch Accurate "Held" Classes Count from Permissions
        // 4. Fetch Accurate "Held" Classes Count with Manual Join
        // Logic: Permissions -> Timetable -> Check Match(Program/Branch)

        let heldMap = {};

        if (profile) {
            const today = new Date().toISOString().slice(0, 10);

            // A. Fetch all active permissions for subjects relevant to this student? 
            // Or fetch ALL active permissions and filtering in memory is safer if dataset < 1000.
            // We'll fetch active permissions with their IDs.
            const { data: allPerms, error: permErr } = await supabase
                .from('professor_attendance_permissions')
                .select('id, subject, timetable_entry_id, session_hours, date')
                .eq('status', 'Active')
                .lte('date', today);

            if (!permErr && allPerms && allPerms.length > 0) {
                // Extract IDs to fetch details
                const timetableIds = allPerms
                    .map(p => p.timetable_entry_id)
                    .filter(id => id); // Remove nulls

                // B. Fetch Timetable Details for these IDs
                let validTimetableIds = new Set();
                if (timetableIds.length > 0) {
                    const { data: entries, error: tErr } = await supabase
                        .from('timetable_entries')
                        .select('id, program, branch, year, sem_roman')
                        .in('id', timetableIds);

                    if (!tErr && entries) {
                        // Filter entries that match THIS student's batch
                        entries.forEach(e => {
                            // Normalize comparisons?
                            const pMatch = (e.program || '').toLowerCase() === (profile.program || '').toLowerCase();
                            const bMatch = (e.branch || '').toLowerCase().replace(/\s/g, '') === (profile.branch || '').toLowerCase().replace(/\s/g, '');
                            const yMatch = parseInt(e.year) == parseInt(profile.year);
                            const sMatch = (e.sem_roman || '').toLowerCase() === (profile.sem_roman || '').toLowerCase();

                            if (pMatch && bMatch && yMatch && sMatch) {
                                validTimetableIds.add(e.id);
                            }
                        });
                    }
                }

                // C. Sum up hours for permissions that link to Valid Timetable IDs
                allPerms.forEach(p => {
                    // Check if this permission belongs to the student's batch
                    if (p.timetable_entry_id && validTimetableIds.has(p.timetable_entry_id)) {
                        const s = p.subject;
                        const hours = p.session_hours ? parseFloat(p.session_hours) : 1;
                        heldMap[s] = (heldMap[s] || 0) + hours;
                    }
                    // Edge case: Permission created Without Timetable ID (Manual extra class)?
                    // If so, we can't verify batch. We might implicitly trust it if Subject matches?
                    // For "Strict/Honest" mode, we skip if we can't verify Batch. 
                    // Or we could check if subject exists in the student's registered subjects.
                });
            }
        }

        // 5. Fetch Timetable for 'weeklyClasses' (Future projection)
        let weeklyClassesMap = {};
        let distinctSubjects = Object.keys(attendanceMap);

        // Add subjects that have been held but maybe not attended yet
        Object.keys(heldMap).forEach(s => {
            if (!distinctSubjects.includes(s)) distinctSubjects.push(s);
        });

        if (profile) {
            const { data: timetable } = await supabase
                .from('timetable_entries')
                .select('subject, day')
                .eq('program', profile.program)
                .eq('branch', profile.branch)
                .eq('year', profile.year)
                .eq('sem_roman', profile.sem_roman);

            if (timetable) {
                timetable.forEach(Entry => {
                    const s = Entry.subject;
                    if (!weeklyClassesMap[s]) weeklyClassesMap[s] = 0;
                    weeklyClassesMap[s]++;
                    if (!distinctSubjects.includes(s)) distinctSubjects.push(s);
                });
            }
        }

        // Prepare data for Rule Engine
        const DEFAULT_WEEKS_REMAINING = 4;
        const ESTIMATED_TOTAL_WEEKS = 16;
        const WEEKS_PASSED = ESTIMATED_TOTAL_WEEKS - DEFAULT_WEEKS_REMAINING;

        const subjectData = distinctSubjects.map(subject => {
            const attended = attendanceMap[subject] || 0;
            const weekly = weeklyClassesMap[subject] || 3; // Fallback 3

            // "Held" is now Accurate from DB (Joined filtering)
            // If heldMap is empty (no permissions logged), we show 0.
            // But if Attended > 0 and Held=0, that's impossible.
            // We clamp: pureHeld = heldMap[s] || 0. 
            // effectiveHeld = Max(pureHeld, attended).

            let realHeld = heldMap[subject] || 0;
            if (realHeld < attended) realHeld = attended;

            // Formula requested: (Attended / Conducted) * 100
            // We store these raw values. 'pct' will be calculated in Rule Engine or here.
            // Currently logic uses 'pct' derived later?
            // Wait, calculateRuleBasedPrediction takes 'd'.
            // We should ensure 'pct' is passed if needed, or let it compute.
            // We compute pct here to be sure.

            const pct = realHeld > 0 ? (attended / realHeld) * 100 : 0;

            return {
                subject,
                held: realHeld,
                attended,
                pct, // Explicitly passing calculated percentage
                weeklyClasses: weekly,
                weeksRemaining: DEFAULT_WEEKS_REMAINING
            };
        });

        // 5. Run Prediction Logic (Replaces both Rule-Based and ML)
        const predictionResults = subjectData.map(d => calculateAdvancedPrediction(d));

        // 6. Overall Risk
        const overallRisk = aggregatePredictions(predictionResults);

        // Calculate average probability
        const probSum = predictionResults.reduce((sum, p) => sum + p.probability, 0);
        const avgProb = predictionResults.length > 0 ? probSum / predictionResults.length : 0;

        res.json({
            overall: {
                risk: overallRisk, // Unified risk
                prob: avgProb
            },
            subjects: predictionResults
        });

    } catch (err) {
        console.error('GET /api/attendance/prediction error', err);
        res.status(500).json({ error: 'Failed to generate prediction' });
    }
});

export default router;
