import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth } from "firebase/auth";
import StudentFooter from '../components/StudentFooter';
import { fetchStudentProfile } from '../utils/fetchStudentProfile';
import { BACKEND_URL } from "../config";
// import { supabase } from '../supabase.js'; // Removed direct access

const BRAND = {
  green: '#0F9D78',
  greenDark: '#0B7A5E'
};

export default function StudLMSFiles() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Reg No, program, year, and subjects
  const [regNo, setRegNo] = React.useState('');
  const [program, setProgram] = React.useState('');
  const [branch, setBranch] = React.useState('');
  const [year, setYear] = React.useState('');
  const [semRoman, setSemRoman] = React.useState('');
  const [subjects, setSubjects] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function loadData() {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Fetch Profile for Context
        const profile = await fetchStudentProfile();
        if (cancelled) return;

        // 2. Determine Context (Profile or passed state)
        let ctx = {
          program: profile?.program,
          branch: profile?.branch,
          year: profile?.year,
          sem_roman: profile?.sem_roman,
          regNo: profile?.reg_no
        };

        // If location state exists and seems valid for the standard flow, use it?
        // User asked: "Always get context from backend profile... Set page state from this profile context ONLY"
        // But also said "keep it only as optional override if you already use it".
        // Let's prioritize Profile as per "Problem (current)" description which says StudLMSFiles calls failed due to mismatches.
        // We will stick to Profile to be safe, or just overwrite if passed state is arguably better?
        // Let's use Profile context primarily as requested: "Set page state from this profile context ONLY".

        // 3. Normalization (Frontend Side)
        const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();

        let p = normalize(ctx.program);
        const pClean = p.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (pClean === 'btech') p = 'Btech';
        if (pClean === 'mtech') p = 'MTech';

        let b = normalize(ctx.branch);
        // Normalize parens: "CSE(AIML)" -> "CSE(AIML)" (no space) or "CSE (AIML)"?
        // User said: "CSE (AIML)" <-> "CSE(AIML)". Backend handles variants.
        // Let's keep it as is from profile but ensure trimmed.

        const y = parseInt(ctx.year || 0);
        const s = normalize(ctx.sem_roman); // I or II

        if (!cancelled) {
          setRegNo(ctx.regNo);
          setProgram(p);
          setBranch(b);
          setYear(y);
          setSemRoman(s);
        }

        // 4. Fetch Subjects from Backend
        if (p && b && y && s) {
          const params = new URLSearchParams({
            program: p,
            branch: b,
            year: y,
            sem_roman: s
          });
          const token = await user.getIdToken();
          const res = await fetch(`${BACKEND_URL}/api/lms/subjects?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (res.ok) {
            const json = await res.json();
            if (!cancelled) setSubjects(json.subjects || []);
          } else {
            console.error("Failed to fetch subjects:", res.status);
          }
        }

        if (!cancelled) setLoading(false);

      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load LMS details:", err);
          setError('Failed to load subjects. Please try again.');
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [location.state]); // Dependency on location.state kept just to trigger reload if nav changes, even if we ignore it

  // Each subject is a folder for this UI
  const folders = React.useMemo(() =>
    subjects.map((subject, idx) => ({
      id: `subject-${idx}`,
      name: subject,
      files: ['Notes', 'Assignments'],
      grad: 'linear-gradient(90deg, #a7e9af, #0F9D78)',
    })),
    [subjects]
  );

  const openFolder = async (folder) => {
    if (!folder) return;

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in to access drive folders.");
        return;
      }

      const idToken = await user.getIdToken();

      // Normalize before sending (should match what we set in state, but be explicit)
      const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim();
      let p = normalize(program); // Use state values
      let b = normalize(branch);
      let y = parseInt(year || 0);
      let s = normalize(semRoman);

      // Ensure specific casing if needed
      const pClean = p.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (pClean === 'btech') p = 'Btech';
      if (pClean === 'mtech') p = 'MTech';

      // Construct query parameters
      const params = new URLSearchParams({
        program: p,
        branch: b,
        year: y,
        sem_roman: s,
        subject: folder.name // Send exact name from list
      });

      const response = await fetch(`${BACKEND_URL}/api/lms/drive-folder?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        let msg = errData.error || "Failed to fetch drive folder";
        if (errData.available && Array.isArray(errData.available)) {
          msg += `\n\nUnknown subject: "${errData.searchedFor}"\n\nAvailable subjects in DB:\n${errData.available.join('\n')}`;
        }
        throw new Error(msg);
      }

      const data = await response.json();
      console.log("[StudLMSFiles] Fetched URL for subject:", folder.name, "URL:", data.drive_folder_url);

      if (data.drive_folder_url) {
        // Double-check on client side
        if (data.drive_folder_url.includes('/folders/')) {
          window.open(data.drive_folder_url, '_blank');
        } else {
          console.warn("Blocked opening invalid Drive URL:", data.drive_folder_url);
          alert("The link for this subject appears to be invalid (not a specific folder). Please contact admin.");
        }
      } else {
        alert("No drive folder found for this subject.");
      }
    } catch (err) {
      console.error("Error opening folder:", err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f8faf5] items-center justify-center">
        <div className="text-lg text-gray-700">Loading profile...</div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf5]">
      <div className="flex-1">
        <div className="max-w-5xl mx-auto mb-16">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 sm:p-8 transition-all duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold">
                <span style={{ color: BRAND.green }}>Welcome</span>{' '}
                <span className="text-gray-900">
                  {regNo || 'Reg No'}
                </span>
              </h1>
              <div className="text-sm text-gray-600">
                {program ? program : '-'} {year ? `• ${year} Year` : ''}
              </div>
            </div>
            {error && (
              <div className="text-red-600 text-sm mt-2">{error}</div>
            )}
            <div className="mt-6">
              {/* Search bar above subject boxes */}
              <div className="w-full max-w-xs mt-2 mb-6">
                <textarea
                  className="w-full border border-gray-300 p-2 text-base text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-200 rounded-none resize-none"
                  rows={1}
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {folders
                  .filter(folder => {
                    return folder.name.toLowerCase().includes(searchTerm.toLowerCase());
                  })
                  .map((folder, idx) => {
                    // Assign a unique pastel color for each subject
                    const pastelColors = [
                      'bg-orange-100 text-orange-500', // ML Lab
                      'bg-blue-100 text-blue-500',     // DL Lab
                      'bg-green-100 text-green-500',   // Machine Learning
                      'bg-purple-100 text-purple-500', // Deep Learning
                      'bg-yellow-100 text-yellow-500', // Reinforcement Learning
                      'bg-pink-100 text-pink-500',     // Computer Vision
                      'bg-gray-100 text-gray-500'      // COI
                    ];
                    const colorClass = pastelColors[idx % pastelColors.length];

                    return (
                      <div
                        key={folder.id}
                        className={`bg-white border border-gray-200 shadow-sm p-4 w-full max-w-xs mx-auto flex flex-col gap-3 cursor-pointer transition-transform duration-200 hover:scale-[1.03] rounded-none`}
                        onClick={() => openFolder(folder)}
                      >
                        {/* Top Row */}
                        <div className="flex items-center justify-between mb-2">
                          {/* Icon Area */}
                          <div className={`w-8 h-8 flex items-center justify-center border border-gray-200 ${colorClass} rounded-none`}>
                            {/* Simple document/file icon (SVG) */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 20 20" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 2H12V6H16V18H4V2H8Z" /></svg>
                          </div>
                        </div>
                        {/* Main Content */}
                        <div className="font-bold text-base text-left text-gray-900">
                          {folder.name}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
