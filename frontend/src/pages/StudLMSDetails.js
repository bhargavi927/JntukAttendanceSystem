import React from 'react';
import { useNavigate } from 'react-router-dom';
import StudentFooter from '../components/StudentFooter';
import { fetchStudentProfile } from '../utils/fetchStudentProfile';
import { supabase } from '../supabase.js';

const SEM_OPTIONS = ['I', 'II'];

export default function StudLMSDetails() {
  const navigate = useNavigate();

  const BRAND = {
    green: '#0F9D78',
    greenDark: '#0B7A5E'
  };

  const [regNo, setRegNo] = React.useState('');
  const [program, setProgram] = React.useState('');
  const [branch, setBranch] = React.useState(''); // ✅ needed for DB validation

  const [selectedYear, setSelectedYear] = React.useState('');
  const [selectedSemRoman, setSelectedSemRoman] = React.useState('');

  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [checking, setChecking] = React.useState(false);
  const [error, setError] = React.useState('');

  const YEAR_OPTIONS = React.useMemo(() => {
    if (/mtech/i.test(program)) return ['1', '2'];
    if (/btech|b\.tech/i.test(program)) return ['1', '2', '3', '4'];
    return [];
  }, [program]);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        setLoadingProfile(true);

        const profile = await fetchStudentProfile();
        if (cancelled) return;

        const r = profile?.reg_no || profile?.regNo || '';
        const rawProgram = profile?.program || '';
        let p = rawProgram;
        if (rawProgram) {
          const clean = rawProgram.replace(/[^a-zA-Z]/g, '').toLowerCase();
          if (clean === 'btech') p = 'Btech';
          else if (clean === 'mtech') p = 'MTech';
        }

        const b = profile?.branch || '';

        setRegNo(r);
        setProgram(p);
        setBranch(b);

        setSelectedYear('');
        setSelectedSemRoman('');
        setError('');
      } catch (err) {
        if (!cancelled) setError('Failed to fetch profile');
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    }

    fetchProfile();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    setSelectedSemRoman('');
  }, [selectedYear]);

  // ✅ Normalize same way as your backend does
  function normalize(str) {
    return (str || '').replace(/\s+/g, ' ').trim();
  }
  function normalizeProgram(p) {
    return normalize(p).replace(/^btech$/i, 'BTech').replace(/^mtech$/i, 'MTech');
  }
  function normalizeBranch(b) {
    return normalize(b).replace(/\s*\(([^)]+)\)\s*/, ' ($1)');
  }

  // ✅ REAL DB CHECK: lms_subject_folders (program+branch+year+sem_roman)
  async function contextExists({ program, branch, year, sem_roman }) {
    const { count, error: qErr } = await supabase
      .from('lms_subject_folders')
      .select('*', { head: true, count: 'exact' })
      .eq('program', program)
      .eq('branch', branch)
      .eq('year', year) // integer
      .eq('sem_roman', sem_roman);

    if (qErr) throw qErr;
    return (count || 0) > 0;
  }

  async function onOpen() {
    setError('');

    // Basic checks (button already disables, but keep safe)
    if (!(regNo && program && branch && selectedYear && selectedSemRoman)) {
      setError('Please select Year and Semester.');
      return;
    }

    // Validate dropdown values only (format)
    if (!YEAR_OPTIONS.includes(selectedYear) || !SEM_OPTIONS.includes(selectedSemRoman)) {
      setError('Wrong details. Please select correct Year and Semester.');
      return;
    }

    // ✅ Validate against DB
    try {
      setChecking(true);

      const p = normalizeProgram(program);
      const b = normalizeBranch(branch);
      const y = parseInt(selectedYear, 10);
      const s = normalize(selectedSemRoman).toUpperCase();

      if (!y || Number.isNaN(y)) {
        setError('Wrong details. Year is invalid.');
        return;
      }

      // Relaxed check: Allow entry even if folders are missing
      // const ok = await contextExists({ program: p, branch: b, year: y, sem_roman: s });

      // if (!ok) {
      //   setError('Wrong details. Subjects not available for the selected Year/Semester.');
      //   return; 
      // }

      // ✅ only open /studlmsfiles
      navigate('/studlmsfiles', {
        state: { regNo, program: p, branch: b, year: y, sem_roman: s }
      });
    } catch (e) {
      setError('Unable to verify subjects. Please try again.');
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
              LMS
            </span>{' '}
            <span className="text-3xl sm:text-4xl font-extrabold uppercase" style={{ color: BRAND.green, letterSpacing: '0.02em' }}>
              PORTAL
            </span>
            <div style={{ fontFamily: 'cursive', fontWeight: 400, fontSize: '0.95rem', color: '#475569', marginTop: 2 }}>
              Learning Management System
            </div>
          </div>

          <div className="mt-6 mb-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Reg No</label>
                <div className="text-base font-semibold text-gray-900 border rounded-xl px-3 py-2 bg-gray-50">
                  {regNo || '—'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Program</label>
                <div className="text-base font-semibold text-gray-900 border rounded-xl px-3 py-2 bg-gray-50">
                  {program || '—'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  disabled={!program}
                >
                  <option value="" disabled>
                    {program ? 'Select year' : 'Select program first'}
                  </option>
                  {YEAR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Semester</label>
                <select
                  value={selectedSemRoman}
                  onChange={(e) => setSelectedSemRoman(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  disabled={!selectedYear}
                >
                  <option value="" disabled>
                    {selectedYear ? 'Select semester' : 'Select year first'}
                  </option>
                  {SEM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="px-4 py-1 rounded-md font-semibold text-white transition-colors"
                style={{
                  backgroundColor: selectedSemRoman ? BRAND.greenDark : BRAND.green,
                  minWidth: '72px',
                  fontSize: '0.95rem',
                  cursor: selectedSemRoman ? 'pointer' : 'not-allowed',
                  opacity: selectedSemRoman ? 1 : 0.85
                }}
                disabled={!(regNo && program && branch && selectedYear && selectedSemRoman) || checking}
                onClick={onOpen}
              >
                Open
              </button>
            </div>

            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </div>
        </div>
      </div>

      <div style={{ height: '48px' }} />
    </div>
  );
}
