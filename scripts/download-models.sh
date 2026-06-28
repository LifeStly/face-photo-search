#!/bin/bash
# Mac/Linux: download face-api.js models → ./models
set -e
DIR="$(dirname "$0")/../models"
mkdir -p "$DIR"
BASE="https://github.com/vladmandic/face-api/raw/master/model"
FILES=(
  ssd_mobilenetv1_model-weights_manifest.json
  ssd_mobilenetv1_model.bin
  face_landmark_68_model-weights_manifest.json
  face_landmark_68_model.bin
  face_recognition_model-weights_manifest.json
  face_recognition_model.bin
)
for f in "${FILES[@]}"; do
  if [ -f "$DIR/$f" ]; then
    echo "  OK  $f"
  else
    echo "  DL  $f"
    curl -L -o "$DIR/$f" "$BASE/$f"
  fi
done
echo "Done. Models in: $DIR"
