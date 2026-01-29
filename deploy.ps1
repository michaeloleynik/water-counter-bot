# Production deployment script для Windows (PowerShell)
# Использование: .\deploy.ps1 [команда]

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# Цвета для вывода
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Проверка существования .env файла
function Test-EnvFile {
    if (!(Test-Path .env)) {
        Write-Error-Custom ".env файл не найден!"
        Write-Info "Скопируйте .env.production.example в .env и заполните значения"
        exit 1
    }
}

# Проверка Docker
function Test-Docker {
    try {
        docker --version | Out-Null
        docker-compose --version | Out-Null
    }
    catch {
        Write-Error-Custom "Docker или Docker Compose не установлены!"
        exit 1
    }
}

# Создание backup базы данных
function Backup-Database {
    Write-Info "Создание backup базы данных..."
    
    $BackupDir = ".\backups"
    if (!(Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir | Out-Null
    }
    
    $Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $BackupFile = "$BackupDir\backup_$Timestamp.sql"
    
    $Status = docker-compose ps postgres | Select-String "Up"
    if ($Status) {
        docker-compose exec -T postgres pg_dump -U postgres water_counter_bot | Out-File -Encoding UTF8 $BackupFile
        Write-Info "Backup создан: $BackupFile"
    }
    else {
        Write-Warn "PostgreSQL контейнер не запущен, backup пропущен"
    }
}

# Запуск production
function Start-Production {
    Test-EnvFile
    Test-Docker
    
    Write-Info "Запуск в production режиме..."
    
    # Сборка и запуск
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    
    Write-Info "Ожидание запуска сервисов..."
    Start-Sleep -Seconds 10
    
    # Проверка статуса
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
    
    Write-Info "✅ Deployment завершен!"
    Write-Info "Проверьте логи: docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f"
}

# Остановка
function Stop-Production {
    Write-Info "Остановка сервисов..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
    Write-Info "✅ Сервисы остановлены"
}

# Перезапуск
function Restart-Production {
    Write-Info "Перезапуск сервисов..."
    Backup-Database
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml restart
    Write-Info "✅ Сервисы перезапущены"
}

# Обновление
function Update-Production {
    Test-EnvFile
    Test-Docker
    
    Write-Info "Обновление production..."
    
    # Backup перед обновлением
    Backup-Database
    
    # Пересборка и плавное обновление
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps app
    
    Write-Info "✅ Обновление завершено"
}

# Просмотр логов
function Show-Logs {
    param([string[]]$Services)
    
    if ($Services) {
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=100 $Services
    }
    else {
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f --tail=100
    }
}

# Статус сервисов
function Show-Status {
    Write-Info "Статус сервисов:"
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml ps
    
    Write-Host ""
    Write-Info "Использование ресурсов:"
    docker stats --no-stream water-counter-bot water-counter-db
}

# Health check
function Test-Health {
    Write-Info "Проверка здоровья сервисов..."
    
    # Проверка PostgreSQL
    $PgStatus = docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec postgres pg_isready -U postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Info "✅ PostgreSQL: здоров"
    }
    else {
        Write-Error-Custom "❌ PostgreSQL: недоступен"
    }
    
    # Проверка API
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
        if ($Response.StatusCode -eq 200) {
            Write-Info "✅ API: здоров"
        }
    }
    catch {
        Write-Error-Custom "❌ API: недоступен"
    }
}

# Очистка
function Invoke-Cleanup {
    Write-Info "Очистка неиспользуемых Docker ресурсов..."
    docker system prune -f
    Write-Info "✅ Очистка завершена"
}

# Помощь
function Show-Help {
    @"
Water Counter Bot - Production Deployment Script (PowerShell)

Использование: .\deploy.ps1 [команда]

Команды:
    start       Запуск в production режиме
    stop        Остановка всех сервисов
    restart     Перезапуск сервисов
    update      Обновление без downtime
    logs        Просмотр логов
    status      Статус сервисов и использование ресурсов
    health      Проверка здоровья сервисов
    backup      Создание backup базы данных
    cleanup     Очистка неиспользуемых Docker ресурсов
    help        Показать эту справку

Примеры:
    .\deploy.ps1 start          # Запуск production
    .\deploy.ps1 logs           # Все логи
    .\deploy.ps1 update         # Обновление без остановки

"@
}

# Главная функция
switch ($Command.ToLower()) {
    "start" {
        Start-Production
    }
    "stop" {
        Stop-Production
    }
    "restart" {
        Restart-Production
    }
    "update" {
        Update-Production
    }
    "logs" {
        Show-Logs
    }
    "status" {
        Show-Status
    }
    "health" {
        Test-Health
    }
    "backup" {
        Backup-Database
    }
    "cleanup" {
        Invoke-Cleanup
    }
    "help" {
        Show-Help
    }
    default {
        Write-Error-Custom "Неизвестная команда: $Command"
        Show-Help
        exit 1
    }
}
