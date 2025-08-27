# Performance & Internationalization Guide

## 🚀 Улучшения производительности

### Redis кеширование
- **Модуль**: `backend/services/cache/RedisCache.js`
- **Функции**:
  - Кеширование рыночных данных (TTL: 5 мин)
  - Кеширование пользовательских сессий (TTL: 1 час)
  - Кеширование балансов пользователей (TTL: 30 мин)
  - Rate limiting для защиты API
  - Fallback на локальный кеш при недоступности Redis

### Database Connection Pooling
- **Увеличенный пул соединений**: 50 соединений (было 20)
- **Минимальные соединения**: 5
- **Оптимизированные таймауты**: соединения, получение, создание
- **Keep-alive**: поддержание соединений активными

### Комплексные индексы базы данных
- **Пользователи**: email, username, дата создания
- **Балансы**: пользователь+валюта, валюта, дата обновления
- **Ордера**: пользователь+статус, пара+статус, цена+сторона
- **Сделки**: пользователь+дата, пара+дата, ордер
- **Депозиты/Выводы**: статус, хеш транзакции, подтверждения
- **Частичные индексы**: только для активных записей

### WebSocket масштабирование
- **Модуль**: `backend/services/trading/WebSocketManagerWithRedis.js`
- **Функции**:
  - Redis pub/sub для синхронизации между серверами
  - Heartbeat и автоматическая очистка неактивных соединений
  - Кеширование order book'ов
  - Масштабирование на несколько серверов

## 🌍 Поддержка многих языков

### Поддерживаемые языки
- **Английский** (en) - по умолчанию
- **Русский** (ru) - полная локализация
- **Китайский** (zh) - полная локализация
- **Чешский** (cs) - полная локализация
- **Казахский** (kk) - полная локализация

### Структура переводов
```
frontend/src/i18n/
├── index.js          # Конфигурация i18n
└── locales/
    ├── en.json       # Английский
    ├── ru.json       # Русский
    ├── zh.json       # Китайский
    ├── cs.json       # Чешский
    └── kk.json       # Казахский
```

### Основные разделы переводов
- **common**: общие элементы (кнопки, сообщения)
- **nav**: навигация
- **auth**: авторизация и регистрация
- **dashboard**: панель управления
- **trading**: торговля
- **wallet**: кошелек
- **account**: настройки аккаунта
- **security**: безопасность
- **markets**: рынки
- **errors**: сообщения об ошибках
- **success**: сообщения об успехе
- **time**: относительное время

### Использование переводов

#### В компонентах
```jsx
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button>{t('common.save')}</button>
    </div>
  )
}
```

#### С параметрами
```jsx
{t('trading.placeOrder', { type: 'BUY' })}
{t('wallet.minimumWithdrawal', { amount: '0.001', currency: 'BTC' })}
```

#### Множественное число
```jsx
{t('time.minutesAgo', { count: 5 })} // "5 minutes ago"
```

### Переключатель языков
- **Компонент**: `frontend/src/components/common/LanguageSwitch.jsx`
- **Расположение**: в Header справа от навигации
- **Функции**:
  - Автоматическое определение языка браузера
  - Сохранение выбора в localStorage
  - Переключение в реальном времени
  - Визуальные флаги стран

## 📁 Обновленные файлы

### Backend (производительность)
- `backend/services/cache/RedisCache.js` - новый
- `backend/services/price-data/priceService.js` - обновлен
- `backend/services/trading/WebSocketManagerWithRedis.js` - новый
- `backend/database/postgres.js` - обновлен

### Frontend (i18n)
- `frontend/src/i18n/` - новая папка
- `frontend/src/components/common/LanguageSwitch.jsx` - новый
- `frontend/src/components/common/Header.jsx` - обновлен
- `frontend/src/components/auth/Login.jsx` - обновлен
- `frontend/src/components/auth/Register.jsx` - обновлен
- `frontend/src/pages/DashboardPage.jsx` - обновлен
- `frontend/src/pages/TradingPage.jsx` - обновлен
- `frontend/src/pages/WalletPage.jsx` - обновлен
- `frontend/src/components/trading/OrderForm.jsx` - обновлен
- `frontend/src/main.jsx` - обновлен

## 🔧 Настройка

### Redis (опционально)
```bash
# Установка Redis
# Windows: скачать с https://redis.io/download
# Linux: apt install redis-server
# macOS: brew install redis

# Запуск Redis
redis-server

# Настройка переменных окружения
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### База данных
```bash
# Настройка переменных окружения для оптимального пула соединений
DB_POOL_MAX=50
DB_POOL_MIN=5
```

### Языки
Язык автоматически определяется браузером. Для принудительной установки:
```javascript
// В консоли браузера
localStorage.setItem('i18nextLng', 'ru')
window.location.reload()
```

## 📊 Метрики производительности

### До улучшений
- Пул соединений DB: 20
- Кеширование: только локальное
- WebSocket: один сервер
- Индексы: базовые

### После улучшений
- Пул соединений DB: 50
- Кеширование: Redis + локальное
- WebSocket: масштабируемые
- Индексы: комплексные + частичные

### Ожидаемые улучшения
- **Время ответа API**: -50-70%
- **Пропускная способность**: +200-300%
- **Масштабируемость WebSocket**: горизонтальная
- **Использование памяти**: оптимизировано

## 🌐 Добавление новых языков

1. Создать файл перевода:
   ```bash
   cp frontend/src/i18n/locales/en.json frontend/src/i18n/locales/fr.json
   ```

2. Перевести все строки в новом файле

3. Добавить в конфигурацию:
   ```javascript
   // frontend/src/i18n/index.js
   import frTranslations from './locales/fr.json'
   
   const resources = {
     // ...
     fr: { translation: frTranslations }
   }
   ```

4. Добавить в переключатель языков:
   ```javascript
   // frontend/src/components/common/LanguageSwitch.jsx
   const languages = [
     // ...
     { code: 'fr', name: 'Français', flag: '🇫🇷' }
   ]
   ```

## 🚦 Тестирование

### Производительность
```bash
# Тест нагрузки Redis
redis-benchmark -h localhost -p 6379 -n 100000

# Мониторинг подключений к БД
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### i18n
1. Откройте приложение в браузере
2. Переключите язык через выпадающее меню
3. Проверьте перевод всех интерфейсных элементов
4. Проверьте сохранение выбора при перезагрузке

Приложение готово к международному использованию и высоким нагрузкам! 🎉