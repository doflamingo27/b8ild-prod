export function normalizeNumberFR(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw
    .replace(/\u00A0/g, ' ')
    .replace(/€/g, '')
    .replace(/[^\d,.\- ]/g, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}\b)/g, '')     // points milliers
    .replace(/,(?=\d{1,2}\b)/g, '.');  // virgule décimale
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function normalizeDateFR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  
  // dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy
  const m = s.match(/([0-3]?\d)[\/\-\.]([01]?\d)[\/\-\.](\d{2,4})/);
  if (m) {
    const [_, d, mo, y] = m;
    const yyyy = (y.length === 2 ? '20' + y : y);
    const dd = d.padStart(2, '0');
    const mm = mo.padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // Format texte : "1 janv. 2025", "12 janvier 2025"
  const mois: Record<string, string> = {
    'janv': '01', 'janvier': '01', 'fév': '02', 'février': '02', 'fevrier': '02',
    'mars': '03', 'avr': '04', 'avril': '04', 'mai': '05', 'juin': '06',
    'juil': '07', 'juillet': '07', 'août': '08', 'aout': '08', 'sept': '09',
    'septembre': '09', 'oct': '10', 'octobre': '10', 'nov': '11', 'novembre': '11',
    'déc': '12', 'décembre': '12', 'decembre': '12'
  };
  
  for (const [moisTxt, moisNum] of Object.entries(mois)) {
    const regex = new RegExp(`(\\d{1,2})\\s*${moisTxt}\\.?\\s*(\\d{4})`, 'i');
    const match = s.match(regex);
    if (match) {
      const dd = match[1].padStart(2, '0');
      return `${match[2]}-${moisNum}-${dd}`;
    }
  }
  
  return null;
}

export function checkTotals(ht?: number | null, tvaPct?: number | null, tvaAmt?: number | null, ttc?: number | null): boolean {
  if (ht != null && ttc != null && tvaPct != null) {
    const expected = ht * (1 + tvaPct / 100);
    return Math.abs((ttc - expected) / expected) <= 0.02;
  } else if (ht != null && tvaAmt != null && ttc != null) {
    const expected = ht + tvaAmt;
    return Math.abs((ttc - expected) / expected) <= 0.02;
  }
  return false;
}

export function scoreConfidence(base: number, flags: {
  totalsOk?: boolean;
  siret?: boolean;
  date?: boolean;
  eur?: boolean;
}): number {
  let s = base;
  if (flags.totalsOk) s += 0.25;
  if (flags.siret) s += 0.10;
  if (flags.date) s += 0.10;
  if (flags.eur) s += 0.10;
  return Math.min(1, Math.max(0, s));
}
