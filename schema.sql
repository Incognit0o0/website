-- Схема базы данных для проекта VIP Гонок (MySQL)

-- 1. Таблица для хранения комнат
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    theme VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting',
    entry_fee INTEGER NOT NULL,
    data JSON NOT NULL, -- Детали (лошадей и лог)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Таблица истории гонок
CREATE TABLE IF NOT EXISTS history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    winner_name VARCHAR(255),
    entry_fee INTEGER NOT NULL,
    data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Глобальная статистика
CREATE TABLE IF NOT EXISTS stats (
    `key` VARCHAR(255) PRIMARY KEY,
    value DECIMAL(20, 2) NOT NULL DEFAULT 0
);

-- 4. Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    balance DECIMAL(20, 2) DEFAULT 10000.00,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX idx_history_date ON history(created_at DESC);
CREATE INDEX idx_rooms_status ON rooms(status);
