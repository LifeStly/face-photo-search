import '@tensorflow/tfjs-node';
import * as faceapi from '@vladmandic/face-api';
import * as canvas from 'canvas';
import sharp from 'sharp';
import path from 'node:path';
import { config } from './config';

const { Canvas, Image, ImageData } = canvas as any;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let _ready: Promise<void> | null = null;

export function ready(): Promise<void> {
  if (_ready) return _ready;
  _ready = (async () => {
    const dir = path.resolve(config.face.modelsPath);
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(dir);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(dir);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(dir);
  })();
  return _ready;
}

export type Embedding = {
  descriptor: Float32Array;
  box: { x: number; y: number; width: number; height: number };
};

export async function embedImage(input: Buffer): Promise<Embedding[]> {
  await ready();
  const resized = await sharp(input)
    .rotate()
    .resize({ width: config.face.resizeWidth, withoutEnlargement: true })
    .toFormat('jpeg')
    .toBuffer();

  const img = await canvas.loadImage(resized);
  const c = canvas.createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const detections = await faceapi
    .detectAllFaces(c as any, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => ({
    descriptor: d.descriptor,
    box: {
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
    },
  }));
}

export function serializeDescriptor(d: Float32Array): Buffer {
  return Buffer.from(d.buffer, d.byteOffset, d.byteLength);
}

export function deserializeDescriptor(b: Buffer): Float32Array {
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
}
