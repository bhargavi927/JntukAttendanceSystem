import React, { useState } from 'react';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

export default function AdminSetUserRole() {
  const [uid, setUid] = useState('');
  const [role, setRole] = useState('professor');
  const [status, setStatus] = useState('');

  const handleSetRole = async (e) => {
    e.preventDefault();
    setStatus('');
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        setStatus('User not found.');
        return;
      }
      await updateDoc(userRef, { role });
      setStatus(`Role updated to '${role}' for user ${uid}`);
    } catch (err) {
      setStatus('Error: ' + (err.message || err));
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border rounded-xl shadow p-6 mt-10">
      <h2 className="text-xl font-bold mb-4">Admin: Set User Role</h2>
      <form onSubmit={handleSetRole} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">User UID</label>
          <input
            type="text"
            value={uid}
            onChange={e => setUid(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="professor">professor</option>
            <option value="student">student</option>
          </select>
        </div>
        <button type="submit" className="px-4 py-2 rounded bg-emerald-600 text-white font-semibold">Set Role</button>
      </form>
      {status && <div className="mt-4 text-sm">{status}</div>}
    </div>
  );
}
