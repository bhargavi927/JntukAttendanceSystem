import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export default function RequireVerifiedStudent({ children }) {
    const { user, profile, loading } = React.useContext(AuthContext);
    const location = useLocation();

    if (loading) {
        return <div className="p-4">Loading...</div>; // Or your PageLoader
    }

    if (!user) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    // Check role
    if (profile?.role !== 'student') {
        // Determine where to send non-students (e.g., professor home)
        return <Navigate to="/professor/home" replace />;
    }

    // Check verification
    const isVerified =
        profile?.verificationStatus === 'Verified' ||
        profile?.verification_status === 'Verified' ||
        profile?.isVerified === true ||
        profile?.verified === true;

    if (!isVerified) {
        // Redirect to profile with message
        return (
            <Navigate
                to="/profile"
                state={{ message: 'Please verify your profile to access this page.' }}
                replace
            />
        );
    }

    return children;
}
