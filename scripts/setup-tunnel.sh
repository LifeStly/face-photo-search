#!/usr/bin/env bash
# ตั้งค่า Cloudflare named tunnel ให้เปิด URL คงที่ชี้มาที่ web:3000
# ต้อง login Cloudflare และมี domain ผูกกับ Cloudflare DNS อยู่แล้ว
set -euo pipefail

TUNNEL_NAME="${TUNNEL_NAME:-face-photo}"
HOSTNAME="${HOSTNAME:?ระบุ HOSTNAME เช่น photos.example.com}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "ติดตั้ง cloudflared ก่อน:"
  echo "  curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb"
  echo "  sudo dpkg -i cloudflared.deb"
  exit 1
fi

echo "1) login Cloudflare (เปิดบราวเซอร์ให้กด authorize)"
cloudflared tunnel login

echo "2) สร้าง named tunnel '$TUNNEL_NAME'"
cloudflared tunnel create "$TUNNEL_NAME" || echo "(tunnel อาจมีอยู่แล้ว — ข้าม)"

TUNNEL_ID="$(cloudflared tunnel list | awk -v n="$TUNNEL_NAME" '$2==n {print $1}')"
if [[ -z "$TUNNEL_ID" ]]; then
  echo "หา tunnel id ไม่เจอ" >&2
  exit 1
fi
echo "Tunnel ID: $TUNNEL_ID"

CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="$CONFIG_DIR/config.yml"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_FILE" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CONFIG_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:3000
  - service: http_status:404
EOF

echo "3) สร้าง DNS route → $HOSTNAME"
cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME" || echo "(DNS อาจตั้งไว้แล้ว — ข้าม)"

echo "4) ติดตั้งเป็น systemd service (รันตอน VM boot)"
sudo cloudflared service install || echo "(service อาจติดตั้งแล้ว — ข้าม)"
sudo systemctl enable --now cloudflared

echo
echo "✓ Tunnel พร้อม → https://$HOSTNAME"
