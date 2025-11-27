import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, Edit2, Trophy, Save, RefreshCw, Wifi, WifiOff, Minus, Settings } from 'lucide-react';
import { getGameScore, updateGameScore } from '../services/sheetService';
import { Player } from '../types';

interface ScoreboardProps {
  googleSheetUrl?: string;
  currentUser?: Player | null;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ googleSheetUrl, currentUser }) => {
  const SETTINGS_KEY = 'hoops_game_settings';
  
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [prevScoreA, setPrevScoreA] = useState(0);
  const [prevScoreB, setPrevScoreB] = useState(0);
  const [teamA, setTeamA] = useState("Team A");
  const [teamB, setTeamB] = useState("Team B");
  const [finalScore, setFinalScore] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editScoreA, setEditScoreA] = useState("0");
  const [editScoreB, setEditScoreB] = useState("0");
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [editTeamA, setEditTeamA] = useState("");
  const [editTeamB, setEditTeamB] = useState("");
  const [editFinalScore, setEditFinalScore] = useState("0");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const { teamA: sTeamA, teamB: sTeamB, finalScore: sFinalScore } = JSON.parse(saved);
        setTeamA(sTeamA || "Team A");
        setTeamB(sTeamB || "Team B");
        setFinalScore(sFinalScore || 0);
      } catch (e) {
        console.error("Failed to load game settings:", e);
      }
    }
    fetchScore();
    const interval = setInterval(() => { if (!isEditing && !showTeamSettings) fetchScore(true); }, 10000);
    return () => clearInterval(interval);
  }, [googleSheetUrl]);

  const fetchScore = async (silent = false) => {
    if (!googleSheetUrl) return;
    if (!silent) setIsLoading(true);
    const scores = await getGameScore(googleSheetUrl);
    if (scores) { 
      setScoreA(scores.scoreA); 
      setScoreB(scores.scoreB);
      setPrevScoreA(scores.prevScoreA || 0);
      setPrevScoreB(scores.prevScoreB || 0);
      setLastUpdated(new Date()); 
    }
    if (!silent) setIsLoading(false);
  };

  const syncScore = (newA: number, newB: number) => {
     if (!googleSheetUrl) return;
     if (timeoutRef.current) clearTimeout(timeoutRef.current);
     timeoutRef.current = setTimeout(() => { 
       updateGameScore(googleSheetUrl, newA, newB, currentUser?.name || "User", prevScoreA, prevScoreB);
     }, 1000);
  };

  const increment = (team: 'A' | 'B', amount: number) => {
    if (isEditing) return;
    let newA = scoreA, newB = scoreB;
    if (team === 'A') { newA = Math.max(0, scoreA + amount); setScoreA(newA); } else { newB = Math.max(0, scoreB + amount); setScoreB(newB); }
    setLastUpdated(new Date());
    syncScore(newA, newB);
  };

  const handleReset = () => {
    if (window.confirm("Reset scores to 0-0?")) { 
      setPrevScoreA(scoreA);
      setPrevScoreB(scoreB);
      setScoreA(0); 
      setScoreB(0); 
      setEditScoreA("0"); 
      setEditScoreB("0"); 
      setIsEditing(false); 
      setLastUpdated(new Date());
      syncScore(0, 0); 
    }
  };

  const toggleEdit = () => {
    if (isEditing) { 
      const finalA = parseInt(editScoreA) || 0; 
      const finalB = parseInt(editScoreB) || 0; 
      setScoreA(finalA); 
      setScoreB(finalB); 
      setLastUpdated(new Date());
      syncScore(finalA, finalB); 
    } else { 
      setEditScoreA(scoreA.toString()); 
      setEditScoreB(scoreB.toString()); 
    }
    setIsEditing(!isEditing);
  };

  const handleSaveTeamSettings = () => {
    const newTeamA = editTeamA || "Team A";
    const newTeamB = editTeamB || "Team B";
    const newFinalScore = parseInt(editFinalScore) || 0;
    setTeamA(newTeamA);
    setTeamB(newTeamB);
    setFinalScore(newFinalScore);
    setLastUpdated(new Date());
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ teamA: newTeamA, teamB: newTeamB, finalScore: newFinalScore }));
    setShowTeamSettings(false);
  };

  const winner = finalScore > 0 && (scoreA >= finalScore ? teamA : scoreB >= finalScore ? teamB : null);

  if (showTeamSettings) {
    return (
      <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-xl animate-fade-in">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5" /> Game Settings</h2>
          <button onClick={() => setShowTeamSettings(false)} className="p-2 bg-gray-700 rounded-lg text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Team A Name</label>
            <input type="text" value={editTeamA} onChange={(e) => setEditTeamA(e.target.value)} placeholder={teamA} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Team B Name</label>
            <input type="text" value={editTeamB} onChange={(e) => setEditTeamB(e.target.value)} placeholder={teamB} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Final Score (0 = no limit)</label>
            <input type="number" value={editFinalScore} onChange={(e) => setEditFinalScore(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none" min="0" />
          </div>
          <button onClick={handleSaveTeamSettings} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors">Save Settings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 shadow-xl animate-fade-in">
      {winner && (
        <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-green-600/30 to-green-500/20 border border-green-500/50 animate-pulse">
          <div className="text-center text-2xl font-bold text-green-300">🏆 {winner} WINS!</div>
          <div className="text-center text-sm text-green-200 mt-1">Final Score: {scoreA} - {scoreB}</div>
        </div>
      )}
      <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
         <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Scoreboard</h2>
            {finalScore > 0 && <div className="text-xs text-gray-400 mt-1">Target: {finalScore}</div>}
            <div className="flex items-center gap-1.5 mt-1">
               {googleSheetUrl ? <span className="flex items-center gap-1 text-[10px] text-green-400"><Wifi className="w-3 h-3" /> Live</span> : <span className="flex items-center gap-1 text-[10px] text-gray-500"><WifiOff className="w-3 h-3" /> Local</span>}
               {lastUpdated && <span className="text-[10px] text-gray-500">• Updated {lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
            </div>
         </div>
         <div className="flex gap-2">
             <button onClick={() => fetchScore()} className={`p-2 bg-gray-700 text-blue-400 rounded-lg hover:bg-gray-600 transition-colors ${isLoading ? 'animate-spin' : ''}`} title="Sync"><RefreshCw className="w-4 h-4" /></button>
             <button onClick={() => { setEditTeamA(teamA); setEditTeamB(teamB); setEditFinalScore(finalScore.toString()); setShowTeamSettings(true); }} className="p-2 bg-gray-700 text-purple-400 rounded-lg hover:bg-gray-600 transition-colors" title="Settings"><Settings className="w-4 h-4" /></button>
            <button onClick={toggleEdit} className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${isEditing ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'}`}>{isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />} {isEditing && <span className="text-xs font-bold pr-1">SAVE</span>}</button>
            <button onClick={handleReset} className="p-2 bg-gray-700 text-red-400 rounded-lg hover:bg-red-900/20 transition-colors" title="Reset Score"><RotateCcw className="w-4 h-4" /></button>
         </div>
      </div>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 flex flex-col items-center">
           <h3 className="text-blue-400 font-bold uppercase tracking-widest mb-2 text-sm">{teamA}</h3>
           <div className={`bg-black/40 rounded-2xl w-full aspect-square flex items-center justify-center mb-4 border-2 relative overflow-hidden transition-colors ${isEditing ? 'border-blue-500/60 bg-blue-900/10' : 'border-blue-500/30'}`}>
              {isEditing ? <input type="number" value={editScoreA} onChange={(e) => setEditScoreA(e.target.value)} className="bg-transparent text-6xl font-mono font-bold text-center text-white w-full h-full outline-none appearance-none" /> : <span className="text-7xl font-mono font-bold text-white tracking-tighter">{scoreA}</span>}
              {!isEditing && prevScoreA > 0 && <div className="absolute bottom-2 left-2 text-xs text-blue-300 opacity-60">← {prevScoreA}</div>}
           </div>
           <div className="grid grid-cols-4 gap-2 w-full">{[1, 2, 3].map(n => (<button key={n} onClick={() => increment('A', n)} disabled={isEditing} className="bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-400 font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:scale-100 text-sm">+{n}</button>))}<button onClick={() => increment('A', -1)} disabled={isEditing} className="bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-400 font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:scale-100"><Minus className="w-4 h-4 mx-auto" /></button></div>
        </div>
        <div className="h-48 w-px bg-gray-700 mx-1 self-center hidden sm:block"></div>
        <div className="flex-1 flex flex-col items-center">
           <h3 className="text-orange-400 font-bold uppercase tracking-widest mb-2 text-sm">{teamB}</h3>
            <div className={`bg-black/40 rounded-2xl w-full aspect-square flex items-center justify-center mb-4 border-2 relative overflow-hidden transition-colors ${isEditing ? 'border-orange-500/60 bg-orange-900/10' : 'border-orange-500/30'}`}>
              {isEditing ? <input type="number" value={editScoreB} onChange={(e) => setEditScoreB(e.target.value)} className="bg-transparent text-6xl font-mono font-bold text-center text-white w-full h-full outline-none appearance-none" /> : <span className="text-7xl font-mono font-bold text-white tracking-tighter">{scoreB}</span>}
              {!isEditing && prevScoreB > 0 && <div className="absolute bottom-2 right-2 text-xs text-orange-300 opacity-60">{prevScoreB} →</div>}
           </div>
           <div className="grid grid-cols-4 gap-2 w-full"><button onClick={() => increment('B', -1)} disabled={isEditing} className="bg-red-600/20 hover:bg-red-600/40 border border-red-500/50 text-red-400 font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:scale-100"><Minus className="w-4 h-4 mx-auto" /></button>{[1, 2, 3].map(n => (<button key={n} onClick={() => increment('B', n)} disabled={isEditing} className="bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/50 text-orange-400 font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-30 disabled:scale-100 text-sm">+{n}</button>))}</div>
        </div>
      </div>
      <div className="mt-6 text-center"><p className="text-gray-500 text-xs italic">{isEditing ? "Enter new scores and tap Save" : "Tap buttons to add points (Syncs automatically)"}</p></div>
    </div>
  );
};
export default Scoreboard;