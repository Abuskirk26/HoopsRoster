
import React, { useState, useEffect } from 'react';
import { Player, Tier, PlayerStatus } from '../types';
import { X, Save, UserPlus, AlertCircle, Lock, ShieldCheck, Trash2 } from 'lucide-react';

interface PlayerFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (playerData: Partial<Player>) => void;
  onDelete?: (playerId: string) => void;
  initialData?: Player | null;
  isAdminMode: boolean;
}

const PlayerForm: React.FC<PlayerFormProps> = ({ isOpen, onClose, onSubmit, onDelete, initialData, isAdminMode }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [tier, setTier] = useState<Tier>(Tier.THREE);
  const [isAdminRights, setIsAdminRights] = useState(false);
  const [errors, setErrors] = useState<{phone?: string, email?: string, pin?: string}>({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (initialData) {
        setName(initialData.name);
        setPhone(initialData.phoneNumber || ''); 
        setEmail(initialData.email || '');
        setPin(initialData.pin || '');
        setTier(initialData.tier);
        setIsAdminRights(initialData.isAdmin || false);
      } else {
        setName(''); setPhone(''); setEmail(''); setPin(''); setTier(Tier.THREE); setIsAdminRights(false);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: any = {};
    if (!name.trim()) return;
    if (!phone || phone.replace(/\D/g, '').length !== 10) newErrors.phone = "Must be 10 digits (xxx-xxx-xxxx).";
    if (!pin || pin.length !== 4) newErrors.pin = "4-digit PIN is required.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email.";
    
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    onSubmit({
      ...initialData,
      name, phoneNumber: phone, email, pin,
      tier: isAdminMode ? tier : (initialData?.tier || Tier.THREE),
      isAdmin: isAdminMode ? isAdminRights : (initialData?.isAdmin || false),
      status: initialData?.status || PlayerStatus.UNKNOWN
    });
    onClose();
  };

  const formatPhone = (val: string) => {
     const d = val.replace(/\D/g, '').slice(0, 10);
     if (d.length < 4) return d;
     if (d.length < 7) return `${d.slice(0,3)}-${d.slice(3)}`;
     return `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <h3 className="font-bold text-white flex items-center gap-2">{initialData ? 'Edit Player' : 'New Player'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:ring-2 focus:ring-orange-500 outline-none" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile *</label>
            <input type="tel" value={phone} onChange={e => setPhone(formatPhone(e.target.value))} className={`w-full bg-gray-900 border rounded-lg px-3 py-2.5 text-white outline-none ${errors.phone ? 'border-red-500' : 'border-gray-700'}`} placeholder="xxx-xxx-xxxx" />
            {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
          </div>
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PIN *</label>
             <div className="relative"><Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" /><input type="text" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))} className={`w-full bg-gray-900 border rounded-lg pl-10 pr-3 py-2.5 text-white outline-none tracking-widest font-mono ${errors.pin ? 'border-red-500' : 'border-gray-700'}`} placeholder="0000" /></div>
             {errors.pin && <p className="text-red-400 text-xs mt-1">{errors.pin}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white outline-none" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>
          {isAdminMode && (
             <div className="p-3 bg-gray-900 rounded-lg border border-gray-700 mt-2">
               <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-400">ADMIN ACCESS</span>
                  <button type="button" onClick={() => setIsAdminRights(!isAdminRights)} className={`w-10 h-5 rounded-full relative ${isAdminRights ? 'bg-blue-600' : 'bg-gray-700'}`}><div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${isAdminRights ? 'left-6' : 'left-1'}`} /></button>
               </div>
               <div className="flex gap-1">{[1,2,3].map(t => <button key={t} type="button" onClick={() => setTier(t)} className={`flex-1 py-1 text-xs rounded border ${tier === t ? 'bg-blue-900 border-blue-500 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>Tier {t}</button>)}</div>
             </div>
          )}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg mt-2">Save Profile</button>
          {isAdminMode && initialData && onDelete && <button type="button" onClick={() => onDelete(initialData.id)} className="w-full text-red-400 text-xs py-2 mt-1 hover:text-red-300 flex items-center justify-center gap-1"><Trash2 className="w-3 h-3" /> Delete User</button>}
        </form>
      </div>
    </div>
  );
};
export default PlayerForm;