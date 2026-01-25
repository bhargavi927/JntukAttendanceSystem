import React from 'react';
import { useLocation } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import StudentFooter from '../components/StudentFooter';
import { fetchStudentProfile } from '../utils/fetchStudentProfile';
import { BACKEND_URL } from '../config';

const BRAND = {
  green: '#0F9D78',
  greenDark: '#0B7A5E',
  border: '#E5E7EB'
};

const API_BASE = BACKEND_URL;

function getTodayISODate() {
  const now = new Date();
  const tzAdjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return tzAdjusted.toISOString().slice(0, 10);
}

export default function AttendanceRegisterDetails() {
  const location = useLocation();
  const navState = (location && location.state) || {};
  const auth = getAuth();

  const registerNumber = String(navState.regNo || '').trim();

  const [selectedDate, setSelectedDate] = React.useState(getTodayISODate());
  const [subjects, setSubjects] = React.useState([]);
  const [selectedSubject, setSelectedSubject] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  // Store all submissions: { [subjectName]: [submissions...] }
  const [attendanceMap, setAttendanceMap] = React.useState({});

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // 1. Fetch Profile (Required for context)
        const profile = await fetchStudentProfile();
        if (cancelled) return;

        // 2. Normalize Profile Data
        const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
        let program = normalize(profile?.program);
        // Normalize checking against backend expectations
        // "B.Tech" -> "Btech"
        const pClean = program.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (pClean === 'btech') program = 'Btech';
        if (pClean === 'mtech') program = 'MTech';

        let branch = normalize(profile?.branch);
        // Ensure "CSE (AIML)" format consistency if needed (backend handles strict variations now)

        const year = parseInt(profile?.year || 0);
        const sem_roman = normalize(profile?.sem_roman);

        // 3. Fetch LMS Subjects (Primary Source)
        let lmsSubjects = [];
        if (program && branch && year && sem_roman) {
          const params = new URLSearchParams({
            program,
            branch,
            year,
            sem_roman
          });
          try {
            // Use public endpoint (or authenticated if needed, check backend)
            // Backend routes/lmsSubjectRoutes.js usually requires auth if 'authenticate' middleware is used.
            // We'll pass token to be safe if backend expects it, or just fetch.
            // Checking route definition: router.use(authenticate) -> YES.
            const token = await user.getIdToken();
            const subRes = await fetch(`${API_BASE}/api/lms/subjects?${params.toString()}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (subRes.ok) {
              const subJson = await subRes.json();
              lmsSubjects = subJson.subjects || [];
            }
          } catch (e) {
            console.error("Failed to fetch LMS subjects", e);
          }
        }

        // 4. Fetch Attendance Submissions (For Stats)
        const token = await user.getIdToken();
        const res = await fetch(`${API_BASE}/api/attendance-submissions/my-submissions`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        let grouped = {};
        if (res.ok) {
          const json = await res.json();
          const list = json.submissions || [];

          // Group by subject
          list.forEach(sub => {
            const normSub = (sub.subject || '').trim();
            if (!grouped[normSub]) grouped[normSub] = [];
            grouped[normSub].push(sub);
          });
        }
        setAttendanceMap(grouped);

        // 5. Finalize Subject List
        // Use LMS subjects as the source of truth. 
        // We can optionally append subjects from history that are NOT in LMS (edge case)
        // But user requirement says: "Subjects must come from Supabase table lms_subject_folders"
        // and "If attendance contains subjects not present in LMS list (rare), merge them in"

        const historySubjects = Object.keys(grouped);
        const combined = [...new Set([...lmsSubjects, ...historySubjects])].sort();

        setSubjects(combined);

        if (combined.length > 0) {
          // Preserve selected if valid, else default to first
          setSelectedSubject(prev => combined.includes(prev) ? prev : combined[0]);
        } else {
          setSubjects([]);
        }

        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load details:", err);
          setError('Could not fetch details.');
          setLoading(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [auth]);

  // Calculate stats for the selected subject
  const details = React.useMemo(() => {
    if (!selectedSubject) return { present: 0, absent: 0, percentage: 0, total: 0 };

    const subjectSubmissions = attendanceMap[selectedSubject] || [];

    // "Present" = Status is Accepted
    const present = subjectSubmissions.filter(s => s.status === 'Accepted').length;

    // "Absent" logic is ambiguous without total classes schedule. 
    // For now, we only track "Present". 'Absent' is unknown or we assume 0 if we assume every class was attended.
    // To avoid confusion, we'll set absent to 0 or leave it static until we have a "Total Classes Held" API.
    const absent = 0;

    const total = present + absent;
    // If total is 0, avoid NaN
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { present, absent, percentage, total };
  }, [selectedSubject, attendanceMap]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8faf5] items-center justify-center">
        <div className="text-lg text-gray-700">Loading details...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf5]">
      <div className="flex-1">
        <div
          className="w-full max-w-5xl mx-auto bg-white border rounded-2xl shadow-sm overflow-hidden"
          style={{ borderColor: BRAND.border }}
        >
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Subject list */}
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold mb-3 uppercase">
                  <span style={{ color: BRAND.green }}>ATTENDANCE</span>{' '}
                  <span className="text-gray-900">REGISTER</span>
                </h2>

                <div className="text-base font-bold text-gray-900 mb-3">Subjects</div>
                <div className="flex flex-col gap-2 mb-4">
                  {subjects.length === 0 ? (
                    <div className="text-gray-500">No subjects found in your profile.</div>
                  ) : (
                    subjects.map((subj) => (
                      <button
                        key={subj}
                        className={`text-left px-4 py-2 rounded-lg font-semibold border transition-all duration-200
                          ${selectedSubject === subj
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-400 shadow-md scale-[1.01]'
                            : 'bg-white text-gray-900 border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.99]'}
                        `}
                        style={{ fontFamily: 'Garamond, serif' }}
                        onClick={() => setSelectedSubject(subj)}
                      >
                        {subj}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Details panel */}
              <div>
                <div className="text-sm font-bold text-gray-900 mb-3">Attendance Details</div>

                <div
                  key={selectedSubject}
                  className="border rounded-2xl p-5 bg-white shadow-sm transition-all duration-200"
                  style={{ borderColor: BRAND.border }}
                >
                  <div className="text-lg font-extrabold text-gray-900">{selectedSubject || 'Select a Subject'}</div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border }}>
                      <div className="text-xs text-gray-500">Register Number</div>
                      <div className="text-sm font-semibold text-gray-900">{registerNumber || '—'}</div>
                    </div>

                    <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border }}>
                      <div className="text-xs text-gray-500">Date</div>
                      <div className="mt-1">
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border }}>
                        <div className="text-xs text-gray-500">Present Count</div>
                        <div className="text-sm font-semibold" style={{ color: BRAND.green }}>
                          {details.present}
                        </div>
                      </div>

                      <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border }}>
                        {/* Since we don't track absent, showing '-' or 0 */}
                        <div className="text-xs text-gray-500">Absent Count</div>
                        <div className="text-sm font-semibold text-gray-900">{details.absent}</div>
                      </div>

                      <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border }}>
                        <div className="text-xs text-gray-500">Total Approved</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {details.present}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border p-3 sm:col-span-2" style={{ borderColor: BRAND.border }}>
                      <div className="text-xs text-gray-500">Attendance Percentage (Approx)</div>
                      <div className="mt-1 flex items-center justify-between gap-4">
                        <div className="text-sm font-semibold text-gray-900">{details.percentage}%</div>
                        <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${details.percentage}%`,
                              backgroundColor: details.percentage >= 75 ? BRAND.green : BRAND.greenDark,
                              transition: 'width 200ms ease'
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">* Calculated on attended classes</div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: '48px' }} />
    </div>
  );
}
