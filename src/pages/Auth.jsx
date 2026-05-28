import { useState } from 'react';
import { useRealtimeSync } from '../context/RealtimeSyncContext';
import { BookOpen, User, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Auth() {
  const { signUp, loginWithPassword, login, authError, isSupabaseConfigured } = useRealtimeSync();
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  
  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (isSignUpMode) {
      if (!username.trim() || !email.trim() || !password.trim()) {
        setError('Please fill in all fields');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      setSubmitting(true);
      try {
        await signUp(email.trim(), password.trim(), username.trim());
      } catch (err) {
        setError(err.message || 'Error signing up');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (isSupabaseConfigured) {
        if (!email.trim() || !password.trim()) {
          setError('Please fill in email and password');
          return;
        }
        setSubmitting(true);
        try {
          await loginWithPassword(email.trim(), password.trim());
        } catch (err) {
          setError(err.message || 'Invalid email or password');
        } finally {
          setSubmitting(false);
        }
      } else {
        // Offline username fallback
        if (!username.trim()) {
          setError('Please enter a username');
          return;
        }
        login(username.trim());
      }
    }
  };

  const handleDemoLogin = () => {
    if (isSupabaseConfigured) {
      // Fast login with guest account using Supabase Anonymous auth
      login('Demo Scholar');
    } else {
      login('Demo Scholar');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      position: 'relative'
    }}>
      {/* Background Blobs */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
        top: '20%',
        left: '20%',
        zIndex: -1
      }}></div>
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12) 0%, transparent 70%)',
        bottom: '20%',
        right: '20%',
        zIndex: -1
      }}></div>

      <div className="glass-panel-glow" style={{
        width: '100%',
        maxWidth: '450px',
        padding: '40px',
        textAlign: 'center',
        border: '1px solid rgba(168, 85, 247, 0.2)'
      }}>
        {/* Logo */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
          borderRadius: '12px',
          width: '50px',
          height: '50px',
          color: 'white',
          marginBottom: '16px'
        }}>
          <BookOpen size={28} />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.2rem',
          fontWeight: 700,
          background: 'linear-gradient(135deg, white 60%, var(--color-primary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          FocusDen
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
          Collaborative Study Rooms for Deep Focus & Accountability.
        </p>

        {/* Database Status Alert Banner */}
        <div style={{ 
          marginBottom: '24px', 
          fontSize: '0.75rem', 
          fontWeight: 600, 
          padding: '6px 12px', 
          borderRadius: '12px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: isSupabaseConfigured ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
          border: isSupabaseConfigured ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(245, 158, 11, 0.25)',
          color: isSupabaseConfigured ? 'var(--color-success)' : '#f59e0b'
        }}>
          <span style={{ 
            width: '6px', 
            height: '6px', 
            borderRadius: '50%', 
            background: isSupabaseConfigured ? 'var(--color-success)' : '#f59e0b',
            display: 'inline-block'
          }}></span>
          {isSupabaseConfigured ? '⚡ Cloud Database Connected' : '⚠️ Offline Mock Mode Active'}
        </div>

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* USERNAME FIELD (Sign-up or Offline Login) */}
          {(isSignUpMode || !isSupabaseConfigured) && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }}>
                  <User size={18} />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MarieCurie"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ paddingLeft: '42px', width: '100%' }}
                />
              </div>
            </div>
          )}

          {/* EMAIL & PASSWORD FIELDS (Cloud Supabase Login/Signup only) */}
          {isSupabaseConfigured && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '42px', width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }}>
                    <Lock size={18} />
                  </span>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: '42px', width: '100%' }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Errors log */}
          {(error || authError) && (
            <span style={{ color: 'var(--color-accent)', fontSize: '0.85rem', textAlign: 'left' }}>
              {error || authError}
            </span>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
            disabled={submitting}
          >
            {submitting ? 'Please wait...' : (isSignUpMode ? 'Register Account' : 'Sign In')} <ArrowRight size={18} />
          </button>
        </form>

        {/* Auth Toggle (Cloud mode only) */}
        {isSupabaseConfigured && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '16px' }}>
            {isSignUpMode ? 'Already have an account?' : "Don't have an account yet?"}{' '}
            <span 
              onClick={() => {
                setIsSignUpMode(!isSignUpMode);
                setError('');
              }} 
              style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }}
            >
              {isSignUpMode ? 'Log In' : 'Sign Up'}
            </span>
          </p>
        )}

        <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }}></div>
        </div>

        {/* Demo Fast Login Button */}
        <button
          className="btn btn-secondary"
          onClick={handleDemoLogin}
          style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(168, 85, 247, 0.1)',
            borderColor: 'rgba(168, 85, 247, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <ShieldCheck size={18} style={{ color: 'var(--color-primary)' }} />
          One-Click Guest Access
        </button>

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div>🔒 Secure HTTPS Auth</div>
          <div>✨ Free & Zero Cost</div>
        </div>
      </div>
    </div>
  );
}
