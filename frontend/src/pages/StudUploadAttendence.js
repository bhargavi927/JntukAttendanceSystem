import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import StudentFooter from '../components/StudentFooter';
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

  // Fetch only regNo from backend, use Firebase auth listener for refresh-safe fetch
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

        // Auto-fill details from profile
        if (profile?.program) {
          let p = profile.program.replace(/[^a-zA-Z]/g, '').toLowerCase(); // btech, mtech
          if (p === 'btech') setProgram('Btech');
          else if (p === 'mtech') setProgram('MTech');
          else setProgram(profile.program);
        }
        if (profile?.year) setYear(String(profile.year));
        if (profile?.sem_roman) setSemester(profile.sem_roman);

        setStudentProfile(profile);

        let subjects = profile?.subjects || [];
        if (typeof subjects === 'string') {
          try {
            subjects = JSON.parse(subjects);
          } catch {
            subjects = subjects
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          }
        }
        if (!Array.isArray(subjects)) subjects = [];
        setStudentSubjects(subjects);
      } catch (err) {
        console.error("Failed to fetch student profile in UploadAttendance:", err);
      }
    });
    return () => unsub();
  }, [auth]);

  const yearOptions = useMemo(() => {
    if (program === 'MTech') return ['1', '2'];
    if (program === 'Btech') return ['1', '2', '3', '4'];
    return [];
  }, [program]);

  const SEM_OPTIONS = ['I', 'II'];
  const semesterOptions = SEM_OPTIONS;

  // Fetch timetable when day is selected
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

        if (!resp.ok) {
          setLoadingTimetable(false);
          return;
        }

        const data = await resp.json();
        if (cancelled) return;

        // Use backend results directly (filtered by branch/year/sem/day already)
        const entries = data?.timetable || [];
        setTimetable(entries);
        setLoadingTimetable(false);
      } catch (err) {
        if (!cancelled) {
          setLoadingTimetable(false);
          setTimetable([]);
        }
      }
    };

    fetchTimetable();
    return () => {
      cancelled = true;
    };
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

  const isReadyForClasses =
    regNo.trim().length > 0 &&
    Boolean(selectedDay) &&
    program &&
    year &&
    semester &&
    studentProfile &&
    studentProfile.branch;

  const canOpenTimetable = isReadyForClasses;

  // Location state
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // When upload box is shown, start fetching location
  useEffect(() => {
    if (showUploadBox) {
      setLocationError(null);
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error fetching location:', error);
          setLocationError('Unable to retrieve location. Please allow location access.');
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLocation(null);
      setLocationError(null);
    }
  }, [showUploadBox]);

  const handleSubmitAttendance = async () => {
    // Hard stop logic removed as mobile check is now full-page


    if (!permissionState.allowed || !cameraInputRef.current?.files?.[0]) {
      return;
    }

    if (!location && !locationError) {
      alert('Establishing location... please wait a moment.');
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('Please sign in to submit attendance');
        setSubmitting(false);
        return;
      }

      if (!permissionState.professorId) {
        alert('Permission is not active for this class.');
        setSubmitting(false);
        return;
      }

      const token = await user.getIdToken();
      const file = cameraInputRef.current.files[0];
      const now = new Date();
      const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const time = now.toTimeString().slice(0, 5); // HH:MM

      const formData = new FormData();
      formData.append('file', file);
      formData.append('subject', selectedClassName);
      formData.append('date', date);
      formData.append('time', time);
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
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (!resp.ok) {
        let errorMsg = 'Unknown error';
        try {
          const error = await resp.json();
          errorMsg = error?.error || errorMsg;
        } catch {
          // ignore
        }
        alert(`Failed to submit attendance: ${errorMsg}`);
        setSubmitting(false);
        return;
      }

      alert('Attendance submitted successfully!');
      setRegNo('');
      setProgram('');
      setYear('');
      setSemester('');
      setSelectedDay('');
      setSelectedClassKey('');
      setSelectedClassName('');
      setIsTimetableOpen(false);
      setUploadedFileName('');
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      setPermissionState({ checking: false, allowed: false, message: '', professorId: null });
      setSubmitting(false);
    } catch (err) {
      console.error('Submit attendance error:', err);
      alert('Failed to submit attendance');
      setSubmitting(false);
    }
  };

  // When a class is selected, validate if upload is allowed for the current date/time
  useEffect(() => {
    let cancelled = false;

    const runValidation = async () => {
      if (!showUploadBox || !selectedClassName) {
        setPermissionState({ checking: false, allowed: false, message: '', professorId: null });
        return;
      }

      // If on desktop/laptop, we still can check permission, but user can't upload anyway.
      setPermissionState({ checking: true, allowed: false, message: '', professorId: null });

      try {
        const user = auth.currentUser;
        if (!user) {
          setPermissionState({
            checking: false,
            allowed: false,
            message: 'Please sign in to submit attendance.',
            professorId: null
          });
          return;
        }

        const token = await user.getIdToken();
        const now = new Date();
        const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
        const time = now.toTimeString().slice(0, 5); // HH:MM
        const qs = new URLSearchParams({
          subject: selectedClassName,
          date,
          time,
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
          setPermissionState({
            checking: false,
            allowed: true,
            message: '',
            professorId: json.permission?.professor_id || null
          });
        } else {
          setPermissionState({
            checking: false,
            allowed: false,
            message: json?.reason || 'Attendance permission is not active for this class.',
            professorId: null
          });
        }
      } catch (err) {
        if (cancelled) return;
        setPermissionState({
          checking: false,
          allowed: false,
          message: 'Attendance permission is not active for this class.',
          professorId: null
        });
      }
    };

    runValidation();
  }, [auth, showUploadBox, selectedClassName]);

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    // Check if it matches mobile regex
    const isMobileDevice = mobileRegex.test(userAgent);
    setIsMobile(isMobileDevice);
  }, []);

  // Full page blocker removed. Mobile check now happens in the Upload Box.

  return (
    <>
      <div className="min-h-screen bg-[#f8faf5] px-4 sm:px-6 py-10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">Choose Degree</h2>
            </div>

            {/* Details box */}
            <div className="border border-gray-200 rounded-2xl p-4 bg-white mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Reg No</label>
                  <textarea
                    rows={1}
                    value={regNo}
                    disabled
                    placeholder="Reg No"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Program</label>
                  <select
                    value={program}
                    onChange={(e) => {
                      const nextProgram = e.target.value;
                      setProgram(nextProgram);
                      setYear('');
                      setSemester('');
                      setIsTimetableOpen(false);
                      setSelectedDay('');
                      setSelectedClassKey('');
                      setSelectedClassName('');
                      setUploadedFileName('');
                    }}
                    disabled={!!studentProfile?.program}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="" disabled>
                      Choose
                    </option>
                    <option value="Btech">Btech</option>
                    <option value="MTech">MTech</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Year</label>
                    <select
                      value={year}
                      onChange={(e) => {
                        setYear(e.target.value);
                        setIsTimetableOpen(false);
                        setSelectedDay('');
                        setSelectedClassKey('');
                        setSelectedClassName('');
                        setUploadedFileName('');
                      }}
                      disabled={!program || !!studentProfile?.year}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        {program ? 'Choose' : 'Select Program first'}
                      </option>
                      {yearOptions.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => {
                        setSemester(e.target.value);
                        setIsTimetableOpen(false);
                        setSelectedDay('');
                        setSelectedClassKey('');
                        setSelectedClassName('');
                        setUploadedFileName('');
                      }}
                      disabled={!program || !!studentProfile?.sem_roman}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>
                        {program ? 'Choose' : 'Select Program first'}
                      </option>
                      {semesterOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Select</label>
              <div className="flex flex-wrap gap-2">
                {days.map((day) => {
                  const selected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      className={
                        selected
                          ? 'px-4 py-2 rounded-full text-sm font-semibold text-white'
                          : 'px-4 py-2 rounded-full text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                      style={selected ? { backgroundColor: BRAND_GREEN } : undefined}
                      onClick={() => {
                        setSelectedDay(day);
                        setSelectedClassKey('');
                        setSelectedClassName('');
                        setIsTimetableOpen(false);
                        setUploadedFileName('');
                      }}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  className="btn w-full h-12 rounded-xl font-semibold transition-colors"
                  style={{ backgroundColor: 'white', borderColor: BRAND_GREEN, color: BRAND_GREEN }}
                  disabled={!canOpenTimetable}
                  onMouseEnter={(e) => {
                    if (e.currentTarget.disabled) return;
                    e.currentTarget.style.backgroundColor = BRAND_GREEN;
                    e.currentTarget.style.color = 'white';
                    e.currentTarget.style.borderColor = BRAND_GREEN;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = BRAND_GREEN;
                    e.currentTarget.style.borderColor = BRAND_GREEN;
                  }}
                  onClick={() => {
                    if (!canOpenTimetable) return;
                    setIsTimetableOpen(true);
                  }}
                >
                  Open
                </button>
              </div>
            </div>
          </div>

          {/* Right: Today's classes (only after all details are filled) */}
          {isReadyForClasses && isTimetableOpen ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-900">Today’s Timetable</h2>
                <span className="text-sm text-gray-600">{selectedDay}</span>
              </div>

              {isHoliday ? (
                <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600">
                      <i className="bi bi-moon-stars" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">Holiday</div>
                      <div className="text-sm text-gray-600">Saturday is a holiday.</div>
                    </div>
                  </div>
                </div>
              ) : loadingTimetable ? (
                <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600">
                      <i className="bi bi-hourglass-split" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">Loading...</div>
                      <div className="text-sm text-gray-600">Fetching your timetable.</div>
                    </div>
                  </div>
                </div>
              ) : classes.length === 0 ? (
                <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600">
                      <i className="bi bi-info-circle" aria-hidden="true" />
                    </span>
                    <div>
                      <div className="font-semibold text-gray-900">No Classes Found</div>
                      <div className="text-sm text-gray-600">
                        No timetable entries for your profile. Update your profile with program/branch/year/semester.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                  {classes.map((c) => (
                    <button
                      key={`${c.name}-${c.time}`}
                      type="button"
                      className={
                        selectedClassKey === `${c.name}-${c.time}`
                          ? 'w-full text-left border rounded-2xl p-4 transition-colors bg-emerald-50 border-emerald-200'
                          : 'w-full text-left border border-gray-100 rounded-2xl p-4 hover:bg-gray-50 transition-colors'
                      }
                      onClick={() => {
                        setSelectedClassKey(`${c.name}-${c.time}`);
                        setSelectedClassName(c.name);
                        setUploadedFileName('');
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                            {c.active ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                Active
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{c.time}</p>
                          <p className="text-sm text-gray-600">{c.professor}</p>
                        </div>

                        <div className="flex items-center gap-2 text-gray-500">
                          <i className="bi bi-chevron-right" aria-hidden="true" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Upload photo box (below Today's Classes) */}
              {showUploadBox ? (
                <div className="mt-6 border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center">
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-gray-900">Upload Attendance</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Submit today’s {selectedClassName || 'class'} attendance
                    </p>

                    {/* Mobile Restriction Warning (Inline) */}
                    {!isMobile && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                        <i className="bi bi-phone text-red-500 text-xl"></i>
                        <div>
                          <div className="font-bold text-red-700 text-sm">Mobile Device Required</div>
                          <div className="text-xs text-red-600 mt-1">Attendance upload is allowed only from mobile devices.</div>
                        </div>
                      </div>
                    )}

                    {permissionState.message ? (
                      <p className="mt-2 text-sm text-red-600">{permissionState.message}</p>
                    ) : null}
                    {permissionState.checking ? (
                      <p className="mt-2 text-sm text-gray-600">Checking permission…</p>
                    ) : null}

                    {locationError && (
                      <p className="mt-2 text-sm text-amber-600">
                        <i className="bi bi-geo-alt-fill"></i> Location access needed: {locationError}
                      </p>
                    )}
                    {location && !locationError && (
                      <p className="mt-2 text-xs text-emerald-600">
                        <i className="bi bi-geo-alt-fill"></i> Location acquired
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                      <i className="bi bi-camera text-2xl text-gray-600" aria-hidden="true" />
                    </div>
                    <p className="mt-4 text-gray-900 font-semibold">Take a photo or upload from gallery</p>
                    <p className="mt-1 text-sm text-gray-600">Supported: JPG, PNG</p>

                    {uploadedFileName ? (
                      <p className="mt-2 text-sm text-gray-700">
                        Selected: <span className="font-semibold">{uploadedFileName}</span>
                      </p>
                    ) : null}

                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={!isMobile}
                      className="absolute opacity-0 w-px h-px overflow-hidden"
                      style={{ left: '-9999px' }}
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0];
                        setUploadedFileName(file ? file.name : '');
                      }}
                    />

                    <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        type="button"
                        className={`btn text-white rounded-xl px-4 py-2 w-full sm:w-auto ${!isMobile ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: !isMobile ? '#9ca3af' : BRAND_GREEN, borderColor: !isMobile ? '#9ca3af' : BRAND_GREEN }}
                        disabled={!permissionState.allowed || !isMobile}
                        onClick={() => {
                          if (permissionState.allowed && isMobile) cameraInputRef.current?.click();
                        }}
                      >
                        <i className="bi bi-camera-fill me-2" aria-hidden="true" />
                        Take Photo
                      </button>
                    </div>

                    <div className="mt-6">
                      <button
                        type="button"
                        className={`btn w-full h-12 text-white rounded-xl font-semibold transition-colors ${!isMobile ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ backgroundColor: !isMobile ? '#9ca3af' : BRAND_GREEN, borderColor: !isMobile ? '#9ca3af' : BRAND_GREEN }}
                        disabled={!permissionState.allowed || submitting || !isMobile}
                        onMouseEnter={(e) => {
                          if (permissionState.allowed && !submitting && isMobile) {
                            e.currentTarget.style.backgroundColor = BRAND_GREEN_DARK;
                            e.currentTarget.style.borderColor = BRAND_GREEN_DARK;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (isMobile) {
                            e.currentTarget.style.backgroundColor = BRAND_GREEN;
                            e.currentTarget.style.borderColor = BRAND_GREEN;
                          }
                        }}
                        onClick={() => {
                          if (isMobile) handleSubmitAttendance();
                        }}
                      >
                        {submitting ? 'Submitting...' : 'Submit Attendance'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
