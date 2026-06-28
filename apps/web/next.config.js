/** @type {import('next').NextConfig} */
const NATIVE_DEPS = [
  '@vladmandic/face-api',
  '@tensorflow/tfjs',
  '@tensorflow/tfjs-backend-wasm',
  '@napi-rs/canvas',
  'better-sqlite3',
  'sharp',
  'googleapis',
  'googleapis-common',
  'google-auth-library',
  'gaxios',
  'agent-base',
  'https-proxy-agent',
  'http-proxy-agent',
];

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: NATIVE_DEPS,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean);
      config.externals = [
        ...existing,
        ({ request }, cb) => {
          if (request && NATIVE_DEPS.some((p) => request === p || request.startsWith(`${p}/`))) {
            return cb(null, 'commonjs ' + request);
          }
          cb();
        },
      ];
    }
    return config;
  },
  // ปิด face-api bundle internal warning logs (ลด noise)
  // ดู wasm backend ไม่ทำงาน → ตก CPU โดยตั้งใจ — node-wasm bundle มี tfjs ภายในที่ register backend จากภายนอกไม่ได้
  // ถ้าจะให้ wasm ทำงานจริงต้อง refactor ใช้ face-api.esm-nobundle + webpack alias tfjs-core → tfjs (ฟีเจอร์ Phase 6)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

module.exports = nextConfig;
