import React from 'react';
import { useNavigate } from 'react-router-dom';
import StudentFooter from '../components/StudentFooter';
import { fetchStudentProfile } from '../utils/fetchStudentProfile';
import { supabase } from '../supabase.js';

export default function AttendenceCheck() {
  const navigate = useNavigate();

  const BRAND = {
    green: '#0F9D78',
    greenDark: '#0B7A5E'
  };

  const [regNo, setRegNo] = React.useState('');
  const [program, setProgram] = React.useState('');
  const [branch, setBranch] = React.useState(''); // ✅ added
  const [year, setYear] = React.useState('');
  const [semester, setSemester] = React.useState('');
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [checking, setChecking] = React.useState(false); // ✅ added
  const [error, setError] = React.useState('');

  // Year options based on program
  const yearOptions = React.useMemo(() => {
    if (/mtech/i.test(program)) return ['1', '2'];
    if (/btech|b\.tech/i.test(program)) return ['1', '2', '3', '4'];
    return [];
  }, [program]);

  // Semester is ALWAYS only I & II
  const semesterOptions = React.useMemo(() => {
    return year ? ['I', 'II'] : [];
  }, [year]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadingProfile(true);

    fetchStudentProfile()
      .then((profile) => {
        if (cancelled) return;
        setRegNo(profile?.reg_no || '');
        const rawProgram = profile?.program || '';
        let normProgram = rawProgram;
        if (rawProgram) {
          const p = rawProgram.replace(/[^a-zA-Z]/g, '').toLowerCase();
          if (p === 'btech') normProgram = 'Btech';
          else if (p === 'mtech') normProgram = 'MTech';
        }
        setProgram(normProgram);
        setBranch(profile?.branch || ''); // ✅ added
        setYear('');
        setSemester('');
        setError('');
        setLoadingProfile(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Please update your profile with Reg No');
        setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Reset semester when year changes
  React.useEffect(() => {
    setSemester('');
  }, [year]);

  // ---- normalize same as backend ----
  function normalize(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  }
  function normalizeProgram(p) {
    return normalize(p).replace(/^btech$/i, 'BTech').replace(/^mtech$/i, 'MTech');
  }
  function normalizeBranch(b) {
    return normalize(b).replace(/\s*\(([^)]+)\)\s*/, ' ($1)');
  }

  // ✅ DB CHECK in your CSV table
  async function contextExists({ program, branch, year, sem_roman }) {
    const { count, error: qErr } = await supabase
      .from('lms_subject_folders')
      .select('*', { head: true, count: 'exact' })
      .eq('program', program)
      .eq('branch', branch)
      .eq('year', year)
      .eq('sem_roman', sem_roman);

    if (qErr) throw qErr;
    return (count || 0) > 0;
  }

  async function onOpen() {
    setError('');

    if (!(regNo && program && branch && year && semester)) {
      setError('Please select Year and Semester.');
      return;
    }

    // Validate allowed dropdown values
    if (!yearOptions.includes(year) || !semesterOptions.includes(semester)) {
      setError('Wrong details. Please select correct Year and Semester.');
      return;
    }

    try {
      setChecking(true);

      const p = normalizeProgram(program);
      const b = normalizeBranch(branch);
      const y = parseInt(year, 10);
      const s = normalize(semester).toUpperCase();

      // Relaxed check: Allow checking attendance even if LMS folders don't exist
      // const ok = await contextExists({ program: p, branch: b, year: y, sem_roman: s });

      // if (!ok) {
      //   setError('Wrong details. Subjects not available for the selected Year/Semester.');
      //   return;
      // }

      // ✅ Navigate only when correct
      navigate('/attendance/register', {
        state: { regNo, program: p, branch: b, year: y, sem_roman: s }
      });
    } catch (e) {
      setError('Unable to verify details. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8faf5] items-center justify-center">
        <div className="text-lg text-gray-700">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf5]">
      <div className="flex-1">
        <div className="max-w-xl mx-auto">
          <div className="text-center mt-8 mb-8">
            <span className="text-3xl sm:text-4xl font-extrabold uppercase" style={{ color: '#111827', letterSpacing: '0.02em' }}>
              ATTENDANCE
            </span>{' '}
            <span className="text-3xl sm:text-4xl font-extrabold uppercase" style={{ color: BRAND.green, letterSpacing: '0.02em' }}>
              REGISTER
            </span>
            <div style={{ fontFamily: 'cursive', fontWeight: 400, fontSize: '0.95rem', color: '#475569', marginTop: 2 }}>
              Attendance Registration Portal
            </div>
          </div>

          <div className="mt-6 mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Reg No preview-only */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Reg No</label>
                <div className="text-base font-semibold text-gray-900 border rounded-xl px-3 py-2 bg-gray-50">
                  {regNo || '—'}
                </div>
              </div>

              {/* Program preview-only */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Program</label>
                <div className="text-base font-semibold text-gray-900 border rounded-xl px-3 py-2 bg-gray-50">
                  {program || '—'}
                </div>
              </div>

              {/* Year dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Year</label>
                <select
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    setSemester('');
                  }}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  disabled={!program}
                >
                  <option value="" disabled>
                    {program ? 'Select year' : 'Select program first'}
                  </option>
                  {yearOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester dropdown */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  disabled={!year}
                >
                  <option value="" disabled>
                    {year ? 'Select semester' : 'Select year first'}
                  </option>
                  {semesterOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Open button (same UI) */}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="px-4 py-1 rounded-md font-semibold text-white transition-colors"
                style={{
                  backgroundColor: semester ? BRAND.greenDark : BRAND.green,
                  minWidth: '72px',
                  fontSize: '0.95rem',
                  cursor: semester ? 'pointer' : 'not-allowed',
                  opacity: semester ? 1 : 0.85
                }}
                disabled={!(regNo && program && branch && year && semester) || checking}
                onClick={onOpen}
              >
                Open
              </button>
            </div>

            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </div>
        </div>
      </div>

    </div>
  );
}
