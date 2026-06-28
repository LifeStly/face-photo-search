# Download face-api.js model weights → ./models (Windows PowerShell version)
$ErrorActionPreference = "Stop"

$dir = Join-Path $PSScriptRoot "..\models"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

$base = "https://github.com/vladmandic/face-api/raw/master/model"
$files = @(
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model.bin",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model.bin",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model.bin"
)

foreach ($f in $files) {
  $out = Join-Path $dir $f
  if (Test-Path $out) {
    Write-Host "  OK  $f (already exists)"
    continue
  }
  Write-Host "  DL  $f"
  Invoke-WebRequest -Uri "$base/$f" -OutFile $out
}

Write-Host "Done. Models in: $dir"
