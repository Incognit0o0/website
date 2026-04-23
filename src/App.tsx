import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Slider from '@radix-ui/react-slider';
import { Trophy, Users, Timer, Wallet, ChevronRight, Settings, X, Plus, Rocket, Car, Fence, Zap, CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, Search, Filter, AlertTriangle, TrendingUp, TrendingDown, Info, Gauge, Bell, History, Sparkles, LogOut, User as UserIcon, Lock, AtSign } from 'lucide-react';
import { Room, User, Horse, Player, GameHistory } from './types';

const THEME_LABELS: Record<string, string> = {
  'horses': 'Лошади',
  'f1': 'Формула 1',
  'space': 'Космос',
  'all': 'Все'
};

// Utility for formatting timer
const formatTimer = (seconds: number) => {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const secs = s % 60;
  return `${m.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function SmoothTimerDisplay({ initialSeconds, onZero, active = true, className = "" }: { initialSeconds: number, onZero?: () => void, active?: boolean, className?: string }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const lastSyncRef = useRef(initialSeconds);
  const requestRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialSeconds !== lastSyncRef.current) {
      if (Math.abs(initialSeconds - timeLeft) > 0.5) {
        setTimeLeft(initialSeconds);
      }
      lastSyncRef.current = initialSeconds;
    }
  }, [initialSeconds, timeLeft]);

  useEffect(() => {
    if (!active || timeLeft <= 0) {
      onZero?.();
      return;
    }

    const animate = (time: number) => {
      if (prevTimeRef.current !== null) {
        const deltaTime = (time - prevTimeRef.current) / 1000;
        setTimeLeft(prev => Math.max(0, prev - deltaTime));
      }
      prevTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      prevTimeRef.current = null;
    };
  }, [active, timeLeft === 0]);

  return <span className={className}>{formatTimer(Math.ceil(timeLeft))}</span>;
}

function AnimatedNumber({ value }: { value: number }) {
  const numericValue = typeof value === 'number' ? value : Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(numericValue);
  const requestRef = useRef<number | null>(null);
  const targetValueRef = useRef(numericValue);

  useEffect(() => {
    const nextValue = typeof value === 'number' ? value : Number(value) || 0;
    targetValueRef.current = nextValue;
    const animate = () => {
      setDisplayValue(prev => {
        const val = typeof prev === 'number' ? prev : Number(prev) || 0;
        const diff = targetValueRef.current - val;
        if (Math.abs(diff) < 0.1) return targetValueRef.current;
        return val + diff * 0.12; 
      });
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [value]);

  const finalDisplay = typeof displayValue === 'number' ? displayValue : 0;
  return <>{Math.floor(finalDisplay).toLocaleString()}</>;
}

interface Toast {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

function HistoryDetailModal({ history, onClose }: { history: GameHistory; onClose: () => void }) {
  const winnerParticipant = history.participants?.find(p => p.id === history.winnerId);
  const totalHumanLoss = history.participants?.filter(p => !p.isBot).reduce((acc, p) => acc + (p.balanceChange < 0 ? Math.abs(p.balanceChange) : 0), 0) || 0;
  const totalHumanGain = history.participants?.filter(p => !p.isBot).reduce((acc, p) => acc + (p.balanceChange > 0 ? p.balanceChange : 0), 0) || 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="glass w-full max-w-4xl rounded-[2.5rem] overflow-hidden border-neutral-800 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-8 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold-500/10 rounded-2xl">
              <History className="w-6 h-6 text-gold-500" />
            </div>
            <div>
              <h3 className="text-2xl font-display font-bold text-neutral-100">Детали раунда #{history.id}</h3>
              <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-0.5">{history.roomName} • {new Date(history.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-neutral-800 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[64vh] overflow-y-auto custom-scrollbar">
          {/* Top Cards: Financials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-3xl border-neutral-800/50 bg-neutral-900/20">
              <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <Wallet className="w-3 h-3" /> Призовой фонд
              </div>
              <div className="text-3xl font-display font-bold text-neutral-100 italic">
                {history.financials?.totalPool.toLocaleString() || '0'} <span className="text-sm">B</span>
              </div>
            </div>
            <div className="glass p-6 rounded-3xl border-gold-500/20 bg-gold-500/5">
              <div className="text-[10px] text-gold-500 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp className="w-3 h-3" /> Доход организатора
              </div>
              <div className="text-3xl font-display font-bold text-gold-500 italic">
                {history.financials?.totalOrganizerTake.toLocaleString() || '0'} <span className="text-sm font-normal">B</span>
              </div>
            </div>
            <div className="glass p-6 rounded-3xl border-blue-500/20 bg-blue-500/5">
              <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <Trophy className="w-3 h-3" /> Доля победителя
              </div>
              <div className="text-3xl font-display font-bold text-blue-400 italic">
                {history.financials?.winnerPool.toLocaleString() || '0'} <span className="text-sm font-normal">B</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Participants Table */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                <Users className="w-4 h-4" /> Состав участников
              </h4>
              <div className="glass rounded-[2rem] overflow-hidden border-neutral-800/40">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-neutral-900/50 border-b border-neutral-800">
                      <th className="px-6 py-4 font-bold uppercase tracking-widest text-neutral-600">Игрок</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-widest text-neutral-600 text-right">Гонщики</th>
                      <th className="px-6 py-4 font-bold uppercase tracking-widest text-neutral-600 text-right">Баланс</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {history.participants?.map(p => (
                      <tr key={p.id} className={p.id === history.winnerId ? 'bg-gold-500/5' : ''}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {p.isBot ? <Gauge className="w-3 h-3 text-blue-500" /> : <div className="w-2 h-2 rounded-full bg-green-500" />}
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-200">{p.name} {p.id === history.winnerId && '🏆'}</span>
                              <span className="text-[10px] text-neutral-500 uppercase">{p.isBot ? 'VIP Бот' : 'VIP Игрок'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-col items-end">
                             <div className="font-mono text-neutral-400">{p.horseIds.length} гонщ.</div>
                             {p.boostCount > 0 && <div className="text-[9px] text-gold-500/80 font-bold uppercase tracking-tighter">+{p.boostCount} буста</div>}
                          </div>
                        </td>
                        <td className={`px-6 py-4 text-right font-bold text-sm ${p.balanceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {p.balanceChange > 0 ? '+' : ''}{p.balanceChange.toLocaleString()} B
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Config & Integrity */}
            <div className="space-y-8">
               <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Настройки комнаты
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="glass p-4 rounded-2xl bg-neutral-950/40">
                      <div className="text-[9px] text-neutral-600 font-bold uppercase mb-1">Комиссия</div>
                      <div className="text-lg font-display font-bold text-neutral-300">{Math.round((history.config?.commissionRate || 0) * 100)}%</div>
                    </div>
                    <div className="glass p-4 rounded-2xl bg-neutral-950/40">
                      <div className="text-[9px] text-neutral-600 font-bold uppercase mb-1">Вход / Буст</div>
                      <div className="text-lg font-display font-bold text-neutral-300">{history.entryFee} / {history.config?.boostCost} B</div>
                    </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-500" /> Проверка честности
                  </h4>
                  <div className="glass p-6 rounded-2xl bg-neutral-950/40 space-y-4">
                    <div>
                      <div className="text-[9px] text-neutral-600 font-bold uppercase mb-1">Публичный хэш</div>
                      <code className="text-[10px] text-gold-500/80 break-all font-mono leading-relaxed block p-3 bg-black rounded-xl">
                        {history.fairnessHash}
                      </code>
                    </div>
                    <div>
                      <div className="text-[9px] text-neutral-600 font-bold uppercase mb-1">Скрытый Seed</div>
                      <code className="text-[10px] text-blue-400 font-mono block p-3 bg-black rounded-xl">
                        {history.serverSeed || 'Не раскрыт'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-green-500 bg-green-500/5 px-4 py-2 rounded-lg border border-green-500/20">
                       <CheckCircle2 className="w-3 h-3" /> Победитель {history.winnerName} подтвержден хэшем
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-neutral-950/80 border-t border-neutral-800 flex justify-end">
           <button onClick={onClose} className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-all">
             Закрыть журнал
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Add History icon from lucide
// import { History } from 'lucide-react';

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('vip_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(!user);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('vip_user', JSON.stringify(user));
      setIsAuthModalOpen(false);
    } else {
      localStorage.removeItem('vip_user');
      setIsAuthModalOpen(true);
    }
  }, [user]);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      setWsConnected(true);
      addToast('Соединение установлено', 'success');
      // If we already have a room selected, subscribe
      if (selectedRoomId) {
        socket.send(JSON.stringify({ type: 'SUBSCRIBE_ROOM', roomId: selectedRoomId }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'ROOM_UPDATE') {
          const updatedRoom: Room = payload.data;
          setRooms(prev => {
            const exists = prev.some(r => r.id === updatedRoom.id);
            if (!exists) return [updatedRoom, ...prev];
            return prev.map(r => r.id === updatedRoom.id ? updatedRoom : r);
          });
          // Update current selected room if it matches
          // (No need to explicitly update selectedRoomId, as useMemo handles it via rooms)
        } else if (payload.type === 'USER_UPDATE') {
          if (payload.data.userId === user?.id) {
            setUser(prev => {
              if (!prev) return null;
              const newBalance = payload.data.balance !== undefined ? Number(payload.data.balance) : prev.balance;
              return { ...prev, ...payload.data, balance: newBalance };
            });
          }
          if (user?.is_admin && payload.data.adminCommission !== undefined) {
             setAdminStats((prev: any) => prev ? { ...prev, adminCommission: payload.data.adminCommission } : null);
          }
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    };

    socket.onclose = () => {
      setWsConnected(false);
      addToast('Соединение потеряно. Переподключение через 5 секунд...', 'error');
      // Basic reconnection attempt by triggering a state change next turn
      setTimeout(() => {
        setRooms(prev => [...prev]); // Trigger a weak re-render/logic check
      }, 5000);
    };

    ws.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  // Sync room subscription
  useEffect(() => {
    if (ws.current?.readyState === WebSocket.OPEN && selectedRoomId) {
      ws.current.send(JSON.stringify({ type: 'SUBSCRIBE_ROOM', roomId: selectedRoomId }));
    }
  }, [selectedRoomId, wsConnected]);

  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Confirmation Modal State
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; text: string; onConfirm: () => void; onCancel: () => void } | null>(null);

  const [selectedHistoryItem, setSelectedHistoryItem] = useState<GameHistory | null>(null);

  const selectedRoom = useMemo(() => rooms.find(r => r.id === selectedRoomId), [rooms, selectedRoomId]);

  const [isAdminView, setIsAdminView] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const notifiedRacesRef = useRef<Set<string>>(new Set());
  const [adminStats, setAdminStats] = useState<any>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [sortBy, setSortBy] = useState<'fee_asc' | 'fee_desc'>('fee_desc');
  const [filters, setFilters] = useState({
    minFee: 0,
    maxFee: 10000,
    minCapacity: 2,
    maxCapacity: 10,
    theme: 'all'
  });
  const [visibleRoomsCount, setVisibleRoomsCount] = useState(12);
  const [sortedRooms, setSortedRooms] = useState<Room[]>([]);
  const [myRoomIds, setMyRoomIds] = useState<string[]>([]);
  
  const recommendedRooms = useMemo(() => {
    if (sortedRooms.length > 0 || rooms.length === 0) return [];

    return [...rooms]
      .sort((a, b) => {
        // Scoring Priority:
        // 1. Entry fee distance (absolute distance to [min, max] range)
        // 2. Capacity distance (absolute distance to [min, max] range)
        // Theme is ignored.

        const getDist = (val: number, min: number, max: number | undefined) => {
          if (val < min) return min - val;
          if (max !== undefined && val > max) return val - max;
          return 0;
        };

        const feeDistA = getDist(a.config.entryFee, filters.minFee, filters.maxFee);
        const feeDistB = getDist(b.config.entryFee, filters.minFee, filters.maxFee);
        
        if (feeDistA !== feeDistB) return feeDistA - feeDistB;

        const capDistA = getDist(a.horses.length, filters.minCapacity, filters.maxCapacity);
        const capDistB = getDist(b.horses.length, filters.minCapacity, filters.maxCapacity);
        
        return capDistA - capDistB;
      }).slice(0, 3);
  }, [rooms, sortedRooms.length, filters]);

  const activeParticipations = useMemo(() => {
    const uniqueRooms = new Map<string, Room>();
    rooms.forEach(room => {
      // ONLY show rooms where the CURRENT user is a player
      const amIPlaying = room.players.some(p => p.id === user?.id);
      const isMyRoom = myRoomIds.includes(room.id);
      
      if (amIPlaying || isMyRoom) {
        uniqueRooms.set(room.id, room);
      }
    });
    return Array.from(uniqueRooms.values());
  }, [rooms, myRoomIds, user?.id]);

  // Function to apply filters and sort
  const applySortAndFilter = useCallback((currentRooms: Room[]) => {
    const processed = [...currentRooms]
      .filter(r => {
        const feeMatch = r.config.entryFee >= filters.minFee && r.config.entryFee <= (filters.maxFee || Infinity);
        const capacityMatch = r.horses.length >= filters.minCapacity && r.horses.length <= (filters.maxCapacity || Infinity);
        const themeMatch = filters.theme === 'all' || r.theme === filters.theme;
        return feeMatch && capacityMatch && themeMatch;
      })
      .sort((a, b) => {
        // Prioritize rooms where user is a player
        const aIsMine = a.players.some(p => p.id === user?.id);
        const bIsMine = b.players.some(p => p.id === user?.id);
        if (aIsMine && !bIsMine) return -1;
        if (!aIsMine && bIsMine) return 1;

        if (sortBy === 'fee_asc') return a.config.entryFee - b.config.entryFee;
        return b.config.entryFee - a.config.entryFee;
      });
    setSortedRooms(processed);
  }, [filters, sortBy]);

  // Sync data without re-ordering unless necessary
  useEffect(() => {
    if (rooms.length > 0) {
      if (sortedRooms.length === 0) {
        applySortAndFilter(rooms);
      } else {
        // Just update data for existing rooms in their current order
        const updated = sortedRooms.map(sr => {
          const match = rooms.find(r => r.id === sr.id);
          return match || sr;
        }).filter(r => rooms.some(rm => rm.id === r.id));
        
        // Add new rooms that aren't in the list
        const newRooms = rooms.filter(r => !sortedRooms.some(sr => sr.id === r.id));
        if (newRooms.length > 0) {
          applySortAndFilter([...updated, ...newRooms]);
        } else {
          setSortedRooms(updated);
        }
      }
    }
  }, [rooms]);

  // Re-sort when filter or sort-by changes
  useEffect(() => {
    applySortAndFilter(rooms);
  }, [filters, sortBy]);

  const displayedRooms = useMemo(() => {
    return sortedRooms.slice(0, visibleRoomsCount);
  }, [sortedRooms, visibleRoomsCount]);

  const paginatedHistory = useMemo(() => {
    return history.slice(historyPage * 20, (historyPage + 1) * 20);
  }, [history, historyPage]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchSilently = async (url: string) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return null;
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) return null;
            return await res.json();
          } catch (e) {
            console.warn(`Silently failed to fetch ${url}:`, e);
            return null;
          }
        };

        const [roomsData, userData, statsData, historyData] = await Promise.all([
          fetchSilently('/api/rooms'),
          user?.id ? fetchSilently(`/api/me?id=${user.id}`) : Promise.resolve(null),
          (Boolean(user?.is_admin)) ? fetchSilently('/api/admin/stats') : Promise.resolve(null),
          fetchSilently('/api/history')
        ]);
        
        if (roomsData) {
          setRooms(roomsData);
          
          if (user) {
            roomsData.forEach((room: Room) => {
              if (room.status === 'finished' && !notifiedRacesRef.current.has(room.id)) {
                const myParticipation = room.players.find(p => p.id === user.id);
                if (myParticipation) {
                  const winnerPlayer = room.players.find(p => p.horseIds.includes(room.winnerHorseId!));
                  const isUserWinner = winnerPlayer && winnerPlayer.id === user.id;
                  
                  if (isUserWinner) {
                    const winnerTerm = room.theme === 'f1' ? 'Ваш гонщик выиграл' : 
                                      room.theme === 'space' ? 'Ваш корабль выиграл' : 
                                      'Ваша лошадь выиграла';
                    addToast(`${winnerTerm} в гонке ${room.name}!`, 'success');
                  } else {
                    addToast(`Гонка ${room.name} завершена. Вы проиграли.`, 'info');
                  }
                  notifiedRacesRef.current.add(room.id);
                }
              } else if (room.status === 'waiting') {
                notifiedRacesRef.current.delete(room.id);
              }
            });
          }
        }
        
        if (userData) {
        const numericUser = { ...userData, balance: Number(userData.balance) };
        setUser(numericUser);
        localStorage.setItem('vip_user', JSON.stringify(numericUser));
      }
        if (statsData) setAdminStats(statsData);
        if (historyData) setHistory(historyData);

      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); 
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка входа');
      setUser(data);
      if (authMode === 'register') {
        setShowTutorial(true);
      }
      addToast(`Добро пожаловать, ${data.username}!`, 'success');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedRoomId(null);
    setShowTutorial(false);
    addToast('Вы вышли из системы', 'info');
  };

  const handleTutorialClose = () => {
    if (user) {
      localStorage.setItem(`tutorial_seen_${user.id}`, 'true');
    }
    setShowTutorial(false);
  };

  const updateRoomConfig = async (roomId: string, config: any) => {
    if (!user?.is_admin) return;
    try {
      const res = await fetch('/api/admin/rooms/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roomId, config, userId: user.id })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка обновления');
      }
      addToast('Настройки обновлены', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const handleJoin = async (horseIds: string[]) => {
    if (!selectedRoomId || !user) return;
    
    const currentRoom = rooms.find(r => r.id === selectedRoomId);
    if (!currentRoom) return;

    const totalFee = currentRoom.config.entryFee * horseIds.length;
    if (user.balance < totalFee) {
      addToast('Недостаточно баллов', 'error');
      return;
    }

    // --- OPTIMISTIC UPDATE ---
    const oldUser = user;
    const oldRooms = rooms;

    const tempPlayer: Player = {
      id: user.id,
      name: user.username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
      horseIds: horseIds,
      isBot: false
    };

    setUser(prev => prev ? { ...prev, balance: prev.balance - totalFee } : null);
    setRooms(prev => prev.map(r => r.id === selectedRoomId ? {
      ...r,
      players: [...r.players, tempPlayer]
    } : r));

    try {
      const res = await fetch(`/api/rooms/${selectedRoomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ horseIds, userId: user.id })
      });
      if (!res.ok) {
        // Rollback
        setUser(oldUser);
        setRooms(oldRooms);
        const data = await res.json();
        addToast(data.error || 'Ошибка входа', 'error');
      } else {
         const data = await res.json();
         // Sync final balance from server to be sure
         setUser(prev => prev ? { ...prev, balance: data.balance } : null);
      }
    } catch (e) {
      console.error('Join failed', e);
      setUser(oldUser);
      setRooms(oldRooms);
      addToast('Ошибка сети', 'error');
    }
  };

  const handleBoost = async (horseId: string) => {
    if (!selectedRoomId || !user) return;
    
    const currentRoom = rooms.find(r => r.id === selectedRoomId);
    if (!currentRoom) return;

    if (user.balance < currentRoom.config.boostCost) {
      addToast('Недостаточно баллов', 'error');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Подтверждение активации',
      text: `Вы уверены, что хотите активировать буст за ${currentRoom.config.boostCost} баллов?`,
      onConfirm: async () => {
        setConfirmConfig(null);

        const oldUser = user;
        const oldRooms = rooms;

        setUser(prev => prev ? { ...prev, balance: prev.balance - currentRoom.config.boostCost } : null);
        setRooms(prev => prev.map(r => r.id === selectedRoomId ? {
          ...r,
          horses: r.horses.map(h => h.id === horseId ? { ...h, isBoosted: true } : h)
        } : r));

        try {
          const res = await fetch(`/api/rooms/${selectedRoomId}/boost`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ horseId, userId: user.id })
          });
          if (res.ok) {
            const data = await res.json();
            addToast('Буст успешно активирован!', 'success');
            setUser(prev => prev ? { ...prev, balance: data.balance } : null);
          } else {
            setUser(oldUser);
            setRooms(oldRooms);
            const data = await res.json();
            addToast(data.error || 'Ошибка буста', 'error');
          }
        } catch (e) {
          console.error('Boost failed', e);
          setUser(oldUser);
          setRooms(oldRooms);
          addToast('Ошибка сети', 'error');
        }
      },
      onCancel: () => setConfirmConfig(null)
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-600">
            СТОЛОТО VIP ГОНКИ
          </h1>
          <p className="text-neutral-500 font-medium font-mono text-sm tracking-widest uppercase">Арена Элитных Ставок</p>
        </motion.div>
        
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-neutral-900/50 rounded-2xl border border-neutral-800">
            <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500 uppercase font-bold">{user?.is_admin ? 'Администратор' : 'VIP Игрок'}</span>
              <span className="text-xs font-bold text-neutral-200">{user?.username}</span>
            </div>
          </div>

          <div className="glass-gold px-6 py-3 rounded-2xl flex items-center gap-3 shadow-lg shadow-gold-500/10">
            <Wallet className="w-5 h-5 text-gold-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-gold-500/60 uppercase font-bold tracking-wider">Ваш Баланс</span>
              <span className="text-xl font-display font-bold text-gold-100 italic">
                <AnimatedNumber value={user?.balance ?? 0} /> <span className="text-sm">B</span>
              </span>
            </div>
          </div>

          {Boolean(user?.is_admin) && (
            <button 
              onClick={() => setIsAdminView(!isAdminView)}
              className="glass p-3 rounded-xl transition-all hover:bg-neutral-800"
              title="Панель управления"
            >
              <Settings className={`w-6 h-6 transition-colors ${isAdminView ? 'text-gold-500' : 'text-neutral-400'}`} />
            </button>
          )}

          <button 
            onClick={handleLogout}
            className="glass p-3 rounded-xl transition-all hover:bg-red-500/10 hover:text-red-500 text-neutral-400"
            title="Выйти"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </motion.div>
      </header>

      {isAdminView ? (
        <AdminPanel 
          rooms={rooms} 
          history={history}
          onBack={() => setIsAdminView(false)} 
          onOpenHistory={(h) => setSelectedHistoryItem(h)}
          onCreateRoom={() => setIsCreatingRoom(true)}
          onUpdateConfig={updateRoomConfig}
          userId={user?.id || ''}
        />
      ) : selectedRoom && (selectedRoom.status === 'racing' || selectedRoom.status === 'finished') && selectedRoomId === selectedRoom.id ? (
        <RaceStage room={selectedRoom} onBack={() => setSelectedRoomId(null)} addToast={addToast} userId={user?.id} />
      ) : (
        <main>
          {/* Advanced Filtering & Controls */}
          <div className="flex flex-col gap-6 mb-12">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Range Filters */}
              <div className="glass p-4 rounded-2xl space-y-4">
                <div className="mb-1">
                  <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Диапазон входа</span>
                </div>
                 <div className="flex gap-2">
                  <input type="number" placeholder="Мин" className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl p-2 text-xs outline-none focus:border-gold-500" value={filters.minFee || ''} onChange={e => setFilters({...filters, minFee: Number(e.target.value)})} onWheel={(e) => e.currentTarget.blur()} />
                  <input type="number" placeholder="Макс" className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl p-2 text-xs outline-none focus:border-gold-500" value={filters.maxFee || ''} onChange={e => setFilters({...filters, minFee: filters.minFee, maxFee: Number(e.target.value)})} onWheel={(e) => e.currentTarget.blur()} />
                </div>
                <div className="mt-2 px-1">
                  <Slider.Root 
                    className="SliderRoot" 
                    value={[filters.minFee, filters.maxFee]} 
                    min={0} max={10000} step={100}
                    onValueChange={([min, max]) => setFilters({ ...filters, minFee: min, maxFee: max })}
                  >
                    <Slider.Track className="SliderTrack">
                      <Slider.Range className="SliderRange" />
                    </Slider.Track>
                    <Slider.Thumb className="SliderThumb" aria-label="Min entry fee" />
                    <Slider.Thumb className="SliderThumb" aria-label="Max entry fee" />
                  </Slider.Root>
                </div>
              </div>

              <div className="glass p-4 rounded-2xl space-y-4">
                <div className="mb-1">
                  <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Количество игроков</span>
                </div>
                <div className="flex gap-2">
                  <input type="number" placeholder="Мин" className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl p-2 text-xs outline-none focus:border-gold-500" value={filters.minCapacity || ''} onChange={e => setFilters({...filters, minCapacity: Number(e.target.value)})} onWheel={(e) => e.currentTarget.blur()} />
                  <input type="number" placeholder="Макс" className="w-full bg-neutral-950/50 border border-neutral-800 rounded-xl p-2 text-xs outline-none focus:border-gold-500" value={filters.maxCapacity || ''} onChange={e => setFilters({...filters, maxCapacity: Number(e.target.value)})} onWheel={(e) => e.currentTarget.blur()} />
                </div>
                <div className="mt-2 px-1">
                  <Slider.Root 
                    className="SliderRoot" 
                    value={[filters.minCapacity, filters.maxCapacity]} 
                    min={2} max={10} step={1}
                    onValueChange={([min, max]) => setFilters({ ...filters, minCapacity: min, maxCapacity: max })}
                  >
                    <Slider.Track className="SliderTrack">
                      <Slider.Range className="SliderRange" />
                    </Slider.Track>
                    <Slider.Thumb className="SliderThumb" aria-label="Min players" />
                    <Slider.Thumb className="SliderThumb" aria-label="Max players" />
                  </Slider.Root>
                </div>
              </div>

              {/* Theme/Genre selector */}
              <div className="glass p-4 rounded-2xl flex flex-col justify-center">
                <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-3 block">Тема Арены</span>
                <div className="flex gap-2">
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'horses', label: 'Кони' },
                    { id: 'f1', label: 'Ф1' },
                    { id: 'space', label: 'Космос' }
                  ].map(t => (
                    <button 
                      key={t.id}
                      onClick={() => setFilters({...filters, theme: t.id})}
                      className={`flex-1 p-2 rounded-xl border text-[10px] font-bold uppercase tracking-tight transition-all ${filters.theme === t.id ? 'bg-gold-500 text-neutral-950 border-gold-500' : 'border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sorting & Action */}
              <div className="glass p-4 rounded-2xl flex flex-col justify-center">
                <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-3 block">Сортировка</span>
                <div className="flex gap-2">
                  {[
                    { id: 'fee_asc', label: 'Дешевле', icon: <TrendingDown className="w-3 h-3" /> },
                    { id: 'fee_desc', label: 'Дороже', icon: <TrendingUp className="w-3 h-3" /> }
                  ].map(s => (
                    <button 
                      key={s.id}
                      onClick={() => setSortBy(s.id as any)}
                      className={`flex-1 p-2 rounded-xl border text-[10px] font-bold uppercase tracking-tight transition-all flex items-center justify-center gap-2 ${sortBy === s.id ? 'bg-gold-500 text-neutral-950 border-gold-500' : 'border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-center justify-end gap-4">
              <button 
                onClick={() => applySortAndFilter(rooms)}
                className="text-xs font-bold uppercase tracking-wider text-gold-500/60 hover:text-gold-500 transition-colors flex items-center gap-2 bg-neutral-900/30 px-4 py-2 rounded-full border border-neutral-800"
              >
                <Zap className="w-3 h-3" />
                Обновить Порядок
              </button>
            </div>
          </div>

          {activeParticipations.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-6 h-6 text-gold-500" />
                <h2 className="text-2xl font-display font-bold text-gold-100">Мои Активные Гонки</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-gold-500/20 to-transparent" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {activeParticipations.map((room) => (
                    <RoomCard 
                      key={room.id} 
                      room={room} 
                      userId={user?.id}
                      isMyCreation={myRoomIds.includes(room.id)}
                      onSelect={() => setSelectedRoomId(room.id)} 
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <Rocket className="w-6 h-6 text-neutral-500" />
            <h2 className="text-2xl font-display font-bold text-neutral-100">Все Арены</h2>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-neutral-800 to-transparent" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <AnimatePresence mode="popLayout">
              {displayedRooms.length > 0 ? (
                displayedRooms.map((room) => (
                  <RoomCard 
                    key={room.id} 
                    room={room} 
                    onSelect={() => setSelectedRoomId(room.id)} 
                  />
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="col-span-full py-20 flex flex-col items-center justify-center glass rounded-[3rem] border-dashed border-neutral-800 bg-neutral-900/20"
                >
                   {recommendedRooms.length > 0 ? (
                     <div className="flex flex-col items-center w-full px-4 md:px-12">
                        <div className="flex items-center gap-3 mb-8 px-6 py-2 bg-gold-500/10 border border-gold-500/20 rounded-full">
                           <Sparkles className="w-4 h-4 text-gold-500" />
                           <span className="text-xs font-bold text-gold-200 uppercase tracking-widest">Рекомендуемые Арены</span>
                        </div>
                        <p className="text-neutral-500 text-sm text-center mb-10 font-medium max-w-lg">
                          Мы не нашли арен с точным совпадением, но вот наиболее близкие по вашим параметрам:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                           {recommendedRooms.map(room => (
                             <RoomCard key={room.id} room={room} onSelect={() => setSelectedRoomId(room.id)} />
                           ))}
                        </div>
                        <button 
                          onClick={() => setFilters({ minFee: 0, maxFee: 10000, minCapacity: 2, maxCapacity: 10, theme: 'all' })}
                          className="mt-12 text-sm font-bold text-neutral-500 hover:text-gold-500 transition-colors uppercase tracking-widest"
                        >
                          Сбросить фильтры
                        </button>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center">
                        <div className="p-6 bg-neutral-900 rounded-full mb-6 text-neutral-500">
                           <Search className="w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-neutral-100 mb-2">Арены не найдены</h3>
                        <p className="text-neutral-500 max-w-sm text-center font-medium px-4">По вашему запросу ничего не нашлось. Попробуйте изменить параметры фильтрации.</p>
                     </div>
                   )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {sortedRooms.length > visibleRoomsCount && (
            <div className="flex justify-center mb-24">
              <button 
                onClick={() => setVisibleRoomsCount(prev => prev + 12)}
                className="px-12 py-4 rounded-2xl glass text-gold-500 font-bold hover:bg-neutral-900 transition-all active:scale-95 border-gold-500/20 shadow-xl uppercase tracking-widest text-sm"
              >
                Показать больше арен
              </button>
            </div>
          )}

          {/* Recent Activity Section */}
          <div className="mt-16 mb-12">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-display font-bold flex items-center gap-3 text-neutral-100">
                <ShieldCheck className="w-7 h-7 text-gold-500" />
                Последние результаты гонок
              </h2>
              <span className="text-xs uppercase font-bold tracking-widest text-neutral-500">Последние 50 событий</span>
            </div>

            <div className="glass rounded-[2rem] overflow-hidden border border-neutral-800/50">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-neutral-900/50 border-b border-neutral-800">
                      <th className="px-8 py-4 text-xs uppercase font-bold tracking-widest text-neutral-500">Арена / Взнос</th>
                      <th className="px-8 py-4 text-xs uppercase font-bold tracking-widest text-neutral-500">Чемпион</th>
                      <th className="px-8 py-4 text-xs uppercase font-bold tracking-widest text-neutral-500">Время</th>
                      <th className="px-8 py-4 text-xs uppercase font-bold tracking-widest text-neutral-500">Хэш честности</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {paginatedHistory.length > 0 ? (
                      paginatedHistory.map((h, i) => (
                        <tr 
                          key={h.id || i} 
                          onClick={() => setSelectedHistoryItem(h)}
                          className="hover:bg-neutral-900/40 transition-colors group cursor-pointer"
                        >
                          <td className="px-8 py-6">
                            <div className="font-bold text-neutral-200">{h.roomName}</div>
                            <div className="text-xs text-gold-500/60 font-mono italic">{h.entryFee} B Взнос</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">🏆</span>
                              <span className="font-display font-bold text-lg text-gold-500 group-hover:text-gold-400 transition-colors">{h.winnerName}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-sm text-neutral-400 font-medium">
                            {h.timestamp}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-1">
                              <code className="text-[10px] font-mono p-2 bg-neutral-950 rounded-lg text-neutral-500 group-hover:text-gold-500/80 transition-colors border border-neutral-900">
                                {h.fairnessHash}
                              </code>
                              {h.serverSeed && (
                                <div className="text-[9px] font-mono text-blue-500/60 pl-2">
                                  Seed: {h.serverSeed.slice(0, 12)}...
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-8 py-12 text-center text-neutral-500 font-medium italic">
                          В этом цикле не записано ни одного матча.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {history.length > 20 && (
                <div className="bg-neutral-950/50 p-6 flex items-center justify-between border-t border-neutral-800">
                  <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                    Показано {historyPage * 20 + 1}-{Math.min((historyPage + 1) * 20, history.length)} из {history.length}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                      disabled={historyPage === 0}
                      className="p-3 rounded-xl glass hover:bg-neutral-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setHistoryPage(p => p + 1)}
                      disabled={(historyPage + 1) * 20 >= history.length}
                      className="p-3 rounded-xl glass hover:bg-neutral-800 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      <AnimatePresence>
        {isCreatingRoom && (
          <CreateRoomModal 
            onClose={() => setIsCreatingRoom(false)} 
            initialValues={{
              theme: filters.theme === 'all' ? 'horses' : filters.theme,
              entryFee: filters.minFee || 1000,
              maxPlayers: filters.minCapacity || 8
            }}
            onCreated={async (newRoomId: string) => {
              setIsCreatingRoom(false);
              const res = await fetch('/api/rooms');
              if (res.ok) {
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.includes("application/json")) {
                  const data = await res.json();
                  setRooms(data);
                }
              }
            }} 
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedRoomId && selectedRoom && selectedRoom.status === 'waiting' && (
          <LobbyModal 
            room={selectedRoom} 
            balance={user?.balance ?? 0}
            userId={user?.id}
            onClose={() => setSelectedRoomId(null)} 
            onJoin={handleJoin}
            onBoost={handleBoost}
            isPlayingElsewhere={activeParticipations.length > 0 && !activeParticipations.some(p => p.id === selectedRoomId)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedHistoryItem && (
          <HistoryDetailModal 
            history={selectedHistoryItem} 
            onClose={() => setSelectedHistoryItem(null)} 
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} />
      
      {confirmConfig && confirmConfig.isOpen && (
        <ConfirmModal 
          title={confirmConfig.title}
          text={confirmConfig.text}
          onConfirm={confirmConfig.onConfirm}
          onCancel={confirmConfig.onCancel}
        />
      )}

      {/* Auth Modal */}
      <AnimatePresence>
        {isAuthModalOpen && (
          <AuthModal 
            mode={authMode} 
            setMode={setAuthMode}
            form={authForm}
            setForm={setAuthForm}
            error={authError}
            onSubmit={handleAuth}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTutorial && (
          <WelcomeTutorialModal onClose={handleTutorialClose} />
        )}
      </AnimatePresence>
    </div>
  );
}

function WelcomeTutorialModal({ onClose }: { onClose: () => void }) {
  const tutorialSteps = [
    {
      title: 'Выбор Арены',
      desc: 'От классических скачек до футуристичных гонок в космосе. Каждая арена имеет свой взнос и регламент.',
      icon: <Rocket className="w-5 h-5 text-gold-500" />
    },
    {
      title: 'Ставки на победу',
      desc: 'Выбирайте одного или нескольких гонщиков. Больше гонщиков — выше вероятность забрать банк.',
      icon: <Users className="w-5 h-5 text-blue-400" />
    },
    {
      title: 'Система Бустеров',
      desc: 'Купите бустер, чтобы увеличить силу своего гонщика в 1.5 раза. Опередите соперников на финише!',
      icon: <Zap className="w-5 h-5 text-gold-400" />
    },
    {
      title: 'Честная игра',
      desc: 'Используем Provably Fair. Весь призовой фонд за вычетом комиссии уходит победителю мгновенно.',
      icon: <ShieldCheck className="w-5 h-5 text-green-500" />
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="glass max-w-2xl w-full rounded-[3.5rem] p-10 md:p-14 border-gold-500/20 relative overflow-hidden text-center"
      >
        <div className="absolute top-0 right-0 p-32 opacity-[0.03] pointer-events-none">
          <Sparkles className="w-96 h-96 text-gold-500 rotate-12" />
        </div>

        <div className="inline-flex items-center gap-2 px-6 py-2 bg-gold-400/10 border border-gold-400/20 rounded-full mb-8">
          <Sparkles className="w-4 h-4 text-gold-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-200">LEVEL UP YOUR GAME</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 italic tracking-tighter">
          Добро пожаловать в <span className="text-gold-500">Элиту!</span>
        </h2>
        
        <p className="text-neutral-500 font-medium max-w-sm mx-auto leading-relaxed mb-12">
          Вы стали участником самой закрытой гоночной арены. Вот как здесь всё устроено:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-12">
          {tutorialSteps.map((s, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex gap-4"
            >
              <div className="w-12 h-12 shrink-0 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-inner">
                {s.icon}
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-100 mb-1 uppercase tracking-tight">{s.title}</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-6 rounded-2xl bg-gold-500 text-neutral-950 font-black text-xl hover:bg-gold-400 hover:shadow-2xl hover:shadow-gold-500/20 active:scale-95 transition-all shadow-xl uppercase tracking-widest"
        >
          Всё ясно, погнали!
        </button>
      </motion.div>
    </motion.div>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-4 pointer-events-none w-full max-w-sm px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={`p-5 rounded-2xl shadow-2xl flex items-center gap-4 border pointer-events-auto ${
              toast.type === 'error' ? 'bg-red-950/90 border-red-500/50 text-red-100' :
              toast.type === 'success' ? 'bg-green-950/90 border-green-500/50 text-green-100' :
              'bg-neutral-900/90 border-gold-500/30 text-gold-100'
            }`}
          >
            <div className={`p-2 rounded-xl ${toast.type === 'error' ? 'bg-red-500/20 text-red-500' : toast.type === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-gold-500/20 text-gold-500'}`}>
              {toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
            </div>
            <span className="font-bold text-sm">{toast.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ConfirmModal({ title, text, onConfirm, onCancel }: { title: string; text: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass max-w-md w-full p-8 rounded-[2rem] border-gold-500/20 shadow-2xl"
      >
        <h3 className="text-2xl font-display font-bold text-gold-100 mb-2">{title}</h3>
        <p className="text-neutral-400 font-medium mb-8 leading-relaxed">{text}</p>
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-1 py-4 rounded-xl bg-neutral-800 text-neutral-400 font-bold hover:bg-neutral-700 transition">
            Отмена
          </button>
          <button onClick={onConfirm} className="flex-1 py-4 rounded-xl bg-gold-500 text-neutral-950 font-bold hover:shadow-xl transition shadow-gold-500/20">
            Подтвердить
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AuthModal({ mode, setMode, form, setForm, error, onSubmit }: any) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-neutral-950/90 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="glass w-full max-w-md p-10 rounded-[3rem] border-neutral-800 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/10 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[100px] rounded-full" />

        <div className="relative space-y-8 text-center">
          <div className="space-y-3">
            <div className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-gold-500/20 rotate-12">
              <Trophy className="w-10 h-10 text-neutral-950 -rotate-12" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white tracking-tight">
              {mode === 'login' ? 'Вход в систему' : 'Регистрация'}
            </h2>
            <p className="text-neutral-400 text-sm font-medium">
              {mode === 'login' ? 'Войдите в свой VIP аккаунт' : 'Создайте новый аккаунт игрока'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest ml-4">Логин</label>
                <div className="relative group">
                  <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-gold-500 transition-colors" />
                  <input 
                    type="text" 
                    required
                    value={form.username}
                    onChange={e => setForm({...form, username: e.target.value})}
                    placeholder="Ваш никнейм"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/10 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest ml-4">Пароль</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600 group-focus-within:text-gold-500 transition-colors" />
                  <input 
                    type="password" 
                    required
                    value={form.password}
                    onChange={e => setForm({...form, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-gold-500/50 focus:ring-4 focus:ring-gold-500/10 transition-all"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              className="w-full py-4 bg-gold-500 hover:bg-gold-600 text-neutral-950 font-display font-bold text-lg rounded-2xl transition-all shadow-xl shadow-gold-500/20 active:scale-[0.98]"
            >
              {mode === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          </form>

          <div className="pt-4 border-t border-neutral-900">
            <button 
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm font-bold text-neutral-500 hover:text-gold-500 transition-colors"
            >
              {mode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const RoomCard = React.memo(({ room, onSelect, isMyCreation, userId }: any) => {
  const isRacing = room.status === 'racing';
  const isJoined = room.players.some((p: any) => p.id === userId);
  const Icon = room.theme === 'space' ? Rocket : room.theme === 'f1' ? Car : Fence;

  const statusMap: Record<string, string> = {
    'waiting': 'Ожидание',
    'racing': 'В игре',
    'finished': 'Завершено'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -5, scale: 1.02 }}
      onClick={onSelect}
      className={`glass rounded-3xl overflow-hidden relative group cursor-pointer ${isRacing ? 'ring-2 ring-gold-500/50 shadow-2xl shadow-gold-500/10' : isJoined ? 'border-gold-500/30 ring-1 ring-gold-500/20 shadow-lg shadow-gold-500/5' : isMyCreation ? 'border-dashed border-neutral-700 bg-neutral-900/40' : 'hover:border-gold-500/30'}`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {isMyCreation && !isJoined && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-neutral-800 text-neutral-500 px-3 py-1 rounded-b-xl text-[10px] font-bold uppercase tracking-widest border-x border-b border-neutral-700 z-10">
          Ваша Арена (Без пари)
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-neutral-800 rounded-2xl group-hover:bg-neutral-700 transition-colors">
            <Icon className={`w-6 h-6 ${isRacing ? 'text-gold-500 animate-pulse' : 'text-neutral-400'}`} />
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
            isRacing ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 
            room.status === 'waiting' && isJoined ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30' :
            'bg-green-500/20 text-green-500 border border-green-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRacing ? 'bg-red-500' : room.status === 'waiting' && isJoined ? 'bg-gold-500' : 'bg-green-500'} animate-pulse`} />
            {room.status === 'waiting' && isJoined ? 'Ожидание' : (statusMap[room.status] || room.status)}
          </div>
        </div>

        <h3 className="text-xl font-display font-bold mb-2 text-neutral-50">{room.name}</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-2 text-neutral-400">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{room.players.reduce((acc: number, p: any) => acc + p.horseIds.length, 0)}/{room.config.maxPlayers}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-400">
            <Timer className="w-4 h-4" />
            <span className="text-sm font-medium">
              {room.status === 'waiting' && !room.players.some((p: any) => !p.isBot) ? (
                <span className="text-gold-500/60 text-xs animate-pulse">Ожидание игроков</span>
              ) : (
                <SmoothTimerDisplay initialSeconds={room.timer} />
              )}
            </span>
          </div>
        </div>

        <div className="flex items-end justify-between pt-4 border-t border-neutral-800">
          <div>
            <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest block mb-1">Размер взноса</span>
            <span className="text-2xl font-display font-bold text-neutral-100 italic">{room.config.entryFee} <span className="text-sm font-normal text-neutral-500">B</span></span>
          </div>
          <div className="bg-gold-500 text-neutral-950 p-2 rounded-xl group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      </div>
    </motion.div>
  );
});

function LobbyModal({ room, balance, onClose, onJoin, onBoost, isPlayingElsewhere, userId }: { room: Room, balance: number, onClose: () => void, onJoin: (ids: string[]) => void, onBoost: (id: string) => void, isPlayingElsewhere: boolean, userId?: string }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  useEffect(() => {
    // If a selected horse was taken by someone else (Artem just joined), remove it from Matvey's selection
    setSelectedIds(prev => prev.filter(id => !room.players.some(p => p.horseIds.includes(id))));
  }, [room.players]);

  const isJoined = room.players.some(p => p.id === userId);
  const myPlayer = room.players.find(p => p.id === userId);

  const themeMap: Record<string, string> = {
    'horses': 'Лошади',
    'f1': 'Ф1',
    'space': 'Космос'
  };

  const toggleHorse = (id: string) => {
    if (isJoined) return;
    const isOwned = room.players.some(p => p.horseIds.includes(id));
    if (isOwned) return;
    
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id].slice(0, Math.floor(room.config.maxPlayers / 2))
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="glass w-full max-w-5xl max-h-[92vh] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl shadow-gold-500/20 border border-gold-500/10"
      >
        <div className="p-8 border-b border-neutral-800 flex justify-between items-center bg-gradient-to-r from-neutral-900 via-neutral-900 to-transparent">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-display font-bold text-gold-100">{room.name}</h2>
              <span className="px-3 py-1 bg-gold-500/10 text-gold-500 border border-gold-500/20 rounded-full text-xs font-bold uppercase tracking-wider">
                Арена: {themeMap[room.theme] || room.theme}
              </span>
            </div>
            <p className="text-neutral-500 font-medium tracking-tight">ID Турнира: <span className="font-mono text-xs">{room.id.slice(0, 8)}</span> • Подготовка раунда</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-neutral-800 rounded-2xl transition-all hover:rotate-90">
            <X className="w-6 h-6 text-neutral-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 custom-scrollbar">
          {/* Left Column: Participants */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-bold flex items-center gap-2 uppercase tracking-tight">
                <Users className="w-5 h-5 text-gold-500" />
                Сетка забега ({room.horses.length} участников)
              </h3>
              <div className="flex gap-4 text-xs font-bold uppercase tracking-widest scale-90 sm:scale-100 origin-right">
                <div className="flex items-center gap-2 text-gold-500">
                  <div className="w-2 h-2 rounded-full bg-gold-500" /> Игрок
                </div>
                <div className="flex items-center gap-2 text-neutral-500">
                  <div className="w-2 h-2 rounded-full bg-neutral-600" /> Системный бот
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.horses.map((horse) => {
                const owner = room.players.find(p => p.horseIds.includes(horse.id));
                const isSelected = selectedIds.includes(horse.id);
                const isMine = myPlayer?.horseIds.includes(horse.id);
                
                const totalWeights = room.horses.reduce((acc, h) => acc + (h.isBoosted ? 1.5 : 1.0), 0);
                const weight = horse.isBoosted ? 1.5 : 1.0;
                const winProb = ((weight / totalWeights) * 100).toFixed(1);

                return (
                  <div 
                    key={horse.id}
                    onClick={() => {
                      const isOwned = room.players.some(p => p.horseIds.includes(horse.id));
                      if (!isOwned) toggleHorse(horse.id);
                    }}
                    className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 relative overflow-hidden group/h ${
                      isMine ? 'bg-gold-500/10 border-gold-500/40 shadow-inner shadow-gold-500/5 cursor-default' :
                      isSelected ? 'bg-gold-500/5 border-gold-500/20 cursor-pointer' :
                      owner ? 'bg-neutral-800/20 border-neutral-800 opacity-70 cursor-not-allowed' :
                      'bg-neutral-900 border-neutral-800 hover:border-gold-500/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-4xl shadow-inner relative" style={{ backgroundColor: horse.color + '15' }}>
                        {horse.image}
                        {horse.isBoosted && (
                          <div className="absolute -top-1 -right-1 bg-gold-500 p-1 rounded-lg shadow-lg">
                            <Zap className="w-3 h-3 text-neutral-950 fill-current" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-neutral-100 flex items-center justify-between">
                          <span>{horse.name}</span>
                          <span className="text-xs font-mono text-gold-500/60 font-bold">{winProb}%</span>
                        </div>
                        <div className="text-xs uppercase font-bold tracking-tighter mt-1">
                          {isMine ? (
                            <span className="text-gold-500">ВАШ ГОНЩИК</span>
                          ) : owner ? (
                            <span className={owner.isBot ? 'text-neutral-500' : 'text-blue-400'}>
                              {owner.isBot ? 'Под управлением системы' : `VIP: ${owner.name}`}
                            </span>
                          ) : (
                            <span className="text-neutral-600 group-hover/h:text-gold-500/50 transition-colors italic">Доступен</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isMine && (
                      <button 
                        disabled={horse.isBoosted || balance < room.config.boostCost}
                        onClick={(e) => { e.stopPropagation(); onBoost(horse.id); }}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          horse.isBoosted 
                          ? 'bg-gold-500 text-neutral-950 shadow-lg shadow-gold-500/20' 
                          : 'bg-neutral-800 text-gold-500 hover:bg-gold-500 hover:text-neutral-950 border border-gold-500/10'
                        }`}
                      >
                        <Zap className={`w-3 h-3 ${horse.isBoosted ? 'fill-current' : ''}`} />
                        {horse.isBoosted ? 'БУСТЕР АКТИВЕН' : `КУПИТЬ БУСТ (${room.config.boostCost} B)`}
                      </button>
                    )}
                    
                    {!owner && isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="w-5 h-5 text-gold-500" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Stats & Meta */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 relative overflow-hidden">
              <ShieldCheck className="absolute -bottom-4 -right-4 w-24 h-24 text-blue-500/10 -rotate-12" />
              <h4 className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                <Zap className="w-3 h-3" />
                ЭКОНОМИЧЕСКИЙ РЕГЛАМЕНТ
              </h4>
              <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                ПЕРЕД СТАРТОМ КАЖДЫЙ УЧАСТНИК МОЖЕТ ПРИОБРЕСТИ <span className="text-blue-400 font-bold">ОДИН БУСТ</span> НА СВОЕГО ГОНЩИКА.
                <br /><br />
                <span className="text-gold-500 font-bold uppercase underline">ЭФФЕКТ БУСТА:</span> УВЕЛИЧИВАЕТ БАЗОВУЮ ВЕРОЯТНОСТЬ ПОБЕДЫ В <span className="text-gold-500 font-bold">1.5 РАЗА</span>. ЭТОТ МОДИФИКАТОР УЧИТЫВАЕТСЯ ПРИ ГЕНЕРАЦИИ РЕЗУЛЬТАТОВ.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl bg-neutral-900/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Trophy className="w-24 h-24 text-gold-500" />
              </div>

              <div className="space-y-6 relative z-10">
                <div>
                  <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest block mb-2 px-1">Призовой фонд (Победитель получает всё)</span>
                  <div className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-100 to-gold-500 italic">
                    {(room.config.entryFee * room.horses.length * room.config.rewardPercentage).toLocaleString()} <span className="text-sm">B</span>
                  </div>
                  <div className="text-xs text-neutral-600 font-bold mt-1 uppercase tracking-tighter italic">
                    {Math.round(room.config.rewardPercentage * 100)}% от пула ({Math.round(room.config.commissionRate * 100)}% комиссия)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
                  <div>
                    <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest block mb-1">Занято мест</span>
                    <span className="text-lg font-bold text-neutral-100 font-display italic">
                      {room.players.reduce((acc, p) => acc + p.horseIds.length, 0)} / {room.horses.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest block mb-1">Старт через</span>
                    <span className="text-lg font-bold text-gold-500 animate-pulse font-display italic">
                      {!room.players.some(p => !p.isBot) ? (
                        <span className="text-neutral-600 text-sm">Ожидание ставок</span>
                      ) : (
                        <SmoothTimerDisplay initialSeconds={room.timer} active={room.players.some(p => !p.isBot)} />
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-neutral-800">
                  <div className="flex justify-between items-center bg-neutral-950/50 p-3 rounded-2xl border border-neutral-800">
                    <span className="text-xs text-neutral-500 font-bold uppercase tracking-tighter">Выбрано гонщиков</span>
                    <span className="font-bold text-neutral-100">{isJoined ? myPlayer?.horseIds.length : selectedIds.length}</span>
                  </div>
                  {!isJoined && (
                    <div className="flex justify-between items-center bg-gold-500/10 p-4 rounded-2xl border border-gold-500/20">
                      <span className="text-sm font-bold text-gold-500 uppercase tracking-tighter">К оплате</span>
                      <span className="text-xl font-display font-bold text-neutral-100 italic">{selectedIds.length * room.config.entryFee} B</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!isJoined ? (
              <div className="flex flex-col gap-4">
                {isPlayingElsewhere && (
                   <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <span className="text-xs font-bold text-red-200 uppercase tracking-tighter italic">Вы уже участвуете в другом заезде</span>
                   </div>
                )}
                <button 
                  disabled={selectedIds.length === 0 || isPlayingElsewhere}
                  onClick={() => onJoin(selectedIds)}
                  className="w-full py-6 rounded-[2rem] bg-gold-400 text-white font-bold text-xl hover:bg-gold-500 hover:shadow-2xl hover:shadow-gold-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                >
                  Вступить в игру
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gold-500/5 border border-gold-500/20 rounded-[2.5rem] text-center">
                <div className="w-16 h-16 bg-gold-500/10 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-gold-500" />
                </div>
                <h4 className="text-2xl font-display font-bold text-gold-100 mb-2">Регистрация подтверждена</h4>
                <p className="text-neutral-500 text-sm leading-relaxed max-w-[200px]">
                  Ожидайте завершения отсчета. Свободные места займут системные боты.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreateRoomModal({ onClose, onCreated, initialValues }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<any>({ 
    name: '', 
    theme: initialValues?.theme || 'horses', 
    entryFee: initialValues?.entryFee || 1000, 
    maxPlayers: initialValues?.maxPlayers || 8,
    commission: 15,
    timer: 60
  });

  const winnerShare = 100 - form.commission;
  const isTimerValid = form.timer >= 30;
  const canSubmit = form.name.length > 2 && form.commission >= 0 && form.commission <= 50 && isTimerValid && !isSubmitting;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          timer: Number(form.timer),
          config: {
            entryFee: Number(form.entryFee),
            maxPlayers: Number(form.maxPlayers),
            commissionRate: form.commission / 100,
            rewardPercentage: winnerShare / 100,
            boostCost: Math.floor(form.entryFee * 0.2)
          }
        })
      });
      if (res.ok) {
        const newRoom = await res.json();
        onCreated(newRoom.id);
      } else {
        setIsSubmitting(false);
      }
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const themeLabelMap: any = {
    'horses': 'Лошади',
    'f1': 'Формула 1',
    'space': 'Космос'
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.95, y: 30 }} 
        animate={{ scale: 1, y: 0 }} 
        className="glass max-w-2xl w-full rounded-[3rem] border-gold-500/20 overflow-hidden shadow-[0_0_100px_rgba(251,189,35,0.15)] p-12"
      >
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-3xl font-display font-bold text-gold-100">Создать Арену</h3>
            <p className="text-neutral-500 text-sm font-medium">Настройте параметры нового турнира</p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-3 hover:bg-neutral-800 rounded-2xl transition-all hover:rotate-90 disabled:opacity-50">
            <X className="w-6 h-6 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Название Арены</label>
            <input 
              disabled={isSubmitting}
              placeholder="Гонка на выживание..."
              className="w-full bg-neutral-950/50 border border-neutral-800 rounded-2xl p-5 text-xl font-display font-medium focus:border-gold-500/50 outline-none transition-all disabled:opacity-50"
              value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['horses', 'f1', 'space'].map(t => (
              <button 
                key={t} type="button" 
                disabled={isSubmitting}
                onClick={() => setForm({...form, theme: t as any})}
                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 disabled:opacity-50 ${form.theme === t ? 'bg-gold-500/10 text-gold-400 border-gold-500/50' : 'bg-neutral-950/30 text-neutral-500 border-neutral-800'}`}
              >
                {t === 'horses' && <Fence className="w-4 h-4" />}
                {t === 'f1' && <Car className="w-4 h-4" />}
                {t === 'space' && <Rocket className="w-4 h-4" />}
                <span className="text-[10px] font-bold uppercase tracking-widest">{themeLabelMap[t]}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Взнос (B)</label>
              <input 
                disabled={isSubmitting}
                type="number" 
                className="w-full bg-neutral-950/50 border border-neutral-800 rounded-2xl p-4 text-xl font-display font-bold disabled:opacity-50"
                value={form.entryFee || ''} onChange={e => setForm({...form, entryFee: e.target.value === '' ? '' : Number(e.target.value)})}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Таймер (сек)</label>
              <div className="relative">
                <input 
                  disabled={isSubmitting}
                  type="number" 
                  className={`w-full bg-neutral-950/50 border rounded-2xl p-4 text-xl font-display font-bold transition-all disabled:opacity-50 ${!isTimerValid ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-800 focus:border-gold-500/50'}`}
                  value={form.timer || ''} onChange={e => setForm({...form, timer: e.target.value === '' ? '' : Number(e.target.value)})}
                  onWheel={(e) => e.currentTarget.blur()}
                />
                {!isTimerValid && form.timer !== '' && (
                  <div className="absolute -bottom-6 left-0 flex items-center gap-1 text-[10px] text-red-500 font-bold uppercase tracking-tighter">
                    <AlertTriangle className="w-2.5 h-2.5" /> Мин. 30 секунд
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Количество мест</label>
            <select 
              disabled={isSubmitting}
              className="w-full h-[60px] bg-neutral-950/50 border border-neutral-800 rounded-2xl p-4 text-xl font-display font-bold disabled:opacity-50"
              value={form.maxPlayers} onChange={e => setForm({...form, maxPlayers: Number(e.target.value)})}
            >
              {Array.from({length: 9}, (_, i) => i + 2).map(n => <option key={n} value={n}>{n} мест</option>)}
            </select>
          </div>

          <button 
            disabled={!canSubmit}
            type="submit"
            className={`w-full py-6 rounded-2xl font-bold text-xl transition-all ${canSubmit ? 'bg-gold-500 text-neutral-950 shadow-lg cursor-pointer' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'} ${isSubmitting ? 'animate-pulse' : ''}`}
          >
            {isSubmitting ? 'Создание Арены...' : 'Создать Арену'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function RaceStage({ room, onBack, addToast, userId }: { room: Room, onBack: () => void, addToast: any, userId?: string }) {
  const [currentTick, setCurrentTick] = useState(0);
  const totalTicks = room.raceLog[0]?.positions.length ?? 0;
  const toastSent = useRef(false);

  useEffect(() => {
    if (currentTick < totalTicks - 1) {
      const interval = setInterval(() => {
        setCurrentTick(curr => Math.min(curr + 1, totalTicks - 1));
      }, 100); 
      return () => clearInterval(interval);
    }
  }, [currentTick, totalTicks]);

  const sortedHorses = useMemo(() => {
    const isEnd = currentTick >= totalTicks - 1;
    return [...room.horses].sort((a, b) => {
      const logA = room.raceLog.find(l => l.horseId === a.id);
      const logB = room.raceLog.find(l => l.horseId === b.id);
      const posA = logA?.positions[currentTick] ?? 0;
      const posB = logB?.positions[currentTick] ?? 0;
      
      if (isEnd && posA >= 90 && posB >= 90) {
        const tickA = logA?.positions.findIndex(p => p >= 90) ?? 999;
        const tickB = logB?.positions.findIndex(p => p >= 90) ?? 999;
        if (tickA !== tickB) return tickA - tickB;
      }
      if (Math.abs(posA - posB) > 0.001) return posB - posA;
      const sumA = logA?.positions.slice(0, currentTick + 1).reduce((acc, v) => acc + v, 0) ?? 0;
      const sumB = logB?.positions.slice(0, currentTick + 1).reduce((acc, v) => acc + v, 0) ?? 0;
      return sumB - sumA;
    });
  }, [room, currentTick, totalTicks]);

  const isFinished = currentTick === totalTicks - 1;
  const winner = room.horses.find(h => h.id === room.winnerHorseId);

  useEffect(() => {
    if (isFinished && !toastSent.current) {
      toastSent.current = true;
      const winnerPlayer = room.players.find(p => p.horseIds.includes(room.winnerHorseId!));
      const myParticipation = room.players.find(p => p.id === userId);
      
      if (myParticipation) {
        const isUserWinner = winnerPlayer && winnerPlayer.id === userId;
        if (isUserWinner) addToast('Победа!', 'success');
        else addToast('Вы проиграли!', 'error');
      }
    }
  }, [isFinished, room.winnerHorseId, room.players, addToast, userId]);

  // Countdown for returning to lobby
  const returnCountdown = useMemo(() => {
    if (!room.finishedAt) return 1;
    const elapsed = Math.floor((Date.now() - room.finishedAt) / 1000);
    return Math.max(0, 1 - elapsed);
  }, [room.finishedAt, Date.now()]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`fixed inset-0 z-[100] overflow-hidden flex flex-col theme-${room.theme}`}>
      {/* Background Decorators */}
      {room.theme === 'horses' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Minimalist Meadow */}
          <div className="minimal-grass" />
          {Array.from({ length: 18 }).map((_, i) => (
            <div 
              key={`tree-wrapper-${i}`}
              className="absolute"
              style={{
                bottom: '15%',
                left: '0',
                animation: `meadow-drift ${5 + (i % 6) * 1.5}s linear infinite`,
                animationDelay: `-${i * 1.3}s`,
                zIndex: 5
              }}
            >
              <div 
                className="meadow-tree" 
                style={{ 
                  transform: `scale(${0.9 + (i % 4) * 0.3})`,
                }} 
              />
            </div>
          ))}
        </div>
      )}

      {room.theme === 'f1' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Moon */}
          <div className="minimal-moon" />

          {/* Background Night City (Far - Parallax) */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-around h-1/2 opacity-40">
            {Array.from({ length: 15 }).map((_, i) => (
              <div 
                key={`bldg-far-${i}`} 
                className="minimal-building relative shrink-0" 
                style={{ 
                  width: `${30 + (i % 4) * 10}px`,
                  height: `${10 + (i % 6) * 5}%`,
                  animation: `city-drift ${15 + (i % 5) * 3}s linear infinite`,
                  animationDelay: `-${i * 2}s`,
                  filter: 'blur(1px)'
                }}
              />
            ))}
          </div>

          {/* Foreground Night City (Near) */}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-around h-2/3">
            {Array.from({ length: 18 }).map((_, i) => (
              <div 
                key={`bldg-${i}`} 
                className="minimal-building relative shrink-0" 
                style={{ 
                  width: `${45 + (i % 5) * 20}px`,
                  height: `${20 + (i % 8) * 7}%`,
                  animation: `city-drift ${8 + (i % 4) * 1.5}s linear infinite`,
                  animationDelay: `-${i * 1.5}s`,
                  zIndex: 5
                }}
              >
                {/* Random Windows */}
                {Array.from({ length: 3 }).map((_, j) => (
                  <div 
                    key={`win-${j}`} 
                    className="minimal-window absolute w-1 h-1 rounded-sm" 
                    style={{ 
                      top: `${25 + j * 20}%`, 
                      left: '50%',
                      transform: 'translateX(-50%)',
                      '--duration': `${2 + (i + j) % 3}s`
                    } as any} 
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {room.theme === 'space' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Minimalist Space - Stars only */}
          {Array.from({ length: 80 }).map((_, i) => (
            <div 
              key={`star-${i}`} 
              className="minimal-star absolute" 
              style={{ 
                top: `${(i * 17) % 100}%`, 
                left: `${(i * 13) % 100}%`, 
                width: i % 7 === 0 ? '4px' : '2px', 
                height: i % 7 === 0 ? '4px' : '2px',
                '--duration': `${2 + (i % 5)}s`
              } as any} 
            />
          ))}
        </div>
      )}

      <div className="p-6 md:p-8 flex justify-between items-center border-b border-white/10 bg-black/40 backdrop-blur-md z-10">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
             <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl md:text-3xl font-display font-bold text-gold-400 uppercase tracking-tighter drop-shadow-[0_0_10px_rgba(251,189,35,0.3)]">
              {room.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2 h-2 rounded-full ${isFinished ? 'bg-gold-500' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                {isFinished ? 'Финиш' : 'Трансляция'}
              </span>
            </div>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-xl font-bold uppercase tracking-widest text-xs md:text-sm ${isFinished ? 'bg-gold-500 text-neutral-950 shadow-[0_0_20px_rgba(251,189,35,0.4)]' : 'bg-red-500 text-neutral-100 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]'}`}>
          {isFinished ? 'Раунд окончен' : 'Гонка идет'}
        </div>
      </div>

      <div className="flex-1 relative flex flex-col p-4 md:p-12 transition-all justify-center gap-2 overflow-hidden z-20">
        <div className={`flex flex-col gap-2 md:gap-3 relative max-w-6xl mx-auto w-full ${room.horses.length > 6 ? 'py-4' : 'py-20'}`}>
          {room.horses.map((horse) => {
            const progress = room.raceLog.find(l => l.horseId === horse.id)?.positions[currentTick] ?? 0;
            const isWinner = isFinished && horse.id === room.winnerHorseId;
            const isMe = room.players.find(p => p.id === userId)?.horseIds.includes(horse.id);
            const racersCount = room.horses.length;
            
            // Adjusted smaller scale for racers
            const trackHeight = racersCount > 8 ? 'h-8 md:h-10' : racersCount > 6 ? 'h-10 md:h-12' : 'h-12 md:h-14';
            const iconSize = racersCount > 8 ? 'w-6 h-6 md:w-8 md:h-8 text-lg' : racersCount > 6 ? 'w-8 h-8 md:w-10 md:h-10 text-xl' : 'w-10 h-10 md:w-12 md:h-12 text-2xl';
            
            return (
              <div key={horse.id} className={`relative ${trackHeight} bg-black/30 rounded-full border border-white/10 backdrop-blur-sm group transition-all duration-300`}>
                <div className="absolute right-[15%] inset-y-0 w-[2px] bg-white/10 border-r border-dashed border-white/10" />
                
                <motion.div 
                   animate={{ left: `${Math.min(progress, 82)}%` }}
                   transition={{ type: 'linear', duration: 0.1 }}
                   className="absolute inset-y-0 flex items-center gap-2 md:gap-4 px-2"
                >
                  <div 
                    className={`${iconSize} rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg relative transition-all duration-300
                      ${room.theme === 'f1' ? (isMe ? 'neon-glow' : 'neon-glow-blue') : ''}
                      ${room.theme === 'horses' ? 'shadow-black/40' : ''}
                      ${isWinner ? 'scale-110 ring-2 md:ring-4 ring-gold-500 shadow-[0_0_30px_rgba(251,189,35,0.6)]' : ''}`} 
                    style={{ backgroundColor: horse.color }}
                  >
                    {horse.image}
                    {(horse.isBoosted || room.theme === 'space') && (
                      <div className="trail-particle" style={{ opacity: horse.isBoosted ? 1 : 0.4 }} />
                    )}
                    {horse.isBoosted && (
                      <div className="absolute -top-2 -right-2 bg-gold-400 p-0.5 rounded-lg border border-neutral-900 animate-bounce">
                        <Zap className={`${racersCount > 8 ? 'w-2 h-2' : 'w-3 h-3'} text-neutral-900 fill-current`} />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div className={`
                      text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap
                      px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-sm border border-white/5
                      ${isWinner ? 'text-gold-500 border-gold-500/30' : isMe ? 'text-white' : 'text-white/60'}
                    `}>
                      {horse.name}
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {isFinished && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl z-40"
            >
              <div className="glass max-w-md w-full p-10 rounded-[3rem] text-center border-gold-500/30 shadow-[0_0_100px_rgba(251,189,35,0.2)]">
                <div className="w-24 h-24 bg-gold-500 rounded-[2rem] mx-auto flex items-center justify-center text-5xl mb-6 shadow-2xl shadow-gold-500/30 animate-bounce">
                  {winner?.image}
                </div>
                
                <div className="mb-4">
                  <span className="px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] border-2 bg-gold-500 text-neutral-950 border-gold-400 shadow-lg">
                    🏆 ЧЕМПИОН 🏆
                  </span>
                </div>
                <h4 className="text-3xl font-display font-bold text-gold-500 mb-8 uppercase tracking-widest drop-shadow-[0_0_10px_rgba(251,189,35,0.4)]">
                  {winner?.name}
                </h4>
                
                <div className="p-6 bg-neutral-900/60 rounded-[2rem] mb-8 border border-white/5">
                  <div className="text-[10px] text-neutral-500 mb-2 font-bold tracking-widest uppercase">Приз победителя</div>
                  <div className="text-4xl font-display font-bold text-neutral-100 italic">
                    {(room.config.entryFee * room.horses.length * room.config.rewardPercentage).toLocaleString()} <span className="text-xl">B</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest">
                    Возврат в лобби через {returnCountdown}с
                  </p>
                  <button 
                    onClick={onBack}
                    className="w-full py-5 bg-white text-black font-bold rounded-2xl hover:bg-gold-500 transition-all uppercase tracking-widest text-sm shadow-xl active:scale-95"
                  >
                    Вернуться сейчас
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="h-28 bg-black/60 border-t border-white/10 p-6 flex gap-6 items-center overflow-x-auto custom-scrollbar backdrop-blur-xl z-10">
        <div className="whitespace-nowrap font-display font-bold text-gold-500 uppercase italic tracking-tighter mr-4 text-xl">Таблица лидеров:</div>
        {sortedHorses.map((h, i) => (
          <div key={h.id} className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl shrink-0 group transition-all hover:bg-white/10 hover:border-gold-500/30">
            <span className="text-xs font-mono text-white/20 font-bold">#{i+1}</span>
            <span className="text-2xl group-hover:scale-125 transition-transform duration-300">{h.image}</span>
            <span className="text-sm font-bold text-white/90 uppercase tracking-tight">{h.name}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}



function AdminPanel({ rooms, history, onBack, onOpenHistory, onCreateRoom, onUpdateConfig, userId }: { rooms: Room[], history: GameHistory[], onBack: () => void, onOpenHistory: (h: GameHistory) => void, onCreateRoom: () => void, onUpdateConfig: (id: string, config: any) => void, userId: string }) {
  const [activeTab, setActiveTab] = useState<'config' | 'log'>('config');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(rooms[0]?.id ? [rooms[0].id] : []);
  const [editingConfig, setEditingConfig] = useState<any>(null);

  useEffect(() => {
    if (selectedRoomIds.length === 1) {
      const room = rooms.find(r => r.id === selectedRoomIds[0]);
      if (room) {
        setEditingConfig({
          ...room.config,
          timer: room.baseTimer || room.timer || 60,
          commission: Math.round(room.config.commissionRate * 100)
        });
      }
    }
  }, [selectedRoomIds]);

  const winnerShare = editingConfig ? 100 - editingConfig.commission : 0;

  const appealScore = useMemo(() => {
    if (!editingConfig) return 0;
    
    // Updated Attractiveness Formula (Appeal Score)
    // Primary driver: Commission (K2)
    // Secondary drivers: Capacity (K1) and Booster Ratio (K3)
    
    // K1 - Capacity (Now has minor impact: 0.95 to 1.05)
    const maxPlayers = editingConfig.maxPlayers;
    let k1 = 0.95; 
    if (maxPlayers === 4 || maxPlayers === 5) k1 = 1.05; // Sweet spot for quick starts
    else if (maxPlayers >= 6 && maxPlayers <= 10) k1 = 1.0;

    // K2 - Commission (Strong impact, sharp drop after 20% and 30%)
    const comm = editingConfig.commission;
    let k2 = 0;
    if (comm <= 20) {
      // Grows sharply when <= 20%
      k2 = 1.1 - (comm / 20) * 0.2; // 1.1 (at 0%) -> 0.9 (at 20%)
    } else if (comm <= 30) {
      // Sharp drop between 20% and 30%
      k2 = 0.9 - ((comm - 20) / 10) * 0.65; // 0.9 -> 0.25 (Very fast drop)
    } else {
      // Critical zone
      k2 = 0.25 - Math.min(0.2, ((comm - 30) / 20) * 0.2); // 0.25 -> 0.05
    }

    // K3 - Booster Price Ratio (Insignificant impact, smooth curves)
    const ratio = editingConfig.entryFee > 0 ? (editingConfig.boostCost / editingConfig.entryFee) : 0;
    let k3 = 1.0;
    if (ratio <= 0.3) {
      // Low price increases appeal slightly
      k3 = 1.05 - (ratio / 0.3) * 0.05; // 1.05 -> 1.0
    } else if (ratio <= 0.5) {
      // Normal range
      k3 = 1.0 - ((ratio - 0.3) / 0.2) * 0.15; // 1.0 -> 0.85
    } else {
      // High price decreases appeal slightly
      k3 = 0.85 - Math.min(0.1, ((ratio - 0.5) / 0.5) * 0.1); // 0.85 -> 0.75
    }

    // Final result Calculation
    const finalScore = k1 * k2 * k3 * 100;
    
    return Math.min(100, Math.max(0, finalScore));
  }, [editingConfig]);

  const profitScore = useMemo(() => {
    if (!editingConfig) return 0;
    // Profit is a function of both commission rate and the attractiveness (appeal)
    // High commission with low appeal leads to low profit, and vice versa.
    // Normalized so that 100 attractiveness * 20% commission = 100 profit score
    const score = (appealScore * editingConfig.commission) / 20;
    return Math.min(100, Math.max(0, score));
  }, [editingConfig, appealScore]);

  const warnings = useMemo(() => {
    if (!editingConfig) return [];
    const list = [];
    const commission = editingConfig.commission;

    if (commission < 0) {
      list.push({ type: 'error', text: 'Комиссия не может быть отрицательной' });
    } else if (commission === 0) {
      list.push({ type: 'warning', text: 'Нулевая комиссия: идеальный RTP, но нулевая прибыль' });
    } else if (commission < 10) {
      list.push({ type: 'info', text: 'Низкая выгода организатора, очень высокая привлекательность' });
    } else if (commission >= 10 && commission <= 12) {
      list.push({ type: 'success', text: 'Оптимальная выгода и привлекательность' });
    } else if (commission > 20) {
      list.push({ type: 'info', text: 'Высокая комиссия может отпугнуть игроков' });
    } else {
      list.push({ type: 'success', text: 'Сбалансированная конфигурация' });
    }

    const boostRatio = editingConfig.boostCost / (editingConfig.entryFee || 1);
    if (boostRatio > 1.0) list.push({ type: 'error', text: 'Цена буста превышает взнос! Игроки не купят это.' });
    else if (boostRatio > 0.5) list.push({ type: 'warning', text: 'Дорогой буст (>50% взноса) снижает баланс' });
    else if (boostRatio < 0.5 && editingConfig.boostCost > 0) list.push({ type: 'info', text: 'Дешевый буст повышает привлекательность' });
    
    if (editingConfig.entryFee > 5000) list.push({ type: 'info', text: 'Высокий взнос может ограничить приток игроков' });
    if (editingConfig.boostCost < 0) list.push({ type: 'error', text: 'Цена буста не может быть отрицательной' });
    
    const profitFactor = (editingConfig.maxPlayers * commission) / 100; // Wait, commission is taken, winner gets share
    const winnerProfitFactor = (editingConfig.maxPlayers * (100 - commission)) / 100;
    if (winnerProfitFactor <= 1) {
      list.push({ type: 'error', text: 'Бессмысленная гонка: победитель не получает прибыли! Уменьшите комиссию или добавьте игроков.' });
    } else if (winnerProfitFactor <= 1.2) {
      list.push({ type: 'warning', text: 'Очень низкий выигрыш: игроки могут игнорировать эту арену' });
    }
    
    return list;
  }, [editingConfig]);

  const handleUpdate = async () => {
    if (selectedRoomIds.length === 0 || warnings.some(w => w.type === 'error')) return;
    try {
      await onUpdateConfig(selectedRoomIds[0], {
        ...editingConfig,
        commissionRate: editingConfig.commission / 100,
        rewardPercentage: winnerShare / 100
      });
    } catch (e) {
      console.error('Update failed', e);
    }
  };

  const selectRoom = (id: string) => {
    setSelectedRoomIds([id]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-20">
       <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="text-4xl font-display font-bold text-neutral-100 flex items-center gap-4">
              <Settings className="w-10 h-10 text-gold-500" />
              Панель Администратора
            </h2>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('config')}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-gold-500 text-neutral-950' : 'bg-neutral-900 text-neutral-500 hover:text-neutral-300'}`}
              >
                Конфигуратор
              </button>
              <button 
                onClick={() => setActiveTab('log')}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'log' ? 'bg-gold-500 text-neutral-950' : 'bg-neutral-900 text-neutral-500 hover:text-neutral-300'}`}
              >
                Журнал Раундов
              </button>
            </div>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onCreateRoom}
              className="glass px-8 py-5 rounded-2xl border border-gold-500/30 text-gold-500 hover:text-white hover:bg-gold-500/10 transition-all font-bold flex items-center gap-2 shadow-xl shadow-gold-500/5 uppercase tracking-widest text-sm"
            >
              <Plus className="w-5 h-5" />
              Создать Арену
            </button>
            <button onClick={onBack} className="glass px-10 py-5 rounded-2xl text-gold-500 hover:text-white hover:bg-neutral-800 transition-all font-bold border-gold-500/20">
              Вернуться
            </button>
          </div>
      </div>

      {activeTab === 'config' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Room List */}
          <div className="lg:col-span-4 glass rounded-[3rem] p-8 h-[800px] overflow-hidden flex flex-col border-neutral-800/50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-display font-bold text-gold-100 uppercase tracking-tighter">Список Арен</h3>
            </div>
            <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => selectRoom(room.id)}
                  className={`w-full p-6 rounded-[2rem] flex items-center justify-between transition-all group border ${
                    selectedRoomIds.includes(room.id) 
                    ? 'bg-gold-500 text-neutral-950 font-bold border-gold-400' 
                    : 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 text-neutral-400'
                  }`}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-base font-display">{room.name}</span>
                    <span className={`text-xs uppercase font-bold tracking-tighter ${selectedRoomIds.includes(room.id) ? 'text-neutral-800' : 'text-neutral-600'}`}>
                      {room.config.entryFee} B • {room.horses.length} мест • {room.baseTimer || 60}с
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Global Config Panel */}
          <div className="lg:col-span-8 space-y-8">
            {editingConfig && (
              <div className="glass rounded-[3.5rem] p-12 border border-neutral-800/50">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-16">
                  {/* Inputs */}
                  <div className="space-y-10">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-2xl font-display font-bold text-neutral-100">Параметры Экономики</h3>
                      <div className="px-4 py-1.5 rounded-full bg-gold-500/10 text-gold-500 text-xs font-bold uppercase tracking-widest border border-gold-500/20">
                        Выбрано: {selectedRoomIds.length}
                      </div>
                    </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Взнос (B)</label>
                      <input 
                        type="number" 
                        value={editingConfig.entryFee}
                        onChange={e => setEditingConfig({ ...editingConfig, entryFee: Number(e.target.value) })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-neutral-950/80 border border-neutral-800 rounded-3xl p-6 text-2xl font-display font-bold text-gold-100 outline-none"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Таймер (сек)</label>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={editingConfig.timer}
                          onChange={e => setEditingConfig({ ...editingConfig, timer: Number(e.target.value) })}
                          onWheel={(e) => e.currentTarget.blur()}
                          className={`w-full bg-neutral-950/80 border rounded-3xl p-6 text-2xl font-display font-bold outline-none transition-all ${editingConfig.timer < 30 ? 'border-red-500/50 text-red-400' : 'border-neutral-800 text-gold-100 focus:border-gold-500/50'}`}
                        />
                        {editingConfig.timer < 30 && (
                          <div className="absolute -bottom-6 left-0 text-[10px] text-red-500 font-bold uppercase tracking-tighter">
                            Мин. 30 сек
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Кол-во мест</label>
                      <select 
                        value={editingConfig.maxPlayers}
                        onChange={e => setEditingConfig({ ...editingConfig, maxPlayers: Number(e.target.value) })}
                        className="w-full h-[76px] bg-neutral-950/80 border border-neutral-800 rounded-3xl p-6 text-2xl font-display font-bold text-gold-100 outline-none appearance-none"
                      >
                        {/* Allowing all integers 2-10 */}
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} мест</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Цена бустера (B)</label>
                      <input 
                        type="number" 
                        value={editingConfig.boostCost === '' ? '' : editingConfig.boostCost}
                        onChange={e => setEditingConfig({ ...editingConfig, boostCost: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="w-full bg-neutral-950/80 border border-neutral-800 rounded-3xl p-6 text-2xl font-display font-bold text-blue-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <label className="text-xs text-neutral-500 uppercase font-bold tracking-widest block px-1">Комиссия организатора (%)</label>
                    <div className="glass p-8 rounded-[2.5rem] border-gold-500/10">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="px-2 flex justify-between text-[10px] font-bold text-neutral-600 mb-2">
                            <span>0%</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">Комиссия</span>
                            <span>50%</span>
                          </div>
                          <input 
                            type="range" min="0" max="50" step="1"
                            className="w-full accent-gold-500 h-1.5 bg-neutral-800 rounded-full appearance-none cursor-pointer"
                            value={editingConfig.commission} onChange={e => setEditingConfig({...editingConfig, commission: Math.min(50, Number(e.target.value))})}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" 
                            value={editingConfig.commission} 
                            onChange={e => setEditingConfig({...editingConfig, commission: e.target.value === '' ? 0 : Math.min(50, Math.max(0, Number(e.target.value)))})}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="bg-transparent text-5xl font-display font-bold outline-none text-gold-500 w-24 text-center"
                          />
                          <span className="text-2xl font-display font-bold text-gold-500/50">%</span>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-500 font-bold uppercase tracking-widest">Целевая маржа: {editingConfig.commission}% от призового фонда</div>
                    </div>
                  </div>

                  <button 
                    onClick={handleUpdate}
                    disabled={warnings.some(w => w.type === 'error')}
                    className="w-full py-7 rounded-3xl bg-gold-500 text-neutral-950 font-bold text-xl hover:shadow-[0_0_50px_rgba(251,189,35,0.2)] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                  >
                    Сохранить настройки
                  </button>
                </div>

                {/* Analytics */}
                <div className="space-y-12">
                   <div className="bg-neutral-950/40 rounded-[3rem] p-10 border border-neutral-800/50">
                      <h4 className="text-xs text-neutral-500 uppercase font-bold tracking-widest mb-10 text-center">Аналитика конфигурации</h4>
                      
                      <div className="space-y-12">
                        {/* Appeal */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-48 h-28 mb-4">
                            <svg className="w-full h-full" viewBox="0 0 100 60">
                              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#262626" strokeWidth="8" strokeLinecap="round" />
                              <motion.path 
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: appealScore / 100 }}
                                transition={{ duration: 1 }}
                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                fill="none" stroke="#fbbd23" strokeWidth="8" strokeLinecap="round"
                                strokeDasharray="125"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                              <span className="text-4xl font-display font-bold text-neutral-50">{Math.round(appealScore)}%</span>
                            </div>
                          </div>
                          <span className="text-xs font-bold text-gold-500/80 uppercase tracking-widest">Привлекательность</span>
                        </div>

                        {/* Profit */}
                        <div className="space-y-4">
                           <div className="flex justify-between items-center mb-1">
                             <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Выгода организатора</span>
                             <span className="text-sm font-mono text-gold-500 font-bold">{Math.round(profitScore)}%</span>
                           </div>
                           <div className="h-3 bg-neutral-900 rounded-full overflow-hidden p-0.5">
                             <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${profitScore}%` }}
                              className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
                             />
                           </div>
                        </div>
                      </div>
                   </div>

                   {/* Warning Feed */}
                   <div className="space-y-4">
                     <AnimatePresence mode="popLayout">
                      {warnings.map((w) => (
                        <motion.div 
                          key={w.text}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-6 rounded-3xl border flex items-start gap-4 text-sm font-bold ${
                            w.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 
                            w.type === 'warning' ? 'bg-gold-500/10 border-gold-500/30 text-gold-500' :
                            w.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
                            'bg-blue-500/10 border-blue-500/30 text-blue-200'
                          }`}
                        >
                          {w.type === 'error' ? <ShieldCheck className="w-5 h-5 shrink-0" /> : <Info className="w-5 h-5 shrink-0" />}
                          <span className="leading-tight">{w.text}</span>
                        </motion.div>
                      ))}
                     </AnimatePresence>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    ) : (
        <div className="glass rounded-[3rem] p-8 border-neutral-800/50 min-h-[600px]">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-display font-bold text-neutral-100 flex items-center gap-3">
              <History className="w-6 h-6 text-gold-500" />
              Журнал раундов
            </h3>
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
              Всего: {history.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-900/50 border-b border-neutral-800">
                  <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Раунд / Арена</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Участники</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Пул / Доход</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500">Победитель</th>
                  <th className="px-6 py-4 text-[10px] uppercase font-bold tracking-widest text-neutral-500 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {history.length > 0 ? (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-neutral-900/40 transition-colors group">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center font-mono text-[10px] font-bold text-gold-500 border border-neutral-800">
                            #{h.id.slice(0, 4)}
                          </div>
                          <div>
                            <div className="font-bold text-neutral-200">{h.roomName}</div>
                            <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{new Date(h.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                           {h.participants?.map((p) => (
                             <div key={p.id} className={`w-2 h-2 rounded-full ${p.isBot ? 'bg-blue-500/40' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]'}`} title={p.name} />
                           ))}
                           <span className="text-[10px] font-bold text-neutral-500 ml-2 uppercase tracking-tight">
                             {h.participants?.length || 0} чел.
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-6 font-mono text-sm">
                        <div className="text-neutral-300 font-bold">{h.financials?.totalPool.toLocaleString()} B</div>
                        <div className="text-gold-500/80 text-[10px] font-bold">+{h.financials?.totalOrganizerTake.toLocaleString()} pts</div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🏆</span>
                          <span className="text-xs font-bold text-neutral-300">{h.winnerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <button 
                          onClick={() => onOpenHistory(h)}
                          className="px-4 py-2 bg-neutral-800 hover:bg-gold-500 hover:text-neutral-950 text-gold-500 rounded-lg text-xs font-bold transition-all uppercase tracking-widest border border-gold-500/20"
                        >
                          Детали
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-neutral-500 italic font-medium">
                      Журнал пуст. Завершите первый раунд для сбора данных.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
}
