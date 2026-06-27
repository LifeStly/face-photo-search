#!/usr/bin/env bash
# ดาวน์โหลด face-api.js model weights ลง ./models
# Models: ssd_mobilenetv1, face_landmark_68, face_recognition
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)/models"
mkdir -p "$DIR"
cd "$DIR"

BASE="https://github.com/vladmandic/face-api/raw/master/model"
FILES=(
  "ssd_mobilenetv1_model-weights_manifest.json"
  "ssd_mobilenetv1_model.bin"
  "face_landmark_68_model-weights_manifest.json"
  "face_landmark_68_model.bin"
  "face_recognition_model-weights_manifest.json"
  "face_recognition_model.bin"
)

for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    echo "  ✓ $f (already exists)"
    continue
  fi
  echo "  ↓ $f"
  curl -fSL -o "$f" "$BASE/$f"
done

echo "Done. Models in: $DIR"
