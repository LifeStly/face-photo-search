# แผนพัฒนาระบบค้นหาภาพจากใบหน้า (Face Photo Search)

## ภาพรวมโครงการ

ระบบเว็บแอปสำหรับงานถ่ายภาพ ให้ผู้เข้าร่วมงานค้นหาภาพตัวเองได้โดยการถ่าย selfie ภาพเก็บบน Google Drive เป็นหลัก ระบบรันบน Ubuntu VM เปิด-ปิดตามงาน เข้าถึงจากภายนอกผ่าน Cloudflare Tunnel

---

## Architecture

```
กล้อง Canon EOS RP
       ↓ WiFi auto-upload
   image.canon
       ↓ auto-forward
   Google Drive (เก็บภาพถาวร)
       ↓ Drive API ดึงมา process
   Ubuntu VM (รันระหว่างงาน)
   ├── Next.js (frontend + API)
   ├── face-api.js (face embedding)
   ├── SQLite in-memory (เก็บ embedding ชั่วคราว)
   └── Cloudflare Tunnel
              ↓
   ผู้ใช้เข้าเว็บ → ถ่าย selfie → เจอภาพตัวเอง
```

---

## Stack ที่ใช้ (ฟรีทั้งหมด)

| Component | Technology | หมายเหตุ |
|-----------|-----------|---------|
| Frontend | Next.js 14 + React | หน้าเว็บผู้ใช้ + Admin |
| Face AI | face-api.js | รันบน server, ฟรี open source |
| Database | SQLite (in-memory) | ลบหายเมื่อปิด VM ✓ |
| Image resize | Sharp | ลดขนาดก่อน process เร็วขึ้น 3-5x |
| Queue | BullMQ + Redis | process ภาพ background |
| Drive API | googleapis (npm) | ดึงภาพจาก Drive |
| Tunnel | Cloudflare Tunnel | URL สาธารณะ ฟรี |
| OS | Ubuntu 22.04 LTS | รันใน VM |
| Container | Docker + Docker Compose | รันทุกอย่างพร้อมกัน |

---

## Workflow การใช้งาน

### ก่อนงาน (ทำครั้งเดียวตอนตั้งค่า)
- [ ] ตั้งค่า VM Ubuntu + ติดตั้ง Docker
- [ ] ตั้งค่า Cloudflare Tunnel (named tunnel → URL คงที่)
- [ ] ผูก Google Drive API + Service Account
- [ ] ตั้งค่า systemd ให้รัน Docker และ Tunnel อัตโนมัติเมื่อ VM boot

### ต่อจากนั้นทุกงาน (5 นาที)
1. สร้าง folder งานใน Google Drive เช่น `2025-07-04_งานรับปริญญา`
2. เปิด VM → ระบบรัน Docker + Tunnel อัตโนมัติ
3. เข้า Admin panel → เลือก folder งาน → กด Start
4. ระบบดึงภาพจาก Drive มา process embedding อัตโนมัติ
5. แชร์ URL หรือ QR code ให้แขกงาน

### ระหว่างงาน
- ภาพใหม่จากกล้องขึ้น Drive → ระบบดึงมา process อัตโนมัติ
- ผู้ใช้เปิดเว็บ → ถ่าย selfie → เจอภาพตัวเองใน ~3 วินาที
- กดโหลดภาพได้เลย (โหลดจาก Drive โดยตรง)

### หลังงาน
- ปิด VM → ข้อมูล embedding ลบหมด
- ภาพต้นฉบับยังอยู่บน Drive ครบ

---

## หน้าเว็บ

### หน้าผู้ใช้ (User)
- **Feed** — แสดงภาพล่าสุดจากงาน, กรองภาพหมู่ได้
- **ค้นหา** — ถ่าย selfie หรืออัพโหลดรูป → แสดงภาพที่มีตัวเอง พร้อม % ความเหมือน
- **ดูภาพ** — โหลดภาพ, แชร์

### หน้า Admin (ช่างภาพ)
- เลือก / สร้าง folder งาน
- ดู progress การ process ภาพ
- Monitor สถานะระบบ

---

## Hardware ที่ต้องการ

| ส่วน | ขั้นต่ำ | แนะนำ |
|------|---------|-------|
| RAM (VM) | 6 GB | 8 GB |
| CPU (VM) | 4 core | 4-6 core |
| Storage (VM) | 20 GB | 30 GB |
| RAM (เครื่องหลัก) | 16 GB | 16 GB+ |
| Internet upload | 10 Mbps | 20 Mbps+ |

รองรับผู้ใช้พร้อมกัน: **30-50 คน** ด้วยสเปค RAM 8 GB, 4 CPU

---

## Phases การพัฒนา

### Phase 1 — ตั้งค่า VM และ Infrastructure
- [ ] ติดตั้ง Ubuntu VM (VirtualBox / VMware / Hyper-V)
- [ ] ติดตั้ง Docker + Docker Compose
- [ ] ตั้งค่า Cloudflare Tunnel (named tunnel)
- [ ] ทดสอบ URL เข้าถึงได้จากภายนอก
- [ ] ตั้งค่า systemd service (auto-start เมื่อ VM boot)

### Phase 2 — Google Drive Integration
- [ ] สร้าง Google Cloud Project
- [ ] ตั้งค่า Service Account + Drive API
- [ ] เขียน script ดึงภาพจาก folder
- [ ] ทดสอบ polling ภาพใหม่

### Phase 3 — Face Processing
- [ ] ติดตั้ง face-api.js + โหลด model
- [ ] เขียน pipeline: ดึงภาพ → resize → detect faces → สร้าง embedding
- [ ] เก็บ embedding ลง SQLite in-memory
- [ ] ทดสอบความเร็ว (เป้าหมาย < 3 วิ/ภาพ)

### Phase 4 — Frontend
- [ ] หน้า Feed แสดงภาพล่าสุด
- [ ] หน้าค้นหาด้วย selfie (เปิดกล้อง + อัพโหลด)
- [ ] แสดงผลภาพพร้อม % ความเหมือน
- [ ] ปุ่มโหลดภาพ

### Phase 5 — Admin Panel
- [ ] Login (ป้องกันคนอื่นเข้า)
- [ ] เลือก folder งาน
- [ ] Monitor progress การ process
- [ ] Dashboard สถานะระบบ

### Phase 6 — Auto-start และ Polish
- [ ] ตั้งค่าให้ทุกอย่างรันอัตโนมัติเมื่อเปิด VM
- [ ] ทดสอบ end-to-end กับภาพจริง
- [ ] ทดสอบ 30 คนพร้อมกัน
- [ ] QR code สำหรับแชร์ URL

---

## ไฟล์ที่จะสร้าง

```
project/
├── docker-compose.yml          # รัน app + redis พร้อมกัน
├── .env                        # config (Drive credentials, etc.)
├── apps/
│   ├── web/                    # Next.js frontend + API
│   │   ├── pages/
│   │   │   ├── index.tsx       # Feed
│   │   │   ├── search.tsx      # ค้นหา selfie
│   │   │   └── admin/
│   │   └── api/
│   │       ├── search.ts       # API ค้นหา
│   │       ├── photos.ts       # API ดึงภาพ
│   │       └── admin/
│   └── worker/                 # Background face processing
│       ├── driveSync.ts        # ดึงภาพจาก Drive
│       ├── faceProcess.ts      # สร้าง embedding
│       └── queue.ts            # BullMQ jobs
├── scripts/
│   └── setup-tunnel.sh         # ตั้งค่า Cloudflare Tunnel
└── systemd/
    └── photo-app.service       # auto-start เมื่อ VM boot
```

---

## ข้อมูลสำคัญ

- **ภาพไม่เก็บบน VM** — ดึงมา process แล้วลบ เก็บแค่ URL และ embedding
- **Embedding หายเมื่อปิด VM** — ต้อง process ใหม่ทุกงาน (ใช้เวลา ~2-5 นาทีสำหรับ 200 ภาพ)
- **URL คงที่** — Cloudflare named tunnel ทำให้ URL เดิมทุกงาน ทำ QR code ได้เลย
- **ฟรีทั้งหมด** — ไม่มีค่าใช้จ่าย นอกจากค่าไฟเครื่องหลัก
