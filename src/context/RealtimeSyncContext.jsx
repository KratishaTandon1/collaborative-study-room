import { createContext, useContext, useState, useEffect, useRef } from 'react';
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

const isSupabaseConfigured = !!hasValidKeys;

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

const generateRandomColor = () => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
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

  const localBroadcastChannelRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const globalChanRef = useRef(null);
  const globalChanStatusRef = useRef('none');
  const roomSyncChanRef = useRef(null);
  const roomSyncChanStatusRef = useRef('none');
  const activeRoomIdRef = useRef(activeRoomId);
  const authSubscriptionRef = useRef(null);
  const userRef = useRef(user);
  const statsRef = useRef(stats);
  const timerStateRef = useRef(timerState);

  const globalCleanedUpRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);


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

  const fetchFriendships = async (currUserId) => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id_1.eq.${currUserId},user_id_2.eq.${currUserId}`);
    if (globalCleanedUpRef.current) return;
    if (data) setFriendsList(data);
  };

  const fetchDirectMessages = async (currUserId) => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${currUserId},receiver_id.eq.${currUserId}`)
      .order('created_at', { ascending: true });
    if (globalCleanedUpRef.current) return;
    if (data) setDmMessages(data);
  };

  const fetchAllProfiles = async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_color, xp');
    if (globalCleanedUpRef.current) return;
    if (data) setAllProfiles(data);
  };

  // --- REAL-TIME SUBSCRIPTION FUNCTIONS (SELF-HEALING & MULTIPLEXED) ---
  const subscribeGlobalChan = () => {
    if (!isSupabaseConfigured || !supabase || globalCleanedUpRef.current) return;

    const expectedTopic = 'realtime:global-changes';
    const currentChannel = globalChanRef.current;

    if (globalChanStatusRef.current === 'SUBSCRIBED' && currentChannel && currentChannel.topic === expectedTopic) {
      console.log("[REALTIME-GLOBAL] Already subscribed to global changes. Skipping...");
      return;
    }
    if (globalChanStatusRef.current === 'joining' && currentChannel && currentChannel.topic === expectedTopic) {
      console.log("[REALTIME-GLOBAL] Subscription in progress for global changes. Skipping...");
      return;
    }

    if (globalChanRef.current) {
      try {
        supabase.removeChannel(globalChanRef.current);
      } catch (e) {
        console.warn("Error removing existing global channel:", e);
      }
      globalChanRef.current = null;
    }

    globalChanStatusRef.current = 'joining';
    const chan = supabase.channel('global-changes');

    chan
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (globalCleanedUpRef.current) return;
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
        if (globalCleanedUpRef.current) return;
        const userId = userRef.current?.id;
        if (userId) fetchFriendships(userId);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        if (globalCleanedUpRef.current) return;
        const newDm = payload.new;
        const currUserId = userRef.current?.id;
        if (currUserId && (newDm.sender_id === currUserId || newDm.receiver_id === currUserId)) {
          setDmMessages(prev => {
            if (prev.some(d => d.id === newDm.id)) return prev;
            return [...prev, newDm];
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        if (globalCleanedUpRef.current) return;
        fetchAllProfiles();
      })
      .subscribe(async (status, err) => {
        if (globalCleanedUpRef.current) return;
        globalChanStatusRef.current = status;
        console.log(`[REALTIME-GLOBAL] Status update: ${status}`, err || '');

        if (status === 'SUBSCRIBED') {
          console.log("[REALTIME-GLOBAL] Subscribed successfully. Fetching catch-up data...");
          try {
            const { data: dbRooms, error: roomsError } = await supabase
              .from('rooms')
              .select('*')
              .order('created_at', { ascending: true });
            
            if (globalCleanedUpRef.current) return;
            if (!roomsError && dbRooms) {
              setRooms(dbRooms.map(normalizeRoom));
            }

            let userId = userRef.current?.id;
            if (!userId) {
              const { data: { session } } = await supabase.auth.getSession();
              userId = session?.user?.id;
            }

            if (userId) {
              await fetchFriendships(userId);
              await fetchDirectMessages(userId);
              await fetchAllProfiles();
            }
          } catch (catchUpErr) {
            console.error("[REALTIME-GLOBAL] Catch-up fetch error:", catchUpErr);
          }
        }
      });

    globalChanRef.current = chan;
  };

  const subscribeRoomChan = (roomId) => {
    if (!isSupabaseConfigured || !supabase || globalCleanedUpRef.current || !roomId) return;

    const expectedTopic = `realtime:room-sync:${roomId}`;
    const currentChannel = roomSyncChanRef.current;

    if (roomSyncChanStatusRef.current === 'SUBSCRIBED' && currentChannel && currentChannel.topic === expectedTopic) {
      console.log(`[REALTIME-ROOM:${roomId}] Already subscribed to room channel. Skipping...`);
      return;
    }
    if (roomSyncChanStatusRef.current === 'joining' && currentChannel && currentChannel.topic === expectedTopic) {
      console.log(`[REALTIME-ROOM:${roomId}] Subscription in progress for room channel. Skipping...`);
      return;
    }

    if (roomSyncChanRef.current) {
      try {
        supabase.removeChannel(roomSyncChanRef.current);
      } catch (e) {
        console.warn("Error removing existing room channel:", e);
      }
      roomSyncChanRef.current = null;
    }

    roomSyncChanStatusRef.current = 'joining';
    const roomSyncChan = supabase.channel(`room-sync:${roomId}`);

    const fetchInitialRoomData = async () => {
      if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;

      try {
        const { data: dbChats } = await supabase
          .from('messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true })
          .limit(50);
        
        if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;

        if (dbChats) {
          setChatMessages(dbChats.map(c => ({
            id: c.id,
            sender: c.sender_name,
            text: c.text,
            timestamp: formatTimestamp(c.created_at)
          })));
        }

        const { data: dbTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });
        
        if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;

        if (dbTasks) {
          setTasks(dbTasks.map(t => ({
            id: t.id,
            text: t.text,
            completed: t.completed,
            user: t.user_name
          })));
        }

        const { data: dbBoard } = await supabase
          .from('whiteboards')
          .select('data_url')
          .eq('room_id', roomId)
          .maybeSingle();

        if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;

        if (dbBoard) {
          setWhiteboardData(dbBoard.data_url || '');
        } else {
          await supabase.from('whiteboards').insert({
            room_id: roomId,
            data_url: ''
          });
          if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;
          setWhiteboardData('');
        }
      } catch (err) {
        console.error(`[REALTIME-ROOM:${roomId}] Initial load error:`, err);
      }
    };

    fetchInitialRoomData();

    roomSyncChan
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `room_id=eq.${roomId}` 
      }, (payload) => {
        if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;
        const timestampVal = formatTimestamp(payload.new.created_at);
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;

          const matchIndex = prev.findIndex(m => 
            String(m.id).startsWith('temp-msg-') && 
            m.text === payload.new.text && 
            m.sender === payload.new.sender_name
          );

          if (matchIndex !== -1) {
            const next = [...prev];
            next[matchIndex] = {
              id: payload.new.id,
              sender: payload.new.sender_name,
              text: payload.new.text,
              timestamp: timestampVal
            };
            return next;
          }

          return [...prev, {
            id: payload.new.id,
            sender: payload.new.sender_name,
            text: payload.new.text,
            timestamp: timestampVal
          }];
        });
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'tasks', 
        filter: `room_id=eq.${roomId}` 
      }, (payload) => {
        if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;
        if (payload.eventType === 'INSERT') {
          setTasks(prev => {
            if (prev.some(t => t.id === payload.new.id)) return prev;
            
            const matchIndex = prev.findIndex(t => 
              String(t.id).startsWith('temp-t-') && 
              t.text === payload.new.text && 
              t.user === payload.new.user_name
            );

            if (matchIndex !== -1) {
              const next = [...prev];
              next[matchIndex] = {
                id: payload.new.id,
                text: payload.new.text,
                completed: payload.new.completed,
                user: payload.new.user_name
              };
              return next;
            }

            return [...prev, {
              id: payload.new.id,
              text: payload.new.text,
              completed: payload.new.completed,
              user: payload.new.user_name
            }];
          });
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
        filter: `room_id=eq.${roomId}` 
      }, (payload) => {
        if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;
        setWhiteboardData(payload.new.data_url || '');
      })
      .on('presence', { event: 'sync' }, () => {
        if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;
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
        if (globalCleanedUpRef.current || activeRoomIdRef.current !== roomId) return;
        roomSyncChanStatusRef.current = status;
        console.log(`[REALTIME-ROOM:${roomId}] Status update: ${status}`, err || '');

        if (status === 'SUBSCRIBED' && userRef.current) {
          await roomSyncChan.track({
            username: userRef.current.name,
            status: 'Focusing ✍️',
            avatar_color: userRef.current.avatarColor,
            xp: statsRef.current.xp
          });
          
          fetchInitialRoomData();
        }
      });

    roomSyncChanRef.current = roomSyncChan;
  };

  // --- CONNECTION HEALTH MONITOR & REACTIVATION LIFECYCLE ---
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // 1. Periodic health check every 8 seconds
    const healthCheckInterval = setInterval(() => {
      if (globalCleanedUpRef.current) return;
      if (!userRef.current) return; // Only monitor if user is logged in

      const globalStatus = globalChanStatusRef.current;
      console.log(`[HEALTHCHECK] Global connection status: ${globalStatus}`);
      if (globalStatus !== 'SUBSCRIBED' && globalStatus !== 'joining') {
        console.warn(`[HEALTHCHECK] Global connection is not active (${globalStatus}). Recovering channel...`);
        subscribeGlobalChan();
      }

      const activeRoom = activeRoomIdRef.current;
      if (activeRoom) {
        const roomStatus = roomSyncChanStatusRef.current;
        console.log(`[HEALTHCHECK] Room ${activeRoom} connection status: ${roomStatus}`);
        if (roomStatus !== 'SUBSCRIBED' && roomStatus !== 'joining') {
          console.warn(`[HEALTHCHECK] Room channel is not active (${roomStatus}). Recovering channel...`);
          subscribeRoomChan(activeRoom);
        }
      }
    }, 8000);

    // 2. Reactivate on focus or visibility change
    const handleReactivation = () => {
      if (globalCleanedUpRef.current) return;
      if (!userRef.current) return; // Only reactivate if user is logged in
      console.log("[REACTIVATION] Tab became active. Checking connection health...");

      if (globalChanStatusRef.current !== 'SUBSCRIBED') {
        console.log("[REACTIVATION] Global channel is not active. Recovering...");
        subscribeGlobalChan();
      }

      const activeRoom = activeRoomIdRef.current;
      if (activeRoom && roomSyncChanStatusRef.current !== 'SUBSCRIBED') {
        console.log("[REACTIVATION] Room channel is not active. Recovering...");
        subscribeRoomChan(activeRoom);
      }
    };

    window.addEventListener('focus', handleReactivation);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReactivation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(healthCheckInterval);
      window.removeEventListener('focus', handleReactivation);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // --- SUPABASE PROD MODE ---
  const initSupabase = async () => {
    try {
      // 1. Auth state change listener (automatically handles initial session)
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (globalCleanedUpRef.current) return;
        console.log(`[REALTIME-AUTH] Event: ${event}, Session active: ${!!session}`);
        if (session) {
          await handleSupabaseUserSignIn(session.user);
          subscribeGlobalChan();
        } else {
          setUser(null);
          setStats({ xp: 0, totalMinutes: 0, completedSessions: 0, streakDays: 0, badges: ALL_BADGES, sessionHistory: [] });
          
          // Teardown global channel on logout
          if (globalChanRef.current) {
            try { supabase.removeChannel(globalChanRef.current); } catch { /* ignore cleanup error */ }
            globalChanRef.current = null;
          }
          globalChanStatusRef.current = 'none';

          // Teardown room channel on logout
          if (roomSyncChanRef.current) {
            try { supabase.removeChannel(roomSyncChanRef.current); } catch { /* ignore cleanup error */ }
            roomSyncChanRef.current = null;
          }
          roomSyncChanStatusRef.current = 'none';
        }
      });
      if (globalCleanedUpRef.current) {
        if (subscription) {
          try { subscription.unsubscribe(); } catch { /* ignore unsubscribe error */ }
        }
        return;
      }
      authSubscriptionRef.current = subscription;

      // 3. Fetch rooms
      const { data: dbRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: true });

      if (globalCleanedUpRef.current) return;
      if (!roomsError && dbRooms) {
        setRooms(dbRooms.map(normalizeRoom));
      }

      if (globalCleanedUpRef.current) return;
      setLoading(false);
    } catch (e) {
      console.error("Supabase init error, reverting to offline mode", e);
      if (!globalCleanedUpRef.current) {
        initLocalFallback();
      }
    }
  };

  const handleSupabaseUserSignIn = async (supabaseUser) => {
    let profile = null;
    let retries = 5;
    
    while (retries > 0 && !profile) {
      if (globalCleanedUpRef.current) return;
      const { data } = await supabase
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

    if (globalCleanedUpRef.current) return;

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

      if (globalCleanedUpRef.current) return;

      if (!insertError && insertedProfile) {
        profile = insertedProfile;
      } else {
        console.error("Failed to insert fallback profile:", insertError);
      }
    }

    if (globalCleanedUpRef.current) return;

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

      if (globalCleanedUpRef.current) return;

      await fetchFriendships(supabaseUser.id);
      if (globalCleanedUpRef.current) return;
      await fetchDirectMessages(supabaseUser.id);
      if (globalCleanedUpRef.current) return;
      await fetchAllProfiles();
      if (globalCleanedUpRef.current) return;

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

  // =================================================================
  // HYBRID INIT & STATE ROUTING
  // =================================================================

  useEffect(() => {
    globalCleanedUpRef.current = false;
    
    const runInit = setTimeout(() => {
      if (globalCleanedUpRef.current) return;
      if (isSupabaseConfigured) {
        initSupabase();
      } else {
        initLocalFallback();
      }
    }, 0);

    return () => {
      clearTimeout(runInit);
      globalCleanedUpRef.current = true;

      if (isSupabaseConfigured && supabase) {
        if (globalChanRef.current) {
          try { supabase.removeChannel(globalChanRef.current); } catch { /* ignore cleanup error */ }
        }
        if (roomSyncChanRef.current) {
          try { supabase.removeChannel(roomSyncChanRef.current); } catch { /* ignore cleanup error */ }
        }
        if (authSubscriptionRef.current) {
          try { authSubscriptionRef.current.unsubscribe(); } catch { /* ignore unsubscribe error */ }
        }
      }
    };
  }, []);

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
          avatar_color: generateRandomColor()
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
    const { error } = await supabase.auth.signInAnonymously({
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

    let handleTimeout = null;

    if (!isSupabaseConfigured) {
      handleTimeout = setTimeout(() => {
        if (globalCleanedUpRef.current) return;

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
      }, 0);
    } else {
      subscribeRoomChan(activeRoomId);
    }

    return () => {
      if (handleTimeout) clearTimeout(handleTimeout);

      if (isSupabaseConfigured && roomSyncChanRef.current) {
        try {
          supabase.removeChannel(roomSyncChanRef.current);
        } catch { /* ignore cleanup error */ }
        roomSyncChanRef.current = null;
      }
      roomSyncChanStatusRef.current = 'none';
    };
  }, [activeRoomId]);

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

  const handleTimerExpirationOnDB = async (room) => {
    // Toggle Pomodoro state in database
    const wasFocus = room.timer_current_mode === 'focus';
    const nextMode = wasFocus ? 'break' : 'focus';
    const nextDuration = nextMode === 'focus' ? room.timer_duration : 300;

    // Only update if timer is running in local memory to prevent infinite loop races
    if (timerStateRef.current.isRunning) {
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

    if (isSupabaseConfigured && roomSyncChanRef.current) {
      try {
        await roomSyncChanRef.current.untrack();
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

    if (isSupabaseConfigured && roomSyncChanRef.current && user) {
      await roomSyncChanRef.current.track({
        username: user.name,
        status: newStatus,
        avatar_color: user.avatarColor,
        xp: stats.xp
      });
    }
  };

  // --- Create Room ---
  const createRoom = async (name, description, category, tagsArray, timerMode, durationMinutes, isPrivate = false) => {
    if (!userRef.current) return;

    // Check public rooms limit
    if (!isPrivate) {
      const publicCreatedRooms = rooms.filter(r => {
        const isCreator = isSupabaseConfigured 
          ? r.creator_id === userRef.current.id 
          : r.creator === userRef.current.name;
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
        creator: userRef.current.name,
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
        creator_id: userRef.current.id,
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

    try {
      await supabase.from('messages').insert({
        room_id: roomId,
        sender_name: 'System',
        text
      });
    } catch (err) {
      console.error("Error sending system alert:", err);
    }
  };

  // --- Chat Message Send ---
  const sendChatMessage = async (roomId, text) => {
    if (!userRef.current) return;

    const tempId = 'temp-msg-' + Date.now();
    const timestampVal = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempMsg = {
      id: tempId,
      sender: userRef.current.name,
      text,
      timestamp: timestampVal
    };
    setChatMessages(prev => [...prev, tempMsg]);

    if (!isSupabaseConfigured) {
      localBroadcastChannelRef.current?.postMessage({
        type: 'CHAT_MSG',
        payload: { roomId, message: tempMsg }
      });
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert({
        room_id: roomId,
        sender_id: userRef.current.id,
        sender_name: userRef.current.name,
        text
      });
      if (error) throw error;
    } catch (err) {
      // Revert optimistic message
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      console.error("Error sending chat message:", err);
      alert("Failed to send message: " + (err.message || err));
    }
  };

  // --- Shared Checklist Item operations ---
  const addTask = async (roomId, text) => {
    if (!userRef.current) return;

    const tempId = 'temp-t-' + Date.now();
    const tempTask = {
      id: tempId,
      text,
      completed: false,
      user: userRef.current.name
    };
    setTasks(prev => [...prev, tempTask]);

    if (!isSupabaseConfigured) {
      localBroadcastChannelRef.current?.postMessage({
        type: 'TASK_UPDATE',
        payload: { roomId, tasks: [...tasks, tempTask] }
      });
      return;
    }

    try {
      const { error } = await supabase.from('tasks').insert({
        room_id: roomId,
        user_id: userRef.current.id,
        user_name: userRef.current.name,
        text
      });
      if (error) throw error;
    } catch (err) {
      // Revert optimistic task
      setTasks(prev => prev.filter(t => t.id !== tempId));
      console.error("Error adding task:", err);
      alert("Failed to add task: " + (err.message || err));
    }
  };

  const toggleTask = async (roomId, taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Optimistic toggle
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));

    if (!isSupabaseConfigured) {
      localBroadcastChannelRef.current?.postMessage({
        type: 'TASK_UPDATE',
        payload: { roomId, tasks: tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      // Revert optimistic toggle
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: task.completed } : t));
      console.error("Error toggling task:", err);
      alert("Failed to update task: " + (err.message || err));
    }
  };

  const deleteTask = async (roomId, taskId) => {
    const task = tasks.find(t => t.id === taskId);

    // Optimistic delete
    setTasks(prev => prev.filter(t => t.id !== taskId));

    if (!isSupabaseConfigured) {
      localBroadcastChannelRef.current?.postMessage({
        type: 'TASK_UPDATE',
        payload: { roomId, tasks: tasks.filter(t => t.id !== taskId) }
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      if (error) throw error;
    } catch (err) {
      // Revert optimistic delete
      if (task) setTasks(prev => [...prev, task]);
      console.error("Error deleting task:", err);
      alert("Failed to delete task: " + (err.message || err));
    }
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

    try {
      const { error } = await supabase
        .from('whiteboards')
        .update({ data_url: dataURL, updated_at: new Date().toISOString() })
        .eq('room_id', roomId);
      if (error) throw error;
    } catch (err) {
      console.error("Error saving whiteboard:", err);
    }
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
          ? `${userRef.current?.name || 'Someone'} started the focus timer.` 
          : `${userRef.current?.name || 'Someone'} paused the timer.`
        );
        return next;
      });
      return;
    }

    const nextIsRunning = !room.timer_is_running;
    const now = new Date().toISOString();

    // Optimistic local update
    setRooms(prev => prev.map(r => r.id === roomId ? {
      ...r,
      timer_is_running: nextIsRunning,
      timer_started_at: nextIsRunning ? now : null,
      timer_paused_seconds_left: nextIsRunning 
        ? r.timer_paused_seconds_left 
        : timerStateRef.current.secondsLeft
    } : r));

    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          timer_is_running: nextIsRunning,
          timer_started_at: nextIsRunning ? now : null,
          timer_paused_seconds_left: nextIsRunning 
            ? room.timer_paused_seconds_left 
            : timerStateRef.current.secondsLeft
        })
        .eq('id', roomId);
      
      if (error) throw error;

      await sendSystemAlert(roomId, nextIsRunning 
        ? `${userRef.current?.name || 'Someone'} started the focus timer.` 
        : `${userRef.current?.name || 'Someone'} paused the timer.`
      );
    } catch (err) {
      // Revert optimistic update
      setRooms(prev => prev.map(r => r.id === roomId ? {
        ...r,
        timer_is_running: room.timer_is_running,
        timer_started_at: room.timer_started_at,
        timer_paused_seconds_left: room.timer_paused_seconds_left
      } : r));
      console.error("Error toggling timer:", err);
      alert("Failed to toggle timer: " + (err.message || err));
    }
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
        sendSystemAlert(roomId, `${userRef.current?.name || 'Someone'} reset the timer.`);
        return next;
      });
      return;
    }

    // Optimistic local update
    setRooms(prev => prev.map(r => r.id === roomId ? {
      ...r,
      timer_is_running: false,
      timer_started_at: null,
      timer_paused_seconds_left: defaultSecs
    } : r));

    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          timer_is_running: false,
          timer_started_at: null,
          timer_paused_seconds_left: defaultSecs
        })
        .eq('id', roomId);
      
      if (error) throw error;

      await sendSystemAlert(roomId, `${userRef.current?.name || 'Someone'} reset the timer.`);
    } catch (err) {
      // Revert optimistic update
      setRooms(prev => prev.map(r => r.id === roomId ? {
        ...r,
        timer_is_running: room.timer_is_running,
        timer_started_at: room.timer_started_at,
        timer_paused_seconds_left: room.timer_paused_seconds_left
      } : r));
      console.error("Error resetting timer:", err);
      alert("Failed to reset timer: " + (err.message || err));
    }
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
        sendSystemAlert(roomId, `${userRef.current?.name || 'Someone'} changed timer to ${newMode} mode.`);
        return next;
      });
      return;
    }

    // Optimistic local update
    setRooms(prev => prev.map(r => r.id === roomId ? {
      ...r,
      timer_is_running: false,
      timer_started_at: null,
      timer_current_mode: newMode,
      timer_paused_seconds_left: defaultSecs
    } : r));

    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          timer_is_running: false,
          timer_started_at: null,
          timer_current_mode: newMode,
          timer_paused_seconds_left: defaultSecs
        })
        .eq('id', roomId);
      
      if (error) throw error;

      await sendSystemAlert(roomId, `${userRef.current?.name || 'Someone'} changed timer to ${newMode} mode.`);
    } catch (err) {
      // Revert optimistic update
      setRooms(prev => prev.map(r => r.id === roomId ? {
        ...r,
        timer_is_running: room.timer_is_running,
        timer_started_at: room.timer_started_at,
        timer_current_mode: room.timer_current_mode,
        timer_paused_seconds_left: room.timer_paused_seconds_left
      } : r));
      console.error("Error setting timer mode:", err);
      alert("Failed to set timer mode: " + (err.message || err));
    }
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
    if (!userRef.current) return;

    if (!isSupabaseConfigured) {
      // Local fallback mock
      const target = allProfiles.find(p => p.username.toLowerCase() === targetUsername.toLowerCase());
      if (!target) throw new Error("Scholar not found.");
      if (target.id === userRef.current.id) throw new Error("You cannot add yourself.");
      
      const newRequest = {
        id: 'req-' + Date.now(),
        user_id_1: userRef.current.id < target.id ? userRef.current.id : target.id,
        user_id_2: userRef.current.id < target.id ? target.id : userRef.current.id,
        status: 'pending',
        sender_id: userRef.current.id
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
    if (targetProfile.id === userRef.current.id) {
      throw new Error("You cannot add yourself.");
    }

    // 2. Check duplicate
    const exists = friendsList.some(f => 
      (f.user_id_1 === userRef.current.id && f.user_id_2 === targetProfile.id) ||
      (f.user_id_1 === targetProfile.id && f.user_id_2 === userRef.current.id)
    );
    if (exists) {
      throw new Error("Friend request already sent or accepted.");
    }

    // 3. Insert
    const [id1, id2] = userRef.current.id < targetProfile.id ? [userRef.current.id, targetProfile.id] : [targetProfile.id, userRef.current.id];
    const { error: insertErr } = await supabase
      .from('friends')
      .insert({
        user_id_1: id1,
        user_id_2: id2,
        status: 'pending',
        sender_id: userRef.current.id
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
    if (!userRef.current) return;

    const tempId = 'temp-dm-' + Date.now();
    const tempDm = {
      id: tempId,
      sender_id: userRef.current.id,
      sender_name: userRef.current.name,
      receiver_id: receiverId,
      text,
      is_invite: isInvite,
      room_id: roomId,
      created_at: new Date().toISOString()
    };
    setDmMessages(prev => [...prev, tempDm]);

    if (!isSupabaseConfigured) {
      localStorage.setItem('study_dms', JSON.stringify([...dmMessages, tempDm]));
      localBroadcastChannelRef.current?.postMessage({ type: 'DM_MSG', payload: tempDm });
      return;
    }

    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: userRef.current.id,
          sender_name: userRef.current.name,
          receiver_id: receiverId,
          text,
          is_invite: isInvite,
          room_id: roomId
        });

      if (error) throw error;
    } catch (err) {
      // Revert optimistic DM
      setDmMessages(prev => prev.filter(d => d.id !== tempId));
      console.error("Error sending DM:", err);
      alert("Failed to send DM: " + (err.message || err));
    }
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
        sendDirectMessage,
        isSupabaseConfigured
      }}
    >
      {children}
    </RealtimeSyncContext.Provider>
  );
};

export const useRealtimeSync = () => useContext(RealtimeSyncContext);
