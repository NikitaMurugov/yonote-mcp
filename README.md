# yonote-mcp

[![pipeline](https://gitlab.com/NikitaMurugov/yonote-mcp/badges/main/pipeline.svg)](https://gitlab.com/NikitaMurugov/yonote-mcp/-/pipelines)
[![coverage](https://gitlab.com/NikitaMurugov/yonote-mcp/badges/main/coverage.svg)](https://gitlab.com/NikitaMurugov/yonote-mcp/-/graphs/main/charts)

MCP-сервер для управления рабочим пространством [Yonote](https://yonote.ru) через AI-ассистенты (Claude, Cursor и другие).

Предоставляет 56 инструментов для работы с документами, коллекциями, пользователями, группами, комментариями, ссылками общего доступа, избранным, ревизиями, событиями и просмотрами.

## Возможности

| Группа | Кол-во | Описание |
|---|---|---|
| Документы | 18 | CRUD, поиск, архивация, перемещение, управление доступом |
| Коллекции | 10 | Управление коллекциями, участниками, экспорт |
| Пользователи | 5 | Список, приглашение, блокировка, активация |
| Группы | 6 | Управление группами и их участниками |
| Комментарии | 4 | CRUD комментариев к документам |
| Шаринг | 4 | Публичные ссылки на документы |
| Избранное | 3 | Управление избранным |
| Ревизии | 2 | История версий документов |
| События | 1 | Аудит-лог рабочего пространства |
| Просмотры | 2 | Статистика просмотров |
| Авторизация | 1 | Информация о текущем пользователе и команде |

## Требования

- Node.js >= 18
- npm
- API-токен Yonote

## Установка

```bash
git clone <url-репозитория>
cd yonote-mcp
npm install
npm run build
```

## Получение API-токена

1. Откройте Yonote и перейдите в **Настройки** -> **API**
2. Создайте новый персональный API-токен
3. Используйте токен при подключении (см. ниже)

> Токен действует от имени вашего пользователя и имеет те же права доступа.

## Конфигурация

Токен и проект можно передать двумя способами:

### Способ 1: CLI-аргументы (рекомендуется)

Передавайте параметры прямо в конфигурации MCP-клиента — без `.env` файлов:

| Аргумент | Обязательный | Описание |
|---|---|---|
| `--token` | Да | API-токен Yonote |
| `--project` | Нет | Название проекта (формирует URL `https://{project}.yonote.ru/api`) |
| `--base-url` | Нет | Полный базовый URL API (если нужен нестандартный URL) |

> По умолчанию используется `https://app.yonote.ru/api`. Если передан `--project`, URL формируется автоматически.

### Способ 2: Переменные окружения

Создайте файл `.env` на основе `.env.example`:

```bash
cp .env.example .env
```

```
YONOTE_API_TOKEN=ваш-токен
YONOTE_PROJECT=ваш-проект
YONOTE_API_BASE_URL=https://ваш-проект.yonote.ru/api
```

> CLI-аргументы имеют приоритет над переменными окружения.

## Локальное подключение (stdio)

При локальном подключении MCP-клиент запускает сервер как дочерний процесс и общается с ним через stdin/stdout.

### Claude Desktop

Отредактируйте файл конфигурации:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "yonote": {
      "command": "node",
      "args": [
        "/абсолютный/путь/к/yonote-mcp/dist/index.js",
        "--token", "ваш-токен",
        "--project", "ваш-проект"
      ]
    }
  }
}
```

Перезапустите Claude Desktop.

### Claude Code

```bash
claude mcp add yonote -- node /абсолютный/путь/к/yonote-mcp/dist/index.js --token ваш-токен --project ваш-проект
```

Или добавьте в `.claude/settings.json` проекта:

```json
{
  "mcpServers": {
    "yonote": {
      "command": "node",
      "args": [
        "/абсолютный/путь/к/yonote-mcp/dist/index.js",
        "--token", "ваш-токен",
        "--project", "ваш-проект"
      ]
    }
  }
}
```

### Cursor

Откройте **Settings** -> **MCP Servers** -> **Add new MCP server** и укажите:

```json
{
  "mcpServers": {
    "yonote": {
      "command": "node",
      "args": [
        "/абсолютный/путь/к/yonote-mcp/dist/index.js",
        "--token", "ваш-токен",
        "--project", "ваш-проект"
      ]
    }
  }
}
```

### Другие MCP-клиенты

Любой MCP-клиент с поддержкой stdio-транспорта может использовать этот сервер. Общий паттерн:

- **command**: `node`
- **args**: `["/путь/к/yonote-mcp/dist/index.js", "--token", "ваш-токен", "--project", "ваш-проект"]`

## Удалённое развертывание (HTTP)

Для подключения с удалённых машин сервер поддерживает режим Streamable HTTP транспорта.

### Запуск в HTTP-режиме

```bash
YONOTE_API_TOKEN=ваш-токен TRANSPORT=http PORT=3000 node dist/index.js
```

Сервер запустится на `http://0.0.0.0:3000/mcp`.

Также доступен эндпоинт `/health` для проверки состояния.

### Подключение удалённого клиента

В конфигурации MCP-клиента укажите URL сервера:

```json
{
  "mcpServers": {
    "yonote": {
      "url": "http://ваш-сервер:3000/mcp"
    }
  }
}
```

### Docker

Соберите образ (убедитесь, что проект скомпилирован — `npm run build`):

```bash
docker build -t yonote-mcp .
```

Запустите контейнер:

```bash
docker run -d \
  -p 3000:3000 \
  -e YONOTE_API_TOKEN=ваш-токен \
  --name yonote-mcp \
  yonote-mcp
```

Подключение клиента — аналогично HTTP-режиму выше.

### Docker Compose

```yaml
services:
  yonote-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - YONOTE_API_TOKEN=ваш-токен
    restart: unless-stopped
```

```bash
docker compose up -d
```

### Рекомендации по продакшену

- Используйте HTTPS (через reverse proxy — nginx, Caddy, Traefik)
- Не зашивайте токен в Docker-образ — передавайте через переменные окружения или секреты
- Ограничьте доступ к серверу по сети (firewall, VPN)

## Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|---|---|---|---|
| `YONOTE_API_TOKEN` | Да | — | API-токен Yonote (или `--token`) |
| `YONOTE_PROJECT` | Нет | `app` | Название проекта (или `--project`) |
| `YONOTE_API_BASE_URL` | Нет | `https://{project}.yonote.ru/api` | Базовый URL API (или `--base-url`) |
| `TRANSPORT` | Нет | `stdio` | Транспорт: `stdio` или `http` |
| `PORT` | Нет | `3000` | Порт HTTP-сервера (только для `TRANSPORT=http`) |

## Доступные инструменты

<details>
<summary><b>Документы (18)</b></summary>

| Инструмент | Описание |
|---|---|
| `documents_list` | Список документов с фильтрацией по коллекции, пользователю, статусу |
| `documents_info` | Информация о документе по ID или share ID |
| `documents_search` | Полнотекстовый поиск по документам |
| `documents_search_titles` | Быстрый поиск по заголовкам |
| `documents_create` | Создание документа (Markdown) |
| `documents_update` | Обновление заголовка, текста и свойств |
| `documents_delete` | Перемещение в корзину или удаление |
| `documents_archive` | Архивация документа |
| `documents_restore` | Восстановление из архива или корзины |
| `documents_move` | Перемещение в другую коллекцию |
| `documents_duplicate` | Создание копии документа |
| `documents_drafts` | Список черновиков текущего пользователя |
| `documents_viewed` | Недавно просмотренные документы |
| `documents_unpublish` | Возврат в статус черновика |
| `documents_users` | Список пользователей с доступом |
| `documents_add_user` | Предоставление доступа пользователю |
| `documents_remove_user` | Отзыв доступа у пользователя |
| `documents_children` | Вложенная структура дочерних документов |

</details>

<details>
<summary><b>Коллекции (10)</b></summary>

| Инструмент | Описание |
|---|---|
| `collections_list` | Список всех доступных коллекций |
| `collections_info` | Информация о коллекции |
| `collections_create` | Создание коллекции |
| `collections_update` | Обновление свойств коллекции |
| `collections_delete` | Удаление коллекции со всеми документами |
| `collections_documents` | Дерево документов коллекции |
| `collections_add_user` | Предоставление доступа пользователю |
| `collections_remove_user` | Отзыв доступа у пользователя |
| `collections_memberships` | Список участников коллекции |
| `collections_export` | Экспорт коллекции (Markdown/HTML/JSON) |

</details>

<details>
<summary><b>Пользователи (5)</b></summary>

| Инструмент | Описание |
|---|---|
| `users_list` | Список участников рабочего пространства |
| `users_info` | Информация о пользователе |
| `users_create` | Приглашение нового пользователя |
| `users_suspend` | Блокировка учётной записи |
| `users_activate` | Разблокировка учётной записи |

</details>

<details>
<summary><b>Группы (6)</b></summary>

| Инструмент | Описание |
|---|---|
| `groups_list` | Список всех групп |
| `groups_info` | Информация о группе |
| `groups_create` | Создание группы |
| `groups_update` | Обновление имени группы |
| `groups_delete` | Удаление группы |
| `groups_memberships` | Список участников группы |

</details>

<details>
<summary><b>Комментарии (4)</b></summary>

| Инструмент | Описание |
|---|---|
| `comments_list` | Список комментариев к документу или в коллекции |
| `comments_create` | Добавление комментария к документу |
| `comments_update` | Обновление комментария |
| `comments_delete` | Удаление комментария |

</details>

<details>
<summary><b>Шаринг (4)</b></summary>

| Инструмент | Описание |
|---|---|
| `shares_list` | Список расшаренных документов/коллекций |
| `shares_info` | Информация о ссылке общего доступа |
| `shares_create` | Создание публичной ссылки |
| `shares_delete` | Отзыв публичной ссылки |

</details>

<details>
<summary><b>Избранное (3)</b></summary>

| Инструмент | Описание |
|---|---|
| `stars_list` | Список избранных документов и коллекций |
| `stars_create` | Добавление в избранное |
| `stars_delete` | Удаление из избранного |

</details>

<details>
<summary><b>Ревизии (2)</b></summary>

| Инструмент | Описание |
|---|---|
| `revisions_list` | История версий документа |
| `revisions_info` | Получение конкретной версии документа |

</details>

<details>
<summary><b>События (1)</b></summary>

| Инструмент | Описание |
|---|---|
| `events_list` | Аудит-лог рабочего пространства |

</details>

<details>
<summary><b>Просмотры (2)</b></summary>

| Инструмент | Описание |
|---|---|
| `views_list` | Статистика просмотров документа |
| `views_create` | Фиксация просмотра документа |

</details>

<details>
<summary><b>Авторизация (1)</b></summary>

| Инструмент | Описание |
|---|---|
| `auth_info` | Информация о текущем пользователе и команде |

</details>

### Транзакции базы данных

`database_transaction` принимает `changes` — **объект**, где ключи являются UUID
таблиц, а значения — непустыми массивами операций `{path, op, val}`. На API
отправляется сам этот объект, **без оболочки `changes`**:

```json
{
  "87b3e5c8-e04a-45a9-9e04-f8a1454cc3f3": [
    {
      "path": "rows.1a83bc3c-12fb-4f76-bdb9-dc067b07e668.title",
      "op": "update",
      "val": "Новое название"
    }
  ]
}
```

Поддерживаются `add`, `update`, `remove`. Поле `val` обязательно; допускает JSON,
включая явный `null`. Старый вход `changes: [...]` больше не поддерживается.
Тело транзакции описано в
[официальной спецификации](https://yonote.ru/openapi-3.json), но указанный там
маршрут `POST /api/database/transaction` вернул `404 Endpoint not found` при
проверке на используемом сервере. MCP использует **`POST /api/v2/database/transaction`**:
этот путь подтверждён кодом публичного
[frontend bundle Yonote](https://cdn.s.yonote.ru/static/assets/stores-DVyGKHcj.js)
(`baseUrl: /api/v2`, `database.transaction` → `/database/transaction`).
Общий API base URL остаётся `https://<project>.yonote.ru/api`, без `/v2`:
версия добавляется только для транзакций, остальные инструменты остаются на v1.
Доступность этого маршрута с API-ключом нужно проверить отдельно;
frontend-путь сам по себе не доказывает совместимость авторизации.

Создание строки описано операцией `add` с `path: rows.<UUID>` и объектом строки
в `val` (`type: row`); `documents_create` создаёт обычный документ, а не строку.
Спецификация не задаёт минимальный обязательный набор полей строки, поэтому
инструмент не конструирует объект строки автоматически.

При ошибке записи **не повторяйте запрос автоматически**: сначала проверьте
состояние затронутых строк. Исправление тела не гарантирует устранения
`404 Endpoint not found` — маршрут должен поддерживаться развёртыванием Yonote.
После сборки перезапустите MCP / OpenCode, чтобы загрузить новую схему инструмента.

## Разработка

```bash
npm run build    # Компиляция TypeScript
npm start        # Запуск (stdio-режим)
npm test         # Запуск тестов
```

### Структура проекта

```
src/
├── index.ts          # Точка входа, настройка транспорта
├── api-client.ts     # HTTP-клиент для Yonote API
└── tools/            # Инструменты MCP
    ├── documents.ts
    ├── collections.ts
    ├── users.ts
    ├── groups.ts
    ├── comments.ts
    ├── shares.ts
    ├── stars.ts
    ├── revisions.ts
    ├── events.ts
    ├── views.ts
    └── auth.ts
```
