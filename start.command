#!/bin/bash
# Mac/Linux launcher — ดับเบิลคลิก start.command (Mac) หรือรัน bash start.command (Linux)
cd "$(dirname "$0")"

echo "============================================"
echo "  Face Photo Search"
echo "============================================"
echo

# 1) Check Node
if ! command -v node >/dev/null 2>&1; then
  echo "[!] Node.js ไม่พบ"
  echo "กรุณาติดตั้ง Node.js 20+ จาก https://nodejs.org/"
  if [[ "$OSTYPE" == "darwin"* ]]; then open https://nodejs.org/; fi
  read -p "Press enter to exit..."
  exit 1
fi
echo "Node.js: $(node -v)"
echo

# 2) Install deps
if [ ! -d "node_modules" ]; then
  echo "[+] ครั้งแรก: ติดตั้ง dependencies (1-3 นาที)..."
  npm install || { echo "[!] npm install ล้มเหลว"; read -p "Press enter..."; exit 1; }
  echo
fi

# 3) Download models
if [ ! -f "models/face_recognition_model.bin" ]; then
  echo "[+] ดาวน์โหลด face-api models (~30MB)..."
  if command -v pwsh >/dev/null 2>&1; then
    pwsh -ExecutionPolicy Bypass -File scripts/download-models.ps1
  else
    # bash fallback
    mkdir -p models
    base="https://github.com/vladmandic/face-api/raw/master/model"
    for f in ssd_mobilenetv1_model-weights_manifest.json ssd_mobilenetv1_model.bin \
             face_landmark_68_model-weights_manifest.json face_landmark_68_model.bin \
             face_recognition_model-weights_manifest.json face_recognition_model.bin; do
      [ -f "models/$f" ] || curl -L -o "models/$f" "$base/$f"
    done
  fi
  echo
fi

# 4) Build
if [ ! -f "apps/web/.next/BUILD_ID" ]; then
  echo "[+] Build production (1-2 นาที)..."
  npm run build || { echo "[!] build ล้มเหลว"; read -p "Press enter..."; exit 1; }
  echo
fi

# 5) Start + open browser
echo "[+] เปิดเซิร์ฟเวอร์ที่ http://localhost:3000"
echo "    ปิดโปรแกรมด้วย Ctrl+C"
echo
(sleep 3 && (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null)) &
exec npm run start
