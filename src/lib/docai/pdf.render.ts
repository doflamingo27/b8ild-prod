import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

export async function renderPdfToCanvasArray(
  file: File,
  dpi = 300
): Promise<HTMLCanvasElement[]> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const canvases: HTMLCanvasElement[] = [];
  
  const CSS_DPI = 96;
  const scale = dpi / CSS_DPI;
  
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    
    await page.render({
      canvasContext: canvas.getContext('2d') as any,
      viewport,
      canvas
    }).promise;
    
    canvases.push(canvas);
  }
  
  return canvases;
}
