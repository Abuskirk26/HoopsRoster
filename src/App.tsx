
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Player, PlayerStatus, Tier, AppConfig, PlayerStats } from './types';
import { INITIAL_PLAYERS, MAX_PLAYERS } from './constants';
import PlayerCard from './components/PlayerCard';
import TeamBuilder from './components/TeamBuilder';
import PlayerForm from './components/PlayerForm';
import { generateInviteMessage } from './services/geminiService';
import { syncRosterFromSheet, initializeSheet, updatePlayerStatusOnSheet, resetWeekOnSheet, createPlayerOnSheet, updatePlayerDetailsOnSheet, getPlayerStats, deletePlayerOnSheet } from './services/sheetService';
import { Calendar, Users, Trophy, Share2, MessageSquare, Lock, Shield, LogOut, Database, Link, CheckCircle, AlertCircle, RefreshCw, KeyRound, AlertTriangle, UserPlus, Search, BarChart3, History, FilterX, ChevronRight, Send, XCircle } from 'lucide-react';
import { format, nextMonday, startOfToday, getDay } from 'date-fns';

const STORAGE_KEY_PLAYERS = 'hoops_players_data_v2';
const STORAGE_KEY_USER = 'hoops_current_user_v2';
const STORAGE_KEY_CONFIG = 'hoops_app_config_v2';

export const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG) || '{}'); } catch { return {}; }
  });
  const [players, setPlayers] = useState<Player[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_PLAYERS) || '') || INITIAL_PLAYERS; } catch { return INITIAL_PLAYERS; }
  });
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY_USER));
  const [activeTab, setActiveTab] = useState<'roster' | 'admin'>('roster');
  const [inviteMessage, setInviteMessage] = useState<string>("");
  const [adminFilter, setAdminFilter] = useState<'ALL' | 'IN' | 'WAITLIST' | 'PENDING'>('ALL');
  const [pendingLoginPlayer, setPendingLoginPlayer] = useState<Player | null>(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [authError, setAuthError] = useState("");
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);

  const currentUser = useMemo(() => players.find(p => p.id === currentUserId) || null, [players, currentUserId]);
  const isAdmin = currentUser?.isAdmin === true;

  useEffect(() => { localStorage.setItem(STORAGE_KEY_PLAYERS, JSON.stringify(players)); }, [players]);
  useEffect(() => { if (currentUserId) localStorage.setItem(STORAGE_KEY_USER, currentUserId); else localStorage.removeItem(STORAGE_KEY_USER); }, [currentUserId]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config)); }, [config]);
  useEffect(() => { if (config.googleSheetUrl) handleSync(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({msg, type}); setTimeout(() => setToast(null), 3000);
  };

  const handleSync = useCallback(async () => {
    if (!config.googleSheetUrl) return;
    setIsSyncing(true); setSyncStatus('idle');
    const remotePlayers = await syncRosterFromSheet(config.googleSheetUrl);
    if (remotePlayers) { setPlayers(remotePlayers); setSyncStatus('success'); } else { if (players.length > 0) setSyncStatus('error'); }
    setIsSyncing(false);
  }, [config.googleSheetUrl]);

  const handleFetchStats = async () => {
    if (!config.googleSheetUrl) return;
    setLoadingStats(true);
    const stats = await getPlayerStats(config.googleSheetUrl);
    if (stats) setPlayerStats(stats);
    setLoadingStats(false);
  };

  const recalculateRosterStatus = (currentList: Player[]): Player[] => {
    const hopefuls = currentList.filter(p => p.status === PlayerStatus.IN || p.status === PlayerStatus.WAITLIST);
    hopefuls.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return (a.timestamp || 0) - (b.timestamp || 0);
    });
    const updatedHopefuls = hopefuls.map((p, index) => ({ ...p, status: index < MAX_PLAYERS ? PlayerStatus.IN : PlayerStatus.WAITLIST }));
    const updatesMap = new Map(updatedHopefuls.map(p => [p.id, p]));
    return currentList.map(p => updatesMap.get(p.id) || p);
  };

  const handleStatusChange = (id: string, newStatus: PlayerStatus) => {
    const player = players.find(p => p.id === id);
    if (player && newStatus === PlayerStatus.IN && !isAdmin) {
       if (player.tier !== Tier.ONE && getDay(new Date()) !== 1) { showToast(`Tier ${player.tier} invites open on Monday!`, 'error'); return; }
    }
    setPlayers(prev => {
      const withUpdatedIntent = prev.map(p => {
        if (p.id !== id) return p;
        const wasInPool = p.status === PlayerStatus.IN || p.status === PlayerStatus.WAITLIST;
        const isJoiningPool = newStatus === PlayerStatus.IN; 
        return { ...p, status: newStatus, timestamp: (isJoiningPool && !wasInPool) ? Date.now() : p.timestamp };
      });
      return recalculateRosterStatus(withUpdatedIntent);
    });
    if (config.googleSheetUrl) updatePlayerStatusOnSheet(config.googleSheetUrl, id, newStatus, Date.now(), currentUser?.name || "Unknown");
  };

  const handlePlayerFormSubmit = (data: Partial<Player>) => {
    if (isSignUpMode) {
       const newPlayer: Player = { id: crypto.randomUUID(), name: data.name || 'Unknown', tier: Tier.THREE, status: PlayerStatus.UNKNOWN, phoneNumber: data.phoneNumber || '', email: data.email, pin: data.pin, isAdmin: false };
       setPlayers(prev => [...prev, newPlayer]); setCurrentUserId(newPlayer.id); showToast("Welcome!", "success");
       if (config.googleSheetUrl) createPlayerOnSheet(config.googleSheetUrl, newPlayer, newPlayer.name);
    } else if (editingPlayer) {
       setPlayers(prev => recalculateRosterStatus(prev.map(p => p.id === editingPlayer.id ? { ...p, ...data } as Player : p)));
       showToast("Updated");
       if (config.googleSheetUrl) updatePlayerDetailsOnSheet(config.googleSheetUrl, { ...editingPlayer, ...data } as Player, currentUser?.name || "System");
    }
  };

  const handlePlayerDelete = (playerId: string) => {
      if (!window.confirm("Are you sure?")) return;
      setPlayers(prev => prev.filter(p => p.id !== playerId)); setShowPlayerForm(false); showToast("Deleted", 'info');
      if (config.googleSheetUrl) deletePlayerOnSheet(config.googleSheetUrl, playerId, currentUser?.name || "Admin");
      if (playerId === currentUserId) setCurrentUserId(null);
  };

  const handleResetWeek = () => {
      const shouldArchive = config.googleSheetUrl ? window.confirm("Archive to History?") : false;
      if (!shouldArchive && !window.confirm("Reset roster?")) return;
      setPlayers(prev => prev.map(p => ({ ...p, status: PlayerStatus.UNKNOWN, timestamp: undefined })));
      showToast("Roster reset");
      if (config.googleSheetUrl) resetWeekOnSheet(config.googleSheetUrl, currentUser?.name || "Admin", shouldArchive);
  };

  const handleShare = async () => {
    const msg = await generateInviteMessage(format(nextMonday(startOfToday()), 'MMMM do'));
    triggerShare(msg);
  };
  const handleWaitlistMessage = () => triggerShare("Sorry we are at capacity (12/12)! You are on the waitlist for next week.");
  const triggerShare = async (msg: string) => {
    const url = (window.location.href.startsWith('http')) ? window.location.href : undefined;
    try { await navigator.share({ title: 'Monday Hoops', text: msg, url }); } catch (e) { copyToClipboard(msg, url); }
  };
  const copyToClipboard = (msg: string, url?: string) => {
      navigator.clipboard.writeText(url ? `${msg}\n\n${url}` : msg).then(() => showToast("Copied!", "success")).catch(() => showToast("Failed copy", "error"));
  };

  const handlePinSubmit = () => {
      if (!pendingLoginPlayer) return;
      if (!pendingLoginPlayer.pin) { alert("Please set a PIN via Edit."); return; }
      if (enteredPin === pendingLoginPlayer.pin) { setCurrentUserId(pendingLoginPlayer.id); setPendingLoginPlayer(null); } else setAuthError("Incorrect PIN");
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
  const isAtCapacity = confirmedCount >= MAX_PLAYERS;

  if (!currentUserId) {
    const loginList = players.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).sort((a,b) => a.name.localeCompare(b.name));
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col font-sans">
        {pendingLoginPlayer && (
             <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/95 backdrop-blur-sm">
                <div className="bg-gray-800 w-full max-w-xs p-6 rounded-2xl border border-gray-700 shadow-2xl text-center">
                   <h3 className="text-xl font-bold mb-2">{pendingLoginPlayer.name}</h3>
                   <input type="password" inputMode="numeric" maxLength={4} autoFocus value={enteredPin} onChange={(e) => { setEnteredPin(e.target.value.replace(/\D/g, '').slice(0,4)); setAuthError(""); }} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-center text-2xl tracking-[1em] mb-4 focus:ring-orange-500" placeholder="••••" />
                   {authError && <p className="text-red-400 text-xs font-bold mb-2">{authError}</p>}
                   <button onClick={handlePinSubmit} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mb-2">Unlock</button>
                   <button onClick={() => { setPendingLoginPlayer(null); setEnteredPin(""); }} className="text-gray-500 text-sm">Cancel</button>
                </div>
             </div>
        )}
        <div className="text-center my-8"><h1 className="text-4xl font-extrabold flex justify-center gap-3"><span>🏀</span> <span className="text-orange-500">Hoops</span></h1></div>
        <div className="relative mb-4"><Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" /><input type="text" placeholder="Find name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-3 focus:ring-orange-500 outline-none" /></div>
        <div className="flex-1 overflow-y-auto mb-6 space-y-2 custom-scrollbar">
             {loginList.map(p => <button key={p.id} onClick={() => { setPendingLoginPlayer(p); setEnteredPin(""); setAuthError(""); }} className="w-full bg-gray-800/50 hover:bg-gray-700 px-4 py-3.5 rounded-xl flex items-center justify-between group border border-gray-700/50"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center ${p.isAdmin ? 'bg-blue-900/50 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>{p.isAdmin ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}</div><span>{p.name}</span></div><ChevronRight className="w-4 h-4 text-gray-600" /></button>)}
        </div>
        <button onClick={() => { setIsSignUpMode(true); setEditingPlayer(null); setShowPlayerForm(true); }} className="w-full bg-gradient-to-r from-orange-600 to-red-600 py-3.5 rounded-xl font-bold flex justify-center gap-2"><UserPlus className="w-5 h-5" /> New Player? Sign Up</button>
        <PlayerForm isOpen={showPlayerForm} onClose={() => setShowPlayerForm(false)} onSubmit={handlePlayerFormSubmit} isAdminMode={false} initialData={editingPlayer} />
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 px-4 py-3 rounded-2xl border border-gray-800 animate-bounce-in z-50">{toast.msg}</div>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-24 font-sans">
      <header className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 pt-safe-top shadow-lg"><div className="px-4 py-3 flex justify-between items-center max-w-md mx-auto"><div><h1 className="text-lg font-extrabold flex gap-2"><span className="text-orange-500">🏀</span> HoopsRoster</h1><div className="flex items-center gap-2 text-gray-400 text-[10px] font-medium mt-0.5 uppercase"><Calendar className="w-3 h-3" /><span>{format(nextMonday(startOfToday()), 'MMMM do')}</span>{config.googleSheetUrl && <span className={syncStatus === 'success' ? 'text-green-500' : 'text-red-500'}>• {isSyncing ? 'Syncing' : 'Linked'}</span>}</div></div><div className="flex items-center gap-3"><div className="bg-gray-800 px-3 py-1 rounded-lg border border-gray-700"><div className={`text-sm font-bold ${isAtCapacity ? 'text-red-400' : 'text-green-400'}`}>{confirmedCount}<span className="text-gray-500">/{MAX_PLAYERS}</span></div></div><button onClick={() => setCurrentUserId(null)} className="p-2 bg-gray-800 rounded-full text-gray-400"><LogOut className="w-4 h-4" /></button></div></div></header>
      <main className="max-w-md mx-auto px-4 pt-6">
        <div className="flex space-x-1 bg-gray-800 p-1.5 rounded-xl mb-6 border border-gray-700 shadow-inner">
          <button onClick={() => setActiveTab('roster')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${activeTab === 'roster' ? 'bg-gray-700 text-white shadow-md' : 'text-gray-500'}`}>RSVP</button>
          <button onClick={() => setActiveTab('admin')} disabled={!isAdmin} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase ${activeTab === 'admin' ? 'bg-gray-700 text-white' : 'text-gray-500 disabled:opacity-30'}`}>Admin</button>
        </div>
        {activeTab === 'roster' && (
          <div className="space-y-6">
            {isAtCapacity && <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 text-center"><h3 className="text-red-400 font-bold mb-1">Game Full!</h3><p className="text-sm text-gray-300">New signups go to <span className="text-orange-400">Waitlist</span>.</p></div>}
            {currentUser && <div className="mb-6"><h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Your Status</h3><PlayerCard player={currentUser} currentUser={currentUser} onStatusChange={handleStatusChange} /></div>}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <button onClick={() => isAdmin && setAdminFilter(adminFilter === 'IN' ? 'ALL' : 'IN')} className={`p-3 rounded-xl border ${adminFilter === 'IN' ? 'bg-green-500/20 border-green-500' : 'bg-gray-800/50 border-gray-700/50'}`}><div className="text-2xl font-bold text-white">{confirmedCount}</div><div className="text-[10px] text-gray-500 uppercase">Playing</div></button>
                <button onClick={() => isAdmin && setAdminFilter(adminFilter === 'WAITLIST' ? 'ALL' : 'WAITLIST')} className={`p-3 rounded-xl border ${adminFilter === 'WAITLIST' ? 'bg-orange-500/20 border-orange-500' : 'bg-gray-800/50 border-gray-700/50'}`}><div className="text-2xl font-bold text-orange-400">{players.filter(p => p.status === PlayerStatus.WAITLIST).length}</div><div className="text-[10px] text-gray-500 uppercase">Waitlist</div></button>
                <button onClick={() => isAdmin && setAdminFilter(adminFilter === 'PENDING' ? 'ALL' : 'PENDING')} className={`p-3 rounded-xl border ${adminFilter === 'PENDING' ? 'bg-gray-500/30 border-gray-500' : 'bg-gray-800/50 border-gray-700/50'}`}><div className="text-2xl font-bold text-gray-500">{players.length - confirmedCount - players.filter(p => p.status === PlayerStatus.WAITLIST).length}</div><div className="text-[10px] text-gray-500 uppercase">Pending</div></button>
            </div>
            {isAdmin ? (
                <div className="pb-20">
                    <div className="flex justify-between items-center mb-3"><h3 className="text-gray-400 text-xs font-bold uppercase">{adminFilter === 'ALL' ? 'Full Roster' : `Filter: ${adminFilter}`}</h3><button onClick={() => { setIsSignUpMode(true); setEditingPlayer(null); setShowPlayerForm(true); }} className="text-[10px] bg-gray-700 px-2 py-1 rounded text-white flex items-center gap-1"><UserPlus className="w-3 h-3" /> Add</button></div>
                    <div className="space-y-2">{filteredDisplayList.map(player => <PlayerCard key={player.id} player={player} currentUser={currentUser} onStatusChange={handleStatusChange} onEdit={(p) => { setIsSignUpMode(false); setEditingPlayer(p); setShowPlayerForm(true); }} />)}</div>
                </div>
            ) : (
                <div className="bg-gray-800/30 rounded-2xl p-8 text-center border border-gray-700/50 border-dashed"><Lock className="w-6 h-6 text-gray-500 mx-auto mb-4" /><h3 className="text-gray-200 font-bold mb-1">Roster Hidden</h3><p className="text-sm text-gray-500">Admins only.</p></div>
            )}
          </div>
        )}
        {activeTab === 'admin' && isAdmin && (
            <div className="space-y-6 pb-24">
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700"><h3 className="text-white font-bold mb-3 flex gap-2"><Database className="w-5 h-5 text-green-400" /> Database</h3><input type="text" value={config.googleSheetUrl || ''} onChange={(e) => setConfig(prev => ({...prev, googleSheetUrl: e.target.value}))} placeholder="Script URL..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs mb-2" /><div className="flex justify-between"><span className="text-xs text-gray-500">{syncStatus}</span><button onClick={handleSync} className="text-xs bg-gray-700 px-3 py-1 rounded">Sync</button></div></div>
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700"><h3 className="text-white font-bold mb-3">Controls</h3><button onClick={handleResetWeek} className="w-full bg-gray-700 hover:bg-red-900/30 text-gray-200 py-3 rounded-lg text-xs flex justify-center gap-2"><History className="w-4 h-4" /> Archive & Reset Week</button></div>
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700"><div className="flex justify-between mb-3"><h3 className="text-white font-bold flex gap-2"><BarChart3 className="w-5 h-5 text-yellow-400" /> History</h3><button onClick={handleFetchStats} className="text-xs bg-gray-700 px-2 py-1 rounded">Refresh</button></div>{playerStats.slice(0,5).map(s => <div key={s.id} className="flex justify-between text-xs py-1 border-b border-gray-700"><span>{s.name}</span><span>{s.gamesPlayed} G</span></div>)}</div>
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700"><h3 className="text-white font-bold mb-3">Invites</h3><div className="space-y-2"><button onClick={handleShare} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg flex justify-center gap-2"><Share2 className="w-4 h-4" /> Invite Team</button><button onClick={handleWaitlistMessage} className="w-full bg-orange-600/20 text-orange-400 font-bold py-3 rounded-lg flex justify-center gap-2">Notify Waitlist</button></div></div>
                <TeamBuilder players={players.filter(p => p.status === PlayerStatus.IN)} />
            </div>
        )}
      </main>
      {toast && <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-900 px-4 py-3 rounded-2xl border border-gray-800 animate-bounce-in z-50">{toast.msg}</div>}
      <PlayerForm isOpen={showPlayerForm} onClose={() => setShowPlayerForm(false)} onSubmit={handlePlayerFormSubmit} onDelete={handlePlayerDelete} initialData={editingPlayer} isAdminMode={isAdmin} />
    </div>
  );
};