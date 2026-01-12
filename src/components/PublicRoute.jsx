import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PublicRoute = ({ children }) => {
    const { currentUser } = useContext(AuthContext);

    if (currentUser) {
        if (currentUser.roles.includes("ROLE_ADMIN")) {
            return <Navigate to="/admin" replace />;
        }
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default PublicRoute;
