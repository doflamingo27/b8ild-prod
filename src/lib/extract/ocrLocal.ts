import { createScheduler, createWorker, PSM } from 'tesseract.js';
import type { Scheduler, Worker } from 'tesseract.js';

const CORE = '/tesseract/tesseract-core.wasm.js';
const WORKER = '/tesseract/worker.min.js';
const LANG_PATH = '/tesseract/lang';

let scheduler: Scheduler | null = null;

async function init(workers = 2): Promise<Scheduler> {
  if (scheduler) return scheduler;
  
  console.log('[OCR] Initializing local Tesseract with', workers, 'workers');
  scheduler = createScheduler();
  
  for (let i = 0; i < workers; i++) {
    const w: Worker = await createWorker('fra', 1, {
      corePath: CORE,
      workerPath: WORKER,
      langPath: LANG_PATH,
      gzip: true,
    } as any);
    
    await (w as any).setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzàâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ0123456789€.,:/- ',
      tessedit_pageseg_mode: PSM.AUTO
    });
    
    scheduler.addWorker(w);
  }
  
  console.log('[OCR] Scheduler ready');
  return scheduler;
}

export async function ocrImageBlob(blob: Blob): Promise<string> {
  console.log('[OCR] Starting recognition on blob of size:', blob.size);
  
  const sch = await init(3);
  const passes = [
    { name: 'AUTO', psm: PSM.AUTO },
    { name: 'SINGLE_BLOCK', psm: PSM.SINGLE_BLOCK },
    { name: 'SPARSE_TEXT', psm: PSM.SPARSE_TEXT },
  ];
  
  let best = '';
  let bestScore = 0;
  
  for (const pass of passes) {
    console.log('[OCR] Trying PSM:', pass.name);
    
    try {
      const result: any = await (sch as any).addJob('recognize', blob);
      
      const t = result.data?.text ?? '';
      const alphanum = (t.match(/[A-Za-z0-9]/g)?.length ?? 0);
      const sc = alphanum / Math.max(1, t.length);
      
      console.log('[OCR] PSM', pass.name, '- Score:', (sc * 100).toFixed(1) + '%', 'Length:', t.length);
      
      if (sc > bestScore) {
        best = t;
        bestScore = sc;
      }
      
      if (bestScore >= 0.7) {
        console.log('[OCR] Early exit - good quality');
        break;
      }
    } catch (err) {
      console.error('[OCR] Error with PSM', pass.name, ':', err);
    }
  }
  
  console.log('[OCR] Best result - Score:', (bestScore * 100).toFixed(1) + '%', 'Length:', best.length);
  return best;
}
