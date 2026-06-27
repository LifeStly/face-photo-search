# systemd auto-start

ติดตั้งให้ Docker stack รันอัตโนมัติเมื่อ VM boot:

```bash
# 1. วางโปรเจคไว้ที่ /opt/face-photo (หรือแก้ WorkingDirectory ใน .service)
sudo mkdir -p /opt/face-photo
sudo cp -r . /opt/face-photo/

# 2. ติดตั้ง unit file
sudo cp systemd/photo-app.service /etc/systemd/system/photo-app.service
sudo systemctl daemon-reload
sudo systemctl enable --now photo-app.service

# 3. ดูสถานะ
sudo systemctl status photo-app.service
docker compose -f /opt/face-photo/docker-compose.yml ps
```

Cloudflare Tunnel ติดตั้งแยกผ่าน `scripts/setup-tunnel.sh` (มี systemd service ของตัวเองชื่อ `cloudflared`)
