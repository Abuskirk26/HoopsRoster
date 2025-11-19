
import React from 'react';
import { Player, PlayerStatus, Tier } from '../types';
import { User, Check, X, Clock, ShieldCheck, Phone, Mail, Pencil } from 'lucide-react';

interface PlayerCardProps {
  player: Player;
  currentUser: Player | null;
  onStatusChange: (id: string, status: PlayerStatus) => void;
  onEdit?: (player: Player) => void;
}

const PlayerCard: React.FC<PlayerCardProps> = ({ player, currentUser, onStatusChange, onEdit }) => {
  const isCurrentUser = currentUser?.id === player.id;
  const isAdmin = currentUser?.isAdmin === true;
  const canEditStatus = isCurrentUser || isAdmin;

  const getTierColor = (tier: Tier) => {
    switch (tier) {
      case Tier.ONE: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case Tier.TWO: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case Tier.THREE: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-700';
    }
  };

  const getStatusIcon = () => {
    switch (player.status) {
      case PlayerStatus.IN: return <Check className="w-5 h-5 text-green-400" />;
      case PlayerStatus.OUT: return <X className="w-5 h-5 text-red-400" />;
      case PlayerStatus.WAITLIST: return <Clock className="w-5 h-5 text-orange-400" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-600" />;
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 mb-2 rounded-xl border ${isCurrentUser ? 'border-orange-500 bg-gray-800/80' : 'border-gray-800 bg-gray-800/40'}`}>
      <div className="flex items-center space-x-3 overflow-hidden">
        <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center bg-gray-700 relative`}>
          {player.isAdmin ? <ShieldCheck className="w-5 h-5 text-blue-400" /> : <User className="w-5 h-5 text-gray-400" />}
          {player.isAdmin && <div className="absolute -top-1 -right-1 bg-blue-500 text-[8px] text-white px-1 rounded-full">ADM</div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <span className={`font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-gray-200'}`}>{player.name}</span>
            {isAdmin && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getTierColor(player.tier)}`}>T{player.tier}</span>}
          </div>
          <div className="flex flex-col">
            <div className="text-xs text-gray-500">
              {player.status === PlayerStatus.UNKNOWN ? 'Not responded' : player.status === PlayerStatus.WAITLIST ? 'Waitlisted' : player.status === PlayerStatus.IN ? 'Confirmed' : 'Out'}
            </div>
            {isAdmin && (
              <div className="flex gap-2 mt-0.5">
                {player.phoneNumber && <a href={`sms:${player.phoneNumber}`} className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"><Phone className="w-3 h-3" /> SMS</a>}
                {player.email && <a href={`mailto:${player.email}`} className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300"><Mail className="w-3 h-3" /> Email</a>}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && onEdit && (
          <button onClick={() => onEdit(player)} className="p-2 rounded-full hover:bg-gray-700 text-gray-500 hover:text-gray-300">
            <Pencil className="w-4 h-4" />
          </button>
        )}
        {canEditStatus ? (
          <div className="flex space-x-2">
            <button onClick={() => onStatusChange(player.id, PlayerStatus.OUT)} className={`p-2 rounded-full transition-colors ${player.status === PlayerStatus.OUT ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500' : 'hover:bg-red-500/10 text-gray-500'}`}><X className="w-4 h-4" /></button>
            <button onClick={() => onStatusChange(player.id, PlayerStatus.IN)} className={`p-2 rounded-full transition-colors ${player.status === PlayerStatus.IN || player.status === PlayerStatus.WAITLIST ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500' : 'hover:bg-green-500/10 text-gray-500'}`}><Check className="w-4 h-4" /></button>
          </div>
        ) : <div className="px-2">{getStatusIcon()}</div>}
      </div>
    </div>
  );
};
export default PlayerCard;