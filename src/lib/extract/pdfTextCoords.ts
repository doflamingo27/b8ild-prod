import * as pdfjsLib from 'pdfjs-dist';

// Configuration du worker pdfjs
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export type TextItem = { 
  str: string; 
  x: number; 
  y: number; 
  w: number; 
  h: number; 
  page: number;
};

export async function readPdfWithCoords(file: File): Promise<{ pages: TextItem[][]; hasText: boolean }> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages: TextItem[][] = [];
  let hasText = false;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: TextItem[] = [];

    for (const it of content.items as any[]) {
      if (!('str' in it) || !it.str.trim()) continue;
      hasText = true;
      
      const [a, b, c, d, e, f] = it.transform;
      const x = e;
      const y = f;
      const w = it.width || 0;
      const h = it.height || 0;

      items.push({ 
        str: it.str, 
        x, 
        y, 
        w, 
        h, 
        page: p 
      });
    }

    pages.push(items);
  }

  return { pages, hasText };
}
