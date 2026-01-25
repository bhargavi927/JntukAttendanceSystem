import React, { useEffect, useMemo, useState } from 'react';
import { getAuth } from 'firebase/auth';
import ProfHeaderNav from '../components/ProfHeaderNav';
import Footer from '../components/Footer';
import { BACKEND_URL } from '../config';

const STATUS_OPTIONS = ['All Status', 'Accepted', 'Rejected', 'Pending'];
const API_BASE = BACKEND_URL;

export default function ReviewAttendance() {
  const auth = getAuth();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [degree, setDegree] = useState('All');
  const [year, setYear] = useState('All');
  const [semester, setSemester] = useState('All');
  const [status, setStatus] = useState('All Status');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        setLoading(true);
        const token = await user.getIdToken();
        const resp = await fetch(`${API_BASE}/api/attendance-submissions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resp.json();
        if (cancelled) return;
        if (!resp.ok) {
          setCards([]);
          setLoading(false);
          return;
        }

        const mapped = (json?.submissions || []).map((sub) => ({
          id: sub.id,
          name: sub.student_reg_no || 'Student',
          displayId: sub.student_reg_no || sub.student_id || sub.id,
          subject: sub.subject,
          status: sub.status || 'Pending',
          location: sub.branch ? sub.branch : '—',
          date: sub.date,
          time: sub.time,
          photoUrl: sub.photo_url,
          program: sub.program,
          branch: sub.branch,
          year: sub.year,
          sem_roman: sub.sem_roman,
        }));
        setCards(mapped);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setCards([]);
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  const subjectOptions = useMemo(() => {
    const uniques = Array.from(new Set(cards.map((c) => c.subject).filter(Boolean)));
    return ['All Subjects', ...uniques];
  }, [cards]);

  // Build degree options from submissions
  const degreeOptions = useMemo(() => {
    const uniques = Array.from(new Set(cards.map((c) => c.program).filter(Boolean)));
    return ['All', ...uniques];
  }, [cards]);

  // Build year options based on selected degree filter
  const yearOptions = useMemo(() => {
    const filtered = degree === 'All' ? cards : cards.filter((c) => c.program === degree);
    const uniques = Array.from(new Set(filtered.map((c) => c.year).filter(Boolean)));
    const sorted = uniques.sort((a, b) => a - b);
    return ['All', ...sorted];
  }, [cards, degree]);

  // Build semester options based on selected degree/year filters
  const semesterOptions = useMemo(() => {
    let filtered = cards;
    if (degree !== 'All') filtered = filtered.filter((c) => c.program === degree);
    if (year !== 'All') filtered = filtered.filter((c) => c.year === parseInt(year));
    const uniques = Array.from(new Set(filtered.map((c) => c.sem_roman).filter(Boolean)));
    return ['All', ...uniques];
  }, [cards, degree, year]);

  // Filtering logic
  const filtered = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch =
        !search ||
        (card.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (card.displayId || '').toLowerCase().includes(search.toLowerCase()) ||
        (card.subject || '').toLowerCase().includes(search.toLowerCase());
      const matchesSubject = subject === 'All Subjects' || card.subject === subject;
      const matchesDegree = degree === 'All' || card.program === degree;
      const matchesYear = year === 'All' || card.year == year;
      const matchesSemester = semester === 'All' || card.sem_roman == semester;
      const matchesStatus = status === 'All Status' || card.status === status;
      return matchesSearch && matchesSubject && matchesDegree && matchesYear && matchesSemester && matchesStatus;
    });
  }, [search, subject, degree, year, semester, status, cards]);

  const updateStatus = async (id, nextStatus) => {
    try {
      const user = auth.currentUser;
      if (!user || !id) return false;
      const token = await user.getIdToken();
      const resp = await fetch(`${API_BASE}/api/attendance-submissions/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await resp.json();
      if (!resp.ok) return false;
      const submission = json?.submission;
      if (!submission || !submission.id) return false;
      setCards((prev) =>
        prev.map((c) =>
          c.id === submission.id
            ? { ...c, status: submission.status || nextStatus, photoUrl: submission.photo_url || c.photoUrl }
            : c
        )
      );
      return true;
    } catch {
      return false;
    }
  };

  const handleApprove = (id) => {
    updateStatus(id, 'Accepted');
  };
  const handleReject = (id) => {
    updateStatus(id, 'Rejected');
  };
  const handleApproveAll = async () => {
    const pendingVisible = filtered.filter((c) => c.status === 'Pending');
    for (const card of pendingVisible) {
      await updateStatus(card.id, 'Accepted');
    }
  };

  // Stat counts
  const total = cards.length;
  const pending = cards.filter(c => c.status === 'Pending').length;
  const accepted = cards.filter(c => c.status === 'Accepted').length;
  const rejected = cards.filter(c => c.status === 'Rejected').length;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <ProfHeaderNav />
      {/* Optionally, you can include ProfHeaderNav below if you want both navbars */}
      {/* <ProfHeaderNav /> */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-10" style={{ marginTop: '24px' }}> {/* marginTop to offset fixed header */}
        {/* Title Section */}
        <div className="mb-6 md:mb-10">
          <h1 className="font-extrabold text-2xl md:text-3xl">
            <span style={{ color: '#222' }}>Attendance </span>
            <span style={{ color: '#0F9D78' }}>Review</span>
          </h1>
          <div className="text-sm md:text-base text-gray-500 mt-1">Review and manage student attendance photo submissions</div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Submissions" value={total} />
          <StatCard label="Pending Review" value={pending} />
          <StatCard label="Approved" value={accepted} />
          <StatCard label="Rejected" value={rejected} />
        </div>

        {/* Submissions by Subject */}
        <div className="mb-8">
          <div className="font-bold text-lg md:text-xl mb-3">
            <span style={{ color: '#222' }}>Submissions by </span>
            <span style={{ color: '#0F9D78' }}>Subject</span>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {subjectOptions
                .filter((s) => s !== 'All Subjects')
                .map((subj) => (
                  <div
                    key={subj}
                    className="bg-emerald-50 rounded-lg p-4 flex flex-col items-center justify-center text-center transition-all duration-200 subject-hover-card"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="font-bold text-base md:text-lg text-emerald-700 mb-1">{subj}</div>
                    <div className="text-xs text-gray-500">Submissions: {cards.filter(c => c.subject === subj).length}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Filter Row */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center mb-8">
          <input
            className="border border-gray-300 rounded-md px-3 py-2 text-sm md:flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            placeholder="Search by student name, ID, or subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={degree}
            onChange={e => { setDegree(e.target.value); setYear('All'); setSemester('All'); }}
          >
            {degreeOptions.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={year}
            onChange={e => { setYear(e.target.value); setSemester('All'); }}
          >
            {yearOptions.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={semester}
            onChange={e => setSemester(e.target.value)}
          >
            {semesterOptions.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          >
            {subjectOptions.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
          <button
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md px-5 py-2 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
            onClick={handleApproveAll}
          >
            Approve All Visible
          </button>
        </div>

        {/* Submission Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((card, idx) => (
            <SubmissionCard
              key={card.id}
              card={card}
              onApprove={() => handleApprove(card.id)}
              onReject={() => handleReject(card.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-10">No submissions found.</div>
          )}
        </div>
        {/* Add margin at the bottom so footer is not stuck to content */}
        <div style={{ height: '48px' }} />
      </main>
      <Footer />
      <style>{`
        .subject-hover-card:hover {
          transform: scale(1.07);
          box-shadow: 0 8px 32px 0 rgba(16, 185, 129, 0.18), 0 1.5px 8px 0 rgba(16, 185, 129, 0.10);
          z-index: 1;
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-5 flex flex-col items-center justify-center text-center">
      <div className="text-2xl md:text-3xl font-extrabold text-emerald-700 mb-1">{value}</div>
      <div className="text-xs md:text-sm text-gray-500 font-semibold">{label}</div>
    </div>
  );
}

function SubmissionCard({ card, onApprove, onReject }) {
  const statusColor =
    card.status === 'Accepted'
      ? 'bg-emerald-500 text-white'
      : card.status === 'Pending'
        ? 'bg-yellow-400 text-yellow-900'
        : 'bg-red-500 text-white';

  const locationText = card.branch
    ? `${card.branch}${card.year ? ` · Year ${card.year}` : ''}${card.sem_roman ? ` · Sem ${card.sem_roman}` : ''}`
    : '—';

  const courseContextText = card.program
    ? `${card.program}${card.year ? ' • Year ' + card.year : ''}${card.sem_roman ? ' • Sem ' + card.sem_roman : ''}`
    : '';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Image Section - Top (Hero) */}
      <div className="relative h-56 bg-gray-100 group">
        {card.photoUrl ? (
          <img
            src={card.photoUrl}
            alt={`Attendance for ${card.name}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 flex-col gap-2">
            <i className="bi bi-image text-3xl opacity-50"></i>
            <span className="text-xs">No Photo</span>
          </div>
        )}

        {/* Status Badge Overlay */}
        <div className="absolute top-3 right-3">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full shadow-sm ${statusColor}`}>
            {card.status}
          </span>
        </div>

        {/* Date Overlay (Bottom Left of Image) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <div className="text-white text-xs font-medium flex items-center gap-1.5">
            <i className="bi bi-calendar3 opacity-80"></i>
            {card.date} <span className="opacity-60">|</span> {card.time}
          </div>
        </div>
      </div>

      {/* Details "Box" - Bottom */}
      <div className="p-4 flex flex-col gap-2 flex-1">

        {/* Header: Name & ID */}
        <div className="mb-1">
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-gray-900 text-lg leading-tight truncate pr-2">{card.name}</h3>
          </div>
          <p className="text-xs text-gray-500 font-medium">ID: {card.displayId}</p>
        </div>

        {/* Subject & Context */}
        <div className="bg-gray-50 rounded-xl p-3 mb-2">
          <div className="text-sm font-bold text-gray-800 mb-0.5 line-clamp-1" title={card.subject}>
            {card.subject}
          </div>
          {courseContextText && (
            <div className="text-xs text-gray-500 line-clamp-1">
              {courseContextText}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-auto pt-2">
          {card.status === 'Pending' ? (
            <div className="flex gap-2">
              <button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl py-2.5 transition-colors shadow-sm active:transform active:scale-95"
                onClick={onApprove}
              >
                Approve
              </button>
              <button
                className="flex-1 bg-white border border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold rounded-xl py-2.5 transition-colors active:transform active:scale-95"
                onClick={onReject}
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="text-center pt-1">
              {card.status === 'Rejected' && (
                <p className="text-xs text-red-500 font-medium bg-red-50 py-1 px-2 rounded-lg inline-block">
                  <i className="bi bi-x-circle-fill me-1"></i> Rejected
                </p>
              )}
              {card.status === 'Accepted' && (
                <p className="text-xs text-emerald-600 font-medium bg-emerald-50 py-1 px-2 rounded-lg inline-block">
                  <i className="bi bi-check-circle-fill me-1"></i> Verified
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
