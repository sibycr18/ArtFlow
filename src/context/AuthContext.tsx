import React, { createContext, useContext, useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';

interface User {
  id?: string;  // Supabase user ID
  email: string;
  name: string;
  picture: string;
  sub: string;
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    console.log('Checking for existing session...');
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        console.log('Found stored user data:', storedUser);
        const parsedUser = JSON.parse(storedUser);
        console.log('Parsed user data:', parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    } else {
      console.log('No stored user data found');
    }
    setIsLoading(false);
  }, []);

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    localStorage.removeItem('user');
    navigate('/login');
  };

  const value = {
    user,
    setUser: (newUser: User | null) => {
      console.log('Setting user:', newUser);
      setUser(newUser);
      if (newUser) {
        console.log('Storing user data in localStorage');
        localStorage.setItem('user', JSON.stringify(newUser));
      } else {
        console.log('Removing user data from localStorage');
        localStorage.removeItem('user');
      }
    },
    isLoading,
    logout,
  };

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('Google Client ID is not set in environment variables');
    return <div>Configuration Error: Google Client ID not found</div>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
