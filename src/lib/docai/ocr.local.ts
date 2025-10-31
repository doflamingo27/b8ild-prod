import Tesseract, { Scheduler, createWorker } from 'tesseract.js';

const CORE = '/tesseract/tesseract-core.wasm.js';
const WORKER = '/tesseract/worker.min.js';
const LANG = '/tesseract/lang';

let scheduler: Scheduler | null = null;

function preprocessCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  
  // Grayscale
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  
  // Otsu thresholding
  const hist = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    hist[data[i] | 0]++;
  }
  
  const total = src.width * src.height;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * hist[i];
  }
  
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 127;
  
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    
    const wF = total - wB;
    if (!wF) break;
    
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    
    if (between > max) {
      max = between;
      threshold = t;
    }
  }
  
  // Apply threshold
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i] > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

async function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png',
      0.95
    )
  );
}

export async function initScheduler(workers = 3): Promise<Scheduler> {
  if (scheduler) return scheduler;
  
  scheduler = Tesseract.createScheduler();
  
  for (let i = 0; i < workers; i++) {
    const worker = await createWorker('fra');
    scheduler.addWorker(worker);
  }
  
  return scheduler;
}

export async function ocrCanvasesToText(
  canvases: HTMLCanvasElement[]
): Promise<string[]> {
  await initScheduler(3);
  
  const passes = [6, 4, 11, 1]; // PSM modes
  const texts: string[] = [];
  
  for (const baseCanvas of canvases) {
    const preprocessed = preprocessCanvas(baseCanvas);
    const blob = await blobFromCanvas(preprocessed);
    
    let bestText = '';
    let bestScore = 0;
    
    for (const psm of passes) {
      try {
        const result: any = await scheduler!.addJob('recognize', blob);
        const text = result.data?.text ?? '';
        const alphanum = (text.match(/[A-Za-z0-9]/g)?.length ?? 0);
        const score = alphanum / Math.max(1, text.length);
        
        if (score > bestScore) {
          bestText = text;
          bestScore = score;
        }
        
        if (bestScore >= 0.7) break;
      } catch (err) {
        console.warn('[OCR] Pass failed:', err);
      }
    }
    
    texts.push(bestText);
  }
  
  return texts;
}

export async function terminateScheduler(): Promise<void> {
  if (scheduler) {
    await scheduler.terminate();
    scheduler = null;
  }
}
