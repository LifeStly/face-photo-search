#!/usr/bin/env bash
# One-shot setup: ติดตั้ง dep + ดาวน์โหลด model + start docker stack
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

echo "[1/4] ตรวจสอบ Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "ไม่พบ Docker — ติดตั้งก่อน: https://docs.docker.com/engine/install/ubuntu/" >&2
  exit 1
fi

echo "[2/4] เตรียม .env"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "  สร้าง .env จาก template — โปรดแก้ ADMIN_PASSWORD, SESSION_SECRET, DRIVE_DEFAULT_FOLDER_ID"
fi

echo "[3/4] ดาวน์โหลด face-api models"
bash "$ROOT/scripts/download-models.sh"

echo "[4/4] ตรวจ secrets/service-account.json"
if [[ ! -f secrets/service-account.json ]]; then
  mkdir -p secrets
  echo "  ⚠ ยังไม่มี secrets/service-account.json"
  echo "    สร้าง Google Cloud service account, ดาวน์โหลด key, แล้ววางที่นี่"
  echo "    จากนั้นแชร์ Drive folder ของงานให้ service account email อ่านได้"
fi

echo
echo "พร้อมแล้ว — ใช้คำสั่งต่อไปนี้:"
echo "  docker compose up --build      # รัน + build ครั้งแรก"
echo "  docker compose up -d           # รัน background"
echo "  docker compose logs -f worker  # ดู log worker"
