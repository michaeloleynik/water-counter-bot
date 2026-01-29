-- Таблица пользователей (сотрудники и админы)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'employee', -- 'admin' или 'employee'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Таблица аппаратов
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    serial_number VARCHAR(100) UNIQUE,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Таблица показаний счетчиков
CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    device_id INTEGER NOT NULL REFERENCES devices(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    counter_value DECIMAL(10, 2) NOT NULL,
    photo_path VARCHAR(500) NOT NULL,
    notes TEXT,
    reading_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'synced', -- 'pending', 'synced', 'failed'
    client_timestamp TIMESTAMP -- время на устройстве клиента
);

-- Таблица приглашений
CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    invited_by INTEGER NOT NULL REFERENCES users(id),
    telegram_id BIGINT,
    username VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'employee',
    invite_code VARCHAR(100) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    used_at TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_devices_active ON devices(is_active);
CREATE INDEX IF NOT EXISTS idx_readings_device_id ON readings(device_id);
CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id);
CREATE INDEX IF NOT EXISTS idx_readings_date ON readings(reading_date);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invite_code);
