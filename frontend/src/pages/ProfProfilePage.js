import React from 'react';
import { getAuth } from 'firebase/auth';
import { upsertUserProfile } from '../firebase';
import { AuthContext } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import ProfHeaderNav from '../components/ProfHeaderNav';
import Footer from '../components/Footer';
import { BACKEND_URL } from '../config';
const API_BASE = BACKEND_URL;
const BRAND = {
  heading: '#0F172A',
  primary: '#0F9D78',
  border: '#e5e7eb'
};

const toDisplay = (value) => {
  if (value === undefined || value === null) return '-';
  if (Array.isArray(value) && value.length === 0) return '-';
  const trimmed = typeof value === 'string' ? value.trim() : value;
  if (typeof trimmed === 'string' && trimmed.length === 0) return '-';
  return trimmed;
};

export default function ProfProfilePage() {
  const auth = getAuth();
  const { refreshProfile } = React.useContext(AuthContext);
  const location = useLocation();

  const [pageMode, setPageMode] = React.useState('edit');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  // Initialize error from navigation state if present
  const [error, setError] = React.useState(location.state?.message || '');
  const [success, setSuccess] = React.useState('');

  // Clear location state to prevent error from persisting on refresh
  React.useEffect(() => {
    if (location.state?.message) {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const [photoFile, setPhotoFile] = React.useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState('');

  const [isVerifyModalOpen, setIsVerifyModalOpen] = React.useState(false);
  const [verifyCode, setVerifyCode] = React.useState('');

  const [profile, setProfile] = React.useState({
    firstName: '',
    secondName: '',
    phoneNumber: '',
    domain: '',
    department: '',
    facultyId: '',
    subjects: [],
    photoUrl: '',
    verificationStatus: 'Not Verified'
  });

  const [subjectInput, setSubjectInput] = React.useState('');

  React.useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(profile.photoUrl || '');
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile, profile.photoUrl]);

  React.useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          console.log('[ProfProfilePage] No Firebase user logged in');
          setLoading(false);
          setError('Please log in to view your profile');
          return;
        }
        console.log('[ProfProfilePage] Using BACKEND_URL:', BACKEND_URL);
        console.log('[ProfProfilePage] Firebase user:', currentUser.uid);
        const token = await currentUser.getIdToken();
        console.log('[ProfProfilePage] Got Firebase token, calling backend at:', `${API_BASE}/api/professor-profile/me`);
        let resp;
        try {
          resp = await fetch(`${API_BASE}/api/professor-profile/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (err) {
          setLoading(false);
          setError(`Backend not reachable at ${API_BASE}. Start backend server or fix BACKEND_URL in config.js.`);
          return;
        }
        console.log('[ProfProfilePage] Response status:', resp.status);
        if (!resp.ok) {
          const errorText = await resp.text();
          console.error('[ProfProfilePage] Backend error response:', errorText);
          setLoading(false);
          setError(`Backend not reachable at ${API_BASE}. Start backend server or fix BACKEND_URL in config.js.`);
          return;
        }
        const data = await resp.json();
        console.log('[ProfProfilePage] Response data:', data);

        if (data?.profile) {
          const prof = data.profile;
          console.log('[ProfProfilePage] Setting profile with data:', prof);
          setProfile({
            firstName: prof.first_name || '',
            secondName: prof.second_name || '',
            phoneNumber: prof.phone_number || '',
            domain: prof.domain || '',
            department: prof.department || '',
            facultyId: prof.faculty_id || '',
            subjects: Array.isArray(prof.subjects) ? prof.subjects : (prof.subjects ? String(prof.subjects).split(',').map((s) => s.trim()).filter(Boolean) : []),
            photoUrl: prof.photo_url || '',
            verificationStatus: prof.verification_status || 'Not Verified'
          });

          // Self-Healing: Sync to Firestore if Supabase is verified
          if (prof.verification_status === 'Verified') {
            console.log('[ProfProfilePage] Ensuring Firestore is verified...');
            upsertUserProfile(currentUser.uid, {
              verificationStatus: 'Verified',
              isVerified: true
            }).then(() => refreshProfile()).catch(e => console.warn('Sync failed', e));
          }

          setPageMode('view');
        } else {
          console.log('[ProfProfilePage] No profile data returned, switching to edit mode');
          setPageMode('edit');
        }
      } catch (err) {
        console.error('[ProfProfilePage] Fetch error:', err);
        setError(err.message || 'Unable to load profile');
        setPageMode('edit');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [auth]);

  const addSubjectsFromInput = () => {
    if (!subjectInput.trim()) return;
    const parts = subjectInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setProfile((prev) => ({ ...prev, subjects: Array.from(new Set([...prev.subjects, ...parts])) }));
    setSubjectInput('');
  };

  const handleSubjectKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSubjectsFromInput();
    }
  };

  const removeSubject = (subject) => {
    setProfile((prev) => ({ ...prev, subjects: prev.subjects.filter((s) => s !== subject) }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setPhotoFile(file);
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      const token = await currentUser.getIdToken();

      let uploadedPhotoUrl = profile.photoUrl;
      if (photoFile) {
        const form = new FormData();
        form.append('file', photoFile);
        const uploadResp = await fetch(`${API_BASE}/api/professor-profile/upload-photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });
        if (!uploadResp.ok) throw new Error('Photo upload failed');
        const uploadData = await uploadResp.json();
        uploadedPhotoUrl = uploadData?.photoURL || uploadedPhotoUrl;
      }

      const payload = {
        first_name: profile.firstName,
        second_name: profile.secondName,
        phone_number: profile.phoneNumber,
        domain: profile.domain,
        department: profile.department,
        faculty_id: profile.facultyId,
        subjects: profile.subjects,
        photo_url: uploadedPhotoUrl
      };

      const resp = await fetch(`${API_BASE}/api/professor-profile/upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error('Save failed');
      const data = await resp.json();
      const saved = data?.profile || {};
      setProfile((prev) => ({
        ...prev,
        firstName: saved.first_name ?? prev.firstName,
        secondName: saved.second_name ?? prev.secondName,
        phoneNumber: saved.phone_number ?? prev.phoneNumber,
        domain: saved.domain ?? prev.domain,
        department: saved.department ?? prev.department,
        facultyId: saved.faculty_id ?? prev.facultyId,
        subjects: Array.isArray(saved.subjects) ? saved.subjects : prev.subjects,
        photoUrl: saved.photo_url ?? uploadedPhotoUrl,
        verificationStatus: saved.verification_status || prev.verificationStatus
      }));
      setSuccess('Profile saved');
      setPageMode('view');
    } catch (err) {
      setError(err.message || 'Unable to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySubmit = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const token = await currentUser.getIdToken();

      const resp = await fetch(`${API_BASE}/api/professor-profile/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verifyCode })
      });

      const data = await resp.json();

      if (resp.ok && data.success) {
        setProfile(prev => ({ ...prev, verificationStatus: 'Verified' }));
        setIsVerifyModalOpen(false);
        setSuccess('Profile verification successful!');
        setVerifyCode('');
      } else {
        alert(data.error || 'Verification failed');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to verify profile');
    }
  };

  const completenessPercent = React.useMemo(() => {
    const fields = [
      profile.firstName,
      profile.secondName,
      profile.phoneNumber,
      profile.department,
      profile.domain,
      profile.subjects.length > 0,
      photoPreviewUrl || profile.photoUrl
    ];
    const filled = fields.reduce((acc, item) => acc + (item ? 1 : 0), 0);
    return Math.round((filled / fields.length) * 100);
  }, [profile, photoPreviewUrl]);

  const VerificationBadge = () => (
    <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{ color: BRAND.primary, borderColor: BRAND.primary }}>
      {profile.verificationStatus || 'Not Verified'}
    </span>
  );

  const SubjectsChips = ({ subjects }) => {
    if (!subjects || subjects.length === 0) return <span className="text-gray-500">-</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {subjects.map((subj) => (
          <span key={subj} className="px-3 py-1 rounded-full text-sm bg-emerald-50 border" style={{ borderColor: BRAND.primary, color: BRAND.primary }}>
            {subj}
          </span>
        ))}
      </div>
    );
  };

  const PreviewMode = () => (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-8">
      <div className="bg-white rounded-2xl shadow p-6 sm:p-8 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: BRAND.heading }}>
            Professor <span style={{ color: BRAND.primary }}>Information</span>
          </h1>
          <div className="flex flex-row items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex sm:items-center sm:gap-3 flex-col sm:flex-row">
              <div className="text-xs sm:text-sm font-semibold" style={{ color: BRAND.heading }}>
                Profile Complete: {completenessPercent}%
              </div>
              <div className="w-24 sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${completenessPercent}%`, backgroundColor: BRAND.primary }} />
              </div>
            </div>
            <VerificationBadge />
            <button
              type="button"
              onClick={() => setPageMode('edit')}
              className="px-3 py-1 rounded-xl border bg-white font-semibold text-xs sm:text-sm"
              style={{ borderColor: BRAND.primary, color: BRAND.primary }}
            >
              <span className="sm:hidden">Edit</span>
              <span className="hidden sm:inline">Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="flex flex-col items-center justify-center border-2 rounded-xl h-36 w-36" style={{ borderColor: BRAND.primary, borderStyle: 'solid' }}>
            {photoPreviewUrl || profile.photoUrl ? (
              <img src={photoPreviewUrl || profile.photoUrl} alt="Profile" className="h-full w-full object-cover rounded-xl" />
            ) : (
              <span className="text-lg" style={{ color: BRAND.primary }}>No Photo</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <div className="text-sm font-semibold text-emerald-800 mb-1">First Name</div>
            <div className="text-gray-900">{toDisplay(profile.firstName)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-800 mb-1">Second Name</div>
            <div className="text-gray-900">{toDisplay(profile.secondName)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-800 mb-1">Phone Number</div>
            <div className="text-gray-900">{toDisplay(profile.phoneNumber)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-800 mb-1">Department</div>
            <div className="text-gray-900">{toDisplay(profile.department)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-800 mb-1">Domain</div>
            <div className="text-gray-900">{toDisplay(profile.domain)}</div>
          </div>
          <div>
            <div className="text-sm font-semibold text-emerald-800 mb-1">Faculty ID</div>
            <div className="text-gray-900">{toDisplay(profile.facultyId)}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-sm font-semibold text-emerald-800 mb-1">Subjects</div>
            <SubjectsChips subjects={profile.subjects} />
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <ProfHeaderNav />
        <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-8">
          <div className="bg-white rounded-2xl shadow p-6 sm:p-8 border border-gray-200 text-center text-emerald-800">Loading...</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <ProfHeaderNav />
      {pageMode === 'view' ? (
        <PreviewMode />
      ) : (
        <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-8">
          <div className="bg-white rounded-2xl shadow p-6 sm:p-8 border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold">
                <span style={{ color: BRAND.heading }}>Professor </span>
                <span style={{ color: BRAND.primary }}>Information</span>
              </h1>
              <div className="flex flex-row items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex sm:items-center sm:gap-3 flex-col sm:flex-row">
                  <div className="text-xs sm:text-sm font-semibold" style={{ color: BRAND.heading }}>
                    Profile Complete: {completenessPercent}%
                  </div>
                  <div className="w-24 sm:w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full" style={{ width: `${completenessPercent}%`, backgroundColor: BRAND.primary }} />
                  </div>
                </div>
                <VerificationBadge />
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(true)}
                  className={`px-3 py-1 rounded-xl border bg-white font-semibold text-xs sm:text-sm ${profile.verificationStatus === 'Verified' ? 'hidden' : ''
                    }`}
                  style={{ borderColor: BRAND.primary, color: BRAND.primary }}
                >
                  Verify
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center mb-8">
              <label
                htmlFor="photo-upload"
                className="flex flex-col items-center justify-center border-2 rounded-xl h-36 w-36 cursor-pointer mb-2"
                style={{ borderColor: BRAND.primary, borderStyle: 'solid' }}
              >
                {photoPreviewUrl || profile.photoUrl ? (
                  <img src={photoPreviewUrl || profile.photoUrl} alt="Profile Preview" className="h-full w-full object-cover rounded-xl" />
                ) : (
                  <span className="text-lg" style={{ color: BRAND.primary }}>Add Photo</span>
                )}
                <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              <div className="text-emerald-700 text-sm mt-1">JPG/PNG/WEBP • Max 2MB</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-x-8 lg:gap-y-6">
              <div>
                <label className="block mb-1 font-medium text-emerald-800 text-xs sm:text-sm">First Name</label>
                <input
                  name="firstName"
                  value={profile.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter first name"
                  className="w-full border rounded-lg p-3 min-h-[44px] text-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-emerald-800 text-xs sm:text-sm">Second Name</label>
                <input
                  name="secondName"
                  value={profile.secondName}
                  onChange={handleInputChange}
                  placeholder="Enter second name"
                  className="w-full border rounded-lg p-3 min-h-[44px] text-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-emerald-800 text-xs sm:text-sm">Phone Number</label>
                <input
                  name="phoneNumber"
                  value={profile.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  className="w-full border rounded-lg p-3 min-h-[44px] text-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-emerald-800 text-xs sm:text-sm">Department</label>
                <input
                  name="department"
                  value={profile.department}
                  onChange={handleInputChange}
                  placeholder="Enter department (e.g., CSE)"
                  className="w-full border rounded-lg p-3 min-h-[44px] text-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-emerald-800 text-xs sm:text-sm">Domain</label>
                <input
                  name="domain"
                  value={profile.domain}
                  onChange={handleInputChange}
                  placeholder="Enter domain"
                  className="w-full border rounded-lg p-3 min-h-[44px] text-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium text-emerald-800 text-xs sm:text-sm">Faculty ID</label>
                <input
                  name="facultyId"
                  value={profile.facultyId}
                  onChange={handleInputChange}
                  placeholder="Enter faculty ID (optional)"
                  className="w-full border rounded-lg p-3 min-h-[44px] text-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block mb-1 font-medium text-emerald-800 text-xs sm:text-sm">Subjects</label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="flex-1">
                    <input
                      name="subjects"
                      value={subjectInput}
                      onChange={(e) => setSubjectInput(e.target.value)}
                      onKeyDown={handleSubjectKeyDown}
                      placeholder="Type subjects and press Enter or comma"
                      className="w-full border rounded-lg p-3 min-h-[44px] text-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addSubjectsFromInput}
                    className="w-full sm:w-auto px-4 py-3 sm:py-2 min-h-[44px] sm:min-h-auto rounded-lg border bg-white font-semibold text-sm"
                    style={{ borderColor: BRAND.primary, color: BRAND.primary }}
                  >
                    Add
                  </button>
                </div>
                {profile.subjects.length > 0 ? (
                  <div className="flex flex-wrap gap-2 gap-y-2 mt-3">
                    {profile.subjects.map((subj) => (
                      <span key={subj} className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm bg-emerald-50 border inline-flex items-center gap-1 sm:gap-2" style={{ borderColor: BRAND.primary, color: BRAND.primary }}>
                        <span className="truncate max-w-xs">{subj}</span>
                        <button type="button" onClick={() => removeSubject(subj)} className="text-xs sm:text-sm flex-shrink-0 font-bold" aria-label={`Remove ${subj}`} style={{ color: BRAND.primary }}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-gray-500 mt-2">No subjects added</div>
                )}
              </div>
            </div>

            {error ? <div className="mt-4 text-red-600 text-sm font-medium">{error}</div> : null}
            {success ? <div className="mt-4 text-emerald-700 text-sm font-medium">{success}</div> : null}

            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 min-h-[44px] sm:min-h-auto rounded-xl text-white font-semibold text-sm sm:text-base"
                style={{ backgroundColor: BRAND.primary, opacity: saving ? 0.7 : 1 }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Professor Verification</h3>
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
                onClick={() => setIsVerifyModalOpen(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifySubmit}
                className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
