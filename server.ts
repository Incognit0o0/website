import express from 'express';
// import { createServer as createViteServer } from 'vite'; // Moved to dynamic import
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Room, GameStatus, Horse, Player, RoomConfig, RoomTheme } from './src/types';

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import mysql from 'mysql2/promise';

// Connection string from environment variable
const connectionString = process.env.DATABASE_URL;
let pool: any = null;

try {
  if (connectionString && (connectionString.startsWith('mysql://') || !connectionString.includes('://'))) {
    console.log('Using MySQL connection from DATABASE_URL');
    pool = mysql.createPool(connectionString);
  } else if (process.env.MYSQL_HOST) {
    console.log('Using MySQL environment variables');
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      ssl: process.env.MYSQL_SSL === 'true' || process.env.MYSQL_HOST.includes('clouddb.oraclecloud.com') ? { rejectUnauthorized: false } : undefined
    });
  } else {
    console.warn('No MySQL configuration found. Will use in-memory fallback.');
  }
} catch (err) {
  console.error('Failed to create MySQL pool:', err);
}

const PORT = 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // Room ID to a set of WebSocket clients
  const roomSubscriptions = new Map<string, Set<WebSocket>>();

  const broadcastToRoom = (roomId: string, data: any) => {
    const clients = roomSubscriptions.get(roomId);
    if (clients) {
      const message = JSON.stringify({ type: 'ROOM_UPDATE', roomId, data });
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  };

  const broadcastUserUpdate = (data: any) => {
    // For simplicity, broadcast to all for balance updates (or we could track users)
    const message = JSON.stringify({ type: 'USER_UPDATE', data });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  const broadcastToAll = (type: string, data: any) => {
    const message = JSON.stringify({ type, data });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  const getUserById = async (id: string): Promise<any> => {
    if (!pool) return { id: 'fallback', username: 'Guest', balance: 10000, is_admin: false };
    try {
      const [rows]: any = await pool.query('SELECT id, username, balance, is_admin FROM users WHERE id = ?', [id]);
      if (rows[0]) {
        rows[0].balance = Number(rows[0].balance);
        return rows[0];
      }
      return null;
    } catch (e) {
      console.error('getUserById error:', e);
      return null;
    }
  };

  const updateUserBalance = async (id: string, amount: number) => {
    if (!pool) return;
    try {
      await pool.query('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, id]);
    } catch (e) {
      console.error('updateUserBalance error:', e);
    }
  };

  wss.on('connection', (ws) => {
    let currentRoomId: string | null = null;

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.type === 'SUBSCRIBE_ROOM') {
          const { roomId } = payload;
          if (currentRoomId) {
            roomSubscriptions.get(currentRoomId)?.delete(ws);
          }
          currentRoomId = roomId;
          if (!roomSubscriptions.has(roomId)) {
            roomSubscriptions.set(roomId, new Set());
          }
          roomSubscriptions.get(roomId)!.add(ws);
          
          // Send initial state
          const room = rooms.find(r => r.id === roomId);
          if (room) {
            ws.send(JSON.stringify({ type: 'ROOM_UPDATE', roomId, data: room }));
          }
        }
      } catch (e) {
        console.error('WS Message error', e);
      }
    });

    ws.on('close', () => {
      if (currentRoomId) {
        roomSubscriptions.get(currentRoomId)?.delete(ws);
      }
    });
  });

  const apiRouter = express.Router();

  // --- PERSISTENCE HELPERS ---
  const getRooms = async (): Promise<Room[]> => {
    if (!pool) return [];
    try {
      console.log('Querying rooms from MySQL...');
      const [rows]: any = await pool.query('SELECT data FROM rooms ORDER BY created_at ASC');
      console.log(`Query successful, found ${rows.length} rows.`);
      return rows.map((r: any) => {
        try {
          return typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        } catch (e) {
          console.error('Failed to parse room data from JSON:', e);
          return null;
        }
      }).filter((r: any) => r !== null);
    } catch (e) {
      console.error('MySQL getRooms query failed:', e);
      return [];
    }
  };

  const updateRoom = async (room: Room) => {
    if (!pool) return;
    try {
      await pool.query(
        'INSERT INTO rooms (id, name, theme, status, entry_fee, data) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), theme = VALUES(theme), status = VALUES(status), entry_fee = VALUES(entry_fee), data = VALUES(data)',
        [room.id, room.name, room.theme, room.status, room.config.entryFee, JSON.stringify(room)]
      );
    } catch (e: any) {
      console.error('MySQL updateRoom error:', e.message);
    }
  };

  const getHistory = async () => {
    if (!pool) return [...inMemoryHistory].reverse().slice(0, 50);
    try {
      const [rows]: any = await pool.query('SELECT data FROM history ORDER BY created_at DESC LIMIT 50');
      return rows.map((r: any) => typeof r.data === 'string' ? JSON.parse(r.data) : r.data);
    } catch (e: any) {
      console.error('MySQL getHistory error:', e.message);
      return [...inMemoryHistory].reverse().slice(0, 50);
    }
  };

  const addHistory = async (record: any) => {
    // Always add to memory for fast UI updates/fallback
    inMemoryHistory.push({ ...record, timestamp: Date.now() });
    if (inMemoryHistory.length > 100) inMemoryHistory.shift();

    if (!pool) return;
    try {
      await pool.query(
        'INSERT INTO history (room_name, winner_name, entry_fee, data) VALUES (?, ?, ?, ?)',
        [record.roomName, record.winnerName, record.entryFee, JSON.stringify(record)]
      );
    } catch (e) {
      console.error('MySQL addHistory error:', e);
    }
  };

  const syncStats = async () => {
    if (!pool) return;
    try {
      await pool.query('INSERT INTO stats (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', ['user_balance', userBalance]);
      await pool.query('INSERT INTO stats (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', ['admin_commission', adminCommission]);
    } catch (e: any) {
      console.error('MySQL syncStats error:', e.message);
    }
  };

  const loadStats = async () => {
    if (!pool) return;
    try {
      const [rows]: any = await pool.query('SELECT `key`, value FROM stats');
      rows.forEach((row: any) => {
        if (row.key === 'user_balance') userBalance = Number(row.value);
        if (row.key === 'admin_commission') adminCommission = Number(row.value);
      });
    } catch (e) {
      console.error('MySQL loadStats error:', e);
    }
  };

  // --- INITIALIZATION ---
  let rooms: Room[] = [];
  let inMemoryHistory: any[] = [];
  let userBalance = 10000; 
  let adminCommission = 0;

  const initDb = async () => {
    try {
      if (!pool) {
        console.warn('MySQL configuration not found. Initializing in memory only.');
        rooms = generateInitialRooms(20);
        return;
      }

      // Test connection with a timeout
      try {
        console.log('Testing MySQL connection...');
        // We use a promise wrapper to implement a timeout for getConnection
        const connectionPromise = pool.getConnection();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MySQL connection timeout')), 5000)
        );
        
        const connection = await Promise.race([connectionPromise, timeoutPromise]) as any;
        console.log('Successfully connected to MySQL database.');
        connection.release();
      } catch (connErr) {
        console.error('Could not connect to MySQL server:', (connErr as Error).message);
        console.warn('Falling back to in-memory storage for this session.');
        pool = null; // Set pool to null so helpers use memory fallback
        rooms = generateInitialRooms(20);
        return;
      }

      console.log('Initializing database schema...');
      // Create tables if they don't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS rooms (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            theme VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'waiting',
            entry_fee INTEGER NOT NULL,
            data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            room_name VARCHAR(255) NOT NULL,
            winner_name VARCHAR(255),
            entry_fee INTEGER NOT NULL,
            data JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS stats (
            \`key\` VARCHAR(255) PRIMARY KEY,
            value DECIMAL(20, 2) NOT NULL DEFAULT 0
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            balance DECIMAL(20, 2) DEFAULT 10000.00,
            is_admin BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await loadStats();

      const existing = await getRooms();
      console.log(`Database sync: found ${existing.length} existing rooms.`);
      
      if (existing.length === 0) {
        console.log('No rooms found in DB. Initializing 20 default rooms...');
        const initial = generateInitialRooms(20);
        if (pool) {
          for (const r of initial) {
            await updateRoom(r).catch(err => console.error(`Failed to persist initial room ${r.id}:`, err.message));
          }
        }
        rooms = initial;
      } else {
        rooms = existing;
      }
      
      console.log(`Final room count after init: ${rooms.length}`);
    } catch (e) {
      console.error('CRITICAL: Failed to init MySQL tables/rooms:', e);
      console.warn('Emergency fallback: generating in-memory rooms.');
      rooms = generateInitialRooms(20);
    }
    
    // Safety check: if rooms is still empty for some reason, force populate
    if (rooms.length === 0) {
      console.warn('Safety check: Rooms array was empty after init. Force generating.');
      rooms = generateInitialRooms(20);
    }
  };

  // We await but catching errors inside to allow startServer to continue
  await initDb().catch(e => console.error('Critical initDb error:', e));

  // Cleanup: Remove empty custom rooms after 3 minutes of inactivity
  setInterval(() => {
    const now = Date.now();
    const oldRoomsCount = rooms.length;
    rooms = rooms.filter(room => {
      const isInitial = room.id.startsWith('room-gen-');
      const hasHuman = room.players.some(p => !p.isBot);
      
      if (isInitial) return true;
      if (hasHuman) return true;
      
      const ageMinutes = (now - room.createdAt) / 60000;
      return ageMinutes < 3;
    });
    
    if (rooms.length !== oldRoomsCount && pool) {
        // We could delete from DB here but for stability we just let them stay or delete on restart
    }
  }, 10000); // Check every 10 seconds

  function generateInitialRooms(count: number): Room[] {
    const themes: RoomTheme[] = ['horses', 'f1', 'space'];
    const names = {
      horses: ['Золотое Копыто', 'Лихой Аллюр', 'Ипподром «Звезда»', 'Королевский Заезд', 'Кубок Фаворита', 'Степные Просторы', 'Вечерний Забег', 'Великое Дерби'],
      f1: ['Ночная Трасса', 'Кольцо Фортуны', 'Скоростная Магистраль', 'Гран-при Единства', 'Турбо Драйв', 'Гоночный Вираж', 'Стальной Шторм', 'Кубок Мира'],
      space: ['Туманность Ориона', 'Лунная Экспедиция', 'Колония Марс', 'Аванпост Титан', 'Альфа Центавра', 'Дрейф Андромеды', 'Арена Суперновы', 'Грань Пустоты']
    };

    return Array.from({ length: count }, (_, i) => {
      const theme = themes[i % themes.length];
      const themeNames = names[theme];
      const entryFee = [100, 250, 500, 1000, 2500, 5000][i % 6];
      const serverSeed = uuidv4();
      const fairnessHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      
      return {
        id: `room-gen-${i}`,
        name: `${themeNames[i % themeNames.length]} #${Math.floor(i / 3) + 1}`,
        theme,
        config: { 
          entryFee, 
          maxPlayers: [2, 4, 6, 8, 10][i % 5], 
          commissionRate: 0.2, 
          boostCost: entryFee * 0.5, 
          rewardPercentage: 0.8 
        },
        players: [],
        horses: generateHorses([2, 4, 6, 8, 10][i % 5], theme),
        status: 'waiting',
        timer: 60,
        baseTimer: 60,
        winnerHorseId: null,
        raceLog: [],
        serverSeed,
        fairnessHash,
        createdAt: Date.now()
      };
    });
  }

  function generateHorses(count: number, theme: RoomTheme): Horse[] {
    const themes = {
      horses: {
        names: ['Золотая Грива', 'Эклипс', 'Гром', 'Полночь', 'Шторм', 'Дух', 'Гроза', 'Пламя', 'Галактика', 'Нова', 'Свифт', 'Комета', 'Звезда', 'Тень', 'Лаки'],
        images: ['🐎', '🐴', '🏇', '🐎', '🐴', '🏇', '🐎', '🐴', '🏇', '🐎'],
        colors: ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#fef3c7', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706']
      },
      f1: {
        names: ['Михаэль Ш.', 'Льюис Х.', 'Апекс', 'Слипстрим', 'Барон', 'Стрела', 'Турбо', 'Нитро', 'Дрифтер', 'G-Форс', 'Макс Ф.', 'Шарль Л.', 'Ландо Н.', 'Оскар П.'],
        images: ['🏎️', '🏎️', '🏎️', '🏎️', '🏎️', '🏎️', '🏎️', '🏎️', '🏎️', '🏎️'],
        colors: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e']
      },
      space: {
        names: ['Сокол', 'Хоппер', 'Ковбой', 'Уолкер', 'Небула', 'Стардаст', 'Комета', 'Квазар', 'Пульс', 'Зенит', 'Аполлон', 'Союз', 'Дискавери', 'Индевор'],
        images: ['🚀', '🛸', '🛰️', '🚀', '🛸', '🛰️', '🚀', '🛸', '🛰️', '🚀'],
        colors: ['#818cf8', '#c084fc', '#22d3ee', '#f472b6', '#4ade80', '#fbbf24', '#f87171', '#94a3b8', '#38bdf8', '#fb923c']
      }
    };
    
    const t = themes[theme];
    return Array.from({ length: count }, (_, i) => ({
      id: `h-${theme}-${i}-${uuidv4().slice(0, 4)}`,
      name: t.names[i] || `Гонщик ${i + 1}`,
      image: t.images[i % t.images.length] || '❓',
      color: t.colors[i % t.colors.length] || '#ccc',
      baseSpeed: 1 + Math.random() * 0.3,
      isBoosted: false
    }));
  }

  function autoExpandRooms() {
    const waitingRooms = rooms.filter(r => r.status === 'waiting');
    const allWaitingRoomsFull = waitingRooms.length === 0 || waitingRooms.every(r => {
      const occupiedSlots = r.players.reduce((acc, p) => acc + p.horseIds.length, 0);
      return occupiedSlots >= r.horses.length;
    });

    if (allWaitingRoomsFull) {
      // Create 3 new rooms with varying configs
      const currentThemes: ('horses'|'f1'|'space')[] = ['horses', 'f1', 'space'];
      for (let i = 0; i < 3; i++) {
        const theme = currentThemes[i % currentThemes.length];
        const serverSeed = uuidv4();
        const fairnessHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
        const entryFee = [100, 500, 1000, 5000][Math.floor(Math.random() * 4)];
        const maxSlots = 8 + (Math.floor(Math.random() * 3) * 2); // 8, 10, or 12

        const newRoom: Room = {
          id: uuidv4(),
          name: i === 0 ? "Золотой Кубок" : i === 1 ? "Ночной Заезд" : "Межзвездная Лига",
          theme: theme,
          config: { 
            entryFee: entryFee, 
            maxPlayers: maxSlots, 
            commissionRate: 0.15, 
            boostCost: Math.floor(entryFee * 0.2), 
            rewardPercentage: 0.85 
          },
          players: [],
          horses: generateHorses(maxSlots, theme),
          status: 'waiting',
          timer: 60,
          baseTimer: 60,
          winnerHorseId: null,
          raceLog: [],
          serverSeed,
          fairnessHash,
          createdAt: Date.now()
        };
        rooms.unshift(newRoom);
        broadcastToAll('ROOM_UPDATE', newRoom);
      }
    }
  }

  // --- API ROUTES ---

  apiRouter.get('/me', async (req, res) => {
    const userId = req.query.id as string;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  apiRouter.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    
    if (!pool) return res.status(500).json({ error: 'Database not connected' });

    try {
      const id = uuidv4();
      // Simple check for first user to make them admin
      const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM users');
      const isAdmin = rows[0].count === 0;

      await pool.query(
        'INSERT INTO users (id, username, password, is_admin) VALUES (?, ?, ?, ?)',
        [id, username, password, isAdmin]
      );
      
      const user = { id, username, balance: 10000, is_admin: isAdmin };
      res.json(user);
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'User already exists' });
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  apiRouter.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!pool) return res.status(500).json({ error: 'Database not connected' });

    try {
      const [rows]: any = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
      if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      
      const user = rows[0];
      res.json({ id: user.id, username: user.username, balance: user.balance, is_admin: user.is_admin });
    } catch (e) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  apiRouter.get('/user/:id', async (req, res) => {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  });

  apiRouter.get('/rooms', (req, res) => {
    try {
      console.log(`GET /api/rooms - Returning ${rooms.length} rooms`);
      res.json(rooms);
    } catch (e) {
      console.error('GET /api/rooms error:', e);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  apiRouter.post('/rooms', async (req, res) => {
    try {
      const { name, theme, entryFee, maxPlayers, timer } = req.body;
      const serverSeed = uuidv4();
      const fairnessHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      
      const t = Number(timer) || 60;
      if (t < 30) return res.status(400).json({ error: 'Timer must be at least 30 seconds' });

      const newRoom: Room = {
        id: uuidv4(),
        name: name || `Частное Дерби`,
        theme: theme || 'horses',
        config: { 
          entryFee: Number(entryFee) || 100, 
          maxPlayers: Number(maxPlayers) || 10, 
          commissionRate: 0.2, 
          boostCost: (Number(entryFee) || 100) * 0.5, 
          rewardPercentage: 0.8 
        },
        players: [],
        horses: generateHorses(Number(maxPlayers) || 10, theme || 'horses'),
        status: 'waiting',
        timer: t,
        baseTimer: t,
        winnerHorseId: null,
        raceLog: [],
        serverSeed,
        fairnessHash,
        createdAt: Date.now()
      };
      rooms.unshift(newRoom);
      // Try to sync to DB but don't block response if it fails
      updateRoom(newRoom).catch(e => console.error('Failed to sync new room to DB:', e));
      res.json(newRoom);
    } catch (e) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  apiRouter.post('/rooms/:id/join', async (req, res) => {
    const { id } = req.params;
    const { horseIds, userId } = req.body; 
    const room = rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: 'Комната не найдена' });

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (room.status !== 'waiting') return res.status(400).json({ error: 'Игра уже началась' });
    
    const isAlreadyPlaying = rooms.some(r => r.status !== 'finished' && r.players.some(p => p.id === userId));
    if (isAlreadyPlaying) return res.status(400).json({ error: 'Вы уже участвуете в другом заезде' });

    const totalFee = room.config.entryFee * (horseIds as string[]).length;
    if (user.balance < totalFee) return res.status(400).json({ error: 'Недостаточно средств' });

    await updateUserBalance(userId, -totalFee);
    room.players.push({
      id: user.id,
      name: user.username,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
      horseIds: horseIds,
      isBot: false
    });

    await updateRoom(room);
    broadcastToRoom(id, room);
    const updatedUser = await getUserById(userId);
    broadcastUserUpdate({ userId, balance: updatedUser.balance });
    
    autoExpandRooms();
    res.json({ success: true, balance: updatedUser.balance });
  });

  apiRouter.post('/rooms/:id/boost', async (req, res) => {
    const { id } = req.params;
    const { horseId, userId } = req.body;
    const room = rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const user = await getUserById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.balance < room.config.boostCost) return res.status(400).json({ error: 'Insufficient balance' });

    const horse = room.horses.find(h => h.id === horseId);
    if (!horse) return res.status(404).json({ error: 'Horse not found' });
    if (horse.isBoosted) return res.status(400).json({ error: 'Already boosted' });

    await updateUserBalance(userId, -room.config.boostCost);
    horse.isBoosted = true;
    
    await updateRoom(room);
    broadcastToRoom(id, room);
    const updatedUser = await getUserById(userId);
    broadcastUserUpdate({ userId, balance: updatedUser.balance });

    res.json({ success: true, balance: updatedUser.balance });
  });

  apiRouter.post('/admin/rooms/update', async (req, res) => {
    const { id, config, userId } = req.body;
    const user = await getUserById(userId);
    if (!user?.is_admin) return res.status(403).json({ error: 'Access denied' });

    const room = rooms.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    room.config = { ...room.config, ...config };
    
    if (config && config.timer) {
      const newTimer = Number(config.timer);
      if (newTimer >= 30) {
        room.baseTimer = newTimer;
        if (room.status === 'waiting') {
          room.timer = newTimer;
        }
      }
    }

    await updateRoom(room);
    broadcastToRoom(room.id, room);
    res.json({ success: true, room });
  });

  apiRouter.get('/admin/stats', (req, res) => {
    try {
      const totalPlayers = rooms.reduce((acc, r) => acc + r.players.filter(p => !p.isBot).length, 0);
      const activeRooms = rooms.filter(r => r.status === 'racing').length;
      res.json({
        adminCommission,
        userBalance,
        totalPlayers,
        activeRooms,
        totalRooms: rooms.length
      });
    } catch (e) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  apiRouter.get('/history', async (req, res) => {
    try {
      const history = await getHistory();
      res.json(history);
    } catch (e) {
      console.error('History fetch error:', e);
      res.json([]); // Fallback to empty history on DB error
    }
  });

  // Mount API router
  app.use('/api', apiRouter);

  // --- GAME ENGINE ---
  setInterval(async () => {
    try {
      for (const room of rooms) {
        if (room.status === 'waiting') {
          const hasHuman = room.players.some(p => !p.isBot);
          if (hasHuman) {
            room.timer -= 0.5; // Tick every 500ms
            if (Math.floor(room.timer) !== Math.floor(room.timer + 0.5)) {
              broadcastToRoom(room.id, room);
            }
            if (room.timer <= 0) {
              await startRace(room).catch(e => console.error('StartRace error:', e));
            }
          }
        }
      }
    } catch (e) {
      console.error('Game loop error:', e);
    }
  }, 500);

  async function startRace(room: Room) {
    // Fill empty spots with bots
    const occupiedHorses = new Set(room.players.flatMap(p => p.horseIds));
    const allHorses = room.horses.map(h => h.id);
    const freeHorses = allHorses.filter(id => !occupiedHorses.has(id));

    if (freeHorses.length > 0) {
      room.players.push({
        id: 'bot-owner',
        name: 'Команда Ботов VIP',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=vip',
        horseIds: freeHorses,
        isBot: true
      });
    }

    // --- PROVABLY FAIR SELECTION ---
    const sortedRacerIds = [...room.horses].sort((a, b) => a.id.localeCompare(b.id)).map(h => h.id);
    const weightsMap = new Map(room.horses.map(h => [h.id, h.isBoosted ? 1.5 : 1.0]));
    const totalWeight = Array.from(weightsMap.values()).reduce((a, b) => a + b, 0);

    const hash = crypto.createHash('sha256').update(room.serverSeed || 'fallback').digest('hex');
    const randomInt = parseInt(hash.slice(0, 12), 16);
    const randomFloat = randomInt / 0xFFFFFFFFFFFF;

    let cumulativeWeight = 0;
    let winnerId = sortedRacerIds[0];
    const targetWeight = randomFloat * totalWeight;

    for (const id of sortedRacerIds) {
      cumulativeWeight += weightsMap.get(id) || 1.0;
      if (cumulativeWeight >= targetWeight) {
        winnerId = id;
        break;
      }
    }

    room.winnerHorseId = winnerId;

    // --- GENERATE DETERNIMISTIC RACE LOG (Do this BEFORE status change) ---
    const distanceThreshold = 100;
    const log: { horseId: string; positions: number[] }[] = room.horses.map(h => ({ horseId: h.id, positions: [0] }));
    const ticks: number[] = new Array(room.horses.length).fill(0);
    let finishedCount = 0;
    const horseFinished = new Array(room.horses.length).fill(false);

    let maxTickPossible = 0;
    while (finishedCount < room.horses.length) {
      room.horses.forEach((h, i) => {
        if (horseFinished[i]) {
          log[i].positions.push(distanceThreshold);
          return;
        }

        const isWinner = h.id === winnerId;
        const destinyBonus = isWinner ? 0.3 : 0;
        
        let tickSpeed = (0.8 + Math.random() * 0.5 + destinyBonus);
        if (h.isBoosted) tickSpeed *= 1.15;

        if (!isWinner && (ticks[i] + tickSpeed) >= (distanceThreshold - 1)) {
          const winnerIndex = room.horses.findIndex(wh => wh.id === winnerId);
          if (ticks[winnerIndex] < distanceThreshold) {
            tickSpeed = Math.max(0, (distanceThreshold - (1 + Math.random())) - ticks[i]);
          }
        }

        ticks[i] += tickSpeed;
        log[i].positions.push(Math.min(ticks[i], distanceThreshold));

        if (ticks[i] >= distanceThreshold) {
          horseFinished[i] = true;
          finishedCount++;
        }
      });
      maxTickPossible++;
      if (maxTickPossible > 2000) break;
    }

    room.raceLog = log;
    room.status = 'racing';
    
    // Broadcast IMMEDIATELY after everything is ready
    broadcastToRoom(room.id, room);
    
    // Non-blocking update to DB
    updateRoom(room).catch(e => console.error('Failed to sync racing start to DB:', e));

    setTimeout(async () => {
      room.status = 'finished';
      room.finishedAt = Date.now();
      broadcastToRoom(room.id, room);
      await finalizeRace(room);
    }, 15000); 
  }

  async function finalizeRace(room: Room) {
    const horseCount = room.horses.length;
    const totalPool = room.config.entryFee * horseCount;
    const commission = totalPool * room.config.commissionRate;
    const winnerPool = totalPool - commission;
    
    const winnerPlayer = room.players.find(p => p.horseIds.includes(room.winnerHorseId!));
    const winnerId = winnerPlayer?.id;
    const isBotWinner = winnerPlayer ? winnerPlayer.isBot : true;

    // Financials
    let userEntryFees = 0;
    let botEntryFees = 0;
    let userBoosts = 0;

    room.players.forEach(p => {
      const fees = room.config.entryFee * p.horseIds.length;
      if (p.isBot) {
        botEntryFees += fees;
      } else {
        userEntryFees += fees;
        p.horseIds.forEach(hid => {
          const h = room.horses.find(horse => horse.id === hid);
          if (h && h.isBoosted) {
            userBoosts += room.config.boostCost;
          }
        });
      }
    });

    let currentOrganizerTake = 0;
    if (isBotWinner) {
      currentOrganizerTake = userEntryFees + userBoosts;
    } else {
      currentOrganizerTake = commission + userBoosts - botEntryFees;
    }

    adminCommission += currentOrganizerTake;
    if (winnerPlayer && !winnerPlayer.isBot) {
      await updateUserBalance(winnerPlayer.id, winnerPool);
    }

    await syncStats();
    const updatedState = winnerPlayer && !winnerPlayer.isBot ? await getUserById(winnerPlayer.id) : null;
    broadcastUserUpdate({ 
      userId: winnerPlayer?.id, 
      balance: updatedState?.balance, 
      adminCommission 
    });

    const participants = room.players.map(p => {
      let balanceChange = - (room.config.entryFee * p.horseIds.length);
      const isWinner = p.id === winnerId;
      if (isWinner) balanceChange += winnerPool;
      
      p.horseIds.forEach(hid => {
        const h = room.horses.find(horse => horse.id === hid);
        if (h?.isBoosted && !p.isBot) balanceChange -= room.config.boostCost;
      });

      return {
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        horseIds: p.horseIds,
        balanceChange
      };
    });

    const detailedHistory = {
      id: uuidv4().slice(0, 8),
      roomName: room.name,
      winnerName: room.horses.find(h => h.id === room.winnerHorseId)?.name,
      winnerId: winnerId,
      entryFee: room.config.entryFee,
      fairnessHash: room.fairnessHash,
      serverSeed: room.serverSeed,
      config: { ...room.config },
      financials: {
        totalPool,
        commission,
        winnerPool,
        totalOrganizerTake: currentOrganizerTake
      },
      participants
    };

    await addHistory(detailedHistory);
    await updateRoom(room);

    setTimeout(async () => {
      // Reset room for next race
      const serverSeed = uuidv4();
      const fairnessHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

      room.status = 'waiting';
      room.timer = room.baseTimer || 60;
      room.players = [];
      room.winnerHorseId = null;
      room.finishedAt = undefined;
      room.raceLog = [];
      room.serverSeed = serverSeed;
      room.fairnessHash = fairnessHash;
      room.horses = generateHorses(room.horses.length, room.theme);
      
      await updateRoom(room);
      broadcastToRoom(room.id, room);
    }, 5000); // 5 seconds to show results
  }

  // --- VITE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(process.cwd(), 'dist', 'index.html')));
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  process.exit(1);
});
