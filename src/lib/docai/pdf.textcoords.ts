import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

export type TextItem = {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
};

export async function readPdfWithCoords(file: File): Promise<{ pages: TextItem[][] }> {
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: TextItem[][] = [];
  
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    
    for (const it of (content.items as any[])) {
      if (!('str' in it)) continue;
      const [, , , , e, f] = it.transform;
      items.push({
        str: it.str,
        x: e,
        y: f,
        w: it.width,
        h: it.height,
        page: p,
      });
    }
    
    pages.push(items);
  }
  
  return { pages };
}
