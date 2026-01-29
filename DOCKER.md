# 🐳 Docker Deployment

Полное руководство по развертыванию с использованием Docker и Docker Compose.

## 📋 Содержание

- [Быстрый старт](#быстрый-старт)
- [Development окружение](#development-окружение)
- [Production окружение](#production-окружение)
- [Управление](#управление)
- [Бэкапы](#бэкапы)
- [Мониторинг](#мониторинг)
- [Troubleshooting](#troubleshooting)

## 🚀 Быстрый старт

### Требования

- Docker Desktop (Windows/Mac) или Docker Engine (Linux)
- Docker Compose v2+

### Установка Docker

**Windows:**
1. Скачайте [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Установите и перезагрузите компьютер
3. Запустите Docker Desktop

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

## 💻 Development окружение

### 1. Подготовка

```bash
# Создайте .env файл
copy .env.example .env

# (Опционально) Создайте package-lock.json для более быстрой сборки
npm install
```

Отредактируйте `.env`:
```env
BOT_TOKEN=ваш_токен_от_BotFather
DEFAULT_ADMIN_TELEGRAM_ID=ваш_telegram_id
DB_PASSWORD=mypassword
```

### 2. Запуск

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

### 3. Проверка

```bash
# Статус контейнеров
docker-compose ps

# Логи бота
docker-compose logs -f app

# Логи базы данных
docker-compose logs -f postgres
```

### 4. Доступ

- **API:** http://localhost:3000
- **Health check:** http://localhost:3000/api/health
- **pgAdmin:** http://localhost:5050 (если запущен с профилем debug)

## 🏭 Production окружение

### 1. Подготовка

```bash
# Создайте production .env
copy .env.production.example .env

# Создайте директории
mkdir logs backups nginx/ssl
```

Отредактируйте `.env`:
```env
BOT_TOKEN=production_token
DEFAULT_ADMIN_TELEGRAM_ID=your_id
DB_PASSWORD=strong_random_password_here
NODE_ENV=production
```

### 2. Конфигурация Nginx

По умолчанию Nginx работает на HTTP (порт 80). Для production рекомендуется настроить HTTPS.

#### Вариант A: С Let's Encrypt (рекомендуется)

```bash
# Установите certbot
sudo apt-get install certbot

# Получите SSL сертификат
sudo certbot certonly --standalone -d your-domain.com

# Скопируйте сертификаты
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/

# Раскомментируйте HTTPS секцию в nginx/conf.d/default.conf
```

#### Вариант B: Самоподписанный сертификат (для тестирования)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=localhost"
```

### 3. Запуск Production

```bash
# Запуск с production конфигурацией
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Проверка статуса
docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Просмотр логов
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

### 4. Первый запуск

При первом запуске автоматически:
- ✅ Создается база данных
- ✅ Выполняются миграции
- ✅ Создается администратор
- ✅ Запускается бот

Проверьте логи:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs app | grep "Бот успешно запущен"
```

## 🔧 Управление

### Основные команды

```bash
# Просмотр статуса
docker-compose ps

# Перезапуск всех сервисов
docker-compose restart

# Перезапуск отдельного сервиса
docker-compose restart app

# Остановка
docker-compose down

# Остановка с удалением volumes (ОСТОРОЖНО!)
docker-compose down -v

# Обновление образов
docker-compose pull
docker-compose up -d

# Пересборка образа приложения
docker-compose build --no-cache app
docker-compose up -d app
```

### Логи

```bash
# Все логи
docker-compose logs

# Логи конкретного сервиса
docker-compose logs app
docker-compose logs postgres
docker-compose logs nginx

# Следить за логами в реальном времени
docker-compose logs -f

# Последние 100 строк
docker-compose logs --tail=100
```

### Доступ к контейнерам

```bash
# Shell в контейнере приложения
docker-compose exec app sh

# Shell в контейнере базы данных
docker-compose exec postgres psql -U postgres -d water_counter_bot

# Выполнить команду
docker-compose exec app npm run db:migrate
```

## 💾 Бэкапы

### Автоматический бэкап

В production конфигурации включен автоматический бэкап базы данных каждые 24 часа.

Бэкапы сохраняются в папку `./backups/` и автоматически удаляются через N дней (настраивается через `BACKUP_KEEP_DAYS`).

### Ручной бэкап

```bash
# Создать бэкап
docker-compose exec postgres pg_dump -U postgres water_counter_bot > backup_$(date +%Y%m%d_%H%M%S).sql

# Или сжатый бэкап
docker-compose exec postgres pg_dump -U postgres water_counter_bot | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Восстановление из бэкапа

```bash
# Из несжатого бэкапа
docker-compose exec -T postgres psql -U postgres -d water_counter_bot < backup.sql

# Из сжатого бэкапа
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U postgres -d water_counter_bot
```

### Копирование данных

```bash
# Скопировать uploads из контейнера
docker cp water-counter-bot:/app/uploads ./uploads_backup

# Скопировать uploads в контейнер
docker cp ./uploads_backup/. water-counter-bot:/app/uploads/
```

## 📊 Мониторинг

### Health checks

```bash
# Проверка здоровья всех контейнеров
docker-compose ps

# Health check API
curl http://localhost:3000/api/health

# Через Docker
docker inspect --format='{{.State.Health.Status}}' water-counter-bot
```

### Ресурсы

```bash
# Использование ресурсов
docker stats

# Использование диска
docker system df

# Детальная информация
docker-compose top
```

### Логи Nginx

```bash
# Access log
tail -f nginx/logs/access.log

# Error log
tail -f nginx/logs/error.log
```

## 🐛 Troubleshooting

### Образ не собирается

**Проблема:** `npm ci` требует package-lock.json

```bash
# Решение: Dockerfile уже исправлен для работы без package-lock.json
# Просто пересоберите образ
docker-compose build --no-cache
```

**Или создайте package-lock.json для более быстрой сборки:**
```bash
npm install  # создаст package-lock.json
docker-compose build --no-cache
```

**Проблема:** `tsc: not found` или `tsx: not found`

**Решение:** Dockerfile уже исправлен. Убедитесь что используете последнюю версию:
```bash
# Полная очистка и пересборка
docker-compose down -v
docker system prune -a -f
docker-compose build --no-cache
docker-compose up -d
```

### Бот не запускается

**Проблема:** Контейнер постоянно перезапускается

```bash
# Проверьте логи
docker-compose logs app

# Проверьте переменные окружения
docker-compose exec app env | grep BOT_TOKEN
```

**Решение:** Убедитесь что `.env` файл заполнен правильно.

### База данных недоступна

**Проблема:** `connect ECONNREFUSED`

```bash
# Проверьте статус PostgreSQL
docker-compose ps postgres

# Проверьте логи
docker-compose logs postgres
```

**Решение:**
```bash
# Перезапустите PostgreSQL
docker-compose restart postgres

# Проверьте healthcheck
docker inspect water-counter-db | grep -A 10 Health
```

### Ошибка миграций

**Проблема:** Миграции не выполнились

```bash
# Выполните миграции вручную
docker-compose exec app npm run db:migrate
```

### Порт занят

**Проблема:** `Port is already allocated`

```bash
# Найдите процесс на порту
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Linux/Mac

# Измените порт в .env
PORT=3001
```

### Контейнер не останавливается

```bash
# Принудительная остановка
docker-compose kill

# Удаление контейнеров
docker-compose rm -f

# Очистка всего
docker-compose down -v
docker system prune -a
```

### Проблемы с правами доступа

```bash
# Linux: исправьте владельца папки uploads
sudo chown -R $USER:$USER uploads/

# Или в контейнере
docker-compose exec app chown -R node:node /app/uploads
```

## 🔄 Обновление

### Обновление приложения

```bash
# 1. Остановите контейнеры
docker-compose down

# 2. Обновите код
git pull  # если используете git

# 3. Пересоберите образ
docker-compose build --no-cache app

# 4. Запустите
docker-compose up -d

# 5. Проверьте логи
docker-compose logs -f app
```

### Обновление PostgreSQL

```bash
# 1. Создайте бэкап!
docker-compose exec postgres pg_dump -U postgres water_counter_bot > backup_before_upgrade.sql

# 2. Остановите
docker-compose down

# 3. Обновите версию в docker-compose.yml
# postgres:15-alpine -> postgres:16-alpine

# 4. Запустите
docker-compose up -d
```

## 📝 Best Practices

### Security

1. **Используйте strong passwords** в production
2. **Не коммитьте .env** файлы в git
3. **Настройте SSL/TLS** для production
4. **Ограничьте доступ** к портам через firewall
5. **Регулярно обновляйте** Docker образы

### Performance

1. **Настройте PostgreSQL** параметры в `docker-compose.prod.yml`
2. **Используйте volumes** для persistent данных
3. **Настройте Nginx caching** для статики
4. **Ограничьте ресурсы** через deploy.resources

### Maintenance

1. **Автоматизируйте бэкапы** (включено в prod)
2. **Мониторьте логи** регулярно
3. **Очищайте старые images**: `docker system prune`
4. **Проверяйте disk space**: `docker system df`

## 📚 Дополнительные ресурсы

- [Docker документация](https://docs.docker.com/)
- [Docker Compose документация](https://docs.docker.com/compose/)
- [PostgreSQL Docker](https://hub.docker.com/_/postgres)
- [Nginx Docker](https://hub.docker.com/_/nginx)

---

**Успешного деплоя! 🚀**
