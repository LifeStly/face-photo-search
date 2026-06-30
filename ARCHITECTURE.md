# Architecture — Face Photo Search

แผนที่ระบบ ทุกไฟล์ในโค้ดต้องหาเจอจากเอกสารนี้

## ภาพรวม flow (Phase 1 — process เดียว ไม่มี Docker/Redis)

```
Canon EOS RP  ──WiFi──▶  image.canon  ──auto-forward──▶  Google Drive
                                                              │
                                                              ▼ (poll ทุก N วินาที, ใน-process)
                                              ┌──────────────────────────────────┐
                                              │  Next.js server (PhotoSearch)    │
                                              │                                  │
                                              │   ┌─ instrumentation.ts (boot)   │
                                              │   ├─ jobs/driveSync (setTimeout) │
                                              │   ├─ jobs/faceProcess (in-queue) │
                                              │   ├─ API routes + UI             │
                                              │   └─ SQLite ไฟล์ ./data          │
                                              └────────────┬─────────────────────┘
                                                           │
   user / admin  ──browser──▶  http://localhost:3000  ◀────┘
```

ไม่มี Redis ไม่มี worker container — รวมเป็น Node process เดียว

---

## ระบบหลัก: Documentation  (root)
- `project-plan.md` — แผนต้นฉบับของโปรเจค (ห้ามแก้ ใช้อ้างอิง)
- `README.md` — quick start สำหรับ Windows/Mac
- `CHANGELOG.md` — บันทึกการเปลี่ยนแปลง
- `ARCHITECTURE.md` — ไฟล์นี้

---

## ระบบหลัก: Project skeleton  (root)
- `package.json` — npm workspaces (เหลือ `apps/web` workspace เดียว)
- `.env` / `.env.example` — environment vars (paths, admin password, ฯลฯ)
- `.gitignore` — ignore node_modules, .env, data/, models/, secrets/

---

## ระบบหลัก: Web app  (`apps/web/`)

Next.js 14 (App Router) + TypeScript + Tailwind — frontend + API + background jobs in one process

### Config/build
- `package.json`, `tsconfig.json`, `next.config.js` (มี webpack externals สำหรับ native deps), `tailwind.config.ts`, `postcss.config.js`

### Pages (App Router)
- `app/layout.tsx` — root layout, inject CSS brand color, render `<Header>`, wrap children ด้วย `<SetupGate>`
- `app/components/Header.tsx` *(client)* — role-aware sticky header (Suspense + useSearchParams):
  - Admin scope (`/admin/*`): 3 nav (Folders/ภาพ/ตั้งค่า) → `?tab=` query + ADMIN badge + logout icon
  - Guest scope (`/live`, `/event/*`, `/search`, `/photo`): 2 nav (Feed + ค้นหา)
  - Welcome/default: minimal — 1 entry "Admin"
- `app/components/SearchSpinner.tsx` *(client)* — animated loading card (spinner ring + scan-line + indeterminate bar + step-list); ใช้ใน `/search` และ `/event/[code]/search` ตอน `busy`
- `app/components/FirstVisitTour.tsx` *(client)* — onboarding modal 4 ขั้น สำหรับ QR-guest ครั้งแรก (localStorage key `fps_event_tour_v1`); render ใน `app/event/[code]/page.tsx`
- `app/components/icons.tsx` — SVG icon library (stroke-style, currentColor) ใช้ร่วมทุกหน้า แทน emoji ใน core surfaces
- `app/SetupGate.tsx` *(client)* — fetch `/api/setup/status` → redirect → `/setup` ถ้ายังไม่ตั้งค่า
- `app/globals.css` — Tailwind base
- `app/PhotoGrid.tsx` *(client)* — grid + multi-select + ดาวน์โหลด (4 modes); รับ prop `urls?: PhotoUrls` ที่ flexible เพื่อให้ event pages reuse ได้
- `app/page.tsx` *(Welcome)* — หน้ายินดีต้อนรับ + การ์ดอธิบายการใช้งาน (QR/how-to/admin) — ไม่มี photo grid เพื่อไม่ให้ QR-guest ที่เปิด root URL เห็นภาพของ Live folder
- `app/live/page.tsx` *(Feed Live)* — แสดงภาพล่าสุดของ Live folder ใช้ proxy URL `/api/photos/[id]/file?size=thumb` (ของเดิมที่อยู่ใน `app/page.tsx`)
- `app/search/page.tsx` *(ค้นหา)* — เปิดกล้อง / อัพโหลด → ส่ง selfie → แสดงผล % (Live scope)
- `app/photo/[id]/page.tsx` *(ดูภาพ)* — เปิดภาพเต็มผ่าน proxy, ปุ่มดาวน์โหลด
- `app/event/[code]/layout.tsx` — wrap ด้วย `<EventGate>` (ตรวจ auth ก่อน render children)
- `app/event/[code]/EventGate.tsx` *(client)* — fetch `/api/event/[code]/info` → auto-auth ถ้า public, แสดง password form ถ้ามีรหัส
- `app/event/[code]/EventGrid.tsx` *(client)* — wrap `PhotoGrid` ด้วย scoped URL builders
- `app/event/[code]/page.tsx` *(Feed scoped)* — list ภาพของ folder ของ code นั้น
- `app/event/[code]/search/page.tsx` *(ค้นหา scoped)* — selfie search ใน folder ของ code
- `app/event/[code]/photo/[id]/page.tsx` *(ดูภาพ scoped)* — verify `photoBelongsToEvent` ก่อน render
- `app/help/page.tsx` *(server)* — คู่มือในเว็บ: sidebar list ของ topics + content area; `?topic=` query param เลือก
- `app/components/HelpButton.tsx` *(client)* — ปุ่ม ? icon/link variant → modal popup contextual help (มี "เปิดหน้าเต็ม" ลิงก์ไป /help)
- `app/setup/page.tsx` *(client)* — **Setup Wizard** 4 ขั้น (service account → password → folder → done)
- `app/admin/login/page.tsx` — admin login
- `app/admin/page.tsx` *(server)* — gate auth, render `AdminPanel` ใน `<Suspense>` (useSearchParams requirement)
- `app/admin/AdminPanel.tsx` *(client)* — URL-driven tab (`?tab=folders|photos|settings`); 3 sections: folders (DriveBrowser), photos (RunControl + PhotoModeration), settings (Branding + SetupTab)
- `app/admin/components/{RunControl,PhotoModeration,DriveBrowser,QRPanel,Branding,SetupTab,PublicAccessBanner}.tsx` — DriveBrowser ทำหน้าที่ทั้ง browse + จัดการ Live/Archive + ลบ + QR (ผ่าน `<QRPanel>`); SetupTab = reset Service Account flow (view → warn → upload → done); `PublicAccessBanner` = banner บนสุดทุก tab บอกสถานะ Cloudflare tunnel + ปุ่มเปิด/ปิด
- QRPanel auto-detect tunnel URL (poll `/api/admin/tunnel`) → ถ้า tunnel running ใช้ trycloudflare URL ใน QR, ถ้าไม่เปิด + admin บน localhost → warn ให้กดเปิด banner ก่อน
- `middleware.ts` — placeholder (gating ทำใน SetupGate client เพราะ middleware รัน edge ไม่มี fs)
- `instrumentation.ts` — Next.js hook (เปิดด้วย `experimental.instrumentationHook`) → เรียก `ensureBooted()` ทุกครั้ง server start เพื่อ resume runs ที่ค้าง

### API routes
- `app/api/photos/route.ts` *(GET)* — รายชื่อภาพ
- `app/api/photos/[id]/route.ts` *(GET)* — meta
- `app/api/photos/[id]/file/route.ts` *(GET ?size=thumb)* — **proxy stream** ภาพจาก Drive ผ่าน service account (รองรับ private folder)
- `app/api/photos/download-zip/route.ts` *(POST {ids:string[]})* — streaming ZIP ผ่าน `archiver` (store-only) → `application/zip` attachment ใช้สำหรับมัลติดาวน์โหลดบนมือถือที่ Web Share ใช้ไม่ได้ หรือ desktop ที่ไม่มี FSAA
- `app/api/search/route.ts` *(POST)* — รับ selfie → embed → match → คืน top-K (scope: Live folder)
- `app/api/admin/login/route.ts` *(POST)* — login → session cookie
- `app/api/admin/folders/route.ts` *(GET)* — list Drive folders (ใช้ใน Setup Wizard step 3 เลือก folder แรก)
- `app/api/admin/drive/folders/route.ts` *(GET)* — **aggregated folders endpoint** — รวม Drive SA list + DB (Live/Archive) + filter ignored; คืน mode/photoCount/qrEnabled/accessible/lastSyncAt ครบ (ใช้ใน Drive tab)
- `app/api/admin/folders/[folderId]/toggle-live/route.ts` *(POST)* — สลับ mode Live↔Archive (Archive→Live ต้องไม่มี Live อื่นค้าง → 409)
- `app/api/admin/folders/[folderId]/route.ts` *(DELETE)* — ลบ folder: drop DB cascade + add ignored; refuse ถ้าเป็น Live; คืน `saEmail`+`folderName` ให้ UI popup unshare guidance
- `app/api/admin/service-account/route.ts` *(GET)* — อ่าน `client_email` จาก `secrets/service-account.json` → ใช้ใน DriveBrowser โชว์ปุ่ม copy
- `app/api/admin/status/route.ts` *(GET)* — progress + queue stats (ของ Live ปัจจุบัน)
- `app/api/admin/start/route.ts` *(POST {folderId, folderName?, mode?})* — สร้าง/reuse run + เริ่ม drive-sync; mode `live`/`archive` (default `live`); ถ้า live + มี Live อื่นค้าง → 409
- `app/api/admin/runs/stop/route.ts` *(POST)* — หยุดงาน + clear queue
- `app/api/admin/runs/sync-now/route.ts` *(POST)* — บังคับ Drive sync ทันที
- `app/api/admin/runs/retry-failed/route.ts` *(POST)* — re-enqueue ภาพที่ fail
- `app/api/admin/runs/reprocess/route.ts` *(POST {folderId})* — ล้าง embeddings + reset state + re-enqueue ทั้ง run (ใช้หลังปรับ tune detection params)
- `app/api/admin/photos/route.ts` *(GET)* — list ภาพ (รวม hidden)
- `app/api/admin/photos/[id]/route.ts` *(PATCH hide/pin, DELETE)*
- `app/api/admin/settings/route.ts` *(GET/PUT)* — branding
- `app/api/setup/status/route.ts` *(GET)* — เช็คว่า setup เสร็จยัง
- `app/api/setup/service-account/route.ts` *(POST upload)* — รับไฟล์ + validate + save + `resetDriveClient()`; ครั้งแรก (setup ยังไม่เสร็จ) allow ผ่าน, ครั้งหลังต้องผ่าน `requireAdmin()`
- `app/api/setup/save/route.ts` *(POST)* — บันทึก admin password / Drive folder ลง `data/config.json`
- `app/api/admin/tunnel/route.ts` *(GET status, POST start, DELETE stop)* — spawn `cloudflared` เปิด trycloudflare URL
- `app/api/admin/folders/[folderId]/qr/route.ts` *(POST/DELETE)* — เปิด/อัพเดท/ปิด QR ของ folder; POST body `{password?: string|null}` → generate 8-char code + hash password; DELETE → ลบ event_code entry
- `app/api/event/[code]/auth/route.ts` *(POST)* — verify password → set `fps_event` session cookie (TTL 7d); public event auto-pass
- `app/api/event/[code]/info/route.ts` *(GET, public)* — แสดงชื่อ folder + `hasPassword` + `authed` (เรียกก่อน gate เพื่อตัดสิน UI)
- `app/api/event/[code]/photos/route.ts` *(GET)* — list ภาพ scope ที่ runId ของ folder (ผ่าน `gateEvent`)
- `app/api/event/[code]/photo/[id]/file/route.ts` *(GET ?size=thumb)* — proxy stream + verify photo belongs to event
- `app/api/event/[code]/search/route.ts` *(POST)* — selfie search scope (เหมือน `/api/search` แต่ scoped runId)
- `app/api/event/[code]/download-zip/route.ts` *(POST)* — multi-download scope; filter id ที่ไม่อยู่ใน scope ทิ้ง

### Lib — shared utilities
- `lib/config.ts` — env loader (typed) + default paths (data/, models/, secrets/)
- `lib/db.ts` — SQLite (better-sqlite3) + schema + helpers (`activeRun` ที่ filter `mode='live'`, `listPhotos`, `allEmbeddings`, `dropFolderData`, `addIgnored`/`removeIgnored`/`isIgnored`/`listIgnoredFolderIds`, `latestRunForFolder`/`latestRunIdForFolder`, `getEventCode`) — auto-create dir; schema ใหม่: `runs.mode` (`live`|`archive`), ตาราง `event_codes` (QR), `ignored_folders` (blocklist)
- `lib/drive.ts` — Google Drive client (service account auth, scope `drive.readonly`), `listImagesInFolder`, `listFolders`, `getFolderName`, `downloadFile`, **`downloadThumbnail(fileId, size)`** — ใช้ภาพ thumbnail สำหรับ embed (เร็วขึ้น 5-10x แทนการดาวน์โหลด full); `resetDriveClient()` clear client+email cache สำหรับ reset SA หลัง upload file ใหม่ (ไม่ต้อง restart process)
- `lib/face.ts` — face-api.js loader + `embedImage()` ที่มี SHA1 cache (50 entries), wasm backend ถ้าได้/ไม่ได้ตก CPU
- `lib/setup.ts` — `readSetup()`/`writeSetup()`/`writeServiceAccount()`/`isSetupComplete()` (อ่าน-เขียน `data/config.json`)
- `lib/tunnel.ts` — spawn/stop cloudflared, capture trycloudflare URL (เก็บ proc/state บน globalThis)
- `lib/queue.ts` — **in-process queue** (ไม่ใช้ BullMQ/Redis) — `faceQueue` (concurrency = CPU-1) + `scheduleDriveSync()`/`cancelDriveSync()` (setTimeout loop) + `clearAll()`
- `lib/boot.ts` — `ensureBooted()` resume เมื่อ server start (เรียกจาก `instrumentation.ts`); ฟื้นฟู archive run ที่ค้าง (flip completed→running ถ้ายังมี pending), re-enqueue pending photos ทุก run (live + archive), resume Drive sync ของ Live run
- `lib/auth.ts` — admin session cookie (iron-session, cookie `fps_session`, TTL 8h) + event session (cookie `fps_event`, TTL 7d, `events: {[code]: expires_at}`); helper `requireAdmin()`, `getEventSession()`, `isEventAuthed(code)`
- `lib/event.ts` — `gateEvent(code)` → verify code+auth+run, คืน `{code, folderId, runId}` หรือ error; `photoBelongsToEvent(photoId, runId)` for scope check
- `lib/similarity.ts` — euclidean + similarity %
- `lib/settings.ts` — branding settings DB get/set
- `lib/help-content.tsx` — content data ของคู่มือ in-app (6 topics: setup-first-time, share-folder, reset-sa, start-work, qr-code, delete-folder); export `HELP_TOPICS` array + `getHelpTopic(id)`

### Lib — background jobs  (`lib/jobs/`)
- `jobs/driveSync.ts` — `runDriveSync({runId,folderId,...})` ดึงรายการภาพจาก Drive → enqueue faceProcess + reschedule poll ตัวเอง
- `jobs/faceProcess.ts` — `enqueueFaceProcess()` ใส่ task ใน `faceQueue` → download thumbnail → embed → INSERT SQLite, มี retry 2 ครั้ง

### เชื่อมกับ
- → SQLite (ไฟล์ `apps/web/data/db.sqlite`)
- → Google Drive (service account, scope drive.readonly)
- → face-api models โหลดจาก `<root>/models/`

---

## ระบบหลัก: Models  (`models/`)
- pre-trained ของ face-api.js (ssd_mobilenetv1, face_landmark_68, face_recognition)
- โหลดด้วย `scripts/download-models.ps1` (Windows) — Mac/Linux เวอร์ชันจะเพิ่ม Phase 4

---

## ระบบหลัก: Scripts  (`scripts/`)
- `download-models.js` — **cross-platform** downloader (Node-only ไม่ต้อง bash/pwsh)
- `download-models.ps1` — Windows fallback
- `download-models.sh` — Mac/Linux fallback

---

## ระบบหลัก: Launchers  (root)
- `start.bat` — Windows ดับเบิลคลิก: check Node → install → models → build → start + open browser
- `start.command` — Mac/Linux ดับเบิลคลิก/bash: เหมือนกัน

---

## ระบบหลัก: Secrets  (`secrets/`)
- `service-account.json` — Google service account key (ไม่ commit, ใส่เอง)

---

## Data flow ที่สำคัญ

### A. เริ่มงานใหม่ (Live หรือ Archive)
1. Admin login → `POST /api/admin/login`
2. หน้า Drive tab โหลด folder list จาก `GET /api/admin/drive/folders` (รวม SA + DB)
3. Admin ขยาย folder card → เลือก **🚀 LIVE** หรือ **📦 Archive** → `POST /api/admin/start {folderId, mode}`
4. Server เช็ค Live อื่น (409 ถ้ามี + mode=live) → reuse run row เดิม หรือ INSERT ใหม่ → `removeIgnored(folderId)` → call `startDriveSyncNow()`
5. `runDriveSync` list Drive → INSERT photos → `enqueueFaceProcess()` ต่อภาพใหม่; เช็ค mode หลัง sync รอบแรก:
   - `live` → reschedule poll ต่อทุก `pollIntervalSec`
   - `archive` → mark `status=completed` (embed ทำต่อ background queue)
6. `faceQueue` รัน `runFaceProcess` ที่ concurrency CPU-1 → download **thumbnail** → embed → INSERT embeddings
7. Admin poll `GET /api/admin/status` ดู progress (เห็นเฉพาะ Live)

### A'. Toggle Live ↔ Archive (folder ที่มี run อยู่แล้ว)
- `POST /api/admin/folders/[folderId]/toggle-live`
- Live → Archive: `clearAll()` + `UPDATE runs SET mode='archive', status='completed'`
- Archive → Live: ต้องไม่มี Live อื่น (409) → `UPDATE runs SET mode='live', status='running'` + `startDriveSyncNow()`

### A''. ลบ folder
- `DELETE /api/admin/folders/[folderId]`
- Refuse ถ้าเป็น Live (`mode='live' AND status='running'`)
- `dropFolderData(folderId)` → cascade DELETE embeddings → photos → runs → event_codes
- `addIgnored(folderId)` → blocklist
- Return `{saEmail, folderName, deleted: {...}}` → UI โชว์ popup unshare guidance (4 steps + ปุ่มคัดลอก email)

### E. ผู้ใช้สแกน QR เข้าหน้า event
1. Admin เปิด QR ของ folder (`POST /api/admin/folders/[id]/qr` body `{password?}`) → ได้ 8-char code → QR canvas render ใน `<QRPanel>`
2. ผู้ใช้สแกน QR → เปิด URL `/event/[code]`
3. `EventGate` (client) fetch `/api/event/[code]/info`:
   - public + ยังไม่ authed → auto POST `/auth` body `{}` → ผ่าน
   - มี password + ยังไม่ authed → แสดง form → POST `/auth` body `{password}` → set `fps_event` cookie TTL 7d
   - authed → render children
4. หน้า `/event/[code]` query `listPhotos({runId})` → render `<EventGrid>` (PhotoGrid + scoped URLs)
5. กด "ค้นหาภาพตัวเอง" → `/event/[code]/search` → POST `/api/event/[code]/search` ผ่าน `gateEvent`
6. ทุก request ใต้ `/api/event/[code]/*` (ยกเว้น `/auth` และ `/info`) ผ่าน `gateEvent` guard ที่เช็ค auth + scope

### B. ผู้ใช้ค้นหา
1. หน้า `search` เปิดกล้อง → ถ่าย selfie → ส่ง blob
2. `POST /api/search` รับภาพ → server embed → euclidean vs ทุก embedding (เฉพาะที่ไม่ hidden) → top-K
3. คืน list `{photoId, similarity}` → frontend แสดง grid + %
4. คลิกภาพ → `app/photo/[id]` → ดาวน์โหลด **ภาพเต็มจาก Drive URL** (ไม่ใช่ thumbnail)

### B'. มัลติดาวน์โหลด (Feed/Search หลายภาพ) — hybrid 4 mode
ตรวจ capability ครั้งเดียวตอน mount (`useEffect` ใน `PhotoGrid.tsx`/`search/page.tsx`):
- **mobile-share**: UA = Mobile + `navigator.canShare({files:[...]})` = true → `fetchAsFiles()` ลงเป็น `File[]` → `navigator.share({files})` → OS share sheet → ผู้ใช้กด "บันทึกรูปภาพ" ลงแกลเลอรีทั้งหมดครั้งเดียว
- **mobile-zip**: UA = Mobile แต่ Web Share รับ files ไม่ได้ → POST `/api/photos/download-zip` → ได้ ZIP ดาวน์โหลด 1 ไฟล์
- **desktop-fsaa**: Desktop Chromium → `showDirectoryPicker()` → loop เขียนตรง (FSAA error กลางทาง → fall back เป็น ZIP ที่เหลือ)
- **desktop-zip**: Firefox/Safari desktop → ZIP

ถ้า `share()` ปฏิเสธ (ไม่ใช่ AbortError) → ฟอลแบ็คเป็น ZIP อัตโนมัติ

### C. Admin จัดการระหว่างงาน
- เปลี่ยน folder กลางทาง: Drive tab → "เริ่มงานที่นี่" → backend หยุด run เดิม + clear queue + สร้าง run ใหม่
- บังคับ sync ทันที: "Sync ภาพใหม่ทันที" → cancel timer + start `runDriveSync` ทันที
- ซ่อน/ลบ/pin: PhotoModeration tab
- branding: Branding tab → settings DB

### D. ปิดโปรแกรม
- Node process หยุด → in-memory queue หาย → SQLite ค้างที่ไฟล์ (สามารถ resume run ที่ status='running' ได้ตอนเปิดใหม่ ผ่าน `instrumentation.ts`)
