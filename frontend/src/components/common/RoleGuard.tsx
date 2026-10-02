import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface RoleGuardProps {
  allowedRoles?: string[];
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Normalize role string comparison
  const userRole = user.role?.toLowerCase();
  const normalizedAllowed = allowedRoles?.map((r) => r.toLowerCase());

  if (normalizedAllowed && normalizedAllowed.length > 0) {
    // Admin always has access to all operational consoles in emergency/super-user mode
    if (userRole === 'admin') {
      return <>{children}</>;
    }

    // Role mapping compatibility for regulatory_stakeholder / regulator
    const hasMatch = normalizedAllowed.some(
      (r) =>
        r === userRole ||
        (r === 'regulator' && userRole === 'regulatory_stakeholder') ||
        (r === 'regulatory_stakeholder' && userRole === 'regulator')
    );

    if (!hasMatch) {
      // Redirect based on actual role
      if (userRole === 'operator') return <Navigate to="/dashboard" replace />;
      if (userRole === 'auditor') return <Navigate to="/auditor" replace />;
      if (userRole === 'regulator' || userRole === 'regulatory_stakeholder') return <Navigate to="/regulator" replace />;
      if (userRole === 'admin') return <Navigate to="/admin" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
