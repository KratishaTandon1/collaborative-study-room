import React, { useState, useEffect, useRef } from 'react';
import { useRealtimeSync } from '../context/RealtimeSyncContext';
import { 
  ArrowLeft, Play, Pause, RotateCcw, Send, CheckSquare, Square, 
  Trash2, Plus, Volume2, VolumeX, Edit3, Trash, Users, Disc, Paintbrush, 
  Sparkles, Maximize2, Minimize2 
} from 'lucide-react';

export default function StudyRoom() {
  const {
    user,
    rooms,
    activeRoomId,
    leaveRoom,
    participants,
    updateStatus,
    chatMessages,
    sendChatMessage,
    tasks,
    addTask,
    toggleTask,
    deleteTask,
    whiteboardData,
    saveWhiteboard,
    timerState,
    toggleTimer,
    resetTimer,
    setTimerMode,
    friendsList,
    allProfiles,
    sendFriendRequest
  } = useRealtimeSync();

  const currentRoom = rooms.find(r => r.id === activeRoomId);

  const getFriendshipState = (participantName) => {
    if (!user || participantName === user.name) return 'me';
    
    const friendProfile = allProfiles.find(prof => prof.username === participantName);
    if (!friendProfile) return 'not_found';
    
    const friendship = friendsList.find(f => 
      (f.user_id_1 === user.id && f.user_id_2 === friendProfile.id) ||
      (f.user_id_1 === friendProfile.id && f.user_id_2 === user.id)
    );
    
    if (!friendship) return 'none';
    return friendship.status;
  };

  const handleParticipantClick = async (pName) => {
    const state = getFriendshipState(pName);
    if (state === 'me') return;
    if (state === 'accepted') {
      alert(`${pName} is already your friend!`);
      return;
    }
    if (state === 'pending') {
      alert(`A friend request with ${pName} is already pending.`);
      return;
    }
    
    try {
      await sendFriendRequest(pName);
      alert(`Friend request sent to ${pName}!`);
    } catch (err) {
      alert(err.message || "Could not send friend request.");
    }
  };

  if (!currentRoom) {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '500px', margin: '60px auto', border: '1px solid rgba(244,63,94,0.2)' }}>
        <h2 style={{ color: 'var(--color-accent)', marginBottom: '12px', fontFamily: 'var(--font-display)', fontSize: '1.6rem' }}>Den Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.95rem' }}>
          The study room you are trying to join does not exist, has been deleted, or the link is incorrect.
        </p>
        <button className="btn btn-primary" onClick={() => leaveRoom(activeRoomId)} style={{ padding: '10px 20px', margin: '0 auto' }}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  // States
  const [inputText, setInputText] = useState('');
  const [taskText, setTaskText] = useState('');
  const [isDistractionFree, setIsDistractionFree] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Focusing ✍️');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${activeRoomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Ambience audio states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [selectedAmbience, setSelectedAmbience] = useState('lofi');
  const audioRef = useRef(null);

  // Whiteboard states
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#a855f7'); // Violet
  const [lineWidth, setLineWidth] = useState(4);

  const chatEndRef = useRef(null);

  const ambienceTracks = {
    lofi: 'https://coderadio-admin-v2.freecodecamp.org/listen/coderadio/radio.mp3', // Code Radio stream
    rain: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', // Backup music track or sound
    cafe: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  };

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Audio Playback effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ambienceTracks[selectedAmbience];
      audioRef.current.load();
      if (isPlayingAudio) {
        audioRef.current.play().catch(e => {
          console.warn("Autoplay prevented or stream issue", e);
          setIsPlayingAudio(false);
        });
      }
    }
  }, [selectedAmbience]);

  const toggleAmbience = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
      }).catch(e => {
        console.warn("Autoplay block", e);
      });
    }
  };

  // Whiteboard drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Set canvas dimensions
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 250;
  }, [activeRoomId]);

  // Sync drawing board when whiteboardData changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!whiteboardData) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const img = new Image();
    img.src = whiteboardData;
    img.onload = () => {
      // Clear before redraw to avoid ghost pixels
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  }, [whiteboardData]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Support touch and mouse
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const coords = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    saveWhiteboard(activeRoomId, dataURL);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveWhiteboard(activeRoomId, '');
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendChatMessage(activeRoomId, inputText.trim());
    setInputText('');
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    addTask(activeRoomId, taskText.trim());
    setTaskText('');
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    updateStatus(activeRoomId, status);
  };

  // Timer values calculation
  const minutes = Math.floor(timerState.secondsLeft / 60);
  const seconds = timerState.secondsLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Pomodoro circular progress calculation
  const totalDuration = timerState.mode === 'focus' ? timerState.duration : 300;
  const progressPercent = timerState.timerMode === 'pomodoro' 
    ? (timerState.secondsLeft / totalDuration) * 100 
    : 100;
  const strokeDashoffset = 728.8 - (728.8 * progressPercent) / 100; // SVG circle perimeter 2 * PI * r (r=116)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Back & Room Info Bar */}
      {!isDistractionFree && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => leaveRoom(activeRoomId)}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              {currentRoom?.name}
              {currentRoom?.is_private && (
                <span style={{ 
                  fontSize: '0.7rem', 
                  color: 'var(--color-secondary)', 
                  background: 'rgba(6, 182, 212, 0.08)', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(6, 182, 212, 0.25)',
                  fontWeight: 600,
                  letterSpacing: '0.5px'
                }}>
                  Private
                </span>
              )}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginTop: '4px' }}>
              Created by: {currentRoom?.creator || 'Community'} • Category: {currentRoom?.category}
              •
              <button 
                onClick={handleCopyShareLink}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: copiedLink ? 'var(--color-success)' : 'var(--color-primary)', 
                  cursor: 'pointer', 
                  fontSize: '0.8rem', 
                  padding: 0, 
                  textDecoration: 'underline',
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  fontWeight: 600,
                  transition: 'color 0.2s'
                }}
              >
                {copiedLink ? '✓ Copied Link!' : '🔗 Copy Invite Link'}
              </button>
            </span>
          </div>

          <button className="btn btn-secondary" onClick={() => setIsDistractionFree(true)}>
            <Maximize2 size={16} /> Focus Mode
          </button>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className={isDistractionFree ? '' : 'room-grid'} style={{ transition: 'all 0.3s ease' }}>
        
        {/* DISTRACTION FREE FOCUS VIEW */}
        {isDistractionFree ? (
          <div className="glass-panel-glow" style={{ 
            padding: '60px 40px', 
            textAlign: 'center', 
            maxWidth: '650px', 
            margin: '40px auto', 
            border: '1px solid rgba(168, 85, 247, 0.3)',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsDistractionFree(false)}
              style={{ position: 'absolute', top: '24px', right: '24px' }}
            >
              <Minimize2 size={16} /> Exit Focus
            </button>

            <span style={{ 
              fontSize: '0.8rem', 
              color: timerState.mode === 'focus' ? 'var(--color-primary)' : 'var(--color-secondary)',
              textTransform: 'uppercase', 
              letterSpacing: '3px',
              fontWeight: 600
            }}>
              {timerState.mode === 'focus' ? '✍️ Focus Session' : '☕ Break Time'}
            </span>

            <div style={{ fontSize: '7rem', fontWeight: 700, fontFamily: 'var(--font-display)', margin: '20px 0', letterSpacing: '-4px' }}>
              {formattedTime}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
              <button className="btn btn-primary" onClick={() => toggleTimer(activeRoomId)} style={{ padding: '12px 32px' }}>
                {timerState.isRunning ? <Pause size={18} /> : <Play size={18} />} {timerState.isRunning ? 'Pause' : 'Start'}
              </button>
              <button className="btn btn-secondary" onClick={() => resetTimer(activeRoomId)} style={{ padding: '12px 24px' }}>
                <RotateCcw size={18} /> Reset
              </button>
            </div>

            {/* Quick Status Selection */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Update your active study status:</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {['Focusing ✍️', 'Reading 📖', 'Coding 💻', 'On Break ☕', 'Muted 🤫'].map(status => (
                  <button
                    key={status}
                    className="btn btn-secondary"
                    onClick={() => handleStatusChange(status)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      background: selectedStatus === status ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.02)',
                      borderColor: selectedStatus === status ? 'var(--color-primary)' : 'rgba(255,255,255,0.06)'
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD WORKSPACE LAYOUT */
          <>
            {/* LEFT SIDE: Workspace, Timers, Canvas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Synced Timer Card */}
              <div className="glass-panel-glow" style={{ padding: '30px', textAlign: 'center', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                {/* Mode Selector Tabs (Pomodoro Mode Only) */}
                {currentRoom?.timerMode === 'pomodoro' && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
                    <button 
                      className={`btn btn-secondary`} 
                      onClick={() => setTimerMode(activeRoomId, 'focus')}
                      style={{ 
                        padding: '6px 16px', borderRadius: '15px', fontSize: '0.8rem',
                        background: timerState.mode === 'focus' ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                        borderColor: timerState.mode === 'focus' ? 'var(--color-primary)' : 'transparent'
                      }}
                    >
                      Focus Session
                    </button>
                    <button 
                      className={`btn btn-secondary`} 
                      onClick={() => setTimerMode(activeRoomId, 'break')}
                      style={{ 
                        padding: '6px 16px', borderRadius: '15px', fontSize: '0.8rem',
                        background: timerState.mode === 'break' ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                        borderColor: timerState.mode === 'break' ? 'var(--color-secondary)' : 'transparent'
                      }}
                    >
                      Break
                    </button>
                  </div>
                )}

                {/* Clock Circle */}
                <div className="timer-circle-container">
                  <svg className="timer-svg">
                    <circle className="timer-circle-bg" cx="120" cy="120" r="116" />
                    <circle 
                      className={`timer-circle-progress ${timerState.mode === 'break' ? 'break' : ''}`} 
                      cx="120" 
                      cy="120" 
                      r="116"
                      strokeDasharray="728.8"
                      strokeDashoffset={strokeDashoffset}
                    />
                  </svg>
                  <div className="timer-text-container">
                    <span className="timer-digits">{formattedTime}</span>
                    <span className="timer-label">
                      {currentRoom?.timerMode === 'pomodoro' 
                        ? (timerState.mode === 'focus' ? 'Focus 🧠' : 'Break ☕') 
                        : 'Elapsed ⏱️'}
                    </span>
                  </div>
                </div>

                {/* Play, Pause, Reset Controls */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
                  <button className="btn btn-primary" onClick={() => toggleTimer(activeRoomId)} style={{ padding: '10px 24px' }}>
                    {timerState.isRunning ? <Pause size={16} /> : <Play size={16} />} 
                    {timerState.isRunning ? 'Pause' : 'Start'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => resetTimer(activeRoomId)}>
                    <RotateCcw size={16} /> Reset
                  </button>
                </div>
              </div>

              {/* Whiteboard Sketch Widget */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Paintbrush size={18} style={{ color: 'var(--color-primary)' }} /> Collaborative Sketchpad
                  </h3>
                  <button className="btn btn-secondary" onClick={clearCanvas} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    <Trash size={12} /> Clear Board
                  </button>
                </div>

                <div className="canvas-wrapper">
                  <div className="canvas-toolbar">
                    {/* Brush Colors */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['#a855f7', '#06b6d4', '#10b981', '#f43f5e', '#ffffff'].map(c => (
                        <div
                          key={c}
                          className={`canvas-color-dot ${color === c ? 'active' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setColor(c)}
                        />
                      ))}
                    </div>

                    {/* Brush Sizes */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[2, 4, 8].map(size => (
                        <button
                          key={size}
                          className="btn btn-secondary"
                          onClick={() => setLineWidth(size)}
                          style={{
                            padding: '2px 8px',
                            fontSize: '0.7rem',
                            borderRadius: '4px',
                            background: lineWidth === size ? 'rgba(255,255,255,0.1)' : 'transparent'
                          }}
                        >
                          {size === 2 ? 'Small' : size === 4 ? 'Med' : 'Large'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
                  />
                </div>
              </div>

            </div>

            {/* RIGHT SIDE: Realtime Chat, Checklist, Audio, People */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', maxHeight: 'calc(100vh - 120px)' }}>
              
              {/* Online Participants List */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Users size={16} style={{ color: 'var(--color-secondary)' }} /> Online in Den ({participants.length})
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '90px', overflowY: 'auto' }}>
                  {participants.map((p, idx) => {
                    const state = getFriendshipState(p.name);
                    const titleText = state === 'me' ? 'You' :
                                      state === 'accepted' ? `${p.name} (Friend ✓)` :
                                      state === 'pending' ? `${p.name} (Pending Request)` :
                                      `Click to add ${p.name} as friend`;
                    return (
                      <div 
                        key={idx} 
                        className="user-badge-nav" 
                        onClick={() => handleParticipantClick(p.name)}
                        style={{ 
                          padding: '4px 10px', 
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: state === 'me' ? 'default' : 'pointer',
                          background: state === 'accepted' ? 'rgba(16, 185, 129, 0.08)' : 
                                      state === 'pending' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          borderColor: state === 'accepted' ? 'rgba(16, 185, 129, 0.25)' : 
                                       state === 'pending' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                          transition: 'all 0.2s'
                        }}
                        title={titleText}
                      >
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: p.avatarColor || 'var(--color-primary)' 
                        }}></span>
                        <span><strong>{p.name}</strong> ({p.status})</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ambience Audio Widget */}
              <div className="glass-panel" style={{ padding: '16px' }}>
                <audio ref={audioRef} loop />
                <div className="audio-player-card">
                  <div className="audio-track-info">
                    <div className="audio-icon-wrapper">
                      <Disc size={18} className={isPlayingAudio ? 'spin-anim' : ''} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block' }}>Ambient Sounds</span>
                      <select 
                        value={selectedAmbience} 
                        onChange={(e) => setSelectedAmbience(e.target.value)}
                        style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="lofi">📻 FreeCodeCamp CodeRadio</option>
                        <option value="rain">🎵 Lo-Fi Focus Melody</option>
                        <option value="cafe">🎵 Chill Classical Ambient</option>
                      </select>
                    </div>
                  </div>

                  <button className="btn btn-icon-only" onClick={toggleAmbience} title={isPlayingAudio ? 'Mute' : 'Play'}>
                    {isPlayingAudio ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                </div>
              </div>

              {/* Shared Task Board Checklist */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '240px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <CheckSquare size={16} style={{ color: 'var(--color-success)' }} /> Shared Checklist
                </h3>
                
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {tasks.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '30px' }}>
                      No tasks yet. Add one below!
                    </div>
                  ) : (
                    tasks.map(task => (
                      <div 
                        key={task.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          padding: '8px 12px', 
                          background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }} onClick={() => toggleTask(activeRoomId, task.id)}>
                          {task.completed ? (
                            <CheckSquare size={16} style={{ color: 'var(--color-success)' }} />
                          ) : (
                            <Square size={16} style={{ color: 'var(--text-muted)' }} />
                          )}
                          <span style={{ 
                            fontSize: '0.85rem', 
                            textDecoration: task.completed ? 'line-through' : 'none',
                            color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)'
                          }}>
                            {task.text}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                            {task.user}
                          </span>
                          <button 
                            onClick={() => deleteTask(activeRoomId, task.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', display: 'flex' }}
                            title="Delete Task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Task to work on..."
                    value={taskText}
                    onChange={(e) => setTaskText(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 12px' }}>
                    <Plus size={16} />
                  </button>
                </form>
              </div>

              {/* Room Live Chat Panel */}
              <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '260px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Send size={16} style={{ color: 'var(--color-primary)' }} /> Live Den Chat
                </h3>

                {/* Messages scroll box */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px', paddingRight: '4px' }}>
                  {chatMessages.map((msg, idx) => {
                    const isSystem = msg.sender === 'System';
                    return (
                      <div 
                        key={idx} 
                        style={{ 
                          alignSelf: isSystem ? 'center' : (msg.sender === user?.name ? 'flex-end' : 'flex-start'),
                          maxWidth: isSystem ? '100%' : '80%',
                          textAlign: isSystem ? 'center' : 'left'
                        }}
                      >
                        {isSystem ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {msg.text}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', paddingLeft: '4px' }}>
                              {msg.sender} <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{msg.timestamp}</span>
                            </span>
                            <div style={{ 
                              padding: '8px 12px', 
                              borderRadius: '12px', 
                              fontSize: '0.85rem',
                              lineBreak: 'anywhere',
                              background: msg.sender === user?.name ? 'var(--color-primary-glow)' : 'rgba(255,255,255,0.04)',
                              border: msg.sender === user?.name ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.06)'
                            }}>
                              {msg.text}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input form */}
                <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type focus message..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
                    <Send size={14} />
                  </button>
                </form>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
}
