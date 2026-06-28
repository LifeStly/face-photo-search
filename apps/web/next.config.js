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
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'drive.google.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

module.exports = nextConfig;
