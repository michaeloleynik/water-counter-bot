#!/bin/bash

# Production deployment script для Water Counter Bot
# Использование: ./deploy.sh [команда]

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка существования .env файла
check_env() {
    if [ ! -f .env ]; then
        log_error ".env файл не найден!"
        log_info "Скопируйте .env.production.example в .env и заполните значения"
        exit 1
    fi
}

# Проверка Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker не установлен!"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose не установлен!"
        exit 1
    fi
}

# Создание backup базы данных
backup_db() {
    log_info "Создание backup базы данных..."
    
    BACKUP_DIR="./backups"
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql"
    
    if docker-compose ps postgres | grep -q "Up"; then
        docker-compose exec -T postgres pg_dump -U postgres water_counter_bot > "$BACKUP_FILE"
        log_info "Backup создан: $BACKUP_FILE"
    else
        log_warn "PostgreSQL контейнер не запущен, backup пропущен"
    fi
}

# Запуск production
start_prod() {
    check_env
    check_docker
    
    log_info "Запуск в production режиме..."
    
    # Пул последних изменений (если используется git)
    if [ -d .git ]; then
        log_info "Обновление кода из git..."
        git pull
    fi
    
    # Сборка и запуск
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    
    log_info "Ожидание запуска сервисов..."
    sleep 10
    
    # Проверка статуса
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
    
    log_info "✅ Deployment завершен!"
    log_info "Проверьте логи: docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
}

# Остановка
stop_prod() {
    log_info "Остановка сервисов..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
    log_info "✅ Сервисы остановлены"
}

# Перезапуск
restart_prod() {
    log_info "Перезапуск сервисов..."
    backup_db
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart
    log_info "✅ Сервисы перезапущены"
}

# Обновление без downtime
update_prod() {
    check_env
    check_docker
    
    log_info "Обновление production..."
    
    # Backup перед обновлением
    backup_db
    
    # Обновление кода
    if [ -d .git ]; then
        git pull
    fi
    
    # Пересборка и плавное обновление
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps app
    
    log_info "✅ Обновление завершено"
}

# Просмотр логов
logs_prod() {
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=100 "$@"
}

# Статус сервисов
status_prod() {
    log_info "Статус сервисов:"
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
    
    echo ""
    log_info "Использование ресурсов:"
    docker stats --no-stream water-counter-bot water-counter-db
}

# Health check
health_check() {
    log_info "Проверка здоровья сервисов..."
    
    # Проверка PostgreSQL
    if docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres pg_isready -U postgres &> /dev/null; then
        log_info "✅ PostgreSQL: здоров"
    else
        log_error "❌ PostgreSQL: недоступен"
    fi
    
    # Проверка API
    if curl -f http://localhost:3000/api/health &> /dev/null; then
        log_info "✅ API: здоров"
    else
        log_error "❌ API: недоступен"
    fi
}

# Очистка старых образов
cleanup() {
    log_info "Очистка неиспользуемых Docker ресурсов..."
    docker system prune -f
    log_info "✅ Очистка завершена"
}

# Помощь
show_help() {
    cat << EOF
Water Counter Bot - Production Deployment Script

Использование: ./deploy.sh [команда]

Команды:
    start       Запуск в production режиме
    stop        Остановка всех сервисов
    restart     Перезапуск сервисов
    update      Обновление без downtime
    logs        Просмотр логов (можно указать сервис: logs app)
    status      Статус сервисов и использование ресурсов
    health      Проверка здоровья сервисов
    backup      Создание backup базы данных
    cleanup     Очистка неиспользуемых Docker ресурсов
    help        Показать эту справку

Примеры:
    ./deploy.sh start                 # Запуск production
    ./deploy.sh logs app              # Логи только app
    ./deploy.sh update                # Обновление без остановки
    
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps    # Ручной статус
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres psql -U postgres water_counter_bot

EOF
}

# Главная функция
main() {
    case "${1:-help}" in
        start)
            start_prod
            ;;
        stop)
            stop_prod
            ;;
        restart)
            restart_prod
            ;;
        update)
            update_prod
            ;;
        logs)
            shift
            logs_prod "$@"
            ;;
        status)
            status_prod
            ;;
        health)
            health_check
            ;;
        backup)
            backup_db
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "Неизвестная команда: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
