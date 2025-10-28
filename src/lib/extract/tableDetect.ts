import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      complete: (result) => resolve(result.data as any[])
    });
  });
}

export async function parseXLSX(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf);
  const sh = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sh, { defval: '' }) as any[];
}

export function inferTotals(rows: any[]): {
  ht: number | null;
  tvaPct: number | null;
  tvaAmt: number | null;
  ttc: number | null;
} {
  if (!rows || rows.length === 0) {
    return { ht: null, tvaPct: null, tvaAmt: null, ttc: null };
  }
  
  const keys = Object.keys(rows[0]).map(k => k.toLowerCase());
  
  function pick(...alts: string[]): string | undefined {
    return keys.find(k => alts.some(a => k.includes(a)));
  }
  
  const totalKey = pick('total', 'montant', 'prix', 'price');
  const htKey = pick('ht', 'h.t');
  const ttcKey = pick('ttc', 't.t.c');
  
  let ht = null;
  let ttc = null;
  
  if (htKey) {
    ht = rows.reduce((sum, r) => {
      const val = String(r[htKey]).replace(',', '.');
      return sum + (Number(val) || 0);
    }, 0);
  }
  
  if (ttcKey) {
    ttc = rows.reduce((sum, r) => {
      const val = String(r[ttcKey]).replace(',', '.');
      return sum + (Number(val) || 0);
    }, 0);
  } else if (totalKey && !htKey) {
    ttc = rows.reduce((sum, r) => {
      const val = String(r[totalKey]).replace(',', '.');
      return sum + (Number(val) || 0);
    }, 0);
  }
  
  return { ht, tvaPct: null, tvaAmt: null, ttc };
}
