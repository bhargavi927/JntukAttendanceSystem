import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { BACKEND_URL } from '../config';

const API_BASE = BACKEND_URL;

const BRAND_GREEN = '#0F9D78';
const BRAND_GREEN_DARK = '#0B7A5E';

export default function UploadAttendence() {
  const auth = getAuth();
  const [regNo, setRegNo] = useState('');
  const [program, setProgram] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedClassKey, setSelectedClassKey] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [isTimetableOpen, setIsTimetableOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [permissionState, setPermissionState] = useState({
    checking: false,
    allowed: false,
    message: '',
    professorId: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const cameraInputRef = useRef(null);

  const days = useMemo(
    () => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    []
  );

  // Fetch Profile
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const resp = await fetch(`${API_BASE}/api/student-profile/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const profile = data?.profile;

        setRegNo(profile?.reg_no || '');

        if (profile?.program) {
          let p = profile.program.replace(/[^a-zA-Z]/g, '').toLowerCase();
          if (p === 'btech') setProgram('Btech');
          else if (p === 'mtech') setProgram('MTech');
          else setProgram(profile.program);
        }
        if (profile?.year) setYear(String(profile.year));
        if (profile?.sem_roman) setSemester(profile.sem_roman);

        setStudentProfile(profile);

        let subjects = profile?.subjects || [];
        if (typeof subjects === 'string') {
          try { subjects = JSON.parse(subjects); } catch { subjects = subjects.split(',').map((s) => s.trim()).filter(Boolean); }
        }
        if (!Array.isArray(subjects)) subjects = [];
        setStudentSubjects(subjects);
      } catch (err) {
        console.error("Failed to fetch student profile:", err);
      }
    });
    return () => unsub();
  }, [auth]);

  const yearOptions = useMemo(() => {
    if (program === 'MTech') return ['1', '2'];
    if (program === 'Btech') return ['1', '2', '3', '4'];
    return [];
  }, [program]);

  const semesterOptions = ['I', 'II'];

  // Fetch timetable
  useEffect(() => {
    let cancelled = false;
    const fetchTimetable = async () => {
      if (!selectedDay || !program || !year || !semester || !studentProfile || !studentProfile.branch) {
        setTimetable([]);
        return;
      }

      try {
        const user = auth.currentUser;
        if (!user) return;

        setLoadingTimetable(true);
        const token = await user.getIdToken();

        const params = new URLSearchParams({
          program: program,
          branch: studentProfile.branch,
          year: String(year),
          sem_roman: semester,
          day: selectedDay
        });

        const resp = await fetch(`${API_BASE}/api/timetable?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!resp.ok) { setLoadingTimetable(false); return; }
        const data = await resp.json();
        if (cancelled) return;

        setTimetable(data?.timetable || []);
        setLoadingTimetable(false);
      } catch (err) {
        if (!cancelled) { setLoadingTimetable(false); setTimetable([]); }
      }
    };

    fetchTimetable();
    return () => { cancelled = true; };
  }, [auth, selectedDay, program, year, semester, studentProfile]);

  const classes =
    selectedDay && selectedDay !== 'Saturday'
      ? timetable.map((entry) => ({
        name: entry.subject,
        time: `${entry.start_time.slice(0, 5)} - ${entry.end_time.slice(0, 5)}`,
        professor: entry.professor_name || '-',
        room: entry.room || '-',
        active: true
      }))
      : [];

  const isHoliday = selectedDay === 'Saturday';
  const showUploadBox = !isHoliday && Boolean(selectedClassKey);
  const isReadyForClasses = regNo.trim().length > 0 && selectedDay && program && year && semester && studentProfile && studentProfile.branch;
  const canOpenTimetable = isReadyForClasses;

  // Location
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (showUploadBox) {
      setLocationError(null);
      if (!navigator.geolocation) {
        setLocationError('Geolocation not supported.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => { console.error('Loc Error:', err); setLocationError('Access denied.'); },
        { enableHighAccuracy: true }
      );
    } else {
      setLocation(null);
      setLocationError(null);
    }
  }, [showUploadBox]);


  const handleSubmitAttendance = async () => {
    if (!permissionState.allowed || !cameraInputRef.current?.files?.[0]) return;
    if (!location && !locationError) { alert('Establishing location... please wait.'); return; }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) { alert('Please sign in'); setSubmitting(false); return; }
      if (!permissionState.professorId) { alert('Permission inactive.'); setSubmitting(false); return; }

      const token = await user.getIdToken();
      const file = cameraInputRef.current.files[0];
      const now = new Date();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject', selectedClassName);
      formData.append('date', now.toISOString().slice(0, 10));
      formData.append('time', now.toTimeString().slice(0, 5));
      formData.append('professor_id', permissionState.professorId || '');
      formData.append('student_reg_no', regNo || '');
      formData.append('program', program || '');
      formData.append('branch', studentProfile?.branch || '');
      formData.append('year', year || '');
      formData.append('sem_roman', semester || '');

      if (location) {
        formData.append('latitude', location.lat);
        formData.append('longitude', location.lng);
      }

      const resp = await fetch(`${API_BASE}/api/attendance-submissions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      if (!resp.ok) {
        const error = await resp.json().catch(() => ({}));
        alert(`Failed: ${error?.error || 'Unknown error'}`);
        setSubmitting(false);
        return;
      }

      alert('Attendance submitted successfully!');

      setRegNo(''); setProgram(''); setYear(''); setSemester(''); setSelectedDay('');
      setSelectedClassKey(''); setSelectedClassName(''); setIsTimetableOpen(false);
      setUploadedFileName('');
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      setPermissionState({ checking: false, allowed: false, message: '', professorId: null });
      setSubmitting(false);

    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit');
      setSubmitting(false);
    }
  };

  // Permission Check
  useEffect(() => {
    let cancelled = false;
    const runValidation = async () => {
      if (!showUploadBox || !selectedClassName) {
        setPermissionState({ checking: false, allowed: false, message: '', professorId: null });
        return;
      }
      setPermissionState({ checking: true, allowed: false, message: '', professorId: null });
      try {
        const user = auth.currentUser;
        if (!user) { setPermissionState({ checking: false, allowed: false, message: 'Sign in required.', professorId: null }); return; }
        const token = await user.getIdToken();
        const now = new Date();
        const qs = new URLSearchParams({
          subject: selectedClassName,
          date: now.toISOString().slice(0, 10),
          time: now.toTimeString().slice(0, 5),
          program: program || '',
          branch: studentProfile?.branch || '',
          year: String(year || ''),
          sem_roman: semester || ''
        });
        const resp = await fetch(`${API_BASE}/api/attendance-permissions/validate?${qs.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await resp.json();
        if (cancelled) return;
        if (resp.ok && json?.allowed) {
          setPermissionState({ checking: false, allowed: true, message: '', professorId: json.permission?.professor_id || null });
        } else {
          setPermissionState({ checking: false, allowed: false, message: json?.reason || 'Inactive.', professorId: null });
        }
      } catch (err) {
        if (cancelled) return;
        setPermissionState({ checking: false, allowed: false, message: 'Inactive.', professorId: null });
      }
    };
    runValidation();
  }, [auth, showUploadBox, selectedClassName]);

  // Mobile Check
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));
  }, []);

  return (
    <>
      <div className="min-h-screen bg-[#f8faf5] px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5"><h2 className="text-xl font-bold text-gray-900">Choose Degree</h2></div>

            <div className="border border-gray-200 rounded-2xl p-4 bg-white mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Reg No</label>
                  <textarea rows={1} value={regNo} disabled className="w-full rounded-xl border border-gray-300 px-3 py-2 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Program</label>
                  <select value={program} onChange={e => { setProgram(e.target.value); setYear(''); setSemester(''); setIsTimetableOpen(false); setSelectedDay(''); setSelectedClassKey(''); }} className="w-full rounded-xl border px-3 py-2">
                    <option value="">Choose</option><option value="Btech">Btech</option><option value="MTech">MTech</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Year</label>
                    <select value={year} onChange={e => { setYear(e.target.value); setIsTimetableOpen(false); setSelectedDay(''); }} className="w-full rounded-xl border px-3 py-2" disabled={!program}>
                      {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Semester</label>
                    <select value={semester} onChange={e => { setSemester(e.target.value); setIsTimetableOpen(false); setSelectedDay(''); }} className="w-full rounded-xl border px-3 py-2" disabled={!program}>
                      {semesterOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Select Day</label>
              <div className="flex flex-wrap gap-2">
                {days.map(day => (
                  <button key={day} onClick={() => { setSelectedDay(day); setSelectedClassKey(''); setIsTimetableOpen(false); }} className={`px-4 py-2 rounded-full text-sm font-semibold ${selectedDay === day ? 'bg-[#0F9D78] text-white' : 'bg-gray-100 text-gray-700'}`}>{day}</button>
                ))}
              </div>
              <div className="mt-4">
                <button className="btn w-full h-12 rounded-xl font-semibold border border-[#0F9D78] text-[#0F9D78]" disabled={!canOpenTimetable} onClick={() => setIsTimetableOpen(true)}>Open Timetable</button>
              </div>
            </div>
          </div>

          {isReadyForClasses && isTimetableOpen && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-gray-900">Today’s Timetable</h2><span className="text-sm text-gray-600">{selectedDay}</span></div>

              {isHoliday ? (
                <div className="p-5 text-center text-gray-500">Holiday today!</div>
              ) : loadingTimetable ? (
                <div className="p-5 text-center text-gray-500">Loading timetable...</div>
              ) : classes.length === 0 ? (
                <div className="p-5 text-center text-gray-500">No classes found.</div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {classes.map(c => (
                    <button key={`${c.name}-${c.time}`} className={`w-full text-left border rounded-2xl p-4 ${selectedClassKey === `${c.name}-${c.time}` ? 'bg-emerald-50 border-emerald-200' : 'border-gray-100'}`} onClick={() => { setSelectedClassKey(`${c.name}-${c.time}`); setSelectedClassName(c.name); }}>
                      <h3 className="font-semibold text-gray-900">{c.name}</h3>
                      <p className="text-sm text-gray-600">{c.time}</p>
                    </button>
                  ))}
                </div>
              )}

              {showUploadBox && (
                <div className="mt-6 border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center">
                  <h3 className="text-lg font-bold text-gray-900">Upload Attendance</h3>
                  <p className="text-sm text-gray-600">{selectedClassName}</p>

                  {!isMobile && <div className="mt-3 text-red-600 text-sm">Mobile Required (or simulated)</div>}

                  <div className="mt-4">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center"><i className="bi bi-camera text-2xl text-gray-600"></i></div>

                    {uploadedFileName && <p className="mt-2 text-sm font-semibold">{uploadedFileName}</p>}

                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setUploadedFileName(file ? file.name : '');
                      }}
                    />

                    <div className="mt-6 flex gap-3 justify-center">
                      <button className="btn bg-[#0F9D78] text-white rounded-xl px-4 py-2" disabled={!permissionState.allowed} onClick={() => cameraInputRef.current?.click()}>
                        <i className="bi bi-camera-fill me-2"></i> Take Photo
                      </button>
                    </div>
                    <div className="mt-6">
                      <button className="btn w-full h-12 bg-[#0F9D78] text-white rounded-xl font-semibold" disabled={!permissionState.allowed || submitting} onClick={handleSubmitAttendance}>
                        {submitting ? 'Submitting...' : 'Submit Attendance'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
