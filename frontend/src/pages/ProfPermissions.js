import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import ProfHeaderNav from '../components/ProfHeaderNav';
import Footer from '../components/Footer';
import { BACKEND_URL } from '../config';

// Backend API base (do not change UI, only data source)
const API_BASE = BACKEND_URL;

export default function PermissionManagementPage() {
	const auth = getAuth();
	const [activeTab, setActiveTab] = useState('subjects');
	const [showModal, setShowModal] = useState(false);
	const [subjects, setSubjects] = useState([]);
	const [permissions, setPermissions] = useState([]);

	// Helper: normalize subjects from profile into array of clean names (no quotes/brackets)
	const parseSubjects = (raw) => {
		if (!raw) return [];
		// If already an array
		if (Array.isArray(raw)) {
			return raw
				.map((s) => (typeof s === 'string' ? s.trim() : String(s)))
				.filter((s) => s.length > 0);
		}
		// If string, try strict JSON first, then lenient cleanup
		if (typeof raw === 'string') {
			const trimmed = raw.trim();
			// Try JSON with double quotes
			try {
				if (trimmed.startsWith('[') && trimmed.endsWith(']') && trimmed.includes('"')) {
					const arr = JSON.parse(trimmed);
					return parseSubjects(arr);
				}
			} catch { /* ignore */ }
			// Try converting single quotes to double quotes and parse
			try {
				if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
					const asJson = trimmed.replace(/'/g, '"');
					const arr = JSON.parse(asJson);
					return parseSubjects(arr);
				}
			} catch { /* ignore */ }
			// Lenient fallback: strip outer [] and quotes, then split by comma
			const normalized = trimmed
				.replace(/^\s*\[|\]\s*$/g, '')
				.replace(/["']/g, '');
			return normalized
				.split(',')
				.map((s) => s.trim())
				.filter((s) => s.length > 0);
		}
		// Last resort: try JSON.parse on unknown types
		try {
			const parsed = JSON.parse(raw);
			return parseSubjects(parsed);
		} catch {
			return [];
		}
	};

	// Fetch subjects from backend profile on mount
	useEffect(() => {
		let cancelled = false;
		const loadSubjects = async () => {
			try {
				const user = auth.currentUser;
				if (!user) return; // wait for auth elsewhere
				const token = await user.getIdToken();
				const resp = await fetch(`${API_BASE}/api/professor-profile/me`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!resp.ok) return;
				const json = await resp.json();
				const names = parseSubjects(json?.profile?.subjects);
				const normalized = names.map((name) => ({ name, code: '', status: 'Active' }));
				if (!cancelled) setSubjects(normalized);
			} catch {
				// Silent fallback: keep subjects empty on error
			}
		};
		loadSubjects();
		return () => {
			cancelled = true;
		};
	}, [auth]);

	// Fetch permissions from backend
	useEffect(() => {
		let cancelled = false;
		const loadPermissions = async () => {
			try {
				const user = auth.currentUser;
				if (!user) return;
				const token = await user.getIdToken();
				const resp = await fetch(`${API_BASE}/api/attendance-permissions`, {
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!resp.ok) return;
				const json = await resp.json();
				const mapped = (json?.permissions || []).map((p) => ({
					id: p.id,
					subject: p.subject,
					date: p.date,
					start_time: p.start_time,
					end_time: p.end_time,
					status: p.status || 'Active',
					locationRequired: p.location_required ?? true,
					timeWindow: `${p.start_time?.slice(0, 5) || ''} - ${p.end_time?.slice(0, 5) || ''}`,
				}));
				if (!cancelled) setPermissions(mapped);
			} catch {
				// silent
			}
		};
		loadPermissions();
		return () => {
			cancelled = true;
		};
	}, [auth]);

	// Toggle status for a single subject
	const handleToggleSubject = (idx) => {
		setSubjects((prev) =>
			prev.map((s, i) =>
				i === idx ? { ...s, status: s.status === 'Active' ? 'Inactive' : 'Active' } : s
			)
		);
	};


	const handleAddPermission = async (payload) => {
		try {
			const user = auth.currentUser;
			if (!user) return;
			const token = await user.getIdToken();
			const body = {
				subject: payload.subject,
				date: payload.date,
				start_time: payload.startTime,
				end_time: payload.endTime,
				status: 'Active',
				location_required: payload.locationRequired,
				latitude: payload.latitude,
				longitude: payload.longitude,
				latitude: payload.latitude,
				longitude: payload.longitude,
				radius_meters: payload.radius,
				session_hours: payload.session_hours
			};
			const resp = await fetch(`${API_BASE}/api/attendance-permissions`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});
			if (!resp.ok) return;
			const json = await resp.json();
			const p = json?.permission;
			if (!p) return;
			setPermissions((prev) => [
				...prev,
				{
					id: p.id,
					subject: p.subject,
					date: p.date,
					start_time: p.start_time,
					end_time: p.end_time,
					status: p.status || 'Active',
					locationRequired: p.location_required ?? true,
					timeWindow: `${p.start_time?.slice(0, 5) || ''} - ${p.end_time?.slice(0, 5) || ''}`,
				},
			]);
			setShowModal(false);
		} catch {
			// silent
		}
	};
	const handleDeletePermission = async (id) => {
		try {
			const user = auth.currentUser;
			if (!user) return;
			const token = await user.getIdToken();
			const resp = await fetch(`${API_BASE}/api/attendance-permissions/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});
			if (!resp.ok) return;
			setPermissions((prev) => prev.filter((p) => p.id !== id));
		} catch {
			// silent
		}
	};

	const handleTogglePermission = async (id, nextStatus) => {
		try {
			const user = auth.currentUser;
			if (!user) return;
			const token = await user.getIdToken();
			const resp = await fetch(`${API_BASE}/api/attendance-permissions/${id}/status`, {
				method: 'PATCH',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ status: nextStatus }),
			});
			if (!resp.ok) return;
			const json = await resp.json();
			const p = json?.permission;
			if (!p) return;
			setPermissions((prev) =>
				prev.map((item) =>
					item.id === p.id
						? {
							...item,
							status: p.status || 'Active',
							locationRequired: p.location_required ?? item.locationRequired,
						}
						: item
				)
			);
		} catch {
			// silent
		}
	};

	return (
		<div>
			<ProfHeaderNav />
			<div className="min-h-screen bg-gray-50 pt-2 px-2 md:px-8 flex flex-col">
				<div className="max-w-6xl mx-auto flex-1">
					{/* Page Header */}
					<div className="mb-6 text-left">
						<h1 className="text-3xl md:text-4xl font-bold">
							<span className="text-gray-900">Permission </span>
							<span className="text-emerald-600">Management</span>
						</h1>
						<div className="text-gray-500 text-base mt-2">Manage subjects and set attendance permissions for your classes</div>
					</div>
					<div className="w-full flex flex-col items-start">
						<div className="flex border-b border-gray-200 mb-8 justify-start w-full">
							<div className="flex">
								<button
									className={`px-6 py-2 font-semibold border-b-4 focus:outline-none flex items-center ${activeTab === 'subjects'
										? 'text-emerald-700 border-emerald-600 -mb-px'
										: 'text-gray-500 border-transparent hover:text-emerald-700'
										}`}
									style={{ minWidth: 160 }}
									onClick={() => setActiveTab('subjects')}
								>
									Subjects ({subjects.length})
								</button>
								<button
									className={`px-6 py-2 font-semibold border-b-4 focus:outline-none flex items-center ${activeTab === 'permissions'
										? 'text-emerald-700 border-emerald-600 -mb-px'
										: 'text-gray-500 border-transparent hover:text-emerald-700'
										}`}
									style={{ minWidth: 160 }}
									onClick={() => setActiveTab('permissions')}
								>
									Permissions ({permissions.length})
								</button>
							</div>
						</div>
					</div>
					{/* Panels */}
					{activeTab === 'subjects' ? (
						<>
							<SubjectsPanel subjects={subjects} onToggleSubject={handleToggleSubject} />
							<div className="h-16" />
						</>
					) : (
						<PermissionsPanel
							permissions={permissions}
							onAddPermission={() => setShowModal(true)}
							onTogglePermission={handleTogglePermission}
							onDeletePermission={handleDeletePermission}
						/>
					)}
				</div>
				{showModal && (
					<AddPermissionModal
						onClose={() => setShowModal(false)}
						onAdd={handleAddPermission}
						subjects={subjects}
					/>
				)}
				<Footer />
			</div>
		</div>
	);
}

// Render subject name with alternating colors per word: black, green, black, green...
function renderColoredName(name) {
	if (!name) return null;
	const parts = String(name).split(/\s+/).filter(Boolean);
	return (
		<>
			{parts.map((word, idx) => (
				<span
					key={idx}
					className={idx % 2 === 1 ? 'text-emerald-600' : 'text-gray-900'}
				>
					{word}{idx < parts.length - 1 ? ' ' : ''}
				</span>
			))}
		</>
	);
}

function SubjectsPanel({ subjects, onToggleSubject }) {
	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{subjects.map((subject, idx) => (
					<SubjectCard key={idx} {...subject} onToggle={() => onToggleSubject(idx)} />
				))}
			</div>
			{subjects.length === 0 && (
				<p className="text-gray-500 text-sm mt-2">No subjects found</p>
			)}
		</>
	);
}

function SubjectCard({ name, code /*, status, onToggle */ }) {
	return (
		<div className="relative bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col transform transition-transform duration-200 hover:scale-105 hover:shadow-lg">
			{/* status badge removed as requested */}
			<div className="font-bold text-lg mb-1">{renderColoredName(name)}</div>
			<div className="text-gray-400 text-sm mb-2">{code}</div>
			{/* action button removed as requested */}
		</div>
	);
}

function PermissionCard({ subject, date, timeWindow, locationRequired, status, onToggle, onDelete }) {
	const active = status === 'Active';
	const [showEditOptions, setShowEditOptions] = useState(false);

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col relative">
			<span className={`absolute top-4 right-4 text-xs font-bold px-3 py-1 rounded-full ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-black'}`}>{active ? 'Active' : 'Inactive'}</span>
			<div className="font-bold text-lg mb-1">{subject}</div>
			<div className="text-gray-400 text-sm mb-2">Date: {date}</div>
			<div className="text-gray-400 text-sm mb-2">Time Window: {timeWindow}</div>
			<div className="text-gray-400 text-sm mb-2">Location Required: {locationRequired ? 'Yes' : 'No'}</div>
			<div className="flex gap-2 mt-auto">
				<button
					className={`font-bold py-2 rounded w-full transition ${active ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
					onClick={() => onToggle && onToggle(active ? 'Inactive' : 'Active')}
				>
					{active ? 'Deactivate' : 'Activate'}
				</button>
				<div className="relative">
					<button
						type="button"
						className="ml-2 px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm border border-gray-200 transition"
						onClick={() => setShowEditOptions((v) => !v)}
					>
						<i className="bi bi-pencil" /> Edit
					</button>
					{showEditOptions && (
						<div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-lg z-10">
							<button
								className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
								onClick={() => {
									setShowEditOptions(false);
									onDelete?.();
								}}
							>
								Delete
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function PermissionsPanel({ permissions, onAddPermission, onTogglePermission, onDeletePermission }) {
	return (
		<section className="bg-gray-50 px-0 md:px-2 py-2">
			{/* Section Header Row */}
			<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
				<h2 className="text-2xl font-bold text-gray-900 text-left">Attendance Permissions</h2>
				<button
					className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-sm transition-all duration-200 w-full sm:w-auto justify-center"
					style={{ minWidth: '140px' }}
					onClick={onAddPermission}
				>
					<i className="bi bi-plus-lg" />
					<span className="truncate">Add Permission</span>
				</button>
			</div>
			{/* Permission Cards - grid layout */}
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{permissions.map((perm, idx) => (
					<PermissionCard
						key={idx}
						subject={perm.subject}
						date={perm.date}
						timeWindow={perm.timeWindow}
						locationRequired={perm.locationRequired}
						status={perm.status}
						onToggle={(nextStatus) => onTogglePermission && perm.id && onTogglePermission(perm.id, nextStatus)}
						onDelete={() => perm.id && onDeletePermission && onDeletePermission(perm.id)}
					/>
				))}
			</div>
		</section>
	);
}

function AddSubjectButton({ onClick }) {
	return (
		<button onClick={onClick} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded shadow-sm transition">+ Add Subject</button>
	);
}

function AddPermissionButton({ onClick }) {
	return (
		<button onClick={onClick} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded shadow-sm transition text-sm">+ Add Permission</button>
	);
}

function AddPermissionModal({ onClose, onAdd, subjects }) {
	const [degree, setDegree] = useState('');
	const [subject, setSubject] = useState('');
	const [date, setDate] = useState('');
	const [startTime, setStartTime] = useState('');
	const [endTime, setEndTime] = useState('');
	const [locationRequired, setLocationRequired] = useState(true);
	const [location, setLocation] = useState(null);
	const [locationError, setLocationError] = useState(null);
	const [fetchingLocation, setFetchingLocation] = useState(false);
	const [sessionHours, setSessionHours] = useState(1);

	// Auto-fetch location when modal opens or verification is checked
	useEffect(() => {
		if (locationRequired) {
			setFetchingLocation(true);
			setLocationError(null);
			if (!navigator.geolocation) {
				setLocationError('Geolocation is not supported by this browser.');
				setFetchingLocation(false);
				return;
			}
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setLocation({
						lat: position.coords.latitude,
						lng: position.coords.longitude
					});
					setFetchingLocation(false);
				},
				(error) => {
					console.error('Error fetching location:', error);
					setLocationError('Unable to retrieve location. Please allow location access.');
					setFetchingLocation(false);
				},
				{ enableHighAccuracy: true } // Request high accuracy for better radius checks
			);
		} else {
			setLocation(null);
			setLocationError(null);
			setFetchingLocation(false);
		}
	}, [locationRequired]);

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!subject || !date || !startTime || !endTime) return;

		if (locationRequired && !location) {
			alert('Location is required but could not be fetched. Please check permissions.');
			return;
		}

		onAdd({
			subject,
			date,
			startTime,
			endTime,
			locationRequired,
			latitude: location?.lat || null,
			longitude: location?.lng || null,
			radius: 150, // Default radius of 150 meters
			session_hours: sessionHours
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/10">
			<div className="bg-white border border-gray-200 rounded-xl shadow-lg p-6 w-full max-w-md" style={{ minWidth: 320, maxWidth: 480 }}>
				<div className="mb-4">
					<h2 className="font-bold text-lg text-gray-900">Add Attendance Permission</h2>
				</div>
				<form className="space-y-4" onSubmit={handleSubmit}>
					{/* Degree Dropdown */}
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">Degree *</label>
						<select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm" value={degree} onChange={e => setDegree(e.target.value)} required>
							<option value="" disabled>Select a degree…</option>
							<option value="BTech">BTech</option>
							<option value="MTech">MTech</option>
							<option value="MCA">MCA</option>
						</select>
					</div>
					{/* Subject Dropdown */}
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">Subject *</label>
						<select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm" value={subject} onChange={e => setSubject(e.target.value)} required>
							<option value="" disabled>Select a subject…</option>
							{Array.isArray(subjects) && subjects.length > 0
								? subjects.map((s, idx) => (
									<option key={idx} value={s.name}>{s.name}</option>
								))
								: null}
						</select>
					</div>
					{/* Date Input */}
					<div className="relative w-full">
						<label className="block text-xs font-medium text-gray-500 mb-1">Date *</label>
						<input type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm" placeholder="dd-mm-yyyy" value={date} onChange={e => setDate(e.target.value)} required />
						<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-500 pointer-events-none">
							<i className="bi bi-calendar" />
						</span>
					</div>
					{/* Time Row */}
					<div className="flex flex-col sm:flex-row gap-4 w-full">
						<div className="relative flex-1">
							<label className="block text-xs font-medium text-gray-500 mb-1">Start Time *</label>
							<input type="time" className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm" value={startTime} onChange={e => setStartTime(e.target.value)} required />
							<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-500 pointer-events-none">
								<i className="bi bi-clock" />
							</span>
						</div>
						<div className="relative flex-1">
							<label className="block text-xs font-medium text-gray-500 mb-1">End Time *</label>
							<input type="time" className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm" value={endTime} onChange={e => setEndTime(e.target.value)} required />
							<span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-500 pointer-events-none">
								<i className="bi bi-clock" />
							</span>
						</div>
					</div>
					{/* Session Duration Dropdown */}
					<div>
						<label className="block text-xs font-medium text-gray-500 mb-1">Session Duration (Hours) *</label>
						<select
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
							value={sessionHours}
							onChange={e => setSessionHours(Number(e.target.value))}
						>
							<option value={1}>1 Hour (1 Attendance)</option>
							<option value={2}>2 Hours (2 Attendance)</option>
							<option value={3}>3 Hours (3 Attendance)</option>
							<option value={4}>4 Hours (4 Attendance)</option>
						</select>
					</div>
					{/* Checkbox */}
					<div className="flex flex-col gap-1">
						<div className="flex items-center gap-2">
							<input type="checkbox" id="location-verification" className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" checked={locationRequired} onChange={e => setLocationRequired(e.target.checked)} />
							<label htmlFor="location-verification" className="text-xs text-gray-700">Require location verification (150m radius)</label>
						</div>
						{locationRequired && (
							<div className="ml-6 text-xs text-gray-500">
								{fetchingLocation && <span className="text-amber-600">Fetching location...</span>}
								{location && <span className="text-emerald-600">Location captured (Lat: {location.lat.toFixed(4)}, Lng: {location.lng.toFixed(4)})</span>}
								{locationError && <span className="text-red-600">{locationError}</span>}
							</div>
						)}
					</div>
					{/* Footer Buttons */}
					<div className="flex gap-3 mt-6">
						<button type="submit" disabled={locationRequired && !location} className={`flex-1 text-white rounded-md py-2 font-bold text-sm shadow ${locationRequired && !location ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>Add Permission</button>
						<button type="button" className="flex-1 bg-gray-200 text-gray-700 rounded-md py-2 font-semibold text-sm hover:bg-gray-300" onClick={onClose}>Cancel</button>
					</div>
				</form>
			</div>
		</div>
	);
}
