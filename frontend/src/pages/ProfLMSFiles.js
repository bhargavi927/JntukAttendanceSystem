
import React, { useState, useRef, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import ProfHeaderNav from '../components/ProfHeaderNav';
import Footer from '../components/Footer';
import { BACKEND_URL } from '../config';

// LMS Contexts for dynamic dropdowns
// (must be inside component, after imports)


// MATERIALS removed; cards will be generated dynamically from profileSubjects

// SVG icon from attachment (with color class to be set dynamically)
const FileIcon = ({ colorClass }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 ${colorClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <rect x="5" y="3" width="14" height="18" rx="2" fill="currentColor" fillOpacity="0.15" />
    <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
    <rect x="9" y="7" width="6" height="2" rx="1" fill="currentColor" />
  </svg>
);


export default function ProfLMSFiles() {
  const [materials, setMaterials] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDegree, setSelectedDegree] = useState('all');
  const [showModal, setShowModal] = useState(false);
  // LMS Folder Modal State
  const [showLmsModal, setShowLmsModal] = useState(false);
  const [lmsModalSubject, setLmsModalSubject] = useState('');
  const [lmsContext, setLmsContext] = useState({
    program: '',
    branch: '',
    year: '',
    sem_roman: ''
  });
  const [lmsError, setLmsError] = useState('');
  // Remember last context
  const [lastLmsContext, setLastLmsContext] = useState({
    program: '',
    branch: '',
    year: '',
    sem_roman: ''
  });
  const [profileSubjects, setProfileSubjects] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    subject: '',
    degree: 'BTech',
    year: '1',
    semester: 'I',
    fileType: '',
    file: null,
    isPublic: true,
  });
  const fileInputRef = useRef();
  const auth = getAuth();

  // LMS Contexts for dynamic dropdowns
  const [lmsContexts, setLmsContexts] = useState([]);
  const [loadingContexts, setLoadingContexts] = useState(true);

  // Helper: Reset LMS modal state
  function resetLmsModalState() {
    setLmsContext({ program: '', branch: '', year: '', sem_roman: '' });
    setLmsError('');
    // Optionally clear option lists (not strictly needed, but safe):
    // setLmsContexts([]); // Do NOT clear lmsContexts, as it is refetched on program change
    // setLoadingContexts(false); // Not needed, handled by fetch
  }

  // Helper: Close LMS modal and reset state
  function closeLmsModal() {
    setShowLmsModal(false);
    resetLmsModalState();
  }

  // Fetch valid program/branch/year/sem_roman combinations from backend, filtered by program
  useEffect(() => {
    const fetchContexts = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        let url = `${BACKEND_URL}/api/lms/contexts`;
        if (lmsContext.program) {
          url += `?program=${encodeURIComponent(lmsContext.program)}`;
        }
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('Failed to load contexts');
        const json = await resp.json();
        setLmsContexts(json.contexts || []);
        setLoadingContexts(false);
      } catch (err) {
        setLmsContexts([]);
        setLoadingContexts(false);
      }
    };
    fetchContexts();
    // Only refetch when program changes
  }, [auth, lmsContext.program]);

  // Compute dropdown options based on selection
  // Programs always from all contexts (for initial selection)
  const programs = Array.from(new Set(lmsContexts.map(c => c.program)));
  // Branches, years, sems only from filtered contexts
  const branches = Array.from(new Set(lmsContexts.map(c => c.branch)));
  const years = Array.from(new Set(lmsContexts.filter(c => c.branch === lmsContext.branch).map(c => c.year)));
  const sems = Array.from(new Set(lmsContexts.filter(c => c.branch === lmsContext.branch && String(c.year) === String(lmsContext.year)).map(c => c.sem_roman)));

  // Fetch professor profile subjects and update cards dynamically
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setProfileSubjects([]);
          setMaterials([]);
          setLoadingSubjects(false);
          return;
        }
        const token = await user.getIdToken();
        const resp = await fetch(`${BACKEND_URL}/api/professor-profile/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) {
          throw new Error('Failed to load profile subjects');
        }
        const json = await resp.json();
        let subs = [];
        if (Array.isArray(json?.profile?.subjects)) subs = json.profile.subjects;
        else if (Array.isArray(json?.subjects)) subs = json.subjects;
        else if (Array.isArray(json?.profile?.courses)) subs = json.profile.courses.map((c) => c.subjectName || c.subject || '').filter(Boolean);
        else if (Array.isArray(json?.courses)) subs = json.courses.map((c) => c.subjectName || c.subject || '').filter(Boolean);
        else if (typeof json?.profile?.subjects === 'string') subs = json.profile.subjects.split(',').map((s) => s.trim()).filter(Boolean);

        const normalized = Array.from(
          new Set(
            subs
              .map((s) => (typeof s === 'string' ? s.trim() : ''))
              .filter((s) => s && s.length > 0)
          )
        );
        if (!cancelled) {
          setProfileSubjects(normalized);
          setSubjectsError(null);
          setLoadingSubjects(false);
          // Dynamically generate subject cards from profileSubjects
          const dynamicMaterials = normalized.map((name) => ({
            id: name,
            title: name,
            subject: name,
            status: 'Public',
            program: '',
            year: '',
            sem: ''
          }));
          setMaterials(dynamicMaterials);
        }
      } catch (err) {
        if (!cancelled) {
          setProfileSubjects([]);
          setMaterials([]);
          setSubjectsError(err?.message || 'Unable to load subjects');
          setLoadingSubjects(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  // Toggle public/private status
  const toggleStatus = (id) => {
    setMaterials((prev) =>
      prev.map((mat) =>
        mat.id === id
          ? {
              ...mat,
              status: mat.status === 'Public' ? 'Private' : 'Public',
            }
          : mat
      )
    );
  };

  // Delete material
  const deleteMaterial = (id) => {
    setMaterials((prev) => prev.filter((mat) => mat.id !== id));
  };

  // Filter materials based on selected subject and degree (allow empty program)
  const filteredMaterials = materials.filter(mat => {
    const matchesSubject =
      selectedSubject === 'all' ||
      mat.subject === selectedSubject ||
      mat.title === selectedSubject;
    const matchesDegree = selectedDegree === 'all' || !mat.program || mat.program === selectedDegree;
    return matchesSubject && matchesDegree;
  });

  // Handle upload form submit
  const handleUpload = (e) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.subject || !uploadForm.degree || !uploadForm.year || !uploadForm.semester || !uploadForm.fileType || !uploadForm.file) return;
    // Add material with course context
    const newMaterial = {
      id: Math.max(0, ...materials.map(m => m.id)) + 1,
      title: uploadForm.title,
      subject: uploadForm.subject,
      status: uploadForm.isPublic ? 'Public' : 'Private',
      program: uploadForm.degree,
      year: parseInt(uploadForm.year),
      sem: uploadForm.semester,
    };
    setMaterials(prev => [...prev, newMaterial]);
    setShowModal(false);
    setUploadForm({ title: '', subject: '', degree: 'BTech', year: '1', semester: 'I', fileType: '', file: null, isPublic: true });
  };

  // Open LMS modal on card click
  const handleCardClick = (subject) => {
    resetLmsModalState();
    setLmsModalSubject(subject);
    setShowLmsModal(true);
  };

  // Handle LMS modal field change
  const handleLmsField = (field, value) => {
    setLmsContext((prev) => ({ ...prev, [field]: value }));
  };

  // Open Drive folder
  const handleOpenFolder = async () => {
    setLmsError('');
    const { program, branch, year, sem_roman } = lmsContext;
    if (!program || !branch || !year || !sem_roman) {
      setLmsError('Please select all fields.');
      return;
    }
    setLastLmsContext(lmsContext);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not logged in');
      const token = await user.getIdToken();
      const params = new URLSearchParams({
        program, branch, year, sem_roman, subject: lmsModalSubject
      });
      const resp = await fetch(`${BACKEND_URL}/api/lms/drive-folder?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.status === 404) {
        setLmsError('Drive folder not configured for this subject/class.');
        return;
      }
      if (!resp.ok) throw new Error('Failed to fetch folder');
      const data = await resp.json();
      if (data.drive_folder_url) {
        window.open(data.drive_folder_url, '_blank');
        closeLmsModal();
      } else {
        setLmsError('Drive folder not configured for this subject/class.');
      }
    } catch (err) {
      setLmsError(err.message || 'Unable to fetch folder');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf5]">
      {/* Professor Header Navigation */}
      <ProfHeaderNav />
      {/* Spacer for header */}
      <div className="h-16" />
      <div className="flex-1 max-w-5xl mx-auto w-full px-2 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">
          <span style={{ color: '#222', fontFamily: 'inherit' }}>Lecture </span>
          <span style={{ color: '#0F9D78', fontFamily: 'inherit' }}>Materials</span>
        </h1>
        <div className="mb-6" style={{ fontFamily: 'Garamond, serif', color: '#6B7280', fontWeight: 400, fontSize: '1.05rem' }}>
          Upload and manage educational resources for your students
        </div>
        {/* Subject & Degree Filters */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex flex-col sm:flex-row w-full gap-3">
            <select
              className="border border-gray-300 px-4 py-2 rounded-none text-base w-full sm:w-48"
              value={selectedDegree}
              onChange={e => setSelectedDegree(e.target.value)}
            >
              <option value="all">All Degrees</option>
              <option value="BTech">BTech</option>
              <option value="MTech">MTech</option>
            </select>
            <select
              className="border border-gray-300 px-4 py-2 rounded-none text-base w-full sm:w-48"
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
            >
              <option value="all">All Subjects</option>
              {loadingSubjects && <option disabled>Loading subjects...</option>}
              {!loadingSubjects && profileSubjects.length === 0 && <option disabled>No subjects in profile</option>}
              {!loadingSubjects && profileSubjects.length > 0 && profileSubjects.map((subj) => (
                <option key={subj} value={subj}>{subj}</option>
              ))}
            </select>
            <div className="flex-1" />
            <button
              className="text-white font-bold px-6 py-2 rounded transition-colors w-full sm:w-auto"
              style={{ minWidth: 120, background: '#0F9D78' }}
              onClick={() => setShowModal(true)}
            >
              Upload Material
            </button>
          </div>
        </div>
        {subjectsError ? (
          <div className="text-xs text-red-600 mb-4">{subjectsError}</div>
        ) : null}
        {/* Modal Popup for Upload Material */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md transition-opacity"
              onClick={() => setShowModal(false)}
            />
            {/* Modal Container */}
            <div
              className="relative bg-white border border-gray-200 shadow-xl w-full max-w-lg mx-4 p-4 rounded-lg max-h-[90vh] overflow-y-auto z-60 flex flex-col"
              style={{ fontFamily: 'inherit' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close (X) Icon */}
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                onClick={() => setShowModal(false)}
                aria-label="Close"
                type="button"
              >
                &times;
              </button>
              {/* Modal Title */}
              <div className="text-xl font-extrabold mb-4">
                <span className="text-gray-900">Upload </span>
                <span style={{ color: '#0F9D78' }}>Lecture Material</span>
              </div>
              {/* Form Fields */}
              <form className="flex flex-col gap-4" onSubmit={handleUpload}>
                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78]"
                    placeholder="Enter material title"
                    value={uploadForm.title}
                    onChange={e => setUploadForm(f => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>
                {/* Subject Dropdown */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Subject <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={uploadForm.subject}
                    onChange={e => setUploadForm(f => ({ ...f, subject: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select a subject…</option>
                    {loadingSubjects && <option disabled>Loading subjects...</option>}
                    {!loadingSubjects && profileSubjects.length === 0 && <option disabled>No subjects in profile</option>}
                    {!loadingSubjects && profileSubjects.length > 0 && profileSubjects.map((subj) => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                </div>
                {/* Degree Dropdown */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Degree <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={uploadForm.degree}
                    onChange={e => setUploadForm(f => ({ ...f, degree: e.target.value }))}
                    required
                  >
                    <option value="BTech">BTech</option>
                    <option value="MTech">MTech</option>
                  </select>
                </div>
                {/* Year Dropdown */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Year <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={uploadForm.year}
                    onChange={e => setUploadForm(f => ({ ...f, year: e.target.value }))}
                    required
                  >
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>
                {/* Semester Dropdown */}
                <div>
                  <label className="block text-sm font-semibold mb-1">Semester <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={uploadForm.semester}
                    onChange={e => setUploadForm(f => ({ ...f, semester: e.target.value }))}
                    required
                  >
                    <option value="I">Semester I</option>
                    <option value="II">Semester II</option>
                  </select>
                </div>
                {/* File Type Dropdown */}
                <div>
                  <label className="block text-sm font-semibold mb-1">File Type <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={uploadForm.fileType}
                    onChange={e => setUploadForm(f => ({ ...f, fileType: e.target.value }))}
                    required
                  >
                    <option value="" disabled>Select file type…</option>
                    <option value="pdf">PDF Document</option>
                    <option value="ppt">PowerPoint Presentation</option>
                    <option value="doc">Word Document</option>
                  </select>
                </div>
                {/* Drag & Drop Upload Area */}
                <div>
                  <label className="block text-sm font-semibold mb-1">File Upload <span className="text-red-500">*</span></label>
                  <div
                    className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded bg-gray-50 cursor-pointer transition hover:border-[#0F9D78]"
                    style={{ minHeight: '120px', height: 'clamp(120px,20vw,180px)' }}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={e => {
                      e.preventDefault();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        setUploadForm(f => ({ ...f, file: e.dataTransfer.files[0] }));
                      }
                    }}
                    onDragOver={e => e.preventDefault()}
                  >
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={e => setUploadForm(f => ({ ...f, file: e.target.files[0] }))}
                    />
                    <span className="text-gray-500 text-sm text-center select-none">
                      {uploadForm.file ? uploadForm.file.name : 'Click to upload or drag and drop'}
                    </span>
                  </div>
                </div>
                {/* Checkbox */}
                <div className="flex items-center mt-2">
                  <input
                    type="checkbox"
                    className="accent-[#0F9D78] mr-2"
                    checked={uploadForm.isPublic}
                    onChange={e => setUploadForm(f => ({ ...f, isPublic: e.target.checked }))}
                    id="publicCheckbox"
                  />
                  <label htmlFor="publicCheckbox" className="text-sm select-none">Make this file publicly accessible to students</label>
                </div>
                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-4 sm:justify-between">
                  <button
                    type="submit"
                    className="bg-[#0F9D78] text-white font-bold px-6 py-2 rounded w-full sm:w-full order-1 sm:order-none"
                  >
                    Upload Material
                  </button>
                  <button
                    type="button"
                    className="bg-gray-200 text-gray-700 font-semibold px-6 py-2 rounded w-full sm:w-full order-2 sm:order-none"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Material Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredMaterials.map((material, idx) => {
            const pastelColors = [
              'text-red-400', 'text-blue-400', 'text-green-400', 'text-yellow-400', 'text-pink-400', 'text-purple-400', 'text-orange-400', 'text-cyan-400'
            ];
            const colorClass = pastelColors[idx % pastelColors.length];
            return (
              <div
                key={material.id}
                className="bg-white border border-gray-200 shadow-sm p-4 flex flex-col gap-3 relative transition-transform duration-200"
                style={{ borderRadius: 0 }}
                onClick={() => handleCardClick(material.subject)}
              >
                {/* Top Row: Icon and Public/Private button (top-right) */}
                <div className="flex items-center justify-between mb-2">
                  {/* File Icon */}
                  <div className="w-10 h-10 flex items-center justify-center border border-gray-200 bg-gray-50" style={{ borderRadius: 0 }}>
                    <FileIcon colorClass={colorClass} />
                  </div>
                  <button
                    className={`px-2 py-1 text-xs font-semibold border focus:outline-none transition-colors rounded-full absolute right-4 top-4 ${material.status === 'Public' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-200 text-black border-gray-300'}`}
                    style={{ minWidth: 60 }}
                    onClick={e => { e.stopPropagation(); toggleStatus(material.id); }}
                  >
                    {material.status}
                  </button>
                </div>
                {/* Title */}
                <div className="font-bold text-base text-left text-gray-900">
                  {material.title}
                </div>
                {/* Course Context */}
                {material.program && (
                  <div className="text-xs text-gray-500">
                    {material.program}
                    {material.year && ` • Year ${material.year}`}
                    {material.sem && ` • Sem ${material.sem}`}
                  </div>
                )}
                {/* Delete Icon (bottom-right) */}
                <button
                  className="absolute right-4 bottom-4 text-gray-400 hover:text-red-600"
                  title="Delete"
                  onClick={e => { e.stopPropagation(); deleteMaterial(material.id); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 20 20" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 8v8m4-8v8m4-8v8M4 6h12M9 2h2a2 2 0 012 2v2H7V4a2 2 0 012-2z" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* LMS Drive Folder Modal */}
        {showLmsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop with blur */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md transition-opacity"
              onClick={closeLmsModal}
            />
            <div
              className="relative bg-white border border-gray-200 shadow-xl w-full max-w-lg mx-4 p-4 rounded-lg max-h-[90vh] overflow-y-auto z-60 flex flex-col"
              style={{ fontFamily: 'inherit' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
                onClick={closeLmsModal}
                aria-label="Close"
                type="button"
              >
                &times;
              </button>
              <div className="text-xl font-extrabold mb-4">
                <span className="text-gray-900">Open </span>
                <span style={{ color: '#0F9D78' }}>Google Drive Folder</span>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Program <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={lmsContext.program}
                    onChange={e => {
                      handleLmsField('program', e.target.value);
                      handleLmsField('branch', '');
                      handleLmsField('year', '');
                      handleLmsField('sem_roman', '');
                    }}
                  >
                    <option value="">Select program…</option>
                    {programs.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Branch <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={lmsContext.branch}
                    onChange={e => {
                      handleLmsField('branch', e.target.value);
                      handleLmsField('year', '');
                      handleLmsField('sem_roman', '');
                    }}
                    disabled={!lmsContext.program || loadingContexts}
                  >
                    <option value="">Select branch…</option>
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Year <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={lmsContext.year}
                    onChange={e => {
                      handleLmsField('year', e.target.value);
                      handleLmsField('sem_roman', '');
                    }}
                    disabled={!lmsContext.branch || loadingContexts}
                  >
                    <option value="">Select year…</option>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Semester <span className="text-red-500">*</span></label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F9D78] text-base"
                    value={lmsContext.sem_roman}
                    onChange={e => handleLmsField('sem_roman', e.target.value)}
                    disabled={!lmsContext.year || loadingContexts}
                  >
                    <option value="">Select semester…</option>
                    {sems.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {lmsError && <div className="text-xs text-red-600 mb-2">{lmsError}</div>}
                <button
                  className="bg-[#0F9D78] text-white font-bold px-6 py-2 rounded w-full"
                  onClick={handleOpenFolder}
                  type="button"
                >
                  Open Folder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Footer */}
      <Footer />
    </div>
  );
}
