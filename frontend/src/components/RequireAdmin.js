import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function RequireAdmin({ children }){
  const { user, profile, loading } = useContext(AuthContext);
  if(loading) return <div className="p-6 bg-white rounded">Loading...</div>;
  if(!user) return <Navigate to="/" replace />;
  if(profile?.role !== 'admin'){
    return (
      <div className="w-full max-w-3xl p-6 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Access denied</h2>
        <p className="text-gray-700">You do not have permission to view this page.</p>
      </div>
    );
  }
  return children;
}
