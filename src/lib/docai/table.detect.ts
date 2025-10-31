import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function parseCSV(file: File): Promise<any[]> {
  return await new Promise<any[]>((resolve) =>
    Papa.parse(file, {
      header: true,
      complete: (result) => resolve(result.data as any[]),
    })
  );
}

export async function parseXLSX(file: File): Promise<any[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];
}

export function inferTotals(rows: any[]): { ttc: number | null } {
  if (!rows.length) return { ttc: null };
  
  const keys = Object.keys(rows[0]).map((k) => k.toLowerCase());
  
  const pick = (...alternatives: string[]) =>
    keys.find((k) => alternatives.some((alt) => k.includes(alt)));
  
  const totalKey = pick('total', 'montant', 'ttc', 'net');
  
  const ttc = totalKey
    ? rows.reduce((sum, row) => {
        const value = String(row[totalKey])
          .replace(/\s/g, '')
          .replace(',', '.');
        return sum + Number(value);
      }, 0)
    : null;
  
  return { ttc };
}
