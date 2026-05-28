import { RealtimeSyncProvider, useRealtimeSync } from './context/RealtimeSyncContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import StudyRoom from './pages/StudyRoom';
import { BookOpen, LogOut, Flame, Trophy } from 'lucide-react';

function AppContent() {
  const { user, logout, stats, activeRoomId, loading, leaveRoom } = useRealtimeSync();

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(168, 85, 247, 0.1)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontFamily: 'var(--font-display)', letterSpacing: '1.5px', fontWeight: 600 }}>SYNCHRONIZING CONNECTIVITY...</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="app-container">
      {/* Universal Sticky Header */}
      <header className="navbar">
        <a href="#" className="nav-brand" onClick={(e) => { 
          e.preventDefault(); 
          if (activeRoomId) {
            leaveRoom(activeRoomId);
          }
        }}>
          <span><BookOpen size={18} /></span> FocusDen
        </a>
        
        <div className="nav-menu">
          {/* Daily Streak Indicator */}
          <div className="user-badge-nav">
            <Flame size={16} className="streak" fill="#f43f5e" stroke="none" />
            <span><strong className="streak">{stats.streakDays}d</strong> Streak</span>
          </div>

          {/* XP Tracker */}
          <div className="user-badge-nav">
            <Trophy size={16} className="xp" />
            <span><strong className="xp">{stats.xp}</strong> XP</span>
          </div>

          {/* User Profile Dropdown / Card */}
          <div className="user-badge-nav" style={{ gap: '12px' }}>
            <span style={{ display: 'inline-flex', width: '8px', height: '8px', borderRadius: '50%', background: user.avatarColor || '#a855f7' }}></span>
            <span style={{ fontWeight: 500 }}>{user.name}</span>
          </div>

          {/* Logout Button */}
          <button className="btn btn-icon-only" onClick={logout} title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Page Area */}
      <main className="main-content">
        {activeRoomId ? <StudyRoom /> : <Dashboard />}
      </main>
    </div>
  );
}

function App() {
  return (
    <RealtimeSyncProvider>
      <AppContent />
    </RealtimeSyncProvider>
  );
}

export default App;
