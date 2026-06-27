export function euclidean(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error('descriptor length mismatch');
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// face-api ใช้ euclidean — แปลงเป็น % ความเหมือนแบบประมาณ
// distance 0 → 100%, distance ≥ 1.0 → 0%
export function distanceToSimilarity(distance: number): number {
  const s = Math.max(0, 1 - distance);
  return Math.round(s * 1000) / 10;
}
