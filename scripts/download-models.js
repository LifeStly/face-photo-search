#!/usr/bin/env node
// Cross-platform face-api models downloader
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const DIR = path.resolve(__dirname, '..', 'models');
const BASE = 'https://github.com/vladmandic/face-api/raw/master/model';
const FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model.bin',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model.bin',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model.bin',
];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

function fetchFollow(url, dest) {
  return new Promise((resolve, reject) => {
    function req(u) {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return req(new URL(res.headers.location, u).toString());
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} fetching ${u}`));
        }
        const out = fs.createWriteStream(dest);
        res.pipe(out);
        out.on('finish', () => out.close(resolve));
        out.on('error', reject);
      }).on('error', reject);
    }
    req(url);
  });
}

(async () => {
  for (const f of FILES) {
    const dest = path.join(DIR, f);
    if (fs.existsSync(dest)) {
      console.log(`  OK  ${f}`);
      continue;
    }
    console.log(`  DL  ${f}`);
    try {
      await fetchFollow(`${BASE}/${f}`, dest);
    } catch (e) {
      console.error(`Failed: ${f} — ${e.message}`);
      process.exit(1);
    }
  }
  console.log(`Done. Models in: ${DIR}`);
})();
