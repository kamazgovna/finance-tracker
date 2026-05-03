# Finance Tracker

Семейный финансовый трекер: доходы, расходы, долги, лимиты, цели и месячный бюджет.

## Стек

- React 18 + TypeScript
- Vite + Tailwind
- Zustand
- Supabase Auth + Postgres + Realtime
- PWA через `vite-plugin-pwa`

## Быстрый старт

```bash
npm ci
cp .env.example .env.local
npm run dev
```

В `.env.local` нужно указать:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`

## Supabase

1. Создай Supabase project.
2. Открой SQL Editor.
3. Выполни файл `supabase/schema.sql`.
4. Добавь пользователей через Supabase Auth.
5. Добавь разрешенных пользователей в `finance_members`:

```sql
insert into public.finance_members (user_id)
values ('AUTH_USER_UUID_HERE');
```

Все финансовые таблицы закрыты RLS-политиками. Доступ есть только пользователям из `finance_members`.

## Команды

```bash
npm run build
npm run preview
```

## Backup

В настройках есть экспорт JSON. Он включает:

- долги
- доходы
- расходы
- лимиты
- цели
- локальные настройки валюты

Импорт нужен для восстановления данных в Supabase и должен использоваться аккуратно, потому что это семейные финансовые данные.
