import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUser as setReduxUser, clearUser } from '../redux/userSlice';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();

  const API_URL = import.meta.env?.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';

  // Sync user to Redux whenever it changes
  useEffect(() => {
    if (user) {
      dispatch(setReduxUser({
        userId: user._id || user.id,
        email: user.email,
        plan: user.plan || 'free',
        resumeCount: user.resumeCount || 0,
      }));
    } else {
      dispatch(clearUser());
    }
  }, [user, dispatch]);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(data);
        } catch (error) {
          console.error("Invalid token:", error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkUser();
  }, [API_URL]);

  const login = async (email, password) => {
    const { data } = await axios.post(`${API_URL}/api/auth/login`, { email, password });
    localStorage.setItem('token', data.token);
    setUser(data);
  };

  const signup = async (email, password) => {
    const { data } = await axios.post(`${API_URL}/api/auth/register`, { email, password });
    localStorage.setItem('token', data.token);
    setUser(data);
  };

  const googleLogin = async (token) => {
    const { data } = await axios.post(`${API_URL}/api/auth/google`, { token });
    localStorage.setItem('token', data.token);
    setUser(data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Expose refreshUser for post-payment polling
  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const { data } = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(data);
        return data;
      } catch (error) {
        console.error("Refresh user error:", error);
      }
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, googleLogin, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
