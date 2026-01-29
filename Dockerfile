# Этап 1: Сборка приложения
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая dev для сборки)
RUN npm install && \
    npm cache clean --force

# Копируем исходный код
COPY . .

# Компилируем TypeScript
RUN npm run build

# Этап 2: Продакшн образ
FROM node:20-alpine

WORKDIR /app

# Установка шрифтов для поддержки кириллицы в PDF
RUN apk add --no-cache font-dejavu

# Устанавливаем только production зависимости
COPY package*.json ./
RUN npm install --omit=dev && \
    npm cache clean --force

# Копируем скомпилированный код из builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/database/schema.sql ./dist/database/

# Создаем директорию для загрузок
RUN mkdir -p /app/uploads && \
    chown -R node:node /app

# Используем непривилегированного пользователя
USER node

# Открываем порт
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Запуск приложения
CMD ["node", "dist/index.js"]
