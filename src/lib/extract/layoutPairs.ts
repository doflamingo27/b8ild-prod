import { TextItem } from './pdfTextCoords';

type Pair = { label: string; value: string; score: number };

const LABELS = [
  'total ht', 'montant ht', 'sous total ht', 'tva', 'total ttc', 'net à payer',
  'n° facture', 'no facture', 'numéro facture', 'siret', 'tva intracom', 'date',
  'date limite', 'organisme', 'acheteur', 'référence', 'montant estimé', 'budget'
];

export function pairsFromLayout(pages: TextItem[][]): Pair[] {
  const pairs: Pair[] = [];
  
  for (const items of pages) {
    const lines = groupByLine(items);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const text = line.map((it: any) => it.str).join(' ').toLowerCase();
      
      const label = LABELS.find(l => text.includes(l));
      if (!label) continue;
      
      // Chercher valeur à droite sur la même ligne
      const labelEndX = Math.max(...line.map((it: any) => it.x + it.w));
      const sameLineVals = line
        .filter((it: any) => it.x >= labelEndX - 5)
        .map((it: any) => it.str)
        .join(' ');
      
      // Ou ligne suivante
      const nextLine = i + 1 < lines.length ? lines[i + 1] : null;
      const nextVals = nextLine ? nextLine.map((it: any) => it.str).join(' ') : '';
      
      const candidate = pickValue(sameLineVals) || pickValue(nextVals);
      if (candidate) {
        pairs.push({ label, value: candidate, score: 0.8 });
      }
    }
  }
  
  return pairs;
}

function groupByLine(items: TextItem[]): any[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: any[] = [];
  const tol = 3;
  
  for (const it of sorted) {
    const line = lines.find((ln: any) => Math.abs(ln._y - it.y) < tol);
    if (line) {
      line.push(it);
      line._y = (line._y + it.y) / 2;
    } else {
      const ln: any = [it];
      ln._y = it.y;
      lines.push(ln);
    }
  }
  
  return lines;
}

function pickValue(s: string): string | null {
  if (!s) return null;
  
  // Nombre avec €
  const m = s.match(/([0-9\s\.,]+)\s*€/);
  if (m) return m[1] + '€';
  
  // Référence alphanumérique
  const n = s.match(/[A-Z0-9\-\/]{4,}/i);
  if (n) return n[0];
  
  // Date
  const d = s.match(/([0-3]?\d[\/\-\.][01]?\d[\/\-\.]\d{2,4})/);
  if (d) return d[1];
  
  return null;
}
