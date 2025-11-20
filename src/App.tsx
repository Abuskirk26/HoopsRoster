
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Player, PlayerStatus, Tier, AppConfig, PlayerStats } from './types';
import { INITIAL_PLAYERS, MAX_PLAYERS } from './constants';
import PlayerCard from './components/PlayerCard';
import TeamBuilder from './components/TeamBuilder';
import PlayerForm from './components/PlayerForm';
import Scoreboard from './components/Scoreboard';
import { generateInviteMessage } from './services/geminiService';
import { syncRosterFromSheet, initializeSheet, updatePlayerStatusOnSheet, resetWeekOnSheet, createPlayerOnSheet, updatePlayerDetailsOnSheet, getPlayerStats, deletePlayerOnSheet } from './services/sheetService';
import { Calendar, Users, Trophy, Share2, MessageSquare, Lock, Shield, LogOut, Database, CheckCircle, AlertCircle, RefreshCw, AlertTriangle, UserPlus, Search, BarChart3, History, FilterX, ChevronRight, Send, XCircle, MonitorPlay, Trash } from 'lucide-react';
import { format, nextMonday, startOfToday, getDay } from 'date-fns';

// UPDATED VERSION to v5 to force clear old local storage (and old PINs)
const STORAGE_KEY_PLAYERS = 'hoops_players_data_v5';
const STORAGE_KEY_USER = 'hoops_current_user_v5';
// Use a stable key for config so we don't lose the DB URL on updates
const STORAGE_KEY_CONFIG = 'hoops_app_config_stable';

export const App: React.FC = () => {
  // --- STATE ---
  
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      // Try stable key first
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);

      // Migration: Try to recover from v3 or v2 if stable is empty
      const v3 = localStorage.getItem('hoops_app_config_v3');
      if (v3) return JSON.parse(v3);
      const v2 = localStorage.getItem('hoops_app_config_v2');
      if (v2) return JSON.parse(v2);

      return {};
    } catch { return {}; }
  });

  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYERS);
      return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
    } catch (e) {
      return INITIAL_PLAYERS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    // Try v5, if not, check v4 to keep them logged in during migration
    return localStorage.getItem(STORAGE_KEY_USER) || localStorage.getItem('hoops_current_user_v4');
  });

  const [activeTab, setActiveTab] = useState<'roster' | 'admin' | 'scoreboard'>('roster');
  const [inviteMessage, setInviteMessage] = useState<string>("");
  
  // Filter State for Admin Roster
  const [adminFilter, setAdminFilter] = useState<'ALL' | 'IN' | 'WAITLIST' | 'PENDING'>('ALL');
  
  // Auth Modals
  const [pendingLoginPlayer, setPendingLoginPlayer] = useState<Player | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [authError, setAuthError] = useState("");
  
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  
  // Filter for login screen
  const [searchTerm, setSearchTerm] = useState("");

  // Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Stats State
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);

  const currentUser = useMemo(() => players.find(p => p.id === currentUserId) || null, [players, currentUserId]);
  const isAdmin = currentUser?.isAdmin === true;

  // --- EFFECTS ---

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(STORAGE_KEY_USER, currentUserId);
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  // Initial Sync on Mount
  useEffect(() => {
    if (config.googleSheetUrl) {
      handleSync();
    }
  }, []);

  // Auto-Sync on App Foreground/Focus
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && config.googleSheetUrl) {
        handleSync();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [config.googleSheetUrl]);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({msg, type});
    setTimeout(() => setToast(null), 3000);
  };

  const handleSync = useCallback(async () => {
    if (!config.googleSheetUrl) return;
    setIsSyncing(true);
    setSyncStatus('idle');
    const remotePlayers = await syncRosterFromSheet(config.googleSheetUrl);
    if (remotePlayers) {
      setPlayers(remotePlayers);
      setSyncStatus('success');
    } else {
      // Only show error if we have players to begin with, otherwise it might just be first load
      if (players.length > 0) setSyncStatus('error');
    }
    setIsSyncing(false);
  }, [config.googleSheetUrl]);

  const handleFetchStats = async () => {
    if (!config.googleSheetUrl) return;
    setLoadingStats(true);
    const stats = await getPlayerStats(config.googleSheetUrl);
    if (stats) {
      setPlayerStats(stats);
    }
    setLoadingStats(false);
  };

  const handleClearCache = () => {
    if (window.confirm("This will clear local storage and reload the app. Useful if data looks wrong.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // --- BUSINESS LOGIC ---

  const recalculateRosterStatus = (currentList: Player[]): Player[] => {
    const hopefuls = currentList.filter(p => p.status === PlayerStatus.IN || p.status === PlayerStatus.WAITLIST);
    
    hopefuls.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });

    const updatedHopefuls = hopefuls.map((p, index) => ({
      ...p,
      status: index < MAX_PLAYERS ? PlayerStatus.IN : PlayerStatus.WAITLIST
    }));

    const updatesMap = new Map(updatedHopefuls.map(p => [p.id, p]));
    return currentList.map(p => updatesMap.get(p.id) || p);
  };

  const handleStatusChange = (id: string, newStatus: PlayerStatus) => {
    const actingUser = currentUser?.name || "Unknown";
    const timestamp = Date.now();
    const player = players.find(p => p.id === id);

    // --- TIME CONSTRAINT LOGIC ---
    if (player && newStatus === PlayerStatus.IN) {
      // Admins bypass checks
      if (!isAdmin) {
         const today = new Date();
         const dayOfWeek = getDay(today); // 0=Sun, 1=Mon, 2=Tue...
         
         // Tier 2 & 3 can only sign up on Monday (1)
         if (player.tier !== Tier.ONE && dayOfWeek !== 1) {
            showToast(`Tier ${player.tier} invites open on Monday!`, 'error');
            return;
         }
      }
    }
    // -----------------------------

    setPlayers(prev => {
      const withUpdatedIntent = prev.map(p => {
        if (p.id !== id) return p;
        const wasInPool = p.status === PlayerStatus.IN || p.status === PlayerStatus.WAITLIST;
        const isJoiningPool = newStatus === PlayerStatus.IN; 
        let finalTimestamp = p.timestamp;
        if (isJoiningPool && !wasInPool) finalTimestamp = timestamp;
        return { ...p, status: newStatus, timestamp: finalTimestamp };
      });
      return recalculateRosterStatus(withUpdatedIntent);
    });

    if (config.googleSheetUrl) {
      updatePlayerStatusOnSheet(config.googleSheetUrl, id, newStatus, timestamp, actingUser);
    }
  };

  // --- PLAYER CRUD ---

  const handleOpenSignUp = () => {
    setIsSignUpMode(true);
    setEditingPlayer(null);
    setShowPlayerForm(true);
  };

  const handleOpenEdit = (player: Player) => {
    setIsSignUpMode(false);
    setEditingPlayer(player);
    setShowPlayerForm(true);
  };

  const handlePlayerFormSubmit = (data: Partial<Player>) => {
    const actor = currentUser?.name || "System";

    if (isSignUpMode) {
       // CREATE NEW
       const newPlayer: Player = {
          id: crypto.randomUUID(),
          name: data.name || 'Unknown',
          tier: Tier.THREE, // Default for signups
          status: PlayerStatus.UNKNOWN,
          phoneNumber: data.phoneNumber || '',
          email: data.email,
          pin: data.pin, // Validated by form
          isAdmin: false
       };
       setPlayers(prev => [...prev, newPlayer]);
       setCurrentUserId(newPlayer.id); // Auto login
       showToast("Welcome to the team!", "success");
       
       if (config.googleSheetUrl) {
          createPlayerOnSheet(config.googleSheetUrl, newPlayer, newPlayer.name);
       }
    } else if (editingPlayer) {
       // UPDATE EXISTING
       setPlayers(prev => prev.map(p => {
          if (p.id === editingPlayer.id) {
             return { ...p, ...data } as Player;
          }
          return p;
       }));

       // Recalculate roster if Tier changed
       setPlayers(prev => recalculateRosterStatus(prev));
       showToast("Player profile updated");

       if (config.googleSheetUrl) {
          const updatedPlayer = { ...editingPlayer, ...data } as Player;
          updatePlayerDetailsOnSheet(config.googleSheetUrl, updatedPlayer, actor);
       }
    }
  };

  const handlePlayerDelete = (playerId: string) => {
      if (!window.confirm("Are you sure you want to delete this player? This action cannot be undone.")) return;
      
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      setShowPlayerForm(false);
      showToast("Player deleted", 'info');
      
      if (config.googleSheetUrl) {
          deletePlayerOnSheet(config.googleSheetUrl, playerId, currentUser?.name || "Admin");
      }

      // If user deleted themselves, log out
      if (playerId === currentUserId) {
          setCurrentUserId(null);
      }
  };

  const handleResetWeek = () => {
      const shouldArchive = config.googleSheetUrl 
          ? window.confirm("Do you want to ARCHIVE this week's game to History before resetting?")
          : false;

      if (!shouldArchive && !window.confirm("Are you sure you want to reset the roster?")) return;

      setPlayers(prev => prev.map(p => ({ ...p, status: PlayerStatus.UNKNOWN, timestamp: undefined })));
      showToast("Roster reset for new week");

      if (config.googleSheetUrl) {
          resetWeekOnSheet(config.googleSheetUrl, currentUser?.name || "Admin", shouldArchive);
      }
  };

  const handleShare = async () => {
    if (!inviteMessage) {
        const msg = await generateInviteMessage(format(nextMonday(startOfToday()), 'MMMM do'));
        setInviteMessage(msg);
        triggerShare(msg);
    } else {
        triggerShare(inviteMessage);
    }
  };

  const handleWaitlistMessage = () => {
      const msg = "Sorry we are at capacity (12/12) this week! You didn't make the group but we appreciate your interest and will have you at top priority to join next week if you are available.";
      triggerShare(msg);
  };

  const triggerShare = async (msg: string) => {
    // Validate URL - Navigator.share throws if URL is invalid (like about:blank or empty in some webviews)
    const currentUrl = window.location.href;
    const isValidUrl = currentUrl.startsWith('http://') || currentUrl.startsWith('https://');
    const urlToShare = isValidUrl ? currentUrl : undefined;

    if (navigator.share) {
        try {
            await navigator.share({ 
                title: 'Monday Night Hoops', 
                text: msg, 
                url: urlToShare 
            });
        } catch (err) {
            // AbortError is user cancellation, ignore it. Other errors, try fallback.
            if (err instanceof Error && err.name !== 'AbortError') {
                console.warn("Share failed, falling back to clipboard", err);
                copyToClipboard(msg, urlToShare);
            }
        }
    } else {
        copyToClipboard(msg, urlToShare);
    }
  };

  const copyToClipboard = (msg: string, url?: string) => {
      const textToCopy = url ? `${msg}\n\n${url}` : msg;
      navigator.clipboard.writeText(textToCopy).then(() => {
          showToast("Copied to clipboard!", "success");
      }).catch(() => {
          showToast("Failed to copy", "error");
      });
  };

  // --- AUTHENTICATION ---

  const handleStartLogin = (player: Player) => {
     setPendingLoginPlayer(player);
     setEnteredPin("");
     setAuthError("");
  };

  const handlePinSubmit = () => {
      if (!pendingLoginPlayer) return;
      
      // Scenario A: Legacy User (No PIN) -> Force them to create one via Edit Form
      if (!pendingLoginPlayer.pin) {
         setPendingLoginPlayer(null);
         setEditingPlayer(pendingLoginPlayer);
         setIsSignUpMode(false);
         setShowPlayerForm(true);
         alert("Please set a security PIN to secure your account.");
         return;
      }

      // Scenario B: Validate PIN (Trim whitespace just in case)
      if (enteredPin.trim() === pendingLoginPlayer.pin?.trim()) {
         setCurrentUserId(pendingLoginPlayer.id);
         setPendingLoginPlayer(null);
      } else {
         setAuthError("Incorrect PIN");
      }
  };

  const handleInitializeDatabase = async () => {
    if (!config.googleSheetUrl) return;
    if (!window.confirm("Overwrite Google Sheet with current app data?")) return;
    setIsSyncing(true);
    try {
      await initializeSheet(config.googleSheetUrl, players, currentUser?.name || "Admin");
      setSyncStatus('success');
      showToast("Database initialized!", 'success');
    } catch (e) {
      setSyncStatus('error');
      showToast("Failed to initialize", 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleFilter = (type: 'IN' | 'WAITLIST' | 'PENDING') => {
     if (!isAdmin) return;
     if (adminFilter === type) {
       setAdminFilter('ALL');
     } else {
       setAdminFilter(type);
     }
  };

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const statusOrder = { [PlayerStatus.IN]: 0, [PlayerStatus.WAITLIST]: 1, [PlayerStatus.UNKNOWN]: 2, [PlayerStatus.OUT]: 3 };
      if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.name.localeCompare(b.name);
    });
  }, [players]);

  const filteredDisplayList = useMemo(() => {
     if (adminFilter === 'ALL') return sortedPlayers;
     if (adminFilter === 'IN') return sortedPlayers.filter(p => p.status === PlayerStatus.IN);
     if (adminFilter === 'WAITLIST') return sortedPlayers.filter(p => p.status === PlayerStatus.WAITLIST);
     if (adminFilter === 'PENDING') return sortedPlayers.filter(p => p.status === PlayerStatus.UNKNOWN || p.status === PlayerStatus.OUT);
     return sortedPlayers;
  }, [sortedPlayers, adminFilter]);

  const confirmedCount = players.filter(p => p.status === PlayerStatus.IN).length;
  const waitlistCount = players.filter(p => p.status === PlayerStatus.WAITLIST).length;
  const pendingCount = players.length - confirmedCount - waitlistCount;
  const formattedDate = format(nextMonday(startOfToday()), 'MMMM do');
  const isAtCapacity = confirmedCount >= MAX_PLAYERS;

  // --- LOGIN SCREEN ---
  if (!currentUserId) {
    const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const loginList = [...filteredPlayers].sort((a,b) => a.name.localeCompare(b.name));

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col font-sans">
        <div className="max-w-md w-full mx-auto flex-1 flex flex-col relative">
          
          {/* PIN MODAL OVERLAY */}
          {pendingLoginPlayer && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm animate-fade-in">
                <div className="bg-gray-800 w-full max-w-xs p-6 rounded-2xl border border-gray-700 shadow-2xl">
                   <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center">
                         <Lock className="w-8 h-8 text-orange-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white">{pendingLoginPlayer.name}</h3>
                      <p className="text-sm text-gray-400">Enter your 4-digit PIN</p>
                   </div>
                   
                   <div className="space-y-4">
                      <input 
                         type="password" 
                         inputMode="numeric" 
                         maxLength={4}
                         autoFocus
                         value={enteredPin}
                         onChange={(e) => {
                             setEnteredPin(e.target.value.replace(/\D/g, '').slice(0,4));
                             setAuthError("");
                         }}
                         className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-center text-2xl tracking-[1em] text-white focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                         placeholder="••••"
                      />
                      {authError && <p className="text-center text-red-400 text-xs font-bold">{authError}</p>}
                      
                      <button 
                         onClick={handlePinSubmit}
                         className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
                      >
                         Unlock
                      </button>
                      
                      <button 
                         onClick={() => {
                             setPendingLoginPlayer(null);
                             setAuthError("");
                             setEnteredPin("");
                         }}
                         className="w-full text-gray-500 hover:text-gray-300 text-sm py-2"
                      >
                         Cancel
                      </button>
                   </div>
                </div>
             </div>
          )}

          <div className="text-center mb-8 mt-8">
             <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2 flex justify-center items-center gap-3">
               <span className="text-5xl">🏀</span> 
               <div className="text-left">
                  <span className="block text-xl text-orange-500">Monday Night</span>
                  <span>Hoops</span>
               </div>
            </h1>
          </div>

          <div className="relative mb-4">
             <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
             <input 
               type="text" 
               placeholder="Find your name..."
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none"
             />
          </div>

          <div className="flex-1 overflow-y-auto mb-6 space-y-2 pr-1 max-h-[50vh] custom-scrollbar">
             {loginList.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleStartLogin(p)}
                  className="w-full bg-gray-800/50 hover:bg-gray-700 text-left px-4 py-3.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-between group border border-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.isAdmin ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                          {p.isAdmin ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                      </div>
                      <span className="truncate text-gray-200">{p.name}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white" />
                </button>
             ))}
             {loginList.length === 0 && (
                <div className="text-center text-gray-500 py-4 text-sm">No players found.</div>
             )}
          </div>

          <button 
            onClick={handleOpenSignUp}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg mb-6 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            New Player? Sign Up
          </button>
        </div>
        
        <PlayerForm 
          isOpen={showPlayerForm} 
          onClose={() => setShowPlayerForm(false)}
          onSubmit={handlePlayerFormSubmit}
          isAdminMode={false} // Sign up is never admin mode
          initialData={editingPlayer}
        />

        {/* Toast Notification for Login Screen */}
        {toast && (
           <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-gray-800 animate-bounce-in z-50 whitespace-nowrap">
             {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : 
              toast.type === 'error' ? <XCircle className="w-5 h-5 text-red-400" /> : 
              <AlertCircle className="w-5 h-5 text-blue-400" />}
             <span className="text-sm font-bold">{toast.msg}</span>
           </div>
        )}
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-gray-900 pb-24 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 pt-safe-top shadow-lg shadow-black/20">
        <div className="px-4 py-3 flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
               <span className="text-orange-500">🏀</span> HoopsRoster
            </h1>
            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-medium mt-0.5 uppercase tracking-wide">
              <Calendar className="w-3 h-3" />
              <span>{formattedDate}</span>
              {config.googleSheetUrl && (
                 <span className={`flex items-center gap-1 ${syncStatus === 'success' ? 'text-green-500' : syncStatus === 'error' ? 'text-red-500' : 'text-gray-600'}`}>
                    • {isSyncing ? 'Syncing' : 'Linked'}
                 </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {config.googleSheetUrl && (
                <button onClick={handleSync} className={`p-2 bg-gray-800 rounded-full text-blue-400 border border-gray-700 hover:text-blue-300 ${isSyncing ? 'animate-spin' : ''}`}>
                   <RefreshCw className="w-4 h-4" />
                </button>
             )}
             <div className="text-right bg-gray-800 px-3 py-1 rounded-lg border border-gray-700">
                <div className={`text-sm font-bold ${confirmedCount === MAX_PLAYERS ? 'text-red-400' : 'text-green-400'}`}>
                   {confirmedCount}<span className="text-gray-500">/{MAX_PLAYERS}</span>
                </div>
             </div>
             <button onClick={() => setCurrentUserId(null)} className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white border border-gray-700 transition-colors">
                <LogOut className="w-4 h-4" />
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 p-1.5 rounded-xl mb-6 border border-gray-700 shadow-inner">
          <button 
            onClick={() => setActiveTab('roster')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${activeTab === 'roster' ? 'bg-gray-700 text-white shadow-md ring-1 ring-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Users className="w-4 h-4" />
            RSVP
          </button>
          <button 
            onClick={() => setActiveTab('scoreboard')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${activeTab === 'scoreboard' ? 'bg-gray-700 text-white shadow-md ring-1 ring-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <MonitorPlay className="w-4 h-4" />
            Score
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            disabled={!isAdmin}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${activeTab === 'admin' ? 'bg-gray-700 text-white shadow-md ring-1 ring-gray-600' : 'text-gray-500 hover:text-gray-300 disabled:opacity-30'}`}
          >
            {isAdmin ? <Trophy className="w-4 h-4" /> : <Lock className="w-3 h-3" />}
            Admin
          </button>
        </div>

        {activeTab === 'scoreboard' && <Scoreboard googleSheetUrl={config.googleSheetUrl} currentUser={currentUser} />}

        {activeTab === 'roster' && (
          <div className="space-y-6">
            {/* CAPACITY BANNER */}
            {isAtCapacity && (
              <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-center animate-fade-in">
                <h3 className="text-red-400 font-bold text-lg mb-1 flex items-center justify-center gap-2">
                   <AlertTriangle className="w-5 h-5" />
                   Game at Capacity!
                </h3>
                <p className="text-sm text-gray-300">
                  We have reached 12 confirmed players. New signups will be placed on the <span className="font-bold text-orange-400">Waitlist</span>.
                </p>
              </div>
            )}

            {/* Current User Card */}
            {currentUser && (
                 <div className="mb-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-2 ml-1">
                      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Your Status</h3>
                    </div>
                    <PlayerCard 
                        player={currentUser} 
                        currentUser={currentUser} 
                        onStatusChange={handleStatusChange} 
                    />
                    {currentUser.status === PlayerStatus.WAITLIST && (
                         <div className="mt-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 p-3 rounded-xl flex items-start gap-3">
                             <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                             <div>
                               <p className="font-bold mb-0.5">You are on the Waitlist</p>
                               <p className="opacity-80">Spots are filled based on priority. Hang tight!</p>
                             </div>
                         </div>
                    )}
                 </div>
            )}

            {/* Summary Grid - Interactive for Admins */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <button 
                  onClick={() => handleToggleFilter('IN')}
                  disabled={!isAdmin}
                  className={`p-3 rounded-xl text-center border backdrop-blur-sm transition-all ${
                    isAdmin ? 'cursor-pointer active:scale-95' : 'cursor-default'
                  } ${
                    adminFilter === 'IN' 
                      ? 'bg-green-500/20 border-green-500 ring-1 ring-green-500' 
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                  }`}
                >
                    <div className={`text-2xl font-bold ${adminFilter === 'IN' ? 'text-green-300' : 'text-white'}`}>{confirmedCount}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Playing</div>
                </button>

                <button 
                   onClick={() => handleToggleFilter('WAITLIST')}
                   disabled={!isAdmin}
                   className={`p-3 rounded-xl text-center border backdrop-blur-sm transition-all ${
                    isAdmin ? 'cursor-pointer active:scale-95' : 'cursor-default'
                   } ${
                    adminFilter === 'WAITLIST' 
                      ? 'bg-orange-500/20 border-orange-500 ring-1 ring-orange-500' 
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                   }`}
                >
                    <div className={`text-2xl font-bold ${adminFilter === 'WAITLIST' ? 'text-orange-300' : 'text-orange-400'}`}>{waitlistCount}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Waitlist</div>
                </button>

                <button 
                   onClick={() => handleToggleFilter('PENDING')}
                   disabled={!isAdmin}
                   className={`p-3 rounded-xl text-center border backdrop-blur-sm transition-all ${
                    isAdmin ? 'cursor-pointer active:scale-95' : 'cursor-default'
                   } ${
                    adminFilter === 'PENDING' 
                      ? 'bg-gray-500/30 border-gray-500 ring-1 ring-gray-500' 
                      : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800'
                   }`}
                >
                    <div className={`text-2xl font-bold ${adminFilter === 'PENDING' ? 'text-gray-200' : 'text-gray-500'}`}>{pendingCount}</div>
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pending</div>
                </button>
            </div>

            {isAdmin ? (
                <div className="animate-fade-in pb-20">
                    <div className="flex justify-between items-center mb-3 ml-1">
                        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            {adminFilter === 'ALL' ? 'Full Roster' : `Filter: ${adminFilter}`} 
                            <span className="text-[10px] bg-blue-900/30 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">Admin</span>
                        </h3>
                        <div className="flex gap-2">
                            {adminFilter !== 'ALL' && (
                                <button 
                                  onClick={() => setAdminFilter('ALL')} 
                                  className="text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                >
                                   <FilterX className="w-3 h-3" /> Clear
                                </button>
                            )}
                            <button onClick={handleOpenSignUp} className="text-[10px] bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded-lg flex items-center gap-1 transition-colors">
                                <UserPlus className="w-3 h-3" /> Add
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {filteredDisplayList.length > 0 ? (
                           filteredDisplayList.map(player => (
                              <PlayerCard 
                                  key={player.id} 
                                  player={player} 
                                  currentUser={currentUser} 
                                  onStatusChange={handleStatusChange}
                                  onEdit={handleOpenEdit}
                              />
                           ))
                        ) : (
                           <div className="text-center py-8 text-gray-500 bg-gray-800/20 rounded-xl border border-gray-700/50 border-dashed">
                              No players found with this status.
                           </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800/30 rounded-2xl p-8 text-center border border-gray-700/50 border-dashed">
                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Lock className="w-6 h-6 text-gray-500" />
                    </div>
                    <h3 className="text-gray-200 font-bold mb-1">Roster Hidden</h3>
                    <p className="text-sm text-gray-500 max-w-[200px] mx-auto leading-relaxed">Only admins can view the full player list.</p>
                    <div className="mt-8">
                       <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-bold">Live Capacity</p>
                       <div className="flex justify-center gap-1.5 flex-wrap max-w-[180px] mx-auto">
                           {Array.from({ length: MAX_PLAYERS }).map((_, i) => (
                               <div 
                                   key={i} 
                                   className={`w-3 h-3 rounded-full transition-colors duration-500 ${i < confirmedCount ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-700'}`}
                               />
                           ))}
                       </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6 animate-fade-in pb-24">
                
                {/* DATABASE CARD */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <Database className="w-5 h-5 text-green-400" />
                        Database
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Google Web App URL</label>
                            <div className="flex gap-2 mt-1">
                                <input 
                                    type="text" 
                                    value={config.googleSheetUrl || ''}
                                    onChange={(e) => setConfig(prev => ({...prev, googleSheetUrl: e.target.value}))}
                                    placeholder="https://script.google.com/..."
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-green-500 outline-none"
                                />
                                <button 
                                    onClick={handleSync}
                                    disabled={isSyncing || !config.googleSheetUrl}
                                    className="bg-gray-700 text-white px-3 rounded-lg flex items-center justify-center disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2">
                             <div className="flex items-center gap-2">
                                 {syncStatus === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                 {syncStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                 <span className="text-xs text-gray-500">
                                    {syncStatus === 'success' ? 'Synced' : syncStatus === 'error' ? 'Failed' : 'Not connected'}
                                 </span>
                             </div>
                             {config.googleSheetUrl && (
                                 <button onClick={handleInitializeDatabase} className="text-[10px] text-orange-400 hover:text-orange-300 underline">
                                    Initialize DB
                                 </button>
                             )}
                        </div>
                        
                        {/* Clear Cache Button */}
                        <div className="border-t border-gray-700 pt-3 mt-2">
                           <button 
                             onClick={handleClearCache}
                             className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 w-full justify-end"
                           >
                             <Trash className="w-3 h-3" /> Clear Local Cache & Reload
                           </button>
                        </div>
                    </div>
                </div>

                {/* CONTROLS CARD */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                     <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        Controls
                    </h3>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleResetWeek}
                            className="flex-1 bg-gray-700 hover:bg-red-900/30 text-gray-200 hover:text-red-300 font-semibold py-3 px-4 rounded-lg text-xs transition-colors border border-gray-600 hover:border-red-800 flex items-center justify-center gap-2"
                        >
                            <History className="w-4 h-4" />
                            Archive & Reset Week
                        </button>
                    </div>
                </div>

                 {/* ANALYTICS CARD */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-yellow-400" />
                          Player History
                      </h3>
                      <button 
                        onClick={handleFetchStats} 
                        disabled={loadingStats || !config.googleSheetUrl}
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-gray-300"
                      >
                        {loadingStats ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>

                    {playerStats.length > 0 ? (
                       <div className="overflow-hidden rounded-lg border border-gray-700">
                          <table className="w-full text-left text-xs">
                             <thead className="bg-gray-700/50 text-gray-400 uppercase">
                                <tr>
                                   <th className="px-3 py-2">Name</th>
                                   <th className="px-3 py-2 text-center">Tier</th>
                                   <th className="px-3 py-2 text-right">Games</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-700">
                                {playerStats.slice(0, 10).map(stat => (
                                   <tr key={stat.id} className="hover:bg-gray-700/30">
                                      <td className="px-3 py-2 text-gray-200">{stat.name}</td>
                                      <td className="px-3 py-2 text-center">
                                         <span className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                            stat.tier === Tier.ONE ? 'border-yellow-500 text-yellow-500' : 
                                            stat.tier === Tier.TWO ? 'border-blue-500 text-blue-500' : 
                                            'border-gray-500 text-gray-500'
                                         }`}>T{stat.tier}</span>
                                      </td>
                                      <td className="px-3 py-2 text-right font-mono text-gray-300">{stat.gamesPlayed}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                          <div className="bg-gray-700/30 p-2 text-center text-[10px] text-gray-500 italic">
                             Top 10 most frequent players
                          </div>
                       </div>
                    ) : (
                       <div className="text-center py-4 text-gray-500 text-xs">
                          {config.googleSheetUrl ? "Tap Refresh to see history" : "Connect database to view stats"}
                       </div>
                    )}
                </div>

                {/* INVITES CARD */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                        Invites
                    </h3>
                    <div className="space-y-3">
                        <button 
                            onClick={handleShare}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                        >
                            <Share2 className="w-4 h-4" />
                            Generate General Invite
                        </button>

                        <button 
                            onClick={handleWaitlistMessage}
                            className="w-full bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-600/30 font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                            <Send className="w-4 h-4" />
                            Notify Waitlist (Full Capacity)
                        </button>
                    </div>
                </div>

                <TeamBuilder players={players.filter(p => p.status === PlayerStatus.IN)} />
            </div>
        )}

      </main>
      
      {/* TOAST NOTIFICATION SYSTEM */}
      {toast && (
         <div className="fixed bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-gray-800 animate-bounce-in z-50 whitespace-nowrap">
           {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-400" /> : 
            toast.type === 'error' ? <XCircle className="w-5 h-5 text-red-400" /> : 
            <AlertCircle className="w-5 h-5 text-blue-400" />}
           <span className="text-sm font-bold">{toast.msg}</span>
         </div>
      )}

      {activeTab === 'roster' && currentUser && currentUser.status === PlayerStatus.UNKNOWN && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-800 p-4 pb-safe-bottom z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] animate-slide-up">
            <div className="max-w-md mx-auto flex gap-3">
                <button 
                    onClick={() => handleStatusChange(currentUser.id, PlayerStatus.OUT)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-3.5 rounded-xl transition-colors border border-gray-700 active:scale-[0.98]"
                >
                    I'm Out
                </button>
                <button 
                    onClick={() => handleStatusChange(currentUser.id, PlayerStatus.IN)}
                    className="flex-[2] bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    I'm In
                </button>
            </div>
        </div>
      )}

      {/* Player Form Modal */}
      <PlayerForm 
          isOpen={showPlayerForm}
          onClose={() => setShowPlayerForm(false)}
          onSubmit={handlePlayerFormSubmit}
          onDelete={handlePlayerDelete}
          initialData={editingPlayer}
          isAdminMode={isAdmin} 
      />
    </div>
  );
};
