import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export default function RequireVerifiedProfessor({ children }) {
    const { user, profile, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f8faf5]">
                <div className="text-xl font-semibold text-emerald-700 animate-pulse">Loading...</div>
            </div>
        );
    }

    // 1. Check Authentication
    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // 2. Check Role
    if (!profile || profile.role !== 'professor') {
        return <Navigate to="/home" replace />;
    }

    // 3. Check Verification Status
    // We check for 'Verified' string or boolean true (handling both legacy and new formats)
    // 3. Check Verification Status
    const isVerified =
        profile.verificationStatus === 'Verified' ||
        profile.verification_status === 'Verified' || // Check backend snake_case
        profile.isVerified === true ||
        (user.emailVerified && profile.verificationStatus === 'Verified');

    if (!isVerified) {
        // Redirect to profile with a message
        return <Navigate to="/professor/profile" state={{
            message: "Access Denied: You must verify your profile with the secret code to access this page.",
            type: "error"
        }} replace />;
    }

    return children;
}
