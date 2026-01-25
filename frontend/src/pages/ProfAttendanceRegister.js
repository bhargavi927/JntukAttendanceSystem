import React, { useEffect, useState, useMemo } from 'react';
import { getAuth } from 'firebase/auth';
import ProfHeaderNav from '../components/ProfHeaderNav';
import Footer from '../components/Footer';
import { BACKEND_URL } from '../config';

const API_BASE = BACKEND_URL;

export default function ProfAttendanceRegister() {
    const auth = getAuth();
    const [loading, setLoading] = useState(true);
    const [submissions, setSubmissions] = useState([]);
    const [degree, setDegree] = useState('All');
    const [year, setYear] = useState('All');
    const [semester, setSemester] = useState('All');
    const [subject, setSubject] = useState('All Subjects');

    // Modal State
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const fetchAttendance = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;
                setLoading(true);
                const token = await user.getIdToken();

                // Fetch ALL submissions for this professor
                const resp = await fetch(`${API_BASE}/api/attendance-submissions`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (cancelled) return;

                if (resp.ok) {
                    const json = await resp.json();
                    setSubmissions(json.submissions || []);
                }
            } catch (err) {
                console.error('Failed to fetch register', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchAttendance();
        return () => { cancelled = true; };
    }, [auth]);

    // --- Filtering Logic ---
    const filteredData = useMemo(() => {
        return submissions.filter(sub => {
            const matchDegree = degree === 'All' || sub.program === degree;
            const matchYear = year === 'All' || sub.year == year;
            const matchSem = semester === 'All' || sub.sem_roman == semester;
            const matchSubject = subject === 'All Subjects' || sub.subject === subject;
            return matchDegree && matchYear && matchSem && matchSubject;
        });
    }, [submissions, degree, year, semester, subject]);

    // --- Aggregation Logic ---
    const studentStats = useMemo(() => {
        const stats = {};
        filteredData.forEach(sub => {
            const id = sub.student_reg_no || sub.student_id;
            if (!stats[id]) {
                stats[id] = {
                    name: sub.student_reg_no,
                    id: id,
                    program: sub.program,
                    branch: sub.branch,
                    year: sub.year,
                    sem: sub.sem_roman,
                    acceptedCount: 0,
                    totalCount: 0,
                    subjects: new Set(),
                    history: [] // Store all records for this student
                };
            }
            if (sub.status === 'Accepted') {
                stats[id].acceptedCount += 1;
            }
            stats[id].totalCount += 1;
            stats[id].subjects.add(sub.subject);
            stats[id].history.push(sub);
        });

        // Sort history by date desc for each student
        Object.values(stats).forEach(student => {
            student.history.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
        });

        return Object.values(stats);
    }, [filteredData]);

    // --- Dropdown Options ---
    const degreeOptions = useMemo(() => ['All', ...new Set(submissions.map(s => s.program).filter(Boolean))], [submissions]);
    const yearOptions = useMemo(() => {
        const relevant = degree === 'All' ? submissions : submissions.filter(s => s.program === degree);
        return ['All', ...new Set(relevant.map(s => s.year).filter(Boolean))].sort();
    }, [submissions, degree]);
    const semOptions = useMemo(() => ['All', ...new Set(submissions.map(s => s.sem_roman).filter(Boolean))], [submissions]);
    const subjectOptions = useMemo(() => ['All Subjects', ...new Set(submissions.map(s => s.subject).filter(Boolean))], [submissions]);

    // --- Actions ---
    const handleRowClick = (student) => {
        setSelectedStudent(student);
        setHistoryModalOpen(true);
    };

    const handleUpdateStatus = async (submissionId, newStatus) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const resp = await fetch(`${API_BASE}/api/attendance-submissions/${submissionId}/status`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (resp.ok) {
                // Update local state directly to reflect change immediately
                setSubmissions(prev => prev.map(s =>
                    s.id === submissionId ? { ...s, status: newStatus } : s
                ));

                // Also update the selected student's history in the modal view if open
                if (selectedStudent) {
                    setSelectedStudent(prev => ({
                        ...prev,
                        history: prev.history.map(h => h.id === submissionId ? { ...h, status: newStatus } : h)
                    }));
                }
            } else {
                alert('Failed to update status');
            }
        } catch (err) {
            console.error(err);
            alert('Error updating status');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <ProfHeaderNav />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10" style={{ marginTop: '24px' }}>
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900">
                        Attendance <span className="text-emerald-600">Register</span>
                    </h1>
                    <p className="mt-2 text-gray-600">Click on any student to view detailed history and edit records.</p>
                    <p className="text-xs text-gray-400 mt-1">Total: {submissions.length} | Visible: {filteredData.length}</p>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-col md:flex-row gap-4">
                    <select className="border p-2 rounded-lg" value={degree} onChange={e => setDegree(e.target.value)}>
                        {degreeOptions.map(o => <option key={o} value={o}>{o === 'All' ? 'All Degrees' : o}</option>)}
                    </select>
                    <select className="border p-2 rounded-lg" value={year} onChange={e => setYear(e.target.value)}>
                        {yearOptions.map(o => <option key={o} value={o}>{o === 'All' ? 'All Years' : `Year ${o}`}</option>)}
                    </select>
                    <select className="border p-2 rounded-lg" value={semester} onChange={e => setSemester(e.target.value)}>
                        {semOptions.map(o => <option key={o} value={o}>{o === 'All' ? 'All Semesters' : `Sem ${o}`}</option>)}
                    </select>
                    <select className="border p-2 rounded-lg" value={subject} onChange={e => setSubject(e.target.value)}>
                        {subjectOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                {/* Table/List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-10 text-center text-gray-500">Loading attendance records...</div>
                    ) : studentStats.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">No attendance records found for these filters.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reg No</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subjects</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Classes Attended</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {studentStats.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => handleRowClick(student)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{student.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {student.program} {student.year ? `- Year ${student.year}` : ''} {student.sem ? `- Sem ${student.sem}` : ''}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {Array.from(student.subjects).join(', ')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                                    {student.acceptedCount} / {student.totalCount}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <span className="text-emerald-600 hover:text-emerald-900">View History</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* History Modal */}
            {historyModalOpen && selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Attendance History</h3>
                                <p className="text-sm text-gray-500">{selectedStudent.name} • {selectedStudent.program}</p>
                            </div>
                            <button
                                onClick={() => setHistoryModalOpen(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <i className="bi bi-x-lg text-xl" />
                            </button>
                        </div>

                        <div className="overflow-y-auto p-6 flex-1 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Date/Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Subject</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Photo</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Edit</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {selectedStudent.history.map((record) => (
                                        <tr key={record.id}>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div>{record.date}</div>
                                                <div className="text-gray-500 text-xs">{record.time}</div>
                                                {record.latitude && <div className="text-xs text-blue-600 mt-1" title="Location verified"><i className="bi bi-geo-alt-fill" /> Verified</div>}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{record.subject}</td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                {record.photo_url ? (
                                                    <a href={record.photo_url} target="_blank" rel="noopener noreferrer">
                                                        <img src={record.photo_url} alt="Proof" className="h-10 w-10 rounded object-cover border border-gray-200 hover:scale-150 transition-transform origin-left" />
                                                    </a>
                                                ) : <span className="text-xs text-gray-400">No Photo</span>}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <StatusBadge status={record.status} />
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <select
                                                    className="border border-gray-300 rounded text-xs px-2 py-1"
                                                    value={record.status}
                                                    onChange={(e) => handleUpdateStatus(record.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="Accepted">Accepted</option>
                                                    <option value="Rejected">Rejected</option>
                                                    <option value="Pending">Pending</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
}

function StatusBadge({ status }) {
    const colors = {
        Accepted: 'bg-emerald-100 text-emerald-800',
        Rejected: 'bg-red-100 text-red-800',
        Pending: 'bg-yellow-100 text-yellow-800'
    };
    const c = colors[status] || 'bg-gray-100 text-gray-800';
    return (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${c}`}>
            {status}
        </span>
    );
}
