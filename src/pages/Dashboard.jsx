import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeSync } from '../context/RealtimeSyncContext';
import { 
  Search, Plus, Users, Clock, Hash, Trophy, Calendar, 
  Sparkles, Award, ArrowRight, BookOpen, Music, CheckCircle2, UserPlus, MessageSquare, Send, Trash
} from 'lucide-react';

export default function Dashboard() {
  const { 
    user, rooms, createRoom, deleteRoom, joinRoom, stats, addManualSession, allParticipants, supabase,
    friendsList, dmMessages, allProfiles, sendFriendRequest, acceptFriendRequest, cancelOrRemoveFriend, sendDirectMessage, activeRoomId
  } = useRealtimeSync();

  const dmEndRef = useRef(null);

  useEffect(() => {
    dmEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages, activeDmFriend]);

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states
  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [roomCat, setRoomCat] = useState('Lofi');
  const [roomTags, setRoomTags] = useState('');
  const [timerMode, setTimerMode] = useState('pomodoro');
  const [timerDuration, setTimerDuration] = useState(25);
  const [roomIsPrivate, setRoomIsPrivate] = useState(false);
  const [modalError, setModalError] = useState('');

  // Manual session logging states
  const [manualMin, setManualMin] = useState(30);
  const [manualTopic, setManualTopic] = useState('');
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');

  // Join Private Room states
  const [joinPrivateId, setJoinPrivateId] = useState('');
  const [joinPrivateError, setJoinPrivateError] = useState('');

  // Social Panel states
  const [socialSearch, setSocialSearch] = useState('');
  const [socialError, setSocialError] = useState('');
  const [socialSuccess, setSocialSuccess] = useState('');
  const [activeDmFriend, setActiveDmFriend] = useState(null);
  const [dmTextInput, setDmTextInput] = useState('');

  // Extract categories
  const categories = ['All', ...new Set(rooms.map(r => r.category))];

  // Filtered rooms
  const filteredRooms = rooms.filter(room => {
    // Exclude private rooms from the public dashboard
    if (room.is_private) return false;

    const matchesSearch = room.name.toLowerCase().includes(search.toLowerCase()) || 
                          room.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = activeCategory === 'All' || room.category === activeCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    setModalError('');
    
    try {
      const newRoomId = await createRoom(
        roomName.trim(),
        roomDesc.trim(),
        roomCat,
        roomTags,
        timerMode,
        parseInt(timerDuration),
        roomIsPrivate
      );

      if (newRoomId) {
        // Reset form
        setRoomName('');
        setRoomDesc('');
        setRoomCat('Lofi');
        setRoomTags('');
        setTimerMode('pomodoro');
        setTimerDuration(25);
        setRoomIsPrivate(false);
        setModalError('');
        setShowCreateModal(false);

        // Join room instantly
        joinRoom(newRoomId);
      }
    } catch (err) {
      setModalError(err.message || 'Error creating room');
    }
  };

  const handleJoinPrivate = async (e) => {
    e.preventDefault();
    setJoinPrivateError('');
    const id = joinPrivateId.trim();
    if (!id) return;

    // Check local state rooms list
    const localRoom = rooms.find(r => r.id === id);
    if (localRoom) {
      joinRoom(localRoom.id);
      return;
    }

    if (supabase) {
      // Query database directly
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        joinRoom(data.id);
      } else {
        setJoinPrivateError('Room not found. Check the ID/Link.');
      }
    } else {
      setJoinPrivateError('Room not found. Check the ID/Link.');
    }
  };

  const handleLogManualSession = (e) => {
    e.preventDefault();
    if (!manualTopic.trim()) return;
    
    addManualSession(parseInt(manualMin), manualTopic.trim());
    setManualSuccessMsg(`Logged ${manualMin}m for "${manualTopic}"! +${manualMin * 10} XP`);
    setManualTopic('');
    
    setTimeout(() => {
      setManualSuccessMsg('');
    }, 4000);
  };

  // Determine user level based on XP
  const userLevel = Math.floor(stats.xp / 500) + 1;
  const xpToNextLevel = 500 - (stats.xp % 500);
  const levelProgress = ((stats.xp % 500) / 500) * 100;

  return (
    <div className="dashboard-grid">
      {/* LEFT: Study Rooms Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Welcome Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700 }}>
              Welcome back, {user.name}! 👋
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Find a study den or create your own to start collaborating.
            </p>
          </div>
          
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} /> Create Room
          </button>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }}>
              <Search size={18} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by room name or tags (e.g. Pomodoro, Algorithms)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '42px', width: '100%' }}
            />
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`btn btn-secondary`}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  whiteSpace: 'nowrap',
                  background: activeCategory === cat ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.03)',
                  borderColor: activeCategory === cat ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Join Private Room Panel */}
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Join Private Den</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enter a room ID code to join an unlisted study room.</p>
          </div>
          <form onSubmit={handleJoinPrivate} style={{ display: 'flex', gap: '8px', flex: 1.5, minWidth: '260px', position: 'relative' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Paste Room ID (e.g. 8f4a-96ac...)"
              value={joinPrivateId}
              onChange={(e) => setJoinPrivateId(e.target.value)}
              style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
            />
            <button type="submit" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Join Den
            </button>
          </form>
          {joinPrivateError && (
            <div style={{ width: '100%', fontSize: '0.8rem', color: 'var(--color-accent)', marginTop: '2px', textAlign: 'left' }}>
              ⚠️ {joinPrivateError}
            </div>
          )}
        </div>

        {/* Study Room Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {filteredRooms.map(room => {
            const activeParticipants = (allParticipants && typeof allParticipants === 'object' && !Array.isArray(allParticipants))
              ? (allParticipants[room.id] || [])
              : [];
            const onlineCount = activeParticipants.length || (room.id === 'room-1' ? 3 : room.id === 'room-2' ? 2 : 1);
            const isCreator = user && (room.creator_id === user.id || room.creator === user.name);

            return (
              <div 
                key={room.id} 
                className="glass-panel" 
                style={{ 
                  borderRadius: '16px', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'transform var(--transition-normal), border-color var(--transition-normal)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                {/* Visual Header */}
                <div style={{ 
                  height: '100px', 
                  backgroundImage: `linear-gradient(to bottom, rgba(11, 12, 16, 0.2), rgba(11, 12, 16, 0.85)), url(${room.bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600, 
                    padding: '2px 8px', 
                    background: 'rgba(0,0,0,0.5)', 
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    {room.category}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '12px' }}>
                    <Users size={12} style={{ marginTop: '2px' }} />
                    <span>{onlineCount} online</span>
                  </div>
                </div>

                {/* Content */}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justify: 'space-between', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '6px' }}>{room.name}</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineBreak: 'anywhere' }}>{room.description}</p>
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {room.tags.map(tag => (
                      <span key={tag} style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', padding: '2px 6px', background: 'rgba(6, 182, 212, 0.08)', borderRadius: '4px' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer Metrics */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.04)', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 'auto' }}>
                      <Clock size={14} />
                      <span>{room.timerMode === 'pomodoro' ? `${room.timerDuration / 60}m Pomodoro` : 'Stopwatch'}</span>
                    </div>

                    {/* Delete button for creators */}
                    {isCreator && (
                      <button 
                        className="btn btn-secondary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${room.name}"?`)) {
                            deleteRoom(room.id);
                          }
                        }}
                        title="Delete Room"
                        style={{ 
                          padding: '6px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          background: 'rgba(244, 63, 94, 0.05)', 
                          borderColor: 'rgba(244, 63, 94, 0.15)',
                          color: '#f43f5e'
                        }}
                      >
                        <Trash size={14} />
                      </button>
                    )}

                    <button className="btn btn-primary" onClick={() => joinRoom(room.id)} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                      Enter Den <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RIGHT: Gamification & Manual Session Section */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* User Stats Card */}
        <div className="glass-panel-glow" style={{ padding: '24px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ 
              width: '40px', height: '40px', borderRadius: '50%', background: user.avatarColor || '#a855f7',
              display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', fontSize: '1.2rem'
            }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Level {userLevel} Focus Master</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stats.xp} Total XP earned</p>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <span>Progress to Lvl {userLevel + 1}</span>
              <span>{xpToNextLevel} XP left</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${levelProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))', borderRadius: '4px' }}></div>
            </div>
          </div>

          {/* Productivity Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, display: 'block', color: 'var(--color-secondary)' }}>{stats.totalMinutes}m</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Focus Time</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 700, display: 'block', color: 'var(--color-primary)' }}>{stats.completedSessions}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sessions Finished</span>
            </div>
          </div>
        </div>

        {/* Social & Friends Card */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Users size={18} style={{ color: 'var(--color-primary)' }} /> Scholars Network
          </h3>

          {/* Add Friend Form */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            setSocialError('');
            setSocialSuccess('');
            try {
              await sendFriendRequest(socialSearch.trim());
              setSocialSuccess(`Request sent to "${socialSearch.trim()}"!`);
              setSocialSearch('');
            } catch (err) {
              setSocialError(err.message || 'Error sending request');
            }
          }} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-control"
              placeholder="Enter scholar username..."
              value={socialSearch}
              onChange={(e) => setSocialSearch(e.target.value)}
              style={{ flex: 1, fontSize: '0.85rem', padding: '8px 12px' }}
              required
            />
            <button type="submit" className="btn btn-secondary" style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '0.85rem' }} title="Send Friend Request">
              Add Friend
            </button>
          </form>
          {socialError && <div style={{ fontSize: '0.8rem', color: 'var(--color-accent)', marginBottom: '12px' }}>⚠️ {socialError}</div>}
          {socialSuccess && <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', marginBottom: '12px' }}>✓ {socialSuccess}</div>}

          {/* Pending Incoming/Outgoing Requests */}
          {(() => {
            const pendingIncoming = friendsList.filter(f => f.status === 'pending' && f.sender_id !== user.id);
            const pendingOutgoing = friendsList.filter(f => f.status === 'pending' && f.sender_id === user.id);

            if (pendingIncoming.length === 0 && pendingOutgoing.length === 0) return null;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
                {pendingIncoming.map(req => {
                  const sender = allProfiles.find(p => p.id === req.sender_id) || { username: 'Unknown' };
                  return (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(168, 85, 247, 0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(168,85,247,0.15)', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{sender.username} wants to add you</span>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button type="button" className="btn btn-primary" onClick={() => acceptFriendRequest(req.id)} style={{ padding: '4px 8px', fontSize: '0.75rem' }} title="Accept">
                          Accept
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => cancelOrRemoveFriend(req.id)} style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--color-accent)' }} title="Decline">
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
                {pendingOutgoing.map(req => {
                  const receiverId = req.user_id_1 === user.id ? req.user_id_2 : req.user_id_1;
                  const receiver = allProfiles.find(p => p.id === receiverId) || { username: 'Unknown' };
                  return (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending to: {receiver.username}</span>
                      <button type="button" className="btn btn-icon-only" onClick={() => cancelOrRemoveFriend(req.id)} style={{ padding: '4px', fontSize: '0.75rem', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }} title="Cancel Request">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Friends List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
            {(() => {
              const friends = friendsList.filter(f => f.status === 'accepted').map(f => {
                const friendId = f.user_id_1 === user.id ? f.user_id_2 : f.user_id_1;
                const profile = allProfiles.find(p => p.id === friendId) || { id: friendId, username: 'Unknown Scholar', avatar_color: '#a855f7', xp: 0 };
                return { friendshipId: f.id, ...profile };
              });

              if (friends.length === 0) {
                return <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No friends added yet. Add scholars above!</div>;
              }

              return friends.map(friend => (
                <div key={friend.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'inline-flex', width: '8px', height: '8px', borderRadius: '50%', background: friend.avatar_color || '#a855f7' }}></span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{friend.username}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({friend.xp} XP)</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      type="button"
                      className="btn btn-secondary" 
                      onClick={() => setActiveDmFriend(friend)} 
                      style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.02)' }}
                    >
                      <MessageSquare size={12} /> Chat
                    </button>
                    <button 
                      type="button"
                      className="btn btn-icon-only" 
                      onClick={() => {
                        if (confirm(`Remove ${friend.username} from friends?`)) {
                          cancelOrRemoveFriend(friend.friendshipId);
                        }
                      }} 
                      style={{ padding: '4px', color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                      title="Unfriend"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Log Manual Activity Widget */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Plus size={18} style={{ color: 'var(--color-secondary)' }} /> Log Offline Session
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
            Did some silent studying offline? Log it here to maintain your streak and earn points!
          </p>

          <form onSubmit={handleLogManualSession} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input
                type="text"
                className="form-control"
                placeholder="What did you study? (e.g. Physics)"
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                style={{ width: '100%', fontSize: '0.9rem' }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                className="form-control"
                value={manualMin}
                onChange={(e) => setManualMin(parseInt(e.target.value))}
                style={{ flex: 1, fontSize: '0.9rem' }}
              >
                <option value="15">15 minutes (+150 XP)</option>
                <option value="30">30 minutes (+300 XP)</option>
                <option value="45">45 minutes (+450 XP)</option>
                <option value="60">60 minutes (+600 XP)</option>
                <option value="120">120 minutes (+1200 XP)</option>
              </select>
              <button type="submit" className="btn btn-secondary" style={{ padding: '0 16px', display: 'flex', alignItems: 'center' }}>
                Log <CheckCircle2 size={16} style={{ color: 'var(--color-success)', marginLeft: '4px' }} />
              </button>
            </div>
          </form>
          {manualSuccessMsg && (
            <div style={{ 
              marginTop: '10px', padding: '8px 12px', background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', 
              color: 'var(--color-success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px'
            }}>
              <Sparkles size={14} /> {manualSuccessMsg}
            </div>
          )}
        </div>

        {/* Badges / Achievements Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Award size={18} style={{ color: 'var(--color-primary)' }} /> Achievements
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {stats.badges.map(badge => (
              <div 
                key={badge.id} 
                style={{ 
                  background: badge.unlocked ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255,255,255,0.01)',
                  border: badge.unlocked ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  padding: '12px 6px',
                  textAlign: 'center',
                  opacity: badge.unlocked ? 1 : 0.4,
                  position: 'relative'
                }}
                title={`${badge.name}: ${badge.description} (${badge.unlocked ? 'Unlocked' : 'Locked'})`}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{badge.icon}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {badge.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Session History List */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Calendar size={18} style={{ color: 'var(--color-secondary)' }} /> History Log
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
            {stats.sessionHistory.map(session => (
              <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.roomName}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{session.date}</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-secondary)', background: 'rgba(6,182,212,0.08)', padding: '2px 8px', borderRadius: '12px' }}>
                  +{session.minutes}m
                </span>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-glow" style={{ border: '1px solid rgba(168, 85, 247, 0.3)' }}>
            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
              Create Study Den
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Set up a room to study with other members.
            </p>

            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Room Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Cracking Java Algorithms"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  placeholder="What is this space for?"
                  value={roomDesc}
                  onChange={(e) => setRoomDesc(e.target.value)}
                  style={{ width: '100%', resize: 'none', height: '60px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={roomCat}
                    onChange={(e) => setRoomCat(e.target.value)}
                  >
                    <option value="Lofi">Lofi</option>
                    <option value="Coding">Coding</option>
                    <option value="Quiet">Quiet</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Timer Mode</label>
                  <select
                    className="form-control"
                    value={timerMode}
                    onChange={(e) => setTimerMode(e.target.value)}
                  >
                    <option value="pomodoro">Pomodoro (Countdown)</option>
                    <option value="stopwatch">Stopwatch (Countup)</option>
                  </select>
                </div>
              </div>

              {timerMode === 'pomodoro' && (
                <div className="form-group">
                  <label className="form-label">Pomodoro Focus Time (Minutes)</label>
                  <select
                    className="form-control"
                    value={timerDuration}
                    onChange={(e) => setTimerDuration(parseInt(e.target.value))}
                  >
                    <option value="15">15 Minutes</option>
                    <option value="25">25 Minutes (Recommended)</option>
                    <option value="45">45 Minutes</option>
                    <option value="50">50 Minutes</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Tags (comma-separated)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Java, Pomodoro, ExamPrep"
                  value={roomTags}
                  onChange={(e) => setRoomTags(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Private Checkbox */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="roomIsPrivate"
                  checked={roomIsPrivate}
                  onChange={(e) => setRoomIsPrivate(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="roomIsPrivate" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none', fontWeight: 500 }}>
                  Make Room Private (Shareable via link/ID only)
                </label>
              </div>

              {modalError && (
                <div style={{ color: 'var(--color-accent)', fontSize: '0.85rem', textAlign: 'left', marginTop: '4px' }}>
                  ⚠️ {modalError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setModalError(''); setRoomIsPrivate(false); }} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Launch Den
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* DIRECT MESSAGES MODAL */}
      {activeDmFriend && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel-glow" style={{ border: '1px solid rgba(168, 85, 247, 0.3)', width: '100%', maxWidth: '480px', padding: '30px' }}>
            <button className="modal-close" onClick={() => setActiveDmFriend(null)}>×</button>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              Chat with {activeDmFriend.username}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px' }}>
              Send private messages or share study rooms.
            </p>

            {/* DMs Chat History */}
            <div style={{ 
              height: '250px', 
              overflowY: 'auto', 
              background: 'rgba(0,0,0,0.2)', 
              borderRadius: '12px', 
              padding: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              border: '1px solid rgba(255,255,255,0.04)',
              marginBottom: '16px'
            }}>
              {(() => {
                const thread = dmMessages.filter(m => 
                  (m.sender_id === user.id && m.receiver_id === activeDmFriend.id) ||
                  (m.sender_id === activeDmFriend.id && m.receiver_id === user.id)
                );

                if (thread.length === 0) {
                  return <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>No messages yet. Send a greeting!</div>;
                }

                return thread.map(msg => {
                  const isMe = msg.sender_id === user.id;
                  
                  if (msg.is_invite) {
                    // Render Room Invite Card in DMs
                    const inviteRoom = rooms.find(r => r.id === msg.room_id) || { name: 'Shared Den', category: 'General' };
                    return (
                      <div 
                        key={msg.id} 
                        style={{ 
                          alignSelf: 'center', 
                          background: 'rgba(168, 85, 247, 0.1)', 
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          borderRadius: '12px', 
                          padding: '12px 16px', 
                          maxWidth: '85%', 
                          textAlign: 'center' 
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-primary)', display: 'block', marginBottom: '4px', fontWeight: 600 }}>
                          🎓 Den Invitation
                        </span>
                        <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '8px' }}>{inviteRoom.name}</strong>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => {
                            joinRoom(msg.room_id);
                            setActiveDmFriend(null);
                          }}
                          style={{ padding: '4px 12px', fontSize: '0.75rem', margin: '0 auto' }}
                        >
                          Join Study Room
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      style={{ 
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        background: isMe ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.03)',
                        border: isMe ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(255,255,255,0.06)',
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        padding: '8px 12px',
                        maxWidth: '75%',
                        fontSize: '0.85rem',
                        lineBreak: 'anywhere'
                      }}
                    >
                      <div style={{ color: isMe ? 'var(--color-primary)' : 'var(--color-secondary)', fontSize: '0.7rem', fontWeight: 600, marginBottom: '2px' }}>
                        {isMe ? 'You' : msg.sender_name}
                      </div>
                      <div>{msg.text}</div>
                    </div>
                  );
                });
              })()}
              <div ref={dmEndRef} />
            </div>

            {/* Form actions */}
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!dmTextInput.trim()) return;
              try {
                await sendDirectMessage(activeDmFriend.id, dmTextInput.trim());
                setDmTextInput('');
              } catch (err) {
                console.error("Error sending DM:", err);
              }
            }} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Type your message..."
                value={dmTextInput}
                onChange={(e) => setDmTextInput(e.target.value)}
                style={{ flex: 1, fontSize: '0.85rem' }}
              />
              
              {/* Share Active Den Button */}
              {activeRoomId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={async () => {
                    try {
                      await sendDirectMessage(activeDmFriend.id, `Inviting you to study!`, true, activeRoomId);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  style={{ padding: '0 12px', background: 'rgba(6,182,212,0.1)', borderColor: 'rgba(6,182,212,0.3)', color: 'var(--color-secondary)', fontSize: '0.85rem' }}
                  title="Invite to your current study room"
                >
                  Invite
                </button>
              )}

              <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
