# Архитектура проекта

## Обзор

Проект состоит из двух основных частей:
1. **Backend** - Telegram Bot + REST API (Node.js + TypeScript)
2. **Frontend** - Mini App с offline-поддержкой (React + TypeScript) - в разработке

```
┌─────────────────────────────────────────────────────────────┐
│                        Пользователи                          │
│                   (Telegram клиенты)                         │
└────────────────┬───────────────────┬────────────────────────┘
                 │                   │
         ┌───────▼────────┐  ┌──────▼──────────┐
         │  Telegram Bot  │  │  Mini App (PWA) │
         │   (Telegraf)   │  │  React + Dexie  │
         └───────┬────────┘  └───────┬─────────┘
                 │                   │
                 │        ┌──────────▼──────────┐
                 │        │    REST API         │
                 │        │    Express          │
                 │        └──────────┬──────────┘
                 │                   │
         ┌───────▼───────────────────▼─────────┐
         │          PostgreSQL Database         │
         │      (Users, Devices, Readings)      │
         └──────────────────────────────────────┘
                          │
                 ┌────────▼────────┐
                 │  File Storage   │
                 │    (uploads/)   │
                 └─────────────────┘
```

## Backend архитектура

### Структура директорий

```
src/
├── bot/                    # Telegram Bot логика
│   ├── handlers/          # Обработчики команд и событий
│   │   ├── start.ts       # Регистрация и приветствие
│   │   ├── readings.ts    # Загрузка показаний
│   │   ├── devices.ts     # Управление аппаратами
│   │   ├── users.ts       # Управление пользователями
│   │   └── reports.ts     # Отчеты и статистика
│   └── index.ts           # Инициализация бота
├── api/                   # REST API
│   └── routes.ts          # Маршруты API
├── database/              # База данных
│   ├── db.ts              # Подключение к PostgreSQL
│   ├── schema.sql         # SQL схема таблиц
│   └── migrate.ts         # Миграции
├── models/                # TypeScript модели
│   ├── User.ts            # Модель пользователя
│   ├── Device.ts          # Модель аппарата
│   └── Reading.ts         # Модель показания
├── services/              # Бизнес-логика
│   ├── UserService.ts     # Работа с пользователями
│   ├── DeviceService.ts   # Работа с аппаратами
│   ├── ReadingService.ts  # Работа с показаниями
│   └── InvitationService.ts # Система приглашений
├── middleware/            # Промежуточное ПО
│   └── auth.ts            # Авторизация и проверка прав
├── utils/                 # Утилиты
│   ├── fileHelper.ts      # Работа с файлами
│   ├── formatters.ts      # Форматирование данных
│   └── keyboards.ts       # Telegram клавиатуры
├── server.ts              # Express сервер
└── index.ts               # Точка входа
```

### Слои приложения

```
┌──────────────────────────────────────────┐
│         Presentation Layer               │
│  (Bot Handlers, API Routes)              │
└─────────────────┬────────────────────────┘
                  │
┌─────────────────▼────────────────────────┐
│         Business Logic Layer             │
│  (Services: User, Device, Reading)       │
└─────────────────┬────────────────────────┘
                  │
┌─────────────────▼────────────────────────┐
│         Data Access Layer                │
│  (Database queries, File operations)     │
└──────────────────────────────────────────┘
```

## База данных

### Схема таблиц

```sql
┌─────────────────┐       ┌─────────────────┐
│     users       │       │    devices      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │
│ telegram_id     │───┐   │ name            │
│ username        │   │   │ location        │
│ role            │   │   │ serial_number   │
│ ...             │   │   │ created_by (FK) │───┐
└─────────────────┘   │   └─────────────────┘   │
         │            │            │            │
         │            │            │            │
         │            └────────────┼────────────┘
         │                         │
         │                         │
         └─────────┐     ┌─────────┘
                   │     │
              ┌────▼─────▼────┐
              │   readings    │
              ├───────────────┤
              │ id (PK)       │
              │ device_id (FK)│
              │ user_id (FK)  │
              │ counter_value │
              │ photo_path    │
              │ reading_date  │
              │ sync_status   │
              └───────────────┘

┌──────────────────┐
│  invitations     │
├──────────────────┤
│ id (PK)          │
│ invited_by (FK)  │───> users.id
│ invite_code      │
│ role             │
│ is_used          │
│ expires_at       │
└──────────────────┘
```

### Индексы

- `users.telegram_id` - для быстрого поиска пользователей
- `readings.device_id` - для фильтрации по аппаратам
- `readings.user_id` - для фильтрации по пользователям
- `readings.reading_date` - для сортировки по датам
- `invitations.invite_code` - для проверки кодов приглашений

## Mini App архитектура (в разработке)

### Offline-first подход

```
┌────────────────────────────────────────┐
│          React Components              │
│     (UI, Forms, Charts, Maps)          │
└──────────────┬─────────────────────────┘
               │
┌──────────────▼─────────────────────────┐
│          Custom Hooks                  │
│  (useDevices, useReadings, useSync)    │
└──────────────┬─────────────────────────┘
               │
     ┌─────────▼─────────┐
     │                   │
┌────▼──────┐   ┌────────▼────────┐
│  Dexie    │   │   Sync Service  │
│ (IndexDB) │   │   (API Client)  │
└───────────┘   └─────────────────┘
     │                   │
     │          ┌────────▼────────┐
     │          │   REST API      │
     │          │   Backend       │
     │          └─────────────────┘
     │
     └──> Local Storage (offline)
```

### Процесс синхронизации

```
1. Пользователь создает показание
   │
   ▼
2. Данные сохраняются в IndexedDB
   status = 'pending'
   │
   ▼
3. Попытка синхронизации
   ├─> Есть интернет?
   │   ├─> Да: отправка на сервер
   │   │   ├─> Успех: status = 'synced'
   │   │   └─> Ошибка: status = 'error'
   │   │
   │   └─> Нет: остается 'pending'
   │
   ▼
4. Периодическая проверка 'pending' записей
   и повторная попытка синхронизации
```

## Паттерны проектирования

### 1. Service Layer

Вся бизнес-логика изолирована в сервисах:

```typescript
// Пример: UserService
class UserService {
  async findByTelegramId(telegramId: number): Promise<User | null>
  async create(data: CreateUserDto): Promise<User>
  async isAdmin(telegramId: number): Promise<boolean>
}
```

### 2. Repository Pattern

Сервисы работают с базой данных через единый интерфейс:

```typescript
// db.ts
export const query = async (text: string, params?: any[]) => {
  const res = await pool.query(text, params);
  return res;
};
```

### 3. Middleware Pattern

Проверка прав доступа через middleware:

```typescript
// auth.ts
export const authMiddleware: MiddlewareFn<BotContext> = async (ctx, next) => {
  const user = await userService.findByTelegramId(ctx.from.id);
  if (!user || !user.is_active) {
    await ctx.reply('❌ Нет доступа');
    return;
  }
  ctx.user = user;
  return next();
};
```

### 4. Strategy Pattern

Разные обработчики для разных ролей:

```typescript
// Админ: полный доступ
bot.action('manage_devices', authMiddleware, adminOnly, handleManageDevices);

// Сотрудник: ограниченный доступ
bot.action('add_reading', authMiddleware, handleAddReading);
```

## Безопасность

### Уровни защиты

1. **Аутентификация**
   - Регистрация только по приглашениям
   - Проверка Telegram User ID

2. **Авторизация**
   - Middleware проверяет права доступа
   - Роли: admin, employee

3. **Валидация данных**
   - Проверка типов и форматов
   - Лимиты на размеры файлов
   - SQL injection защита (параметризованные запросы)

4. **Хранение данных**
   - Файлы в отдельной директории
   - UUID имена файлов (невозможно подобрать)
   - Структура по годам/месяцам

## Масштабируемость

### Текущие решения

- **Connection Pooling** - пул подключений к PostgreSQL
- **File Organization** - файлы организованы по датам
- **Indexes** - индексы для быстрых запросов

### Будущие улучшения

- **Кэширование** - Redis для часто запрашиваемых данных
- **Очереди** - Bull/BullMQ для обработки загрузок
- **CDN** - для статических файлов
- **Load Balancing** - несколько инстансов бота
- **Horizontal Scaling** - Postgres replication

## Мониторинг и логирование

### Текущее состояние

```typescript
// Логирование запросов к БД
console.log('Выполнен запрос', { text, duration, rows });

// Логирование ошибок
console.error('Ошибка в боте:', err);
```

### Рекомендации для production

- **Winston/Pino** - структурированное логирование
- **Sentry** - отслеживание ошибок
- **Prometheus + Grafana** - метрики и мониторинг
- **Health checks** - проверка состояния сервисов

## Deployment

### Development

```bash
npm run dev  # Бот + API в режиме разработки
```

### Production

```bash
npm run build  # Компиляция TypeScript
npm start      # Запуск скомпилированного кода
```

### Docker (рекомендуется)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Environment Variables

```env
BOT_TOKEN=...              # Telegram Bot Token
DB_HOST=postgres           # Database host
DB_PORT=5432               # Database port
DB_NAME=water_counter_bot  # Database name
DB_USER=postgres           # Database user
DB_PASSWORD=...            # Database password
PORT=3000                  # API port
UPLOAD_DIR=./uploads       # Upload directory
```

## Тестирование

### Рекомендуемые инструменты

- **Jest** - Unit тесты
- **Supertest** - API тесты
- **Telegram Bot API Test Environment** - тесты бота

### Пример структуры тестов

```
tests/
├── unit/
│   ├── services/
│   │   ├── UserService.test.ts
│   │   ├── DeviceService.test.ts
│   │   └── ReadingService.test.ts
│   └── utils/
│       └── formatters.test.ts
├── integration/
│   ├── api/
│   │   └── readings.test.ts
│   └── bot/
│       └── handlers.test.ts
└── e2e/
    └── user-flow.test.ts
```

## Производительность

### Оптимизации

1. **Database**
   - Индексы на часто запрашиваемых полях
   - Connection pooling
   - Limit на запросы

2. **Files**
   - Оптимизация изображений (планируется)
   - Ленивая загрузка
   - Структурированное хранение

3. **API**
   - Pagination для списков
   - Кэширование статических данных

4. **Bot**
   - Асинхронная обработка
   - Session management
   - Rate limiting (планируется)
