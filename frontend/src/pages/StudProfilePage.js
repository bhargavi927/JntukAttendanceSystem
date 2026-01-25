import React from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { auth, upsertUserProfile } from '../firebase';
import { useLocation } from 'react-router-dom';
import StudentFooter from '../components/StudentFooter';
import { BACKEND_URL } from '../config';


const BRAND = {
  primary: '#0F9D78',
  primaryDark: '#0B7A5E',
  heading: '#0F172A',
  body: '#475569',
  border: '#E5E7EB'
};

const API_BASE = BACKEND_URL;

export default function StudProfilePage() {
  const { user, refreshProfile } = React.useContext(AuthContext);
  const location = useLocation();

  // Initialize error from navigation state if present
  const [navError, setNavError] = React.useState(location.state?.message || '');

  // Clear location state
  React.useEffect(() => {
    if (location.state?.message) {
      window.history.replaceState({}, document.title);
      // Auto-open verify modal if redirected due to lack of verification
      if (location.state.message.toLowerCase().includes('verify')) {
        setIsVerifyModalOpen(true);
      }
    }
  }, [location]);

  const withTimeout = React.useCallback((promise, ms, message) => {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
    ]);
  }, []);

  const [pageMode, setPageMode] = React.useState('edit'); // 'edit' | 'view'
  const [savedProfile, setSavedProfile] = React.useState(null);

  const photoInputRef = React.useRef(null);
  const [photoFile, setPhotoFile] = React.useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState('');

  const [isVerifyModalOpen, setIsVerifyModalOpen] = React.useState(false);
  const [verifyCode, setVerifyCode] = React.useState('');
  const [photoError, setPhotoError] = React.useState('');
  const [photoStatus, setPhotoStatus] = React.useState('');

  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState('');
  const [saveError, setSaveError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [existingCreatedAt, setExistingCreatedAt] = React.useState(null);

  const [studentInfo, setStudentInfo] = React.useState({
    firstName: '',
    secondName: '',
    phoneNumber: '',
    regNo: '',
    program: '',
    branch: '',
    yearFrom: '',
    yearTo: '',
    year: '',
    semRoman: '',
    subjects: []
  });

  // Limit semester options to only I and II for all programs
  // Limit semester options to only I and II for all programs
  const yearOptions = React.useMemo(() => {
    const p = (studentInfo.program || '').replace('.', '');
    return p === 'MTech' ? ['1', '2'] : ['1', '2', '3', '4'];
  }, [studentInfo.program]);

  const semesterOptions = React.useMemo(() => ['I', 'II'], []);

  // Reset invalid year/semester when program changes
  React.useEffect(() => {
    setStudentInfo((prev) => {
      let changed = false;
      const next = { ...prev };

      if (prev.year && !yearOptions.includes(String(prev.year))) {
        next.year = '';
        changed = true;
      }
      if (prev.semRoman && !semesterOptions.includes(String(prev.semRoman))) {
        next.semRoman = '';
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [yearOptions, semesterOptions]);

  // Auto-fetch subjects from Backend when Program/Branch/Year/Sem changes
  React.useEffect(() => {
    let cancelled = false;
    const fetchSubjects = async () => {
      const { program, branch, year, semRoman } = studentInfo;
      if (!program || !branch || !year || !semRoman) {
        if (!cancelled) setStudentInfo(prev => ({ ...prev, subjects: [] }));
        return;
      }

      console.log('[StudProfilePage] Fetching subjects for:', { program, branch, year, semRoman });

      try {
        const token = user ? await user.getIdToken() : null;
        if (!token) return;

        // Build query string
        const params = new URLSearchParams({
          program: program,
          branch: branch,
          year: String(year),
          sem_roman: semRoman
        });

        const res = await fetch(`${API_BASE}/api/lms/subjects?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch subjects');
        }

        const data = await res.json();
        console.log('[StudProfilePage] Fetched subjects:', data);

        if (!cancelled && data.subjects) {
          setStudentInfo(prev => ({ ...prev, subjects: data.subjects }));
        }
      } catch (err) {
        console.error('Error auto-fetching subjects from backend:', err);
      }
    };

    const timeout = setTimeout(fetchSubjects, 500); // Debounce
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [studentInfo.program, studentInfo.branch, studentInfo.year, studentInfo.semRoman, user]);

  const [personalInfo, setPersonalInfo] = React.useState({
    fatherName: '',
    fatherPhoneNumber: '',
    motherName: '',
    motherPhoneNumber: '',
    aadhaarNumber: '',
    bloodGroup: '',
    address: ''
  });

  const mapProfileFromApi = (p) => {
    if (!p) return null;
    let subjects = p.subjects || [];
    if (typeof subjects === 'string') {
      try {
        subjects = JSON.parse(subjects);
      } catch {
        subjects = subjects.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (!Array.isArray(subjects)) subjects = [];
    return {
      firstName: p.first_name || '',
      secondName: p.second_name || '',
      phoneNumber: p.phone_number || '',
      regNo: p.reg_no || '',
      program: p.program || '',
      branch: p.branch || '',
      yearFrom: p.year_from || '',
      yearTo: p.year_to || '',
      year: p.year ? String(p.year) : '',
      semRoman: p.sem_roman || '',
      subjects: subjects,
      fatherName: p.father_name || '',
      fatherPhoneNumber: p.father_phone_number || '',
      motherName: p.mother_name || '',
      motherPhoneNumber: p.mother_phone_number || '',
      aadhaarNumber: p.aadhaar_number || '',
      bloodGroup: p.blood_group || '',
      address: p.address || '',
      photoURL: p.photo_url || '',
      photoBucket: p.photo_bucket || '',
      photoObjectPath: p.photo_object_path || '',
      role: p.role || 'student',
      email: p.email || '',
      verificationStatus: p.verification_status || 'Not Verified',
      createdAt: p.created_at || null,
      updatedAt: p.updated_at || null
    };
  };

  const fetchProfileFromApi = React.useCallback(async () => {
    const token = await user.getIdToken();
    const res = await withTimeout(
      fetch(`${API_BASE}/api/student-profile/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }),
      15000,
      'Fetching profile timed out. Please try again.'
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[StudProfilePage] Backend error:', res.status, errorText);
      throw new Error(`Backend returned ${res.status}: ${errorText}`);
    }
    const body = await res.json();
    return mapProfileFromApi(body?.profile || null);
  }, [user, withTimeout]);

  const uploadPhotoToApi = React.useCallback(async (file) => {
    const token = await user.getIdToken();
    const form = new FormData();
    form.append('file', file);

    const res = await withTimeout(
      fetch(`${API_BASE}/api/student-profile/upload-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      }),
      30000,
      'Profile image upload timed out. Please try again.'
    );

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Failed to upload image');
    }
    const body = await res.json();
    return body;
  }, [user, withTimeout]);

  const upsertProfileToApi = React.useCallback(async (payload) => {
    const token = await user.getIdToken();
    const res = await withTimeout(
      fetch(`${API_BASE}/api/student-profile/upsert`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }),
      15000,
      'Save to backend timed out. Please try again.'
    );

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Failed to save profile');
    }
    const body = await res.json();
    return mapProfileFromApi(body?.profile || null);
  }, [user, withTimeout]);



  React.useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user) return;
      try {
        const p = await fetchProfileFromApi();
        if (cancelled || !p) return;

        setStudentInfo((prev) => ({
          ...prev,
          firstName: p.firstName,
          secondName: p.secondName,
          phoneNumber: p.phoneNumber,
          regNo: p.regNo || p.reg_no || '',
          degree: p.degree,
          discipline: p.discipline,
          yearFrom: p.yearFrom ? String(p.yearFrom) : '',
          yearTo: p.yearTo ? String(p.yearTo) : '',
          program: p.program || '',
          branch: p.branch || '',
          year: p.year ? String(p.year) : '',
          semRoman: p.semRoman || '',
          subjects: Array.isArray(p.subjects) ? p.subjects : []
        }));

        setPersonalInfo((prev) => ({
          ...prev,
          fatherName: p.fatherName,
          fatherPhoneNumber: p.fatherPhoneNumber,
          motherName: p.motherName,
          motherPhoneNumber: p.motherPhoneNumber,
          aadhaarNumber: p.aadhaarNumber,
          bloodGroup: p.bloodGroup,
          address: p.address
        }));

        if (p.photoURL) {
          setPhotoPreviewUrl(p.photoURL);
        }

        // Self-Healing: Sync verification status from Supabase to Firestore
        const isBackendVerified = p.verificationStatus === 'Verified' || p.verification_status === 'Verified';

        if (isBackendVerified) {
          upsertUserProfile(user.uid, {
            verificationStatus: 'Verified',
            verification_status: 'Verified',
            isVerified: true,
            verified: true
          }).then(() => {
            if (refreshProfile) refreshProfile();
          }).catch(err => console.error('Auto-sync verification failed:', err));
        }

        setExistingCreatedAt(p.createdAt || null);
        setSavedProfile(p);
        setPageMode('view');
      } catch (err) {
        console.error("StudProfilePage: Failed to load profile:", err);
        // Non-fatal; user can still fill and save
        setNavError(err.message); // Show error in UI
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user, fetchProfileFromApi]);

  const setField = (name) => (e) => {
    const value = e.target.value;
    if (name === 'phoneNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setStudentInfo((prev) => ({ ...prev, [name]: digitsOnly }));
      return;
    }
    setStudentInfo((prev) => ({ ...prev, [name]: value }));
  };

  const setPersonalField = (name) => (e) => {
    const value = e.target.value;
    if (name === 'fatherPhoneNumber' || name === 'motherPhoneNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setPersonalInfo((prev) => ({ ...prev, [name]: digitsOnly }));
      return;
    }
    if (name === 'aadhaarNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 12);
      setPersonalInfo((prev) => ({ ...prev, [name]: digitsOnly }));
      return;
    }
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
  };





  const onPickStudentPhoto = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setPhotoError('');
    setPhotoStatus('');

    const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
    const type = (file.type || '').toLowerCase();
    if (!allowedTypes.has(type)) {
      setPhotoError('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    const maxBytes = 2 * 1024 * 1024;
    if (typeof file.size === 'number' && file.size > maxBytes) {
      setPhotoError('Image too large. Max size is 2MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoStatus('Ready to upload');
  };

  const validate = () => {
    const errors = {};
    const required = (key, value, label) => {
      if (!String(value || '').trim()) errors[key] = `${label} is required`;
    };

    required('firstName', studentInfo.firstName, 'First Name');
    required('secondName', studentInfo.secondName, 'Second Name');
    required('phoneNumber', studentInfo.phoneNumber, 'Phone Number');
    if (studentInfo.phoneNumber && String(studentInfo.phoneNumber).length !== 10) {
      errors.phoneNumber = 'Phone Number must be 10 digits';
    }
    required('regNo', studentInfo.regNo, 'Reg No');
    required('program', studentInfo.program, 'Program');
    required('branch', studentInfo.branch, 'Branch');
    required('yearFrom', studentInfo.yearFrom, 'Year From');
    required('yearTo', studentInfo.yearTo, 'Year To');
    required('year', studentInfo.year, 'Current Year');
    required('semRoman', studentInfo.semRoman, 'Semester');

    const validYearOptions = studentInfo.program === 'MTech' ? ['1', '2'] : ['1', '2', '3', '4'];
    const validSemOptions = ['I', 'II'];
    if (studentInfo.year && !validYearOptions.includes(String(studentInfo.year))) {
      errors.year = studentInfo.program === 'MTech' ? 'MTech has only Years 1-2' : 'BTech has only Years 1-4';
    }
    if (studentInfo.semRoman && !validSemOptions.includes(String(studentInfo.semRoman))) {
      errors.semRoman = 'Only Semesters I and II are available';
    }

    const yf = Number(studentInfo.yearFrom);
    const yt = Number(studentInfo.yearTo);
    if (studentInfo.yearFrom && String(studentInfo.yearFrom).length !== 4) errors.yearFrom = 'Year From must be 4 digits';
    if (studentInfo.yearTo && String(studentInfo.yearTo).length !== 4) errors.yearTo = 'Year To must be 4 digits';
    if (String(studentInfo.yearFrom).length === 4 && (yf < 2024 || yf > 2030)) errors.yearFrom = 'Year From must be between 2024 and 2030';
    if (String(studentInfo.yearTo).length === 4 && (yt < 2024 || yt > 2030)) errors.yearTo = 'Year To must be between 2024 and 2030';
    if (String(studentInfo.yearFrom).length === 4 && String(studentInfo.yearTo).length === 4 && yf > yt) {
      errors.yearTo = 'Year To must be greater than or equal to Year From';
    }

    required('fatherName', personalInfo.fatherName, 'Father Name');
    required('fatherPhoneNumber', personalInfo.fatherPhoneNumber, 'Father Phone Number');
    if (personalInfo.fatherPhoneNumber && String(personalInfo.fatherPhoneNumber).length !== 10) {
      errors.fatherPhoneNumber = 'Father Phone Number must be 10 digits';
    }
    required('motherName', personalInfo.motherName, 'Mother Name');
    required('motherPhoneNumber', personalInfo.motherPhoneNumber, 'Mother Phone Number');
    if (personalInfo.motherPhoneNumber && String(personalInfo.motherPhoneNumber).length !== 10) {
      errors.motherPhoneNumber = 'Mother Phone Number must be 10 digits';
    }
    required('aadhaarNumber', personalInfo.aadhaarNumber, 'Aadhaar Number');
    if (personalInfo.aadhaarNumber && String(personalInfo.aadhaarNumber).length !== 12) {
      errors.aadhaarNumber = 'Aadhaar Number must be 12 digits';
    }
    required('bloodGroup', personalInfo.bloodGroup, 'Blood Group');
    required('address', personalInfo.address, 'Address');

    return errors;
  };

  const handleSaveInformation = async () => {
    setSaveSuccess('');
    setSaveError('');
    setPhotoStatus('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setSaveError('Please fix the highlighted errors.');
      return;
    }
    if (!user) {
      setSaveError('You must be signed in to save your profile.');
      return;
    }

    setSaving(true);
    try {
      const uid = user.uid;
      let photoURL = savedProfile?.photoURL || '';
      let photoBucket = savedProfile?.photoBucket || '';
      let photoObjectPath = savedProfile?.photoObjectPath || '';

      if (photoFile) {
        try {
          setPhotoStatus('Uploading image...');
          const uploaded = await uploadPhotoToApi(photoFile);
          photoURL = uploaded.photoURL || uploaded.photoUrl || '';
          photoBucket = uploaded.photoBucket || uploaded.photo_bucket || '';
          photoObjectPath = uploaded.photoObjectPath || uploaded.photo_object_path || '';
          setPhotoStatus('Image uploaded');
        } catch (err) {
          const rawMsg = err?.message || 'Profile photo upload failed.';
          setPhotoError(rawMsg);
          setPhotoStatus('Image upload failed');
          setPhotoFile(null);
          setPhotoPreviewUrl(photoURL || '');
        }
      }

      const payload = {
        id: uid,
        email: user.email || savedProfile?.email || null,
        role: savedProfile?.role || 'student',
        first_name: studentInfo.firstName.trim(),
        second_name: studentInfo.secondName.trim(),
        phone_number: String(studentInfo.phoneNumber),
        reg_no: studentInfo.regNo.trim(),
        program: studentInfo.program || null,
        branch: studentInfo.branch || null,
        year_from: String(studentInfo.yearFrom),
        year_to: String(studentInfo.yearTo),
        year: studentInfo.year ? parseInt(studentInfo.year) : null,
        sem_roman: studentInfo.semRoman || null,
        subjects: studentInfo.subjects,
        father_name: personalInfo.fatherName.trim(),
        father_phone_number: String(personalInfo.fatherPhoneNumber),
        mother_name: personalInfo.motherName.trim(),
        mother_phone_number: String(personalInfo.motherPhoneNumber),
        aadhaar_number: String(personalInfo.aadhaarNumber),
        aadhaar_last4: String(personalInfo.aadhaarNumber).slice(-4),
        blood_group: personalInfo.bloodGroup,
        address: personalInfo.address.trim(),
        photo_bucket: photoBucket,
        photo_object_path: photoObjectPath,
        photo_url: photoURL
      };

      const saved = await upsertProfileToApi(payload);

      setSaveSuccess('Saved successfully');
      setSavedProfile(saved || mapProfileFromApi(payload));
      setPageMode('view');

      if (saved?.photoURL) {
        setPhotoPreviewUrl(saved.photoURL);
        setPhotoFile(null);
      }

      setFieldErrors({});
      setExistingCreatedAt(saved?.createdAt || existingCreatedAt || true);
    } catch (err) {
      setSaveError(err?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySubmit = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();

      const resp = await fetch(`${API_BASE}/api/student-profile/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verifyCode })
      });

      const data = await resp.json();

      if (resp.ok && data.success) {
        setSavedProfile(prev => ({ ...prev, verificationStatus: 'Verified' }));
        setIsVerifyModalOpen(false);
        setVerifyCode('');
        // Refresh global auth context if needed
        if (refreshProfile) refreshProfile();
        alert('Profile verification successful!');
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to verify profile');
    }
  };

  const toDisplay = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return text.trim() ? text : '-';
  };

  const canEdit = pageMode === 'edit';

  const ValueBox = ({ value }) => (
    <div
      className="w-full px-4 py-3 border rounded-xl bg-white text-gray-900"
      style={{ borderColor: BRAND.border }}
    >
      {toDisplay(value)}
    </div>
  );

  const EditButton = ({ onClick }) => {
    const [hover, setHover] = React.useState(false);
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="px-4 py-2 rounded-xl border font-semibold transition-colors duration-200"
        style={{
          borderColor: '#0F9D78',
          backgroundColor: hover ? '#0F9D78' : 'transparent',
          color: hover ? '#FFFFFF' : '#0F9D78',
          cursor: 'pointer'
        }}
      >
        Edit
      </button>
    );
  };

  const PreviewMode = () => (
    <div className="min-h-screen flex flex-col bg-[#f8faf5]">
      <div className="flex-1">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-6 mb-12">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: BRAND.border }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-extrabold" style={{ color: BRAND.heading }}>
                  Student <span style={{ color: BRAND.primary }}>Profile</span>
                </h2>
                <EditButton onClick={() => setPageMode('edit')} />
              </div>

              {/* Profile Photo */}
              <div className="mt-6 flex justify-center mb-8">
                <div className="flex flex-col items-center">
                  <div
                    className="w-28 h-28 sm:w-32 sm:h-32 border-2 rounded-xl bg-white overflow-hidden flex items-center justify-center"
                    style={{ borderColor: BRAND.primary }}
                  >
                    {photoPreviewUrl ? (
                      <img
                        src={photoPreviewUrl}
                        alt="Student"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-emerald-800">No Photo</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Student Information Section - grouped, bold, larger */}
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4" style={{ color: BRAND.heading }}>
                  Student <span style={{ color: BRAND.primary }}>Information</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Row 1: First Name, Second Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">First Name</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.firstName ?? studentInfo.firstName)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Second Name</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.secondName ?? studentInfo.secondName)}</p>
                  </div>
                  {/* Row 2: Phone Number, Reg No */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Phone Number</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.phoneNumber ?? studentInfo.phoneNumber)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Reg No</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.regNo ?? savedProfile?.reg_no ?? studentInfo.regNo)}</p>
                  </div>
                  {/* Row 3: Program, Branch */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Program</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.program ?? studentInfo.program)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Branch</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.branch ?? studentInfo.branch)}</p>
                  </div>
                  {/* Row 4: Academic Year From, Academic Year To */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Academic Year From</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.yearFrom ?? studentInfo.yearFrom)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Academic Year To</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.yearTo ?? studentInfo.yearTo)}</p>
                  </div>
                  {/* Row 5: Current Year, Semester */}
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Current Year</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.year ?? studentInfo.year)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Semester</label>
                    <p className="text-xl text-gray-900">{toDisplay(savedProfile?.semRoman ?? studentInfo.semRoman)}</p>
                  </div>
                  {/* Row 6: Subjects (full width) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Subjects</label>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {(savedProfile?.subjects ?? studentInfo.subjects).length > 0 ? (
                        (savedProfile?.subjects ?? studentInfo.subjects).map((subject) => (
                          <span
                            key={subject}
                            className="px-4 py-2 bg-emerald-100 border-2 border-emerald-400 rounded-full text-lg text-emerald-900"
                          >
                            {subject}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-lg">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4" style={{ color: BRAND.heading }}>
                  Personal <span style={{ color: BRAND.primary }}>Information</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Father Name</label>
                    <p className="text-base text-gray-900">{toDisplay(savedProfile?.fatherName ?? personalInfo.fatherName)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Father Phone</label>
                    <p className="text-base text-gray-900">{toDisplay(savedProfile?.fatherPhoneNumber ?? personalInfo.fatherPhoneNumber)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Mother Name</label>
                    <p className="text-base text-gray-900">{toDisplay(savedProfile?.motherName ?? personalInfo.motherName)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Mother Phone</label>
                    <p className="text-base text-gray-900">{toDisplay(savedProfile?.motherPhoneNumber ?? personalInfo.motherPhoneNumber)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Aadhaar (Last 4)</label>
                    <p className="text-base text-gray-900">
                      {savedProfile?.aadhaarNumber || personalInfo.aadhaarNumber
                        ? `****${(savedProfile?.aadhaarNumber || personalInfo.aadhaarNumber).slice(-4)}`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Blood Group</label>
                    <p className="text-base text-gray-900">{toDisplay(savedProfile?.bloodGroup ?? personalInfo.bloodGroup)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-2">Address</label>
                    <p className="text-base text-gray-900 whitespace-pre-wrap">{toDisplay(savedProfile?.address ?? personalInfo.address)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12">
          </div>
        </div>
      </div>
    </div>
  );

  // Verification Badge Component
  const VerificationBadge = () => {
    const isVerified = savedProfile?.verificationStatus === 'Verified' || savedProfile?.verification_status === 'Verified';
    return (
      <span className={`text-xs font-semibold px-3 py-1 rounded-full border flex items-center gap-1 ${isVerified
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-gray-50 text-gray-600 border-gray-200'
        }`}>
        {isVerified && (
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        )}
        {isVerified ? 'Verified' : 'Not Verified'}
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf5]">
      {!canEdit && savedProfile ? (
        <PreviewMode />
      ) : (
        <>
          <div className="flex-1">
            <div className="w-full max-w-4xl mx-auto px-4 py-8">
              <div className="flex flex-col gap-6 mb-12">

                {/* Header Section with Verification */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h1 className="text-3xl font-bold text-gray-900">
                    <span style={{ color: BRAND.heading }}>Student </span>
                    <span style={{ color: BRAND.primary }}>Profile</span>
                  </h1>
                  {navError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                      <strong className="font-bold">Access Denied: </strong>
                      <span className="block sm:inline">{navError}</span>
                      <span className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setNavError('')}>
                        <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z" /></svg>
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <VerificationBadge />
                    {(savedProfile?.verificationStatus !== 'Verified' && savedProfile?.verification_status !== 'Verified') && (
                      <button
                        type="button"
                        onClick={() => setIsVerifyModalOpen(true)}
                        className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: BRAND.primary }}
                      >
                        Verify Profile
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: BRAND.border }}>
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-gray-800">Basic Details</h2>
                    {!canEdit && (
                      <EditButton onClick={() => setPageMode('edit')} />
                    )}
                  </div>

                  <div className="flex flex-col items-center mb-8">
                    <button
                      type="button"
                      onClick={() => {
                        if (!canEdit) return;
                        if (photoInputRef.current) photoInputRef.current.click();
                      }}
                      disabled={!canEdit}
                      className="w-32 h-32 border-2 rounded-full bg-gray-50 overflow-hidden flex items-center justify-center relative group"
                      style={{ borderColor: BRAND.primary, cursor: canEdit ? 'pointer' : 'default' }}
                    >
                      {photoPreviewUrl ? (
                        <img
                          src={photoPreviewUrl}
                          alt="Student"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400">
                          <span className="text-xs font-semibold">Add Photo</span>
                        </div>
                      )}
                      {canEdit && (
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Change</span>
                        </div>
                      )}
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={canEdit ? onPickStudentPhoto : undefined}
                    />
                    {photoStatus && <p className="mt-2 text-xs text-emerald-600 font-medium">{photoStatus}</p>}
                    {photoError && <p className="mt-2 text-xs text-red-600">{photoError}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">First Name</label>
                      {canEdit ? (
                        <input
                          value={studentInfo.firstName}
                          onChange={setField('firstName')}
                          className="w-full px-4 py-3 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="First Name"
                        />
                      ) : (
                        <ValueBox value={savedProfile?.firstName ?? studentInfo.firstName} />
                      )}
                      {fieldErrors.firstName && <p className="text-xs text-red-600 mt-1">{fieldErrors.firstName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Second Name</label>
                      {canEdit ? (
                        <input
                          value={studentInfo.secondName}
                          onChange={setField('secondName')}
                          className="w-full px-4 py-3 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Second Name"
                        />
                      ) : (
                        <ValueBox value={savedProfile?.secondName ?? studentInfo.secondName} />
                      )}
                      {fieldErrors.secondName && <p className="text-xs text-red-600 mt-1">{fieldErrors.secondName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Phone Number</label>
                      {canEdit ? (
                        <input
                          value={studentInfo.phoneNumber}
                          onChange={setField('phoneNumber')}
                          maxLength={10}
                          className="w-full px-4 py-3 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Phone Number"
                        />
                      ) : (
                        <ValueBox value={savedProfile?.phoneNumber ?? studentInfo.phoneNumber} />
                      )}
                      {fieldErrors.phoneNumber && <p className="text-xs text-red-600 mt-1">{fieldErrors.phoneNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Reg No</label>
                      {canEdit ? (
                        <input
                          value={studentInfo.regNo}
                          onChange={setField('regNo')}
                          className="w-full px-4 py-3 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Registration Number"
                        />
                      ) : (
                        <ValueBox value={savedProfile?.regNo ?? studentInfo.regNo} />
                      )}
                      {fieldErrors.regNo && <p className="text-xs text-red-600 mt-1">{fieldErrors.regNo}</p>}
                    </div>
                  </div>

                  {/* Academic Details - moved here correctly */}
                  {/* Academic Details */}
                  <h3 className="text-lg font-bold text-gray-800 mt-8 mb-4">Academic Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Program</label>
                      {canEdit ? (
                        <select
                          value={studentInfo.program}
                          onChange={(e) => {
                            setField('program')(e);
                            // Reset branch if program changes
                            setStudentInfo(prev => ({ ...prev, program: e.target.value, branch: '' }));
                          }}
                          className="w-full px-4 py-3 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="" disabled>Select Program</option>
                          <option value="B.Tech">B.Tech</option>
                          <option value="M.Tech">M.Tech</option>
                          <option value="MBA">MBA</option>
                          <option value="MCA">MCA</option>
                        </select>
                      ) : (
                        <ValueBox value={savedProfile?.program ?? studentInfo.program} />
                      )}
                      {fieldErrors.program && <p className="text-xs text-red-600 mt-1">{fieldErrors.program}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Branch</label>
                      {canEdit ? (
                        <select
                          value={studentInfo.branch}
                          onChange={setField('branch')}
                          disabled={!studentInfo.program}
                          className="w-full px-4 py-3 border border-emerald-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                        >
                          <option value="">Select Branch</option>
                          {(studentInfo.program === 'B.Tech' || studentInfo.program === 'Btech') && (
                            <>
                              <option value="CSE (Reg)">CSE (Reg)</option>
                              <option value="CSE (AIML)">CSE (AIML)</option>
                              <option value="CSE (ICP)">CSE (ICP)</option>
                              <option value="AIML-ICP">AIML-ICP</option>
                            </>
                          )}
                          {(studentInfo.program === 'M.Tech' || studentInfo.program === 'MTech') && (
                            <>
                              <option value="CSE">CSE</option>
                              <option value="CSE (AIML)">CSE (AIML)</option>
                              <option value="CSE (Cyber Security)">CSE (Cyber Security)</option>
                            </>
                          )}
                        </select>
                      ) : (
                        <ValueBox value={savedProfile?.branch ?? studentInfo.branch} />
                      )}
                      {fieldErrors.branch && <p className="text-xs text-red-600 mt-1">{fieldErrors.branch}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">Academic Year</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">From</label>
                        {canEdit ? (
                          <select
                            value={studentInfo.yearFrom}
                            onChange={setField('yearFrom')}
                            className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white"
                          >
                            <option value="">Year</option>
                            {Array.from({ length: 7 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        ) : <ValueBox value={savedProfile?.yearFrom ?? studentInfo.yearFrom} />}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">To</label>
                        {canEdit ? (
                          <select
                            value={studentInfo.yearTo}
                            onChange={setField('yearTo')}
                            className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white"
                          >
                            <option value="">Year</option>
                            {Array.from({ length: 7 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        ) : <ValueBox value={savedProfile?.yearTo ?? studentInfo.yearTo} />}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-800 mb-2">Current Sem</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">Year</label>
                        {canEdit ? (
                          <select
                            value={studentInfo.year}
                            onChange={setField('year')}
                            className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white"
                          >
                            <option value="">Select</option>
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        ) : <ValueBox value={savedProfile?.year ?? studentInfo.year} />}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Sem</label>
                        {canEdit ? (
                          <select
                            value={studentInfo.semRoman}
                            onChange={setField('semRoman')}
                            className="w-full px-3 py-2 border border-emerald-200 rounded-lg bg-white"
                          >
                            <option value="">Select</option>
                            {semesterOptions.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : <ValueBox value={savedProfile?.semRoman ?? studentInfo.semRoman} />}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 border-t pt-4">
                    <label className="block text-sm font-medium text-emerald-800 mb-2">
                      Subjects (Auto-fetched)
                      <span className="ml-2 text-xs font-normal text-gray-500">Based on Program, Year & Sem</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {studentInfo.subjects && studentInfo.subjects.length > 0 ? (
                        studentInfo.subjects.map((sub, idx) => (
                          <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm border border-emerald-100">
                            {sub}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400 italic">No subjects found for this configuration.</span>
                      )}
                    </div>
                  </div>
                </div> {/* Closing the main Profile Card div */}

                {/* Personal Information Card */}
                <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: BRAND.border }}>
                  <h2 className="text-xl font-bold text-gray-800 mb-6">Personal Information</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Father Name</label>
                      {canEdit ? (
                        <input value={personalInfo.fatherName} onChange={setPersonalField('fatherName')} className="w-full px-4 py-3 border border-emerald-200 rounded-lg" />
                      ) : <ValueBox value={savedProfile?.fatherName ?? personalInfo.fatherName} />}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Father Phone</label>
                      {canEdit ? (
                        <input value={personalInfo.fatherPhoneNumber} onChange={setPersonalField('fatherPhoneNumber')} maxLength={10} className="w-full px-4 py-3 border border-emerald-200 rounded-lg" />
                      ) : <ValueBox value={savedProfile?.fatherPhoneNumber ?? personalInfo.fatherPhoneNumber} />}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Mother Name</label>
                      {canEdit ? (
                        <input value={personalInfo.motherName} onChange={setPersonalField('motherName')} className="w-full px-4 py-3 border border-emerald-200 rounded-lg" />
                      ) : <ValueBox value={savedProfile?.motherName ?? personalInfo.motherName} />}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Mother Phone</label>
                      {canEdit ? (
                        <input value={personalInfo.motherPhoneNumber} onChange={setPersonalField('motherPhoneNumber')} maxLength={10} className="w-full px-4 py-3 border border-emerald-200 rounded-lg" />
                      ) : <ValueBox value={savedProfile?.motherPhoneNumber ?? personalInfo.motherPhoneNumber} />}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Aadhaar</label>
                      {canEdit ? (
                        <input value={personalInfo.aadhaarNumber} onChange={setPersonalField('aadhaarNumber')} maxLength={12} className="w-full px-4 py-3 border border-emerald-200 rounded-lg" />
                      ) : <ValueBox value={savedProfile?.aadhaarNumber ?? personalInfo.aadhaarNumber} />}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Blood Group</label>
                      {canEdit ? (
                        <select value={personalInfo.bloodGroup} onChange={setPersonalField('bloodGroup')} className="w-full px-4 py-3 border border-emerald-200 rounded-lg bg-white">
                          <option value="">Select</option>
                          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                        </select>
                      ) : <ValueBox value={savedProfile?.bloodGroup ?? personalInfo.bloodGroup} />}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-emerald-800 mb-2">Address</label>
                      {canEdit ? (
                        <textarea rows={3} value={personalInfo.address} onChange={setPersonalField('address')} className="w-full px-4 py-3 border border-emerald-200 rounded-lg" />
                      ) : <ValueBox value={savedProfile?.address ?? personalInfo.address} />}
                    </div>
                  </div>

                  {canEdit && (
                    <div className="mt-8 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveInformation}
                        disabled={saving}
                        className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg"
                      >
                        {saving ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  )}

                  {saveSuccess && <p className="mt-4 text-center text-emerald-700 font-medium">{saveSuccess}</p>}
                  {saveError && <p className="mt-4 text-center text-red-600 font-medium">{saveError}</p>}

                </div>

              </div>
            </div>
          </div>

          {/* Verify Modal */}
          {isVerifyModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Student Verification</h3>
                <p className="text-sm text-gray-500 mb-4">Enter the secret access code provided by the administration to verify your profile.</p>

                <input
                  type="password"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="Enter Secret Code"
                  className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsVerifyModalOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifySubmit}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer removed from here to avoid duplication as it is in AppLayout */}
        </>
      )
      }
    </div>
  );
}
