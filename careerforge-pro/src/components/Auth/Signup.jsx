import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Zap, Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';
import './Auth.css';

export default function Signup() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { signup, googleLogin } = useAuth();

  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) {
        toast.error('Google Signup needs a valid Client ID in your .env file to work.');
        return;
      }
      setLoading(true);
      try {
        await googleLogin(tokenResponse.access_token);
        toast.success('Account created! Welcome to CareerForge.');
        navigate('/builder');
      } catch (error) {
        toast.error('Google signup failed. ' + (error.response?.data?.error || error.message));
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error('Google Signup Failed'),
  });

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
      setLoading(false);
      toast.success('Account created! Welcome to CareerForge.');
      navigate('/builder');
    } catch (error) {
      setLoading(false);
      toast.error(error.response?.data?.error || error.message || 'Signup failed');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow auth-glow--1" />
      <div className="auth-glow auth-glow--2" />

      <div className="auth-card">
        <div className="auth-card__header">
          <Link to="/" className="auth-logo">
            <Zap size={24} />
            <span>CareerForge</span>
          </Link>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Start building ATS-optimized resumes in seconds</p>
        </div>

        <form className="auth-form" onSubmit={handleSignup}>
          <div className="auth-field">
            <label htmlFor="signup-name">Full Name</label>
            <div className="auth-input-wrap">
              <User size={18} />
              <input
                id="signup-name"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-email">Email</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="signup-password">Password</label>
            <div className="auth-input-wrap">
              <Lock size={18} />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="auth-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-divider">
          <span>Or continue with</span>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleSignup}
          className="auth-google-btn"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <p className="auth-footer-text">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
