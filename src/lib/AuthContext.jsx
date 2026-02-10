import React, { createContext, useState, useContext, useEffect } from 'react';
import { mc } from '@/api/mcClient';

const AuthContext = createContext();
const ONBOARDING_DISMISSED_KEY_PREFIX = "mindcircle_onboarding_dismissed_v1:";

function clearOnboardingDismissal(userId) {
  if (!userId) return;
  try {
    sessionStorage.removeItem(`${ONBOARDING_DISMISSED_KEY_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({
    id: "local-app",
    public_settings: {}
  });

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);
      const currentUser = await mc.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsAuthenticated(false);
      setAuthError({
        type: 'auth_required',
        message: 'Authentication required'
      });
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    clearOnboardingDismissal(user?.id);
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      mc.auth.logout('/Login');
    } else {
      mc.auth.logout();
    }
  };

  const navigateToLogin = () => {
    mc.auth.redirectToLogin();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState: checkUserAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
