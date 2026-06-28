import path from 'path';
import crypto from 'crypto';
import { config } from './config';

type CanvasMod = typeof import('@napi-rs/canvas');

// cache ไว้บน globalThis เพื่อกัน Next.js dev mode reload module แล้ว setWasmPaths/setBackend ซ้ำ
const G = globalThis as any;

function ready(): Promise<{ faceapi: any; canvas: CanvasMod }> {
  if (G.__faceapiReady) return G.__faceapiReady;
  G.__faceapiReady = (async () => {
    const faceapi: any = await import('@vladmandic/face-api/dist/face-api.node-wasm.js');
    const tf = faceapi.tf;
    // face-api.node-wasm bundle รวม backend-wasm ในตัวเองอยู่แล้ว — ลอง wasm ก่อน, fallback cpu
    try {
      const wasmMod: any = await import('@tensorflow/tfjs-backend-wasm');
      const wasmDir = path.dirname(require.resolve('@tensorflow/tfjs-backend-wasm/package.json'));
      try { wasmMod.setWasmPaths(path.join(wasmDir, 'dist') + path.sep); } catch {}
    } catch {}
    try { await tf.setBackend('wasm'); } catch {}
    await tf.ready();

    const canvas = await import('@napi-rs/canvas');
    const { Canvas, Image, ImageData } = canvas as any;
    class CanvasShim extends Canvas {
      constructor(...args: any[]) {
        super(...(args.length ? args : [1, 1]));
      }
    }
    faceapi.env.monkeyPatch({ Canvas: CanvasShim, Image, ImageData });
    const dir = path.resolve(config.face.modelsPath);
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(dir);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(dir);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(dir);
    console.log(`${new Date().toISOString()} [face] tfjs ready, backend=${tf.getBackend()}`);
    return { faceapi, canvas };
  })();
  return G.__faceapiReady;
}

export type Embedding = {
  descriptor: Float32Array;
  box: { x: number; y: number; width: number; height: number };
};

const embedCache = new Map<string, Embedding[]>();
const CACHE_MAX = 50;

export async function embedImage(input: Buffer): Promise<Embedding[]> {
  const key = crypto.createHash('sha1').update(input).digest('hex');
  const cached = embedCache.get(key);
  if (cached) return cached;

  const { faceapi, canvas } = await ready();
  const sharp = (await import('sharp')).default;
  const resized = await sharp(input)
    .rotate()
    .resize({ width: config.face.resizeWidth, withoutEnlargement: true })
    .toFormat('jpeg')
    .toBuffer();

  const img = await canvas.loadImage(resized);
  const c = canvas.createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img as any, 0, 0);

  const detections = await faceapi
    .detectAllFaces(c as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  const result: Embedding[] = detections.map((d: any) => ({
    descriptor: d.descriptor,
    box: {
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
    },
  }));
  if (embedCache.size >= CACHE_MAX) embedCache.delete(embedCache.keys().next().value as string);
  embedCache.set(key, result);
  return result;
}

export function serializeDescriptor(d: Float32Array): Buffer {
  return Buffer.from(d.buffer, d.byteOffset, d.byteLength);
}

export function deserializeDescriptor(b: Buffer): Float32Array {
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
}
