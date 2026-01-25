import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }){
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  if(loading) return <div className="p-6 bg-white rounded">Loading...</div>;
  if(!user) return <Navigate to="/" state={{ from: location }} replace />;
  return children;
}
