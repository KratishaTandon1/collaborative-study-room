import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const RealtimeSyncContext = createContext();

// --- Configuration & Hybrid Check ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Clean up placeholders
const hasValidKeys = supabaseUrl && 
                     supabaseAnonKey && 
                     !supabaseUrl.includes('your-project-id') && 
                     !supabaseUrl.includes('placeholder');

export const isSupabaseConfigured = !!hasValidKeys;

// Initialize Supabase Client with sessionStorage to allow independent multi-tab testing
const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
        persistSession: true,
        autoRefreshToken: true
      }
    }) 
  : null;

// =================================================================
// FALLBACK DATA & LOCAL STORAGE LOGIC (Same as our previous version)
// =================================================================
const INITIAL_ROOMS = [
  {
    id: 'room-1',
    name: '🎧 Lofi Beats & Focus',
    description: 'Chill study space with background music. Quiet Pomodoro environment.',
    category: 'Lofi',
    tags: ['Pomodoro', 'Lofi', 'Quiet'],
    creator: 'Alex (Dev)',
    timerMode: 'pomodoro',
    timerDuration: 1500,
    bgImage: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'room-2',
    name: '💻 LeetCode Grind & Coding',
    description: 'Solving algorithm problems. Share screen, whiteboard ideas, and ask questions.',
    category: 'Coding',
    tags: ['Coding', 'LeetCode', 'Interview'],
    creator: 'Sarah (Google Prep)',
    timerMode: 'stopwatch',
    timerDuration: 0,
    bgImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'room-3',
    name: '🌧️ Cozy Rainy Library',
    description: 'Grab a hot beverage, listen to the rain, and study in absolute peace.',
    category: 'Quiet',
    tags: ['Quiet', 'Rain', 'Silent'],
    creator: 'Emma (Writer)',
    timerMode: 'pomodoro',
    timerDuration: 3000,
    bgImage: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=600&auto=format&fit=crop'
  }
];

const MOCK_PARTICIPANTS = {
  'room-1': [
    { name: 'Sarah', status: 'Focusing ✍️', xp: 450, avatarColor: '#a78bfa' },
    { name: 'David', status: 'Focusing ✍️', xp: 210, avatarColor: '#f472b6' },
    { name: 'Emily', status: 'On Break ☕', xp: 820, avatarColor: '#34d399' }
  ],
  'room-2': [
    { name: 'James', status: 'Coding 💻', xp: 1250, avatarColor: '#60a5fa' },
    { name: 'Chloe', status: 'Muted 🤫', xp: 320, avatarColor: '#fbbf24' }
  ]
};

const ALL_BADGES = [
  { id: 'b1', name: 'Early Bird', description: 'Complete a study session before 8:00 AM', icon: '🌅', unlocked: true },
  { id: 'b2', name: 'Deep Focus Master', description: 'Complete 4 consecutive Pomodoros', icon: '🧠', unlocked: false },
  { id: 'b3', name: 'Social Scholar', description: 'Join 3 different study rooms', icon: '👥', unlocked: true },
  { id: 'b4', name: 'Streak Legend', description: 'Maintain a 5-day study streak', icon: '🔥', unlocked: false },
  { id: 'b5', name: 'Code Warrior', description: 'Spend 2 hours in a Coding room', icon: '💻', unlocked: false },
  { id: 'b6', name: 'Lofi Addict', description: 'Complete a Pomodoro with Lofi music on', icon: '🎧', unlocked: true }
];

const normalizeRoom = (room) => {
  if (!room) return room;
  const isPrivateVal = room.is_private !== undefined ? room.is_private : room.isPrivate;
  const bgImageVal = room.bg_image || room.bgImage;
  const timerModeVal = room.timer_mode || room.timerMode;
  const timerDurationVal = room.timer_duration || room.timerDuration;
  const creatorIdVal = room.creator_id || room.creatorId;

  return {
    ...room,
    bgImage: bgImageVal,
    bg_image: bgImageVal,
    timerMode: timerModeVal,
    timer_mode: timerModeVal,
    timerDuration: timerDurationVal,
    timer_duration: timerDurationVal,
    isPrivate: isPrivateVal,
    is_private: isPrivateVal,
    creatorId: creatorIdVal,
    creator_id: creatorIdVal,
  };
};

const formatTimestamp = (dateStr) => {
  if (!dateStr) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const RealtimeSyncProvider = ({ children }) => {
  // Common states
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room') || null;
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [timerState, setTimerState] = useState({ isRunning: false, secondsLeft: 1500, duration: 1500, mode: 'focus', timerMode: 'pomodoro' });
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [whiteboardData, setWhiteboardData] = useState('');
  const [friendsList, setFriendsList] = useState([]);
  const [dmMessages, setDmMessages] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);

  const [stats, setStats] = useState({
    xp: 320,
    totalMinutes: 145,
    completedSessions: 5,
    streakDays: 3,
    badges: ALL_BADGES,
    sessionHistory: []
  });

  const channelRef = useRef(null);
  const localBroadcastChannelRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const globalChannelsRef = useRef({
    roomsChan: null,
    friendsChan: null,
    dmChan: null,
    profilesChan: null
  });
  const authSubscriptionRef = useRef(null);

  // =================================================================
  // HYBRID INIT & STATE ROUTING
  // =================================================================

  useEffect(() => {
    if (isSupabaseConfigured) {
      initSupabase();
    } else {
      initLocalFallback();
    }

    return () => {
      if (isSupabaseConfigured && supabase) {
        const { roomsChan, friendsChan, dmChan, profilesChan } = globalChannelsRef.current;
        if (roomsChan) supabase.removeChannel(roomsChan);
        if (friendsChan) supabase.removeChannel(friendsChan);
        if (dmChan) supabase.removeChannel(dmChan);
        if (profilesChan) supabase.removeChannel(profilesChan);
        if (authSubscriptionRef.current) authSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (activeRoomId) {
      window.history.pushState(null, '', `/?room=${activeRoomId}`);
    } else {
      window.history.pushState(null, '', '/');
    }
  }, [activeRoomId]);

  // --- LOCAL FALLBACK MODE ---
  const initLocalFallback = () => {
    // Load local storage
    const savedUser = sessionStorage.getItem('study_user');
    const savedRooms = localStorage.getItem('study_rooms');
    const savedStats = localStorage.getItem('study_stats');
    const savedProfiles = localStorage.getItem('study_profiles');
    const savedFriends = localStorage.getItem('study_friends');
    const savedDMs = localStorage.getItem('study_dms');

    if (savedUser) setUser(JSON.parse(savedUser));
    setRooms(savedRooms ? JSON.parse(savedRooms) : INITIAL_ROOMS);
    if (savedStats) setStats(JSON.parse(savedStats));

    // Setup local broadcast channel for fallback multi-tab testing
    const localChan = new BroadcastChannel('study_room_channel');
    localBroadcastChannelRef.current = localChan;

    localChan.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === 'ROOM_CREATED') {
        setRooms(prev => [...prev, payload]);
      } else if (type === 'ROOM_DELETED') {
        setRooms(prev => prev.filter(r => r.id !== payload));
      } else if (type === 'FRIENDS_UPDATE') {
        setFriendsList(payload);
        localStorage.setItem('study_friends', JSON.stringify(payload));
      } else if (type === 'DM_MSG') {
        setDmMessages(prev => {
          if (prev.some(d => d.id === payload.id)) return prev;
          const next = [...prev, payload];
          localStorage.setItem('study_dms', JSON.stringify(next));
          return next;
        });
      } else if (type === 'PROFILE_CREATED') {
        setAllProfiles(prev => {
          if (prev.some(p => p.id === payload.id)) return prev;
          const next = [...prev, payload];
          localStorage.setItem('study_profiles', JSON.stringify(next));
          return next;
        });
      }
    };

    setAllProfiles(savedProfiles ? JSON.parse(savedProfiles) : [
      { id: 'mock-1', username: 'Sarah', avatar_color: '#a78bfa', xp: 450 },
      { id: 'mock-2', username: 'David', avatar_color: '#f472b6', xp: 210 },
      { id: 'mock-3', username: 'Emily', avatar_color: '#34d399', xp: 820 }
    ]);
    setFriendsList(savedFriends ? JSON.parse(savedFriends) : []);
    setDmMessages(savedDMs ? JSON.parse(savedDMs) : []);

    setLoading(false);
  };

  // --- SUPABASE PROD MODE ---
  const initSupabase = async () => {
    try {
      // 1. Session check
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await handleSupabaseUserSignIn(session.user);
      }

      // 2. Auth state change listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          await handleSupabaseUserSignIn(session.user);
        } else {
          setUser(null);
          setStats({ xp: 0, totalMinutes: 0, completedSessions: 0, streakDays: 0, badges: ALL_BADGES, sessionHistory: [] });
        }
      });
      authSubscriptionRef.current = subscription;

      // 3. Fetch rooms
      const { data: dbRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: true });

      if (!roomsError && dbRooms) {
        setRooms(dbRooms.map(normalizeRoom));
      }

      // 4. Subscribe to public rooms table updates
      const roomsChan = supabase
        .channel('rooms-all-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setRooms(prev => {
              const normalized = normalizeRoom(payload.new);
              if (prev.some(r => r.id === normalized.id)) return prev;
              return [...prev, normalized];
            });
          } else if (payload.eventType === 'UPDATE') {
            setRooms(prev => prev.map(r => r.id === payload.new.id ? normalizeRoom(payload.new) : r));
          } else if (payload.eventType === 'DELETE') {
            setRooms(prev => prev.filter(r => r.id !== payload.old.id));
          }
        })
        .subscribe((status, err) => {
          if (err) console.error("rooms-all-changes subscription error:", err);
          console.log("rooms-all-changes subscription status:", status);
        });
      globalChannelsRef.current.roomsChan = roomsChan;

      // 5. Subscribe to friends updates
      const friendsChan = supabase
        .channel('friends-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, (payload) => {
          supabase.auth.getSession().then(({ data }) => {
            const userId = data?.session?.user?.id;
            if (userId) fetchFriendships(userId);
          });
        })
        .subscribe((status, err) => {
          if (err) console.error("friends-changes subscription error:", err);
          console.log("friends-changes subscription status:", status);
        });
      globalChannelsRef.current.friendsChan = friendsChan;

      // 6. Subscribe to DMs involving us
      const dmChan = supabase
        .channel('dm-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
          const newDm = payload.new;
          supabase.auth.getSession().then(({ data }) => {
            const currUserId = data?.session?.user?.id;
            if (currUserId && (newDm.sender_id === currUserId || newDm.receiver_id === currUserId)) {
              setDmMessages(prev => {
                if (prev.some(d => d.id === newDm.id)) return prev;
                return [...prev, newDm];
              });
            }
          });
        })
        .subscribe((status, err) => {
          if (err) console.error("dm-changes subscription error:", err);
          console.log("dm-changes subscription status:", status);
        });
      globalChannelsRef.current.dmChan = dmChan;

      // 7. Subscribe to profiles updates
      const profilesChan = supabase
        .channel('profiles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
          fetchAllProfiles();
        })
        .subscribe((status, err) => {
          if (err) console.error("profiles-changes subscription error:", err);
          console.log("profiles-changes subscription status:", status);
        });
      globalChannelsRef.current.profilesChan = profilesChan;

      setLoading(false);
    } catch (e) {
      console.error("Supabase init error, reverting to offline mode", e);
      initLocalFallback();
    }
  };

  const handleSupabaseUserSignIn = async (supabaseUser) => {
    let profile = null;
    let retries = 5;
    
    while (retries > 0 && !profile) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      
      if (data) {
        profile = data;
      } else {
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (!profile) {
      console.warn("Profile trigger pending. Attempting backup frontend insert...");
      const fallbackUsername = supabaseUser.user_metadata?.username || 
                               (supabaseUser.email ? supabaseUser.email.split('@')[0] : 'Guest Scholar');
      const fallbackAvatarColor = supabaseUser.user_metadata?.avatar_color || '#a855f7';
      
      const { data: insertedProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: supabaseUser.id,
          username: fallbackUsername,
          avatar_color: fallbackAvatarColor
        })
        .select()
        .maybeSingle();

      if (!insertError && insertedProfile) {
        profile = insertedProfile;
      } else {
        console.error("Failed to insert fallback profile:", insertError);
      }
    }

    if (profile) {
      const activeUser = {
        id: supabaseUser.id,
        name: profile.username,
        email: supabaseUser.email,
        avatarColor: profile.avatar_color,
        joinedAt: new Date(supabaseUser.created_at).toLocaleDateString()
      };
      setUser(activeUser);

      // Fetch history
      const { data: history } = await supabase
        .from('session_history')
        .select('*')
        .eq('user_id', supabaseUser.id)
        .order('created_at', { ascending: false });

      await fetchFriendships(supabaseUser.id);
      await fetchDirectMessages(supabaseUser.id);
      await fetchAllProfiles();

      setStats({
        xp: profile.xp,
        totalMinutes: profile.total_minutes,
        completedSessions: profile.completed_sessions,
        streakDays: profile.streak_days,
        badges: ALL_BADGES.map(b => ({
          ...b,
          unlocked: b.id === 'b1' ? true : 
                    b.id === 'b3' ? true : 
                    b.id === 'b6' ? true :
                    (b.id === 'b2' && profile.completed_sessions >= 6) ||
                    (b.id === 'b4' && profile.streak_days >= 5) || false
        })),
        sessionHistory: history ? history.map(h => ({
          id: h.id,
          roomName: h.room_name,
          date: new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          minutes: h.minutes
        })) : []
      });
    }
  };

  const fetchFriendships = async (currUserId) => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id_1.eq.${currUserId},user_id_2.eq.${currUserId}`);
    if (data) setFriendsList(data);
  };

  const fetchDirectMessages = async (currUserId) => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${currUserId},receiver_id.eq.${currUserId}`)
      .order('created_at', { ascending: true });
    if (data) setDmMessages(data);
  };

  const fetchAllProfiles = async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_color, xp');
    if (data) setAllProfiles(data);
  };

  // --- Auth Actions ---
  const signUp = async (email, password, username) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      // Fallback: Login instantly with guest
      login(username);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          avatar_color: '#' + Math.floor(Math.random()*16777215).toString(16)
        }
      }
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const loginWithPassword = async (email, password) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      login(email.split('@')[0]);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  // Guest Access (Anonymous Signup/Login)
  const login = async (username) => {
    setAuthError(null);
    if (!isSupabaseConfigured) {
      const newUser = {
        id: 'user-' + Date.now(),
        name: username,
        avatarColor: '#a855f7',
        joinedAt: new Date().toLocaleDateString()
      };
      setUser(newUser);
      sessionStorage.setItem('study_user', JSON.stringify(newUser));

      // Register profile in fallback list and notify tabs
      const profile = { id: newUser.id, username: newUser.name, avatar_color: newUser.avatarColor, xp: stats.xp };
      setAllProfiles(prev => {
        const list = prev.filter(p => p.id !== newUser.id);
        const next = [...list, profile];
        localStorage.setItem('study_profiles', JSON.stringify(next));
        localBroadcastChannelRef.current?.postMessage({ type: 'PROFILE_CREATED', payload: profile });
        return next;
      });
      return;
    }

    // Try signing in anonymously via Supabase
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          username: username || 'Guest Scholar',
          avatar_color: '#06b6d4'
        }
      }
    });

    if (error) {
      setAuthError(error.message);
    }
  };

  const logout = async () => {
    if (activeRoomId) {
      await leaveRoom(activeRoomId);
    }
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      setUser(null);
      sessionStorage.removeItem('study_user');
    }
  };

  // =================================================================
  // REAL-TIME STUDY ROOM SYNC (DATABASE SUBSCRIBERS)
  // =================================================================

  useEffect(() => {
    if (!activeRoomId) return;

    if (!isSupabaseConfigured) {
      // Setup mock participants lists + ourselves
      const selfProfile = { name: user?.name || 'You', status: 'Joined 🚪', xp: stats.xp, avatarColor: user?.avatarColor };
      setParticipants([
        ...(MOCK_PARTICIPANTS[activeRoomId] || []),
        selfProfile
      ]);

      setChatMessages([
        { sender: 'System', text: 'Entered room. Tabbing sync is enabled.', timestamp: 'Now' }
      ]);
      setTasks([]);
      setWhiteboardData(localStorage.getItem(`study_canvas_${activeRoomId}`) || '');

      // Bind local sync channel receiver
      if (localBroadcastChannelRef.current) {
        localBroadcastChannelRef.current.onmessage = (event) => {
          const { type, payload } = event.data;
          if (type === 'CHAT_MSG' && payload.roomId === activeRoomId) {
            setChatMessages(prev => [...prev, payload.message]);
          } else if (type === 'TASK_UPDATE' && payload.roomId === activeRoomId) {
            setTasks(payload.tasks);
          } else if (type === 'TIMER_TOGGLE' && payload.roomId === activeRoomId) {
            setTimerState(prev => ({
              ...prev,
              isRunning: payload.isRunning,
              secondsLeft: payload.secondsLeft !== undefined ? payload.secondsLeft : prev.secondsLeft,
              mode: payload.mode || prev.mode
            }));
          } else if (type === 'CANVAS_SYNC' && payload.roomId === activeRoomId) {
            setWhiteboardData(payload.dataURL);
          } else if (type === 'PARTICIPANT_JOIN' && payload.roomId === activeRoomId) {
            const { userProfile } = payload;
            if (userProfile.name !== user?.name) {
              setParticipants(prev => {
                if (prev.some(p => p.name === userProfile.name)) return prev;
                return [...prev, userProfile];
              });
              // Send handshake back so the newly joined tab knows we are here!
              localBroadcastChannelRef.current?.postMessage({
                type: 'PARTICIPANT_ALIVE',
                payload: { roomId: activeRoomId, userProfile: selfProfile }
              });
            }
          } else if (type === 'PARTICIPANT_ALIVE' && payload.roomId === activeRoomId) {
            const { userProfile } = payload;
            if (userProfile.name !== user?.name) {
              setParticipants(prev => {
                if (prev.some(p => p.name === userProfile.name)) return prev;
                return [...prev, userProfile];
              });
            }
          } else if (type === 'PARTICIPANT_STATUS' && payload.roomId === activeRoomId) {
            setParticipants(prev => prev.map(p => p.name === payload.username ? { ...p, status: payload.status } : p));
          } else if (type === 'PARTICIPANT_LEAVE' && payload.roomId === activeRoomId) {
            setParticipants(prev => prev.filter(p => p.name !== payload.username));
          }
        };

        // Notify other tabs that we've joined
        localBroadcastChannelRef.current.postMessage({
          type: 'PARTICIPANT_JOIN',
          payload: { roomId: activeRoomId, userProfile: selfProfile }
        });
      }

      // Start offline tick local timer
      setTimerState({ isRunning: false, secondsLeft: 1500, duration: 1500, mode: 'focus', timerMode: 'pomodoro' });
      return;
    }

    // --- PROD SUPABASE SYNC LOGIC ---

    // 1. Fetch Room State (Chats, Tasks, Whiteboard)
    const fetchInitialRoomData = async () => {
      // Chats
      const { data: dbChats } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', activeRoomId)
        .order('created_at', { ascending: true })
        .limit(50);
      
      if (dbChats) {
        setChatMessages(dbChats.map(c => ({
          sender: c.sender_name,
          text: c.text,
          timestamp: formatTimestamp(c.created_at)
        })));
      }

      // Tasks
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('room_id', activeRoomId)
        .order('created_at', { ascending: true });
      
      if (dbTasks) {
        setTasks(dbTasks.map(t => ({
          id: t.id,
          text: t.text,
          completed: t.completed,
          user: t.user_name
        })));
      }

      // Whiteboard
      const { data: dbBoard } = await supabase
        .from('whiteboards')
        .select('data_url')
        .eq('room_id', activeRoomId)
        .maybeSingle();
      if (dbBoard) {
        setWhiteboardData(dbBoard.data_url || '');
      } else {
        // Create a whiteboard record if missing (e.g. for seed rooms)
        await supabase.from('whiteboards').insert({
          room_id: activeRoomId,
          data_url: ''
        });
        setWhiteboardData('');
      }
    };

    fetchInitialRoomData();

    // 2. Subscribe to all room-specific updates in a single multiplexed channel
    const roomSyncChan = supabase.channel(`room-sync:${activeRoomId}`);

    roomSyncChan
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `room_id=eq.${activeRoomId}` 
      }, (payload) => {
        const timestampVal = formatTimestamp(payload.new.created_at);
        setChatMessages(prev => [...prev, {
          sender: payload.new.sender_name,
          text: payload.new.text,
          timestamp: timestampVal
        }]);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks', 
        filter: `room_id=eq.${activeRoomId}` 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [...prev, {
            id: payload.new.id,
            text: payload.new.text,
            completed: payload.new.completed,
            user: payload.new.user_name
          }]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? {
            ...t,
            completed: payload.new.completed
          } : t));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id !== payload.old.id));
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'whiteboards', 
        filter: `room_id=eq.${activeRoomId}` 
      }, (payload) => {
        setWhiteboardData(payload.new.data_url || '');
      })
      .on('presence', { event: 'sync' }, () => {
        const state = roomSyncChan.presenceState();
        const list = Object.values(state).flat().map(p => ({
          name: p.username || 'Scholar',
          status: p.status || 'Joined 🚪',
          avatarColor: p.avatar_color || '#a855f7',
          xp: p.xp || 0
        }));
        setParticipants(list);
      })
      .subscribe(async (status, err) => {
        if (err) console.error("roomSyncChan subscription error:", err);
        console.log("roomSyncChan subscription status:", status);
        if (status === 'SUBSCRIBED' && user) {
          await roomSyncChan.track({
            username: user.name,
            status: 'Focusing ✍️',
            avatar_color: user.avatarColor,
            xp: stats.xp
          });
        }
      });

    channelRef.current = {
      roomSyncChan
    };

    return () => {
      if (supabase) {
        supabase.removeChannel(roomSyncChan);
      }
    };

  }, [activeRoomId, user?.id]);

  // =================================================================
  // TIMER TICKING LOOP (SERVERTIME COMPARATIVE SYNC)
  // =================================================================

  useEffect(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      if (!activeRoomId) return;
      const room = rooms.find(r => r.id === activeRoomId);
      if (!room) return;

      if (!isSupabaseConfigured) {
        // Offline ticking logic
        setTimerState(prev => {
          if (!prev.isRunning) return prev;
          if (prev.timerMode === 'stopwatch') {
            return { ...prev, secondsLeft: prev.secondsLeft + 1 };
          } else {
            if (prev.secondsLeft > 0) {
              return { ...prev, secondsLeft: prev.secondsLeft - 1 };
            } else {
              // Complete offline timer
              const nextMode = prev.mode === 'focus' ? 'break' : 'focus';
              const nextDuration = nextMode === 'focus' ? prev.duration : 300;
              return {
                ...prev,
                isRunning: false,
                mode: nextMode,
                secondsLeft: nextDuration
              };
            }
          }
        });
        return;
      }

      // --- SUPABASE SYNCHRONIZED TIMER MATH ---
      if (room.timer_is_running) {
        const startedAt = new Date(room.timer_started_at).getTime();
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startedAt) / 1000);

        if (room.timer_mode === 'pomodoro') {
          const duration = room.timer_current_mode === 'focus' ? room.timer_duration : 300;
          const secondsRemaining = duration - elapsedSeconds;

          if (secondsRemaining > 0) {
            setTimerState({
              isRunning: true,
              secondsLeft: secondsRemaining,
              duration: room.timer_duration,
              mode: room.timer_current_mode,
              timerMode: 'pomodoro'
            });
          } else {
            // Timer expired! Toggle database state (runs once for client who hits it)
            handleTimerExpirationOnDB(room);
          }
        } else {
          // Stopwatch counts up
          setTimerState({
            isRunning: true,
            secondsLeft: elapsedSeconds + (room.timer_paused_seconds_left || 0),
            duration: 0,
            mode: 'focus',
            timerMode: 'stopwatch'
          });
        }
      } else {
        // Paused state
        setTimerState({
          isRunning: false,
          secondsLeft: room.timer_paused_seconds_left,
          duration: room.timer_duration,
          mode: room.timer_current_mode,
          timerMode: room.timer_mode
        });
      }
    }, 1000);

    return () => clearInterval(timerIntervalRef.current);
  }, [activeRoomId, rooms]);

  const handleTimerExpirationOnDB = async (room) => {
    // Toggle Pomodoro state in database
    const wasFocus = room.timer_current_mode === 'focus';
    const nextMode = wasFocus ? 'break' : 'focus';
    const nextDuration = nextMode === 'focus' ? room.timer_duration : 300;

    // Only update if timer is running in local memory to prevent infinite loop races
    if (timerState.isRunning) {
      await supabase
        .from('rooms')
        .update({
          timer_is_running: false,
          timer_current_mode: nextMode,
          timer_paused_seconds_left: nextDuration
        })
        .eq('id', room.id);

      // Award XP
      if (wasFocus) {
        await awardXPAndStats(room.timer_duration / 60, room.name);
      }
    }
  };

  const awardXPAndStats = async (minutesStudied, roomName) => {
    const gainedXP = Math.round(minutesStudied * 10);
    const updatedXP = stats.xp + gainedXP;
    const updatedMinutes = stats.totalMinutes + Math.round(minutesStudied);
    const updatedSessions = stats.completedSessions + 1;

    setStats(prev => ({
      ...prev,
      xp: updatedXP,
      totalMinutes: updatedMinutes,
      completedSessions: updatedSessions,
      sessionHistory: [
        {
          id: 'temp-' + Date.now(),
          roomName,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          minutes: Math.round(minutesStudied)
        },
        ...prev.sessionHistory
      ]
    }));

    if (isSupabaseConfigured && user) {
      // 1. Log Session
      await supabase.from('session_history').insert({
        user_id: user.id,
        room_name: roomName,
        minutes: Math.round(minutesStudied)
      });

      // 2. Update Profile totals
      await supabase
        .from('profiles')
        .update({
          xp: updatedXP,
          total_minutes: updatedMinutes,
          completed_sessions: updatedSessions
        })
        .eq('id', user.id);
    }
  };

  // --- Study Room Handlers ---
  const joinRoom = (roomId) => {
    setActiveRoomId(roomId);
    
    if (!isSupabaseConfigured && user) {
      const selfProfile = { name: user.name, status: 'Joined 🚪', xp: stats.xp, avatarColor: user.avatarColor };
      setParticipants(prev => {
        if (prev.some(p => p.name === user.name)) return prev;
        return [...prev, selfProfile];
      });
      localBroadcastChannelRef.current?.postMessage({
        type: 'PARTICIPANT_JOIN',
        payload: { roomId, userProfile: selfProfile }
      });
    }

    setTimeout(() => {
      const roomExists = rooms.some(r => r.id === roomId);
      if (roomExists) {
        sendSystemAlert(roomId, `${user?.name || 'Someone'} joined the study room.`).catch(err => {
          console.warn("Failed to send join system alert:", err);
        });
      }
    }, 400);
  };

  const leaveRoom = async (roomId) => {
    const roomExists = rooms.some(r => r.id === roomId);
    if (roomExists) {
      try {
        await sendSystemAlert(roomId, `${user?.name || 'Someone'} left the study room.`);
      } catch (err) {
        console.warn("Failed to send leave system alert:", err);
      }
    }
    
    if (!isSupabaseConfigured && user) {
      localBroadcastChannelRef.current?.postMessage({
        type: 'PARTICIPANT_LEAVE',
        payload: { roomId, username: user.name }
      });
      setParticipants([]);
    }

    if (isSupabaseConfigured && channelRef.current?.roomSyncChan) {
      try {
        await channelRef.current.roomSyncChan.untrack();
      } catch (err) {
        console.warn("Failed presence untrack:", err);
      }
    }
    setActiveRoomId(null);
  };

  const updateStatus = async (roomId, newStatus) => {
    if (!isSupabaseConfigured && user) {
      setParticipants(prev => prev.map(p => p.name === user.name ? { ...p, status: newStatus } : p));
      localBroadcastChannelRef.current?.postMessage({
        type: 'PARTICIPANT_STATUS',
        payload: { roomId, username: user.name, status: newStatus }
      });
      return;
    }

    if (isSupabaseConfigured && channelRef.current?.roomSyncChan && user) {
      await channelRef.current.roomSyncChan.track({
        username: user.name,
        status: newStatus,
        avatar_color: user.avatarColor,
        xp: stats.xp
      });
    }
  };

  // --- Create Room ---
  const createRoom = async (name, description, category, tagsArray, timerMode, durationMinutes, isPrivate = false) => {
    if (!user) return;

    // Check public rooms limit
    if (!isPrivate) {
      const publicCreatedRooms = rooms.filter(r => {
        const isCreator = isSupabaseConfigured 
          ? r.creator_id === user.id 
          : r.creator === user.name;
        const isRoomPrivate = r.is_private || false;
        return isCreator && !isRoomPrivate;
      });
      if (publicCreatedRooms.length >= 2) {
        throw new Error("You have reached the limit of 2 public rooms. Please delete an existing public room or make this room private.");
      }
    }

    const durationSeconds = durationMinutes * 60;
    const tags = tagsArray.split(',').map(t => t.trim()).filter(Boolean);
    const bgImage = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=600&auto=format&fit=crop';

    if (!isSupabaseConfigured) {
      // Fallback
      const newRoom = {
        id: 'room-' + Date.now(),
        name,
        description,
        category,
        tags,
        creator: user.name,
        timerMode,
        timerDuration: durationSeconds,
        bgImage,
        is_private: isPrivate
      };
      setRooms(prev => {
        const next = [...prev, newRoom];
        localStorage.setItem('study_rooms', JSON.stringify(next));
        return next;
      });
      localBroadcastChannelRef.current?.postMessage({
        type: 'ROOM_CREATED',
        payload: newRoom
      });
      return newRoom.id;
    }

    // Insert to database
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        name,
        description,
        category,
        tags,
        creator_id: user.id,
        timer_mode: timerMode,
        timer_duration: durationSeconds,
        timer_paused_seconds_left: durationSeconds,
        bg_image: bgImage,
        is_private: isPrivate
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      throw error;
    }

    const normalizedNewRoom = normalizeRoom(data);
    setRooms(prev => {
      if (prev.some(r => r.id === normalizedNewRoom.id)) return prev;
      return [...prev, normalizedNewRoom];
    });

    // Create a whiteboard record
    await supabase.from('whiteboards').insert({
      room_id: data.id,
      data_url: ''
    });

    return data.id;
  };

  // --- Delete Room ---
  const deleteRoom = async (roomId) => {
    if (!isSupabaseConfigured) {
      setRooms(prev => {
        const next = prev.filter(r => r.id !== roomId);
        localStorage.setItem('study_rooms', JSON.stringify(next));
        return next;
      });
      localBroadcastChannelRef.current?.postMessage({
        type: 'ROOM_DELETED',
        payload: roomId
      });
      return;
    }

    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId);

    if (error) {
      console.error("Error deleting room:", error);
      throw error;
    }
  };

  // --- Send System Alert ---
  const sendSystemAlert = async (roomId, text) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const message = {
      sender: 'System',
      text,
      timestamp
    };

    if (!isSupabaseConfigured) {
      setChatMessages(prev => [...prev, message]);
      localBroadcastChannelRef.current?.postMessage({
        type: 'CHAT_MSG',
        payload: { roomId, message }
      });
      return;
    }

    await supabase.from('messages').insert({
      room_id: roomId,
      sender_name: 'System',
      text
    });
  };

  // --- Chat Message Send ---
  const sendChatMessage = async (roomId, text) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      // Local Fallback
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const message = {
        sender: user.name,
        text,
        timestamp
      };
      setChatMessages(prev => [...prev, message]);
      localBroadcastChannelRef.current?.postMessage({
        type: 'CHAT_MSG',
        payload: { roomId, message }
      });
      return;
    }

    // Insert to Supabase (Realtime sends it to everyone)
    await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: user.id,
      sender_name: user.name,
      text
    });
  };

  // --- Shared Checklist Item operations ---
  const addTask = async (roomId, text) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      const newTask = {
        id: 't-' + Date.now(),
        text,
        completed: false,
        user: user.name
      };
      setTasks(prev => {
        const next = [...prev, newTask];
        localBroadcastChannelRef.current?.postMessage({
          type: 'TASK_UPDATE',
          payload: { roomId, tasks: next }
        });
        return next;
      });
      return;
    }

    await supabase.from('tasks').insert({
      room_id: roomId,
      user_id: user.id,
      user_name: user.name,
      text
    });
  };

  const toggleTask = async (roomId, taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!isSupabaseConfigured) {
      setTasks(prev => {
        const next = prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
        localBroadcastChannelRef.current?.postMessage({
          type: 'TASK_UPDATE',
          payload: { roomId, tasks: next }
        });
        return next;
      });
      return;
    }

    await supabase
      .from('tasks')
      .update({ completed: !task.completed })
      .eq('id', taskId);
  };

  const deleteTask = async (roomId, taskId) => {
    if (!isSupabaseConfigured) {
      setTasks(prev => {
        const next = prev.filter(t => t.id !== taskId);
        localBroadcastChannelRef.current?.postMessage({
          type: 'TASK_UPDATE',
          payload: { roomId, tasks: next }
        });
        return next;
      });
      return;
    }

    await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
  };

  const saveWhiteboard = async (roomId, dataURL) => {
    setWhiteboardData(dataURL);

    if (!isSupabaseConfigured) {
      localStorage.setItem(`study_canvas_${roomId}`, dataURL);
      localBroadcastChannelRef.current?.postMessage({
        type: 'CANVAS_SYNC',
        payload: { roomId, dataURL }
      });
      return;
    }

    await supabase
      .from('whiteboards')
      .update({ data_url: dataURL, updated_at: new Date().toISOString() })
      .eq('room_id', roomId);
  };

  // --- Timer Operations ---
  const toggleTimer = async (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    if (!isSupabaseConfigured) {
      setTimerState(prev => {
        const next = { ...prev, isRunning: !prev.isRunning };
        localBroadcastChannelRef.current?.postMessage({
          type: 'TIMER_TOGGLE',
          payload: { roomId, isRunning: next.isRunning, secondsLeft: next.secondsLeft, mode: next.mode }
        });
        sendSystemAlert(roomId, next.isRunning 
          ? `${user?.name || 'Someone'} started the focus timer.` 
          : `${user?.name || 'Someone'} paused the timer.`
        );
        return next;
      });
      return;
    }

    const nextIsRunning = !room.timer_is_running;
    const now = new Date().toISOString();

    await supabase
      .from('rooms')
      .update({
        timer_is_running: nextIsRunning,
        timer_started_at: nextIsRunning ? now : null,
        timer_paused_seconds_left: nextIsRunning 
          ? room.timer_paused_seconds_left 
          : timerState.secondsLeft
      })
      .eq('id', roomId);

    sendSystemAlert(roomId, nextIsRunning 
      ? `${user?.name || 'Someone'} started the focus timer.` 
      : `${user?.name || 'Someone'} paused the timer.`
    );
  };

  const resetTimer = async (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const defaultSecs = room.timer_current_mode === 'focus' ? room.timer_duration : 300;

    if (!isSupabaseConfigured) {
      setTimerState(prev => {
        const next = { ...prev, isRunning: false, secondsLeft: defaultSecs };
        localBroadcastChannelRef.current?.postMessage({
          type: 'TIMER_TOGGLE',
          payload: { roomId, isRunning: false, secondsLeft: defaultSecs, mode: next.mode }
        });
        sendSystemAlert(roomId, `${user?.name || 'Someone'} reset the timer.`);
        return next;
      });
      return;
    }

    await supabase
      .from('rooms')
      .update({
        timer_is_running: false,
        timer_started_at: null,
        timer_paused_seconds_left: defaultSecs
      })
      .eq('id', roomId);

    sendSystemAlert(roomId, `${user?.name || 'Someone'} reset the timer.`);
  };

  const setTimerMode = async (roomId, newMode) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    const defaultSecs = newMode === 'focus' ? room.timer_duration : 300;

    if (!isSupabaseConfigured) {
      setTimerState(prev => {
        const next = { ...prev, isRunning: false, mode: newMode, secondsLeft: defaultSecs };
        localBroadcastChannelRef.current?.postMessage({
          type: 'TIMER_TOGGLE',
          payload: { roomId, isRunning: false, secondsLeft: defaultSecs, mode: newMode }
        });
        sendSystemAlert(roomId, `${user?.name || 'Someone'} changed timer to ${newMode} mode.`);
        return next;
      });
      return;
    }

    await supabase
      .from('rooms')
      .update({
        timer_is_running: false,
        timer_started_at: null,
        timer_current_mode: newMode,
        timer_paused_seconds_left: defaultSecs
      })
      .eq('id', roomId);

    sendSystemAlert(roomId, `${user?.name || 'Someone'} changed timer to ${newMode} mode.`);
  };

  // --- Log Offline Hours manually ---
  const addManualSession = async (minutes, topic) => {
    await awardXPAndStats(minutes, `Self Study: ${topic}`);
    
    // Add streak increase
    if (isSupabaseConfigured && user) {
      const { data } = await supabase.from('profiles').select('streak_days').eq('id', user.id).single();
      const nextStreak = (data?.streak_days || 0) + 1;
      await supabase
        .from('profiles')
        .update({ streak_days: nextStreak })
        .eq('id', user.id);
      
      setStats(prev => ({ ...prev, streakDays: nextStreak }));
    } else {
      setStats(prev => {
        const nextStreak = prev.streakDays + 1;
        const nextStats = { ...prev, streakDays: nextStreak };
        localStorage.setItem('study_stats', JSON.stringify(nextStats));
        return nextStats;
      });
    }
  };

  // --- Social Systems: Friends & DMs ---
  const sendFriendRequest = async (targetUsername) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      // Local fallback mock
      const target = allProfiles.find(p => p.username.toLowerCase() === targetUsername.toLowerCase());
      if (!target) throw new Error("Scholar not found.");
      if (target.id === user.id) throw new Error("You cannot add yourself.");
      
      const newRequest = {
        id: 'req-' + Date.now(),
        user_id_1: user.id < target.id ? user.id : target.id,
        user_id_2: user.id < target.id ? target.id : user.id,
        status: 'pending',
        sender_id: user.id
      };
      setFriendsList(prev => {
        const next = [...prev, newRequest];
        localStorage.setItem('study_friends', JSON.stringify(next));
        localBroadcastChannelRef.current?.postMessage({ type: 'FRIENDS_UPDATE', payload: next });
        return next;
      });
      return;
    }

    // Cloud Mode
    // 1. Find profile
    const { data: targetProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', targetUsername)
      .maybeSingle();

    if (profileErr || !targetProfile) {
      throw new Error("Scholar not found.");
    }
    if (targetProfile.id === user.id) {
      throw new Error("You cannot add yourself.");
    }

    // 2. Check duplicate
    const exists = friendsList.some(f => 
      (f.user_id_1 === user.id && f.user_id_2 === targetProfile.id) ||
      (f.user_id_1 === targetProfile.id && f.user_id_2 === user.id)
    );
    if (exists) {
      throw new Error("Friend request already sent or accepted.");
    }

    // 3. Insert
    const [id1, id2] = user.id < targetProfile.id ? [user.id, targetProfile.id] : [targetProfile.id, user.id];
    const { error: insertErr } = await supabase
      .from('friends')
      .insert({
        user_id_1: id1,
        user_id_2: id2,
        status: 'pending',
        sender_id: user.id
      });

    if (insertErr) throw insertErr;
  };

  const acceptFriendRequest = async (requestId) => {
    if (!isSupabaseConfigured) {
      setFriendsList(prev => {
        const next = prev.map(f => f.id === requestId ? { ...f, status: 'accepted' } : f);
        localStorage.setItem('study_friends', JSON.stringify(next));
        localBroadcastChannelRef.current?.postMessage({ type: 'FRIENDS_UPDATE', payload: next });
        return next;
      });
      return;
    }

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) throw error;
  };

  const cancelOrRemoveFriend = async (requestId) => {
    if (!isSupabaseConfigured) {
      setFriendsList(prev => {
        const next = prev.filter(f => f.id !== requestId);
        localStorage.setItem('study_friends', JSON.stringify(next));
        localBroadcastChannelRef.current?.postMessage({ type: 'FRIENDS_UPDATE', payload: next });
        return next;
      });
      return;
    }

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  };

  const sendDirectMessage = async (receiverId, text, isInvite = false, roomId = null) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      // Local DM fallback
      const newDm = {
        id: 'dm-' + Date.now(),
        sender_id: user.id,
        sender_name: user.name,
        receiver_id: receiverId,
        text,
        is_invite: isInvite,
        room_id: roomId,
        created_at: new Date().toISOString()
      };
      setDmMessages(prev => {
        const next = [...prev, newDm];
        localStorage.setItem('study_dms', JSON.stringify(next));
        localBroadcastChannelRef.current?.postMessage({ type: 'DM_MSG', payload: newDm });
        return next;
      });
      return;
    }

    // Cloud Mode
    const { error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        sender_name: user.name,
        receiver_id: receiverId,
        text,
        is_invite: isInvite,
        room_id: roomId
      });

    if (error) throw error;
  };

  return (
    <RealtimeSyncContext.Provider
      value={{
        supabase,
        user,
        signUp,
        loginWithPassword,
        login,
        logout,
        authError,
        loading,
        rooms,
        createRoom,
        deleteRoom,
        activeRoomId,
        joinRoom,
        leaveRoom,
        updateStatus,
        participants,
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
        stats,
        addManualSession,
        friendsList,
        dmMessages,
        allProfiles,
        sendFriendRequest,
        acceptFriendRequest,
        cancelOrRemoveFriend,
        sendDirectMessage
      }}
    >
      {children}
    </RealtimeSyncContext.Provider>
  );
};

export const useRealtimeSync = () => useContext(RealtimeSyncContext);
