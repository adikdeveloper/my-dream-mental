# MY DREAM MENTAL 🧠

Mental arifmetika o'qituvchilari va o'quvchilari uchun to'liq ishlaydigan web-platforma.

**Tagline:** Mental arifmetikani har kuni mashq qil, natijangni kuzat!

- O'qituvchi: login/parol → dashboard, guruhlar, o'quvchilar (unique kod), testlar, statistika, CSV eksport
- O'quvchi: `MDM-XXXXXX` kod orqali kirish → kunlik testlar, natija, streak, faol vaqt
- Stack: React + TypeScript + Vite + Tailwind + React Router + Zod + Cloudflare Workers + D1
- Deploy: bitta Worker (frontend static + `/api/*`), Workers Sites **ishlatilmaydi**

## Features

- 👩‍🏫 Teacher auth (PBKDF2-SHA256 hash, HttpOnly + Secure + SameSite cookie, server session, 7 kun)
- 🎒 Student auth (unique `MDM-XXXXXX` kod, case-insensitive, 30 kunlik sessiya, rate-limit, deaktiv kod ishlamaydi)
- 📝 Test generator (grader-bo'limlar, 5 daraja, integer-only bo'lish, takrorlanmaydigan savollar, server authoritative tekshiruv)
- ⚡ Flash-anzan rejimi — HAMMA testlar shu rejimda: har bir misolda sonlar ketma-ket chaqnab o'chadi, har misol oxirida bitta javob (`mode: flash`)
- 🎛 Test oldidan sozlash ekrani (`/student/test/:id/setup`): misollar soni (5/10/20/30/50/100), har misolda nechta son, tezlik slider, xonalik, amallar — override'lar serverda clamp'lanadi
- 🔁 Resume: 30 daqiqa ichida qayta kirsa (yangilash/ikki marta bosish) — yangi urinish yaratilmaydi, ochiq urinish davom ettiriladi
- 🌙 Dark-navy + oltin premium dizayn, sahifa animatsiyalari, hover zoom+glow
- ⏱ Test engine (countdown, progress, Enter navigatsiya, avtomatik yakunlash, offline draft + idempotent submit)
- 📊 Analytics (kunlik statistika, streak 🔥, bo'lim kesimi, 7/30 kunlik chartlar, leaderboard Top-5)
- ⏳ Active-time tracking (visibility-aware + 25s heartbeat + beforeunload saqlash)
- 📥 CSV eksport (UTF-8 BOM, o'zbek harflari buzilmaydi): students / results / daily
- 🖨 Student kod kartochkasi (nusxa ko'chirish + print)
- 📱 Mobile-first responsive (360px+), keyboard navigation, aria labels

## Tech stack

| Qatlam | Texnologiya |
|---|---|
| Frontend | React 18, TypeScript (strict), Vite 6, Tailwind 3, React Router 6, Zod |
| Backend | Cloudflare Workers (single Worker, `worker/` modullari) |
| DB | Cloudflare D1 (SQLite), `migrations/*.sql` |
| Auth | Web Crypto (PBKDF2 100k + SHA-256), HttpOnly cookies |
| Charts | Yengil custom SVG (Line/Bar/Donut/Heatmap, depsiz) |
| Test | Vitest (12 test) |

## Folder structure

```
├── src/
│   ├── components/      # ui.tsx (Button/Input/Modal/Badge/Card/StatCard/Toast/...) + Charts.tsx
│   ├── pages/
│   │   ├── Landing.tsx
│   │   ├── teacher/     # Login, Dashboard, Students, StudentDetail, Groups, Tests, TestForm, Statistics
│   │   ├── student/     # Login, Dashboard, TestRunner, Result, History, Profile
│   │   └── Settings.tsx
│   ├── layouts/         # Layouts.tsx (Root/Teacher/Student shell), guards.tsx (protected routes)
│   ├── hooks/           # useAuth.tsx, useActiveTime.ts (heartbeat + countdown)
│   ├── lib/             # i18n.ts (uz dict), api.ts, utils.ts
│   ├── types/           # Shared TS tiplari
│   ├── App.tsx main.tsx index.css
├── worker/
│   ├── index.ts              # fetch router: /api/* → handlers, qolgan → ASSETS (SPA)
│   ├── db/client.ts          # Env, D1 tiplari, date/code/JSON helpers
│   ├── db/validate.ts        # Zod sxemalar
│   ├── middleware/auth.ts    # PBKDF2, sessions, cookies, getTeacher/getStudent
│   ├── middleware/rateLimit.ts
│   ├── services/testEngine.ts# generateQuestions, calcScore, normalizeOps
│   └── routes/               # auth.ts, students.ts, groups.ts (groups+sections+levels), tests.ts, dashboard.ts (dashboards+export+heartbeat)
├── migrations/          # 0001_initial.sql (schema), 0002_seed_guard.sql
├── scripts/seed.mjs     # Dinamik seed (teacher hash + student kodlar)
├── tests/engine.test.ts # 12 unit test
├── wrangler.jsonc       # Workers + D1 + assets config
├── vite.config.ts       # @cloudflare/vite-plugin
└── vitest.config.ts     # Testlar uchun alohida (cloudflare pluginsiz)
```

## Local development

```bash
npm install
cp .env.example .env   # TEACHER_* ni o'zingizga moslang

# 1. D1 yaratish (bir marta)
npx wrangler d1 create my-dream-mental-db
# → chiqqan database_id ni wrangler.jsonc ga yozing (REPLACE_WITH_YOUR_D1_ID o'rniga)

# 2. Migration (local)
npm run db:migrate

# 3. Seed (1 teacher + 3 guruh + 10 o'quvchi + 8 bo'lim + 5 level + 5 test)
npm run db:seed
# Konsolda teacher logini va 10 ta student kodi chiqadi — saqlab oling!

# 4. Dev server (frontend + Worker API birga)
npx wrangler dev
# yoki faqat frontend: npm run dev  (API wrangler dev orqali bo'lganda ishlaydi)

# 5. Tekshiruvlar
npm run typecheck
npm run test
npm run build
```

## Environment variables

`.env.example` dan nusxa oling. `.env` gitga **chiqmaydi** (`.gitignore` da).

| Var | Ma'nosi |
|---|---|
| `TEACHER_USERNAME` / `TEACHER_EMAIL` / `TEACHER_PASSWORD` | Seed orqali yaratiladigan teacher |
| `SESSION_SECRET` | Kelajakda cookie imzolash uchun zaxira (hozir sessiyalar D1 da) |
| `APP_TIMEZONE` | `Asia/Tashkent` (kodda UTC+5 fiks offset) |

Production sirlarini `wrangler secret` orqali qo'ying, hech qachon repo ga commit qilmang.

## D1 setup

```bash
# Local SQLite (wrangler avtomatik)
npm run db:migrate        # --local
npm run db:seed           # --local

# Production
npm run db:migrate:remote # wrangler d1 migrations apply ... --remote
npm run db:seed:remote    # ehtiyotkorlik bilan (prod ga test data!)
```

Migrationlar faqat `migrations/` dagi SQL orqali — qo'lda `sqlite` ga tegmang.
Local va production bazalar alohida: `--local` vs `--remote` ni adashtirmang.

## Build / Deploy

```bash
npm run build    # tsc + vite (dist/client + worker bundle)
npm run deploy   # build + wrangler deploy
```

`wrangler.jsonc`:

- `main: worker/index.ts`, `assets.directory: ./dist/client`, binding `ASSETS`
- D1 binding: `DB` → `my-dream-mental-db`
- `compatibility_date: 2024-11-27`

Deploydan keyin:

```bash
npx wrangler d1 migrations apply my-dream-mental-db --remote
node scripts/seed.mjs --remote   # faqat birinchi marta!
```

## GitHub setup

```bash
git init
git add .
git commit -m "feat: MY DREAM MENTAL initial release"
git branch -M main
git remote add origin https://github.com/<user>/my-dream-mental.git
git push -u origin main
```

`.gitignore` da: `.env*` (`.env.example` dan tashqari), `node_modules/`, `dist/`, `.wrangler/`, `*.sqlite*`.

## API (qisqacha)

```
POST /api/auth/teacher/login   {username, password} → HttpOnly cookie
POST /api/auth/teacher/logout
POST /api/auth/teacher/password {current, password} → parol almashtirish
GET  /api/auth/me
POST /api/student/login        {code} → HttpOnly cookie
POST /api/student/logout
GET  /api/student/me

GET/POST /api/students  (+?q=&group_id=&status=&sort=&page=&limit=)
GET/PUT/DELETE /api/students/:id
POST /api/students/:id/regenerate-code
GET  /api/students/:id/statistics?days=30
GET  /api/students/:id/history?page=&limit=

GET/POST /api/groups, PUT/DELETE /api/groups/:id
GET  /api/sections, GET /api/levels
GET/POST /api/tests, PUT/DELETE /api/tests/:id
POST /api/tests/:id/start      → savollar (javobsiz!) + attempt_id
POST /api/tests/:id/submit     → {attempt_id, answers[], duration_seconds, client_request_id}
GET  /api/attempts/:id
GET  /api/teacher/attempts?student_id=&group_id=&section_id=&level=&date=&page=
GET  /api/dashboard/teacher | /api/dashboard/student
POST /api/activity/heartbeat   {active_seconds, session_id?}
GET  /api/export/students.csv | /api/export/results.csv | /api/export/daily.csv
```

Javob formati: `{ ok: true, data }` yoki `{ ok: false, error: { code, message } }`.
Xatolar: 400/401/403/404/409/429/500 — frontend o'zbekcha sodda xabar ko'rsatadi, sensitiv ma'lumot oshkor bo'lmaydi.

## Database schema (D1)

`teachers`, `teacher_sessions`, `groups`, `students (student_code UNIQUE)`, `student_sessions`,
`sections` (8), `levels` (5), `tests`, `test_attempts` (`client_request_id UNIQUE` — idempotent submit),
`test_questions` (har savol: expected/student answer, response_time_ms),
`activity_sessions`, `daily_stats (student_id, date_key UNIQUE)`, `login_attempts` (audit).
Indexlar: code, group, status, student+date, attempt, activity date.

## Muhim product qoidalari (bajarilgan)

1. ✅ Savollar serverda tekshiriladi (`worker/routes/tests.ts` → `submit`).
2. ✅ Client yuborgan score ga ishonilmaydi — ball serverda `calcScore` bilan.
3. ✅ `/start` faqat `order+text` qaytaradi, `expected_answer` hech qachon frontendga chiqmaydi.
   Tugallanmagan urinishda `GET /api/attempts/:id` ham javoblarni bermaydi (anti-cheat).
4. ✅ `client_request_id UNIQUE` → duplicate submit ikkinchi natija yaratmaydi.
5. ✅ Har attempt `uid()` (UUID) bilan.
6. ✅ Statistika to'liq DB agregatsiyasi (`daily_stats` + `test_attempts`).
7. ✅ Timezone: `Asia/Tashkent` fiks UTC+5 (`tashkentDateKey`), sanalar `YYYY-MM-DD`.
8. ✅ Frontendda hardcoded statistika yo'q — hamma narsa API dan.
9. ✅ Seed faqat `scripts/seed.mjs` orqali, production logic bilan aralashmagan.

## Troubleshooting

| Muammo | Yechim |
|---|---|
| `database_id` xato | `npx wrangler d1 list` → id ni `wrangler.jsonc` ga yozing |
| Seed dan keyin login bo'lmayapti | Konsoldagi teacher username/parolni `.env` dagi bilan solishtiring; `npm run db:seed` ni qayta yuguring |
| Student kod topilmadi | Kodni uppercase kiriting; student `active` ekanini teacher paneldan tekshiring |
| `vitest` cloudflare xatosi | Testlar `vitest.config.ts` orqali yuguradi (`npm test`) — `vite.config.ts` emas |
| 429 Rate limit | 1 daqiqa kuting (login: 10 urinish/daq) |
| Prod da API 404 | `npm run deploy` dan oldin `npm run build` chiqqanini va migration `--remote` qilinganini tekshiring |

## Keyingi rivojlantirish

- [ ] `ru`/`en` locale (`src/lib/i18n.ts` ga dict qo'shish kifoya)
- [ ] Student leaderboard (teacher toggle + privacy, hozir faqat teacher ko'radi)
- [ ] Decimal/kasr va manfiy son rejimlari (`negative_enabled`, `decimal_enabled` flaglari)
- [ ] Testga rasm/abakus (mental arifmetika vizual) qo'shish
- [ ] Push/SMS eslatmalar (kunlik streak himoyasi)
- [ ] Offline to'liq rejim (IndexedDB navbat + background sync)
- [ ] E2E testlar (Playwright) + CI (GitHub Actions: typecheck/test/build)
