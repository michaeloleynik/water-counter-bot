# API Документация

API для работы с Telegram Mini App и внешними интеграциями.

## Базовый URL

```
http://localhost:3000/api
```

## Аутентификация

Все защищенные эндпоинты требуют заголовок:

```
X-Telegram-User-Id: {telegram_user_id}
```

## Endpoints

### Health Check

Проверка состояния API.

```http
GET /api/health
```

**Ответ:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-27T10:00:00.000Z"
}
```

---

### Получение информации о текущем пользователе

```http
GET /api/me
```

**Заголовки:**
```
X-Telegram-User-Id: 123456789
```

**Ответ:**

```json
{
  "id": 1,
  "telegram_id": 123456789,
  "username": "john_doe",
  "first_name": "John",
  "last_name": "Doe",
  "role": "employee"
}
```

---

### Получение списка аппаратов

```http
GET /api/devices
```

**Заголовки:**
```
X-Telegram-User-Id: 123456789
```

**Ответ:**

```json
[
  {
    "id": 1,
    "name": "Аппарат №1",
    "location": "Офис, 1 этаж",
    "serial_number": "WC-001",
    "description": "Основной аппарат",
    "is_active": true,
    "created_at": "2024-01-01T10:00:00.000Z"
  }
]
```

---

### Создание показания

Загрузка нового показания счетчика с фотографией.

```http
POST /api/readings
Content-Type: multipart/form-data
```

**Заголовки:**
```
X-Telegram-User-Id: 123456789
Content-Type: multipart/form-data
```

**Тело запроса (FormData):**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| device_id | number | Да | ID аппарата |
| counter_value | number | Да | Показание счетчика |
| photo | File | Да | Фотография счетчика |
| notes | string | Нет | Примечание |
| client_timestamp | string | Нет | ISO timestamp с устройства |

**Пример (JavaScript):**

```javascript
const formData = new FormData();
formData.append('device_id', '1');
formData.append('counter_value', '123.45');
formData.append('photo', photoFile);
formData.append('notes', 'Показание за январь');
formData.append('client_timestamp', new Date().toISOString());

const response = await fetch('http://localhost:3000/api/readings', {
  method: 'POST',
  headers: {
    'X-Telegram-User-Id': '123456789'
  },
  body: formData
});

const reading = await response.json();
```

**Ответ:**

```json
{
  "id": 42,
  "device_id": 1,
  "user_id": 5,
  "counter_value": 123.45,
  "photo_path": "2024/01/uuid-here.jpg",
  "notes": "Показание за январь",
  "reading_date": "2024-01-27T10:30:00.000Z",
  "sync_status": "synced"
}
```

---

### Получение своих показаний

```http
GET /api/readings/my?limit=50
```

**Заголовки:**
```
X-Telegram-User-Id: 123456789
```

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| limit | number | 50 | Количество показаний |

**Ответ:**

```json
[
  {
    "id": 42,
    "device_id": 1,
    "device_name": "Аппарат №1",
    "device_location": "Офис, 1 этаж",
    "counter_value": 123.45,
    "photo_path": "2024/01/uuid-here.jpg",
    "notes": "Показание за январь",
    "reading_date": "2024-01-27T10:30:00.000Z",
    "user_name": "John Doe"
  }
]
```

---

### Получение показаний по аппарату (только для админов)

```http
GET /api/readings/device/:deviceId?limit=100
```

**Заголовки:**
```
X-Telegram-User-Id: 123456789
```

**Path параметры:**

| Параметр | Тип | Описание |
|----------|-----|----------|
| deviceId | number | ID аппарата |

**Query параметры:**

| Параметр | Тип | По умолчанию | Описание |
|----------|-----|--------------|----------|
| limit | number | 100 | Количество показаний |

**Ответ:** Аналогичен `/api/readings/my`

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Неверный запрос |
| 401 | Не авторизован |
| 403 | Доступ запрещен |
| 404 | Не найдено |
| 500 | Внутренняя ошибка сервера |

**Формат ошибки:**

```json
{
  "error": "Error message"
}
```

---

## Примеры использования

### Пример работы с Mini App

```typescript
// Получение данных пользователя
const getUserInfo = async () => {
  const userId = window.Telegram.WebApp.initDataUnsafe.user.id;
  
  const response = await fetch('http://localhost:3000/api/me', {
    headers: {
      'X-Telegram-User-Id': userId.toString()
    }
  });
  
  return await response.json();
};

// Загрузка показания
const uploadReading = async (deviceId: number, value: number, photo: File) => {
  const userId = window.Telegram.WebApp.initDataUnsafe.user.id;
  
  const formData = new FormData();
  formData.append('device_id', deviceId.toString());
  formData.append('counter_value', value.toString());
  formData.append('photo', photo);
  formData.append('client_timestamp', new Date().toISOString());
  
  const response = await fetch('http://localhost:3000/api/readings', {
    method: 'POST',
    headers: {
      'X-Telegram-User-Id': userId.toString()
    },
    body: formData
  });
  
  return await response.json();
};
```

---

## Безопасность

⚠️ **Важно:** В production необходимо:

1. Использовать HTTPS
2. Проверять `initData` от Telegram Web App
3. Добавить rate limiting
4. Валидировать размеры файлов
5. Проверять MIME-типы загружаемых файлов

### Проверка initData (рекомендуется)

```typescript
import crypto from 'crypto';

function validateTelegramWebAppData(initData: string, botToken: string): boolean {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return calculatedHash === hash;
}
```

---

## Дополнительно

### CORS

API настроен на прием запросов с любых источников. В production рекомендуется ограничить:

```typescript
app.use(cors({
  origin: 'https://your-mini-app-domain.com'
}));
```

### Статические файлы

Загруженные фотографии доступны по адресу:

```
http://localhost:3000/uploads/{year}/{month}/{filename}.jpg
```

Пример:
```
http://localhost:3000/uploads/2024/01/uuid-123-456.jpg
```
