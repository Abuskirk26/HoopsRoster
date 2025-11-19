
import React, { useState } from 'react';
import { Player, GeneratedTeams } from '../types';
import { generateBalancedTeams } from '../services/geminiService';
import { Sparkles, RefreshCw, Users, Shield, Info } from 'lucide-react';

interface TeamBuilderProps {
  players: Player[];
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ players }) => {
  const [teams, setTeams] = useState<GeneratedTeams | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true); setError(null);
    try {
      const result = await generateBalancedTeams(players);
      setTeams(result);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); } finally { setLoading(false); }
  };

  if (players.length < 4) return <div className="p-8 text-center text-gray-500"><Users className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>Need 4+ players to generate teams.</p></div>;

  return (
    <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 border border-indigo-500/20 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-yellow-400" /> AI Coach</h2>
        <button onClick={handleGenerate} disabled={loading} className="bg-white text-indigo-900 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 disabled:opacity-50">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {teams ? 'Regenerate' : 'Make Teams'}
        </button>
      </div>
      {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-4">{error}</div>}
      {!teams && !loading && <div className="text-center py-8 text-indigo-300/60"><Shield className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Tap "Make Teams" to balance using tiers.</p></div>}
      {loading && <div className="space-y-4 animate-pulse"><div className="h-32 bg-indigo-500/10 rounded-xl"></div><div className="h-32 bg-indigo-500/10 rounded-xl"></div></div>}
      {teams && !loading && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-indigo-950/50 p-3 rounded-lg border border-indigo-500/30"><p className="text-sm text-indigo-200 italic flex items-start gap-2"><Info className="w-4 h-4 shrink-0 mt-0.5" />{teams.strategy}</p></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"><h3 className="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">Team A</h3><ul className="space-y-2">{teams.teamA.map((p, i) => <li key={i} className="text-sm text-gray-300 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>{p}</li>)}</ul></div>
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"><h3 className="text-lg font-bold text-white mb-3 border-b border-gray-700 pb-2">Team B</h3><ul className="space-y-2">{teams.teamB.map((p, i) => <li key={i} className="text-sm text-gray-300 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>{p}</li>)}</ul></div>
          </div>
        </div>
      )}
    </div>
  );
};
export default TeamBuilder;