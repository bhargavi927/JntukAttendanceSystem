import React, { useEffect, useState } from 'react';
import { fetchAllUsers } from '../firebase';

export default function AdminDashboard(){
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(()=>{
    let mounted = true;
    async function load(){
      setError(null);
      try{
        const all = await fetchAllUsers();
        if(mounted) setUsers(all);
      }catch(err){
        setError(err.message);
      }finally{ if(mounted) setLoading(false) }
    }
    load();
    return ()=>{ mounted=false }
  },[])

  return (
    <div className="min-h-screen w-full bg-[#f8faf5] p-6">
      <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded shadow overflow-auto">
        <h1 className="text-2xl font-bold mb-4 text-emerald-900">Admin Dashboard</h1>
        {loading && <p className="text-gray-600">Loading users...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
                <th className="p-2">Branch</th>
                <th className="p-2">Phone</th>
                <th className="p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u=> (
                <tr key={u.uid} className="border-b hover:bg-gray-50">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role}</td>
                  <td className="p-2">{u.branch}</td>
                  <td className="p-2">{u.phone}</td>
                  <td className="p-2">{u.createdAt?.toDate ? u.createdAt.toDate().toLocaleString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
