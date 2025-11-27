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

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const limited = digits.slice(0, 10);
    if (limited.length < 4) return limited;
    if (limited.length < 7) return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
    if (errors.pin) setErrors(prev => ({...prev, pin: undefined}));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: {phone?: string, email?: string, pin?: string} = {};
    if (!name.trim()) return;
    const rawPhone = phone.replace(/\D/g, '');
    if (!rawPhone) newErrors.phone = "Required"; else if (rawPhone.length !== 10) newErrors.phone = "10 digits";
    if (!pin || pin.length !== 4) newErrors.pin = "4-digit PIN required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email";
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-800 rounded-2xl w-full max-w-sm border border-gray-700 shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
          <h3 className="font-bold text-white flex items-center gap-2">
             {initialData ? <Save className="w-4 h-4 text-blue-400" /> : <UserPlus className="w-4 h-4 text-green-400" />}
             {initialData ? 'Edit Player' : 'New Player Profile'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-orange-500 outline-none placeholder-gray-600" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mobile *</label>
            <input type="tel" value={phone} onChange={handlePhoneChange} className={`w-full bg-gray-900 border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 outline-none ${errors.phone ? 'border-red-500' : 'border-gray-700'}`} placeholder="xxx-xxx-xxxx" />
            {errors.phone && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.phone}</p>}
          </div>
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">PIN *</label>
             <div className="relative"><Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" /><input type="text" inputMode="numeric" maxLength={4} value={pin} onChange={handlePinChange} className={`w-full bg-gray-900 border rounded-lg pl-10 pr-3 py-2.5 text-sm text-white focus:ring-2 outline-none tracking-widest font-mono ${errors.pin ? 'border-red-500' : 'border-gray-700'}`} placeholder="0000" /></div>
             {errors.pin && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.pin}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Email</label>
            <input type="email" value={email} onChange={handleEmailChange} className={`w-full bg-gray-900 border rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 outline-none ${errors.email ? 'border-red-500' : 'border-gray-700'}`} />
          </div>
          {isAdminMode && (
             <div>
               <div className="grid grid-cols-3 gap-2 mb-3">
                  {[Tier.ONE, Tier.TWO, Tier.THREE].map((t) => (<button key={t} type="button" onClick={() => setTier(t)} className={`py-2 rounded-lg text-xs font-bold border ${tier === t ? (t === Tier.ONE ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : t === Tier.TWO ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-gray-500/20 border-gray-500 text-gray-300') : 'bg-gray-900 border-gray-700 text-gray-500'}`}>Tier {t}</button>))}
               </div>
               <div className="flex items-center justify-between bg-gray-900 p-3 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-blue-400" /><span className="text-sm font-bold text-gray-300 block">Admin Access</span></div>
                  <button type="button" onClick={() => setIsAdminRights(!isAdminRights)} className={`w-12 h-6 rounded-full transition-colors relative ${isAdminRights ? 'bg-blue-600' : 'bg-gray-700'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isAdminRights ? 'left-7' : 'left-1'}`} /></button>
               </div>
             </div>
          )}
          <div className="pt-2 space-y-3">
             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg"> {initialData ? 'Save Changes' : 'Create Profile'} </button>
             {initialData && onDelete && (
               <button 
                 type="button" 
                 onClick={() => {
                   if (window.confirm(`Delete ${initialData.name}? This cannot be undone.`)) {
                     onDelete(initialData.id);
                   }
                 }} 
                 className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold py-3 rounded-xl border border-red-600/50 flex items-center justify-center gap-2"
               >
                 <Trash2 className="w-4 h-4" /> Delete Account
               </button>
             )}
             {isAdminMode && initialData && onDelete && <button type="button" onClick={() => onDelete(initialData.id)} className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"><Trash2 className="w-4 h-4" /> Delete Profile</button>}
          </div>
        </form>
      </div>
    </div>
  );
};
export default PlayerForm;