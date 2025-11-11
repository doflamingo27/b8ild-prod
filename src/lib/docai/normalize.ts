export function normalizeNumberFR(raw?: string | null): number | null {
  if (!raw) return null;
  
  // ✅ Supprimer TOUS les espaces Unicode + sauts de ligne AVANT la normalisation
  const cleaned = String(raw)
    .replace(/[\s\u00A0\u202F\u2009\n\r\t]/g, '') // Espaces insécables, tabs, newlines
    .replace(/€/g, '')
    .trim();
  
  let s = cleaned;
  
  // Si contient à la fois . et , → . = milliers, , = décimale
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(/,/, '.');
  } else {
    // Si seule virgule et 1-2 décimales: remplacer virgule par point
    s = s.replace(/,(?=\d{1,2}$)/, '.');
    // Sinon supprimer points-milliers
    s = s.replace(/\.(?=\d{3}\b)/g, '');
  }
  
  // Garder chiffres, signe, point
  s = s.replace(/[^0-9\.\-]/g, '');
  if (!s || s === '-' || s === '.' || s === '-.') return null;
  
  let n = Number(s);
  if (!Number.isFinite(n)) return null;
  
  // Heuristique OCR : si nombre > 10000 sans séparateur décimal, probable erreur OCR
  if (!raw.includes(',') && !raw.includes('.') && n > 10000 && n < 1000000) {
    const candidate = n / 100;
    console.warn(`[normalizeNumberFR] Nombre suspect sans séparateur: "${raw}" → ${n}, correction proposée: ${candidate}`);
    n = candidate;
  }
  
  // Détection erreur x10 : si le nombre semble multiplié par 10 (e.g., 3297 au lieu de 329.7)
  if (raw.includes(',') && n > 100 && n % 10 === 0) {
    const lastCommaPos = raw.lastIndexOf(',');
    const afterComma = raw.substring(lastCommaPos + 1).replace(/[^0-9]/g, '');
    if (afterComma.length === 2) {
      // Le nombre devrait avoir 2 décimales, pas 1
      const candidate = n / 10;
      console.warn(`[normalizeNumberFR] Possible erreur x10: "${raw}" → ${n}, correction proposée: ${candidate}`);
      // On ne corrige pas automatiquement, juste un warning
    }
  }
  
  // Bornes sûres
  if (Math.abs(n) > 999999999999.99) return null;
  
  return Math.round(n * 100) / 100;
}

export function normalizePercentFR(raw?: string | null): number | null {
  const n = normalizeNumberFR(raw);
  if (n == null) return null;
  
  // Si < 1, considérer que c'était un ratio → ramener en %
  const pct = n < 1 ? n * 100 : n;
  
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
}

export function normalizeDateFR(raw?: string | null): string | null {
  if (!raw) return null;
  
  const s = String(raw).trim();
  const m = s.match(/([0-3]?\d)[\/\-\. ]([01]?\d)[\/\-\. ](\d{2,4})/);
  
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    let y = m[3];
    
    if (y.length === 2) {
      y = (Number(y) >= 80 ? '19' + y : '20' + y);
    }
    
    return `${y}-${mo}-${d}`;
  }
  
  return null;
}

export function checkTotals(
  ht?: number | null,
  tvaPct?: number | null,
  tvaAmt?: number | null,
  ttc?: number | null
): boolean {
  if (ht != null && ttc != null) {
    if (tvaPct != null) {
      const expected = ht * (1 + tvaPct / 100);
      return Math.abs((ttc - expected) / Math.max(1, expected)) <= 0.02;
    }
    if (tvaAmt != null) {
      const expected = ht + tvaAmt;
      return Math.abs((ttc - expected) / Math.max(1, expected)) <= 0.02;
    }
  }
  return false;
}

export function scoreConfidence(
  base: number,
  flags: {
    totalsOk?: boolean;
    hasSiret?: boolean;
    hasDate?: boolean;
    hasEuro?: boolean;
  }
): number {
  let s = base;
  if (flags.totalsOk) s += 0.25;
  if (flags.hasSiret) s += 0.10;
  if (flags.hasDate) s += 0.05;
  if (flags.hasEuro) s += 0.05;
  return Math.max(0, Math.min(1, s));
}
